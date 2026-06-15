import React from 'react';
import {
  Paper,
  Group,
  Stack,
  Text,
  NumberInput,
  Slider,
  Switch,
  Badge,
  Divider,
  Card,
  SimpleGrid,
  ThemeIcon,
} from '@mantine/core';
import {
  IconCompass,
  IconDirection,
  IconAdjustments,
  IconRuler2,
  IconAlertTriangle,
  IconCheck,
  IconMountain,
  IconNorthStar,
  IconTargetArrow,
} from '@tabler/icons-react';
import type { BearingResult } from '@/types';
import {
  formatAngle,
  MIN_DECLINATION,
  MAX_DECLINATION,
  ELEMENT_COLORS,
  clampDeclination,
  clampAngle,
} from '@/utils/compass';

interface ControlPanelProps {
  rotation: number;
  onRotationChange: (rotation: number) => void;
  magneticDeclination: number;
  onDeclinationChange: (declination: number) => void;
  errorThreshold: number;
  onErrorThresholdChange: (threshold: number) => void;
  isDrawingMode: boolean;
  onDrawingModeChange: (enabled: boolean) => void;
  bearingResult: BearingResult | null;
  previewAngle: number | null;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  rotation,
  onRotationChange,
  magneticDeclination,
  onDeclinationChange,
  errorThreshold,
  onErrorThresholdChange,
  isDrawingMode,
  onDrawingModeChange,
  bearingResult,
  previewAngle,
}) => {
  const displayResult = bearingResult;
  const displayAngle = previewAngle ?? rotation;

  return (
    <Stack gap="lg">
      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group mb="md">
          <ThemeIcon size="md" radius="md" color="brand">
            <IconCompass size={18} />
          </ThemeIcon>
          <Text fw={600} size="lg">
            罗盘设置
          </Text>
        </Group>

        <Stack gap="md">
          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={500} c="dimmed">
                <IconAdjustments size={14} style={{ display: 'inline', marginRight: 4 }} />
                罗盘旋转角度
              </Text>
              <Badge color="blue" variant="light">
                {formatAngle(displayAngle, 1)}
              </Badge>
            </Group>
            <Slider
              value={rotation}
              onChange={(val) => onRotationChange(clampAngle(val as number))}
              min={0}
              max={360}
              step={0.1}
              label={(val) => `${val.toFixed(0)}°`}
              marks={[
                { value: 0, label: '0°' },
                { value: 90, label: '90°' },
                { value: 180, label: '180°' },
                { value: 270, label: '270°' },
                { value: 360, label: '360°' },
              ]}
              styles={{ markLabel: { fontSize: 10 } }}
            />
            <NumberInput
              mt="xs"
              value={rotation}
              onChange={(val) => onRotationChange(clampAngle(Number(val) || 0))}
              min={0}
              max={360}
              step={0.5}
              decimalScale={1}
              suffix="°"
              size="xs"
            />
          </div>

          <Divider />

          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={500} c="dimmed">
                <IconDirection size={14} style={{ display: 'inline', marginRight: 4 }} />
                当地磁偏角
              </Text>
              <Badge color={magneticDeclination === 0 ? 'gray' : magneticDeclination > 0 ? 'teal' : 'violet'} variant="light">
                {magneticDeclination > 0 ? '东偏 ' : magneticDeclination < 0 ? '西偏 ' : ''}
                {Math.abs(magneticDeclination).toFixed(1)}°
              </Badge>
            </Group>
            <Slider
              value={magneticDeclination}
              onChange={(val) => onDeclinationChange(clampDeclination(val as number))}
              min={MIN_DECLINATION}
              max={MAX_DECLINATION}
              step={0.1}
              label={(val) => `${val > 0 ? '+' : ''}${val.toFixed(1)}°`}
              marks={[
                { value: MIN_DECLINATION, label: `${MIN_DECLINATION}°` },
                { value: 0, label: '0°' },
                { value: MAX_DECLINATION, label: `${MAX_DECLINATION}°` },
              ]}
              styles={{ markLabel: { fontSize: 10 } }}
            />
            <NumberInput
              mt="xs"
              value={magneticDeclination}
              onChange={(val) => onDeclinationChange(clampDeclination(Number(val) || 0))}
              min={MIN_DECLINATION}
              max={MAX_DECLINATION}
              step={0.1}
              decimalScale={1}
              suffix="°"
              size="xs"
              description={`合理范围: ${MIN_DECLINATION}° ~ ${MAX_DECLINATION}°`}
            />
          </div>

          <Divider />

          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={500} c="dimmed">
                <IconRuler2 size={14} style={{ display: 'inline', marginRight: 4 }} />
                误差阈值
              </Text>
              <Badge color="orange" variant="light">
                {errorThreshold.toFixed(1)}°
              </Badge>
            </Group>
            <Slider
              value={errorThreshold}
              onChange={(val) => onErrorThresholdChange(Math.max(0.1, val as number))}
              min={0.5}
              max={15}
              step={0.1}
              label={(val) => `${val.toFixed(1)}°`}
              marks={[
                { value: 1, label: '1°' },
                { value: 5, label: '5°' },
                { value: 10, label: '10°' },
                { value: 15, label: '15°' },
              ]}
              styles={{ markLabel: { fontSize: 10 } }}
            />
            <NumberInput
              mt="xs"
              value={errorThreshold}
              onChange={(val) => onErrorThresholdChange(Math.max(0.1, Number(val) || 0.5))}
              min={0.5}
              max={15}
              step={0.1}
              decimalScale={1}
              suffix="°"
              size="xs"
            />
          </div>

          <Divider />

          <Group justify="space-between">
            <Text size="sm" fw={500} c="dimmed">
              绘制建筑轴线模式
            </Text>
            <Switch
              checked={isDrawingMode}
              onChange={(e) => onDrawingModeChange(e.currentTarget.checked)}
              color="green"
              size="md"
            />
          </Group>
          <Text size="xs" c="dimmed" mt={-6}>
            {isDrawingMode
              ? '✏️ 在罗盘上拖拽绘制轴线，需经过中心点才能完成测量'
              : '🧭 拖拽罗盘可旋转角度'}
          </Text>
        </Stack>
      </Paper>

      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group mb="md">
          <ThemeIcon size="md" radius="md" color="compass" variant="filled">
            <IconTargetArrow size={18} />
          </ThemeIcon>
          <Text fw={600} size="lg">
            方位读数
          </Text>
          {previewAngle !== null && (
            <Badge color="cyan" variant="filled" size="sm">
              预览中
            </Badge>
          )}
        </Group>

        {displayResult ? (
          <Stack gap="sm">
            <SimpleGrid cols={2} spacing="sm">
              <Card p="sm" radius="md" withBorder bg="blue.0">
                <Text size="xs" c="dimmed" fw={500}>
                  <IconCompass size={12} style={{ display: 'inline', marginRight: 2 }} />
                  罗盘读数
                </Text>
                <Text fw={700} size="xl" c="blue.7">
                  {formatAngle(displayResult.compassReading)}
                </Text>
              </Card>

              <Card p="sm" radius="md" withBorder bg="cyan.0">
                <Text size="xs" c="dimmed" fw={500}>
                  <IconNorthStar size={12} style={{ display: 'inline', marginRight: 2 }} />
                  真实方位
                </Text>
                <Text fw={700} size="xl" c="cyan.7">
                  {formatAngle(displayResult.trueBearing)}
                </Text>
              </Card>

              <Card p="sm" radius="md" withBorder bg="green.0">
                <Text size="xs" c="dimmed" fw={500}>
                  <IconCheck size={12} style={{ display: 'inline', marginRight: 2 }} />
                  校正后方位
                </Text>
                <Text fw={700} size="xl" c="green.7">
                  {formatAngle(displayResult.correctedBearing)}
                </Text>
              </Card>

              <Card p="sm" radius="md" withBorder bg="violet.0">
                <Text size="xs" c="dimmed" fw={500}>
                  <IconMountain size={12} style={{ display: 'inline', marginRight: 2 }} />
                  归属山向
                </Text>
                <Group gap={6}>
                  <Text fw={700} size="xl" c="violet.7">
                    {displayResult.mountain.name}山
                  </Text>
                  <Badge
                    size="xs"
                    variant="filled"
                    style={{ backgroundColor: ELEMENT_COLORS[displayResult.mountain.element] }}
                  >
                    {displayResult.mountain.element}
                  </Badge>
                </Group>
              </Card>
            </SimpleGrid>

            <Divider />

            <Group justify="space-between">
              <Text size="sm" fw={500}>
                方位误差
              </Text>
              <Group>
                {displayResult.exceedsThreshold ? (
                  <ThemeIcon size="sm" color="red" radius="xl" variant="filled">
                    <IconAlertTriangle size={14} />
                  </ThemeIcon>
                ) : (
                  <ThemeIcon size="sm" color="green" radius="xl" variant="filled">
                    <IconCheck size={14} />
                  </ThemeIcon>
                )}
                <Text
                  fw={700}
                  size="lg"
                  c={displayResult.exceedsThreshold ? 'red' : 'green'}
                >
                  {displayResult.errorAmount.toFixed(2)}°
                </Text>
                {displayResult.exceedsThreshold && (
                  <Badge color="red" variant="filled" size="sm" tt="none">
                    超出阈值!
                  </Badge>
                )}
              </Group>
            </Group>

            <Group justify="space-between">
              <Text size="sm" fw={500} c="dimmed">
                误差范围
              </Text>
              <Text size="sm" fw={600}>
                {formatAngle(displayResult.errorRange[0], 1)} ~ {formatAngle(displayResult.errorRange[1], 1)}
              </Text>
            </Group>

            <Group justify="space-between">
              <Text size="sm" fw={500} c="dimmed">
                八卦方向
              </Text>
              <Badge size="sm" variant="outline" color="gray">
                {displayResult.mountain.direction}方
              </Badge>
            </Group>
          </Stack>
        ) : (
          <Stack align="center" py="xl" style={{ color: 'var(--mantine-color-dimmed)' }}>
            <IconCompass size={48} opacity={0.3} />
            <Text size="sm" ta="center" c="dimmed">
              在罗盘上绘制轴线或拖动罗盘
              <br />
              查看实时方位读数
            </Text>
          </Stack>
        )}
      </Paper>
    </Stack>
  );
};
