/** Native screen format observed in the organizer's public editor bundle.
 * This contains only built-in widget types and data. It does not inject scripts.
 */
export function makePlatformConfig(modelReference, config) {
  const widgets = [];
  function add(id, type, title, layout, settings) {
    widgets.push({ id, type, title, frame: false, z: widgets.length + 1, layout, config: { live: false, ...settings }, dataBindings: [] });
  }
  function info(id, title, layout, rows) {
    add(id, 'screenCenterInfoCard', title, layout, { componentName: 'CenterInfoCard', borderType: 'none', data: { title, icon: 'el-icon-monitor', rows: rows.map(([label, value, icon]) => ({ label, value, icon: icon || 'el-icon-info' })) } });
  }
  add('patrol-site-model', 'screenCenterRack', '巡桩问诊示意场景（静态模型）', { left: 328, top: 120, width: 1264, height: 810 }, {
    componentName: 'CenterRack', image: '', imageSource: '', imageFit: 'contain', model: modelReference,
    modelSource: 'cloud', modelFormat: 'glb', modelName: '巡桩问诊-日间场景.glb',
    modelScale: 1, modelFitMode: 'contain', modelCoverage: .78, modelOverflow: .06,
    modelYaw: -27, modelPitch: 12, modelRoll: 0, modelOffsetX: 0, modelOffsetY: .03,
    modelAutoRotate: false, modelDragRotate: true, backdropDim: 0, backdropBlur: 0,
    backdropPresetVersion: 5, hideFallback: true, data: {},
  });
  info('patrol-task', '巡检任务 · 等待接入', { left: 28, top: 112, width: 292, height: 220 }, [
    ['任务编号', '--'], ['任务状态', '未连接设备'], ['当前点位', '--'], ['完成进度', '--'],
  ]);
  info('patrol-points', '巡检点位 · 示意布局', { left: 28, top: 350, width: 292, height: 270 }, config.points.map(p => [p.id, `${p.name} / 待采集`, 'el-icon-location-outline']));
  info('patrol-robot', '巡检机器人', { left: 28, top: 638, width: 292, height: 220 }, [
    ['机器人', config.robotId], ['导航', '等待设备接入'], ['电量', '--'], ['地图', '示意地图，待标定'],
  ]);
  info('patrol-sensors', '点位采样 · 等待真实数据', { left: 1608, top: 112, width: 284, height: 250 }, [
    ['采样点位', '--'], ['表面温度', '-- °C', 'el-icon-thermometer'], ['气体响应', '-- 原始读数'], ['采集时间', '--'],
  ]);
  info('patrol-camera', '现场图像', { left: 1608, top: 380, width: 284, height: 180 }, [
    ['图像状态', '等待设备上传'], ['图像来源', '未连接设备'],
  ]);
  add('patrol-alerts', 'screenCenterAlarm', '真实异常事件', { left: 650, top: 880, width: 1242, height: 170 }, { componentName: 'CenterAlarmList', borderType: 'none', data: { alarmList: [] } });
  info('patrol-limitations', '接入状态', { left: 28, top: 880, width: 600, height: 170 }, [
    ['场景状态', '静态示意，实际地图待标定'], ['设备连接', '等待接入'], ['数据来源', '未连接真实设备'],
  ]);
  info('patrol-summary', '巡检结果', { left: 1608, top: 578, width: 284, height: 210 }, [
    ['已配置点位', String(config.points.length)], ['已完成点位', '--'], ['异常数量', '--'],
  ]);
  info('patrol-integration', '充电区域 · 巡检场景', { left: 350, top: 105, width: 1225, height: 110 }, [
    ['巡检范围', `${config.points.length} 个点位，依次采集温度、气体响应与现场图像`],
  ]);
  return {
    title: '巡桩问诊 · 充电区域巡检（示意场景 / 设备待连接）',
    background: 'plain',
    header: { enabled: true, text: '巡桩问诊  |  智能移动巡检与异常预警', fontSize: 30, align: 'center', color: '#dcf4f1', style: 'tech', height: 80 },
    frame: { borderColor: '#78b7bc', radius: 6, glow: .08, corners: false, opacity: .38 },
    theme: { enabled: true, color: '#52b5a9' }, widgets,
  };
}
