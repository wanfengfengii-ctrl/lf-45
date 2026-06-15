import React, { useMemo } from 'react';
import {
  Modal,
  Stack,
  Text,
  Group,
  Paper,
  ThemeIcon,
  Card,
  SimpleGrid,
  Badge,
  List,
  ScrollArea,
  Table,
  Divider,
  Button,
  Tabs,
  Progress,
  Alert,
} from '@mantine/core';
import {
  IconFileText,
  IconDownload,
  IconChartBar,
  IconCheck,
  IconAlertTriangle,
  IconMountain,
  IconBulb,
  IconAlertCircle,
  IconCopy,
  IconClock,
  IconTargetArrow,
  IconCircleCheck,
  IconReport,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { SurveyPlan, AnalysisReportData } from '@/types';
import {
  generateAnalysisReport,
  exportReportAsText,
  downloadTextFile,
  formatAngle,
  formatTimestamp,
  ELEMENT_COLORS,
} from '@/utils/compass';

interface AnalysisReportModalProps {
  opened: boolean;
  onClose: () => void;
  plan: SurveyPlan | null;
}

export const AnalysisReportModal: React.FC<AnalysisReportModalProps> = ({
  opened,
  onClose,
  plan,
}) => {
  const report = useMemo<AnalysisReportData | null>(() => {
    if (!plan) return null;
    return generateAnalysisReport(plan);
  }, [plan]);

  const handleExportText = () => {
    if (!report) return;
    const text = exportReportAsText(report);
    const filename = `${report.planName}-分析报告-${Date.now()}.txt`;
    downloadTextFile(text, filename);
    notifications.show({
      title: '导出成功',
      message: '分析报告已导出为文本文件',
      color: 'green',
      icon: <IconDownload size={18} />,
    });
  };

  const handleExportJson = () => {
    if (!report) return;
    const json = JSON.stringify(report, null, 2);
    const filename = `${report.planName}-分析报告-${Date.now()}.json`;
    downloadTextFile(json, filename);
    notifications.show({
      title: '导出成功',
      message: '分析报告已导出为 JSON 格式',
      color: 'green',
      icon: <IconDownload size={18} />,
    });
  };

  if (!report) {
    return null;
  }

  const s = report.statistics;
  const qualityLevel = s.passRate >= 90 ? '优秀' : s.passRate >= 70 ? '良好' : s.passRate >= 50 ? '一般' : '较差';
  const qualityColor = s.passRate >= 90 ? 'green' : s.passRate >= 70 ? 'blue' : s.passRate >= 50 ? 'yellow' : 'red';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="智能分析报告"
      size="xl"
      centered
    >
      <Stack gap="md">
        <Paper p="md" radius="md" withBorder bg="gradient.0" style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #faf5ff 50%, #fef3c7 100%)'
        }}>
          <Group justify="space-between">
            <Group>
              <ThemeIcon size="lg" radius="md" color="indigo" variant="filled">
                <IconReport size={24} />
              </ThemeIcon>
              <Stack gap={0}>
                <Text fw={700} size="xl">
                  {report.planName}
                </Text>
                <Text size="xs" c="dimmed">
                  {report.planDescription || '无描述'}
                </Text>
              </Stack>
            </Group>
            <Stack align="flex-end" gap={4}>
              <Badge size="lg" color={qualityColor} variant="filled">
                {qualityLevel}
              </Badge>
              <Text size="xs" c="dimmed">
                <IconClock size={12} style={{ display: 'inline', marginRight: 2 }} />
                {formatTimestamp(report.generatedAt)}
              </Text>
            </Stack>
          </Group>
        </Paper>

        <Tabs defaultValue="overview">
          <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<IconChartBar size={16} />}>
              统计概览
            </Tabs.Tab>
            <Tabs.Tab value="mountains" leftSection={<IconMountain size={16} />}>
              山向分布
            </Tabs.Tab>
            <Tabs.Tab value="risks" leftSection={<IconAlertCircle size={16} />}>
              高风险记录
            </Tabs.Tab>
            <Tabs.Tab value="recommendations" leftSection={<IconBulb size={16} />}>
              分析建议
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="md">
            <SimpleGrid cols={3} spacing="sm" mb="md">
              <Card p="sm" radius="md" withBorder bg="blue.0">
                <Group gap="xs" align="flex-start">
                  <ThemeIcon size="sm" color="blue" radius="md">
                    <IconChartBar size={14} />
                  </ThemeIcon>
                  <Stack gap={0} style={{ flex: 1 }}>
                    <Text size="xs" c="dimmed">
                      测量总数
                    </Text>
                    <Text fw={700} size="xl" c="blue.7">
                      {s.totalCount} 条
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
                      {s.passCount} 条
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
                      {s.failCount} 条
                    </Text>
                  </Stack>
                </Group>
              </Card>
            </SimpleGrid>

            <SimpleGrid cols={3} spacing="sm" mb="md">
              <Card p="sm" radius="md" withBorder>
                <Stack gap={0}>
                  <Text size="xs" c="dimmed">
                    合格率
                  </Text>
                  <Group gap="xs" align="flex-end">
                    <Text fw={700} size="xl" c={qualityColor}>
                      {s.passRate.toFixed(1)}%
                    </Text>
                    <Badge size="sm" color={qualityColor} variant="light">
                      {qualityLevel}
                    </Badge>
                  </Group>
                  <Progress
                    value={s.passRate}
                    color={qualityColor}
                    size="md"
                    mt="sm"
                  />
                </Stack>
              </Card>

              <Card p="sm" radius="md" withBorder>
                <Stack gap={0}>
                  <Text size="xs" c="dimmed">
                    重复记录
                  </Text>
                  <Group gap="xs" align="flex-end">
                    <Text fw={700} size="xl" c={s.duplicateCount > 0 ? 'yellow.7' : 'dimmed'}>
                      {s.duplicateCount} 条
                    </Text>
                    {s.duplicateCount > 0 && (
                      <Badge size="sm" color="yellow" variant="light">
                        需核对
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed" mt="sm">
                    {s.duplicateCount > 0 ? '存在疑似重复记录' : '无重复记录'}
                  </Text>
                </Stack>
              </Card>

              <Card p="sm" radius="md" withBorder>
                <Stack gap={0}>
                  <Text size="xs" c="dimmed">
                    平均误差
                  </Text>
                  <Group gap="xs" align="flex-end">
                    <Text
                      fw={700}
                      size="xl"
                      c={s.averageError > (plan?.errorThreshold || 5) ? 'red' : 'green'}
                    >
                      {s.averageError.toFixed(2)}°
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed" mt="sm">
                    误差阈值: {report.errorThreshold.toFixed(1)}°
                  </Text>
                </Stack>
              </Card>
            </SimpleGrid>

            <SimpleGrid cols={3} spacing="sm">
              <Card p="sm" radius="md" withBorder>
                <Text size="xs" c="dimmed" mb="xs">
                  误差范围
                </Text>
                <SimpleGrid cols={2} spacing="xs">
                  <div>
                    <Text size="xs" c="dimmed">
                      最小
                    </Text>
                    <Text fw={600} c="green" size="sm">
                      {s.minError.toFixed(2)}°
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      最大
                    </Text>
                    <Text fw={600} c="red" size="sm">
                      {s.maxError.toFixed(2)}°
                    </Text>
                  </div>
                </SimpleGrid>
              </Card>

              <Card p="sm" radius="md" withBorder>
                <Text size="xs" c="dimmed" mb="xs">
                  磁偏角
                </Text>
                <Text fw={600} size="sm">
                  {report.magneticDeclination > 0 ? '+' : ''}
                  {report.magneticDeclination.toFixed(1)}°
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  {report.magneticDeclination === 0
                    ? '未设置磁偏角'
                    : report.magneticDeclination > 0
                    ? '东偏'
                    : '西偏'}
                </Text>
              </Card>

              <Card p="sm" radius="md" withBorder>
                <Text size="xs" c="dimmed" mb="xs">
                  山向种类
                </Text>
                <Text fw={600} size="sm">
                  {s.mountainDistribution.length} 种
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  涉及 {s.mountainDistribution.length} 个山向
                </Text>
              </Card>
            </SimpleGrid>

            <Divider my="md" />

            <Alert
              icon={<IconFileText size={18} />}
              title="分析摘要"
              color="blue"
            >
              <Text size="sm" lh={1.8}>
                {report.summary}
              </Text>
            </Alert>
          </Tabs.Panel>

          <Tabs.Panel value="mountains" pt="md">
            <Text fw={600} size="sm" mb="sm">
              山向分布统计
            </Text>
            {s.mountainDistribution.length > 0 ? (
              <ScrollArea h={400} type="auto">
                <Stack gap="sm">
                  {s.mountainDistribution.map((m, idx) => (
                    <Card key={m.name} p="sm" radius="md" withBorder>
                      <Group justify="space-between" mb="xs">
                        <Group gap="sm">
                          <Badge
                            size="lg"
                            variant="filled"
                            style={{ backgroundColor: ELEMENT_COLORS[m.element] }}
                          >
                            {m.name}山
                          </Badge>
                          <Badge size="sm" variant="light" color="gray">
                            {m.element}
                          </Badge>
                          <Text size="xs" c="dimmed">
                            第 {idx + 1} 位
                          </Text>
                        </Group>
                        <Group gap="md">
                          <Text fw={600}>
                            {m.count} 条
                          </Text>
                          <Badge size="sm" variant="light">
                            {m.percentage.toFixed(1)}%
                          </Badge>
                        </Group>
                      </Group>
                      <Progress
                        value={m.percentage}
                        color={ELEMENT_COLORS[m.element]}
                        size="md"
                        radius="md"
                      />
                    </Card>
                  ))}
                </Stack>
              </ScrollArea>
            ) : (
              <Stack align="center" py="xl">
                <Text size="sm" c="dimmed">
                  暂无山向分布数据
                </Text>
              </Stack>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="risks" pt="md">
            <Group justify="space-between" mb="sm">
              <Text fw={600} size="sm">
                高风险记录（按误差降序）
              </Text>
              <Badge size="sm" color={s.highRiskRecords.length > 0 ? 'red' : 'gray'}>
                {s.highRiskRecords.length} 条
              </Badge>
            </Group>

            {s.highRiskRecords.length > 0 ? (
              <ScrollArea h={400} type="auto">
                <Table striped withTableBorder withColumnBorders>
                  <thead>
                    <tr>
                      <th style={{ width: 30 }}>#</th>
                      <th>轴线标签</th>
                      <th>罗盘读数</th>
                      <th>校正方位</th>
                      <th>山向</th>
                      <th>误差</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.highRiskRecords.map((rec, idx) => (
                      <tr key={rec.id} style={{ backgroundColor: 'rgba(254, 226, 226, 0.4)' }}>
                        <td>{idx + 1}</td>
                        <td>
                          <Badge size="sm" variant="light" color="blue">
                            {rec.axisLabel}
                          </Badge>
                        </td>
                        <td>{formatAngle(rec.compassReading, 1)}</td>
                        <td>
                          <Text fw={600} size="sm">
                            {formatAngle(rec.correctedBearing, 1)}
                          </Text>
                        </td>
                        <td>
                          <Badge
                            size="sm"
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
                        <td>
                          <Badge size="sm" color="red" variant="filled">
                            超标
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </ScrollArea>
            ) : (
              <Stack align="center" py="xl" gap="sm">
                <ThemeIcon size="xl" radius="xl" color="green" variant="light">
                  <IconCircleCheck size={32} />
                </ThemeIcon>
                <Text fw={600} c="green">
                  暂无高风险记录
                </Text>
                <Text size="sm" c="dimmed">
                  所有测量记录均在误差阈值内，测量质量良好
                </Text>
              </Stack>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="recommendations" pt="md">
            <Text fw={600} size="sm" mb="sm">
              智能分析建议
            </Text>
            <Stack gap="sm">
              {report.recommendations.map((rec, idx) => (
                <Paper key={idx} p="sm" radius="md" withBorder bg="violet.0">
                  <Group gap="sm" align="flex-start">
                    <ThemeIcon size="sm" color="violet" radius="md">
                      <IconBulb size={14} />
                    </ThemeIcon>
                    <Text size="sm" style={{ flex: 1 }}>
                      {rec}
                    </Text>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Tabs.Panel>
        </Tabs>

        <Divider my="xs" />

        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            报告生成时间：{formatTimestamp(report.generatedAt)}
          </Text>
          <Group gap="xs">
            <Button
              variant="light"
              size="sm"
              leftSection={<IconDownload size={14} />}
              onClick={handleExportJson}
            >
              导出 JSON
            </Button>
            <Button
              size="sm"
              leftSection={<IconFileText size={14} />}
              onClick={handleExportText}
            >
              导出报告
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
};
