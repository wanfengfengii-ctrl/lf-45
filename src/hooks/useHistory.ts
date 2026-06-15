import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type {
  OperationRecord,
  OperationType,
  OperationSeverity,
  OperationSnapshot,
  HistoryFilter,
  PlaybackState,
  AxisLine,
  SurveyPlan,
} from '@/types';
import { generateId, formatAngle } from '@/utils/compass';

const STORAGE_KEY = 'compass-operation-history';
const MAX_RECORDS = 2000;

const KEY_NODE_TYPES: OperationType[] = [
  'axis_save',
  'plan_switch',
  'plan_create',
  'plan_delete',
  'declination_change',
  'batch_input',
  'measurements_clear',
  'compass_reset',
];

const ANOMALY_RULES: Array<{
  check: (record: OperationRecord) => boolean;
  type: string;
  reason: string;
  severity: OperationSeverity;
}> = [
  {
    check: (r) =>
      r.type === 'axis_save' &&
      (r.payload as { exceedsThreshold?: boolean })?.exceedsThreshold === true,
    type: 'error_exceeded',
    reason: '测量误差超过阈值',
    severity: 'warning',
  },
  {
    check: (r) =>
      r.type === 'declination_change' &&
      r.beforeSnapshot.magneticDeclination === 0 &&
      r.afterSnapshot.magneticDeclination === 0,
    type: 'declination_zero',
    reason: '未设置磁偏角可能影响测量精度',
    severity: 'warning',
  },
  {
    check: (r) =>
      r.type === 'rotation_change' &&
      Math.abs(
        (r.afterSnapshot.rotation - r.beforeSnapshot.rotation + 360) % 360
      ) > 180,
    type: 'rotation_jump',
    reason: '罗盘旋转角度大幅跳变，可能存在误操作',
    severity: 'warning',
  },
  {
    check: (r) =>
      r.type === 'measurements_clear' &&
      r.beforeSnapshot.measurements.length > 5,
    type: 'mass_clear',
    reason: '清除大量测量记录，请确认操作意图',
    severity: 'error',
  },
  {
    check: (r) =>
      r.type === 'plan_delete' &&
      r.beforeSnapshot.measurements.length > 0,
    type: 'plan_with_data_deleted',
    reason: '删除包含测量数据的方案',
    severity: 'error',
  },
  {
    check: (r) => r.type === 'axis_cancel',
    type: 'axis_discarded',
    reason: '轴线绘制后被取消保存',
    severity: 'info',
  },
  {
    check: (r) => {
      if (r.type !== 'declination_change') return false;
      const delta = Math.abs(
        r.afterSnapshot.magneticDeclination - r.beforeSnapshot.magneticDeclination
      );
      return delta > 5;
    },
    type: 'large_declination_change',
    reason: '磁偏角调整幅度过大，建议核实当地磁偏角数据',
    severity: 'warning',
  },
];

export function useHistory() {
  const [records, setRecords] = useState<OperationRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load history from storage', e);
    }
    return [];
  });

  const [playback, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentIndex: -1,
    speed: 1,
    loop: false,
    showDiff: true,
    highlightedRecordId: null,
  });

  const setPlayback = useCallback((updates: Partial<PlaybackState>) => {
    setPlaybackState((prev) => ({ ...prev, ...updates }));
  }, []);

  const [filter, setFilter] = useState<HistoryFilter>({
    planId: null,
    types: undefined,
    severities: undefined,
    onlyKeyNodes: false,
    onlyAnomalies: false,
    keyword: '',
  });

  const playbackTimerRef = useRef<number | null>(null);
  const snapshotRef = useRef<OperationSnapshot | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save history', e);
    }
  }, [records]);

  const createSnapshot = useCallback(
    (params: {
      rotation: number;
      magneticDeclination: number;
      errorThreshold: number;
      isDrawingMode: boolean;
      axes: AxisLine[];
      activePlan: SurveyPlan | null;
    }): OperationSnapshot => {
      return {
        rotation: params.rotation,
        magneticDeclination: params.magneticDeclination,
        errorThreshold: params.errorThreshold,
        isDrawingMode: params.isDrawingMode,
        axes: JSON.parse(JSON.stringify(params.axes)),
        activePlanId: params.activePlan?.id ?? null,
        measurements: JSON.parse(JSON.stringify(params.activePlan?.measurements ?? [])),
      };
    },
    []
  );

  const detectAnomaly = useCallback((record: OperationRecord): OperationRecord => {
    for (const rule of ANOMALY_RULES) {
      if (rule.check(record)) {
        return {
          ...record,
          anomalyType: rule.type,
          anomalyReason: rule.reason,
          severity: rule.severity,
        };
      }
    }
    return record;
  }, []);

  const recordOperation = useCallback(
    (params: {
      type: OperationType;
      description: string;
      payload?: Record<string, unknown>;
      severity?: OperationSeverity;
      isKeyNode?: boolean;
      planId?: string | null;
      planName?: string | null;
      beforeSnapshot: OperationSnapshot;
      afterSnapshot: OperationSnapshot;
    }) => {
      const baseSeverity = params.severity ?? 'info';
      const isKey = params.isKeyNode ?? KEY_NODE_TYPES.includes(params.type);

      let record: OperationRecord = {
        id: generateId(),
        timestamp: Date.now(),
        type: params.type,
        planId: params.planId ?? params.beforeSnapshot.activePlanId,
        planName: params.planName ?? null,
        description: params.description,
        severity: baseSeverity,
        isKeyNode: isKey,
        payload: params.payload,
        beforeSnapshot: params.beforeSnapshot,
        afterSnapshot: params.afterSnapshot,
      };

      record = detectAnomaly(record);

      setRecords((prev) => {
        const updated = [record, ...prev];
        if (updated.length > MAX_RECORDS) {
          return updated.slice(0, MAX_RECORDS);
        }
        return updated;
      });

      return record;
    },
    [detectAnomaly]
  );

  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (filter.planId !== undefined && filter.planId !== null) {
      result = result.filter((r) => r.planId === filter.planId);
    }

    if (filter.types && filter.types.length > 0) {
      result = result.filter((r) => filter.types!.includes(r.type));
    }

    if (filter.severities && filter.severities.length > 0) {
      result = result.filter((r) => filter.severities!.includes(r.severity));
    }

    if (filter.onlyKeyNodes) {
      result = result.filter((r) => r.isKeyNode);
    }

    if (filter.onlyAnomalies) {
      result = result.filter((r) => r.anomalyType !== undefined);
    }

    if (filter.keyword && filter.keyword.trim()) {
      const kw = filter.keyword.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.description.toLowerCase().includes(kw) ||
          (r.anomalyReason?.toLowerCase().includes(kw) ?? false) ||
          (r.planName?.toLowerCase().includes(kw) ?? false)
      );
    }

    if (filter.startTime) {
      result = result.filter((r) => r.timestamp >= filter.startTime!);
    }

    if (filter.endTime) {
      result = result.filter((r) => r.timestamp <= filter.endTime!);
    }

    return result.reverse();
  }, [records, filter]);

  const statistics = useMemo(() => {
    const total = records.length;
    const anomalies = records.filter((r) => r.anomalyType).length;
    const keyNodes = records.filter((r) => r.isKeyNode).length;
    const warnings = records.filter((r) => r.severity === 'warning').length;
    const errors = records.filter((r) => r.severity === 'error' || r.severity === 'critical').length;

    const byType: Record<string, number> = {};
    records.forEach((r) => {
      byType[r.type] = (byType[r.type] ?? 0) + 1;
    });

    const byPlan: Record<string, { name: string; count: number }> = {};
    records.forEach((r) => {
      if (r.planId) {
        if (!byPlan[r.planId]) {
          byPlan[r.planId] = { name: r.planName ?? '未知方案', count: 0 };
        }
        byPlan[r.planId].count++;
      }
    });

    return {
      total,
      anomalies,
      keyNodes,
      warnings,
      errors,
      byType,
      byPlan,
    };
  }, [records]);

  const getRecordAtPlayback = useCallback((): OperationRecord | null => {
    if (playback.currentIndex < 0 || playback.currentIndex >= filteredRecords.length) {
      return null;
    }
    return filteredRecords[playback.currentIndex] ?? null;
  }, [playback.currentIndex, filteredRecords]);

  const stepForward = useCallback(() => {
    setPlaybackState((prev) => {
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= filteredRecords.length) {
        return {
          ...prev,
          currentIndex: prev.loop ? 0 : filteredRecords.length - 1,
          isPlaying: prev.loop ? prev.isPlaying : false,
        };
      }
      return { ...prev, currentIndex: nextIndex };
    });
  }, [filteredRecords.length]);

  const stepBackward = useCallback(() => {
    setPlaybackState((prev) => ({
      ...prev,
      currentIndex: Math.max(0, prev.currentIndex - 1),
      isPlaying: false,
    }));
  }, []);

  const jumpToRecord = useCallback((index: number) => {
    setPlaybackState((prev) => ({
      ...prev,
      currentIndex: Math.max(0, Math.min(index, filteredRecords.length - 1)),
      isPlaying: false,
      highlightedRecordId: filteredRecords[index]?.id ?? null,
    }));
  }, [filteredRecords]);

  const jumpToFirst = useCallback(() => {
    setPlaybackState((prev) => ({
      ...prev,
      currentIndex: 0,
      isPlaying: false,
    }));
  }, []);

  const jumpToLast = useCallback(() => {
    setPlaybackState((prev) => ({
      ...prev,
      currentIndex: filteredRecords.length - 1,
      isPlaying: false,
    }));
  }, [filteredRecords.length]);

  const startPlayback = useCallback(() => {
    if (filteredRecords.length === 0) return;

    setPlaybackState((prev) => {
      const startIdx = prev.currentIndex < 0 || prev.currentIndex >= filteredRecords.length - 1
        ? 0
        : prev.currentIndex;
      return { ...prev, isPlaying: true, currentIndex: startIdx };
    });
  }, [filteredRecords.length]);

  const pausePlayback = useCallback(() => {
    setPlaybackState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const togglePlayback = useCallback(() => {
    if (playback.isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  }, [playback.isPlaying, pausePlayback, startPlayback]);

  useEffect(() => {
    if (playback.isPlaying && playbackTimerRef.current === null) {
      const interval = Math.max(300, 1500 / playback.speed);
      playbackTimerRef.current = window.setInterval(() => {
        stepForward();
      }, interval);
    } else if (!playback.isPlaying && playbackTimerRef.current !== null) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }

    return () => {
      if (playbackTimerRef.current !== null) {
        clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
    };
  }, [playback.isPlaying, playback.speed, stepForward]);

  useEffect(() => {
    if (playback.isPlaying && playbackTimerRef.current !== null) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
      const interval = Math.max(300, 1500 / playback.speed);
      playbackTimerRef.current = window.setInterval(() => {
        stepForward();
      }, interval);
    }
  }, [playback.speed, playback.isPlaying, stepForward]);

  const clearHistory = useCallback(() => {
    setRecords([]);
    setPlaybackState({
      isPlaying: false,
      currentIndex: -1,
      speed: 1,
      loop: false,
      showDiff: true,
      highlightedRecordId: null,
    });
  }, []);

  const deleteRecord = useCallback((recordId: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== recordId));
  }, []);

  const exportHistory = useCallback(() => {
    const data = {
      exportedAt: Date.now(),
      version: '1.0',
      statistics,
      records,
    };
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `operation-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [records, statistics]);

  const setSnapshotReference = useCallback((snapshot: OperationSnapshot) => {
    snapshotRef.current = snapshot;
  }, []);

  const getSnapshotReference = useCallback((): OperationSnapshot | null => {
    return snapshotRef.current;
  }, []);

  return {
    records,
    filteredRecords,
    playback,
    filter,
    statistics,
    setFilter,
    recordOperation,
    createSnapshot,
    stepForward,
    stepBackward,
    jumpToRecord,
    jumpToFirst,
    jumpToLast,
    startPlayback,
    pausePlayback,
    togglePlayback,
    getRecordAtPlayback,
    setPlayback,
    clearHistory,
    deleteRecord,
    exportHistory,
    setSnapshotReference,
    getSnapshotReference,
  };
}

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  rotation_change: '罗盘旋转',
  declination_change: '磁偏角调整',
  threshold_change: '误差阈值调整',
  axis_draw: '绘制轴线',
  axis_save: '保存测量',
  axis_cancel: '取消保存',
  plan_switch: '切换方案',
  plan_create: '创建方案',
  plan_delete: '删除方案',
  plan_update: '更新方案',
  measurement_delete: '删除记录',
  measurements_clear: '清空记录',
  compass_reset: '罗盘归零',
  axes_clear: '清除轴线',
  batch_input: '批量录入',
  drawing_mode_toggle: '绘制模式切换',
};

export const SEVERITY_COLORS: Record<OperationSeverity, string> = {
  info: 'blue',
  warning: 'orange',
  error: 'red',
  critical: 'dark',
};

export function formatOperationDescription(record: OperationRecord): string {
  const p = record.payload ?? {};
  switch (record.type) {
    case 'rotation_change':
      return `罗盘旋转：${formatAngle(p.before as number ?? 0)} → ${formatAngle(p.after as number ?? 0)}`;
    case 'declination_change':
      return `磁偏角调整：${(p.before as number ?? 0) > 0 ? '+' : ''}${(p.before as number ?? 0).toFixed(1)}° → ${(p.after as number ?? 0) > 0 ? '+' : ''}${(p.after as number ?? 0).toFixed(1)}°`;
    case 'threshold_change':
      return `误差阈值调整：${(p.before as number ?? 0).toFixed(1)}° → ${(p.after as number ?? 0).toFixed(1)}°`;
    case 'axis_draw':
      return `绘制轴线：${p.label as string ?? '未命名'}（${p.angle ? formatAngle(p.angle as number) : ''}）`;
    case 'axis_save':
      return `保存测量「${p.label as string ?? ''}」：${formatAngle(p.bearing as number ?? 0)}，误差 ${(p.error as number ?? 0).toFixed(2)}°`;
    case 'axis_cancel':
      return `取消保存轴线「${p.label as string ?? ''}」`;
    case 'plan_switch':
      return `切换方案：${p.fromName as string ?? ''} → ${p.toName as string ?? ''}`;
    case 'plan_create':
      return `创建方案「${p.name as string ?? ''}」`;
    case 'plan_delete':
      return `删除方案「${p.name as string ?? ''}」`;
    case 'plan_update':
      return `更新方案信息「${p.name as string ?? ''}」`;
    case 'measurement_delete':
      return `删除测量记录「${p.label as string ?? ''}」`;
    case 'measurements_clear':
      return `清空方案内所有记录（${p.count as number ?? 0}条）`;
    case 'compass_reset':
      return '罗盘角度归零';
    case 'axes_clear':
      return `清除所有绘制轴线（${p.count as number ?? 0}条）`;
    case 'batch_input':
      return `批量录入 ${p.success as number ?? 0} 条记录`;
    case 'drawing_mode_toggle':
      return `切换${p.enabled ? '为绘制模式' : '为旋转模式'}`;
    default:
      return record.description;
  }
}
