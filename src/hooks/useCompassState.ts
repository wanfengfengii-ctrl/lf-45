import { useState, useCallback, useRef, useMemo } from 'react';
import type { AxisLine, BearingResult, SurveyPlan } from '@/types';
import {
  clampAngle,
  calculateBearingResult,
  pointsToAngle,
  formatAngle,
  generateId,
} from '@/utils/domain';

export interface CompassStateParams {
  magneticDeclination: number;
  errorThreshold: number;
  activePlan: SurveyPlan | null;
}

export function useCompassState(params: CompassStateParams) {
  const { magneticDeclination, errorThreshold } = params;

  const [rotation, setRotation] = useState(0);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [axes, setAxes] = useState<AxisLine[]>([]);
  const [previewAngle, setPreviewAngle] = useState<number | null>(null);
  const [pendingAxis, setPendingAxis] = useState<AxisLine | null>(null);
  const [axisLabel, setAxisLabel] = useState('');
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  const lastRotationRef = useRef(rotation);

  const currentBearingResult = useMemo<BearingResult | null>(() => {
    const rawAngle = previewAngle ?? rotation;
    if (rawAngle === null || rawAngle === undefined) return null;
    return calculateBearingResult(
      rawAngle,
      rotation,
      magneticDeclination,
      errorThreshold
    );
  }, [previewAngle, rotation, magneticDeclination, errorThreshold]);

  const selectedAxisResult = useMemo<BearingResult | null>(() => {
    if (!pendingAxis) return null;
    const rawAngle = pointsToAngle(pendingAxis.startPoint, pendingAxis.endPoint);
    return calculateBearingResult(
      rawAngle,
      rotation,
      magneticDeclination,
      errorThreshold
    );
  }, [pendingAxis, rotation, magneticDeclination, errorThreshold]);

  const bearingResult = pendingAxis ? selectedAxisResult : currentBearingResult;

  const handleRotationChange = useCallback((newRotation: number) => {
    const clamped = clampAngle(newRotation);
    setRotation(clamped);
    lastRotationRef.current = clamped;
  }, []);

  const handleDrawingModeToggle = useCallback((enabled: boolean) => {
    setIsDrawingMode(enabled);
  }, []);

  const handleAxisDrawn = useCallback(
    (axis: AxisLine): { valid: boolean; angle: number; result?: BearingResult } => {
      const angle = pointsToAngle(axis.startPoint, axis.endPoint);
      const result = calculateBearingResult(angle, rotation, magneticDeclination, errorThreshold);

      const newAxes = [...axes, axis];
      setAxes(newAxes);

      if (!axis.passesCenter) {
        return { valid: false, angle };
      }

      const axisNumber = axes.filter((a) => a.passesCenter).length + 1;
      const defaultLabel = `轴线${axisNumber}`;
      setAxisLabel(defaultLabel);
      setPendingAxis(axis);
      setSaveModalOpen(true);

      return { valid: true, angle, result };
    },
    [axes, rotation, magneticDeclination, errorThreshold]
  );

  const handleCancelSave = useCallback(() => {
    if (pendingAxis) {
      setAxes((prev) => prev.filter((a) => a.id !== pendingAxis.id));
    }
    setPendingAxis(null);
    setAxisLabel('');
    setSaveModalOpen(false);
  }, [pendingAxis]);

  const handleSaveMeasurement = useCallback((): {
    success: boolean;
    axisId?: string;
    axisLabel?: string;
    result?: BearingResult;
  } => {
    if (!pendingAxis) {
      setSaveModalOpen(false);
      return { success: false };
    }

    if (!axisLabel.trim()) {
      return { success: false };
    }

    const angle = pointsToAngle(pendingAxis.startPoint, pendingAxis.endPoint);
    const result = calculateBearingResult(angle, rotation, magneticDeclination, errorThreshold);

    const axisWithLabel = {
      ...pendingAxis,
      label: axisLabel.trim(),
    };
    setAxes((prev) => prev.map((a) => (a.id === pendingAxis.id ? axisWithLabel : a)));

    setPendingAxis(null);
    setAxisLabel('');
    setSaveModalOpen(false);
    setIsDrawingMode(false);

    return {
      success: true,
      axisId: pendingAxis.id,
      axisLabel: axisLabel.trim(),
      result,
    };
  }, [pendingAxis, axisLabel, rotation, magneticDeclination, errorThreshold]);

  const handleResetCompass = useCallback(() => {
    setRotation(0);
    lastRotationRef.current = 0;
  }, []);

  const handleClearAxes = useCallback(() => {
    setAxes([]);
    setPendingAxis(null);
  }, []);

  const openSaveModal = useCallback(() => {
    setSaveModalOpen(true);
  }, []);

  const closeSaveModal = useCallback(() => {
    setSaveModalOpen(false);
  }, []);

  const getSnapshotData = useCallback(() => ({
    rotation,
    isDrawingMode,
    axes,
  }), [rotation, isDrawingMode, axes]);

  const applySnapshotData = useCallback((data: {
    rotation: number;
    isDrawingMode: boolean;
    axes: AxisLine[];
  }) => {
    setRotation(data.rotation);
    lastRotationRef.current = data.rotation;
    setIsDrawingMode(data.isDrawingMode);
    setAxes(data.axes);
  }, []);

  const updateAxisLabelsFromPlan = useCallback((plan: SurveyPlan | null) => {
    if (plan) {
      setAxes((prev) =>
        prev.map((a) => {
          const measurement = plan.measurements.find((m) => m.axisId === a.id);
          return measurement
            ? { ...a, label: measurement.axisLabel }
            : a;
        })
      );
    }
  }, []);

  return {
    rotation,
    isDrawingMode,
    axes,
    previewAngle,
    pendingAxis,
    axisLabel,
    saveModalOpen,
    bearingResult,
    selectedAxisResult,
    currentBearingResult,
    setAxisLabel,
    setPreviewAngle,
    handleRotationChange,
    handleDrawingModeToggle,
    handleAxisDrawn,
    handleSaveMeasurement,
    handleCancelSave,
    handleResetCompass,
    handleClearAxes,
    openSaveModal,
    closeSaveModal,
    getSnapshotData,
    applySnapshotData,
    updateAxisLabelsFromPlan,
    lastRotationRef,
  };
}

export function createAxisId(): string {
  return generateId();
}

export function formatCompassAngle(angle: number): string {
  return formatAngle(angle);
}
