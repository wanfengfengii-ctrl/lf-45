import React, { useState } from 'react';
import {
  Paper,
  Group,
  Stack,
  Text,
  Badge,
  Button,
  Select,
  NumberInput,
  TextInput,
  ActionIcon,
  Divider,
  Card,
  SimpleGrid,
  ThemeIcon,
  ScrollArea,
  Tooltip,
  Switch,
  Collapse,
  List,
} from '@mantine/core';
import {
  IconMap,
  IconPlus,
  IconTrash,
  IconAlertTriangle,
  IconAlertCircle,
  IconCheck,
  IconInfoCircle,
  IconRoad,
  IconDroplet,
  IconBuilding,
  IconDoor,
  IconChevronDown,
  IconChevronUp,
  IconShield,
  IconRefresh,
} from '@tabler/icons-react';
import type { EnvironmentElement, EnvironmentElementType, EnvironmentAnalysisResult, FengShuiRisk } from '@/types';
import {
  ENV_ELEMENT_COLORS,
  ENV_ELEMENT_LABELS,
  RISK_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
  formatAngle,
} from '@/utils/compass';

interface EnvironmentOverlayPanelProps {
  elements: EnvironmentElement[];
  showOverlay: boolean;
  analysis: EnvironmentAnalysisResult;
  onAddElement: (element: Omit<EnvironmentElement, 'id'>) => void;
  onRemoveElement: (id: string) => void;
  onClearElements: () => void;
  onToggleOverlay: () => void;
  onShowOverlayChange: (show: boolean) => void;
}

const ELEMENT_TYPE_OPTIONS = [
  { value: 'road', label: '道路' },
  { value: 'water', label: '水体' },
  { value: 'building', label: '建筑' },
  { value: 'entrance', label: '出入口' },
];

const DISTANCE_OPTIONS = [
  { value: 'near', label: '近（<50m）' },
  { value: 'medium', label: '中（50-200m）' },
  { value: 'far', label: '远（>200m）' },
];

const ELEMENT_ICONS: Record<EnvironmentElementType, React.ReactNode> = {
  road: <IconRoad size={14} />,
  water: <IconDroplet size={14} />,
  building: <IconBuilding size={14} />,
  entrance: <IconDoor size={14} />,
};

export const EnvironmentOverlayPanel: React.FC<EnvironmentOverlayPanelProps> = ({
  elements,
  showOverlay,
  analysis,
  onAddElement,
  onRemoveElement,
  onClearElements,
  onShowOverlayChange,
}) => {
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [newType, setNewType] = useState<EnvironmentElementType>('road');
  const [newLabel, setNewLabel] = useState('');
  const [newStartAngle, setNewStartAngle] = useState(0);
  const [newEndAngle, setNewEndAngle] = useState(15);
  const [newDistance, setNewDistance] = useState<'near' | 'medium' | 'far'>('medium');
  const [riskDetailOpen, setRiskDetailOpen] = useState(false);

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    onAddElement({
      type: newType,
      label: newLabel.trim(),
      startAngle: newStartAngle,
      endAngle: newEndAngle,
      distance: newDistance,
    });
    setNewLabel('');
    setNewStartAngle(0);
    setNewEndAngle(15);
    setNewDistance('medium');
  };

  const overallColor = RISK_LEVEL_COLORS[analysis.overallLevel];
  const overallLabel = RISK_LEVEL_LABELS[analysis.overallLevel];

  return (
    <Stack gap="md">
      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group justify="space-between" mb="md">
          <Group>
            <ThemeIcon size="md" radius="md" color="teal" variant="filled">
              <IconMap size={18} />
            </ThemeIcon>
            <Text fw={600} size="lg">
              环境叠加与敏感区分析
            </Text>
          </Group>
          <Group gap="xs">
            <Switch
              size="sm"
              label="叠加显示"
              checked={showOverlay}
              onChange={(e) => onShowOverlayChange(e.currentTarget.checked)}
            />
          </Group>
        </Group>

        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <Badge
              size="lg"
              variant="filled"
              style={{ backgroundColor: overallColor }}
            >
              {overallLabel}
            </Badge>
            <Text size="sm" c="dimmed">
              综合评估
            </Text>
          </Group>
          <Group gap={4}>
            {analysis.criticalCount > 0 && (
              <Badge size="sm" color="red" variant="filled">
                严重 {analysis.criticalCount}
              </Badge>
            )}
            {analysis.warningCount > 0 && (
              <Badge size="sm" color="yellow" variant="filled">
                警告 {analysis.warningCount}
              </Badge>
            )}
            {analysis.cautionCount > 0 && (
              <Badge size="sm" color="blue" variant="filled">
                注意 {analysis.cautionCount}
              </Badge>
            )}
          </Group>
        </Group>

        <Text size="sm" c="dimmed" lh={1.6}>
          {analysis.summary}
        </Text>

        {analysis.risks.length > 0 && (
          <>
            <Divider my="sm" />
            <Group justify="space-between">
              <Text fw={600} size="sm">
                风险详情
              </Text>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => setRiskDetailOpen(!riskDetailOpen)}
              >
                {riskDetailOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
              </ActionIcon>
            </Group>
            <Collapse in={riskDetailOpen}>
              <ScrollArea h={200} type="auto">
                <Stack gap="xs">
                  {analysis.risks.map((risk) => (
                    <RiskItem key={risk.id} risk={risk} />
                  ))}
                </Stack>
              </ScrollArea>
            </Collapse>
          </>
        )}

        {analysis.suggestions.length > 0 && (
          <>
            <Divider my="sm" />
            <Group mb="xs">
              <ThemeIcon size="sm" color="teal" radius="md" variant="light">
                <IconShield size={14} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                调整建议
              </Text>
            </Group>
            <ScrollArea h={120} type="auto">
              <List size="xs" spacing="xs" withPadding>
                {analysis.suggestions.map((s, i) => (
                  <List.Item key={i}>{s}</List.Item>
                ))}
              </List>
            </ScrollArea>
          </>
        )}
      </Paper>

      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group justify="space-between" mb="md">
          <Group>
            <ThemeIcon size="md" radius="md" color="orange" variant="light">
              <IconMap size={18} />
            </ThemeIcon>
            <Text fw={600} size="md">
              环境要素
            </Text>
          </Group>
          <Group gap="xs">
            <Badge size="sm" variant="light">
              {elements.length} 个
            </Badge>
            <Tooltip label="添加环境要素">
              <ActionIcon
                variant="light"
                color="teal"
                size="sm"
                onClick={() => setAddFormOpen(!addFormOpen)}
              >
                <IconPlus size={14} />
              </ActionIcon>
            </Tooltip>
            {elements.length > 0 && (
              <Tooltip label="清空所有要素">
                <ActionIcon
                  variant="light"
                  color="red"
                  size="sm"
                  onClick={onClearElements}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>

        <Collapse in={addFormOpen}>
          <Paper p="sm" radius="md" withBorder bg="gray.0" mb="sm">
            <Stack gap="xs">
              <SimpleGrid cols={2} spacing="xs">
                <Select
                  label="类型"
                  data={ELEMENT_TYPE_OPTIONS}
                  value={newType}
                  onChange={(v) => setNewType(v as EnvironmentElementType)}
                  size="xs"
                />
                <Select
                  label="距离"
                  data={DISTANCE_OPTIONS}
                  value={newDistance}
                  onChange={(v) => setNewDistance(v as 'near' | 'medium' | 'far')}
                  size="xs"
                />
              </SimpleGrid>
              <TextInput
                label="名称"
                placeholder="例如：主干道、河流、2号楼..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                size="xs"
              />
              <SimpleGrid cols={2} spacing="xs">
                <NumberInput
                  label="起始角度"
                  value={newStartAngle}
                  onChange={(v) => setNewStartAngle(Number(v) || 0)}
                  min={0}
                  max={360}
                  step={1}
                  suffix="°"
                  size="xs"
                />
                <NumberInput
                  label="结束角度"
                  value={newEndAngle}
                  onChange={(v) => setNewEndAngle(Number(v) || 0)}
                  min={0}
                  max={360}
                  step={1}
                  suffix="°"
                  size="xs"
                />
              </SimpleGrid>
              <Group justify="flex-end" gap="xs">
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() => setAddFormOpen(false)}
                >
                  取消
                </Button>
                <Button
                  size="xs"
                  leftSection={<IconPlus size={12} />}
                  onClick={handleAdd}
                  disabled={!newLabel.trim()}
                >
                  添加
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Collapse>

        {elements.length > 0 ? (
          <ScrollArea h={240} type="auto">
            <Stack gap="xs">
              {elements.map((el) => (
                <Card key={el.id} p="xs" radius="md" withBorder>
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="xs" wrap="nowrap">
                      <ThemeIcon
                        size="sm"
                        radius="md"
                        variant="light"
                        style={{ backgroundColor: ENV_ELEMENT_COLORS[el.type], color: '#fff' }}
                      >
                        {ELEMENT_ICONS[el.type]}
                      </ThemeIcon>
                      <Stack gap={0}>
                        <Group gap={4}>
                          <Text size="xs" fw={600}>
                            {el.label}
                          </Text>
                          <Badge
                            size="xs"
                            variant="filled"
                            style={{ backgroundColor: ENV_ELEMENT_COLORS[el.type] }}
                          >
                            {ENV_ELEMENT_LABELS[el.type]}
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {formatAngle(el.startAngle, 0)} ~ {formatAngle(el.endAngle, 0)}
                          {' · '}
                          {el.distance === 'near' ? '近' : el.distance === 'medium' ? '中' : '远'}
                        </Text>
                      </Stack>
                    </Group>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="xs"
                      onClick={() => onRemoveElement(el.id)}
                    >
                      <IconTrash size={12} />
                    </ActionIcon>
                  </Group>
                </Card>
              ))}
            </Stack>
          </ScrollArea>
        ) : (
          <Stack align="center" py="md">
            <IconMap size={32} opacity={0.3} />
            <Text size="xs" c="dimmed" ta="center">
              点击 + 添加道路、水体、建筑、出入口
              <br />
              叠加到罗盘上进行敏感区分析
            </Text>
          </Stack>
        )}
      </Paper>

      {elements.length > 0 && (
        <Paper p="md" radius="md" withBorder shadow="sm">
          <Group mb="sm">
            <ThemeIcon size="md" radius="md" color="violet" variant="light">
              <IconRefresh size={18} />
            </ThemeIcon>
            <Text fw={600} size="md">
              方位关系概览
            </Text>
          </Group>

          <SimpleGrid cols={4} spacing="xs" mb="sm">
            {(['road', 'water', 'building', 'entrance'] as EnvironmentElementType[]).map((type) => {
              const count = elements.filter((e) => e.type === type).length;
              return (
                <Card key={type} p="xs" radius="md" withBorder>
                  <Group gap={4}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: ENV_ELEMENT_COLORS[type],
                      }}
                    />
                    <Text size="xs" fw={500}>
                      {ENV_ELEMENT_LABELS[type]}
                    </Text>
                  </Group>
                  <Text fw={700} size="lg" mt={2}>
                    {count}
                  </Text>
                </Card>
              );
            })}
          </SimpleGrid>

          {analysis.risks.length > 0 && (
            <Stack gap="xs">
              {(['chong_sha', 'pian_xie', 'zhe_dang'] as const).map((riskType) => {
                const count = analysis.risks.filter((r) => r.type === riskType).length;
                if (count === 0) return null;
                const maxLevel = analysis.risks
                  .filter((r) => r.type === riskType)
                  .reduce((max, r) => {
                    const order = { critical: 3, warning: 2, caution: 1, safe: 0 };
                    return order[r.level] > order[max] ? r.level : max;
                  }, 'safe' as FengShuiRisk['level']);
                return (
                  <Group key={riskType} justify="space-between" wrap="nowrap">
                    <Group gap="xs">
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          backgroundColor: RISK_LEVEL_COLORS[maxLevel],
                        }}
                      />
                      <Text size="xs" fw={500}>
                        {RISK_TYPE_LABELS[riskType]}
                      </Text>
                    </Group>
                    <Badge
                      size="xs"
                      variant="filled"
                      style={{ backgroundColor: RISK_LEVEL_COLORS[maxLevel] }}
                    >
                      {count} 处
                    </Badge>
                  </Group>
                );
              })}
            </Stack>
          )}
        </Paper>
      )}
    </Stack>
  );
};

const RiskItem: React.FC<{ risk: FengShuiRisk }> = ({ risk }) => {
  const levelIcon = {
    critical: <IconAlertTriangle size={14} color={RISK_LEVEL_COLORS.critical} />,
    warning: <IconAlertCircle size={14} color={RISK_LEVEL_COLORS.warning} />,
    caution: <IconInfoCircle size={14} color={RISK_LEVEL_COLORS.caution} />,
    safe: <IconCheck size={14} color={RISK_LEVEL_COLORS.safe} />,
  };

  return (
    <Paper p="xs" radius="md" withBorder bg={`${risk.level === 'critical' ? 'red' : risk.level === 'warning' ? 'yellow' : 'blue'}.0`}>
      <Group gap="xs" wrap="nowrap">
        {levelIcon[risk.level]}
        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
          <Group gap={4}>
            <Text size="xs" fw={600}>
              {RISK_TYPE_LABELS[risk.type]}
            </Text>
            <Badge
              size="xs"
              variant="filled"
              style={{ backgroundColor: RISK_LEVEL_COLORS[risk.level] }}
            >
              {RISK_LEVEL_LABELS[risk.level]}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed" lineClamp={2}>
            {risk.description}
          </Text>
        </Stack>
      </Group>
    </Paper>
  );
};
