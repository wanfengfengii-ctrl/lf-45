import type { Mountain, Point, BearingResult, AxisLine } from '@/types';

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
export const HALF_MOUNTAIN = 7.5;

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
  const errorRange: [number, number] = [
    normalizeAngle(correctedBearing - errorAmount),
    normalizeAngle(correctedBearing + errorAmount),
  ];
  const exceedsThreshold = errorAmount > errorThreshold || errorAmount > HALF_MOUNTAIN;

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

export function formatAngle(angle: number, decimals: number = 2): string {
  return `${normalizeAngle(angle).toFixed(decimals)}°`;
}

export function calculateAxisAngle(axis: AxisLine): number {
  return pointsToAngle(axis.startPoint, axis.endPoint);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
