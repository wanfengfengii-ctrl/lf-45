import type { Mountain, Point, BearingResult, MeasurementRecord, PlanStatistics, MountainDistribution, AnalysisReportData, SurveyPlan, BatchInputItem, EnvironmentElement, FengShuiRisk, FengShuiRiskLevel, FengShuiRiskType, EnvironmentAnalysisResult } from '@/types';

export const TWENTY_FOUR_MOUNTAINS: Mountain[] = [
  { name: '壬', startAngle: 345, midAngle: 352.5, endAngle: 360, element: '水', direction: '北' },
  { name: '子', startAngle: 0, midAngle: 7.5, endAngle: 15, element: '水', direction: '北' },
  { name: '癸', startAngle: 15, midAngle: 22.5, endAngle: 30, element: '水', direction: '北' },
  { name: '丑', startAngle: 30, midAngle: 37.5, endAngle: 45, element: '土', direction: '东北' },
  { name: '艮', startAngle: 45, midAngle: 52.5, endAngle: 60, element: '土', direction: '东北' },
  { name: '寅', startAngle: 60, midAngle: 67.5, endAngle: 75, element: '木', direction: '东北' },
  { name: '甲', startAngle: 75, midAngle: 82.5, endAngle: 90, element: '木', direction: '东' },
  { name: '卯', startAngle: 90, midAngle: 97.5, endAngle: 105, element: '木', direction: '东' },
  { name: '乙', startAngle: 105, midAngle: 112.5, endAngle: 120, element: '木', direction: '东' },
  { name: '辰', startAngle: 120, midAngle: 127.5, endAngle: 135, element: '土', direction: '东南' },
  { name: '巽', startAngle: 135, midAngle: 142.5, endAngle: 150, element: '木', direction: '东南' },
  { name: '巳', startAngle: 150, midAngle: 157.5, endAngle: 165, element: '火', direction: '东南' },
  { name: '丙', startAngle: 165, midAngle: 172.5, endAngle: 180, element: '火', direction: '南' },
  { name: '午', startAngle: 180, midAngle: 187.5, endAngle: 195, element: '火', direction: '南' },
  { name: '丁', startAngle: 195, midAngle: 202.5, endAngle: 210, element: '火', direction: '南' },
  { name: '未', startAngle: 210, midAngle: 217.5, endAngle: 225, element: '土', direction: '西南' },
  { name: '坤', startAngle: 225, midAngle: 232.5, endAngle: 240, element: '土', direction: '西南' },
  { name: '申', startAngle: 240, midAngle: 247.5, endAngle: 255, element: '金', direction: '西南' },
  { name: '庚', startAngle: 255, midAngle: 262.5, endAngle: 270, element: '金', direction: '西' },
  { name: '酉', startAngle: 270, midAngle: 277.5, endAngle: 285, element: '金', direction: '西' },
  { name: '辛', startAngle: 285, midAngle: 292.5, endAngle: 300, element: '金', direction: '西' },
  { name: '戌', startAngle: 300, midAngle: 307.5, endAngle: 315, element: '土', direction: '西北' },
  { name: '乾', startAngle: 315, midAngle: 322.5, endAngle: 330, element: '金', direction: '西北' },
  { name: '亥', startAngle: 330, midAngle: 337.5, endAngle: 345, element: '水', direction: '西北' },
];

export const ELEMENT_COLORS: Record<string, string> = {
  金: '#f59e0b',
  木: '#22c55e',
  水: '#3b82f6',
  火: '#ef4444',
  土: '#8b5cf6',
};

export const DIRECTION_COLORS: Record<string, string> = {
  北: '#1e40af',
  东北: '#6b21a8',
  东: '#15803d',
  东南: '#a16207',
  南: '#b91c1c',
  西南: '#9a3412',
  西: '#7c2d12',
  西北: '#3730a3',
};

export const MIN_DECLINATION = -25;
export const MAX_DECLINATION = 25;
export const MIN_ANGLE = 0;
export const MAX_ANGLE = 360;
export const DEFAULT_ERROR_THRESHOLD = 5;
export const CENTER_TOLERANCE = 8;

export function normalizeAngle(angle: number): number {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

export function angleDifference(a: number, b: number): number {
  let diff = Math.abs(a - b) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampDeclination(declination: number): number {
  return clamp(declination, MIN_DECLINATION, MAX_DECLINATION);
}

export function clampAngle(angle: number): number {
  return clamp(angle, MIN_ANGLE, MAX_ANGLE);
}

export function correctForDeclination(compassReading: number, declination: number): number {
  return normalizeAngle(compassReading + declination);
}

export function getMountainByAngle(angle: number): Mountain {
  const normalized = normalizeAngle(angle);

  for (let i = 0; i < TWENTY_FOUR_MOUNTAINS.length; i++) {
    const m = TWENTY_FOUR_MOUNTAINS[i];
    if (normalized >= m.startAngle && normalized < m.endAngle) {
      return m;
    }
  }

  if (normalized >= 345 && normalized < 360) {
    return TWENTY_FOUR_MOUNTAINS[0];
  }

  return TWENTY_FOUR_MOUNTAINS[0];
}

export function pointsToAngle(start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const rad = Math.atan2(dx, -dy);
  let angle = (rad * 180) / Math.PI;
  return normalizeAngle(angle);
}

export function pointDistance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function distanceToLineSegment(point: Point, lineStart: Point, lineEnd: Point): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = lenSq !== 0 ? dot / lenSq : -1;

  let xx, yy;

  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

export function linePassesThroughCenter(
  start: Point,
  end: Point,
  center: Point,
  tolerance: number = CENTER_TOLERANCE
): boolean {
  return distanceToLineSegment(center, start, end) <= tolerance;
}

export function calculateBearingResult(
  rawAngle: number,
  compassRotation: number,
  magneticDeclination: number,
  errorThreshold: number
): BearingResult {
  const compassReading = normalizeAngle(rawAngle - compassRotation);
  const trueBearing = normalizeAngle(compassReading);
  const correctedBearing = correctForDeclination(trueBearing, magneticDeclination);
  const mountain = getMountainByAngle(correctedBearing);
  const errorAmount = angleDifference(correctedBearing, mountain.midAngle);
  const halfMountain = 7.5;
  const errorRange: [number, number] = [
    normalizeAngle(correctedBearing - errorAmount),
    normalizeAngle(correctedBearing + errorAmount),
  ];
  const exceedsThreshold = errorAmount > errorThreshold || errorAmount > halfMountain;

  return {
    compassReading,
    trueBearing,
    correctedBearing,
    mountain,
    errorRange,
    errorAmount,
    exceedsThreshold,
  };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatAngle(angle: number, decimals: number = 2): string {
  return `${normalizeAngle(angle).toFixed(decimals)}°`;
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

export function parseBatchInput(text: string): { items: BatchInputItem[]; errors: string[] } {
  const items: BatchInputItem[] = [];
  const errors: string[] = [];

  const lines = text.split('\n').filter((line) => line.trim() !== '');

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    const commaParts = trimmed.split(/[，,]/).map((s) => s.trim());
    const spaceParts = trimmed.split(/\s+/).filter((s) => s !== '');

    let label = '';
    let angleStr = '';

    if (commaParts.length >= 2) {
      label = commaParts[0];
      angleStr = commaParts[1];
    } else if (spaceParts.length >= 2) {
      label = spaceParts[0];
      angleStr = spaceParts[1];
    } else {
      errors.push(`第 ${index + 1} 行：格式不正确，应为「标签,角度」或「标签 角度」`);
      return;
    }

    const angleMatch = angleStr.match(/(-?\d+\.?\d*)/);
    if (!angleMatch) {
      errors.push(`第 ${index + 1} 行：无法解析角度值「${angleStr}」`);
      return;
    }

    const angle = parseFloat(angleMatch[1]);
    if (isNaN(angle) || angle < 0 || angle > 360) {
      errors.push(`第 ${index + 1} 行：角度值「${angleStr}」超出 0°~360° 范围`);
      return;
    }

    if (!label) {
      errors.push(`第 ${index + 1} 行：标签不能为空`);
      return;
    }

    items.push({
      label,
      compassReading: angle,
    });
  });

  return { items, errors };
}

export const ENV_ELEMENT_COLORS: Record<EnvironmentElement['type'], string> = {
  road: '#6b7280',
  water: '#3b82f6',
  building: '#92400e',
  entrance: '#f59e0b',
};

export const ENV_ELEMENT_LABELS: Record<EnvironmentElement['type'], string> = {
  road: '道路',
  water: '水体',
  building: '建筑',
  entrance: '出入口',
};

export const RISK_TYPE_LABELS: Record<FengShuiRiskType, string> = {
  chong_sha: '冲煞',
  pian_xie: '偏斜',
  zhe_dang: '遮挡',
};

export const RISK_LEVEL_LABELS: Record<FengShuiRiskLevel, string> = {
  critical: '严重',
  warning: '警告',
  caution: '注意',
  safe: '安全',
};

export const RISK_LEVEL_COLORS: Record<FengShuiRiskLevel, string> = {
  critical: '#dc2626',
  warning: '#f59e0b',
  caution: '#3b82f6',
  safe: '#22c55e',
};

function isAngleInRange(angle: number, startAngle: number, endAngle: number): boolean {
  const a = normalizeAngle(angle);
  const s = normalizeAngle(startAngle);
  const e = normalizeAngle(endAngle);
  if (s <= e) {
    return a >= s && a <= e;
  }
  return a >= s || a <= e;
}

function angleRangeOverlap(
  start1: number, end1: number,
  start2: number, end2: number
): { overlaps: boolean; overlapAngle: number } {
  const angles1: number[] = [];
  const s1 = normalizeAngle(start1);
  const e1 = normalizeAngle(end1);
  const s2 = normalizeAngle(start2);
  const e2 = normalizeAngle(end2);

  if (s1 <= e1) {
    for (let a = s1; a <= e1; a += 0.5) angles1.push(normalizeAngle(a));
  } else {
    for (let a = s1; a < 360; a += 0.5) angles1.push(normalizeAngle(a));
    for (let a = 0; a <= e1; a += 0.5) angles1.push(normalizeAngle(a));
  }

  let overlapCount = 0;
  for (const a of angles1) {
    if (isAngleInRange(a, s2, e2)) {
      overlapCount++;
    }
  }

  return {
    overlaps: overlapCount > 0,
    overlapAngle: overlapCount * 0.5,
  };
}

function detectChongSha(
  bearing: number,
  element: EnvironmentElement,
  axisLabel: string
): FengShuiRisk | null {
  if (element.type !== 'road' && element.type !== 'entrance') return null;

  const oppBearing = normalizeAngle(bearing + 180);
  const { overlaps, overlapAngle } = angleRangeOverlap(
    oppBearing - 7.5, oppBearing + 7.5,
    element.startAngle, element.endAngle
  );

  if (!overlaps) return null;

  const directHit = isAngleInRange(oppBearing, element.startAngle, element.endAngle);
  const level: FengShuiRiskLevel = directHit && overlapAngle >= 10 ? 'critical'
    : directHit ? 'warning'
    : overlapAngle >= 5 ? 'caution'
    : 'safe';

  if (level === 'safe') return null;

  const desc = element.type === 'road'
    ? `轴线「${axisLabel}」(${formatAngle(bearing)})反方向${formatAngle(oppBearing)}存在道路「${element.label}」，形成路冲`
    : `轴线「${axisLabel}」(${formatAngle(bearing)})反方向${formatAngle(oppBearing)}存在出入口「${element.label}」，形成门冲`;

  const suggestions: Record<FengShuiRiskLevel, string> = {
    critical: `严重冲煞！建议在「${element.label}」处设置屏风、玄关或绿植化解，或将入口偏转避开正对轴线`,
    warning: `存在冲煞风险，建议在「${element.label}」处设置遮挡物或调整入口朝向`,
    caution: `轻微冲煞，可通过摆放盆栽或挂帘等方式轻微化解`,
    safe: '',
  };

  return {
    id: generateId(),
    type: 'chong_sha',
    level,
    axisLabel,
    axisBearing: bearing,
    elementId: element.id,
    elementLabel: element.label,
    elementType: element.type,
    description: desc,
    angleDiff: overlapAngle,
    suggestion: suggestions[level],
  };
}

function detectPianXie(
  bearing: number,
  element: EnvironmentElement,
  axisLabel: string
): FengShuiRisk | null {
  if (element.type !== 'building') return null;

  const elMidAngle = normalizeAngle((element.startAngle + element.endAngle) / 2);
  const diff = angleDifference(bearing, elMidAngle);

  if (diff <= 5) return null;

  const level: FengShuiRiskLevel = diff >= 30 ? 'critical'
    : diff >= 15 ? 'warning'
    : diff >= 8 ? 'caution'
    : 'safe';

  if (level === 'safe') return null;

  const desc = `轴线「${axisLabel}」(${formatAngle(bearing)})与建筑「${element.label}」朝向(${formatAngle(elMidAngle)})存在${diff.toFixed(1)}°偏斜`;

  const suggestions: Record<FengShuiRiskLevel, string> = {
    critical: `严重偏斜！建筑「${element.label}」与轴线夹角达${diff.toFixed(1)}°，建议重新选址或调整建筑朝向使之与轴线对齐`,
    warning: `偏斜较大，建议通过室内布局或装饰调整来弥补建筑与轴线的角度差异`,
    caution: `轻微偏斜，可通过门窗位置调整来优化室内气场流通`,
    safe: '',
  };

  return {
    id: generateId(),
    type: 'pian_xie',
    level,
    axisLabel,
    axisBearing: bearing,
    elementId: element.id,
    elementLabel: element.label,
    elementType: element.type,
    description: desc,
    angleDiff: diff,
    suggestion: suggestions[level],
  };
}

function detectZheDang(
  bearing: number,
  element: EnvironmentElement,
  axisLabel: string
): FengShuiRisk | null {
  if (element.type !== 'building') return null;

  const { overlaps, overlapAngle } = angleRangeOverlap(
    bearing - 15, bearing + 15,
    element.startAngle, element.endAngle
  );

  if (!overlaps) return null;

  const level: FengShuiRiskLevel = overlapAngle >= 25 ? 'critical'
    : overlapAngle >= 15 ? 'warning'
    : overlapAngle >= 8 ? 'caution'
    : 'safe';

  if (level === 'safe') return null;

  const desc = `轴线「${axisLabel}」(${formatAngle(bearing)})正前方被建筑「${element.label}」遮挡，遮挡范围${overlapAngle.toFixed(1)}°`;

  const suggestions: Record<FengShuiRiskLevel, string> = {
    critical: `严重遮挡！建筑「${element.label}」严重阻挡前方视野与气流，建议选择更高楼层或调整建筑间距`,
    warning: `存在遮挡风险，建筑「${element.label}」影响前方气场流通，建议通过开窗或设天井改善通风采光`,
    caution: `轻微遮挡，对采光通风有一定影响，可通过室内灯光或通风设备辅助`,
    safe: '',
  };

  return {
    id: generateId(),
    type: 'zhe_dang',
    level,
    axisLabel,
    axisBearing: bearing,
    elementId: element.id,
    elementLabel: element.label,
    elementType: element.type,
    description: desc,
    angleDiff: overlapAngle,
    suggestion: suggestions[level],
  };
}

export function analyzeEnvironmentRisks(
  measurements: MeasurementRecord[],
  elements: EnvironmentElement[]
): EnvironmentAnalysisResult {
  const risks: FengShuiRisk[] = [];

  for (const m of measurements) {
    for (const el of elements) {
      const chongSha = detectChongSha(m.correctedBearing, el, m.axisLabel);
      if (chongSha) risks.push(chongSha);

      const pianXie = detectPianXie(m.correctedBearing, el, m.axisLabel);
      if (pianXie) risks.push(pianXie);

      const zheDang = detectZheDang(m.correctedBearing, el, m.axisLabel);
      if (zheDang) risks.push(zheDang);
    }
  }

  risks.sort((a, b) => {
    const levelOrder: Record<FengShuiRiskLevel, number> = { critical: 0, warning: 1, caution: 2, safe: 3 };
    return levelOrder[a.level] - levelOrder[b.level];
  });

  const criticalCount = risks.filter(r => r.level === 'critical').length;
  const warningCount = risks.filter(r => r.level === 'warning').length;
  const cautionCount = risks.filter(r => r.level === 'caution').length;

  const overallLevel: FengShuiRiskLevel = criticalCount > 0 ? 'critical'
    : warningCount > 0 ? 'warning'
    : cautionCount > 0 ? 'caution'
    : 'safe';

  const summary = generateEnvironmentSummary(measurements.length, elements.length, risks, criticalCount, warningCount, cautionCount);
  const suggestions = generateEnvironmentSuggestions(risks);

  return {
    risks,
    criticalCount,
    warningCount,
    cautionCount,
    safeCount: measurements.length * elements.length - risks.length,
    overallLevel,
    summary,
    suggestions,
  };
}

function generateEnvironmentSummary(
  measurementCount: number,
  elementCount: number,
  risks: FengShuiRisk[],
  criticalCount: number,
  warningCount: number,
  cautionCount: number
): string {
  if (measurementCount === 0 && elementCount === 0) {
    return '暂无测量记录和环境要素，请先添加数据后再进行分析。';
  }
  if (measurementCount === 0) {
    return `已添加 ${elementCount} 个环境要素，但尚无测量记录，请先进行轴线测量。`;
  }
  if (elementCount === 0) {
    return `共有 ${measurementCount} 条测量记录，但尚无环境要素，请添加周边道路、水体、建筑等要素。`;
  }

  const parts: string[] = [];
  parts.push(`共 ${measurementCount} 条轴线与 ${elementCount} 个环境要素进行交叉分析，`);

  if (risks.length === 0) {
    parts.push('未发现风水敏感区风险，选址环境良好。');
  } else {
    parts.push(`发现 ${risks.length} 个风险点：`);
    if (criticalCount > 0) parts.push(`严重 ${criticalCount} 个`);
    if (warningCount > 0) parts.push(`警告 ${warningCount} 个`);
    if (cautionCount > 0) parts.push(`注意 ${cautionCount} 个`);

    const chongShaCount = risks.filter(r => r.type === 'chong_sha').length;
    const pianXieCount = risks.filter(r => r.type === 'pian_xie').length;
    const zheDangCount = risks.filter(r => r.type === 'zhe_dang').length;

    const typeParts: string[] = [];
    if (chongShaCount > 0) typeParts.push(`冲煞 ${chongShaCount} 处`);
    if (pianXieCount > 0) typeParts.push(`偏斜 ${pianXieCount} 处`);
    if (zheDangCount > 0) typeParts.push(`遮挡 ${zheDangCount} 处`);
    if (typeParts.length > 0) {
      parts.push('（' + typeParts.join('、') + '）');
    }
  }

  return parts.join('');
}

function generateEnvironmentSuggestions(
  risks: FengShuiRisk[]
): string[] {
  const suggestions: string[] = [];

  if (risks.length === 0) {
    suggestions.push('当前选址环境与轴线方位关系良好，无需特别调整。');
    return suggestions;
  }

  const criticalRisks = risks.filter(r => r.level === 'critical');
  const warningRisks = risks.filter(r => r.level === 'warning');

  if (criticalRisks.length > 0) {
    suggestions.push('【严重风险】以下问题需要优先处理：');
    criticalRisks.forEach(r => {
      suggestions.push(`  → ${r.suggestion}`);
    });
  }

  if (warningRisks.length > 0) {
    suggestions.push('【警告风险】建议关注以下问题：');
    warningRisks.forEach(r => {
      suggestions.push(`  → ${r.suggestion}`);
    });
  }

  const chongShaRisks = risks.filter(r => r.type === 'chong_sha');
  if (chongShaRisks.length > 0) {
    suggestions.push('冲煞化解通用建议：可在冲煞方向设置屏风、玄关、绿植、八卦镜等化煞物件。');
  }

  const zheDangRisks = risks.filter(r => r.type === 'zhe_dang');
  if (zheDangRisks.length > 0) {
    suggestions.push('遮挡改善通用建议：考虑调整建筑间距、增加采光面、设置天井或内院改善气流。');
  }

  const pianXieRisks = risks.filter(r => r.type === 'pian_xie');
  if (pianXieRisks.length > 0) {
    suggestions.push('偏斜修正通用建议：通过室内隔断、门窗偏移等手法弥补建筑与轴线的角度偏差。');
  }

  return suggestions;
}
