import { useState, useCallback, useEffect } from 'react';
import type { SurveyPlan, MeasurementRecord } from '@/types';
import {
  generateId,
  normalizeAngle,
  calculateBearingResult,
  getMountainByAngle,
  angleDifference,
} from '@/utils/compass';

const STORAGE_KEY = 'compass-survey-plans';

export function useSurveyPlans() {
  const [plans, setPlans] = useState<SurveyPlan[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load plans from storage', e);
    }
    return [
      {
        id: generateId(),
        name: '默认方案',
        description: '初始测量方案',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        magneticDeclination: 0,
        errorThreshold: 5,
        measurements: [],
        isActive: true,
      },
    ];
  });

  const [activePlanId, setActivePlanId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const plans = JSON.parse(saved);
        const active = plans.find((p: SurveyPlan) => p.isActive);
        return active ? active.id : plans[0]?.id || null;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    } catch (e) {
      console.error('Failed to save plans', e);
    }
  }, [plans]);

  const activePlan = plans.find((p) => p.id === activePlanId) || null;

  const createPlan = useCallback((name: string, description: string = '') => {
    const newPlan: SurveyPlan = {
      id: generateId(),
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      magneticDeclination: activePlan?.magneticDeclination ?? 0,
      errorThreshold: activePlan?.errorThreshold ?? 5,
      measurements: [],
      isActive: false,
    };
    setPlans((prev) => [...prev, newPlan]);
    return newPlan;
  }, [activePlan]);

  const deletePlan = useCallback((planId: string) => {
    setPlans((prev) => {
      const filtered = prev.filter((p) => p.id !== planId);
      if (activePlanId === planId && filtered.length > 0) {
        setActivePlanId(filtered[0].id);
      }
      return filtered;
    });
  }, [activePlanId]);

  const setActivePlan = useCallback((planId: string) => {
    setActivePlanId(planId);
    setPlans((prev) =>
      prev.map((p) => ({
        ...p,
        isActive: p.id === planId,
      }))
    );
  }, []);

  const updatePlan = useCallback((planId: string, updates: Partial<SurveyPlan>) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;

        let updatedMeasurements = p.measurements;

        if (updates.errorThreshold !== undefined && updates.errorThreshold !== p.errorThreshold) {
          const newThreshold = updates.errorThreshold;
          updatedMeasurements = p.measurements.map((m) => {
            const exceedsThreshold = m.errorAmount > newThreshold || m.errorAmount > 7.5;
            return {
              ...m,
              exceedsThreshold,
            };
          });
        }

        return {
          ...p,
          ...updates,
          measurements: updatedMeasurements,
          updatedAt: Date.now(),
        };
      })
    );
  }, []);

  const updateMagneticDeclination = useCallback((planId: string, declination: number) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        const oldDeclination = p.magneticDeclination;
        const delta = declination - oldDeclination;

        const updatedMeasurements = p.measurements.map((m) => {
          const newCorrected = normalizeAngle(m.correctedBearing + delta);
          const mountain = getMountainByAngle(newCorrected);
          const errorAmount = angleDifference(newCorrected, mountain.midAngle);
          const exceedsThreshold = errorAmount > p.errorThreshold || errorAmount > 7.5;
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

        return {
          ...p,
          magneticDeclination: declination,
          measurements: updatedMeasurements,
          updatedAt: Date.now(),
        };
      })
    );
  }, []);

  const isDuplicateMeasurement = useCallback(
    (
      planId: string,
      axisId: string,
      axisLabel: string,
      correctedBearing: number,
      tolerance: number = 0.5
    ): boolean => {
      const plan = plans.find((p) => p.id === planId);
      if (!plan) return false;

      return plan.measurements.some((m) => {
        const angleDiff = Math.abs(normalizeAngle(m.correctedBearing) - normalizeAngle(correctedBearing));
        const angleMatch = angleDiff <= tolerance || Math.abs(angleDiff - 360) <= tolerance;

        if (m.axisId === axisId) {
          return angleMatch;
        }

        return m.axisLabel === axisLabel && angleMatch;
      });
    },
    [plans]
  );

  const addMeasurement = useCallback(
    (planId: string, record: Omit<MeasurementRecord, 'id' | 'timestamp'>): { success: boolean; duplicate: boolean } => {
      const plan = plans.find((p) => p.id === planId);
      if (!plan) return { success: false, duplicate: false };

      const duplicate = isDuplicateMeasurement(
        planId,
        record.axisId,
        record.axisLabel,
        record.correctedBearing
      );
      if (duplicate) {
        return { success: false, duplicate: true };
      }

      const newRecord: MeasurementRecord = {
        ...record,
        id: generateId(),
        timestamp: Date.now(),
      };

      setPlans((prev) =>
        prev.map((p) =>
          p.id === planId
            ? {
                ...p,
                measurements: [...p.measurements, newRecord],
                updatedAt: Date.now(),
              }
            : p
        )
      );

      return { success: true, duplicate: false };
    },
    [plans, isDuplicateMeasurement]
  );

  const removeMeasurement = useCallback((planId: string, recordId: string) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              measurements: p.measurements.filter((m) => m.id !== recordId),
              updatedAt: Date.now(),
            }
          : p
      )
    );
  }, []);

  const clearMeasurements = useCallback((planId: string) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              measurements: [],
              updatedAt: Date.now(),
            }
          : p
      )
    );
  }, []);

  const duplicatePlan = useCallback((planId: string, newName?: string): SurveyPlan | null => {
    const sourcePlan = plans.find((p) => p.id === planId);
    if (!sourcePlan) return null;

    const newPlan: SurveyPlan = {
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

    setPlans((prev) => [...prev, newPlan]);
    return newPlan;
  }, [plans]);

  return {
    plans,
    activePlan,
    activePlanId,
    createPlan,
    deletePlan,
    setActivePlan,
    updatePlan,
    updateMagneticDeclination,
    addMeasurement,
    removeMeasurement,
    clearMeasurements,
    duplicatePlan,
    isDuplicateMeasurement,
  };
}
