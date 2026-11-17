import { STAGES } from './sim.js';

const PATHS = {
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  history: '<path d="M3 11a9 9 0 1 1 2.5 7M3 4v7h7M12 7v5l3 2"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 .3l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.3l-3 3a5 5 0 0 0 7 7l2-2"/>',
  play: '<path d="m8 4 12 8-12 8V4Z"/>', pause: '<path d="M8 4v16M16 4v16"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  reset: '<path d="M3 11a9 9 0 1 1 2.5 7M3 4v7h7"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  robot: '<rect x="4" y="7" width="16" height="13" rx="4"/><path d="M12 3v4M8 12h.01M16 12h.01M9 16h6M1 11v5M23 11v5"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  alert: '<path d="m10.3 3.9-8.1 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.8-3.1l-8.1-14a2 2 0 0 0-3.4 0Z"/><path d="M12 8v5m0 4h.01"/>',
  temp: '<path d="M9 14.5V5a3 3 0 0 1 6 0v9.5a5 5 0 1 1-6 0Z"/><path d="M12 8v10"/>',
  gas: '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h5a3 3 0 1 1-3 3"/>',
  battery: '<rect x="2" y="6" width="17" height="12" rx="2"/><path d="M22 10v4M6 10v4m4-4v4m4-4v4"/>',
  expand: '<path d="M8 3H3v5M16 3h5v5M3 16v5h5m13-5v5h-5"/>',
  camera: '<path d="M4 7h4l2-3h4l2 3h4a2 2 0 0 1 2 2v10H2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/>',
  layers: '<path d="m12 3 10 6-10 6L2 9l10-6Zm-9 11 9 5 9-5M3 18l9 5 9-5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  check: '<path d="m5 12 4 4L19 6"/>', settings: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
};
export const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || PATHS.grid}</svg>`;
export const escape = str => String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function duration(seconds) { const n = Math.max(0, Math.floor(seconds)); return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; }
const localTime = at => new Date(at).toLocaleTimeString('zh-CN', { hour12: false });

function shell(config) {
  return `
  <header class="pt-header">
    <a class="pt-brand" href="#" data-action="home" aria-label="巡桩问诊首页"><span class="pt-logo">${icon('bolt')}</span><span><strong>巡<span class="pt-brand-accent">桩</span>问诊<span class="pt-brand-dot">.</span></strong><small>ROS2 INTELLIGENT PATROL</small></span></a>
    <nav class="pt-nav" aria-label="主导航"><button class="active" data-action="home">${icon('grid')}数字孪生</button><button data-action="events">${icon('list')}运行日志<span class="pt-nav-count" data-bind="log-count">0</span></button><button data-action="history">${icon('history')}巡检记录</button></nav>
    <div class="pt-header-right"><span class="pt-environment">日间场景 <span>V1.1</span></span><span class="pt-clock"><b data-bind="clock">--:--:--</b><small data-bind="date">----.--.--</small></span><button class="pt-icon-button" data-action="fullscreen" aria-label="切换全屏" title="切换全屏">${icon('expand')}</button></div>
  </header>
  <div class="pt-subheader"><div><span class="pt-breadcrumb">工作空间</span><span class="pt-slash">/</span>数字孪生巡检中心<span class="pt-separator"></span><span class="pt-muted">${escape(config.mapLabel)}</span></div><div class="pt-subheader-right"><span class="pt-mode-badge" data-bind="mode-badge">● 演示模式 · 模拟数据</span><button class="pt-text-button" data-action="connection">${icon('link')}数据接入</button><button class="pt-platform-button" data-action="platform">${icon('download')}平台导出</button></div></div>
  <main class="pt-workspace">
    <aside class="pt-sidebar pt-left" aria-label="巡检任务和点位">
      <section class="pt-panel pt-mission-panel"><div class="pt-section-title"><span>当前巡检任务</span><span class="pt-kicker">MISSION</span></div><div class="pt-mission-name">充电区域例行巡检 <span class="pt-tiny-tag">自动</span></div><div class="pt-mission-id" data-bind="task-id">尚未创建任务</div><div class="pt-mission-status"><i data-role="stage-dot"></i><b data-bind="stage">等待任务</b><span data-bind="task-percent">0%</span></div><div class="pt-progress"><i data-role="progress"></i></div><div class="pt-mission-meta"><span>巡检点 <b>${config.points.length} 个</b></span><span>用时 <b data-bind="elapsed">00:00</b></span></div><button class="pt-primary pt-start-large" data-action="start">${icon('play')}开始巡检<span>START MISSION</span></button></section>
      <section class="pt-panel pt-points-panel"><div class="pt-section-title"><span>巡检点位</span><span class="pt-kicker">CHECKPOINTS</span></div><div class="pt-points">${config.points.map((p, i) => `<button class="pt-point${i === 0 ? ' selected' : ''}" data-action="point" data-id="${escape(p.id)}"><span class="pt-point-number">${String(i + 1).padStart(2, '0')}</span><span class="pt-point-text"><strong>${escape(p.name)}</strong><small>${escape(p.id)} · 直流充电桩</small></span><span class="pt-point-state" data-point-state="${escape(p.id)}">待巡检</span>${icon('chevron')}</button>`).join('')}</div><div class="pt-point-legend"><span><i></i>待巡检</span><span><i class="green"></i>已完成</span><span><i class="orange"></i>异常</span></div></section>
      <section class="pt-panel pt-robot-panel"><div class="pt-section-title"><span>巡检机器人</span><span class="pt-kicker">ROBOT</span></div><div class="pt-robot-identity"><span class="pt-robot-symbol">${icon('robot')}</span><span><strong>${escape(config.robotId)}</strong><small>FishBot · ROS2 Humble</small></span><span class="pt-tiny-tag" data-bind="robot-source">模拟</span></div><div class="pt-robot-metrics"><span>${icon('battery')}电量 <b data-bind="battery">92<small>%</small></b></span><span>${icon('pin')}定位 <b data-bind="localization">示意坐标</b></span></div><div class="pt-coordinate"><span>X <b data-bind="robot-x">--</b></span><span>Z <b data-bind="robot-z">--</b></span><span>m</span></div></section>
      <div class="pt-side-note">${icon('layers')}独立可移植模块<span>场景布局与阈值均为演示配置</span></div>
    </aside>
    <section class="pt-viewport" aria-label="数字孪生场景">
      <div class="pt-scene-host" data-role="scene"></div>
      <div class="pt-scene-top"><div class="pt-scene-caption"><span class="pt-live-dot"></span><span>3D DIGITAL TWIN</span><small data-bind="scene-source">SCHEMATIC ENVIRONMENT</small></div><div class="pt-view-switch" aria-label="相机视角"><button class="active" data-action="view" data-view="overview">全景</button><button data-action="view" data-view="top">俯视</button><button data-action="view" data-view="follow">跟随</button></div></div>
      <div class="pt-scene-label"><h1>充电区域巡检</h1><p>${config.points.length} 个巡检点，沿标记路线依次采集</p><span class="pt-scene-map-note">示意场景，实际导航地图待标定</span></div>
      <div class="pt-scene-tools"><button class="pt-icon-button" data-action="roof" title="显示或隐藏光伏棚顶" aria-label="显示或隐藏光伏棚顶">${icon('layers')}</button><button class="pt-icon-button" data-action="quality" title="切换轻量画质" aria-label="切换轻量画质">${icon('settings')}</button><button class="pt-icon-button" data-action="screenshot" title="导出当前场景截图" aria-label="导出当前场景截图">${icon('camera')}</button></div>
      <div class="pt-scene-bottom"><span class="pt-scene-help">拖动旋转<span>·</span>滚轮缩放<span>·</span>点击设备查看</span><span class="pt-compass"><b>N</b><i></i></span></div>
      <div class="pt-render-error" data-role="render-error" hidden><b>三维场景暂时无法启动</b><p data-bind="render-error"></p><small>请启用浏览器硬件加速并使用新版 Chrome / Edge。任务面板仍可使用。</small></div>
      <div class="pt-target-pill" data-role="target-pill">${icon('pin')}<span data-bind="target-label">当前无巡检任务</span></div>
    </section>
    <aside class="pt-sidebar pt-right" aria-label="巡检数据和异常信息">
      <section class="pt-panel pt-insight-panel"><div class="pt-section-title"><span>点位监测</span><span class="pt-kicker">INSIGHTS</span></div><div class="pt-insight-heading"><div><span data-bind="selected-id">CP-01</span><h2 data-bind="selected-name">01 号充电桩</h2></div><span class="pt-tiny-tag" data-bind="point-status">待采集</span></div><div class="pt-reading"><span>${icon('temp')}目标表面温度</span><div><strong data-bind="temperature">--</strong><small>°C</small><span class="pt-reading-state" data-bind="temp-state">待采集</span></div><canvas width="460" height="90" data-role="temp-chart" aria-label="本任务各点位采集温度"></canvas><div class="pt-chart-labels"><span>本任务采样趋势</span><span>演示阈值 ${config.thresholds.temperature} °C</span></div></div><div class="pt-gas-reading"><span>${icon('gas')}气体响应</span><b><span data-bind="gas">--</span><small>原始读数</small></b></div><p class="pt-data-note">MQ-135 未标定，不换算为气体浓度</p><div class="pt-update-time">采集时间<span data-bind="sample-time">等待采集</span></div></section>
      <section class="pt-panel pt-camera-panel"><div class="pt-section-title"><span>现场图像</span><span class="pt-camera-tag" data-bind="camera-source">模拟示意</span></div><div class="pt-camera-frame"><canvas width="560" height="300" data-role="camera" aria-label="模拟巡检图像示意"></canvas><img data-role="live-image" alt="设备上传的巡检图像" hidden><div class="pt-camera-corners"></div><span class="pt-camera-caption" data-bind="camera-caption">等待到点采集 · 非真实摄像头画面</span></div></section>
      <section class="pt-panel pt-alert-panel"><div class="pt-section-title"><span>异常事件</span><span class="pt-alert-count" data-bind="alert-count">0</span></div><div data-role="alerts" class="pt-alert-list"><div class="pt-empty-alert">${icon('check')}<span>暂无异常事件<small>巡检发现的异常将在这里展示</small></span></div></div></section>
    </aside>
  </main>
  <footer class="pt-footer"><div class="pt-control-strip"><div class="pt-control-title"><span class="pt-control-led"></span><div><strong data-bind="control-stage">准备就绪</strong><small data-bind="control-detail">启动任务，查看自主巡检全过程</small></div></div><div class="pt-timeline"><span data-timeline="start">任务下发</span><i></i><span data-timeline="navigate">自主导航</span><i></i><span data-timeline="sample">到点采集</span><i></i><span data-timeline="complete">任务完成</span></div><div class="pt-control-actions"><button data-action="pause" disabled>${icon('pause')}<span data-bind="pause-label">暂停</span></button><button data-action="cancel" disabled>${icon('stop')}取消</button><button data-action="reset" title="复位演示，清空当前任务结果">${icon('reset')}复位</button></div></div><div class="pt-stat-strip"><div><span>已巡检点位</span><strong><b data-bind="completed">0</b><small>/ ${config.points.length}</small></strong><span class="pt-stat-caption">CHECKPOINTS</span></div><div><span>异常事件</span><strong class="pt-amber"><b data-bind="stat-alerts">0</b><small>条</small></strong><span class="pt-stat-caption">ANOMALIES</span></div><div><span>巡检用时</span><strong data-bind="stat-elapsed">00:00</strong><span class="pt-stat-caption">DURATION</span></div><div><span>任务完成率</span><strong><b data-bind="completion">0</b><small>%</small></strong><span class="pt-stat-caption">PROGRESS</span></div><div class="pt-data-status"><i data-role="connection-dot"></i><span data-bind="connection-summary">模拟数据源运行中</span><small data-bind="freshness">DEMO DATA · NOT CONNECTED TO HARDWARE</small></div></div></footer>
  <div class="pt-toast" data-role="toast" role="status" aria-live="polite" hidden></div>
  <dialog class="pt-dialog" data-role="dialog"><div class="pt-dialog-header"><div><span class="pt-kicker" data-bind="dialog-kicker">WORKSPACE</span><h2 data-bind="dialog-title">运行日志</h2></div><button class="pt-icon-button" data-action="close-dialog" aria-label="关闭弹窗">${icon('close')}</button></div><div class="pt-dialog-content" data-role="dialog-content"></div></dialog>`;
}

export function createUI(root, config, onAction) {
  root.classList.add('pt-app'); root.innerHTML = shell(config);
  const $ = selector => root.querySelector(selector), $$ = selector => [...root.querySelectorAll(selector)];
  const bindings = new Map(); $$('[data-bind]').forEach(el => { const list = bindings.get(el.dataset.bind) || []; list.push(el); bindings.set(el.dataset.bind, list); });
  const text = (key, value) => { for (const el of bindings.get(key) || []) { const v = String(value); if (el.textContent !== v) el.textContent = v; } };
  const controller = new AbortController(); let toastTimer, lastAlertKey = '', cameraKey = '', selected = config.points[0].id, modal = null, startKey = '';
  const click = event => {
    const button = event.target.closest('[data-action]');
    if (!button || !root.contains(button) || button.disabled) return;
    event.preventDefault(); onAction(button.dataset.action, { ...button.dataset }, event);
  };
  root.addEventListener('click', click, { signal: controller.signal });
  $('[data-role="dialog"]').addEventListener('close', () => { modal = null; }, { signal: controller.signal });
  function toast(message) {
    const el = $('[data-role="toast"]'); el.textContent = message; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 3600);
  }
  function setModal(type, title, content, kicker) {
    modal = type; text('dialog-title', title); text('dialog-kicker', kicker);
    $('[data-role="dialog-content"]').innerHTML = content;
    const dialog = $('[data-role="dialog"]'); if (!dialog.open) dialog.showModal();
  }
  function drawChart(results) {
    const canvas = $('[data-role="temp-chart"]'), ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h); ctx.lineWidth = 1; ctx.strokeStyle = '#e2eaf0';
    for (const y of [20, 50, 80]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const thresholdY = h - 8 - config.thresholds.temperature / 90 * (h - 16);
    ctx.setLineDash([5, 7]); ctx.strokeStyle = '#cfad7b'; ctx.beginPath(); ctx.moveTo(0, thresholdY); ctx.lineTo(w, thresholdY); ctx.stroke(); ctx.setLineDash([]);
    if (!results.length) return;
    const positions = results.map((r, i) => ({ x: 12 + i * (w - 24) / Math.max(1, config.points.length - 1), y: h - 8 - Math.min(90, Math.max(0, r.temperature)) / 90 * (h - 16), warning: r.warning }));
    ctx.beginPath(); positions.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.lineWidth = 2.5; ctx.strokeStyle = '#168b7c'; ctx.stroke();
    for (const p of positions) { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fillStyle = p.warning ? '#bd7f36' : '#168b7c'; ctx.fill(); }
  }
  function drawCamera(point, result, live) {
    const key = `${point.id}:${!!result}:${live}`; if (key === cameraKey) return; cameraKey = key;
    const canvas = $('[data-role="camera"]'), ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 560, 300);
    const sky = ctx.createLinearGradient(0, 0, 0, 300); sky.addColorStop(0, '#cbdfe9'); sky.addColorStop(1, '#e9f1f4'); ctx.fillStyle = sky; ctx.fillRect(0, 0, 560, 300);
    ctx.fillStyle = '#a2b9bf'; ctx.fillRect(0, 190, 560, 110); ctx.strokeStyle = '#d3e1e6';
    for (let i = -300; i < 900; i += 110) { ctx.beginPath(); ctx.moveTo(280 + (i - 280) * .2, 190); ctx.lineTo(i, 300); ctx.stroke(); }
    ctx.fillStyle = '#d1dcdf'; ctx.fillRect(232, 57, 96, 171); ctx.fillStyle = '#17313e'; ctx.fillRect(241, 72, 78, 141);
    ctx.fillStyle = result?.warning ? '#e8a95b' : '#4bc6b1'; ctx.fillRect(232, 57, 96, 10); ctx.fillRect(248, 86, 63, 40);
    ctx.fillStyle = '#b9e9df'; ctx.font = '14px monospace'; ctx.textAlign = 'center'; ctx.fillText(point.id, 280, 151);
    ctx.strokeStyle = '#15252b'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(324, 110); ctx.bezierCurveTo(378, 220, 323, 262, 327, 166); ctx.stroke();
    ctx.strokeStyle = result?.warning ? '#efa657' : '#6cd4c1'; ctx.lineWidth = 1.5; ctx.strokeRect(217, 43, 125, 197);
    ctx.fillStyle = '#72949d'; ctx.textAlign = 'left'; ctx.font = '11px monospace'; ctx.fillText('SYNTHETIC PREVIEW / NOT A CAMERA FEED', 18, 24);
    if (live) { ctx.fillStyle = 'rgba(229,239,244,.94)'; ctx.fillRect(0, 0, 560, 300); ctx.fillStyle = '#7995a6'; ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('等待真实图像', 280, 150); }
    else if (!result) { ctx.fillStyle = 'rgba(220,233,240,.25)'; ctx.fillRect(0, 0, 560, 300); }
  }
  return {
    $, toast, get modal() { return modal; },
    select(id) { selected = id; $$('.pt-point').forEach(el => el.classList.toggle('selected', el.dataset.id === id)); },
    view(mode) { $$('[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === mode)); },
    render(s, connection, hasCommand) {
      const point = config.points.find(p => p.id === selected) || config.points[0];
      const result = [...s.results].reverse().find(r => r.pointId === selected), live = s.mode === 'live';
      const active = ['navigating', 'scanning', 'returning'].includes(s.stage), paused = s.paused;
      const stale = live && (!s.lastUpdate || Date.now() - s.lastUpdate > config.staleAfterMs);
      const sensorStale = live && result && Date.now() - result.at > config.staleAfterMs;
      const poseStale = live && (!s.lastPoseAt || Date.now() - s.lastPoseAt > config.staleAfterMs);
      text('clock', localTime(Date.now())); text('date', new Date().toLocaleDateString('zh-CN').replaceAll('/', '.'));
      text('task-id', s.taskId || (live ? '等待真实任务状态' : '尚未创建任务'));
      text('stage', paused ? '演示已暂停' : STAGES[s.stage] || s.stage); text('task-percent', `${Math.round(s.progress * 100)}%`);
      $('[data-role="progress"]').style.width = `${s.progress * 100}%`;
      text('elapsed', duration(s.elapsed)); text('stat-elapsed', duration(s.elapsed)); text('completed', s.completed); text('stat-alerts', s.alerts.length); text('completion', Math.round(s.progress * 100));
      text('battery', s.battery === null ? '--' : `${Math.round(s.battery)}%`); text('robot-source', live ? '实时' : '模拟');
      text('robot-x', live && !s.poseSeen ? '--' : s.robot.x.toFixed(2)); text('robot-z', live && !s.poseSeen ? '--' : s.robot.z.toFixed(2));
      text('localization', live ? (poseStale ? '定位未更新' : config.mapVerified ? '已标定坐标' : '坐标待标定') : '示意坐标');
      text('mode-badge', live ? (stale ? '○ 实时模式 · 等待 / 数据过期' : '● 实时模式 · 真实数据') : '● 演示模式 · 模拟数据');
      $('.pt-mode-badge').classList.toggle('live', live); text('scene-source', live ? 'LIVE TELEMETRY / MAP CALIBRATION REQUIRED' : 'SCHEMATIC ENVIRONMENT');
      text('selected-id', point.id); text('selected-name', point.name); text('point-status', result ? (result.warning ? '温度异常' : '采集完成') : '待采集');
      text('temperature', result ? result.temperature.toFixed(1) : '--'); text('gas', result ? result.gasRaw : '--');
      text('temp-state', sensorStale ? '数据过期' : result ? (result.warning ? '超过演示阈值' : '未超过阈值') : '待采集');
      $('.pt-reading').classList.toggle('warning', !!result?.warning);
      text('sample-time', result ? `${localTime(result.at)}${live ? '' : ' · 模拟'}` : '等待采集');
      text('camera-source', live ? '真实图像接入' : '模拟示意');
      if (!s.image || s.image.pointId !== selected) {
        $('[data-role="live-image"]').hidden = true; $('[data-role="camera"]').hidden = false;
        text('camera-caption', live ? '等待当前点位的真实图像' : result ? `${point.id} · 模拟图像，非设备拍摄` : '等待到点采集 · 非真实摄像头画面');
      } else {
        const image = $('[data-role="live-image"]'); if (image.getAttribute('src') !== s.image.url) image.src = s.image.url;
        image.hidden = false; $('[data-role="camera"]').hidden = true; text('camera-caption', `${s.image.pointId} · ${localTime(s.image.at)}`);
      }
      drawCamera(point, result, live); drawChart(s.results);
      text('target-label', s.target ? `${paused ? '已暂停 · ' : ''}${s.stage === 'scanning' ? '正在采集' : '正在前往'} ${s.target.name}` : STAGES[s.stage]);
      text('control-stage', paused ? '演示已暂停' : s.stage === 'idle' ? '准备就绪' : STAGES[s.stage]);
      text('control-detail', live ? (config.mapVerified ? '真实状态驱动 · 等待设备执行回执' : '地图坐标尚未标定 · 仅查看接入数据') : s.stage === 'idle' ? '启动任务，查看自主巡检全过程' : `${s.taskId || '演示任务'} · ${s.completed}/${config.points.length} 个点位`);
      const start = $('[data-action="start"]'); start.disabled = live ? !hasCommand || !config.mapVerified || active || stale : active && !paused;
      const nextStartKey = `${live}:${paused}:${s.stage}`;
      if (nextStartKey !== startKey) {
        startKey = nextStartKey;
        start.innerHTML = `${icon('play')}${paused ? '继续巡检' : s.stage === 'completed' || s.stage === 'cancelled' ? '重新巡检' : '开始巡检'}<span>${live ? 'SEND COMMAND' : 'START MISSION'}</span>`;
      }
      $('[data-action="pause"]').disabled = !active || live; $('[data-action="cancel"]').disabled = !active || (live && (!hasCommand || stale));
      $('[data-action="reset"]').disabled = live;
      text('pause-label', paused ? '继续' : '暂停');
      $('[data-role="stage-dot"]').className = paused ? 'paused' : active ? 'running' : '';
      for (const p of config.points) {
        const el = $$('[data-point-state]').find(el => el.dataset.pointState === p.id), r = s.results.find(r => r.pointId === p.id), current = s.target?.id === p.id;
        el.textContent = r ? (r.warning ? '异常' : '已完成') : current ? (s.stage === 'scanning' ? '采集中' : '前往中') : '待巡检';
        el.className = `pt-point-state ${r?.warning ? 'warning' : r || current ? 'done' : ''}`;
      }
      $$('[data-timeline]').forEach(el => el.classList.toggle('active', ({ start: !!s.taskId, navigate: active || s.completed > 0, sample: s.completed > 0 || s.stage === 'scanning', complete: s.stage === 'completed' })[el.dataset.timeline]));
      const alertKey = JSON.stringify(s.alerts);
      if (alertKey !== lastAlertKey) {
        lastAlertKey = alertKey; text('alert-count', s.alerts.length);
        $('[data-role="alerts"]').innerHTML = s.alerts.length ? [...s.alerts].reverse().map(a => `<article class="pt-alert-item">${icon('alert')}<div><strong>${escape(a.message)}</strong><small>${escape(a.pointId)} · ${localTime(a.at)}${live ? '' : ' · 模拟事件'}</small><span>${escape(a.temperature === undefined ? '设备上报告警' : `表面温度 ${a.temperature} °C`)}${a.acknowledged ? ' · 已读' : ''}</span></div>${live ? '' : `<button class="pt-text-button" data-action="ack" data-id="${escape(a.id)}" ${a.acknowledged ? 'disabled' : ''}>${a.acknowledged ? '已读' : '标记已读'}</button>`}</article>`).join('') : `<div class="pt-empty-alert">${icon('check')}<span>暂无异常事件<small>巡检发现的异常将在这里展示</small></span></div>`;
      }
      text('connection-summary', live ? (stale ? '等待真实数据 / 数据已过期' : '已接收真实设备消息') : '模拟数据源运行中');
      text('freshness', live ? `${connection === 'connected' ? '应用 WebSocket 已连接' : '应用 WebSocket 未连接'} · ${s.lastUpdate ? `更新 ${localTime(s.lastUpdate)}` : '尚未收到设备数据'}` : 'DEMO DATA · NOT CONNECTED TO HARDWARE');
      $('[data-role="connection-dot"]').classList.toggle('offline', live && stale);
    },
    logCount(count) { text('log-count', count); },
    openEvents(events) {
      setModal('events', '运行日志', `<p class="pt-dialog-description">记录当前会话中的任务、采集与连接事件。模拟事件会明确标注。</p><div class="pt-log-list">${events.length ? [...events].reverse().map(e => `<div class="pt-log-row"><time>${localTime(e.at)}</time><span class="pt-log-type">${e.mode === 'live' ? '实时' : '演示'}</span><p>${escape(e.message)}</p></div>`).join('') : '<p>暂无事件</p>'}</div>`, 'EVENT LOG');
    },
    openHistory(history) {
      setModal('history', '巡检记录', `<p class="pt-dialog-description">本浏览器保存最近 20 次已完成的演示任务。真实历史记录需接入后端数据库。</p><div class="pt-history-list">${history.length ? [...history].reverse().map(h => `<article class="pt-history-card"><div><b>${escape(h.taskId)}</b><span class="pt-tiny-tag">模拟记录</span></div><small>${new Date(h.at).toLocaleString('zh-CN', { hour12: false })}</small><p>${h.results.length} 个点位 · ${h.results.filter(r => r.warning).length} 条异常 · ${duration(h.elapsed)}</p><div>${h.results.map(r => `<span class="${r.warning ? 'warning' : ''}">${escape(r.pointId)} <b>${Number(r.temperature).toFixed(1)} °C</b></span>`).join('')}</div></article>`).join('') : '<div class="pt-dialog-empty">完成一次巡检后，这里会生成演示记录。</div>'}</div><button class="pt-secondary" data-action="export-history">${icon('download')}导出记录 JSON</button>`, 'MISSION ARCHIVE');
    },
    openConnection(mode, connection, url) {
      setModal('connection', '数据接入', `<p class="pt-dialog-description">演示模式用于展示流程；实时模式只接受真实数据，不会自动生成模拟值。切换模式会清空当前任务视图。</p><div class="pt-mode-options"><button class="${mode === 'demo' ? 'selected' : ''}" data-action="mode" data-mode="demo"><strong>演示模式</strong><span>虚拟小车 · 模拟传感器 · 完整任务流程</span></button><button class="${mode === 'live' ? 'selected' : ''}" data-action="mode" data-mode="live"><strong>实时模式</strong><span>设备状态驱动 · 无数据则显示等待</span></button></div><div class="pt-connection-form"><label for="pt-websocket-url">后端应用 WebSocket 地址</label><input id="pt-websocket-url" data-role="ws-url" type="url" placeholder="wss://你的平台/api/twin/stream" value="${escape(url)}" autocomplete="off"><small>此处连接后端转换后的 JSON 数据流，不直接连接 MQTT Broker。</small><div><button class="pt-primary" data-action="connect" ${mode !== 'live' ? 'disabled' : ''}>${icon('link')}连接数据源</button><button class="pt-secondary" data-action="disconnect">断开</button><span>${escape(({ connected: '已连接', connecting: '连接中', disconnected: '未连接', error: '连接错误' })[connection])}</span></div></div><div class="pt-interface-note"><strong>接口已预留，整机联调尚未验证</strong><p>支持机器人位姿、点位采样、任务状态、告警、电量和同源图像。需核对 robotId、mapId、时间戳与地图坐标变换。当前 ${escape(config.mapId)} 为${config.mapVerified ? '已标定地图' : '演示地图，尚未标定'}。</p><p>真实任务指令需宿主提供 onCommand 回调，并由机器人返回执行状态。</p></div>`, 'DATA SOURCE & INTEGRATION');
    },
    openPlatform() {
      setModal('platform', '导出到组委会平台', `<p class="pt-dialog-description">已按当前公开编辑器的 GLB 上传和大屏 JSON 格式准备导出。请先新建测试大屏，导入后验证保存与重新打开。</p><div class="pt-platform-options"><section><h3>原生大屏配置</h3><p>包含静态场景模型和平台原生信息卡片。设备数据默认等待，不填入本页模拟读数。</p><button class="pt-primary" data-action="export-native">${icon('download')}导出大屏 JSON</button></section><section><h3>独立场景模型</h3><p>用于编辑器里的模型上传。保留场景、设备和小车结构，不携带本页界面及巡检程序。</p><button class="pt-secondary" data-action="export-glb">${icon('download')}导出 GLB 模型</button></section></div><div class="pt-interface-note"><strong>当前原生查看器没有发现巡检动画或小车节点位姿绑定</strong><p>本页的动态巡检只用于独立演示。模型上传后不能视为动作已经接入；实时移动需组委会提供对应能力。传感器、任务和异常应使用平台的数据源配置绑定。</p></div>`, '');
    },
    closeDialog() { $('[data-role="dialog"]').close(); },
    error(message) { $('[data-role="render-error"]').hidden = false; text('render-error', message); },
    dispose() { controller.abort(); clearTimeout(toastTimer); $('[data-role="dialog"]').close(); root.replaceChildren(); root.classList.remove('pt-app'); },
  };
}
