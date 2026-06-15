import React, { useState } from 'react';
import {
  Paper,
  Group,
  Stack,
  Text,
  Button,
  Modal,
  TextInput,
  Textarea,
  Table,
  Badge,
  ActionIcon,
  Tooltip,
  ScrollArea,
  Menu,
  Divider,
  ThemeIcon,
  Card,
  SimpleGrid,
  Tabs,
  Indicator,
  Avatar,
  List,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconCopy,
  IconFileText,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconCalendar,
  IconFolderPlus,
  IconDownload,
  IconRefresh,
  IconCaretDown,
  IconDots,
  IconStack2,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { SurveyPlan, MeasurementRecord, PlanStatistics } from '@/types';
import {
  formatAngle,
  formatTimestamp,
  ELEMENT_COLORS,
  calculatePlanStatistics,
  findDuplicateMeasurements,
} from '@/utils/compass';

interface SurveyPlanManagerProps {
  plans: SurveyPlan[];
  activePlanId: string | null;
  onSetActive: (planId: string) => void;
  onCreate: (name: string, description: string) => void;
  onDelete: (planId: string) => void;
  onUpdate: (planId: string, updates: Partial<SurveyPlan>) => void;
  onRemoveMeasurement: (planId: string, recordId: string) => void;
  onClearMeasurements: (planId: string) => void;
  onDuplicate: (planId: string) => SurveyPlan | null;
}

export const SurveyPlanManager: React.FC<SurveyPlanManagerProps> = ({
  plans,
  activePlanId,
  onSetActive,
  onCreate,
  onDelete,
  onUpdate,
  onRemoveMeasurement,
  onClearMeasurements,
  onDuplicate,
}) => {
  const [createModalOpen, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [editModalOpen, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [compareModalOpen, { open: openCompare, close: closeCompare }] = useDisclosure(false);

  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDesc, setNewPlanDesc] = useState('');
  const [editingPlan, setEditingPlan] = useState<SurveyPlan | null>(null);

  const activePlan = plans.find((p) => p.id === activePlanId);

  const handleCreate = () => {
    if (!newPlanName.trim()) {
      notifications.show({
        title: '创建失败',
        message: '请输入方案名称',
        color: 'red',
        icon: <IconX size={18} />,
      });
      return;
    }
    onCreate(newPlanName.trim(), newPlanDesc.trim());
    notifications.show({
      title: '创建成功',
      message: `方案「${newPlanName}」已创建`,
      color: 'green',
      icon: <IconCheck size={18} />,
    });
    setNewPlanName('');
    setNewPlanDesc('');
    closeCreate();
  };

  const handleSaveEdit = () => {
    if (!editingPlan) return;
    if (!newPlanName.trim()) {
      notifications.show({
        title: '保存失败',
        message: '方案名称不能为空',
        color: 'red',
        icon: <IconX size={18} />,
      });
      return;
    }
    onUpdate(editingPlan.id, {
      name: newPlanName.trim(),
      description: newPlanDesc.trim(),
    });
    notifications.show({
      title: '保存成功',
      message: '方案信息已更新',
      color: 'green',
      icon: <IconCheck size={18} />,
    });
    closeEdit();
    setEditingPlan(null);
  };

  const openEditModal = (plan: SurveyPlan) => {
    setEditingPlan(plan);
    setNewPlanName(plan.name);
    setNewPlanDesc(plan.description);
    openEdit();
  };

  const handleDelete = (plan: SurveyPlan) => {
    if (plans.length <= 1) {
      notifications.show({
        title: '删除失败',
        message: '至少需要保留一个方案',
        color: 'red',
        icon: <IconAlertTriangle size={18} />,
      });
      return;
    }
    onDelete(plan.id);
    notifications.show({
      title: '删除成功',
      message: `方案「${plan.name}」已删除`,
      color: 'orange',
      icon: <IconTrash size={18} />,
    });
  };

  const handleDuplicatePlan = (plan: SurveyPlan) => {
    const newPlan = onDuplicate(plan.id);
    if (newPlan) {
      notifications.show({
        title: '复制成功',
        message: `已创建「${plan.name}」的副本，包含 ${newPlan.measurements.length} 条测量记录`,
        color: 'blue',
        icon: <IconCopy size={18} />,
      });
    } else {
      notifications.show({
        title: '复制失败',
        message: '无法找到源方案',
        color: 'red',
        icon: <IconX size={18} />,
      });
    }
  };

  const handleExportPlan = (plan: SurveyPlan) => {
    const dataStr = JSON.stringify(plan, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan.name}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notifications.show({
      title: '导出成功',
      message: `方案「${plan.name}」已导出`,
      color: 'teal',
      icon: <IconDownload size={18} />,
    });
  };

  const errorCount = (plan: SurveyPlan) =>
    plan.measurements.filter((m) => m.exceedsThreshold).length;

  const getPlanStats = (plan: SurveyPlan): PlanStatistics => {
    return calculatePlanStatistics(plan.measurements, plan.errorThreshold);
  };

  const renderMeasurementsTable = (measurements: MeasurementRecord[]) => {
    if (measurements.length === 0) {
      return (
        <Stack align="center" py="xl" style={{ color: 'var(--mantine-color-dimmed)' }}>
          <IconFileText size={40} opacity={0.3} />
          <Text size="sm" ta="center" c="dimmed">
            暂无测量记录
            <br />
            在罗盘上绘制轴线并保存测量
          </Text>
        </Stack>
      );
    }

    return (
      <ScrollArea h={360} type="auto">
        <Table striped highlightOnHover withTableBorder withColumnBorders className="text-sm">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>轴线</th>
              <th>罗盘读数</th>
              <th>校正方位</th>
              <th>山向</th>
              <th>误差</th>
              <th>时间</th>
              <th style={{ width: 60 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {measurements.map((rec, idx) => (
              <tr
                key={rec.id}
                style={{
                  backgroundColor: rec.exceedsThreshold
                    ? 'rgba(254, 226, 226, 0.5)'
                    : undefined,
                }}
              >
                <td>{idx + 1}</td>
                <td>
                  <Badge size="sm" variant="light" color="blue">
                    {rec.axisLabel}
                  </Badge>
                </td>
                <td>{formatAngle(rec.compassReading, 1)}</td>
                <td>
                  <Group gap={4}>
                    <Text fw={600}>{formatAngle(rec.correctedBearing, 1)}</Text>
                  </Group>
                </td>
                <td>
                  <Group gap={4}>
                    <Badge
                      size="sm"
                      variant="filled"
                      style={{ backgroundColor: ELEMENT_COLORS[rec.mountainElement] }}
                    >
                      {rec.mountainName}山
                    </Badge>
                  </Group>
                </td>
                <td>
                  <Group gap={4}>
                    {rec.exceedsThreshold ? (
                      <Indicator inline color="red" size={10} />
                    ) : (
                      <Indicator inline color="green" size={10} />
                    )}
                    <Text
                      fw={600}
                      c={rec.exceedsThreshold ? 'red' : 'green'}
                      size="sm"
                    >
                      {rec.errorAmount.toFixed(2)}°
                    </Text>
                    {rec.exceedsThreshold && (
                      <Tooltip label="误差超出阈值" withArrow>
                        <ThemeIcon size="xs" color="red" radius="xl" variant="filled">
                          <IconAlertTriangle size={10} />
                        </ThemeIcon>
                      </Tooltip>
                    )}
                  </Group>
                </td>
                <td>
                  <Text size="xs" c="dimmed" style={{ fontSize: 11 }}>
                    {formatTimestamp(rec.timestamp)}
                  </Text>
                </td>
                <td>
                  <Tooltip label="删除记录" withArrow>
                    <ActionIcon
                      size="sm"
                      color="red"
                      variant="subtle"
                      onClick={() => onRemoveMeasurement(activePlanId!, rec.id)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </ScrollArea>
    );
  };

  return (
    <Stack gap="lg">
      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group justify="space-between" mb="md">
          <Group>
            <ThemeIcon size="md" radius="md" color="violet" variant="filled">
              <IconStack2 size={18} />
            </ThemeIcon>
            <Text fw={600} size="lg">
              测量方案
            </Text>
            <Badge size="sm" variant="light">
              {plans.length} 个
            </Badge>
          </Group>
          <Group>
            <Button
              size="sm"
              variant="light"
              leftSection={<IconStack2 size={16} />}
              onClick={openCompare}
              disabled={plans.length < 2}
            >
              方案对比
            </Button>
            <Button
              size="sm"
              leftSection={<IconPlus size={16} />}
              onClick={openCreate}
            >
              新建方案
            </Button>
          </Group>
        </Group>

        <Tabs value={activePlanId} onChange={(v) => v && onSetActive(v)}>
          <Tabs.List style={{ flexWrap: 'wrap' }}>
            {plans.map((plan) => (
              <Tabs.Tab
                key={plan.id}
                value={plan.id}
                rightSection={
                  errorCount(plan) > 0 ? (
                    <Badge
                      size="xs"
                      color="red"
                      variant="filled"
                      circle
                      style={{ marginLeft: 6 }}
                    >
                      {errorCount(plan)}
                    </Badge>
                  ) : null
                }
              >
                <Group gap={6}>
                  {plan.isActive && (
                    <ThemeIcon size="xs" color="green" radius="xl" variant="filled">
                      <IconCheck size={10} />
                    </ThemeIcon>
                  )}
                  <Text size="sm" lineClamp={1} style={{ maxWidth: 120 }}>
                    {plan.name}
                  </Text>
                  <Badge size="xs" variant="outline" color="gray">
                    {plan.measurements.length}
                  </Badge>
                </Group>
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>

        {activePlan && (
          <>
            <Card mt="md" p="sm" radius="md" withBorder bg="gray.0">
              <Group justify="space-between">
                <Group>
                  <Stack gap={0}>
                    <Group>
                      <Text fw={600}>{activePlan.name}</Text>
                      <Badge
                        variant="light"
                        color={activePlan.measurements.length > 0 ? 'green' : 'gray'}
                        size="sm"
                      >
                        {activePlan.measurements.length} 条记录
                      </Badge>
                      {errorCount(activePlan) > 0 && (
                        <Badge color="red" variant="filled" size="sm">
                          {errorCount(activePlan)} 条超标
                        </Badge>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed">
                      {activePlan.description || '无描述'}
                    </Text>
                  </Stack>
                </Group>
                <Menu shadow="md" width={200}>
                  <Menu.Target>
                    <Button variant="subtle" size="sm" rightSection={<IconCaretDown size={14} />}>
                      <IconDots size={16} />
                    </Button>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconEdit size={14} />}
                      onClick={() => openEditModal(activePlan)}
                    >
                      编辑信息
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconCopy size={14} />}
                      onClick={() => handleDuplicatePlan(activePlan)}
                    >
                      复制方案
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconDownload size={14} />}
                      onClick={() => handleExportPlan(activePlan)}
                    >
                      导出 JSON
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      leftSection={<IconRefresh size={14} />}
                      color="orange"
                      onClick={() => onClearMeasurements(activePlan.id)}
                      disabled={activePlan.measurements.length === 0}
                    >
                      清空记录
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconTrash size={14} />}
                      color="red"
                      onClick={() => handleDelete(activePlan)}
                      disabled={plans.length <= 1}
                    >
                      删除方案
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>

              <Divider my="sm" />

              <SimpleGrid cols={4} spacing="sm">
                <Card p="sm" radius="sm" withBorder bg="blue.0">
                  <Text size="xs" c="dimmed">
                    磁偏角
                  </Text>
                  <Text fw={700}>
                    {activePlan.magneticDeclination > 0 ? '+' : ''}
                    {activePlan.magneticDeclination.toFixed(1)}°
                  </Text>
                </Card>
                <Card p="sm" radius="sm" withBorder bg="orange.0">
                  <Text size="xs" c="dimmed">
                    误差阈值
                  </Text>
                  <Text fw={700}>{activePlan.errorThreshold.toFixed(1)}°</Text>
                </Card>
                <Card p="sm" radius="sm" withBorder bg="green.0">
                  <Text size="xs" c="dimmed">
                    合格数
                  </Text>
                  <Text fw={700} c="green.7">
                    {activePlan.measurements.length - errorCount(activePlan)} 条
                  </Text>
                </Card>
                <Card p="sm" radius="sm" withBorder bg="red.0">
                  <Text size="xs" c="dimmed">
                    创建时间
                  </Text>
                  <Text fw={600} size="xs" style={{ lineHeight: 1.2 }}>
                    <IconCalendar size={10} style={{ display: 'inline' }} />
                    {formatTimestamp(activePlan.createdAt).split(' ')[0]}
                  </Text>
                </Card>
              </SimpleGrid>
            </Card>

            <Group justify="space-between" mt="md">
              <Text fw={600}>
                测量记录
                <Badge ml="sm" variant="light" color="gray">
                  共 {activePlan.measurements.length} 条
                </Badge>
              </Text>
              {activePlan.measurements.length > 0 && (
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => onClearMeasurements(activePlan.id)}
                >
                  清空全部
                </Button>
              )}
            </Group>

            {renderMeasurementsTable(activePlan.measurements)}
          </>
        )}
      </Paper>

      <Modal
        opened={createModalOpen}
        onClose={closeCreate}
        title="新建测量方案"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="方案名称"
            placeholder="例如：办公楼A座测量"
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
            withAsterisk
            maxLength={50}
          />
          <Textarea
            label="方案描述"
            placeholder="描述测量场景、位置、用途等信息"
            value={newPlanDesc}
            onChange={(e) => setNewPlanDesc(e.target.value)}
            rows={3}
            maxLength={200}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={closeCreate}>
              取消
            </Button>
            <Button onClick={handleCreate} leftSection={<IconFolderPlus size={16} />}>
              创建方案
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={editModalOpen}
        onClose={() => {
          closeEdit();
          setEditingPlan(null);
        }}
        title="编辑方案信息"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="方案名称"
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
            withAsterisk
            maxLength={50}
          />
          <Textarea
            label="方案描述"
            value={newPlanDesc}
            onChange={(e) => setNewPlanDesc(e.target.value)}
            rows={3}
            maxLength={200}
          />
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                closeEdit();
                setEditingPlan(null);
              }}
            >
              取消
            </Button>
            <Button onClick={handleSaveEdit}>保存修改</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={compareModalOpen}
        onClose={closeCompare}
        title="多方案横向对比"
        size="xl"
        centered
      >
        <ScrollArea h={520} type="auto">
          <Table striped withTableBorder withColumnBorders className="text-sm">
            <thead>
              <tr>
                <th style={{ width: 120 }}>对比指标</th>
                {plans.map((p) => (
                  <th key={p.id} style={{ minWidth: 140 }}>
                    <Badge
                      color={p.id === activePlanId ? 'green' : 'gray'}
                      variant={p.id === activePlanId ? 'filled' : 'light'}
                    >
                      {p.name}
                    </Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><Text fw={500}>磁偏角</Text></td>
                {plans.map((p) => (
                  <td key={p.id}>{p.magneticDeclination.toFixed(1)}°</td>
                ))}
              </tr>
              <tr>
                <td><Text fw={500}>误差阈值</Text></td>
                {plans.map((p) => (
                  <td key={p.id}>{p.errorThreshold.toFixed(1)}°</td>
                ))}
              </tr>
              <tr>
                <td><Text fw={500}>📊 测量总数</Text></td>
                {plans.map((p) => (
                  <td key={p.id}>
                    <Badge size="sm" variant="light" color="blue">
                      {p.measurements.length} 条
                    </Badge>
                  </td>
                ))}
              </tr>
              <tr>
                <td><Text fw={500}>✅ 合格数</Text></td>
                {plans.map((p) => (
                  <td key={p.id}>
                    <Text c="green" fw={600}>
                      {p.measurements.length - errorCount(p)}
                    </Text>
                  </td>
                ))}
              </tr>
              <tr>
                <td><Text fw={500}>⚠️ 超标数</Text></td>
                {plans.map((p) => (
                  <td key={p.id}>
                    <Text
                      c={errorCount(p) > 0 ? 'red' : 'dimmed'}
                      fw={600}
                    >
                      {errorCount(p)}
                    </Text>
                  </td>
                ))}
              </tr>
              <tr>
                <td><Text fw={500}>📈 合格率</Text></td>
                {plans.map((p) => {
                  const stats = getPlanStats(p);
                  return (
                    <td key={p.id}>
                      {stats.totalCount > 0 ? (
                        <Badge
                          color={stats.passRate >= 80 ? 'green' : stats.passRate >= 60 ? 'yellow' : 'red'}
                          variant="filled"
                          size="sm"
                        >
                          {stats.passRate.toFixed(1)}%
                        </Badge>
                      ) : (
                        <Text c="dimmed" size="xs">
                          —
                        </Text>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td><Text fw={500}>📋 重复记录</Text></td>
                {plans.map((p) => {
                  const stats = getPlanStats(p);
                  return (
                    <td key={p.id}>
                      {stats.duplicateCount > 0 ? (
                        <Badge size="sm" color="yellow" variant="filled">
                          {stats.duplicateCount} 条
                        </Badge>
                      ) : (
                        <Text c="green" size="sm" fw={500}>
                          无重复
                        </Text>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td><Text fw={500}>🎯 平均误差</Text></td>
                {plans.map((p) => {
                  const stats = getPlanStats(p);
                  return (
                    <td key={p.id}>
                      {stats.totalCount > 0 ? (
                        <Text fw={600} c={stats.averageError > p.errorThreshold ? 'red' : 'green'}>
                          {stats.averageError.toFixed(2)}°
                        </Text>
                      ) : (
                        <Text c="dimmed" size="xs">
                          —
                        </Text>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td><Text fw={500}>📉 最小误差</Text></td>
                {plans.map((p) => {
                  const stats = getPlanStats(p);
                  return (
                    <td key={p.id}>
                      {stats.totalCount > 0 ? (
                        <Text fw={600} c="green">
                          {stats.minError.toFixed(2)}°
                        </Text>
                      ) : (
                        <Text c="dimmed" size="xs">
                          —
                        </Text>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td><Text fw={500}>📈 最大误差</Text></td>
                {plans.map((p) => {
                  const stats = getPlanStats(p);
                  return (
                    <td key={p.id}>
                      {stats.totalCount > 0 ? (
                        <Text fw={600} c="red">
                          {stats.maxError.toFixed(2)}°
                        </Text>
                      ) : (
                        <Text c="dimmed" size="xs">
                          —
                        </Text>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td><Text fw={500}>⛰️ 山向种类</Text></td>
                {plans.map((p) => {
                  const stats = getPlanStats(p);
                  return (
                    <td key={p.id}>
                      {stats.totalCount > 0 ? (
                        <Badge size="sm" variant="light" color="violet">
                          {stats.mountainDistribution.length} 种
                        </Badge>
                      ) : (
                        <Text c="dimmed" size="xs">
                          —
                        </Text>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td><Text fw={500}>🏆 主导山向</Text></td>
                {plans.map((p) => {
                  const stats = getPlanStats(p);
                  const top = stats.mountainDistribution[0];
                  return (
                    <td key={p.id}>
                      {top ? (
                        <Group gap={4}>
                          <Badge
                            size="sm"
                            variant="filled"
                            style={{ backgroundColor: ELEMENT_COLORS[top.element] }}
                          >
                            {top.name}山
                          </Badge>
                          <Text size="xs" c="dimmed">
                            {top.percentage.toFixed(0)}%
                          </Text>
                        </Group>
                      ) : (
                        <Text c="dimmed" size="xs">
                          —
                        </Text>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td><Text fw={500}>📅 创建时间</Text></td>
                {plans.map((p) => (
                  <td key={p.id}>
                    <Text size="xs" c="dimmed">
                      {formatTimestamp(p.createdAt).split(' ')[0]}
                    </Text>
                  </td>
                ))}
              </tr>
            </tbody>
          </Table>
        </ScrollArea>
        <Divider my="md" />
        <Group justify="space-between" mb="sm">
          <Text size="sm" fw={500}>
            各方案山向分布统计
          </Text>
          <Badge size="sm" variant="light">
            共 {plans.length} 个方案
          </Badge>
        </Group>
        <ScrollArea h={180} type="auto">
          <SimpleGrid cols={Math.min(plans.length, 4)} spacing="sm">
            {plans.map((plan) => {
              const stats = getPlanStats(plan);
              return (
                <Card key={plan.id} p="sm" radius="md" withBorder bg="gray.0">
                  <Group justify="space-between" mb="xs">
                    <Text fw={600} size="sm" lineClamp={1}>
                      {plan.name}
                    </Text>
                    <Badge size="xs" variant="light">
                      {stats.totalCount} 条
                    </Badge>
                  </Group>
                  {stats.mountainDistribution.length > 0 ? (
                    <Stack gap={4}>
                      {stats.mountainDistribution.slice(0, 5).map((m) => (
                        <div key={m.name}>
                          <Group justify="space-between" mb={2}>
                            <Badge
                              size="xs"
                              variant="filled"
                              style={{ backgroundColor: ELEMENT_COLORS[m.element] }}
                            >
                              {m.name}山
                            </Badge>
                            <Text size="xs" fw={500}>
                              {m.count} ({m.percentage.toFixed(0)}%)
                            </Text>
                          </Group>
                        </div>
                      ))}
                      {stats.mountainDistribution.length > 5 && (
                        <Text size="xs" c="dimmed" ta="center">
                          ... 还有 {stats.mountainDistribution.length - 5} 种
                        </Text>
                      )}
                    </Stack>
                  ) : (
                    <Text size="xs" c="dimmed" ta="center" py="sm">
                      暂无数据
                    </Text>
                  )}
                </Card>
              );
            })}
          </SimpleGrid>
        </ScrollArea>
      </Modal>
    </Stack>
  );
};
