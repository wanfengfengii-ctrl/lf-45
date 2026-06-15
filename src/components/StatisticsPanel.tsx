import React, { useMemo } from 'react';
import {
  Paper,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Card,
  SimpleGrid,
  Badge,
  List,
  ScrollArea,
  Table,
  Divider,
  Tooltip,
  Progress,
} from '@mantine/core';
import {
  IconChartBar,
  IconCheck,
  IconAlertTriangle,
  IconCopy,
  IconMountain,
  IconTargetArrow,
  IconTrendingUp,
  IconAlertCircle,
  IconInfoCircle,
  IconNumbers,
} from '@tabler/icons-react';
import type { SurveyPlan, PlanStatistics } from '@/types';
import {
  calculatePlanStatistics,
  formatAngle,
  ELEMENT_COLORS,
} from '@/utils/compass';

interface StatisticsPanelProps {
  plan: SurveyPlan | null;
}

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ plan }) => {
  const statistics = useMemo<PlanStatistics | null>(() => {
    if (!plan) return null;
    return calculatePlanStatistics(plan.measurements, plan.errorThreshold);
  }, [plan?.id, plan?.measurements, plan?.errorThreshold, plan?.magneticDeclination]);

  if (!plan || !statistics) {
    return (
      <Paper p="md" radius="md" withBorder shadow="sm">
        <Stack align="center" py="xl" style={{ color: 'var(--mantine-color-dimmed)' }}>
          <IconChartBar size={40} opacity={0.3} />
          <Text size="sm" ta="center" c="dimmed">
            请选择一个方案
            <br />
            查看统计分析
          </Text>
        </Stack>
      </Paper>
    );
  }

  const s = statistics;

  return (
    <Stack gap="md">
      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group justify="space-between" mb="md">
          <Group>
            <ThemeIcon size="md" radius="md" color="indigo" variant="filled">
              <IconChartBar size={18} />
            </ThemeIcon>
            <Text fw={600} size="lg">
              统计分析面板
            </Text>
          </Group>
          <Tooltip label="实时统计，数据随测量记录自动更新" withArrow>
            <ThemeIcon size="sm" color="gray" variant="light">
              <IconInfoCircle size={14} />
            </ThemeIcon>
          </Tooltip>
        </Group>

        <SimpleGrid cols={3} spacing="sm" mb="md">
          <Card p="sm" radius="md" withBorder bg="blue.0">
            <Group gap="xs" align="flex-start">
              <ThemeIcon size="sm" color="blue" radius="md">
                <IconNumbers size={14} />
              </ThemeIcon>
              <Stack gap={0} style={{ flex: 1 }}>
                <Text size="xs" c="dimmed">
                  测量总数
                </Text>
                <Text fw={700} size="xl" c="blue.7">
                  {s.totalCount}
                </Text>
              </Stack>
            </Group>
          </Card>

          <Card p="sm" radius="md" withBorder bg="green.0">
            <Group gap="xs" align="flex-start">
              <ThemeIcon size="sm" color="green" radius="md">
                <IconCheck size={14} />
              </ThemeIcon>
              <Stack gap={0} style={{ flex: 1 }}>
                <Text size="xs" c="dimmed">
                  合格数量
                </Text>
                <Text fw={700} size="xl" c="green.7">
                  {s.passCount}
                </Text>
              </Stack>
            </Group>
          </Card>

          <Card p="sm" radius="md" withBorder bg="red.0">
            <Group gap="xs" align="flex-start">
              <ThemeIcon size="sm" color="red" radius="md">
                <IconAlertTriangle size={14} />
              </ThemeIcon>
              <Stack gap={0} style={{ flex: 1 }}>
                <Text size="xs" c="dimmed">
                  超标数量
                </Text>
                <Text fw={700} size="xl" c="red.7">
                  {s.failCount}
                </Text>
              </Stack>
            </Group>
          </Card>
        </SimpleGrid>

        <SimpleGrid cols={3} spacing="sm" mb="md">
          <Card p="sm" radius="md" withBorder>
            <Group gap="xs" align="flex-start">
              <ThemeIcon size="sm" color="violet" radius="md" variant="light">
                <IconTrendingUp size={14} />
              </ThemeIcon>
              <Stack gap={0} style={{ flex: 1 }}>
                <Text size="xs" c="dimmed">
                  合格率
                </Text>
                <Group gap="xs">
                  <Text fw={700} size="xl" c={s.passRate >= 80 ? 'green' : s.passRate >= 60 ? 'orange' : 'red'}>
                    {s.passRate.toFixed(1)}%
                  </Text>
                </Group>
                <Progress
                  value={s.passRate}
                  color={s.passRate >= 80 ? 'green' : s.passRate >= 60 ? 'orange' : 'red'}
                  size="sm"
                  mt="xs"
                />
              </Stack>
            </Group>
          </Card>

          <Card p="sm" radius="md" withBorder>
            <Group gap="xs" align="flex-start">
              <ThemeIcon size="sm" color="yellow" radius="md" variant="light">
                <IconCopy size={14} />
              </ThemeIcon>
              <Stack gap={0} style={{ flex: 1 }}>
                <Text size="xs" c="dimmed">
                  重复记录
                </Text>
                <Group gap="xs">
                  <Text fw={700} size="xl" c={s.duplicateCount > 0 ? 'yellow.7' : 'dimmed'}>
                    {s.duplicateCount}
                  </Text>
                  {s.duplicateCount > 0 && (
                    <Badge size="xs" color="yellow" variant="filled">
                      注意
                    </Badge>
                  )}
                </Group>
                <Text size="xs" c="dimmed" mt="xs">
                  {s.duplicateCount > 0 ? '存在疑似重复，建议核对' : '无重复记录'}
                </Text>
              </Stack>
            </Group>
          </Card>

          <Card p="sm" radius="md" withBorder>
            <Group gap="xs" align="flex-start">
              <ThemeIcon size="sm" color="teal" radius="md" variant="light">
                <IconTargetArrow size={14} />
              </ThemeIcon>
              <Stack gap={0} style={{ flex: 1 }}>
                <Text size="xs" c="dimmed">
                  平均误差
                </Text>
                <Text fw={700} size="xl" c={s.averageError > plan.errorThreshold ? 'red' : 'green'}>
                  {s.averageError.toFixed(2)}°
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                  阈值: {plan.errorThreshold.toFixed(1)}°
                </Text>
              </Stack>
            </Group>
          </Card>
        </SimpleGrid>

        <Divider my="sm" />

        <SimpleGrid cols={2} spacing="sm">
          <Card p="sm" radius="md" withBorder>
            <Group mb="xs">
              <ThemeIcon size="sm" color="cyan" radius="md" variant="light">
                <IconMountain size={14} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                误差范围
              </Text>
            </Group>
            <SimpleGrid cols={2} spacing="xs">
              <div>
                <Text size="xs" c="dimmed">
                  最小误差
                </Text>
                <Text fw={600} c="green">
                  {s.minError.toFixed(2)}°
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  最大误差
                </Text>
                <Text fw={600} c="red">
                  {s.maxError.toFixed(2)}°
                </Text>
              </div>
            </SimpleGrid>
          </Card>

          <Card p="sm" radius="md" withBorder>
            <Group mb="xs">
              <ThemeIcon size="sm" color="violet" radius="md" variant="light">
                <IconMountain size={14} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                山向种类
              </Text>
            </Group>
            <Stack gap={0}>
              <Text fw={700} size="xl" c="violet.7">
                {s.mountainDistribution.length} 种
              </Text>
              <Text size="xs" c="dimmed">
                共涉及 {s.mountainDistribution.length} 个山向
              </Text>
            </Stack>
          </Card>
        </SimpleGrid>
      </Paper>

      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group justify="space-between" mb="sm">
          <Group>
            <ThemeIcon size="md" radius="md" color="violet" variant="light">
              <IconMountain size={18} />
            </ThemeIcon>
            <Text fw={600} size="md">
              山向分布
            </Text>
          </Group>
          <Badge size="sm" variant="light">
            共 {s.mountainDistribution.length} 种
          </Badge>
        </Group>

        {s.mountainDistribution.length > 0 ? (
          <ScrollArea h={180} type="auto">
            <Stack gap="xs">
              {s.mountainDistribution.map((m) => (
                <div key={m.name}>
                  <Group justify="space-between" mb={4}>
                    <Group gap={4}>
                      <Badge
                        size="sm"
                        variant="filled"
                        style={{ backgroundColor: ELEMENT_COLORS[m.element] }}
                      >
                        {m.name}山
                      </Badge>
                      <Text size="xs" c="dimmed">
                        {m.element}
                      </Text>
                    </Group>
                    <Group gap={8}>
                      <Text size="xs" fw={600}>
                        {m.count} 条
                      </Text>
                      <Text size="xs" c="dimmed">
                        {m.percentage.toFixed(1)}%
                      </Text>
                    </Group>
                  </Group>
                  <Progress
                    value={m.percentage}
                    color={ELEMENT_COLORS[m.element]}
                    size="sm"
                    radius="sm"
                  />
                </div>
              ))}
            </Stack>
          </ScrollArea>
        ) : (
          <Stack align="center" py="md">
            <Text size="sm" c="dimmed">
              暂无山向分布数据
            </Text>
          </Stack>
        )}
      </Paper>

      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group justify="space-between" mb="sm">
          <Group>
            <ThemeIcon size="md" radius="md" color="red" variant="light">
              <IconAlertCircle size={18} />
            </ThemeIcon>
            <Text fw={600} size="md">
              高风险记录
            </Text>
          </Group>
          <Badge size="sm" color={s.highRiskRecords.length > 0 ? 'red' : 'gray'} variant="filled">
            {s.highRiskRecords.length} 条
          </Badge>
        </Group>

        {s.highRiskRecords.length > 0 ? (
          <ScrollArea h={180} type="auto">
            <Table withTableBorder withColumnBorders>
              <thead>
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th>轴线</th>
                  <th>方位</th>
                  <th>山向</th>
                  <th>误差</th>
                </tr>
              </thead>
              <tbody>
                {s.highRiskRecords.map((rec, idx) => (
                  <tr key={rec.id} style={{ backgroundColor: 'rgba(254, 226, 226, 0.3)' }}>
                    <td>{idx + 1}</td>
                    <td>
                      <Badge size="xs" variant="light" color="blue">
                        {rec.axisLabel}
                      </Badge>
                    </td>
                    <td>{formatAngle(rec.correctedBearing, 1)}</td>
                    <td>
                      <Badge
                        size="xs"
                        variant="filled"
                        style={{ backgroundColor: ELEMENT_COLORS[rec.mountainElement] }}
                      >
                        {rec.mountainName}山
                      </Badge>
                    </td>
                    <td>
                      <Text fw={600} size="sm" c="red">
                        {rec.errorAmount.toFixed(2)}°
                      </Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </ScrollArea>
        ) : (
          <Stack align="center" py="md">
            <IconCheck size={24} color="green" />
            <Text size="sm" c="green">
              暂无高风险记录，测量质量良好
            </Text>
          </Stack>
        )}
      </Paper>
    </Stack>
  );
};
