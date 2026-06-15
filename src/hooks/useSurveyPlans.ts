import { useState, useCallback, useEffect } from 'react';
import type { SurveyPlan, MeasurementRecord } from '@/types';
import type { BearingResult } from '@/types';
import {
  createPlan as domainCreatePlan,
  duplicatePlan as domainDuplicatePlan,
  setActivePlan as domainSetActivePlan,
  updatePlan as domainUpdatePlan,
  updateMagneticDeclination as domainUpdateMagneticDeclination,
  addMeasurement as domainAddMeasurement,
  removeMeasurement as domainRemoveMeasurement,
  clearMeasurements as domainClearMeasurements,
  isDuplicateMeasurement,
  restorePlanFromSnapshot as domainRestorePlanFromSnapshot,
  loadPlansFromStorage,
  savePlansToStorage,
  findActivePlan,
  processBatchInput as domainProcessBatchInput,
} from '@/utils/domain';

export function useSurveyPlans() {
  const [plans, setPlans] = useState<SurveyPlan[]>(() => loadPlansFromStorage());

  const [activePlanId, setActivePlanId] = useState<string | null>(() => {
    const active = findActivePlan(plans);
    return active?.id ?? null;
  });

  useEffect(() => {
    savePlansToStorage(plans);
  }, [plans]);

  const activePlan = plans.find((p) => p.id === activePlanId) || null;

  const createPlan = useCallback((name: string, description: string = '') => {
    const newPlan = domainCreatePlan(name, description, activePlan);
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
    setPlans((prev) => domainSetActivePlan(prev, planId));
  }, []);

  const updatePlan = useCallback((planId: string, updates: Partial<SurveyPlan>) => {
    setPlans((prev) => domainUpdatePlan(prev, planId, updates));
  }, []);

  const updateMagneticDeclination = useCallback((planId: string, declination: number) => {
    setPlans((prev) => domainUpdateMagneticDeclination(prev, planId, declination));
  }, []);

  const addMeasurement = useCallback(
    (planId: string, record: Omit<MeasurementRecord, 'id' | 'timestamp'>): { success: boolean; duplicate: boolean } => {
      const plan = plans.find((p) => p.id === planId);
      const duplicate = isDuplicateMeasurement(
        plan,
        record.axisId,
        record.axisLabel,
        record.correctedBearing
      );
      if (duplicate) {
        return { success: false, duplicate: true };
      }

      setPlans((prev) => {
        const result = domainAddMeasurement(prev, planId, record);
        return result.plans;
      });

      return { success: true, duplicate: false };
    },
    [plans]
  );

  const removeMeasurement = useCallback((planId: string, recordId: string) => {
    setPlans((prev) => domainRemoveMeasurement(prev, planId, recordId));
  }, []);

  const clearMeasurements = useCallback((planId: string) => {
    setPlans((prev) => domainClearMeasurements(prev, planId));
  }, []);

  const duplicatePlan = useCallback((planId: string, newName?: string): SurveyPlan | null => {
    const sourcePlan = plans.find((p) => p.id === planId);
    if (!sourcePlan) return null;

    const newPlan = domainDuplicatePlan(sourcePlan, newName);
    setPlans((prev) => [...prev, newPlan]);
    return newPlan;
  }, [plans]);

  const restorePlanFromSnapshot = useCallback(
    (planId: string, snapshot: { magneticDeclination: number; errorThreshold: number; measurements: MeasurementRecord[] }) => {
      setPlans((prev) => domainRestorePlanFromSnapshot(prev, planId, snapshot));
    },
    []
  );

  const batchAddMeasurements = useCallback(
    (
      planId: string,
      items: { label: string; result: BearingResult }[],
      rotation: number,
      magneticDeclination: number,
      errorThreshold: number
    ): {
      successCount: number;
      duplicateCount: number;
      exceedCount: number;
    } => {
      const result = domainProcessBatchInput(
        plans,
        planId,
        items,
        rotation,
        magneticDeclination,
        errorThreshold
      );
      setPlans(result.plans);
      return {
        successCount: result.successCount,
        duplicateCount: result.duplicateCount,
        exceedCount: result.exceedCount,
      };
    },
    [plans]
  );

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
    isDuplicateMeasurement: (
      planId: string,
      axisId: string,
      axisLabel: string,
      correctedBearing: number
    ) => {
      const plan = plans.find((p) => p.id === planId);
      return isDuplicateMeasurement(plan, axisId, axisLabel, correctedBearing);
    },
    restorePlanFromSnapshot,
    batchAddMeasurements,
  };
}
