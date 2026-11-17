const ACTIVE = new Set(['navigating', 'scanning', 'returning']);
export const STAGES = { idle: '等待任务', navigating: '前往巡检点', scanning: '到点采集', returning: '返回待命区', completed: '任务已完成', cancelled: '任务已取消', waiting: '等待真实数据', error: '任务异常' };

export class PatrolSimulation {
  constructor(config, onEvent = () => {}) {
    this.config = config;
    this.onEvent = onEvent;
    this.sequence = 0;
    this.mode = 'demo';
    this.reset();
  }
  reset() {
    this.state = {
      mode: this.mode, stage: this.mode === 'demo' ? 'idle' : 'waiting', paused: false,
      elapsed: 0, progress: 0, index: -1, scan: 0, completed: 0, battery: this.mode === 'demo' ? 92 : null,
      robot: { ...this.config.home }, results: [], alerts: [], taskId: null, target: null,
      temperature: null, gasRaw: null, lastUpdate: null, sensorPointId: null, lastSensorAt: null,
      poseSeen: false, taskSeen: false,
    };
    this.path = [];
    this.travelled = [];
    this.emit('reset', '视图已复位');
  }
  emit(type, message, details = {}) { this.onEvent({ type, message, at: Date.now(), ...details }); }
  get active() { return ACTIVE.has(this.state.stage); }
  start() {
    if (this.mode !== 'demo') return false;
    if (this.active) { if (this.state.paused) this.pause(); return true; }
    this.reset();
    this.state.taskId = `DEMO-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(++this.sequence).padStart(3, '0')}`;
    this.state.stage = 'navigating';
    this.state.index = 0;
    this.setTarget(this.config.points[0]);
    this.emit('start', '演示巡检任务已启动');
    return true;
  }
  setTarget(point) {
    const s = this.state;
    s.target = point;
    // Use a clear aisle. The route is continuous and avoids the parked vehicles.
    this.path = [{ x: s.robot.x, z: 1.8 }, { x: point.x, z: 1.8 }, { x: point.x, z: point.z }]
      .filter((p, i, a) => i === 0 || Math.hypot(p.x - a[i - 1].x, p.z - a[i - 1].z) > .01);
    this.emit('navigate', `前往 ${point.name || '待命区'}`, { pointId: point.id });
  }
  pause() {
    if (this.mode !== 'demo' || !this.active) return false;
    this.state.paused = !this.state.paused;
    this.emit('pause', this.state.paused ? '演示已暂停' : '演示已继续');
    return true;
  }
  cancel() {
    if (this.mode !== 'demo' || !this.active) return false;
    this.state.stage = 'cancelled'; this.state.paused = false; this.path = [];
    this.emit('cancel', '演示任务已取消，保留当前巡检结果');
    return true;
  }
  setMode(mode) {
    if (!['demo', 'live'].includes(mode)) return;
    this.mode = mode; this.reset(); this.emit('mode', mode === 'demo' ? '已切换至演示模式' : '已切换至实时模式，等待真实数据');
  }
  finish() {
    this.state.stage = 'completed'; this.state.progress = 1; this.state.target = null;
    this.emit('complete', `巡检完成 · ${this.state.completed} 个点位 · ${this.state.alerts.length} 条异常`, { results: [...this.state.results], taskId: this.state.taskId });
  }
  update(dt) {
    const s = this.state;
    if (this.mode !== 'demo' || !this.active || s.paused) return;
    s.elapsed += dt; s.lastUpdate = Date.now();
    s.battery = Math.max(0, 92 - s.elapsed / 180);
    if (s.stage === 'scanning') {
      s.scan += dt;
      if (s.scan >= this.config.simulation.scanSeconds) {
        const point = this.config.points[s.index];
        const temperature = Number(point.temperature.toFixed(1));
        const warning = temperature >= this.config.thresholds.temperature;
        const result = { pointId: point.id, name: point.name, temperature, gasRaw: point.gasRaw, warning, at: Date.now(), source: 'demo' };
        s.results.push(result); s.completed++; s.temperature = temperature; s.gasRaw = point.gasRaw;
        s.sensorPointId = point.id; s.lastSensorAt = Date.now();
        if (warning) {
          const alert = { ...result, id: `AL-${s.taskId}-${point.id}`, message: `${point.name} 目标表面温度偏高`, acknowledged: false };
          s.alerts.push(alert); this.emit('alert', `${point.name} 温度 ${temperature} °C，达到演示阈值`, { alert });
        }
        this.emit('sample', `${point.name} 采集完成`, { result });
        s.index++; s.scan = 0;
        if (s.index < this.config.points.length) { s.stage = 'navigating'; this.setTarget(this.config.points[s.index]); }
        else if (this.config.simulation.returnHome) { s.stage = 'returning'; this.setTarget({ ...this.config.home, name: '待命区' }); }
        else this.finish();
      }
    } else {
      let remaining = this.config.simulation.speed * dt;
      while (this.path.length && remaining > 0) {
        const next = this.path[0], dx = next.x - s.robot.x, dz = next.z - s.robot.z, dist = Math.hypot(dx, dz);
        if (dist > .0001) {
          const desired = Math.atan2(dx, dz);
          const diff = Math.atan2(Math.sin(desired - s.robot.yaw), Math.cos(desired - s.robot.yaw));
          s.robot.yaw += diff * Math.min(1, dt * 8);
        }
        if (dist <= remaining) { s.robot.x = next.x; s.robot.z = next.z; remaining -= dist; this.path.shift(); }
        else { s.robot.x += dx / dist * remaining; s.robot.z += dz / dist * remaining; remaining = 0; }
      }
      this.travelled.push({ x: s.robot.x, z: s.robot.z });
      if (this.travelled.length > 2000) this.travelled.shift();
      if (!this.path.length) {
        if (s.stage === 'returning') this.finish();
        else { s.stage = 'scanning'; s.scan = 0; this.emit('arrive', `已到达 ${s.target.name}，开始采集`); }
      }
    }
    s.progress = s.stage === 'completed' ? 1 : Math.min(.97, (s.completed + (s.stage === 'scanning' ? s.scan / this.config.simulation.scanSeconds : .15)) / this.config.points.length * .94);
  }
  acknowledge(id) {
    const item = this.state.alerts.find(a => a.id === id);
    if (item) { item.acknowledged = true; this.emit('acknowledge', '演示异常已标记为已读'); }
  }
}
