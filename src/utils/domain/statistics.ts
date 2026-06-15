import type {
  MeasurementRecord,
  MountainDistribution,
  PlanStatistics,
  AnalysisReportData,
  SurveyPlan,
} from '@/types';
import { angleDifference, normalizeAngle, formatAngle } from './bearing';

export function findDuplicateMeasurements(
  measurements: MeasurementRecord[],
  tolerance: number = 0.5
): MeasurementRecord[] {
  const duplicates: MeasurementRecord[] = [];
  const seen = new Map<string, MeasurementRecord>();

  measurements.forEach((m) => {
    const key = `${m.axisLabel}-${m.correctedBearing.toFixed(1)}`;
    if (seen.has(key)) {
      duplicates.push(m);
    } else {
      seen.set(key, m);
    }
  });

  measurements.forEach((m, i) => {
    for (let j = i + 1; j < measurements.length; j++) {
      const other = measurements[j];
      if (m.axisLabel === other.axisLabel) {
        const diff = angleDifference(m.correctedBearing, other.correctedBearing);
        if (diff <= tolerance) {
          if (!duplicates.includes(m)) duplicates.push(m);
          if (!duplicates.includes(other)) duplicates.push(other);
        }
      }
    }
  });

  return duplicates;
}

export function calculateMountainDistribution(
  measurements: MeasurementRecord[]
): MountainDistribution[] {
  const counts: Record<string, { count: number; element: string }> = {};

  measurements.forEach((m) => {
    if (!counts[m.mountainName]) {
      counts[m.mountainName] = { count: 0, element: m.mountainElement };
    }
    counts[m.mountainName].count += 1;
  });

  const total = measurements.length || 1;

  return Object.entries(counts)
    .map(([name, data]) => ({
      name,
      element: data.element,
      count: data.count,
      percentage: (data.count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

export function calculatePlanStatistics(
  measurements: MeasurementRecord[],
  errorThreshold: number
): PlanStatistics {
  const totalCount = measurements.length;
  const failCount = measurements.filter((m) => m.exceedsThreshold).length;
  const passCount = totalCount - failCount;
  const passRate = totalCount > 0 ? (passCount / totalCount) * 100 : 0;

  const duplicates = findDuplicateMeasurements(measurements);
  const duplicateCount = duplicates.length;

  const errors = measurements.map((m) => m.errorAmount);
  const averageError = totalCount > 0 ? errors.reduce((a, b) => a + b, 0) / totalCount : 0;
  const maxError = totalCount > 0 ? Math.max(...errors) : 0;
  const minError = totalCount > 0 ? Math.min(...errors) : 0;

  const mountainDistribution = calculateMountainDistribution(measurements);

  const highRiskRecords = measurements
    .filter((m) => m.exceedsThreshold)
    .sort((a, b) => b.errorAmount - a.errorAmount)
    .slice(0, 10);

  return {
    totalCount,
    passCount,
    failCount,
    passRate,
    duplicateCount,
    averageError,
    maxError,
    minError,
    mountainDistribution,
    highRiskRecords,
  };
}

export function generateReportSummary(stats: PlanStatistics): string {
  if (stats.totalCount === 0) {
    return '当前方案暂无测量记录，无法生成分析报告。';
  }

  const parts: string[] = [];
  parts.push(`本方案共包含 ${stats.totalCount} 条测量记录，`);
  parts.push(`其中合格 ${stats.passCount} 条，超标 ${stats.failCount} 条，`);
  parts.push(`合格率为 ${stats.passRate.toFixed(1)}%。`);

  if (stats.duplicateCount > 0) {
    parts.push(`检测到 ${stats.duplicateCount} 条疑似重复记录，建议核对。`);
  }

  if (stats.passRate >= 90) {
    parts.push('整体测量质量优秀，结果一致性良好。');
  } else if (stats.passRate >= 70) {
    parts.push('整体测量质量一般，部分轴线误差较大，建议复查超标记录。');
  } else {
    parts.push('整体测量质量较差，大量轴线超出误差阈值，建议重新测量或检查罗盘校准。');
  }

  if (stats.mountainDistribution.length > 0) {
    const topMountain = stats.mountainDistribution[0];
    parts.push(`山向分布以${topMountain.name}山为主，占比 ${topMountain.percentage.toFixed(1)}%。`);
  }

  return parts.join('');
}

export function generateRecommendations(stats: PlanStatistics): string[] {
  const recommendations: string[] = [];

  if (stats.totalCount === 0) {
    return ['请先添加测量记录后再生成分析报告。'];
  }

  if (stats.passRate < 80) {
    recommendations.push('合格率低于80%，建议检查罗盘磁偏角设置是否正确。');
    recommendations.push('大量记录超标，可能是测量操作不规范导致，建议重新测量。');
  } else if (stats.passRate < 95) {
    recommendations.push('部分记录超标，建议对超标记录进行二次复核。');
  }

  if (stats.duplicateCount > 0) {
    recommendations.push('存在疑似重复记录，请核对是否为重复录入。');
  }

  if (stats.averageError > 3) {
    recommendations.push('平均误差偏大，建议检查罗盘是否水平放置。');
  }

  if (stats.mountainDistribution.length <= 2) {
    recommendations.push('山向分布较为集中，建议增加不同朝向的测量以提高数据多样性。');
  }

  if (stats.highRiskRecords.length > 0) {
    const topRisk = stats.highRiskRecords[0];
    recommendations.push(`最大误差记录为「${topRisk.axisLabel}」，误差 ${topRisk.errorAmount.toFixed(2)}°，建议重点核查。`);
  }

  if (recommendations.length === 0) {
    recommendations.push('测量结果良好，继续保持规范操作。');
  }

  return recommendations;
}

export function generateAnalysisReport(plan: SurveyPlan): AnalysisReportData {
  const statistics = calculatePlanStatistics(plan.measurements, plan.errorThreshold);
  const summary = generateReportSummary(statistics);
  const recommendations = generateRecommendations(statistics);

  return {
    planId: plan.id,
    planName: plan.name,
    planDescription: plan.description,
    generatedAt: Date.now(),
    magneticDeclination: plan.magneticDeclination,
    errorThreshold: plan.errorThreshold,
    statistics,
    measurements: [...plan.measurements].sort((a, b) => b.errorAmount - a.errorAmount),
    summary,
    recommendations,
  };
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function exportReportAsText(report: AnalysisReportData): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('           罗盘测量分析报告');
  lines.push('='.repeat(60));
  lines.push('');

  lines.push(`方案名称：${report.planName}`);
  lines.push(`方案描述：${report.planDescription || '无'}`);
  lines.push(`生成时间：${formatTimestamp(report.generatedAt)}`);
  lines.push(`磁偏角：${report.magneticDeclination > 0 ? '+' : ''}${report.magneticDeclination.toFixed(1)}°`);
  lines.push(`误差阈值：${report.errorThreshold.toFixed(1)}°`);
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('一、统计概览');
  lines.push('-'.repeat(60));
  lines.push('');

  const s = report.statistics;
  lines.push(`测量总数：${s.totalCount} 条`);
  lines.push(`合格数量：${s.passCount} 条`);
  lines.push(`超标数量：${s.failCount} 条`);
  lines.push(`合格率：${s.passRate.toFixed(1)}%`);
  lines.push(`重复记录：${s.duplicateCount} 条`);
  lines.push(`平均误差：${s.averageError.toFixed(2)}°`);
  lines.push(`最大误差：${s.maxError.toFixed(2)}°`);
  lines.push(`最小误差：${s.minError.toFixed(2)}°`);
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('二、山向分布');
  lines.push('-'.repeat(60));
  lines.push('');

  s.mountainDistribution.forEach((m, i) => {
    const bar = '█'.repeat(Math.round(m.percentage / 5));
    lines.push(`${String(i + 1).padStart(2)}. ${m.name}山 (${m.element})  ${m.count}条  ${m.percentage.toFixed(1)}%  ${bar}`);
  });
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('三、分析摘要');
  lines.push('-'.repeat(60));
  lines.push('');
  lines.push(report.summary);
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('四、建议事项');
  lines.push('-'.repeat(60));
  lines.push('');

  report.recommendations.forEach((r, i) => {
    lines.push(`${i + 1}. ${r}`);
  });
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('五、高风险记录');
  lines.push('-'.repeat(60));
  lines.push('');

  if (s.highRiskRecords.length > 0) {
    lines.push('序号   轴线标签    校正方位    山向     误差     状态');
    lines.push('-'.repeat(55));
    s.highRiskRecords.forEach((r, i) => {
      const status = r.exceedsThreshold ? '超标' : '合格';
      lines.push(
        `${String(i + 1).padEnd(5)}  ${r.axisLabel.padEnd(10)}  ${formatAngle(r.correctedBearing, 1).padEnd(10)}  ${(r.mountainName + '山').padEnd(6)}  ${r.errorAmount.toFixed(2).padStart(6)}°  ${status}`
      );
    });
  } else {
    lines.push('暂无高风险记录。');
  }
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('六、全部测量记录');
  lines.push('-'.repeat(60));
  lines.push('');

  if (report.measurements.length > 0) {
    lines.push('序号   轴线标签    罗盘读数    校正方位    山向     误差     状态');
    lines.push('-'.repeat(65));
    report.measurements.forEach((r, i) => {
      const status = r.exceedsThreshold ? '超标' : '合格';
      lines.push(
        `${String(i + 1).padEnd(5)}  ${r.axisLabel.padEnd(10)}  ${formatAngle(r.compassReading, 1).padEnd(10)}  ${formatAngle(r.correctedBearing, 1).padEnd(10)}  ${(r.mountainName + '山').padEnd(6)}  ${r.errorAmount.toFixed(2).padStart(6)}°  ${status}`
      );
    });
  } else {
    lines.push('暂无测量记录。');
  }
  lines.push('');

  lines.push('='.repeat(60));
  lines.push('           报告结束');
  lines.push('='.repeat(60));

  return lines.join('\n');
}

export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
