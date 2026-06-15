import type {
  SurveyPlan,
  MeasurementRecord,
  BatchInputItem,
  BearingResult,
} from '@/types';
import {
  generateId,
  normalizeAngle,
  getMountainByAngle,
  angleDifference,
  calculateBearingResult,
  DEFAULT_ERROR_THRESHOLD,
  HALF_MOUNTAIN,
} from './bearing';

export const STORAGE_KEY_PLANS = 'compass-survey-plans';

export function createDefaultPlan(): SurveyPlan {
  return {
    id: generateId(),
    name: '默认方案',
    description: '初始测量方案',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    magneticDeclination: 0,
    errorThreshold: DEFAULT_ERROR_THRESHOLD,
    measurements: [],
    isActive: true,
  };
}

export function createPlan(
  name: string,
  description: string = '',
  templatePlan?: SurveyPlan | null
): SurveyPlan {
  return {
    id: generateId(),
    name,
    description,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    magneticDeclination: templatePlan?.magneticDeclination ?? 0,
    errorThreshold: templatePlan?.errorThreshold ?? DEFAULT_ERROR_THRESHOLD,
    measurements: [],
    isActive: false,
  };
}

export function duplicatePlan(sourcePlan: SurveyPlan, newName?: string): SurveyPlan {
  return {
    id: generateId(),
    name: newName || `${sourcePlan.name} (副本)`,
    description: sourcePlan.description,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    magneticDeclination: sourcePlan.magneticDeclination,
    errorThreshold: sourcePlan.errorThreshold,
    measurements: sourcePlan.measurements.map((m) => ({
      ...m,
      id: generateId(),
      timestamp: Date.now(),
    })),
    isActive: false,
  };
}

export function findActivePlan(plans: SurveyPlan[]): SurveyPlan | null {
  const active = plans.find((p) => p.isActive);
  return active ?? plans[0] ?? null;
}

export function setActivePlan(plans: SurveyPlan[], planId: string): SurveyPlan[] {
  return plans.map((p) => ({
    ...p,
    isActive: p.id === planId,
  }));
}

export function updatePlan(
  plans: SurveyPlan[],
  planId: string,
  updates: Partial<SurveyPlan>
): SurveyPlan[] {
  return plans.map((p) => {
    if (p.id !== planId) return p;

    let updatedMeasurements = p.measurements;

    if (updates.errorThreshold !== undefined && updates.errorThreshold !== p.errorThreshold) {
      const newThreshold = updates.errorThreshold;
      updatedMeasurements = recalculateMeasurementsForThreshold(p.measurements, newThreshold);
    }

    return {
      ...p,
      ...updates,
      measurements: updatedMeasurements,
      updatedAt: Date.now(),
    };
  });
}

export function updateMagneticDeclination(
  plans: SurveyPlan[],
  planId: string,
  declination: number
): SurveyPlan[] {
  return plans.map((p) => {
    if (p.id !== planId) return p;
    const oldDeclination = p.magneticDeclination;
    const delta = declination - oldDeclination;

    const updatedMeasurements = recalculateMeasurementsForDeclination(
      p.measurements,
      delta,
      p.errorThreshold
    );

    return {
      ...p,
      magneticDeclination: declination,
      measurements: updatedMeasurements,
      updatedAt: Date.now(),
    };
  });
}

export function recalculateMeasurementsForDeclination(
  measurements: MeasurementRecord[],
  delta: number,
  errorThreshold: number
): MeasurementRecord[] {
  if (delta === 0) return measurements;

  return measurements.map((m) => {
    const newCorrected = normalizeAngle(m.correctedBearing + delta);
    const mountain = getMountainByAngle(newCorrected);
    const errorAmount = angleDifference(newCorrected, mountain.midAngle);
    const exceedsThreshold = errorAmount > errorThreshold || errorAmount > HALF_MOUNTAIN;
    const errorRange: [number, number] = [
      normalizeAngle(newCorrected - errorAmount),
      normalizeAngle(newCorrected + errorAmount),
    ];
    return {
      ...m,
      correctedBearing: newCorrected,
      mountainName: mountain.name,
      mountainElement: mountain.element,
      errorAmount,
      errorRange,
      exceedsThreshold,
    };
  });
}

export function recalculateMeasurementsForThreshold(
  measurements: MeasurementRecord[],
  errorThreshold: number
): MeasurementRecord[] {
  return measurements.map((m) => {
    const exceedsThreshold = m.errorAmount > errorThreshold || m.errorAmount > HALF_MOUNTAIN;
    return {
      ...m,
      exceedsThreshold,
    };
  });
}

export function isDuplicateMeasurement(
  plan: SurveyPlan | undefined | null,
  axisId: string,
  axisLabel: string,
  correctedBearing: number,
  tolerance: number = 0.5
): boolean {
  if (!plan) return false;

  return plan.measurements.some((m) => {
    const angleDiff = Math.abs(normalizeAngle(m.correctedBearing) - normalizeAngle(correctedBearing));
    const angleMatch = angleDiff <= tolerance || Math.abs(angleDiff - 360) <= tolerance;

    if (m.axisId === axisId) {
      return angleMatch;
    }

    return m.axisLabel === axisLabel && angleMatch;
  });
}

export function addMeasurement(
  plans: SurveyPlan[],
  planId: string,
  record: Omit<MeasurementRecord, 'id' | 'timestamp'>
): { plans: SurveyPlan[]; success: boolean; duplicate: boolean } {
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return { plans, success: false, duplicate: false };

  const duplicate = isDuplicateMeasurement(
    plan,
    record.axisId,
    record.axisLabel,
    record.correctedBearing
  );
  if (duplicate) {
    return { plans, success: false, duplicate: true };
  }

  const newRecord: MeasurementRecord = {
    ...record,
    id: generateId(),
    timestamp: Date.now(),
  };

  const updatedPlans = plans.map((p) =>
    p.id === planId
      ? {
          ...p,
          measurements: [...p.measurements, newRecord],
          updatedAt: Date.now(),
        }
      : p
  );

  return { plans: updatedPlans, success: true, duplicate: false };
}

export function removeMeasurement(
  plans: SurveyPlan[],
  planId: string,
  recordId: string
): SurveyPlan[] {
  return plans.map((p) =>
    p.id === planId
      ? {
          ...p,
          measurements: p.measurements.filter((m) => m.id !== recordId),
          updatedAt: Date.now(),
        }
      : p
  );
}

export function clearMeasurements(plans: SurveyPlan[], planId: string): SurveyPlan[] {
  return plans.map((p) =>
    p.id === planId
      ? {
          ...p,
          measurements: [],
          updatedAt: Date.now(),
        }
      : p
  );
}

export function restorePlanFromSnapshot(
  plans: SurveyPlan[],
  planId: string,
  snapshot: {
    magneticDeclination: number;
    errorThreshold: number;
    measurements: MeasurementRecord[];
  }
): SurveyPlan[] {
  return plans.map((p) => {
    if (p.id !== planId) return p;

    const needsRecalc =
      snapshot.magneticDeclination !== p.magneticDeclination ||
      snapshot.errorThreshold !== p.errorThreshold;

    let measurements = snapshot.measurements;

    if (needsRecalc) {
      const delta = snapshot.magneticDeclination - p.magneticDeclination;
      measurements = snapshot.measurements.map((m) => {
        if (delta !== 0) {
          const newCorrected = normalizeAngle(m.correctedBearing + delta);
          const mountain = getMountainByAngle(newCorrected);
          const errorAmount = angleDifference(newCorrected, mountain.midAngle);
          const exceedsThreshold = errorAmount > snapshot.errorThreshold || errorAmount > HALF_MOUNTAIN;
          const errorRange: [number, number] = [
            normalizeAngle(newCorrected - errorAmount),
            normalizeAngle(newCorrected + errorAmount),
          ];
          return {
            ...m,
            correctedBearing: newCorrected,
            mountainName: mountain.name,
            mountainElement: mountain.element,
            errorAmount,
            errorRange,
            exceedsThreshold,
          };
        }

        const exceedsThreshold = m.errorAmount > snapshot.errorThreshold || m.errorAmount > HALF_MOUNTAIN;
        return { ...m, exceedsThreshold };
      });
    }

    return {
      ...p,
      magneticDeclination: snapshot.magneticDeclination,
      errorThreshold: snapshot.errorThreshold,
      measurements,
      updatedAt: Date.now(),
    };
  });
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

export function batchInputToResults(
  items: BatchInputItem[],
  rotation: number,
  magneticDeclination: number,
  errorThreshold: number
): { label: string; result: BearingResult }[] {
  return items.map((item) => ({
    label: item.label,
    result: calculateBearingResult(
      item.compassReading + rotation,
      rotation,
      magneticDeclination,
      errorThreshold
    ),
  }));
}

export function processBatchInput(
  plans: SurveyPlan[],
  planId: string,
  items: { label: string; result: BearingResult }[],
  rotation: number,
  magneticDeclination: number,
  errorThreshold: number
): {
  plans: SurveyPlan[];
  successCount: number;
  duplicateCount: number;
  exceedCount: number;
} {
  let currentPlans = plans;
  let successCount = 0;
  let duplicateCount = 0;
  let exceedCount = 0;
  const seen = new Set<string>();

  items.forEach((item) => {
    const key = `${item.label}-${item.result.correctedBearing.toFixed(2)}`;

    if (seen.has(key)) {
      duplicateCount++;
      return;
    }
    seen.add(key);

    const { plans: newPlans, success, duplicate } = addMeasurement(currentPlans, planId, {
      axisId: `batch-${generateId()}`,
      axisLabel: item.label,
      compassReading: item.result.compassReading,
      trueBearing: item.result.trueBearing,
      correctedBearing: item.result.correctedBearing,
      mountainName: item.result.mountain.name,
      mountainElement: item.result.mountain.element,
      errorRange: item.result.errorRange,
      errorAmount: item.result.errorAmount,
      exceedsThreshold: item.result.exceedsThreshold,
    });

    currentPlans = newPlans;

    if (success) {
      successCount++;
      if (item.result.exceedsThreshold) exceedCount++;
    }
    if (duplicate) {
      duplicateCount++;
      seen.delete(key);
    }
  });

  return { plans: currentPlans, successCount, duplicateCount, exceedCount };
}

export function loadPlansFromStorage(): SurveyPlan[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PLANS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load plans from storage', e);
  }
  return [createDefaultPlan()];
}

export function savePlansToStorage(plans: SurveyPlan[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(plans));
  } catch (e) {
    console.error('Failed to save plans', e);
  }
}
