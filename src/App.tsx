import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  AppShell,
  Container,
  Group,
  Text,
  Stack,
  Paper,
  ThemeIcon,
  Badge,
  Button,
  Tooltip,
  Divider,
  SimpleGrid,
  Modal,
  TextInput,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCompass,
  IconDeviceFloppy,
  IconTrash,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconPlus,
  IconRulerMeasure,
  IconInfoCircle,
  IconRotate,
  IconListDetails,
  IconFileText,
  IconChartBar,
  IconReport,
  IconUpload,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

import { CompassDial } from '@/components/CompassDial';
import { ControlPanel } from '@/components/ControlPanel';
import { SurveyPlanManager } from '@/components/SurveyPlanManager';
import { BatchInputModal } from '@/components/BatchInputModal';
import { StatisticsPanel } from '@/components/StatisticsPanel';
import { AnalysisReportModal } from '@/components/AnalysisReportModal';
import { useSurveyPlans } from '@/hooks/useSurveyPlans';
import type { AxisLine, BearingResult } from '@/types';
import {
  pointsToAngle,
  calculateBearingResult,
  generateId,
  clampAngle,
  clampDeclination,
  DEFAULT_ERROR_THRESHOLD,
  formatAngle,
} from '@/utils/compass';

function App() {
  const {
    plans,
    activePlan,
    activePlanId,
    createPlan,
    deletePlan,
    setActivePlan,
    updatePlan,
    updateMagneticDeclination,
    addMeasurement,
    removeMeasurement,
    clearMeasurements,
    duplicatePlan,
  } = useSurveyPlans();

  const [rotation, setRotation] = useState(0);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [axes, setAxes] = useState<AxisLine[]>([]);
  const [previewAngle, setPreviewAngle] = useState<number | null>(null);
  const [saveModalOpen, { open: openSave, close: closeSave }] = useDisclosure(false);
  const [pendingAxis, setPendingAxis] = useState<AxisLine | null>(null);
  const [axisLabel, setAxisLabel] = useState('');
  const [showHelp, { open: openHelp, close: closeHelp }] = useDisclosure(false);
  const [batchInputModalOpen, { open: openBatchInput, close: closeBatchInput }] = useDisclosure(false);
  const [analysisReportModalOpen, { open: openAnalysisReport, close: closeAnalysisReport }] = useDisclosure(false);

  const magneticDeclination = activePlan?.magneticDeclination ?? 0;
  const errorThreshold = activePlan?.errorThreshold ?? DEFAULT_ERROR_THRESHOLD;

  const currentBearingResult = useMemo<BearingResult | null>(() => {
    const rawAngle = previewAngle ?? rotation;
    if (rawAngle === null || rawAngle === undefined) return null;
    return calculateBearingResult(
      rawAngle,
      rotation,
      magneticDeclination,
      errorThreshold
    );
  }, [previewAngle, rotation, magneticDeclination, errorThreshold]);

  const selectedAxisResult = useMemo<BearingResult | null>(() => {
    if (!pendingAxis) return null;
    const rawAngle = pointsToAngle(pendingAxis.startPoint, pendingAxis.endPoint);
    return calculateBearingResult(
      rawAngle,
      rotation,
      magneticDeclination,
      errorThreshold
    );
  }, [pendingAxis, rotation, magneticDeclination, errorThreshold]);

  const bearingResult = pendingAxis ? selectedAxisResult : currentBearingResult;

  const handleRotationChange = useCallback((newRotation: number) => {
    setRotation(clampAngle(newRotation));
  }, []);

  const handleDeclinationChange = useCallback(
    (newDeclination: number) => {
      const clamped = clampDeclination(newDeclination);
      if (activePlanId) {
        updateMagneticDeclination(activePlanId, clamped);
      }
    },
    [activePlanId, updateMagneticDeclination]
  );

  const handleErrorThresholdChange = useCallback(
    (newThreshold: number) => {
      if (activePlanId) {
        updatePlan(activePlanId, { errorThreshold: newThreshold });
      }
    },
    [activePlanId, updatePlan]
  );

  const handleAxisDrawn = useCallback(
    (axis: AxisLine) => {
      if (!axis.passesCenter) {
        notifications.show({
          title: '轴线无效',
          message: '建筑轴线必须经过罗盘中心点才能完成测量',
          color: 'red',
          icon: <IconAlertCircle size={18} />,
          autoClose: 4000,
        });
        setAxes((prev) => [...prev, { ...axis, passesCenter: false }]);
        return;
      }

      const angle = pointsToAngle(axis.startPoint, axis.endPoint);
      const result = calculateBearingResult(angle, rotation, magneticDeclination, errorThreshold);

      const newAxes = [...axes, axis];
      setAxes(newAxes);

      const axisNumber = axes.filter((a) => a.passesCenter).length + 1;
      setAxisLabel(`轴线${axisNumber}`);
      setPendingAxis(axis);
      openSave();

      notifications.show({
        title: '轴线已绘制',
        message: `方位: ${formatAngle(result.correctedBearing)}, 归属: ${result.mountain.name}山`,
        color: result.exceedsThreshold ? 'orange' : 'green',
        icon: result.exceedsThreshold ? <IconAlertCircle size={18} /> : <IconCheck size={18} />,
      });
    },
    [axes, rotation, magneticDeclination, errorThreshold, openSave]
  );

  const handleSaveMeasurement = useCallback(() => {
    if (!pendingAxis || !activePlanId) {
      closeSave();
      return;
    }

    if (!axisLabel.trim()) {
      notifications.show({
        title: '保存失败',
        message: '请输入轴线标签',
        color: 'red',
        icon: <IconX size={18} />,
      });
      return;
    }

    const angle = pointsToAngle(pendingAxis.startPoint, pendingAxis.endPoint);
    const result = calculateBearingResult(angle, rotation, magneticDeclination, errorThreshold);

    const axisWithLabel = {
      ...pendingAxis,
      label: axisLabel.trim(),
    };
    setAxes((prev) =>
      prev.map((a) => (a.id === pendingAxis.id ? axisWithLabel : a))
    );

    const { success, duplicate } = addMeasurement(activePlanId, {
      axisId: pendingAxis.id,
      axisLabel: axisLabel.trim(),
      compassReading: result.compassReading,
      trueBearing: result.trueBearing,
      correctedBearing: result.correctedBearing,
      mountainName: result.mountain.name,
      mountainElement: result.mountain.element,
      errorRange: result.errorRange,
      errorAmount: result.errorAmount,
      exceedsThreshold: result.exceedsThreshold,
    });

    if (duplicate) {
      notifications.show({
        title: '重复记录',
        message: '该轴线在此方案中已存在相同方位的测量记录',
        color: 'yellow',
        icon: <IconAlertCircle size={18} />,
        autoClose: 5000,
      });
    } else if (success) {
      notifications.show({
        title: '保存成功',
        message: result.exceedsThreshold
          ? `记录已保存，但误差 ${result.errorAmount.toFixed(2)}° 超出阈值`
          : `「${axisLabel.trim()}」测量记录已保存`,
        color: result.exceedsThreshold ? 'orange' : 'green',
        icon: <IconDeviceFloppy size={18} />,
      });
    }

    setPendingAxis(null);
    setAxisLabel('');
    closeSave();
    setIsDrawingMode(false);
  }, [
    pendingAxis,
    activePlanId,
    axisLabel,
    rotation,
    magneticDeclination,
    errorThreshold,
    addMeasurement,
    closeSave,
  ]);

  const handleCancelSave = useCallback(() => {
    if (pendingAxis) {
      setAxes((prev) => prev.filter((a) => a.id !== pendingAxis.id));
    }
    setPendingAxis(null);
    setAxisLabel('');
    closeSave();
  }, [pendingAxis, closeSave]);

  const handleResetCompass = useCallback(() => {
    setRotation(0);
    notifications.show({
      title: '罗盘已重置',
      message: '罗盘旋转角度已归零',
      color: 'blue',
      icon: <IconRotate size={18} />,
    });
  }, []);

  const handleClearAxes = useCallback(() => {
    setAxes([]);
    setPendingAxis(null);
    notifications.show({
      title: '轴线已清除',
      message: '所有绘制的轴线已从视图中移除',
      color: 'gray',
      icon: <IconTrash size={18} />,
    });
  }, []);

  const handleBatchInput = useCallback(
    (items: { label: string; result: BearingResult }[]) => {
      if (!activePlanId) return;

      let successCount = 0;
      let duplicateCount = 0;
      let exceedCount = 0;

      items.forEach((item) => {
        const { success, duplicate } = addMeasurement(activePlanId, {
          axisId: `batch-${generateId()}`,
          axisLabel: item.label,
          compassReading: item.result.compassReading,
          trueBearing: item.result.trueBearing,
          correctedBearing: item.result.correctedBearing,
          mountainName: item.result.mountain.name,
          mountainElement: item.result.mountain.element,
          errorRange: item.result.errorRange,
          errorAmount: item.result.errorAmount,
          exceedsThreshold: item.result.exceedsThreshold,
        });

        if (success) {
          successCount++;
          if (item.result.exceedsThreshold) exceedCount++;
        }
        if (duplicate) {
          duplicateCount++;
        }
      });

      const messageParts: string[] = [];
      if (successCount > 0) messageParts.push(`成功录入 ${successCount} 条`);
      if (duplicateCount > 0) messageParts.push(`${duplicateCount} 条重复被跳过`);
      if (exceedCount > 0) messageParts.push(`${exceedCount} 条超标`);

      notifications.show({
        title: '批量录入完成',
        message: messageParts.join('，'),
        color: successCount > 0 ? 'green' : 'yellow',
        icon: successCount > 0 ? <IconCheck size={18} /> : <IconAlertCircle size={18} />,
      });
    },
    [activePlanId, addMeasurement]
  );

  useEffect(() => {
    if (activePlan) {
      const measuredIds = new Set(activePlan.measurements.map((m) => m.axisId));
      setAxes((prev) =>
        prev.map((a) => {
          const measurement = activePlan.measurements.find((m) => m.axisId === a.id);
          return measurement
            ? { ...a, label: measurement.axisLabel }
            : a;
        })
      );
    }
  }, [activePlan]);

  const headerTitle = (
    <Group gap="sm">
      <ThemeIcon size="lg" radius="md" color="brand" variant="filled">
        <IconCompass size={22} />
      </ThemeIcon>
      <Stack gap={0}>
        <Text fw={700} size="xl" lh={1}>
          传统罗盘模拟系统
        </Text>
        <Text size="xs" c="dimmed">
          二十四山 · 磁偏角校正 · 建筑轴线测量
        </Text>
      </Stack>
    </Group>
  );

  return (
    <AppShell
      header={{ height: 72 }}
      padding={0}
      style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 50%, #fecaca 100%)' }}
    >
      <AppShell.Header
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(120, 53, 15, 0.1)',
        }}
      >
        <Container h="100%" size="100%" px="lg">
          <Group h="100%" justify="space-between">
            {headerTitle}
            <Group>
              <Tooltip label="批量录入轴线数据" withArrow>
                <Button
                  variant="light"
                  color="violet"
                  size="md"
                  leftSection={<IconUpload size={18} />}
                  onClick={openBatchInput}
                >
                  批量录入
                </Button>
              </Tooltip>
              <Tooltip label="生成分析报告" withArrow>
                <Button
                  variant="light"
                  color="indigo"
                  size="md"
                  leftSection={<IconReport size={18} />}
                  onClick={openAnalysisReport}
                  disabled={!activePlan || activePlan.measurements.length === 0}
                >
                  分析报告
                </Button>
              </Tooltip>
              <Tooltip label="使用帮助" withArrow>
                <Button
                  variant="subtle"
                  size="md"
                  leftSection={<IconInfoCircle size={18} />}
                  onClick={openHelp}
                >
                  帮助
                </Button>
              </Tooltip>
              <Tooltip label="重置罗盘角度" withArrow>
                <Button
                  variant="light"
                  size="md"
                  leftSection={<IconRotate size={18} />}
                  onClick={handleResetCompass}
                >
                  归零
                </Button>
              </Tooltip>
              <Tooltip label="清除所有轴线" withArrow>
                <Button
                  variant="light"
                  color="red"
                  size="md"
                  leftSection={<IconTrash size={18} />}
                  onClick={handleClearAxes}
                  disabled={axes.length === 0}
                >
                  清除轴线
                </Button>
              </Tooltip>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="100%" py="lg" px="lg">
          <SimpleGrid
            cols={{ base: 1, xl: 3 }}
            spacing="lg"
            verticalSpacing="lg"
          >
            <div style={{ gridColumn: 'span 1' }}>
              <Stack gap="lg">
                <Paper p="md" radius="md" withBorder shadow="md" bg="white">
                  <Group justify="space-between" mb="md">
                    <Group>
                      <ThemeIcon size="md" radius="md" color="red" variant="light">
                        <IconRulerMeasure size={18} />
                      </ThemeIcon>
                      <Text fw={600} size="lg">
                        罗盘视图
                      </Text>
                    </Group>
                    <Group>
                      <Badge
                        size="md"
                        variant="filled"
                        color={isDrawingMode ? 'green' : 'blue'}
                      >
                        {isDrawingMode ? '绘制模式' : '旋转模式'}
                      </Badge>
                      {axes.length > 0 && (
                        <Badge size="md" variant="light">
                          {axes.length} 条轴线
                        </Badge>
                      )}
                    </Group>
                  </Group>

                  <Divider mb="md" />

                  <CompassDial
                    size={560}
                    rotation={rotation}
                    onRotationChange={handleRotationChange}
                    isDrawingMode={isDrawingMode}
                    onAxisDrawn={handleAxisDrawn}
                    axes={axes}
                    magneticDeclination={magneticDeclination}
                    onPreviewAngleChange={setPreviewAngle}
                  />

                  <Group mt="md" justify="center" gap="xs">
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                      <Tooltip key={angle} label={`${angle}°`} withArrow>
                        <Button
                          size="xs"
                          variant={rotation === angle ? 'filled' : 'light'}
                          onClick={() => handleRotationChange(angle)}
                        >
                          {angle}°
                        </Button>
                      </Tooltip>
                    ))}
                  </Group>
                </Paper>

                <ControlPanel
                  rotation={rotation}
                  onRotationChange={handleRotationChange}
                  magneticDeclination={magneticDeclination}
                  onDeclinationChange={handleDeclinationChange}
                  errorThreshold={errorThreshold}
                  onErrorThresholdChange={handleErrorThresholdChange}
                  isDrawingMode={isDrawingMode}
                  onDrawingModeChange={setIsDrawingMode}
                  bearingResult={bearingResult}
                  previewAngle={previewAngle}
                />
              </Stack>
            </div>

            <div style={{ gridColumn: 'span 1' }}>
              <SurveyPlanManager
                plans={plans}
                activePlanId={activePlanId}
                onSetActive={setActivePlan}
                onCreate={createPlan}
                onDelete={deletePlan}
                onUpdate={updatePlan}
                onRemoveMeasurement={(planId, recordId) =>
                  removeMeasurement(planId, recordId)
                }
                onClearMeasurements={clearMeasurements}
                onDuplicate={duplicatePlan}
              />
            </div>

            <div style={{ gridColumn: 'span 1' }}>
              <StatisticsPanel plan={activePlan} />
            </div>
          </SimpleGrid>
        </Container>
      </AppShell.Main>

      <Modal
        opened={saveModalOpen}
        onClose={handleCancelSave}
        title="保存测量记录"
        centered
        size="md"
      >
        <Stack gap="md">
          {selectedAxisResult && (
            <Paper p="md" radius="md" withBorder bg={selectedAxisResult.exceedsThreshold ? 'red.0' : 'green.0'}>
              <Group justify="space-between" mb="sm">
                <Text fw={600}>测量预览</Text>
                {selectedAxisResult.exceedsThreshold ? (
                  <Badge color="red" variant="filled" size="sm">
                    误差超限!
                  </Badge>
                ) : (
                  <Badge color="green" variant="filled" size="sm">
                    合格
                  </Badge>
                )}
              </Group>
              <SimpleGrid cols={2} spacing="sm">
                <div>
                  <Text size="xs" c="dimmed">
                    校正方位
                  </Text>
                  <Text fw={700} size="lg">
                    {formatAngle(selectedAxisResult.correctedBearing)}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    归属山向
                  </Text>
                  <Group gap={4}>
                    <Text fw={700} size="lg">
                      {selectedAxisResult.mountain.name}山
                    </Text>
                    <Badge
                      size="xs"
                      variant="filled"
                      style={{ backgroundColor: 'var(--mantine-color-violet-6)' }}
                    >
                      {selectedAxisResult.mountain.element}
                    </Badge>
                  </Group>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    罗盘读数
                  </Text>
                  <Text fw={600}>
                    {formatAngle(selectedAxisResult.compassReading)}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    误差值
                  </Text>
                  <Text
                    fw={600}
                    c={selectedAxisResult.exceedsThreshold ? 'red' : 'green'}
                  >
                    {selectedAxisResult.errorAmount.toFixed(2)}°
                  </Text>
                </div>
              </SimpleGrid>
            </Paper>
          )}

          <TextInput
            label="轴线标签"
            placeholder="例如：主轴线、东墙、南门..."
            value={axisLabel}
            onChange={(e) => setAxisLabel(e.target.value)}
            withAsterisk
            maxLength={20}
            leftSection={<IconPlus size={16} />}
          />

          <Text size="xs" c="dimmed">
            提示：同一方案内不允许存在相同轴线和相同方位的重复记录
          </Text>

          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={handleCancelSave}>
              取消
            </Button>
            <Button
              leftSection={<IconDeviceFloppy size={18} />}
              onClick={handleSaveMeasurement}
            >
              保存测量
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={showHelp}
        onClose={closeHelp}
        title="使用帮助"
        centered
        size="lg"
      >
        <Stack gap="md">
          <Paper p="sm" radius="md" withBorder bg="blue.0">
            <Group mb="xs">
              <ThemeIcon size="sm" color="blue" radius="md">
                <IconCompass size={14} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                基本操作
              </Text>
            </Group>
            <Text size="sm" lh={1.8}>
              1. <b>旋转罗盘</b>：默认模式下，在罗盘上按住鼠标拖动即可旋转罗盘盘体
              <br />
              2. <b>快捷定位</b>：点击罗盘下方的角度按钮可快速跳转到常用方位
              <br />
              3. <b>绘制轴线</b>：开启「绘制建筑轴线模式」后，在罗盘上拖动绘制一条直线
              <br />
              4. <b>保存测量</b>：轴线绘制完成后会弹出保存对话框，填写标签后保存
            </Text>
          </Paper>

          <Paper p="sm" radius="md" withBorder bg="orange.0">
            <Group mb="xs">
              <ThemeIcon size="sm" color="orange" radius="md">
                <IconAlertCircle size={14} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                重要规则
              </Text>
            </Group>
            <Text size="sm" lh={1.8}>
              • <b>角度范围</b>：0° ~ 360°，超出范围会自动归一化
              <br />• <b>磁偏角范围</b>：-25° ~ +25°（全球磁偏角合理区间）
              <br />• <b>中心点要求</b>：建筑轴线必须经过罗盘中心点才能完成测量
              <br />• <b>唯一性</b>：同一方案不能存在相同轴线+相同方位的重复记录
              <br />• <b>磁偏角联动</b>：修改磁偏角后，所有历史测量结果会立即自动更新
              <br />• <b>误差标识</b>：误差超过阈值时，记录会以红色醒目标识
            </Text>
          </Paper>

          <Paper p="sm" radius="md" withBorder bg="violet.0">
            <Group mb="xs">
              <ThemeIcon size="sm" color="violet" radius="md">
                <IconRulerMeasure size={14} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                二十四山盘说明
              </Text>
            </Group>
            <Text size="sm" lh={1.8}>
              罗盘采用传统风水二十四山盘：
              <br />• 每山占 15°，共 24 山，对应八天干 + 十二地支 + 四维卦
              <br />• 正北壬子癸、东北丑艮寅、正东甲卯乙、东南辰巽巳
              <br />• 正南丙午丁、西南未坤申、正西庚酉辛、西北戌乾亥
              <br />• 五色对应五行：金(黄)、木(绿)、水(蓝)、火(红)、土(紫)
            </Text>
          </Paper>

          <Group justify="flex-end">
            <Button onClick={closeHelp}>知道了</Button>
          </Group>
        </Stack>
      </Modal>

      <BatchInputModal
        opened={batchInputModalOpen}
        onClose={closeBatchInput}
        rotation={rotation}
        magneticDeclination={magneticDeclination}
        errorThreshold={errorThreshold}
        onSubmit={handleBatchInput}
      />

      <AnalysisReportModal
        opened={analysisReportModalOpen}
        onClose={closeAnalysisReport}
        plan={activePlan}
      />
    </AppShell>
  );
}

export default App;
