import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Shared geometry for the standalone preview and the organizer GLB assets. */
export function buildWorld(config, { withText = true } = {}) {
  const scene = new THREE.Group(); scene.name = 'PatrolSite';
  scene.userData = { project: '巡桩问诊', source: 'schematic', mapId: config.mapId, mapVerified: false };
  const mats = {};
  function mat(name, color, metalness = .2, roughness = .6, emissive = null) {
    if (!mats[name]) mats[name] = new THREE.MeshStandardMaterial({ color, metalness, roughness, envMapIntensity: .65, ...(emissive ? { emissive, emissiveIntensity: 2 } : {}) });
    return mats[name];
  }
  const white = mat('white', '#edf2f3', .25, .38), dark = mat('dark', '#263746', .28, .5),
    teal = mat('teal', '#41ccb4', .5, .3), blue = mat('blue', '#227dae', .55, .3),
    rubber = mat('rubber', '#111821', .05, .9), metal = mat('metal', '#637a87', .75, .28),
    glow = mat('glow', '#7effe4', .15, .3, '#33c9ab'), amber = mat('amber', '#ffb65e', .2, .4, '#f78626');
  const geometries = new Set(), textures = new Set(), disposableMaterials = new Set();
  function mesh(geometry, material, parent, position) {
    geometries.add(geometry); const m = new THREE.Mesh(geometry, material);
    m.castShadow = true; m.receiveShadow = true; if (position) m.position.set(...position); parent.add(m); m.name = `${parent.name || 'site'}_part_${geometries.size}`; return m;
  }
  const box = (w, h, d, material, parent, p) => mesh((Math.min(w, h, d) > .15 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(.065, Math.min(w, h, d) * .12)) : new THREE.BoxGeometry(w, h, d)), material, parent, p);
  const cylinder = (r, h, material, parent, p, segments = 32) => mesh(new THREE.CylinderGeometry(r, r, h, segments), material, parent, p);
  const torus = (r, tube, material, parent, p) => mesh(new THREE.TorusGeometry(r, tube, 8, 64), material, parent, p);
  function label(text, width = 2.5, color = '#c4d6df', fontSize = 38) {
    if (!withText) { const group = new THREE.Group(); group.name = String(text); return group; }
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const ctx = c.getContext('2d'); ctx.fillStyle = color;
    ctx.font = `600 ${fontSize}px "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 64, 495);
    const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }); disposableMaterials.add(material);
    const plane = mesh(new THREE.PlaneGeometry(width, width / 4), material, new THREE.Group());
    plane.castShadow = false; plane.receiveShadow = false; return plane;
  }
  function floorText(text, x, z, width, color = '#496975') {
    const m = label(text, width, color); m.rotation.x = -Math.PI / 2; m.position.set(x, .031, z); scene.add(m); m.name = `Marking_${text}`; return m;
  }
  const floor = box(25.8, .45, 18.2, mat('slab', '#aabbbd', .08, .93), scene, [0, -.255, -.8]);
  box(25.9, .055, 18.3, dark, scene, [0, -.49, -.8]);
  // Parking lane markings and inspection aisle.
  const lineMat = mat('line', '#f1f5f4', .05, .95), yellow = mat('yellow', '#d5ad54', .05, .8);
  const bayMat = mat('parking-green', '#8eb5a7', .03, .97);
  for (const p of config.points) box(3.6, .012, 5.2, bayMat, scene, [p.x, .001, -2.8]);
  for (let x = -10; x <= 10; x += 4) box(.055, .012, 5.5, lineMat, scene, [x, .005, -2.8]);
  box(20, .015, .07, lineMat, scene, [0, .01, -5.5]);
  for (let x = -11; x < 12; x += 1.4) box(.65, .012, .055, yellow, scene, [x, .012, 5.7]);
  floorText('AUTONOMOUS  INSPECTION  LANE', 0, 4.8, 9, '#486c77');
  floorText('巡 桩 问 诊  /  SMART PATROL', 0, 7.2, 10, '#3e6370');
  // Perimeter curbs and small landscaped islands.
  for (const x of [-12, 12]) {
    box(.45, .18, 16.4, mat('curb', '#c1cdd0', .1, .85), scene, [x, .06, -.9]);
    box(1.05, .18, 14.5, mat('soil', '#233d3d', .05, 1), scene, [x + Math.sign(x) * .75, .04, -.6]);
    for (const z of [-6.6, -.4, 5.8]) tree(x + Math.sign(x) * .7, z);
  }
  function tree(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    cylinder(.09, 1.25, mat('bark', '#626356', .05, .9), g, [0, .62, 0], 8);
    mesh(new THREE.IcosahedronGeometry(.85, 1), mat('leaves', '#386e63', .05, .95), g, [0, 1.8, 0]);
    mesh(new THREE.IcosahedronGeometry(.6, 1), mat('leaves2', '#477d6a', .05, .95), g, [.2, 2.3, -.1]);
  }
  // Photovoltaic canopy: slim posts, metal beams and individually divided panels.
  const canopy = new THREE.Group(); canopy.name = 'SolarCanopy'; scene.add(canopy);
  const canopyRoof = new THREE.Group(); canopyRoof.name = 'RoofPanels'; canopy.add(canopyRoof);
  for (const x of [-9.8, 0, 9.8]) {
    box(.14, 3.8, .14, metal, canopy, [x, 1.9, -6.4]);
    box(.18, .16, 6.1, metal, canopy, [x, 3.84, -4.2]);
  }
  box(20.2, .13, .12, metal, canopy, [0, 3.9, -6.8]);
  box(20.2, .13, .12, metal, canopy, [0, 3.9, -1.4]);
  const panel = mat('solar', '#1b3b52', .65, .32);
  for (let x = -9; x <= 9; x += 2) {
    box(1.9, .055, 5.4, panel, canopyRoof, [x, 4.02, -4.1]);
    for (let z = -6.6; z < -1.5; z += .45) box(1.83, .008, .012, metal, canopyRoof, [x, 4.052, z]);
    box(.015, .008, 5.3, metal, canopyRoof, [x, 4.052, -4.1]);
  }
  // Hide the roof surface by default to keep points and parked vehicles legible.
  canopyRoof.visible = false;
  const chargerMeshes = [], pointGroups = new Map(), rings = new Map(), screenMeshes = new Map();
  // Geometry digits survive GLB export without canvas textures or remote fonts.
  function stationNumber(value, parent) {
    const segments = ['abcedf', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgecd', 'abc', 'abcdefg', 'abfgcd'];
    const positions = { a: [0, .13, .1, .022], b: [.055, .065, .022, .1], c: [.055, -.065, .022, .1], d: [0, -.13, .1, .022], e: [-.055, -.065, .022, .1], f: [-.055, .065, .022, .1], g: [0, 0, .1, .022] };
    const digits = String(value).padStart(2, '0');
    [...digits].forEach((digit, i) => {
      for (const key of segments[Number(digit)]) { const [x, y, w, h] = positions[key]; box(w, h, .012, white, parent, [(i - .5) * .19 + x, .62 + y, .352]); }
    });
  }
  for (const [index, p] of config.points.entries()) {
    const g = new THREE.Group(); g.name = p.id.replaceAll('-', '_'); g.position.set(p.x, 0, -5.25); g.userData.pointId = p.id; scene.add(g); pointGroups.set(p.id, g);
    box(1.7, .12, .95, mat('pedestal', '#82939b', .3, .6), g, [0, .06, 0]);
    box(1.05, 1.9, .58, white, g, [0, 1.08, 0]);
    box(.9, 1.65, .04, dark, g, [0, 1.13, .31]);
    box(1.08, .14, .62, teal, g, [0, 2.07, 0]);
    box(.075, 1.5, .035, glow, g, [-.39, 1.16, .34]);
    box(.52, .48, .025, mat('screen', '#1a454b', .3, .3, '#16545a'), g, [.04, 1.52, .345]);
    const screenLabel = label('DC  60kW', .5, '#86ffe0', 52); screenLabel.position.set(.04, 1.52, .368); g.add(screenLabel);
    const badge = label(p.id, 1.0, '#c5dce5', 52); badge.position.set(0, .93, .36); g.add(badge);
    stationNumber(index + 1, g);
    const led = box(.42, .035, .03, glow, g, [.04, 1.17, .36]); screenMeshes.set(p.id, led);
    const cablePoints = [new THREE.Vector3(.48, 1.65, .18), new THREE.Vector3(.8, 1, .3), new THREE.Vector3(.82, .45, .36), new THREE.Vector3(.66, .38, .36), new THREE.Vector3(.55, 1.1, .37)];
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePoints), 24, .035, 6, false), rubber, g);
    const gun = box(.1, .28, .13, dark, g, [.55, 1.18, .4]); gun.rotation.z = -.3;
    for (const x of [-.88, .88]) { cylinder(.065, .6, yellow, g, [x, .3, .6], 12); cylinder(.067, .12, dark, g, [x, .4, .6], 12); }
    const marker = torus(.55, .018, teal, scene, [p.x, .035, p.z]); marker.rotation.x = Math.PI / 2; rings.set(p.id, marker);
    floorText(String(index + 1).padStart(2, '0'), p.x, -1, .85, '#60868e');
    const floating = label(p.id, 1.5, '#24586b', 48); floating.position.set(p.x, 2.65, -5.25); scene.add(floating);
    g.traverse(o => { if (o.isMesh) { o.userData.pointId = p.id; chargerMeshes.push(o); } });
  }
  // Two parked cars. The center aisle and scanning locations remain clear.
  function car(x, z, color) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const paint = mat(`car-${color}`, color, .7, .25), glass = mat('glass', '#233a48', .8, .13);
    const body = box(1.55, .45, 2.95, paint, g, [0, .5, 0]);
    box(1.39, .09, 3.0, dark, g, [0, .24, 0]);
    const cabin = box(1.24, .48, 1.55, glass, g, [0, .94, -.05]); cabin.rotation.x = .05;
    box(1.25, .05, 1.24, paint, g, [0, 1.2, -.1]);
    for (const wx of [-.79, .79]) for (const wz of [-.9, .9]) {
      const wheel = cylinder(.27, .16, rubber, g, [wx, .28, wz], 20); wheel.rotation.z = Math.PI / 2;
      const hub = cylinder(.15, .165, metal, g, [wx, .28, wz], 16); hub.rotation.z = Math.PI / 2;
    }
    for (const lx of [-.5, .5]) {
      box(.3, .065, .035, glow, g, [lx, .53, 1.495]);
      box(.3, .05, .035, mat('taillight', '#ee5c65', .2, .4, '#94212b'), g, [lx, .53, -1.495]);
      box(.16, .08, .12, paint, g, [Math.sign(lx) * .85, .86, .25]);
    }
    return { g, body };
  }
  car(config.points[0].x, -2.9, '#638fa4'); car(config.points.at(-1).x, -2.9, '#b7c6c9');
  // Entrance sign and utility cabinet.
  box(2.4, 1.1, .4, dark, scene, [-9.3, .55, -6.7]);
  const sign = label('EV  /  巡检示范区', 2.2, '#8bd8cc', 42); sign.position.set(-9.3, .85, -6.48); scene.add(sign);
  for (const x of [10.4]) {
    box(.85, 1.45, .6, white, scene, [x, .73, -5.7]);
    box(.03, .35, .04, dark, scene, [x + .27, .8, -5.38]);
    for (let i = 0; i < 5; i++) box(.52, .018, .015, dark, scene, [x, .3 + i * .065, -5.39]);
  }
  // FishBot-inspired schematic. Replace with a measured model for final competition use.
  const robot = new THREE.Group(); robot.name = 'FishBot_01'; robot.userData = { robotId: config.robotId, source: 'schematic' }; scene.add(robot);
  cylinder(.43, .12, dark, robot, [0, .18, 0]);
  cylinder(.4, .07, white, robot, [0, .39, 0]);
  cylinder(.36, .04, dark, robot, [0, .59, 0]);
  for (const x of [-.25, .25]) for (const z of [-.22, .22]) cylinder(.022, .36, metal, robot, [x, .4, z], 8);
  const wheels = [];
  for (const x of [-.41, .41]) { const w = cylinder(.15, .085, rubber, robot, [x, .16, 0], 24); w.rotation.z = Math.PI / 2; wheels.push(w); }
  cylinder(.04, .12, rubber, robot, [0, .08, -.28], 12);
  const lidar = cylinder(.11, .09, dark, robot, [0, .67, 0], 24);
  cylinder(.105, .035, mat('lidar', '#b73e47', .6, .3), robot, [0, .71, 0], 24);
  box(.2, .22, .16, blue, robot, [0, .54, .24]);
  cylinder(.038, .05, metal, robot, [0, .69, .23], 16);
  const lens = cylinder(.05, .04, dark, robot, [0, .56, .34], 16); lens.rotation.x = Math.PI / 2;
  box(.15, .04, .025, glow, robot, [0, .37, .37]);
  box(.12, .08, .15, amber, robot, [.17, .64, -.15]);
  const robotLabel = label(config.robotId, 1.7, '#65f3d1', 45); robotLabel.position.set(0, 1.25, 0); robot.add(robotLabel);
  const halo = torus(.65, .015, glow, robot, [0, .035, 0]); halo.rotation.x = Math.PI / 2;
  const scanMat = new THREE.MeshBasicMaterial({ color: '#42dcc3', transparent: true, opacity: .09, side: THREE.DoubleSide, depthWrite: false }); disposableMaterials.add(scanMat);
  const scan = mesh(new THREE.ConeGeometry(1.4, 2.3, 48, 1, true), scanMat, robot, [0, .5, 1.2]); scan.rotation.x = -Math.PI / 2; scan.visible = false;
  // A thin, intentionally schematic planned route.
  const routeNodes = [new THREE.Vector3(config.home.x, .045, config.home.z), new THREE.Vector3(config.home.x, .045, 1.8)];
  for (const p of config.points) { routeNodes.push(new THREE.Vector3(p.x, .045, 1.8), new THREE.Vector3(p.x, .045, p.z), new THREE.Vector3(p.x, .045, 1.8)); }
  routeNodes.push(new THREE.Vector3(config.home.x, .045, 1.8), new THREE.Vector3(config.home.x, .045, config.home.z));
  const routeGeo = new THREE.BufferGeometry().setFromPoints(routeNodes); geometries.add(routeGeo);
  const routeMat = new THREE.LineDashedMaterial({ color: '#4b9b9a', dashSize: .21, gapSize: .14, transparent: true, opacity: .75 }); disposableMaterials.add(routeMat);
  const route = new THREE.Line(routeGeo, routeMat); route.computeLineDistances(); scene.add(route);
  const homeRing = torus(.8, .025, teal, scene, [config.home.x, .04, config.home.z]); homeRing.rotation.x = Math.PI / 2;
  floorText('HOME', config.home.x, config.home.z + 1.1, 1.5, '#5e9b97');
  return { group: scene, mats, geometries, textures, disposableMaterials, robot, robotLabel, wheels, lidar, scan, halo, canopy, canopyRoof, rings, screenMeshes, chargerMeshes, glow, amber, teal, route, homeRing };
}
