export interface Point {
  x: number;
  y: number;
}

export interface Mountain {
  name: string;
  startAngle: number;
  midAngle: number;
  endAngle: number;
  element: string;
  direction: string;
}

export interface AxisLine {
  id: string;
  startPoint: Point;
  endPoint: Point;
  passesCenter: boolean;
  label?: string;
}

export interface MeasurementRecord {
  id: string;
  timestamp: number;
  axisId: string;
  axisLabel: string;
  compassReading: number;
  trueBearing: number;
  correctedBearing: number;
  mountainName: string;
  mountainElement: string;
  errorRange: [number, number];
  errorAmount: number;
  exceedsThreshold: boolean;
}

export interface SurveyPlan {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  magneticDeclination: number;
  errorThreshold: number;
  measurements: MeasurementRecord[];
  isActive: boolean;
}

export interface CompassState {
  rotation: number;
  magneticDeclination: number;
  errorThreshold: number;
  isDrawing: boolean;
  drawingStart: Point | null;
  drawingEnd: Point | null;
}

export interface BearingResult {
  compassReading: number;
  trueBearing: number;
  correctedBearing: number;
  mountain: Mountain;
  errorRange: [number, number];
  errorAmount: number;
  exceedsThreshold: boolean;
}

export interface BatchInputItem {
  label: string;
  compassReading: number;
}

export interface MountainDistribution {
  name: string;
  element: string;
  count: number;
  percentage: number;
}

export interface PlanStatistics {
  totalCount: number;
  passCount: number;
  failCount: number;
  passRate: number;
  duplicateCount: number;
  averageError: number;
  maxError: number;
  minError: number;
  mountainDistribution: MountainDistribution[];
  highRiskRecords: MeasurementRecord[];
}

export interface AnalysisReportData {
  planId: string;
  planName: string;
  planDescription: string;
  generatedAt: number;
  magneticDeclination: number;
  errorThreshold: number;
  statistics: PlanStatistics;
  measurements: MeasurementRecord[];
  summary: string;
  recommendations: string[];
}

export type OperationType =
  | 'rotation_change'
  | 'declination_change'
  | 'threshold_change'
  | 'axis_draw'
  | 'axis_save'
  | 'axis_cancel'
  | 'plan_switch'
  | 'plan_create'
  | 'plan_delete'
  | 'plan_update'
  | 'measurement_delete'
  | 'measurements_clear'
  | 'compass_reset'
  | 'axes_clear'
  | 'batch_input'
  | 'drawing_mode_toggle';

export type OperationSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface OperationSnapshot {
  rotation: number;
  magneticDeclination: number;
  errorThreshold: number;
  isDrawingMode: boolean;
  axes: AxisLine[];
  activePlanId: string | null;
  measurements: MeasurementRecord[];
}

export interface OperationRecord {
  id: string;
  timestamp: number;
  type: OperationType;
  planId: string | null;
  planName: string | null;
  description: string;
  severity: OperationSeverity;
  isKeyNode: boolean;
  anomalyType?: string;
  anomalyReason?: string;
  payload?: Record<string, unknown>;
  beforeSnapshot: OperationSnapshot;
  afterSnapshot: OperationSnapshot;
}

export interface HistoryFilter {
  planId?: string | null;
  types?: OperationType[];
  severities?: OperationSeverity[];
  startTime?: number;
  endTime?: number;
  onlyKeyNodes?: boolean;
  onlyAnomalies?: boolean;
  keyword?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentIndex: number;
  speed: number;
  loop: boolean;
  showDiff: boolean;
  highlightedRecordId: string | null;
}
