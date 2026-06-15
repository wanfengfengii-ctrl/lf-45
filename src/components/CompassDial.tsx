import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { Point, AxisLine, EnvironmentElement, FengShuiRisk } from '@/types';
import {
  TWENTY_FOUR_MOUNTAINS,
  ELEMENT_COLORS,
  DIRECTION_COLORS,
  ENV_ELEMENT_COLORS,
  RISK_LEVEL_COLORS,
  normalizeAngle,
  pointsToAngle,
  linePassesThroughCenter,
  clampAngle,
} from '@/utils/compass';

interface CompassDialProps {
  size?: number;
  rotation: number;
  onRotationChange: (rotation: number) => void;
  isDrawingMode: boolean;
  onAxisDrawn: (axis: AxisLine) => void;
  axes: AxisLine[];
  magneticDeclination: number;
  onPreviewAngleChange?: (angle: number | null) => void;
  environmentElements?: EnvironmentElement[];
  showEnvironmentOverlay?: boolean;
  risks?: FengShuiRisk[];
}

export const CompassDial: React.FC<CompassDialProps> = ({
  size = 560,
  rotation,
  onRotationChange,
  isDrawingMode,
  onAxisDrawn,
  axes,
  magneticDeclination,
  onPreviewAngleChange,
  environmentElements = [],
  showEnvironmentOverlay = true,
  risks = [],
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [drawingState, setDrawingState] = useState<{
    start: Point | null;
    current: Point | null;
  }>({ start: null, current: null });
  const dragStartAngleRef = useRef(0);
  const compassRotationRef = useRef(rotation);

  const center = size / 2;
  const outerRadius = size / 2 - 20;
  const mountainInnerRadius = outerRadius - 60;
  const mountainOuterRadius = outerRadius - 10;
  const tickInnerRadius = mountainInnerRadius - 20;
  const tickOuterRadius = mountainInnerRadius - 2;
  const centerRingRadius = 40;

  const toSvgPoint = useCallback(
    (clientX: number, clientY: number): Point | null => {
      if (!svgRef.current) return null;
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = size / rect.width;
      const scaleY = size / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [size]
  );

  const getAngleFromPoint = useCallback(
    (p: Point): number => {
      const dx = p.x - center;
      const dy = p.y - center;
      const rad = Math.atan2(dx, -dy);
      return normalizeAngle((rad * 180) / Math.PI);
    },
    [center]
  );

  const polarToCartesian = useCallback(
    (angleDeg: number, radius: number): Point => {
      const rad = ((angleDeg - 90) * Math.PI) / 180;
      return {
        x: center + radius * Math.cos(rad),
        y: center + radius * Math.sin(rad),
      };
    },
    [center]
  );

  useEffect(() => {
    compassRotationRef.current = rotation;
  }, [rotation]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('viewBox', `0 0 ${size} ${size}`).style('cursor', isDrawingMode ? 'crosshair' : 'grab');

    const defs = svg.append('defs');
    const gradient = defs
      .append('radialGradient')
      .attr('id', 'compassBg')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#fefce8');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#fde68a');

    const mountainGradient = defs
      .append('radialGradient')
      .attr('id', 'mountainBg')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');
    mountainGradient.append('stop').attr('offset', '0%').attr('stop-color', '#fff7ed');
    mountainGradient.append('stop').attr('offset', '100%').attr('stop-color', '#ffedd5');

    svg
      .append('circle')
      .attr('cx', center)
      .attr('cy', center)
      .attr('r', outerRadius)
      .attr('fill', 'url(#compassBg)')
      .attr('stroke', '#92400e')
      .attr('stroke-width', 3);

    const rotatingGroup = svg
      .append('g')
      .attr('class', 'rotating-group')
      .attr('transform', `rotate(${rotation}, ${center}, ${center})`);

    const arcGenerator = d3.arc();
    TWENTY_FOUR_MOUNTAINS.forEach((mountain, i) => {
      const startAngle = ((mountain.startAngle - 90) * Math.PI) / 180;
      const endAngle = ((mountain.endAngle - 90) * Math.PI) / 180;

      const arcPath = arcGenerator({
        innerRadius: mountainInnerRadius,
        outerRadius: mountainOuterRadius,
        startAngle,
        endAngle,
      });

      const elementColor = ELEMENT_COLORS[mountain.element] || '#9ca3af';

      rotatingGroup
        .append('path')
        .attr('d', arcPath || '')
        .attr('fill', i % 2 === 0 ? '#fffbeb' : '#fef3c7')
        .attr('stroke', elementColor)
        .attr('stroke-width', 1)
        .style('opacity', 0.9);

      const midAngle = ((mountain.midAngle - 90) * Math.PI) / 180;
      const textRadius = (mountainInnerRadius + mountainOuterRadius) / 2;
      const textX = center + textRadius * Math.cos(midAngle);
      const textY = center + textRadius * Math.sin(midAngle);

      rotatingGroup
        .append('text')
        .attr('x', textX)
        .attr('y', textY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .attr('fill', DIRECTION_COLORS[mountain.direction] || '#1f2937')
        .attr('transform', `rotate(${mountain.midAngle}, ${textX}, ${textY})`)
        .text(mountain.name);
    });

    const eightDirections = [
      { name: '北', angle: 0, color: '#1e40af' },
      { name: '东北', angle: 45, color: '#6b21a8' },
      { name: '东', angle: 90, color: '#15803d' },
      { name: '东南', angle: 135, color: '#a16207' },
      { name: '南', angle: 180, color: '#b91c1c' },
      { name: '西南', angle: 225, color: '#9a3412' },
      { name: '西', angle: 270, color: '#7c2d12' },
      { name: '西北', angle: 315, color: '#3730a3' },
    ];

    eightDirections.forEach((dir) => {
      const startRad = ((dir.angle - 90) * Math.PI) / 180;
      const x1 = center + (tickOuterRadius + 5) * Math.cos(startRad);
      const y1 = center + (tickOuterRadius + 5) * Math.sin(startRad);
      const x2 = center + (mountainOuterRadius + 2) * Math.cos(startRad);
      const y2 = center + (mountainOuterRadius + 2) * Math.sin(startRad);

      rotatingGroup
        .append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', dir.color)
        .attr('stroke-width', 3);

      const textR = mountainOuterRadius + 18;
      const tx = center + textR * Math.cos(startRad);
      const ty = center + textR * Math.sin(startRad);

      rotatingGroup
        .append('text')
        .attr('x', tx)
        .attr('y', ty)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('fill', dir.color)
        .text(dir.name);
    });

    for (let i = 0; i < 360; i += 1) {
      if (i % 15 === 0) continue;
      const rad = ((i - 90) * Math.PI) / 180;
      const isMajor = i % 5 === 0;
      const innerR = isMajor ? tickInnerRadius + 5 : tickInnerRadius + 10;
      const x1 = center + innerR * Math.cos(rad);
      const y1 = center + innerR * Math.sin(rad);
      const x2 = center + tickOuterRadius * Math.cos(rad);
      const y2 = center + tickOuterRadius * Math.sin(rad);

      rotatingGroup
        .append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', isMajor ? '#78350f' : '#d97706')
        .attr('stroke-width', isMajor ? 1.5 : 0.8);
    }

    rotatingGroup
      .append('circle')
      .attr('cx', center)
      .attr('cy', center)
      .attr('r', tickInnerRadius - 8)
      .attr('fill', 'url(#mountainBg)')
      .attr('stroke', '#92400e')
      .attr('stroke-width', 1.5);

    svg
      .append('circle')
      .attr('cx', center)
      .attr('cy', center)
      .attr('r', centerRingRadius)
      .attr('fill', '#78350f')
      .attr('stroke', '#451a03')
      .attr('stroke-width', 2);

    svg
      .append('circle')
      .attr('cx', center)
      .attr('cy', center)
      .attr('r', 8)
      .attr('fill', '#dc2626')
      .attr('stroke', '#7f1d1d')
      .attr('stroke-width', 1.5);

    svg
      .append('circle')
      .attr('cx', center)
      .attr('cy', center)
      .attr('r', 3)
      .attr('fill', '#fff');

    svg
      .append('line')
      .attr('x1', center)
      .attr('y1', 15)
      .attr('x2', center)
      .attr('y2', outerRadius - 50)
      .attr('stroke', '#dc2626')
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round');

    svg
      .append('polygon')
      .attr(
        'points',
        `${center},5 ${center - 8},25 ${center + 8},25`
      )
      .attr('fill', '#dc2626')
      .attr('stroke', '#7f1d1d')
      .attr('stroke-width', 1);

    const declinationRad = ((magneticDeclination - 90) * Math.PI) / 180;
    const decX = center + (outerRadius - 70) * Math.cos(declinationRad);
    const decY = center + (outerRadius - 70) * Math.sin(declinationRad);

    if (Math.abs(magneticDeclination) > 0.1) {
      svg
        .append('line')
        .attr('x1', center)
        .attr('y1', center)
        .attr('x2', decX)
        .attr('y2', decY)
        .attr('stroke', '#2563eb')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '6,4')
        .attr('opacity', 0.7);

      svg
        .append('text')
        .attr('x', decX + 10)
        .attr('y', decY)
        .attr('font-size', '11px')
        .attr('fill', '#2563eb')
        .attr('font-weight', '500')
        .text(`磁偏角 ${magneticDeclination > 0 ? '+' : ''}${magneticDeclination.toFixed(1)}°`);
    }

    axes.forEach((axis) => {
      svg
        .append('line')
        .attr('x1', axis.startPoint.x)
        .attr('y1', axis.startPoint.y)
        .attr('x2', axis.endPoint.x)
        .attr('y2', axis.endPoint.y)
        .attr('stroke', axis.passesCenter ? '#16a34a' : '#ef4444')
        .attr('stroke-width', 2.5)
        .attr('stroke-linecap', 'round')
        .attr('opacity', 0.9);

      [axis.startPoint, axis.endPoint].forEach((pt, idx) => {
        svg
          .append('circle')
          .attr('cx', pt.x)
          .attr('cy', pt.y)
          .attr('r', 6)
          .attr('fill', idx === 0 ? '#22c55e' : '#3b82f6')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);
      });

      if (axis.label) {
        const midX = (axis.startPoint.x + axis.endPoint.x) / 2;
        const midY = (axis.startPoint.y + axis.endPoint.y) / 2;
        svg
          .append('text')
          .attr('x', midX + 8)
          .attr('y', midY - 8)
          .attr('font-size', '12px')
          .attr('fill', '#1f2937')
          .attr('font-weight', '600')
          .attr('paint-order', 'stroke')
          .attr('stroke', '#fff')
          .attr('stroke-width', 3)
          .text(axis.label);
      }
    });

    if (showEnvironmentOverlay && environmentElements.length > 0) {
      const envOverlayGroup = svg.append('g').attr('class', 'env-overlay');
      const envArcGenerator = d3.arc();
      const distanceRadii = { near: mountainInnerRadius - 15, medium: mountainInnerRadius - 35, far: mountainInnerRadius - 55 };

      environmentElements.forEach((el) => {
        const elColor = ENV_ELEMENT_COLORS[el.type] || '#9ca3af';
        const innerR = Math.max(10, distanceRadii[el.distance] - 8);
        const outerR = distanceRadii[el.distance] + 4;

        const startAngle = ((el.startAngle - 90) * Math.PI) / 180;
        let endAngle = ((el.endAngle - 90) * Math.PI) / 180;

        if (endAngle < startAngle) {
          endAngle += 2 * Math.PI;
        }

        const arcPath = envArcGenerator({
          innerRadius: innerR,
          outerRadius: outerR,
          startAngle,
          endAngle,
        });

        envOverlayGroup
          .append('path')
          .attr('d', arcPath || '')
          .attr('fill', elColor)
          .attr('opacity', 0.35)
          .attr('stroke', elColor)
          .attr('stroke-width', 2);

        const midAngleDeg = (el.startAngle + el.endAngle) / 2;
        const midRad = ((midAngleDeg - 90) * Math.PI) / 180;
        const labelR = (innerR + outerR) / 2;
        const lx = center + labelR * Math.cos(midRad);
        const ly = center + labelR * Math.sin(midRad);

        envOverlayGroup
          .append('text')
          .attr('x', lx)
          .attr('y', ly)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .attr('fill', elColor)
          .attr('paint-order', 'stroke')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
          .text(el.label);
      });
    }

    if (risks.length > 0) {
      const riskGroup = svg.append('g').attr('class', 'risk-overlay');
      const riskArcGenerator = d3.arc();

      risks.forEach((risk) => {
        if (risk.level === 'safe') return;

        const riskColor = RISK_LEVEL_COLORS[risk.level];
        let sectorStart: number;
        let sectorEnd: number;

        if (risk.type === 'chong_sha') {
          const oppBearing = normalizeAngle(risk.axisBearing + 180);
          sectorStart = oppBearing - 7.5;
          sectorEnd = oppBearing + 7.5;
        } else if (risk.type === 'zhe_dang') {
          sectorStart = risk.axisBearing - 15;
          sectorEnd = risk.axisBearing + 15;
        } else {
          sectorStart = risk.axisBearing - 10;
          sectorEnd = risk.axisBearing + 10;
        }

        const startRad = ((sectorStart - 90) * Math.PI) / 180;
        const endRad = ((sectorEnd - 90) * Math.PI) / 180;

        const riskArcPath = riskArcGenerator({
          innerRadius: centerRingRadius + 5,
          outerRadius: tickInnerRadius - 10,
          startAngle: startRad,
          endAngle: endRad > startRad ? endRad : endRad + 2 * Math.PI,
        });

        riskGroup
          .append('path')
          .attr('d', riskArcPath || '')
          .attr('fill', riskColor)
          .attr('opacity', risk.level === 'critical' ? 0.25 : risk.level === 'warning' ? 0.15 : 0.1)
          .attr('stroke', riskColor)
          .attr('stroke-width', risk.level === 'critical' ? 2.5 : 1.5)
          .attr('stroke-dasharray', risk.level === 'critical' ? '6,3' : '4,3');

        if (risk.level === 'critical') {
          const midAngleDeg = (sectorStart + sectorEnd) / 2;
          const midAngleRad = ((midAngleDeg - 90) * Math.PI) / 180;
          const warnR = tickInnerRadius - 15;
          const wx = center + warnR * Math.cos(midAngleRad);
          const wy = center + warnR * Math.sin(midAngleRad);

          riskGroup
            .append('text')
            .attr('x', wx)
            .attr('y', wy)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '16px')
            .attr('fill', riskColor)
            .attr('font-weight', 'bold')
            .text('⚠');
        }
      });
    }

    if (drawingState.start && drawingState.current) {
      const start = drawingState.start;
      const end = drawingState.current;
      const passesCenter = linePassesThroughCenter(start, end, { x: center, y: center });

      svg
        .append('line')
        .attr('x1', start.x)
        .attr('y1', start.y)
        .attr('x2', end.x)
        .attr('y2', end.y)
        .attr('stroke', passesCenter ? '#22c55e' : '#ef4444')
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '8,4')
        .attr('stroke-linecap', 'round')
        .attr('opacity', 0.8);

      svg
        .append('circle')
        .attr('cx', start.x)
        .attr('cy', start.y)
        .attr('r', 7)
        .attr('fill', '#22c55e')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      svg
        .append('circle')
        .attr('cx', end.x)
        .attr('cy', end.y)
        .attr('r', 7)
        .attr('fill', '#3b82f6')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      const previewAngle = pointsToAngle(start, end);
      if (onPreviewAngleChange) {
        onPreviewAngleChange(previewAngle - rotation);
      }
    }
  }, [
    size,
    rotation,
    center,
    outerRadius,
    mountainInnerRadius,
    mountainOuterRadius,
    tickInnerRadius,
    tickOuterRadius,
    axes,
    drawingState,
    magneticDeclination,
    onPreviewAngleChange,
    environmentElements,
    showEnvironmentOverlay,
    risks,
  ]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const pt = toSvgPoint(e.clientX, e.clientY);
      if (!pt) return;

      if (isDrawingMode) {
        setDrawingState({ start: pt, current: pt });
      } else {
        setIsDragging(true);
        dragStartAngleRef.current = getAngleFromPoint(pt);
        compassRotationRef.current = rotation;
      }
    },
    [isDrawingMode, toSvgPoint, getAngleFromPoint, rotation]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const pt = toSvgPoint(e.clientX, e.clientY);
      if (!pt) return;

      if (isDrawingMode && drawingState.start) {
        setDrawingState((prev) => ({ ...prev, current: pt }));
      } else if (isDragging) {
        const currentAngle = getAngleFromPoint(pt);
        let delta = currentAngle - dragStartAngleRef.current;
        const newRotation = normalizeAngle(compassRotationRef.current + delta);
        onRotationChange(clampAngle(newRotation));
      }
    },
    [isDrawingMode, drawingState.start, isDragging, toSvgPoint, getAngleFromPoint, onRotationChange]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const pt = toSvgPoint(e.clientX, e.clientY);

      if (isDrawingMode && drawingState.start && pt) {
        const passesCenter = linePassesThroughCenter(drawingState.start, pt, {
          x: center,
          y: center,
        });

        const axis: AxisLine = {
          id: `axis-${Date.now()}`,
          startPoint: drawingState.start,
          endPoint: pt,
          passesCenter,
        };
        onAxisDrawn(axis);
        setDrawingState({ start: null, current: null });
      }

      setIsDragging(false);
      if (onPreviewAngleChange) {
        onPreviewAngleChange(null);
      }
    },
    [isDrawingMode, drawingState.start, toSvgPoint, center, onAxisDrawn, onPreviewAngleChange]
  );

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    if (isDrawingMode) {
      setDrawingState({ start: null, current: null });
    }
    if (onPreviewAngleChange) {
      onPreviewAngleChange(null);
    }
  }, [isDrawingMode, onPreviewAngleChange]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: size,
        margin: '0 auto',
        aspectRatio: '1 / 1',
      }}
    >
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          userSelect: 'none',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(120, 53, 15, 0.25)',
          background: '#fffbeb',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};
