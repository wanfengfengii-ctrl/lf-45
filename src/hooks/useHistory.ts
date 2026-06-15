import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type {
  OperationRecord,
  OperationType,
  OperationSeverity,
  OperationSnapshot,
  HistoryFilter,
  PlaybackState,
} from '@/types';
import {
  createSnapshot,
  createOperationRecord,
  filterRecords,
  calculateStatistics,
  addRecord,
  MAX_RECORDS,
  OPERATION_TYPE_LABELS,
  SEVERITY_COLORS,
} from '@/utils/domain';

const STORAGE_KEY = 'compass-operation-history';

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
      const record = createOperationRecord(params);
      setRecords((prev) => addRecord(prev, record, MAX_RECORDS));
      return record;
    },
    []
  );

  const filteredRecords = useMemo(() => {
    return filterRecords(records, filter);
  }, [records, filter]);

  const statistics = useMemo(() => {
    return calculateStatistics(records);
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

export { OPERATION_TYPE_LABELS, SEVERITY_COLORS };
