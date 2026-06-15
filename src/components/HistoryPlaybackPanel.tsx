import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Paper,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Badge,
  Divider,
  Button,
  ActionIcon,
  Tooltip,
  ScrollArea,
  SimpleGrid,
  Card,
  Chip,
  TextInput,
  Select,
  Table,
  Menu,
  Indicator,
  Modal,
  Slider,
  Progress,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconHistory,
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconPlayerTrackNext,
  IconPlayerTrackPrev,
  IconArrowsDiff,
  IconFilter,
  IconSearch,
  IconAlertTriangle,
  IconStar,
  IconFlag,
  IconTrash,
  IconDownload,
  IconClock,
  IconCalendar,
  IconInfoCircle,
  IconArrowRight,
  IconArrowLeft,
  IconMountain,
  IconCompass,
  IconCheck,
  IconX,
  IconRepeat,
  IconDots,
  IconListDetails,
  IconRuler,
  IconPencil,
  IconDeviceFloppy,
  IconSwitch,
  IconPlus,
  IconEdit,
  IconTrashX,
  IconBrush,
  IconRotateClockwise,
  IconEraser,
  IconUpload,
  IconPencilPlus,
  IconFolder,
} from '@tabler/icons-react';
import type {
  OperationRecord,
  OperationType,
  OperationSeverity,
  PlaybackState,
  HistoryFilter,
  OperationSnapshot,
  SurveyPlan,
} from '@/types';
import {
  formatAngle,
  formatTimestamp,
  ELEMENT_COLORS,
} from '@/utils/compass';
import {
  OPERATION_TYPE_LABELS,
  SEVERITY_COLORS,
  formatOperationDescription,
} from '@/utils/domain';

interface HistoryPlaybackPanelProps {
  records: OperationRecord[];
  filteredRecords: OperationRecord[];
  playback: PlaybackState;
  filter: HistoryFilter;
  statistics: {
    total: number;
    anomalies: number;
    keyNodes: number;
    warnings: number;
    errors: number;
    byType: Record<string, number>;
    byPlan: Record<string, { name: string; count: number }>;
  };
  plans: SurveyPlan[];
  onSetFilter: (filter: Partial<HistoryFilter>) => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onJumpToRecord: (index: number) => void;
  onJumpToFirst: () => void;
  onJumpToLast: () => void;
  onTogglePlayback: () => void;
  onGetRecordAtPlayback: () => OperationRecord | null;
  onSetPlayback: (playback: Partial<PlaybackState>) => void;
  onClearHistory: () => void;
  onDeleteRecord: (recordId: string) => void;
  onExportHistory: () => void;
  onSelectRecord?: (record: OperationRecord) => void;
  onApplySnapshot?: (snapshot: OperationSnapshot, silent?: boolean) => void;
}

const OPERATION_ICONS: Record<OperationType, React.ReactNode> = {
  rotation_change: <IconCompass size={14} />,
  declination_change: <IconMountain size={14} />,
  threshold_change: <IconRuler size={14} />,
  axis_draw: <IconPencil size={14} />,
  axis_save: <IconDeviceFloppy size={14} />,
  axis_cancel: <IconX size={14} />,
  plan_switch: <IconSwitch size={14} />,
  plan_create: <IconPlus size={14} />,
  plan_delete: <IconTrash size={14} />,
  plan_update: <IconEdit size={14} />,
  measurement_delete: <IconTrashX size={14} />,
  measurements_clear: <IconBrush size={14} />,
  compass_reset: <IconRotateClockwise size={14} />,
  axes_clear: <IconEraser size={14} />,
  batch_input: <IconUpload size={14} />,
  drawing_mode_toggle: <IconPencilPlus size={14} />,
};

export const HistoryPlaybackPanel: React.FC<HistoryPlaybackPanelProps> = ({
  records,
  filteredRecords,
  playback,
  filter,
  statistics,
  plans,
  onSetFilter,
  onStepForward,
  onStepBackward,
  onJumpToRecord,
  onJumpToFirst,
  onJumpToLast,
  onTogglePlayback,
  onGetRecordAtPlayback,
  onSetPlayback,
  onClearHistory,
  onDeleteRecord,
  onExportHistory,
  onSelectRecord,
  onApplySnapshot,
}) => {
  const [compareModalOpen, { open: openCompare, close: closeCompare }] = useDisclosure(false);
  const [detailModalOpen, { open: openDetail, close: closeDetail }] = useDisclosure(false);
  const [selectedCompareRecords, setSelectedCompareRecords] = useState<string[]>([]);
  const [detailRecord, setDetailRecord] = useState<OperationRecord | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const applySnapshotRef = useRef(onApplySnapshot);
  applySnapshotRef.current = onApplySnapshot;

  const getRecordRef = useRef(onGetRecordAtPlayback);
  getRecordRef.current = onGetRecordAtPlayback;

  const currentRecord = onGetRecordAtPlayback();
  const playbackProgress = filteredRecords.length > 0
    ? ((playback.currentIndex + 1) / filteredRecords.length) * 100
    : 0;

  useEffect(() => {
    if (playback.currentIndex >= 0) {
      const record = getRecordRef.current();
      if (record && applySnapshotRef.current) {
        applySnapshotRef.current(record.afterSnapshot, true);
      }
    }
  }, [playback.currentIndex]);

  const operationTypeOptions = useMemo(() => {
    return Object.entries(OPERATION_TYPE_LABELS).map(([value, label]) => ({
      value,
      label: `${label} (${statistics.byType[value] ?? 0})`,
    }));
  }, [statistics.byType]);

  const planOptions = useMemo(() => {
    const options = [{ value: 'all', label: '全部方案' }];
    plans.forEach((p) => {
      const count = statistics.byPlan[p.id]?.count ?? 0;
      options.push({ value: p.id, label: `${p.name} (${count})` });
    });
    return options;
  }, [plans, statistics.byPlan]);

  const severityOptions: { value: OperationSeverity; label: string }[] = [
    { value: 'info', label: `信息 (${statistics.total - statistics.warnings - statistics.errors})` },
    { value: 'warning', label: `警告 (${statistics.warnings})` },
    { value: 'error', label: `错误 (${statistics.errors})` },
  ];

  const toggleTypeFilter = (type: OperationType) => {
    const current = filter.types ?? [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onSetFilter({ types: updated.length > 0 ? updated : undefined });
  };

  const toggleSeverityFilter = (severity: OperationSeverity) => {
    const current = filter.severities ?? [];
    const updated = current.includes(severity)
      ? current.filter((s) => s !== severity)
      : [...current, severity];
    onSetFilter({ severities: updated.length > 0 ? updated : undefined });
  };

  const toggleCompareSelection = (recordId: string) => {
    setSelectedCompareRecords((prev) => {
      if (prev.includes(recordId)) {
        return prev.filter((id) => id !== recordId);
      }
      if (prev.length >= 2) {
        return [prev[1], recordId];
      }
      return [...prev, recordId];
    });
  };

  const handleOpenDetail = (record: OperationRecord) => {
    setDetailRecord(record);
    openDetail();
    onSelectRecord?.(record);
  };

  const handleApplySnapshot = (snapshot: OperationSnapshot) => {
    onApplySnapshot?.(snapshot);
    closeDetail();
  };

  const getCompareRecords = () => {
    return selectedCompareRecords
      .map((id) => records.find((r) => r.id === id))
      .filter((r): r is OperationRecord => r !== undefined);
  };

  const renderSnapshotDiff = (before: OperationSnapshot, after: OperationSnapshot) => {
    const changes: Array<{ field: string; before: string; after: string; changed: boolean }> = [];

    changes.push({
      field: '罗盘旋转',
      before: formatAngle(before.rotation, 1),
      after: formatAngle(after.rotation, 1),
      changed: before.rotation !== after.rotation,
    });

    changes.push({
      field: '磁偏角',
      before: `${before.magneticDeclination > 0 ? '+' : ''}${before.magneticDeclination.toFixed(1)}°`,
      after: `${after.magneticDeclination > 0 ? '+' : ''}${after.magneticDeclination.toFixed(1)}°`,
      changed: before.magneticDeclination !== after.magneticDeclination,
    });

    changes.push({
      field: '误差阈值',
      before: `${before.errorThreshold.toFixed(1)}°`,
      after: `${after.errorThreshold.toFixed(1)}°`,
      changed: before.errorThreshold !== after.errorThreshold,
    });

    changes.push({
      field: '绘制模式',
      before: before.isDrawingMode ? '开启' : '关闭',
      after: after.isDrawingMode ? '开启' : '关闭',
      changed: before.isDrawingMode !== after.isDrawingMode,
    });

    changes.push({
      field: '轴线条数',
      before: `${before.axes.length} 条`,
      after: `${after.axes.length} 条`,
      changed: before.axes.length !== after.axes.length,
    });

    changes.push({
      field: '测量记录',
      before: `${before.measurements.length} 条`,
      after: `${after.measurements.length} 条`,
      changed: before.measurements.length !== after.measurements.length,
    });

    return changes;
  };

  const speedOptions = [
    { value: 0.5, label: '0.5x' },
    { value: 1, label: '1x' },
    { value: 2, label: '2x' },
    { value: 4, label: '4x' },
  ];

  return (
    <Stack gap="lg">
      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group justify="space-between" mb="md">
          <Group>
            <ThemeIcon size="md" radius="md" color="grape" variant="filled">
              <IconHistory size={18} />
            </ThemeIcon>
            <Text fw={600} size="lg">
              历史回放与过程审计
            </Text>
            <Badge size="sm" variant="light">
              共 {statistics.total} 条操作
            </Badge>
          </Group>
          <Group>
            <Tooltip label="导出操作历史" withArrow>
              <ActionIcon
                variant="light"
                color="teal"
                size="md"
                onClick={onExportHistory}
                disabled={records.length === 0}
              >
                <IconDownload size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="选中2条记录进行对比" withArrow>
              <Button
                size="sm"
                variant="light"
                color="indigo"
                leftSection={<IconArrowsDiff size={16} />}
                onClick={openCompare}
                disabled={selectedCompareRecords.length !== 2}
              >
                节点对比 {selectedCompareRecords.length > 0 && `(${selectedCompareRecords.length}/2)`}
              </Button>
            </Tooltip>
            <Menu shadow="md" width={160}>
              <Menu.Target>
                <ActionIcon variant="light" color="gray" size="md">
                  <IconDots size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconTrash size={14} />}
                  color="red"
                  onClick={onClearHistory}
                  disabled={records.length === 0}
                >
                  清空全部历史
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>

        <SimpleGrid cols={4} spacing="sm" mb="md">
          <Card p="sm" radius="sm" withBorder bg="blue.0">
            <Group justify="space-between">
              <Stack gap={0}>
                <Text size="xs" c="dimmed">总操作数</Text>
                <Text fw={700} size="lg">{statistics.total}</Text>
              </Stack>
              <ThemeIcon size="md" color="blue" variant="light" radius="md">
                <IconListDetails size={16} />
              </ThemeIcon>
            </Group>
          </Card>
          <Card p="sm" radius="sm" withBorder bg="violet.0">
            <Group justify="space-between">
              <Stack gap={0}>
                <Text size="xs" c="dimmed">关键节点</Text>
                <Text fw={700} size="lg" c="violet.7">{statistics.keyNodes}</Text>
              </Stack>
              <ThemeIcon size="md" color="violet" variant="light" radius="md">
                <IconStar size={16} />
              </ThemeIcon>
            </Group>
          </Card>
          <Card p="sm" radius="sm" withBorder bg="orange.0">
            <Group justify="space-between">
              <Stack gap={0}>
                <Text size="xs" c="dimmed">异常操作</Text>
                <Text fw={700} size="lg" c="orange.7">{statistics.anomalies}</Text>
              </Stack>
              <ThemeIcon size="md" color="orange" variant="light" radius="md">
                <IconAlertTriangle size={16} />
              </ThemeIcon>
            </Group>
          </Card>
          <Card p="sm" radius="sm" withBorder bg="red.0">
            <Group justify="space-between">
              <Stack gap={0}>
                <Text size="xs" c="dimmed">警告/错误</Text>
                <Text fw={700} size="lg" c="red.7">{statistics.warnings + statistics.errors}</Text>
              </Stack>
              <ThemeIcon size="md" color="red" variant="light" radius="md">
                <IconFlag size={16} />
              </ThemeIcon>
            </Group>
          </Card>
        </SimpleGrid>

        <Divider mb="md" />

        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Group style={{ flex: 1 }}>
              <TextInput
                placeholder="搜索操作描述、异常原因..."
                leftSection={<IconSearch size={16} />}
                value={filter.keyword ?? ''}
                onChange={(e) => onSetFilter({ keyword: e.target.value })}
                style={{ flex: 1, maxWidth: 360 }}
                size="sm"
              />
              <Select
                placeholder="方案筛选"
                data={planOptions}
                value={filter.planId === undefined || filter.planId === null ? 'all' : filter.planId}
                onChange={(v) => onSetFilter({ planId: v === 'all' ? null : v })}
                size="sm"
                style={{ width: 200 }}
              />
              <Button
                size="sm"
                variant={showFilters ? 'filled' : 'light'}
                leftSection={<IconFilter size={16} />}
                onClick={() => setShowFilters((s) => !s)}
              >
                筛选器
              </Button>
            </Group>
            <Group>
              <Chip
                size="sm"
                checked={filter.onlyKeyNodes ?? false}
                onChange={(v) => onSetFilter({ onlyKeyNodes: v })}
                color="violet"
              >
                仅关键节点
              </Chip>
              <Chip
                size="sm"
                checked={filter.onlyAnomalies ?? false}
                onChange={(v) => onSetFilter({ onlyAnomalies: v })}
                color="orange"
              >
                仅异常操作
              </Chip>
            </Group>
          </Group>

          {showFilters && (
            <Paper p="sm" radius="md" bg="gray.0" withBorder>
              <Stack gap="sm">
                <Text size="sm" fw={500}>
                  操作类型筛选：
                </Text>
                <Group>
                  {operationTypeOptions.map((opt) => (
                    <Chip
                      key={opt.value}
                      size="xs"
                      checked={(filter.types ?? []).includes(opt.value as OperationType)}
                      onChange={() => toggleTypeFilter(opt.value as OperationType)}
                    >
                      {opt.label}
                    </Chip>
                  ))}
                </Group>
                <Text size="sm" fw={500} mt="xs">
                  严重程度筛选：
                </Text>
                <Group>
                  {severityOptions.map((opt) => (
                    <Chip
                      key={opt.value}
                      size="xs"
                      color={SEVERITY_COLORS[opt.value]}
                      checked={(filter.severities ?? []).includes(opt.value)}
                      onChange={() => toggleSeverityFilter(opt.value)}
                    >
                      {opt.label}
                    </Chip>
                  ))}
                </Group>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Paper>

      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group justify="space-between" mb="md">
          <Group>
            <ThemeIcon size="md" radius="md" color="cyan" variant="light">
              <IconPlayerPlay size={18} />
            </ThemeIcon>
            <Text fw={600}>回放控制</Text>
            {currentRecord && (
              <Badge size="sm" variant="light" color={SEVERITY_COLORS[currentRecord.severity]}>
                {OPERATION_TYPE_LABELS[currentRecord.type]}
              </Badge>
            )}
          </Group>
          <Group>
            <Text size="xs" c="dimmed">
              {playback.currentIndex >= 0
                ? `${playback.currentIndex + 1} / ${filteredRecords.length}`
                : `0 / ${filteredRecords.length}`}
            </Text>
          </Group>
        </Group>

        <Group justify="center" mb="md">
          <Tooltip label="跳至开始" withArrow>
            <ActionIcon variant="light" size="lg" onClick={onJumpToFirst} disabled={filteredRecords.length === 0}>
              <IconPlayerTrackPrev size={20} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="上一步" withArrow>
            <ActionIcon variant="light" size="lg" onClick={onStepBackward} disabled={filteredRecords.length === 0 || playback.currentIndex <= 0}>
              <IconPlayerSkipBack size={20} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={playback.isPlaying ? '暂停' : '播放'} withArrow>
            <ActionIcon
              variant="filled"
              color={playback.isPlaying ? 'red' : 'green'}
              size="xl"
              onClick={onTogglePlayback}
              disabled={filteredRecords.length === 0}
            >
              {playback.isPlaying ? <IconPlayerPause size={22} /> : <IconPlayerPlay size={22} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label="下一步" withArrow>
            <ActionIcon variant="light" size="lg" onClick={onStepForward} disabled={filteredRecords.length === 0}>
              <IconPlayerSkipForward size={20} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="跳至末尾" withArrow>
            <ActionIcon variant="light" size="lg" onClick={onJumpToLast} disabled={filteredRecords.length === 0}>
              <IconPlayerTrackNext size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Stack gap="sm" mb="md">
          <Slider
            value={playback.currentIndex < 0 ? 0 : playback.currentIndex}
            min={0}
            max={Math.max(0, filteredRecords.length - 1)}
            step={1}
            onChange={(v) => onJumpToRecord(v as number)}
            disabled={filteredRecords.length === 0}
            label={null}
            marks={
              filteredRecords.length > 0
                ? [
                    { value: 0, label: '开始' },
                    { value: Math.floor(filteredRecords.length / 2), label: '中间' },
                    { value: filteredRecords.length - 1, label: '结束' },
                  ]
                : undefined
            }
            styles={{ markLabel: { fontSize: 10 } }}
          />
          <Progress value={playbackProgress} size="sm" striped animated={playback.isPlaying} />
        </Stack>

        <SimpleGrid cols={3} spacing="sm">
          <div>
            <Text size="xs" c="dimmed" mb="xs">回放速度</Text>
            <Group gap="xs">
              {speedOptions.map((opt) => (
                <Chip
                  key={opt.value}
                  size="xs"
                  color="cyan"
                  checked={playback.speed === opt.value}
                  onChange={() => onSetPlayback({ speed: opt.value })}
                >
                  {opt.label}
                </Chip>
              ))}
            </Group>
          </div>
          <div>
            <Text size="xs" c="dimmed" mb="xs">回放选项</Text>
            <Group gap="sm">
              <Chip
                size="xs"
                color="blue"
                checked={playback.loop}
                onChange={(v) => onSetPlayback({ loop: v })}
                icon={<IconRepeat size={12} />}
              >
                循环播放
              </Chip>
              <Chip
                size="xs"
                color="indigo"
                checked={playback.showDiff}
                onChange={(v) => onSetPlayback({ showDiff: v })}
                icon={<IconArrowsDiff size={12} />}
              >
                显示差异
              </Chip>
            </Group>
          </div>
          <div>
            <Text size="xs" c="dimmed" mb="xs">选中对比</Text>
            <Text size="xs" c={selectedCompareRecords.length === 2 ? 'green' : 'dimmed'}>
              {selectedCompareRecords.length}/2 条记录已选
              {selectedCompareRecords.length === 2 && ' ✓'}
            </Text>
          </div>
        </SimpleGrid>

        {currentRecord && playback.showDiff && (
          <>
            <Divider my="md" />
            <Card p="sm" radius="md" withBorder bg="cyan.0">
              <Group justify="space-between" mb="sm">
                <Text fw={600} size="sm">当前快照差异</Text>
                <Group>
                  <Badge size="xs" variant="light">
                    <IconClock size={10} style={{ display: 'inline', marginRight: 4 }} />
                    {formatTimestamp(currentRecord.timestamp)}
                  </Badge>
                </Group>
              </Group>
              <Table withTableBorder>
                <thead>
                  <tr>
                    <th style={{ width: 120 }}>状态项</th>
                    <th>变更前</th>
                    <th>变更后</th>
                    <th style={{ width: 60 }}>变化</th>
                  </tr>
                </thead>
                <tbody>
                  {renderSnapshotDiff(currentRecord.beforeSnapshot, currentRecord.afterSnapshot).map((c, i) => (
                    <tr
                      key={i}
                      style={{ backgroundColor: c.changed ? 'rgba(255, 255, 200, 0.3)' : undefined }}
                    >
                      <td><Text fw={500} size="xs">{c.field}</Text></td>
                      <td>
                        <Group gap="xs">
                          {c.changed && <IconArrowLeft size={12} color="var(--mantine-color-red-6)" />}
                          <Text size="xs">{c.before}</Text>
                        </Group>
                      </td>
                      <td>
                        <Group gap="xs">
                          {c.changed && <IconArrowRight size={12} color="var(--mantine-color-green-6)" />}
                          <Text size="xs" fw={c.changed ? 600 : 400}>{c.after}</Text>
                        </Group>
                      </td>
                      <td>
                        {c.changed ? (
                          <Badge color="yellow" size="xs">变更</Badge>
                        ) : (
                          <Badge color="gray" size="xs" variant="outline">未变</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </>
        )}
      </Paper>

      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group justify="space-between" mb="md">
          <Group>
            <ThemeIcon size="md" radius="md" color="teal" variant="light">
              <IconClock size={18} />
            </ThemeIcon>
            <Text fw={600}>操作时间轴</Text>
            <Badge size="sm" variant="light">
              显示 {filteredRecords.length} / {statistics.total} 条
            </Badge>
          </Group>
          {selectedCompareRecords.length > 0 && (
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              onClick={() => setSelectedCompareRecords([])}
            >
              清除对比选择 ({selectedCompareRecords.length})
            </Button>
          )}
        </Group>

        {filteredRecords.length === 0 ? (
          <Stack align="center" py="xl" style={{ color: 'var(--mantine-color-dimmed)' }}>
            <IconHistory size={48} opacity={0.3} />
            <Text size="sm" ta="center" c="dimmed">
              暂无操作记录
              <br />
              开始使用罗盘测量后，操作将自动记录
            </Text>
          </Stack>
        ) : (
          <ScrollArea h={520} type="auto">
            <Stack gap={0}>
              {filteredRecords.map((record, index) => {
                const isSelected = selectedCompareRecords.includes(record.id);
                const isCurrentPlayback = playback.currentIndex === index;
                const isHighlighted = playback.highlightedRecordId === record.id;

                return (
                  <Card
                    key={record.id}
                    p="xs"
                    mb="xs"
                    radius="md"
                    withBorder
                    onClick={() => handleOpenDetail(record)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isCurrentPlayback
                        ? 'var(--mantine-color-cyan-0)'
                        : isHighlighted
                        ? 'var(--mantine-color-yellow-0)'
                        : isSelected
                        ? 'var(--mantine-color-indigo-0)'
                        : undefined,
                      borderColor: isCurrentPlayback
                        ? 'var(--mantine-color-cyan-5)'
                        : isSelected
                        ? 'var(--mantine-color-indigo-5)'
                        : undefined,
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                        <Stack align="center" gap={2} style={{ flexShrink: 0 }}>
                          <ThemeIcon
                            size="sm"
                            color={SEVERITY_COLORS[record.severity]}
                            variant={record.anomalyType ? 'filled' : 'light'}
                            radius="xl"
                          >
                            {OPERATION_ICONS[record.type]}
                          </ThemeIcon>
                          {record.isKeyNode && (
                            <Indicator color="violet" size={8} offset={4}>
                              <ThemeIcon size="xs" color="violet" variant="light" radius="xl">
                                <IconStar size={10} />
                              </ThemeIcon>
                            </Indicator>
                          )}
                        </Stack>

                        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                          <Group gap="xs" wrap="nowrap">
                            <Badge
                              size="xs"
                              color={SEVERITY_COLORS[record.severity]}
                              variant={record.anomalyType ? 'filled' : 'light'}
                            >
                              {OPERATION_TYPE_LABELS[record.type]}
                            </Badge>
                            {record.planName && (
                              <Badge size="xs" variant="outline" color="gray">
                                {record.planName}
                              </Badge>
                            )}
                            {record.isKeyNode && (
                              <Badge size="xs" color="violet" variant="light">
                                <IconStar size={10} style={{ display: 'inline', marginRight: 2 }} />
                                关键节点
                              </Badge>
                            )}
                            <Tooltip label="选中进行对比" withArrow>
                              <Badge
                                size="xs"
                                color={isSelected ? 'indigo' : 'gray'}
                                variant={isSelected ? 'filled' : 'outline'}
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCompareSelection(record.id);
                                }}
                              >
                                <IconArrowsDiff size={10} style={{ display: 'inline', marginRight: 2 }} />
                                {isSelected ? '已选' : '对比'}
                              </Badge>
                            </Tooltip>
                          </Group>
                          <Text size="sm" fw={500} lineClamp={1}>
                            {formatOperationDescription(record)}
                          </Text>
                          {record.anomalyReason && (
                            <Group gap="xs" mt={2}>
                              <ThemeIcon size="xs" color="orange" variant="light" radius="xl">
                                <IconAlertTriangle size={10} />
                              </ThemeIcon>
                              <Text size="xs" c="orange.7" fw={500}>
                                {record.anomalyReason}
                              </Text>
                            </Group>
                          )}
                        </Stack>
                      </Group>

                      <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
                        <Text size="xs" c="dimmed" fw={500}>
                          #{index + 1}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {formatTimestamp(record.timestamp).split(' ')[1]}
                        </Text>
                      </Stack>
                    </Group>
                  </Card>
                );
              })}
            </Stack>
          </ScrollArea>
        )}
      </Paper>

      <Modal
        opened={detailModalOpen}
        onClose={closeDetail}
        title="操作详情"
        size="lg"
        centered
      >
        {detailRecord && (
          <Stack gap="md">
            <Group justify="space-between">
              <Group>
                <ThemeIcon
                  size="lg"
                  color={SEVERITY_COLORS[detailRecord.severity]}
                  variant={detailRecord.anomalyType ? 'filled' : 'light'}
                  radius="md"
                >
                  {OPERATION_ICONS[detailRecord.type]}
                </ThemeIcon>
                <Stack gap={0}>
                  <Group>
                    <Text fw={600} size="lg">
                      {OPERATION_TYPE_LABELS[detailRecord.type]}
                    </Text>
                    <Badge color={SEVERITY_COLORS[detailRecord.severity]} variant="light">
                      {detailRecord.severity === 'info' ? '信息' : detailRecord.severity === 'warning' ? '警告' : detailRecord.severity === 'error' ? '错误' : '严重'}
                    </Badge>
                    {detailRecord.isKeyNode && (
                      <Badge color="violet" variant="light">
                        <IconStar size={12} style={{ display: 'inline', marginRight: 2 }} />
                        关键节点
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">
                    <IconCalendar size={12} style={{ display: 'inline', marginRight: 4 }} />
                    {formatTimestamp(detailRecord.timestamp)}
                    {detailRecord.planName && (
                      <>
                        {' · '}
                        <IconFolder size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {detailRecord.planName}
                      </>
                    )}
                  </Text>
                </Stack>
              </Group>
              <Group>
                <Tooltip label="应用变更后快照" withArrow>
                  <Button
                    size="sm"
                    variant="light"
                    color="teal"
                    leftSection={<IconCheck size={16} />}
                    onClick={() => handleApplySnapshot(detailRecord.afterSnapshot)}
                  >
                    恢复到此状态
                  </Button>
                </Tooltip>
                <Tooltip label="删除此记录" withArrow>
                  <ActionIcon
                    variant="light"
                    color="red"
                    size="md"
                    onClick={() => {
                      onDeleteRecord(detailRecord.id);
                      closeDetail();
                    }}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>

            <Divider />

            <Paper p="md" radius="md" bg="gray.0" withBorder>
              <Group mb="xs">
                <IconInfoCircle size={16} color="var(--mantine-color-blue-6)" />
                <Text fw={600} size="sm">操作说明</Text>
              </Group>
              <Text size="sm">
                {formatOperationDescription(detailRecord)}
              </Text>
            </Paper>

            {detailRecord.anomalyReason && (
              <Paper p="md" radius="md" bg="orange.0" withBorder>
                <Group mb="xs">
                  <IconAlertTriangle size={16} color="var(--mantine-color-orange-6)" />
                  <Text fw={600} size="sm" c="orange.7">
                    异常标记
                  </Text>
                  <Badge color="orange" variant="filled" size="xs">
                    {detailRecord.anomalyType}
                  </Badge>
                </Group>
                <Text size="sm">
                  {detailRecord.anomalyReason}
                </Text>
              </Paper>
            )}

            {playback.showDiff && (
              <Card p="md" radius="md" withBorder bg="cyan.0">
                <Group justify="space-between" mb="md">
                  <Text fw={600} size="sm">完整状态变更对比</Text>
                </Group>
                <Table withTableBorder>
                  <thead>
                    <tr>
                      <th style={{ width: 140 }}>状态项</th>
                      <th>操作前</th>
                      <th>操作后</th>
                      <th style={{ width: 80 }}>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderSnapshotDiff(
                      detailRecord.beforeSnapshot,
                      detailRecord.afterSnapshot
                    ).map((c, i) => (
                      <tr
                        key={i}
                        style={{
                          backgroundColor: c.changed ? 'rgba(255, 255, 200, 0.3)' : undefined,
                        }}
                      >
                        <td><Text fw={500} size="sm">{c.field}</Text></td>
                        <td><Text size="sm">{c.before}</Text></td>
                        <td><Text size="sm" fw={c.changed ? 600 : 400}>{c.after}</Text></td>
                        <td>
                          {c.changed ? (
                            <Badge color="yellow" size="sm">有变更</Badge>
                          ) : (
                            <Badge color="gray" size="sm" variant="outline">无变化</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            )}

            {detailRecord.afterSnapshot.measurements.length > 0 && (
              <Card p="md" radius="md" withBorder>
                <Group mb="sm">
                  <ThemeIcon size="sm" color="green" variant="light" radius="md">
                    <IconCheck size={14} />
                  </ThemeIcon>
                  <Text fw={600} size="sm">
                    当前方案测量记录 ({detailRecord.afterSnapshot.measurements.length} 条)
                  </Text>
                </Group>
                <ScrollArea h={200} type="auto">
                  <Table striped withTableBorder>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>轴线</th>
                        <th>校正方位</th>
                        <th>山向</th>
                        <th>误差</th>
                        <th>状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRecord.afterSnapshot.measurements.slice(0, 20).map((m, i) => (
                        <tr key={m.id}>
                          <td>{i + 1}</td>
                          <td>
                            <Badge size="xs" variant="light" color="blue">
                              {m.axisLabel}
                            </Badge>
                          </td>
                          <td>{formatAngle(m.correctedBearing, 1)}</td>
                          <td>
                            <Badge
                              size="xs"
                              variant="filled"
                              style={{ backgroundColor: ELEMENT_COLORS[m.mountainElement] }}
                            >
                              {m.mountainName}山
                            </Badge>
                          </td>
                          <td>
                            <Text
                              size="sm"
                              fw={500}
                              c={m.exceedsThreshold ? 'red' : 'green'}
                            >
                              {m.errorAmount.toFixed(2)}°
                            </Text>
                          </td>
                          <td>
                            {m.exceedsThreshold ? (
                              <Badge color="red" size="xs" variant="filled">超标</Badge>
                            ) : (
                              <Badge color="green" size="xs" variant="light">合格</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </ScrollArea>
              </Card>
            )}
          </Stack>
        )}
      </Modal>

      <Modal
        opened={compareModalOpen}
        onClose={closeCompare}
        title="关键节点对比分析"
        size="xl"
        centered
      >
        {(() => {
          const [r1, r2] = getCompareRecords();
          if (!r1 || !r2) return <Text c="dimmed">请选择两条记录进行对比</Text>;

          const diffs = [
            {
              field: '时间',
              v1: formatTimestamp(r1.timestamp),
              v2: formatTimestamp(r2.timestamp),
            },
            {
              field: '操作类型',
              v1: OPERATION_TYPE_LABELS[r1.type],
              v2: OPERATION_TYPE_LABELS[r2.type],
            },
            {
              field: '所属方案',
              v1: r1.planName ?? '-',
              v2: r2.planName ?? '-',
            },
            {
              field: '操作描述',
              v1: formatOperationDescription(r1),
              v2: formatOperationDescription(r2),
            },
            {
              field: '罗盘旋转',
              v1: formatAngle(r1.afterSnapshot.rotation, 1),
              v2: formatAngle(r2.afterSnapshot.rotation, 1),
            },
            {
              field: '磁偏角',
              v1: `${r1.afterSnapshot.magneticDeclination > 0 ? '+' : ''}${r1.afterSnapshot.magneticDeclination.toFixed(1)}°`,
              v2: `${r2.afterSnapshot.magneticDeclination > 0 ? '+' : ''}${r2.afterSnapshot.magneticDeclination.toFixed(1)}°`,
            },
            {
              field: '误差阈值',
              v1: `${r1.afterSnapshot.errorThreshold.toFixed(1)}°`,
              v2: `${r2.afterSnapshot.errorThreshold.toFixed(1)}°`,
            },
            {
              field: '轴线条数',
              v1: `${r1.afterSnapshot.axes.length} 条`,
              v2: `${r2.afterSnapshot.axes.length} 条`,
            },
            {
              field: '测量记录',
              v1: `${r1.afterSnapshot.measurements.length} 条`,
              v2: `${r2.afterSnapshot.measurements.length} 条`,
            },
            {
              field: '绘制模式',
              v1: r1.afterSnapshot.isDrawingMode ? '开启' : '关闭',
              v2: r2.afterSnapshot.isDrawingMode ? '开启' : '关闭',
            },
            {
              field: '严重程度',
              v1: r1.severity,
              v2: r2.severity,
            },
            {
              field: '关键节点',
              v1: r1.isKeyNode ? '是' : '否',
              v2: r2.isKeyNode ? '是' : '否',
            },
            {
              field: '异常原因',
              v1: r1.anomalyReason ?? '无',
              v2: r2.anomalyReason ?? '无',
            },
          ];

          return (
            <Stack gap="md">
              <SimpleGrid cols={2} spacing="md">
                <Card p="sm" radius="md" withBorder bg={SEVERITY_COLORS[r1.severity] + '.0'}>
                  <Group justify="space-between" mb="xs">
                    <Group>
                      <ThemeIcon
                        size="sm"
                        color={SEVERITY_COLORS[r1.severity]}
                        variant={r1.anomalyType ? 'filled' : 'light'}
                        radius="md"
                      >
                        {OPERATION_ICONS[r1.type]}
                      </ThemeIcon>
                      <Stack gap={0}>
                        <Text fw={600} size="sm">节点 A</Text>
                        <Text size="xs" c="dimmed">{formatTimestamp(r1.timestamp)}</Text>
                      </Stack>
                    </Group>
                    <Badge color={SEVERITY_COLORS[r1.severity]} size="xs">
                      {OPERATION_TYPE_LABELS[r1.type]}
                    </Badge>
                  </Group>
                  <Text size="sm" lineClamp={2}>
                    {formatOperationDescription(r1)}
                  </Text>
                </Card>
                <Card p="sm" radius="md" withBorder bg={SEVERITY_COLORS[r2.severity] + '.0'}>
                  <Group justify="space-between" mb="xs">
                    <Group>
                      <ThemeIcon
                        size="sm"
                        color={SEVERITY_COLORS[r2.severity]}
                        variant={r2.anomalyType ? 'filled' : 'light'}
                        radius="md"
                      >
                        {OPERATION_ICONS[r2.type]}
                      </ThemeIcon>
                      <Stack gap={0}>
                        <Text fw={600} size="sm">节点 B</Text>
                        <Text size="xs" c="dimmed">{formatTimestamp(r2.timestamp)}</Text>
                      </Stack>
                    </Group>
                    <Badge color={SEVERITY_COLORS[r2.severity]} size="xs">
                      {OPERATION_TYPE_LABELS[r2.type]}
                    </Badge>
                  </Group>
                  <Text size="sm" lineClamp={2}>
                    {formatOperationDescription(r2)}
                  </Text>
                </Card>
              </SimpleGrid>

              <Divider />

              <ScrollArea h={380} type="auto">
                <Table withTableBorder>
                  <thead>
                    <tr>
                      <th style={{ width: 140 }}>对比项</th>
                      <th>节点 A</th>
                      <th>节点 B</th>
                      <th style={{ width: 80 }}>差异</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffs.map((d, i) => {
                      const hasDiff = d.v1 !== d.v2;
                      return (
                        <tr
                          key={i}
                          style={{
                            backgroundColor: hasDiff ? 'rgba(254, 243, 199, 0.4)' : undefined,
                          }}
                        >
                          <td><Text fw={500} size="sm">{d.field}</Text></td>
                          <td><Text size="sm">{d.v1}</Text></td>
                          <td><Text size="sm" fw={hasDiff ? 600 : 400}>{d.v2}</Text></td>
                          <td>
                            {hasDiff ? (
                              <Badge color="yellow" size="sm">
                                <IconArrowRight size={10} style={{ display: 'inline', marginRight: 2 }} />
                                不同
                              </Badge>
                            ) : (
                              <Badge color="green" size="sm" variant="light">
                                <IconCheck size={10} style={{ display: 'inline', marginRight: 2 }} />
                                相同
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </ScrollArea>

              <Paper p="md" radius="md" bg="indigo.0" withBorder>
                <Group mb="xs">
                  <IconArrowsDiff size={16} color="var(--mantine-color-indigo-6)" />
                  <Text fw={600} size="sm">差异摘要</Text>
                </Group>
                <Text size="sm">
                  节点 A 与节点 B 之间共存在{' '}
                  <Text fw={700} c="indigo.7" component="span">
                    {diffs.filter((d) => d.v1 !== d.v2).length}
                  </Text>{' '}
                  项差异。
                  时间间隔：{' '}
                  <Text fw={700} component="span">
                    {((Math.abs(r2.timestamp - r1.timestamp)) / 1000).toFixed(1)} 秒
                  </Text>
                </Text>
              </Paper>
            </Stack>
          );
        })()}
      </Modal>
    </Stack>
  );
};
