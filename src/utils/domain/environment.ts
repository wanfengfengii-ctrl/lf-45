import type {
  EnvironmentElement,
  EnvironmentElementType,
  FengShuiRisk,
  FengShuiRiskLevel,
  FengShuiRiskType,
  EnvironmentAnalysisResult,
  MeasurementRecord,
} from '@/types';
import { normalizeAngle, angleDifference, formatAngle, generateId } from './bearing';

export const ENV_ELEMENT_COLORS: Record<EnvironmentElementType, string> = {
  road: '#6b7280',
  water: '#3b82f6',
  building: '#92400e',
  entrance: '#f59e0b',
};

export const ENV_ELEMENT_LABELS: Record<EnvironmentElementType, string> = {
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

export function isAngleInRange(angle: number, startAngle: number, endAngle: number): boolean {
  const a = normalizeAngle(angle);
  const s = normalizeAngle(startAngle);
  const e = normalizeAngle(endAngle);
  if (s <= e) {
    return a >= s && a <= e;
  }
  return a >= s || a <= e;
}

export function angleRangeOverlap(
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

export function detectChongSha(
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

export function detectPianXie(
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

export function detectZheDang(
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

export function generateEnvironmentSummary(
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

export function generateEnvironmentSuggestions(
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

export function groupElementsByType(
  elements: EnvironmentElement[]
): Record<EnvironmentElementType, EnvironmentElement[]> {
  const result: Record<EnvironmentElementType, EnvironmentElement[]> = {
    road: [],
    water: [],
    building: [],
    entrance: [],
  };
  elements.forEach((e) => {
    result[e.type].push(e);
  });
  return result;
}
