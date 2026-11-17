import { createConfig } from './config.js';
import { PatrolSimulation } from './sim.js';
import { DataBridge } from './bridge.js';
import { createScene } from './scene.js';
import { createUI } from './ui.js';
import { exportPlatformAssets } from './export-platform.js';

const instances = new WeakMap();
const HISTORY_KEY = 'patrol-twin:demo-history:v1';

/** Mountable independent module; no backend, credentials or Broker are bundled. */
export function mountPatrolTwin(root, options = {}) {
  if (typeof root === 'string') root = document.querySelector(root);
  if (!(root instanceof HTMLElement)) throw new Error('请提供有效的挂载元素');
  instances.get(root)?.dispose();
  const config = createConfig(options.config);
  if (!config.points.length || new Set(config.points.map(p => p.id)).size !== config.points.length) throw new Error('巡检点列表不能为空，编号不能重复');
  for (const p of config.points) if (![p.x, p.z, p.temperature, p.gasRaw].every(Number.isFinite)) throw new Error('巡检点需要有效的位置和演示采样值');
  let scene = null, ui, bridge, sim, disposed = false, connection = 'disconnected', socketUrl = config.websocketUrl;
  let events = [], history = [], selected = config.points[0].id, raf, renderAccumulator = 0, lastFrame = 0, sceneTime = 0;
  const lastStreams = new Map();
  try {
    const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    if (Array.isArray(stored)) history = stored.filter(h => h && typeof h.taskId === 'string' && Number.isFinite(h.at) && Number.isFinite(h.elapsed) && Array.isArray(h.results) && h.results.every(r => typeof r.pointId === 'string' && Number.isFinite(r.temperature))).slice(-20);
  } catch { /* Local history is optional, including sandboxed iframe contexts. */ }
  function log(event) {
    if (disposed) return;
    const mode = sim?.mode || 'demo'; events.push({ ...event, mode }); if (events.length > 200) events.shift();
    ui?.logCount(events.length);
    if (event.type === 'alert') ui?.toast(event.message);
    if (event.type === 'arrive' || event.type === 'navigate') {
      const id = sim?.state.target?.id;
      if (id && config.points.some(p => p.id === id)) { selected = id; ui?.select(id); scene?.select(id, false); }
    }
    if (event.type === 'complete') {
      const record = { taskId: event.taskId, at: Date.now(), elapsed: sim.state.elapsed, source: 'demo', results: event.results };
      history.push(record); history = history.slice(-20);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { ui?.toast('本浏览器无法保存记录，可导出 JSON'); }
      ui?.toast('本次演示巡检已完成，记录已生成');
    }
    if (ui?.modal === 'events') ui.openEvents(events);
    options.onEvent?.({ ...event, mode });
  }
  ui = createUI(root, config, action);
  sim = new PatrolSimulation(config, log);
  function selectPoint(id, focus = true) {
    if (!config.points.some(p => p.id === id)) return;
    selected = id; ui.select(id); scene?.select(id, focus); if (focus) ui.view('detail');
  }
  try { scene = createScene(ui.$('[data-role="scene"]'), config, selectPoint); }
  catch (error) {
    ui.error(error.message || 'WebGL 初始化失败'); log({ type: 'render-error', message: `三维渲染初始化失败：${error.message}`, at: Date.now() });
  }
  bridge = new DataBridge(config, {
    onMessage(message) {
      if (sim.mode !== 'live' || disposed) return;
      const { type, payload: p, timestamp } = message;
      const key = `${type}:${p.pointId || ''}`, old = lastStreams.get(key);
      if (old !== undefined && timestamp <= old) return;
      lastStreams.set(key, timestamp);
      const s = sim.state;
      s.lastUpdate = Math.max(s.lastUpdate || 0, timestamp);
      if (type === 'pose') { s.robot = { x: p.x, z: p.z, yaw: p.yaw }; s.poseSeen = true; s.lastPoseAt = timestamp; }
      if (type === 'sensor') {
        const result = { pointId: p.pointId, name: config.points.find(q => q.id === p.pointId).name, temperature: p.temperature, gasRaw: p.gasRaw, warning: p.temperature >= config.thresholds.temperature, at: timestamp, source: 'live', taskId: p.taskId || null };
        const index = s.results.findIndex(r => r.pointId === p.pointId); if (index < 0) s.results.push(result); else s.results[index] = result;
        s.temperature = p.temperature; s.gasRaw = p.gasRaw; s.sensorPointId = p.pointId; s.lastSensorAt = timestamp;
        log({ type: 'sample', message: `${p.pointId} 收到真实采样：${p.temperature} °C`, at: Date.now() });
      }
      if (type === 'task') {
        if (p.taskId !== s.taskId) { s.results = s.results.filter(r => r.taskId && r.taskId === p.taskId); s.alerts = []; s.image = null; }
        s.taskId = typeof p.taskId === 'string' ? p.taskId : null; s.stage = p.stage; s.progress = p.progress; s.completed = p.completed; s.elapsed = p.elapsed;
        s.taskSeen = true; s.target = config.points.find(q => q.id === p.pointId) || null;
      }
      if (type === 'alert') {
        const alert = { id: p.id, message: p.message, pointId: p.pointId, at: timestamp, source: 'live', acknowledged: false, ...(Number.isFinite(p.temperature) ? { temperature: p.temperature } : {}) };
        const index = s.alerts.findIndex(a => a.id === p.id);
        if (index < 0) { s.alerts.push(alert); if (s.alerts.length > 100) s.alerts.shift(); log({ type: 'alert', message: p.message, at: Date.now() }); }
        else s.alerts[index] = alert;
      }
      if (type === 'status') s.battery = p.battery;
      if (type === 'image') s.image = { pointId: p.pointId, url: p.url, at: timestamp };
      options.onTelemetry?.(message);
    },
    onStatus(status, message) {
      const previous = connection; connection = status;
      if (previous !== status || message) log({ type: 'connection', message: message || `应用数据流：${({ disconnected: '未连接', connecting: '连接中', connected: '已连接', error: '连接失败' })[status]}`, at: Date.now() });
      if (message) ui.toast(message);
    },
  });
  const commandPending = new Set();
  let exportPromise;
  function platformAssets() {
    if (!exportPromise) exportPromise = exportPlatformAssets(config).catch(error => { exportPromise = null; throw error; });
    return exportPromise;
  }
  async function exportForPlatform(kind) {
    try {
      ui.toast('正在生成平台原生文件，请稍候');
      const assets = await platformAssets();
      if (disposed) return;
      if (kind === 'json') download('巡桩问诊-组委会大屏配置.json', JSON.stringify(assets.screen, null, 2));
      else download('巡桩问诊-日间场景.glb', assets.glb, 'model/gltf-binary');
      ui.toast('已生成文件。请在新建的测试大屏中导入并验证');
    } catch (error) { ui.toast(`导出失败：${error.message}`); }
  }
  async function sendCommand(name) {
    if (!options.onCommand) { ui.toast('宿主尚未提供真实任务指令接口'); return; }
    if (!config.mapVerified || !sim.state.lastUpdate || Date.now() - sim.state.lastUpdate > config.staleAfterMs) { ui.toast('请先完成地图标定并接收有效设备数据'); return; }
    if (commandPending.has(name)) return;
    commandPending.add(name);
    const command = { commandId: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, robotId: config.robotId, mapId: config.mapId, command: name, taskId: sim.state.taskId, points: config.points.map(p => p.id), timestamp: new Date().toISOString() };
    try {
      ui.toast('正在提交指令，等待后端确认');
      await options.onCommand(command);
      log({ type: 'command', message: `${name} 指令已提交；执行结果以设备状态回报为准`, at: Date.now() });
      ui.toast('指令已提交，等待设备回报');
    } catch (error) { log({ type: 'command-error', message: `指令提交失败：${error.message}`, at: Date.now() }); ui.toast(`指令提交失败：${error.message}`); }
    finally { commandPending.delete(name); }
  }
  function download(name, contents, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function action(name, data) {
    if (disposed) return;
    switch (name) {
      case 'home': ui.closeDialog(); break;
      case 'point': selectPoint(data.id); break;
      case 'start': if (sim.mode === 'live') void sendCommand('start_patrol'); else sim.start(); break;
      case 'pause': sim.pause(); break;
      case 'cancel': if (sim.mode === 'live') void sendCommand('cancel_patrol'); else sim.cancel(); break;
      case 'reset': if (sim.mode === 'demo') { sim.reset(); selectPoint(config.points[0].id, false); ui.toast('演示已复位，历史记录保留'); } break;
      case 'view': scene?.setView(data.view); ui.view(data.view); break;
      case 'roof': if (scene) ui.toast(scene.toggleRoof() ? '已显示光伏棚顶' : '已隐藏棚顶，便于查看设备'); break;
      case 'quality': if (scene) ui.toast(scene.toggleQuality() ? '已切换为轻量画质' : '已恢复标准画质'); break;
      case 'events': ui.openEvents(events); break;
      case 'history': ui.openHistory(history); break;
      case 'connection': ui.openConnection(sim.mode, connection, socketUrl); break;
      case 'platform': ui.openPlatform(); break;
      case 'export-native': void exportForPlatform('json'); break;
      case 'export-glb': void exportForPlatform('glb'); break;
      case 'mode': bridge.disconnect(); lastStreams.clear(); sim.setMode(data.mode); ui.openConnection(sim.mode, connection, socketUrl); break;
      case 'connect':
        socketUrl = ui.$('[data-role="ws-url"]').value.trim();
        try { bridge.connect(socketUrl); ui.toast('正在连接后端应用数据流'); } catch (error) { ui.toast(error.message); }
        break;
      case 'disconnect': bridge.disconnect(); ui.openConnection(sim.mode, connection, socketUrl); break;
      case 'close-dialog': ui.closeDialog(); break;
      case 'ack': if (sim.mode === 'demo') sim.acknowledge(data.id); break;
      case 'export-history': download('巡桩问诊-演示巡检记录.json', JSON.stringify({ source: 'demo', exportedAt: new Date().toISOString(), records: history }, null, 2)); break;
      case 'fullscreen':
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => ui.toast('当前浏览器无法退出全屏'));
        else if (root.requestFullscreen) void root.requestFullscreen().catch(() => ui.toast('当前浏览器不支持全屏，请使用 F11'));
        else ui.toast('当前浏览器不支持全屏，请使用 F11');
        break;
      case 'screenshot': {
        const canvas = ui.$('[data-role="scene"] canvas'); if (!canvas || !scene) { ui.toast('三维场景尚未就绪'); break; }
        // Render and capture in one task so the default framebuffer is not cleared first.
        scene.update(sim.state, 0, sceneTime);
        const output = document.createElement('canvas'); output.width = canvas.width; output.height = canvas.height;
        const ctx = output.getContext('2d'); ctx.drawImage(canvas, 0, 0);
        const size = Math.max(13, Math.round(output.width / 65)); ctx.font = `${size}px "Microsoft YaHei", sans-serif`;
        ctx.fillStyle = '#0b1824dd'; ctx.fillRect(0, output.height - size * 3, output.width, size * 3);
        ctx.fillStyle = '#a9dbc9'; ctx.fillText(`巡桩问诊 · ${sim.mode === 'demo' ? '演示模式 / 模拟数据 / 示意场景' : '实时数据模式 / 场景地图需核实标定'} · ${new Date().toLocaleString('zh-CN', { hour12: false })}`, size, output.height - size);
        const a = document.createElement('a'); a.download = `巡桩问诊-${sim.mode === 'demo' ? '模拟场景' : '实时场景'}.png`; a.href = output.toDataURL('image/png'); a.click();
        ui.toast('已导出三维场景截图；模式来源见文件名'); break;
      }
    }
  }
  function frame(now) {
    if (disposed) return;
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .1) : 0; lastFrame = now; sceneTime += dt;
    sim.update(dt); scene?.update(sim.state, dt, sceneTime);
    renderAccumulator += dt;
    if (renderAccumulator >= .12 || !lastFrame) { ui.render(sim.state, connection, !!options.onCommand); renderAccumulator = 0; }
    raf = requestAnimationFrame(frame);
  }
  const keydown = e => {
    if (e.target.matches('input,textarea,select,[contenteditable]') || ui.modal || e.repeat) return;
    if (e.code === 'Space') { e.preventDefault(); if (sim.mode === 'demo') sim.active ? sim.pause() : sim.start(); }
  };
  root.addEventListener('keydown', keydown);
  const imageError = () => { sim.state.image = null; ui.$('[data-role="live-image"]').hidden = true; ui.toast('真实图像加载失败，请检查同源图片地址'); };
  ui.$('[data-role="live-image"]').addEventListener('error', imageError);
  ui.render(sim.state, connection, !!options.onCommand);
  raf = requestAnimationFrame(frame);
  log({ type: 'ready', message: '演示环境已就绪。场景、传感器和告警均为模拟数据。', at: Date.now() });
  const api = {
    config,
    ingest(message) { if (disposed) throw new Error('模块已卸载'); bridge.ingest(message); },
    setMode(mode) { if (disposed) return; bridge.disconnect(); lastStreams.clear(); sim.setMode(mode); },
    getState() { return JSON.parse(JSON.stringify(sim.state)); },
    startDemo() { return !disposed && sim.start(); },
    pauseDemo() { return !disposed && sim.pause(); },
    dispose() { if (disposed) return; disposed = true; cancelAnimationFrame(raf); root.removeEventListener('keydown', keydown); bridge.dispose(); scene?.dispose(); ui.dispose(); instances.delete(root); },
  };
  instances.set(root, api); return api;
}

if (typeof window !== 'undefined') {
  window.PatrolTwin = { mount: mountPatrolTwin };
  const root = document.getElementById('patrol-twin');
  if (root && !window.PATROL_TWIN_NO_AUTO_MOUNT) window.patrolTwin = mountPatrolTwin(root, window.PATROL_TWIN_OPTIONS || {});
}
