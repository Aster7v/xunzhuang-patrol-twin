export const CONFIG = {
  name: '巡桩问诊', robotId: 'FISHBOT-01', mapId: 'demo-parking-v1',
  // This is a schematic demo, not a surveyed site or the robot's navigation map.
  mapLabel: '校园充电示范区', mapVerified: false,
  home: { x: -8.5, z: 3.5, yaw: 0 },
  points: [
    { id: 'CP-01', name: '01 号充电桩', x: -6, z: 0.3, temperature: 32.8, gasRaw: 284, condition: 'normal' },
    { id: 'CP-02', name: '02 号充电桩', x: -2, z: 0.3, temperature: 34.2, gasRaw: 301, condition: 'normal' },
    { id: 'CP-03', name: '03 号充电桩', x: 2, z: 0.3, temperature: 63.5, gasRaw: 328, condition: 'warning' },
    { id: 'CP-04', name: '04 号充电桩', x: 6, z: 0.3, temperature: 33.6, gasRaw: 292, condition: 'normal' },
  ],
  simulation: { speed: 2.2, scanSeconds: 3.4, returnHome: true },
  thresholds: { temperature: 55 }, // demonstration threshold only, not a validated diagnosis
  staleAfterMs: 8000,
  // ROS map (m, rad) -> Three world. Calibrate against the real map before live use.
  transform: { scale: 1, originX: 0, originZ: 0, rotation: 0 },
  websocketUrl: '',
};

export function createConfig(options = {}) {
  return { ...CONFIG, ...options,
    home: { ...CONFIG.home, ...options.home },
    simulation: { ...CONFIG.simulation, ...options.simulation },
    thresholds: { ...CONFIG.thresholds, ...options.thresholds },
    transform: { ...CONFIG.transform, ...options.transform },
    points: (options.points || CONFIG.points).map(p => ({ ...p })),
  };
}
