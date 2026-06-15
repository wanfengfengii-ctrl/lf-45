import React, { useState, useMemo } from 'react';
import {
  Modal,
  Stack,
  Text,
  Textarea,
  Button,
  Group,
  Badge,
  Table,
  ScrollArea,
  Paper,
  ThemeIcon,
  Alert,
  List,
  SimpleGrid,
  Card,
  Divider,
  Tooltip,
} from '@mantine/core';
import {
  IconListDetails,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconUpload,
  IconInfoCircle,
  IconMountain,
  IconCompass,
  IconTargetArrow,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { BatchInputItem, BearingResult } from '@/types';
import {
  parseBatchInput,
  calculateBearingResult,
  formatAngle,
  ELEMENT_COLORS,
} from '@/utils/compass';

interface BatchInputModalProps {
  opened: boolean;
  onClose: () => void;
  rotation: number;
  magneticDeclination: number;
  errorThreshold: number;
  onSubmit: (items: { label: string; result: BearingResult }[]) => void;
}

export const BatchInputModal: React.FC<BatchInputModalProps> = ({
  opened,
  onClose,
  rotation,
  magneticDeclination,
  errorThreshold,
  onSubmit,
}) => {
  const [inputText, setInputText] = useState('');

  const parsed = useMemo(() => {
    if (!inputText.trim()) {
      return { items: [], errors: [], results: [] as { label: string; result: BearingResult }[] };
    }
    const { items, errors } = parseBatchInput(inputText);
    const results = items.map((item) => ({
      label: item.label,
      result: calculateBearingResult(
        item.compassReading + rotation,
        rotation,
        magneticDeclination,
        errorThreshold
      ),
    }));
    return { items, errors, results };
  }, [inputText, rotation, magneticDeclination, errorThreshold]);

  const handleSubmit = () => {
    if (parsed.results.length === 0) {
      notifications.show({
        title: '提交失败',
        message: '请输入至少一条有效的轴线数据',
        color: 'red',
        icon: <IconX size={18} />,
      });
      return;
    }

    if (parsed.errors.length > 0) {
      notifications.show({
        title: '存在格式错误',
        message: `共 ${parsed.errors.length} 条错误，请修正后再提交`,
        color: 'orange',
        icon: <IconAlertTriangle size={18} />,
      });
      return;
    }

    onSubmit(parsed.results);
    setInputText('');
    onClose();

    notifications.show({
      title: '批量录入成功',
      message: `已成功录入 ${parsed.results.length} 条测量记录`,
      color: 'green',
      icon: <IconCheck size={18} />,
    });
  };

  const handleClose = () => {
    setInputText('');
    onClose();
  };

  const exceedCount = parsed.results.filter((r) => r.result.exceedsThreshold).length;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="批量录入轴线数据"
      size="xl"
      centered
    >
      <Stack gap="md">
        <Paper p="sm" radius="md" withBorder bg="blue.0">
          <Group gap="xs" mb="xs">
            <ThemeIcon size="sm" color="blue" radius="md">
              <IconInfoCircle size={14} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              录入格式说明
            </Text>
          </Group>
          <Text size="xs" c="dimmed" lh={1.6}>
            每行一条记录，格式为「<b>标签,角度</b>」或「<b>标签 角度</b>」，角度范围 0°~360°。
            <br />
            示例：
            <br />
            主轴线, 180.5
            <br />
            东墙 90
            <br />
            南门,270.3
          </Text>
        </Paper>

        <div>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={500}>
              批量输入
            </Text>
            <Group gap="xs">
              <Badge size="sm" variant="light" color="green">
                有效 {parsed.results.length} 条
              </Badge>
              {parsed.errors.length > 0 && (
                <Badge size="sm" variant="light" color="red">
                  错误 {parsed.errors.length} 条
                </Badge>
              )}
              {exceedCount > 0 && (
                <Badge size="sm" variant="light" color="orange">
                  超标 {exceedCount} 条
                </Badge>
              )}
            </Group>
          </Group>
          <Textarea
            placeholder="主轴线, 180.5&#10;东墙 90&#10;南门,270.3"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            minRows={6}
            maxRows={10}
            autosize
          />
        </div>

        {parsed.errors.length > 0 && (
          <Alert
            icon={<IconAlertTriangle size={16} />}
            title="格式错误"
            color="red"
            p="sm"
          >
            <List size="xs" spacing={2}>
              {parsed.errors.slice(0, 5).map((err, i) => (
                <List.Item key={i}>{err}</List.Item>
              ))}
              {parsed.errors.length > 5 && (
                <List.Item>... 还有 {parsed.errors.length - 5} 条错误</List.Item>
              )}
            </List>
          </Alert>
        )}

        {parsed.results.length > 0 && (
          <>
            <Divider my="xs" />

            <Group justify="space-between">
              <Text size="sm" fw={500}>
                预览结果
              </Text>
              <Tooltip label="系统将自动计算真实方位、磁偏角校正、山向归属和误差范围" withArrow>
                <ThemeIcon size="sm" color="gray" variant="light">
                  <IconInfoCircle size={14} />
                </ThemeIcon>
              </Tooltip>
            </Group>

            <ScrollArea h={220} type="auto">
              <Table striped highlightOnHover withTableBorder withColumnBorders>
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
                  {parsed.results.map((item, idx) => (
                    <tr
                      key={idx}
                      style={{
                        backgroundColor: item.result.exceedsThreshold
                          ? 'rgba(254, 226, 226, 0.5)'
                          : undefined,
                      }}
                    >
                      <td>{idx + 1}</td>
                      <td>
                        <Badge size="sm" variant="light" color="blue">
                          {item.label}
                        </Badge>
                      </td>
                      <td>{formatAngle(item.result.compassReading, 1)}</td>
                      <td>
                        <Text fw={600} size="sm">
                          {formatAngle(item.result.correctedBearing, 1)}
                        </Text>
                      </td>
                      <td>
                        <Badge
                          size="sm"
                          variant="filled"
                          style={{ backgroundColor: ELEMENT_COLORS[item.result.mountain.element] }}
                        >
                          {item.result.mountain.name}山
                        </Badge>
                      </td>
                      <td>
                        <Text
                          fw={600}
                          size="sm"
                          c={item.result.exceedsThreshold ? 'red' : 'green'}
                        >
                          {item.result.errorAmount.toFixed(2)}°
                        </Text>
                      </td>
                      <td>
                        {item.result.exceedsThreshold ? (
                          <Badge size="sm" color="red" variant="filled">
                            超标
                          </Badge>
                        ) : (
                          <Badge size="sm" color="green" variant="filled">
                            合格
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </ScrollArea>

            <SimpleGrid cols={3} spacing="sm">
              <Card p="sm" radius="sm" withBorder bg="green.0">
                <Group gap="xs">
                  <ThemeIcon size="sm" color="green" radius="md">
                    <IconCheck size={14} />
                  </ThemeIcon>
                  <Stack gap={0}>
                    <Text size="xs" c="dimmed">
                      合格数量
                    </Text>
                    <Text fw={700} size="lg" c="green.7">
                      {parsed.results.length - exceedCount}
                    </Text>
                  </Stack>
                </Group>
              </Card>
              <Card p="sm" radius="sm" withBorder bg="red.0">
                <Group gap="xs">
                  <ThemeIcon size="sm" color="red" radius="md">
                    <IconAlertTriangle size={14} />
                  </ThemeIcon>
                  <Stack gap={0}>
                    <Text size="xs" c="dimmed">
                      超标数量
                    </Text>
                    <Text fw={700} size="lg" c="red.7">
                      {exceedCount}
                    </Text>
                  </Stack>
                </Group>
              </Card>
              <Card p="sm" radius="sm" withBorder bg="violet.0">
                <Group gap="xs">
                  <ThemeIcon size="sm" color="violet" radius="md">
                    <IconMountain size={14} />
                  </ThemeIcon>
                  <Stack gap={0}>
                    <Text size="xs" c="dimmed">
                      涉及山向
                    </Text>
                    <Text fw={700} size="lg" c="violet.7">
                      {new Set(parsed.results.map((r) => r.result.mountain.name)).size} 个
                    </Text>
                  </Stack>
                </Group>
              </Card>
            </SimpleGrid>
          </>
        )}

        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" onClick={handleClose}>
            取消
          </Button>
          <Button
            leftSection={<IconUpload size={16} />}
            onClick={handleSubmit}
            disabled={parsed.results.length === 0 || parsed.errors.length > 0}
          >
            批量录入
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
