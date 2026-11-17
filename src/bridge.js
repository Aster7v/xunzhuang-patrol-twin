/** Normalized application WebSocket interface. This is NOT an MQTT client. */
export class DataBridge {
  constructor(config, { onMessage, onStatus }) {
    this.config = config; this.onMessage = onMessage; this.onStatus = onStatus;
    this.socket = null; this.status = 'disconnected'; this.generation = 0;
  }
  setStatus(status) { this.status = status; this.onStatus(status); }
  connect(url) {
    let parsed;
    try { parsed = new URL(url); } catch { throw new Error('请输入完整的 ws:// 或 wss:// 地址'); }
    if (!['ws:', 'wss:'].includes(parsed.protocol)) throw new Error('仅支持应用 WebSocket 地址');
    if (location.protocol === 'https:' && parsed.protocol !== 'wss:') throw new Error('HTTPS 页面需要使用 wss://');
    if (parsed.username || parsed.password) throw new Error('请通过后端会话认证，不要在地址中包含密码');
    this.disconnect(); const generation = ++this.generation;
    this.setStatus('connecting');
    const ws = new WebSocket(parsed.href); this.socket = ws;
    ws.addEventListener('open', () => { if (generation === this.generation) this.setStatus('connected'); });
    ws.addEventListener('message', event => {
      if (generation !== this.generation) return;
      try { this.ingest(JSON.parse(event.data)); }
      catch (error) { this.onStatus(this.status, `忽略无效消息：${error.message}`); }
    });
    ws.addEventListener('close', () => { if (generation === this.generation) this.setStatus('disconnected'); });
    ws.addEventListener('error', () => { if (generation === this.generation) this.setStatus('error'); });
  }
  ingest(data) {
    if (!data || typeof data !== 'object' || !['pose', 'sensor', 'task', 'alert', 'status', 'image'].includes(data.type)) throw new Error('消息 type 不受支持');
    if (data.robotId !== this.config.robotId || data.mapId !== this.config.mapId) throw new Error('robotId 或 mapId 与当前场景不一致');
    const timestamp = Date.parse(data.timestamp);
    if (!Number.isFinite(timestamp) || timestamp > Date.now() + 30000) throw new Error('timestamp 必须是有效的 ISO 时间');
    const p = data.payload;
    if (!p || typeof p !== 'object') throw new Error('缺少 payload');
    const finite = value => typeof value === 'number' && Number.isFinite(value);
    if (data.type === 'pose' && (![p.x, p.y, p.yaw].every(finite) || p.frameId !== 'map')) throw new Error('pose 需要 map 坐标系的 x/y/yaw');
    if (data.type === 'sensor' && (!this.config.points.some(q => q.id === p.pointId) || ![p.temperature, p.gasRaw].every(finite))) throw new Error('sensor 需要有效 pointId、temperature 和 gasRaw');
    if (data.type === 'task' && (!['idle', 'navigating', 'scanning', 'returning', 'completed', 'cancelled', 'error'].includes(p.stage) || !finite(p.progress) || p.progress < 0 || p.progress > 1 || !Number.isInteger(p.completed) || p.completed < 0 || p.completed > this.config.points.length || !finite(p.elapsed) || p.elapsed < 0)) throw new Error('task 状态或进度字段无效');
    if (data.type === 'task' && (typeof p.taskId !== 'string' || !p.taskId || (p.pointId != null && !this.config.points.some(q => q.id === p.pointId)))) throw new Error('task 需要 taskId，pointId 必须对应有效点位');
    if (data.type === 'status' && (!finite(p.battery) || p.battery < 0 || p.battery > 100)) throw new Error('battery 需要 0–100');
    if (data.type === 'alert' && (typeof p.id !== 'string' || !p.id || typeof p.message !== 'string' || !this.config.points.some(q => q.id === p.pointId))) throw new Error('alert 需要 id、message 和有效 pointId');
    if (data.type === 'image') {
      if (typeof p.url !== 'string' || !this.config.points.some(q => q.id === p.pointId)) throw new Error('image 需要有效 pointId 和 url');
      const url = new URL(p.url, location.href);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== location.origin) throw new Error('图片仅接受同源 HTTP(S) 地址');
    }
    const t = this.config.transform;
    if (data.type === 'pose') {
      const c = Math.cos(t.rotation), s = Math.sin(t.rotation);
      this.onMessage({ ...data, payload: { x: t.originX + t.scale * (p.x * c - p.y * s), z: t.originZ - t.scale * (p.x * s + p.y * c), yaw: p.yaw + t.rotation + Math.PI / 2 }, timestamp });
    } else this.onMessage({ ...data, timestamp });
  }
  disconnect() { this.generation++; if (this.socket) { this.socket.close(); this.socket = null; } this.setStatus('disconnected'); }
  dispose() { this.disconnect(); }
}
