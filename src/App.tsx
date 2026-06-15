import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  AppShell,
  Container,
  Group,
  Text,
  Stack,
  Paper,
  ThemeIcon,
  Badge,
  Button,
  Tooltip,
  Divider,
  SimpleGrid,
  Modal,
  TextInput,
  Drawer,
  ScrollArea,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCompass,
  IconDeviceFloppy,
  IconTrash,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconPlus,
  IconRulerMeasure,
  IconInfoCircle,
  IconRotate,
  IconReport,
  IconUpload,
  IconHistory,
  IconMap,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

import { CompassDial } from '@/components/CompassDial';
import { ControlPanel } from '@/components/ControlPanel';
import { SurveyPlanManager } from '@/components/SurveyPlanManager';
import { BatchInputModal } from '@/components/BatchInputModal';
import { StatisticsPanel } from '@/components/StatisticsPanel';
import { AnalysisReportModal } from '@/components/AnalysisReportModal';
import { HistoryPlaybackPanel } from '@/components/HistoryPlaybackPanel';
import { EnvironmentOverlayPanel } from '@/components/EnvironmentOverlayPanel';
import { useSurveyPlans } from '@/hooks/useSurveyPlans';
import { useHistory } from '@/hooks/useHistory';
import { useEnvironmentOverlay } from '@/hooks/useEnvironmentOverlay';
import type { AxisLine, BearingResult, OperationSnapshot } from '@/types';
import {
  pointsToAngle,
  calculateBearingResult,
  generateId,
  clampAngle,
  clampDeclination,
  DEFAULT_ERROR_THRESHOLD,
  formatAngle,
} from '@/utils/compass';

function App() {
  const {
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
    restorePlanFromSnapshot,
  } = useSurveyPlans();

  const history = useHistory();

  const {
    elements: envElements,
    showOverlay: showEnvOverlay,
    analysis: envAnalysis,
    addElement: addEnvElement,
    removeElement: removeEnvElement,
    clearElements: clearEnvElements,
    toggleOverlay: toggleEnvOverlay,
    setShowOverlay: setShowEnvOverlay,
  } = useEnvironmentOverlay(activePlan?.measurements ?? []);

  const [envDrawerOpen, { open: openEnvDrawer, close: closeEnvDrawer }] = useDisclosure(false);

  const [rotation, setRotation] = useState(0);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [axes, setAxes] = useState<AxisLine[]>([]);
  const [previewAngle, setPreviewAngle] = useState<number | null>(null);
  const [saveModalOpen, { open: openSave, close: closeSave }] = useDisclosure(false);
  const [pendingAxis, setPendingAxis] = useState<AxisLine | null>(null);
  const [axisLabel, setAxisLabel] = useState('');
  const [showHelp, { open: openHelp, close: closeHelp }] = useDisclosure(false);
  const [batchInputModalOpen, { open: openBatchInput, close: closeBatchInput }] = useDisclosure(false);
  const [analysisReportModalOpen, { open: openAnalysisReport, close: closeAnalysisReport }] = useDisclosure(false);
  const [historyDrawerOpen, { open: openHistoryDrawer, close: closeHistoryDrawer }] = useDisclosure(false);

  const lastRotationRef = useRef(rotation);
  const lastDeclinationRef = useRef(activePlan?.magneticDeclination ?? 0);
  const lastThresholdRef = useRef(activePlan?.errorThreshold ?? DEFAULT_ERROR_THRESHOLD);
  const isApplyingSnapshotRef = useRef(false);

  const magneticDeclination = activePlan?.magneticDeclination ?? 0;
  const errorThreshold = activePlan?.errorThreshold ?? DEFAULT_ERROR_THRESHOLD;

  const getCurrentSnapshot = useCallback((): OperationSnapshot => {
    return history.createSnapshot({
      rotation,
      magneticDeclination,
      errorThreshold,
      isDrawingMode,
      axes,
      activePlan,
    });
  }, [history, rotation, magneticDeclination, errorThreshold, isDrawingMode, axes, activePlan]);

  const applySnapshot = useCallback((snapshot: OperationSnapshot, silent: boolean = false) => {
    isApplyingSnapshotRef.current = true;

    setRotation(snapshot.rotation);
    lastRotationRef.current = snapshot.rotation;

    setIsDrawingMode(snapshot.isDrawingMode);
    setAxes(snapshot.axes);

    if (snapshot.activePlanId) {
      if (snapshot.activePlanId !== activePlanId) {
        setActivePlan(snapshot.activePlanId);
      }

      restorePlanFromSnapshot(snapshot.activePlanId, {
        magneticDeclination: snapshot.magneticDeclination,
        errorThreshold: snapshot.errorThreshold,
        measurements: snapshot.measurements,
      });

      lastDeclinationRef.current = snapshot.magneticDeclination;
      lastThresholdRef.current = snapshot.errorThreshold;
    }

    setTimeout(() => {
      isApplyingSnapshotRef.current = false;
    }, 100);

    if (!silent) {
      notifications.show({
        title: '已恢复状态',
        message: `罗盘：${formatAngle(snapshot.rotation)}，磁偏角：${snapshot.magneticDeclination > 0 ? '+' : ''}${snapshot.magneticDeclination.toFixed(1)}°，记录：${snapshot.measurements.length} 条`,
        color: 'teal',
        icon: <IconCheck size={18} />,
        autoClose: 2000,
      });
    }
  }, [activePlanId, setActivePlan, restorePlanFromSnapshot]);

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
    const oldRotation = lastRotationRef.current;

    if (!isApplyingSnapshotRef.current && Math.abs(clamped - oldRotation) > 0.01) {
      const before = getCurrentSnapshot();
      setRotation(clamped);
      const after = history.createSnapshot({
        rotation: clamped,
        magneticDeclination,
        errorThreshold,
        isDrawingMode,
        axes,
        activePlan,
      });

      history.recordOperation({
        type: 'rotation_change',
        description: `罗盘旋转：${formatAngle(oldRotation)} → ${formatAngle(clamped)}`,
        severity: 'info',
        planId: activePlanId,
        planName: activePlan?.name,
        beforeSnapshot: before,
        afterSnapshot: after,
        payload: { before: oldRotation, after: clamped },
      });
    } else {
      setRotation(clamped);
    }

    lastRotationRef.current = clamped;
  }, [getCurrentSnapshot, history, magneticDeclination, errorThreshold, isDrawingMode, axes, activePlan, activePlanId]);

  const handleDeclinationChange = useCallback(
    (newDeclination: number) => {
      const clamped = clampDeclination(newDeclination);
      const oldDeclination = lastDeclinationRef.current;

      if (activePlanId && !isApplyingSnapshotRef.current && Math.abs(clamped - oldDeclination) > 0.01) {
        const before = getCurrentSnapshot();
        updateMagneticDeclination(activePlanId, clamped);
        const after = history.createSnapshot({
          rotation,
          magneticDeclination: clamped,
          errorThreshold,
          isDrawingMode,
          axes,
          activePlan,
        });

        history.recordOperation({
          type: 'declination_change',
          description: `磁偏角调整：${oldDeclination > 0 ? '+' : ''}${oldDeclination.toFixed(1)}° → ${clamped > 0 ? '+' : ''}${clamped.toFixed(1)}°`,
          severity: 'info',
          planId: activePlanId,
          planName: activePlan?.name,
          beforeSnapshot: before,
          afterSnapshot: after,
          payload: { before: oldDeclination, after: clamped },
        });
      } else if (activePlanId) {
        updateMagneticDeclination(activePlanId, clamped);
      }

      lastDeclinationRef.current = clamped;
    },
    [activePlanId, updateMagneticDeclination, getCurrentSnapshot, history, rotation, errorThreshold, isDrawingMode, axes, activePlan]
  );

  const handleErrorThresholdChange = useCallback(
    (newThreshold: number) => {
      const clamped = Math.max(0.1, newThreshold);
      const oldThreshold = lastThresholdRef.current;

      if (activePlanId && !isApplyingSnapshotRef.current && Math.abs(clamped - oldThreshold) > 0.01) {
        const before = getCurrentSnapshot();
        updatePlan(activePlanId, { errorThreshold: clamped });
        const after = history.createSnapshot({
          rotation,
          magneticDeclination,
          errorThreshold: clamped,
          isDrawingMode,
          axes,
          activePlan,
        });

        history.recordOperation({
          type: 'threshold_change',
          description: `误差阈值调整：${oldThreshold.toFixed(1)}° → ${clamped.toFixed(1)}°`,
          severity: 'info',
          planId: activePlanId,
          planName: activePlan?.name,
          beforeSnapshot: before,
          afterSnapshot: after,
          payload: { before: oldThreshold, after: clamped },
        });
      } else if (activePlanId) {
        updatePlan(activePlanId, { errorThreshold: clamped });
      }

      lastThresholdRef.current = clamped;
    },
    [activePlanId, updatePlan, getCurrentSnapshot, history, rotation, magneticDeclination, isDrawingMode, axes, activePlan]
  );

  const handleDrawingModeToggle = useCallback(
    (enabled: boolean) => {
      if (!isApplyingSnapshotRef.current && enabled !== isDrawingMode) {
        const before = getCurrentSnapshot();
        setIsDrawingMode(enabled);
        const after = history.createSnapshot({
          rotation,
          magneticDeclination,
          errorThreshold,
          isDrawingMode: enabled,
          axes,
          activePlan,
        });

        history.recordOperation({
          type: 'drawing_mode_toggle',
          description: `切换${enabled ? '为绘制模式' : '为旋转模式'}`,
          severity: 'info',
          planId: activePlanId,
          planName: activePlan?.name,
          beforeSnapshot: before,
          afterSnapshot: after,
          payload: { enabled },
        });
      } else {
        setIsDrawingMode(enabled);
      }
    },
    [isDrawingMode, getCurrentSnapshot, history, rotation, magneticDeclination, errorThreshold, axes, activePlan, activePlanId]
  );

  const handleAxisDrawn = useCallback(
    (axis: AxisLine) => {
      const before = getCurrentSnapshot();

      if (!axis.passesCenter) {
        notifications.show({
          title: '轴线无效',
          message: '建筑轴线必须经过罗盘中心点才能完成测量',
          color: 'red',
          icon: <IconAlertCircle size={18} />,
          autoClose: 4000,
        });

        const newAxes = [...axes, { ...axis, passesCenter: false }];
        setAxes(newAxes);

        if (!isApplyingSnapshotRef.current) {
          const angle = pointsToAngle(axis.startPoint, axis.endPoint);
          const after = history.createSnapshot({
            rotation,
            magneticDeclination,
            errorThreshold,
            isDrawingMode,
            axes: newAxes,
            activePlan,
          });

          history.recordOperation({
            type: 'axis_draw',
            description: `绘制无效轴线（未过中心点），角度：${formatAngle(angle)}`,
            severity: 'warning',
            planId: activePlanId,
            planName: activePlan?.name,
            beforeSnapshot: before,
            afterSnapshot: after,
            payload: { angle, label: '无效轴线', passesCenter: false },
          });
        }
        return;
      }

      const angle = pointsToAngle(axis.startPoint, axis.endPoint);
      const result = calculateBearingResult(angle, rotation, magneticDeclination, errorThreshold);

      const newAxes = [...axes, axis];
      setAxes(newAxes);

      const axisNumber = axes.filter((a) => a.passesCenter).length + 1;
      const defaultLabel = `轴线${axisNumber}`;
      setAxisLabel(defaultLabel);
      setPendingAxis(axis);
      openSave();

      if (!isApplyingSnapshotRef.current) {
        const after = history.createSnapshot({
          rotation,
          magneticDeclination,
          errorThreshold,
          isDrawingMode,
          axes: newAxes,
          activePlan,
        });

        history.recordOperation({
          type: 'axis_draw',
          description: `绘制轴线：${defaultLabel}（${formatAngle(result.correctedBearing)}）`,
          severity: 'info',
          planId: activePlanId,
          planName: activePlan?.name,
          beforeSnapshot: before,
          afterSnapshot: after,
          payload: {
            angle: result.correctedBearing,
            label: defaultLabel,
            passesCenter: true,
          },
        });
      }

      notifications.show({
        title: '轴线已绘制',
        message: `方位: ${formatAngle(result.correctedBearing)}, 归属: ${result.mountain.name}山`,
        color: result.exceedsThreshold ? 'orange' : 'green',
        icon: result.exceedsThreshold ? <IconAlertCircle size={18} /> : <IconCheck size={18} />,
      });
    },
    [
      axes,
      rotation,
      magneticDeclination,
      errorThreshold,
      openSave,
      isDrawingMode,
      activePlan,
      activePlanId,
      getCurrentSnapshot,
      history,
    ]
  );

  const handleSaveMeasurement = useCallback(() => {
    if (!pendingAxis || !activePlanId) {
      closeSave();
      return;
    }

    if (!axisLabel.trim()) {
      notifications.show({
        title: '保存失败',
        message: '请输入轴线标签',
        color: 'red',
        icon: <IconX size={18} />,
      });
      return;
    }

    const angle = pointsToAngle(pendingAxis.startPoint, pendingAxis.endPoint);
    const result = calculateBearingResult(angle, rotation, magneticDeclination, errorThreshold);

    const axisWithLabel = {
      ...pendingAxis,
      label: axisLabel.trim(),
    };
    const newAxes = axes.map((a) => (a.id === pendingAxis.id ? axisWithLabel : a));
    setAxes(newAxes);

    const before = getCurrentSnapshot();

    const { success, duplicate } = addMeasurement(activePlanId, {
      axisId: pendingAxis.id,
      axisLabel: axisLabel.trim(),
      compassReading: result.compassReading,
      trueBearing: result.trueBearing,
      correctedBearing: result.correctedBearing,
      mountainName: result.mountain.name,
      mountainElement: result.mountain.element,
      errorRange: result.errorRange,
      errorAmount: result.errorAmount,
      exceedsThreshold: result.exceedsThreshold,
    });

    if (!isApplyingSnapshotRef.current && success) {
      setTimeout(() => {
        const updatedActivePlan = plans.find((p) => p.id === activePlanId) || activePlan;
        const after = history.createSnapshot({
          rotation,
          magneticDeclination,
          errorThreshold,
          isDrawingMode: false,
          axes: newAxes,
          activePlan: updatedActivePlan,
        });

        history.recordOperation({
          type: 'axis_save',
          description: `保存测量「${axisLabel.trim()}」：${formatAngle(result.correctedBearing)}，误差 ${result.errorAmount.toFixed(2)}°`,
          severity: result.exceedsThreshold ? 'warning' : 'info',
          planId: activePlanId,
          planName: activePlan?.name,
          beforeSnapshot: before,
          afterSnapshot: after,
          payload: {
            label: axisLabel.trim(),
            bearing: result.correctedBearing,
            error: result.errorAmount,
            exceedsThreshold: result.exceedsThreshold,
            mountain: result.mountain.name,
          },
        });
      }, 10);
    }

    if (duplicate) {
      notifications.show({
        title: '重复记录',
        message: '该轴线在此方案中已存在相同方位的测量记录',
        color: 'yellow',
        icon: <IconAlertCircle size={18} />,
        autoClose: 5000,
      });
    } else if (success) {
      notifications.show({
        title: '保存成功',
        message: result.exceedsThreshold
          ? `记录已保存，但误差 ${result.errorAmount.toFixed(2)}° 超出阈值`
          : `「${axisLabel.trim()}」测量记录已保存`,
        color: result.exceedsThreshold ? 'orange' : 'green',
        icon: <IconDeviceFloppy size={18} />,
      });
    }

    setPendingAxis(null);
    setAxisLabel('');
    closeSave();
    setIsDrawingMode(false);
  }, [
    pendingAxis,
    activePlanId,
    axisLabel,
    rotation,
    magneticDeclination,
    errorThreshold,
    axes,
    addMeasurement,
    closeSave,
    activePlan,
    plans,
    history,
    getCurrentSnapshot,
  ]);

  const handleCancelSave = useCallback(() => {
    const before = getCurrentSnapshot();
    let newAxes = axes;

    if (pendingAxis) {
      newAxes = axes.filter((a) => a.id !== pendingAxis.id);
      setAxes(newAxes);
    }

    if (!isApplyingSnapshotRef.current && pendingAxis) {
      const after = history.createSnapshot({
        rotation,
        magneticDeclination,
        errorThreshold,
        isDrawingMode,
        axes: newAxes,
        activePlan,
      });

      history.recordOperation({
        type: 'axis_cancel',
        description: `取消保存轴线「${axisLabel || pendingAxis.label || '未命名'}」`,
        severity: 'info',
        planId: activePlanId,
        planName: activePlan?.name,
        beforeSnapshot: before,
        afterSnapshot: after,
        payload: { label: axisLabel || pendingAxis.label || '未命名' },
      });
    }

    setPendingAxis(null);
    setAxisLabel('');
    closeSave();
  }, [pendingAxis, axes, closeSave, axisLabel, isDrawingMode, activePlan, activePlanId, getCurrentSnapshot, history, rotation, magneticDeclination, errorThreshold]);

  const handleResetCompass = useCallback(() => {
    const before = getCurrentSnapshot();
    setRotation(0);
    lastRotationRef.current = 0;

    if (!isApplyingSnapshotRef.current) {
      const after = history.createSnapshot({
        rotation: 0,
        magneticDeclination,
        errorThreshold,
        isDrawingMode,
        axes,
        activePlan,
      });

      history.recordOperation({
        type: 'compass_reset',
        description: '罗盘角度归零',
        severity: 'info',
        planId: activePlanId,
        planName: activePlan?.name,
        beforeSnapshot: before,
        afterSnapshot: after,
      });
    }

    notifications.show({
      title: '罗盘已重置',
      message: '罗盘旋转角度已归零',
      color: 'blue',
      icon: <IconRotate size={18} />,
    });
  }, [getCurrentSnapshot, history, magneticDeclination, errorThreshold, isDrawingMode, axes, activePlan, activePlanId]);

  const handleClearAxes = useCallback(() => {
    const before = getCurrentSnapshot();
    const count = axes.length;
    setAxes([]);
    setPendingAxis(null);

    if (!isApplyingSnapshotRef.current && count > 0) {
      const after = history.createSnapshot({
        rotation,
        magneticDeclination,
        errorThreshold,
        isDrawingMode,
        axes: [],
        activePlan,
      });

      history.recordOperation({
        type: 'axes_clear',
        description: `清除所有绘制轴线（${count}条）`,
        severity: 'warning',
        planId: activePlanId,
        planName: activePlan?.name,
        beforeSnapshot: before,
        afterSnapshot: after,
        payload: { count },
      });
    }

    notifications.show({
      title: '轴线已清除',
      message: '所有绘制的轴线已从视图中移除',
      color: 'gray',
      icon: <IconTrash size={18} />,
    });
  }, [getCurrentSnapshot, history, axes, rotation, magneticDeclination, errorThreshold, isDrawingMode, activePlan, activePlanId]);

  const handleSetActivePlan = useCallback(
    (planId: string) => {
      const before = getCurrentSnapshot();
      const oldPlanName = activePlan?.name ?? '';
      const newPlan = plans.find((p) => p.id === planId);

      setActivePlan(planId);

      if (!isApplyingSnapshotRef.current) {
        setTimeout(() => {
          const latestPlan = plans.find((p) => p.id === planId) || newPlan;
          const after = history.createSnapshot({
            rotation,
            magneticDeclination: latestPlan?.magneticDeclination ?? magneticDeclination,
            errorThreshold: latestPlan?.errorThreshold ?? errorThreshold,
            isDrawingMode,
            axes,
            activePlan: latestPlan ?? null,
          });

          history.recordOperation({
            type: 'plan_switch',
            description: `切换方案：${oldPlanName} → ${newPlan?.name ?? ''}`,
            severity: 'info',
            planId,
            planName: newPlan?.name,
            beforeSnapshot: before,
            afterSnapshot: after,
            isKeyNode: true,
            payload: { fromName: oldPlanName, toName: newPlan?.name ?? '' },
          });

          if (latestPlan) {
            lastDeclinationRef.current = latestPlan.magneticDeclination;
            lastThresholdRef.current = latestPlan.errorThreshold;
          }
        }, 10);
      } else if (newPlan) {
        lastDeclinationRef.current = newPlan.magneticDeclination;
        lastThresholdRef.current = newPlan.errorThreshold;
      }
    },
    [getCurrentSnapshot, history, activePlan, plans, setActivePlan, rotation, magneticDeclination, errorThreshold, isDrawingMode, axes]
  );

  const handleCreatePlan = useCallback(
    (name: string, description: string = '') => {
      const before = getCurrentSnapshot();
      const newPlan = createPlan(name, description);

      if (!isApplyingSnapshotRef.current) {
        const after = history.createSnapshot({
          rotation,
          magneticDeclination,
          errorThreshold,
          isDrawingMode,
          axes,
          activePlan: newPlan ?? activePlan,
        });

        history.recordOperation({
          type: 'plan_create',
          description: `创建方案「${name}」`,
          severity: 'info',
          planId: newPlan?.id,
          planName: name,
          beforeSnapshot: before,
          afterSnapshot: after,
          payload: { name, description },
        });
      }
    },
    [getCurrentSnapshot, history, createPlan, rotation, magneticDeclination, errorThreshold, isDrawingMode, axes, activePlan]
  );

  const handleDeletePlan = useCallback(
    (planId: string) => {
      const plan = plans.find((p) => p.id === planId);
      const before = getCurrentSnapshot();

      deletePlan(planId);

      if (!isApplyingSnapshotRef.current && plan) {
        const after = history.createSnapshot({
          rotation,
          magneticDeclination,
          errorThreshold,
          isDrawingMode,
          axes,
          activePlan: planId === activePlanId
            ? plans.find((p) => p.id !== planId) ?? null
            : activePlan,
        });

        history.recordOperation({
          type: 'plan_delete',
          description: `删除方案「${plan.name}」`,
          severity: 'warning',
          planId,
          planName: plan.name,
          beforeSnapshot: before,
          afterSnapshot: after,
          payload: {
            name: plan.name,
            measurementCount: plan.measurements.length,
          },
        });
      }
    },
    [getCurrentSnapshot, history, plans, deletePlan, rotation, magneticDeclination, errorThreshold, isDrawingMode, axes, activePlan, activePlanId]
  );

  const handleUpdatePlan = useCallback(
    (planId: string, updates: Partial<{ name: string; description: string; errorThreshold: number }>) => {
      const plan = plans.find((p) => p.id === planId);
      const before = getCurrentSnapshot();

      updatePlan(planId, updates);

      if (!isApplyingSnapshotRef.current && (updates.name || updates.description)) {
        const after = history.createSnapshot({
          rotation,
          magneticDeclination,
          errorThreshold: updates.errorThreshold ?? errorThreshold,
          isDrawingMode,
          axes,
          activePlan: plan ?? null,
        });

        history.recordOperation({
          type: 'plan_update',
          description: `更新方案信息「${updates.name ?? plan?.name ?? ''}」`,
          severity: 'info',
          planId,
          planName: updates.name ?? plan?.name,
          beforeSnapshot: before,
          afterSnapshot: after,
          payload: updates,
        });
      }
    },
    [getCurrentSnapshot, history, plans, updatePlan, rotation, magneticDeclination, errorThreshold, isDrawingMode, axes]
  );

  const handleRemoveMeasurement = useCallback(
    (planId: string, recordId: string) => {
      const plan = plans.find((p) => p.id === planId);
      const record = plan?.measurements.find((m) => m.id === recordId);
      const before = getCurrentSnapshot();

      removeMeasurement(planId, recordId);

      if (!isApplyingSnapshotRef.current && record) {
        setTimeout(() => {
          const updatedPlan = plans.find((p) => p.id === planId) || plan;
          const after = history.createSnapshot({
            rotation,
            magneticDeclination,
            errorThreshold,
            isDrawingMode,
            axes,
            activePlan: updatedPlan ?? null,
          });

          history.recordOperation({
            type: 'measurement_delete',
            description: `删除测量记录「${record.axisLabel}」`,
            severity: 'warning',
            planId,
            planName: plan?.name,
            beforeSnapshot: before,
            afterSnapshot: after,
            payload: {
              label: record.axisLabel,
              bearing: record.correctedBearing,
            },
          });
        }, 10);
      }
    },
    [getCurrentSnapshot, history, plans, removeMeasurement, rotation, magneticDeclination, errorThreshold, isDrawingMode, axes]
  );

  const handleClearMeasurements = useCallback(
    (planId: string) => {
      const plan = plans.find((p) => p.id === planId);
      const count = plan?.measurements.length ?? 0;
      const before = getCurrentSnapshot();

      clearMeasurements(planId);

      if (!isApplyingSnapshotRef.current && count > 0) {
        setTimeout(() => {
          const after = history.createSnapshot({
            rotation,
            magneticDeclination,
            errorThreshold,
            isDrawingMode,
            axes,
            activePlan: plan ? { ...plan, measurements: [] } : null,
          });

          history.recordOperation({
            type: 'measurements_clear',
            description: `清空方案内所有记录（${count}条）`,
            severity: 'warning',
            planId,
            planName: plan?.name,
            beforeSnapshot: before,
            afterSnapshot: after,
            payload: { count },
          });
        }, 10);
      }
    },
    [getCurrentSnapshot, history, plans, clearMeasurements, rotation, magneticDeclination, errorThreshold, isDrawingMode, axes]
  );

  const handleDuplicatePlan = useCallback(
    (planId: string) => {
      const before = getCurrentSnapshot();
      const newPlan = duplicatePlan(planId);

      if (!isApplyingSnapshotRef.current && newPlan) {
        const after = history.createSnapshot({
          rotation,
          magneticDeclination,
          errorThreshold,
          isDrawingMode,
          axes,
          activePlan: newPlan ?? activePlan,
        });

        history.recordOperation({
          type: 'plan_create',
          description: `复制方案为「${newPlan.name}」`,
          severity: 'info',
          planId: newPlan.id,
          planName: newPlan.name,
          beforeSnapshot: before,
          afterSnapshot: after,
          payload: { name: newPlan.name, duplicatedFrom: planId },
        });
      }

      return newPlan;
    },
    [getCurrentSnapshot, history, duplicatePlan, rotation, magneticDeclination, errorThreshold, isDrawingMode, axes, activePlan]
  );

  const handleBatchInput = useCallback(
    (items: { label: string; result: BearingResult }[]) => {
      if (!activePlanId) return;

      const before = getCurrentSnapshot();

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

        const { success, duplicate } = addMeasurement(activePlanId, {
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

        if (success) {
          successCount++;
          if (item.result.exceedsThreshold) exceedCount++;
        }
        if (duplicate) {
          duplicateCount++;
          seen.delete(key);
        }
      });

      if (!isApplyingSnapshotRef.current && successCount > 0) {
        setTimeout(() => {
          const updatedPlan = plans.find((p) => p.id === activePlanId) || activePlan;
          const after = history.createSnapshot({
            rotation,
            magneticDeclination,
            errorThreshold,
            isDrawingMode,
            axes,
            activePlan: updatedPlan ?? null,
          });

          history.recordOperation({
            type: 'batch_input',
            description: `批量录入 ${successCount} 条记录`,
            severity: exceedCount > 0 ? 'warning' : 'info',
            planId: activePlanId,
            planName: activePlan?.name,
            beforeSnapshot: before,
            afterSnapshot: after,
            isKeyNode: true,
            payload: {
              success: successCount,
              duplicate: duplicateCount,
              exceed: exceedCount,
              total: items.length,
            },
          });
        }, 10);
      }

      let title: string;
      let message: string;
      let color: string;
      let icon: React.ReactNode;

      if (successCount === items.length && duplicateCount === 0) {
        title = '批量录入成功';
        message = `全部 ${successCount} 条记录录入成功`;
        if (exceedCount > 0) {
          message += `，其中 ${exceedCount} 条超标`;
        }
        color = 'green';
        icon = <IconCheck size={18} />;
      } else if (successCount > 0) {
        title = '批量录入完成';
        const parts: string[] = [];
        parts.push(`成功录入 ${successCount} 条`);
        if (duplicateCount > 0) parts.push(`${duplicateCount} 条重复被跳过`);
        if (exceedCount > 0) parts.push(`${exceedCount} 条超标`);
        message = parts.join('，');
        color = 'blue';
        icon = <IconCheck size={18} />;
      } else {
        title = '批量录入失败';
        message = `${duplicateCount} 条全部为重复记录，已跳过`;
        color = 'yellow';
        icon = <IconAlertCircle size={18} />;
      }

      notifications.show({ title, message, color, icon });
    },
    [
      activePlanId,
      addMeasurement,
      activePlan,
      plans,
      history,
      getCurrentSnapshot,
      rotation,
      magneticDeclination,
      errorThreshold,
      isDrawingMode,
      axes,
    ]
  );

  useEffect(() => {
    if (activePlan) {
      setAxes((prev) =>
        prev.map((a) => {
          const measurement = activePlan.measurements.find((m) => m.axisId === a.id);
          return measurement
            ? { ...a, label: measurement.axisLabel }
            : a;
        })
      );
    }
  }, [activePlan?.id]);

  useEffect(() => {
    if (activePlan) {
      lastDeclinationRef.current = activePlan.magneticDeclination;
      lastThresholdRef.current = activePlan.errorThreshold;
    }
  }, [activePlan?.magneticDeclination, activePlan?.errorThreshold]);

  const headerTitle = (
    <Group gap="sm">
      <ThemeIcon size="lg" radius="md" color="brand" variant="filled">
        <IconCompass size={22} />
      </ThemeIcon>
      <Stack gap={0}>
        <Text fw={700} size="xl" lh={1}>
          传统罗盘模拟系统
        </Text>
        <Text size="xs" c="dimmed">
          二十四山 · 磁偏角校正 · 建筑轴线测量 · 环境叠加分析
        </Text>
      </Stack>
    </Group>
  );

  return (
    <AppShell
      header={{ height: 72 }}
      padding={0}
      style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 50%, #fecaca 100%)' }}
    >
      <AppShell.Header
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(120, 53, 15, 0.1)',
        }}
      >
        <Container h="100%" size="100%" px="lg">
          <Group h="100%" justify="space-between">
            {headerTitle}
            <Group>
              <Tooltip label="选址环境叠加与风水敏感区分析" withArrow>
                <Button
                  variant={envDrawerOpen ? 'filled' : 'light'}
                  color="teal"
                  size="md"
                  leftSection={<IconMap size={18} />}
                  onClick={openEnvDrawer}
                >
                  环境叠加
                  {envAnalysis.criticalCount + envAnalysis.warningCount > 0 && (
                    <Badge
                      color="red"
                      size="xs"
                      variant="filled"
                      circle
                      ml={4}
                    >
                      {envAnalysis.criticalCount + envAnalysis.warningCount}
                    </Badge>
                  )}
                </Button>
              </Tooltip>
              <Tooltip label="历史回放与过程审计" withArrow>
                <Button
                  variant={historyDrawerOpen ? 'filled' : 'light'}
                  color="grape"
                  size="md"
                  leftSection={<IconHistory size={18} />}
                  onClick={openHistoryDrawer}
                >
                  历史审计
                  {history.statistics.anomalies > 0 && (
                    <Badge
                      color="red"
                      size="xs"
                      variant="filled"
                      circle
                      ml={4}
                    >
                      {history.statistics.anomalies}
                    </Badge>
                  )}
                </Button>
              </Tooltip>
              <Tooltip label="批量录入轴线数据" withArrow>
                <Button
                  variant="light"
                  color="violet"
                  size="md"
                  leftSection={<IconUpload size={18} />}
                  onClick={openBatchInput}
                >
                  批量录入
                </Button>
              </Tooltip>
              <Tooltip label="生成分析报告" withArrow>
                <Button
                  variant="light"
                  color="indigo"
                  size="md"
                  leftSection={<IconReport size={18} />}
                  onClick={openAnalysisReport}
                  disabled={!activePlan || activePlan.measurements.length === 0}
                >
                  分析报告
                </Button>
              </Tooltip>
              <Tooltip label="使用帮助" withArrow>
                <Button
                  variant="subtle"
                  size="md"
                  leftSection={<IconInfoCircle size={18} />}
                  onClick={openHelp}
                >
                  帮助
                </Button>
              </Tooltip>
              <Tooltip label="重置罗盘角度" withArrow>
                <Button
                  variant="light"
                  size="md"
                  leftSection={<IconRotate size={18} />}
                  onClick={handleResetCompass}
                >
                  归零
                </Button>
              </Tooltip>
              <Tooltip label="清除所有轴线" withArrow>
                <Button
                  variant="light"
                  color="red"
                  size="md"
                  leftSection={<IconTrash size={18} />}
                  onClick={handleClearAxes}
                  disabled={axes.length === 0}
                >
                  清除轴线
                </Button>
              </Tooltip>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="100%" py="lg" px="lg">
          <SimpleGrid
            cols={{ base: 1, xl: 3 }}
            spacing="lg"
            verticalSpacing="lg"
          >
            <div style={{ gridColumn: 'span 1' }}>
              <Stack gap="lg">
                <Paper p="md" radius="md" withBorder shadow="md" bg="white">
                  <Group justify="space-between" mb="md">
                    <Group>
                      <ThemeIcon size="md" radius="md" color="red" variant="light">
                        <IconRulerMeasure size={18} />
                      </ThemeIcon>
                      <Text fw={600} size="lg">
                        罗盘视图
                      </Text>
                    </Group>
                    <Group>
                      <Badge
                        size="md"
                        variant="filled"
                        color={isDrawingMode ? 'green' : 'blue'}
                      >
                        {isDrawingMode ? '绘制模式' : '旋转模式'}
                      </Badge>
                      {axes.length > 0 && (
                        <Badge size="md" variant="light">
                          {axes.length} 条轴线
                        </Badge>
                      )}
                    </Group>
                  </Group>

                  <Divider mb="md" />

                  <CompassDial
                    size={560}
                    rotation={rotation}
                    onRotationChange={handleRotationChange}
                    isDrawingMode={isDrawingMode}
                    onAxisDrawn={handleAxisDrawn}
                    axes={axes}
                    magneticDeclination={magneticDeclination}
                    onPreviewAngleChange={setPreviewAngle}
                    environmentElements={envElements}
                    showEnvironmentOverlay={showEnvOverlay}
                    risks={envAnalysis.risks}
                  />

                  <Group mt="md" justify="center" gap="xs">
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                      <Tooltip key={angle} label={`${angle}°`} withArrow>
                        <Button
                          size="xs"
                          variant={rotation === angle ? 'filled' : 'light'}
                          onClick={() => handleRotationChange(angle)}
                        >
                          {angle}°
                        </Button>
                      </Tooltip>
                    ))}
                  </Group>
                </Paper>

                <ControlPanel
                  rotation={rotation}
                  onRotationChange={handleRotationChange}
                  magneticDeclination={magneticDeclination}
                  onDeclinationChange={handleDeclinationChange}
                  errorThreshold={errorThreshold}
                  onErrorThresholdChange={handleErrorThresholdChange}
                  isDrawingMode={isDrawingMode}
                  onDrawingModeChange={handleDrawingModeToggle}
                  bearingResult={bearingResult}
                  previewAngle={previewAngle}
                />
              </Stack>
            </div>

            <div style={{ gridColumn: 'span 1' }}>
              <SurveyPlanManager
                plans={plans}
                activePlanId={activePlanId}
                onSetActive={handleSetActivePlan}
                onCreate={handleCreatePlan}
                onDelete={handleDeletePlan}
                onUpdate={handleUpdatePlan}
                onRemoveMeasurement={handleRemoveMeasurement}
                onClearMeasurements={handleClearMeasurements}
                onDuplicate={handleDuplicatePlan}
              />
            </div>

            <div style={{ gridColumn: 'span 1' }}>
              <StatisticsPanel 
                key={`${activePlan?.id}-${activePlan?.updatedAt}`} 
                plan={activePlan} 
              />
            </div>
          </SimpleGrid>
        </Container>
      </AppShell.Main>

      <Modal
        opened={saveModalOpen}
        onClose={handleCancelSave}
        title="保存测量记录"
        centered
        size="md"
      >
        <Stack gap="md">
          {selectedAxisResult && (
            <Paper p="md" radius="md" withBorder bg={selectedAxisResult.exceedsThreshold ? 'red.0' : 'green.0'}>
              <Group justify="space-between" mb="sm">
                <Text fw={600}>测量预览</Text>
                {selectedAxisResult.exceedsThreshold ? (
                  <Badge color="red" variant="filled" size="sm">
                    误差超限!
                  </Badge>
                ) : (
                  <Badge color="green" variant="filled" size="sm">
                    合格
                  </Badge>
                )}
              </Group>
              <SimpleGrid cols={2} spacing="sm">
                <div>
                  <Text size="xs" c="dimmed">
                    校正方位
                  </Text>
                  <Text fw={700} size="lg">
                    {formatAngle(selectedAxisResult.correctedBearing)}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    归属山向
                  </Text>
                  <Group gap={4}>
                    <Text fw={700} size="lg">
                      {selectedAxisResult.mountain.name}山
                    </Text>
                    <Badge
                      size="xs"
                      variant="filled"
                      style={{ backgroundColor: 'var(--mantine-color-violet-6)' }}
                    >
                      {selectedAxisResult.mountain.element}
                    </Badge>
                  </Group>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    罗盘读数
                  </Text>
                  <Text fw={600}>
                    {formatAngle(selectedAxisResult.compassReading)}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    误差值
                  </Text>
                  <Text
                    fw={600}
                    c={selectedAxisResult.exceedsThreshold ? 'red' : 'green'}
                  >
                    {selectedAxisResult.errorAmount.toFixed(2)}°
                  </Text>
                </div>
              </SimpleGrid>
            </Paper>
          )}

          <TextInput
            label="轴线标签"
            placeholder="例如：主轴线、东墙、南门..."
            value={axisLabel}
            onChange={(e) => setAxisLabel(e.target.value)}
            withAsterisk
            maxLength={20}
            leftSection={<IconPlus size={16} />}
          />

          <Text size="xs" c="dimmed">
            提示：同一方案内不允许存在相同轴线和相同方位的重复记录
          </Text>

          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={handleCancelSave}>
              取消
            </Button>
            <Button
              leftSection={<IconDeviceFloppy size={18} />}
              onClick={handleSaveMeasurement}
            >
              保存测量
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={showHelp}
        onClose={closeHelp}
        title="使用帮助"
        centered
        size="lg"
      >
        <Stack gap="md">
          <Paper p="sm" radius="md" withBorder bg="blue.0">
            <Group mb="xs">
              <ThemeIcon size="sm" color="blue" radius="md">
                <IconCompass size={14} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                基本操作
              </Text>
            </Group>
            <Text size="sm" lh={1.8}>
              1. <b>旋转罗盘</b>：默认模式下，在罗盘上按住鼠标拖动即可旋转罗盘盘体
              <br />
              2. <b>快捷定位</b>：点击罗盘下方的角度按钮可快速跳转到常用方位
              <br />
              3. <b>绘制轴线</b>：开启「绘制建筑轴线模式」后，在罗盘上拖动绘制一条直线
              <br />
              4. <b>保存测量</b>：轴线绘制完成后会弹出保存对话框，填写标签后保存
              <br />
              5. <b>历史审计</b>：点击顶部「历史审计」按钮，可回放所有操作、对比关键节点、标记异常操作
            </Text>
          </Paper>

          <Paper p="sm" radius="md" withBorder bg="orange.0">
            <Group mb="xs">
              <ThemeIcon size="sm" color="orange" radius="md">
                <IconAlertCircle size={14} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                重要规则
              </Text>
            </Group>
            <Text size="sm" lh={1.8}>
              • <b>角度范围</b>：0° ~ 360°，超出范围会自动归一化
              <br />• <b>磁偏角范围</b>：-25° ~ +25°（全球磁偏角合理区间）
              <br />• <b>中心点要求</b>：建筑轴线必须经过罗盘中心点才能完成测量
              <br />• <b>唯一性</b>：同一方案不能存在相同轴线+相同方位的重复记录
              <br />• <b>磁偏角联动</b>：修改磁偏角后，所有历史测量结果会立即自动更新
              <br />• <b>误差标识</b>：误差超过阈值时，记录会以红色醒目标识
            </Text>
          </Paper>

          <Paper p="sm" radius="md" withBorder bg="grape.0">
            <Group mb="xs">
              <ThemeIcon size="sm" color="grape" radius="md">
                <IconHistory size={14} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                历史审计功能
              </Text>
            </Group>
            <Text size="sm" lh={1.8}>
              • <b>操作记录</b>：系统自动记录所有操作（旋转、调整、绘制、保存等）
              <br />• <b>逐步回放</b>：可逐步回放操作流程，支持播放/暂停/调速
              <br />• <b>关键节点比对</b>：选择任意两条记录进行横向对比
              <br />• <b>异常标记</b>：自动识别误差超标、大幅跳变、误删除等异常操作
              <br />• <b>状态恢复</b>：点击历史记录可快速恢复到该时刻的系统状态
              <br />• <b>多维度筛选</b>：按操作类型、严重程度、方案、关键词筛选记录
            </Text>
          </Paper>

          <Paper p="sm" radius="md" withBorder bg="violet.0">
            <Group mb="xs">
              <ThemeIcon size="sm" color="violet" radius="md">
                <IconRulerMeasure size={14} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                二十四山盘说明
              </Text>
            </Group>
            <Text size="sm" lh={1.8}>
              罗盘采用传统风水二十四山盘：
              <br />• 每山占 15°，共 24 山，对应八天干 + 十二地支 + 四维卦
              <br />• 正北壬子癸、东北丑艮寅、正东甲卯乙、东南辰巽巳
              <br />• 正南丙午丁、西南未坤申、正西庚酉辛、西北戌乾亥
              <br />• 五色对应五行：金(黄)、木(绿)、水(蓝)、火(红)、土(紫)
            </Text>
          </Paper>

          <Group justify="flex-end">
            <Button onClick={closeHelp}>知道了</Button>
          </Group>
        </Stack>
      </Modal>

      <BatchInputModal
        opened={batchInputModalOpen}
        onClose={closeBatchInput}
        rotation={rotation}
        magneticDeclination={magneticDeclination}
        errorThreshold={errorThreshold}
        onSubmit={handleBatchInput}
      />

      <AnalysisReportModal
        opened={analysisReportModalOpen}
        onClose={closeAnalysisReport}
        plan={activePlan}
      />

      <Drawer
        opened={historyDrawerOpen}
        onClose={closeHistoryDrawer}
        title={
          <Group>
            <ThemeIcon size="md" radius="md" color="grape" variant="filled">
              <IconHistory size={18} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text fw={600}>历史测线回放与过程审计</Text>
              <Text size="xs" c="dimmed">
                记录 {history.statistics.total} 条 · 异常 {history.statistics.anomalies} 条
              </Text>
            </Stack>
          </Group>
        }
        position="right"
        size={640}
        padding="lg"
        scrollAreaComponent={ScrollArea.Autosize}
      >
        <HistoryPlaybackPanel
          records={history.records}
          filteredRecords={history.filteredRecords}
          playback={history.playback}
          filter={history.filter}
          statistics={history.statistics}
          plans={plans}
          onSetFilter={history.setFilter}
          onStepForward={history.stepForward}
          onStepBackward={history.stepBackward}
          onJumpToRecord={history.jumpToRecord}
          onJumpToFirst={history.jumpToFirst}
          onJumpToLast={history.jumpToLast}
          onTogglePlayback={history.togglePlayback}
          onGetRecordAtPlayback={history.getRecordAtPlayback}
          onSetPlayback={history.setPlayback}
          onClearHistory={history.clearHistory}
          onDeleteRecord={history.deleteRecord}
          onExportHistory={history.exportHistory}
          onApplySnapshot={applySnapshot}
        />
      </Drawer>

      <Drawer
        opened={envDrawerOpen}
        onClose={closeEnvDrawer}
        title={
          <Group>
            <ThemeIcon size="md" radius="md" color="teal" variant="filled">
              <IconMap size={18} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text fw={600}>选址环境叠加与风水敏感区分析</Text>
              <Text size="xs" c="dimmed">
                环境要素 {envElements.length} 个 · 风险 {envAnalysis.risks.length} 处
              </Text>
            </Stack>
          </Group>
        }
        position="left"
        size={480}
        padding="lg"
        scrollAreaComponent={ScrollArea.Autosize}
      >
        <EnvironmentOverlayPanel
          elements={envElements}
          showOverlay={showEnvOverlay}
          analysis={envAnalysis}
          onAddElement={addEnvElement}
          onRemoveElement={removeEnvElement}
          onClearElements={clearEnvElements}
          onToggleOverlay={toggleEnvOverlay}
          onShowOverlayChange={setShowEnvOverlay}
        />
      </Drawer>
    </AppShell>
  );
}

export default App;
