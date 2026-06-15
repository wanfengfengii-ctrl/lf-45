import { useState, useCallback, useEffect, useMemo } from 'react';
import type { EnvironmentElement, MeasurementRecord, EnvironmentAnalysisResult } from '@/types';
import {
  generateId,
  normalizeAngle,
  analyzeEnvironmentRisks,
  groupElementsByType,
} from '@/utils/domain';

const STORAGE_KEY = 'compass-environment-elements';

export function useEnvironmentOverlay(measurements: MeasurementRecord[]) {
  const [elements, setElements] = useState<EnvironmentElement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load environment elements from storage', e);
    }
    return [];
  });

  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(elements));
    } catch (e) {
      console.error('Failed to save environment elements', e);
    }
  }, [elements]);

  const addElement = useCallback((element: Omit<EnvironmentElement, 'id'>) => {
    const newElement: EnvironmentElement = {
      ...element,
      id: generateId(),
      startAngle: normalizeAngle(element.startAngle),
      endAngle: normalizeAngle(element.endAngle),
    };
    setElements((prev) => [...prev, newElement]);
    return newElement;
  }, []);

  const removeElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateElement = useCallback((id: string, updates: Partial<EnvironmentElement>) => {
    setElements((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        return {
          ...e,
          ...updates,
          startAngle: updates.startAngle !== undefined ? normalizeAngle(updates.startAngle) : e.startAngle,
          endAngle: updates.endAngle !== undefined ? normalizeAngle(updates.endAngle) : e.endAngle,
        };
      })
    );
  }, []);

  const clearElements = useCallback(() => {
    setElements([]);
  }, []);

  const toggleOverlay = useCallback(() => {
    setShowOverlay((prev) => !prev);
  }, []);

  const analysis: EnvironmentAnalysisResult = useMemo(() => {
    return analyzeEnvironmentRisks(measurements, elements);
  }, [measurements, elements]);

  const elementsByType = useMemo(() => {
    return groupElementsByType(elements);
  }, [elements]);

  return {
    elements,
    showOverlay,
    analysis,
    elementsByType,
    addElement,
    removeElement,
    updateElement,
    clearElements,
    toggleOverlay,
    setShowOverlay,
  };
}
