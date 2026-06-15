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
