import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { buildWorld } from './world.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function createScene(host, config, onSelect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dce8ef');
  scene.fog = new THREE.FogExp2('#dce8ef', .009);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label', '充电桩巡检三维场景，可拖动旋转、滚轮缩放、点击充电桩选择点位');
  renderer.domElement.tabIndex = 0; host.append(renderer.domElement);
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const env = pmrem.fromScene(room, .04); scene.environment = env.texture; room.dispose(); pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(33, 1, .1, 180);
  camera.position.set(23, 22, 29);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, .2, -1); controls.enableDamping = true; controls.dampingFactor = .065;
  controls.minDistance = 6; controls.maxDistance = 58; controls.maxPolarAngle = Math.PI / 2.12;
  controls.enablePan = true;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .16, .62, 1.15);
  composer.addPass(bloom); composer.addPass(new OutputPass());
  const hemi = new THREE.HemisphereLight('#e3f4ff', '#96a9b1', 2.3); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff6e7', 3.5); sun.position.set(-8, 18, 8);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 16, bottom: -16, near: .5, far: 55 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias = .035; sun.shadow.bias = -.00025; scene.add(sun);
  const fill = new THREE.DirectionalLight('#c6e7ff', 1.3); fill.position.set(8, 6, -12); scene.add(fill);
  const world = buildWorld(config); scene.add(world.group);
  const { mats, geometries, textures, disposableMaterials, robot, robotLabel, wheels, lidar, scan, halo, canopyRoof, rings, screenMeshes, chargerMeshes, glow, amber, teal, route, homeRing } = world;
  const groundGeometry = new THREE.PlaneGeometry(170, 170); geometries.add(groundGeometry);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: '#d6e0e4', roughness: 1, metalness: 0 }); disposableMaterials.add(groundMaterial);
  const ground = new THREE.Mesh(groundGeometry, groundMaterial); ground.rotation.x = -Math.PI / 2; ground.position.y = -.52; ground.receiveShadow = true; scene.add(ground);
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(); let pointerStart = null;
  function down(e) { pointerStart = { x: e.clientX, y: e.clientY }; }
  function up(e) {
    if (!pointerStart || Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 6) return;
    const r = renderer.domElement.getBoundingClientRect(); pointer.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(chargerMeshes, false)[0];
    if (hit) onSelect(hit.object.userData.pointId);
  }
  renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointerup', up);
  let view = 'overview', selected = config.points[0].id, movingCamera = true, disposed = false;
  let destPosition = new THREE.Vector3(23, 22, 29), destTarget = new THREE.Vector3(0, .2, -1);
  function userOrbit() { if (view === 'follow') view = 'free'; movingCamera = false; }
  controls.addEventListener('start', userOrbit);
  const resize = () => {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); composer.setSize(w, h);
    if (view === 'overview') {
      const fit = Math.max(1, 1.1 / camera.aspect);
      destPosition.set(23 * fit, 22 * fit, 29 * fit); destTarget.set(0, .2, -1); movingCamera = true;
    }
  };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  let lowQuality = false, wasVisible = true;
  return {
    setView(mode) {
      view = mode; movingCamera = true;
      if (mode === 'overview') { const fit = Math.max(1, 1.1 / camera.aspect); destPosition.set(23 * fit, 22 * fit, 29 * fit); destTarget.set(0, .2, -1); }
      if (mode === 'top') { destPosition.set(0, 34, .5); destTarget.set(0, 0, -1); }
    },
    select(id, focus = true) {
      selected = id;
      if (focus) { const p = config.points.find(p => p.id === id); if (!p) return; view = 'detail'; movingCamera = true; destTarget.set(p.x, .8, -3.3); destPosition.set(p.x + 7, 8, 8); }
    },
    toggleRoof() { canopyRoof.visible = !canopyRoof.visible; return canopyRoof.visible; },
    toggleQuality() { lowQuality = !lowQuality; bloom.enabled = !lowQuality; renderer.shadowMap.enabled = !lowQuality; renderer.setPixelRatio(Math.min(devicePixelRatio, lowQuality ? 1 : 1.75)); composer.setPixelRatio(renderer.getPixelRatio()); resize(); return lowQuality; },
    update(state, dt, time) {
      if (disposed) return;
      const hasPose = state.mode === 'demo' || state.poseSeen;
      robot.visible = hasPose;
      route.visible = state.mode === 'demo'; homeRing.visible = state.mode === 'demo';
      const targetPosition = new THREE.Vector3(state.robot.x, 0, state.robot.z);
      if (state.mode === 'live' && wasVisible && dt > 0) {
        const alpha = 1 - Math.exp(-dt * 10);
        robot.position.lerp(targetPosition, alpha);
        const angle = Math.atan2(Math.sin(state.robot.yaw - robot.rotation.y), Math.cos(state.robot.yaw - robot.rotation.y));
        robot.rotation.y += angle * alpha;
      } else { robot.position.copy(targetPosition); robot.rotation.y = state.robot.yaw; }
      wasVisible = hasPose;
      robotLabel.quaternion.copy(camera.quaternion); robotLabel.quaternion.premultiply(robot.quaternion.clone().invert());
      const moving = ['navigating', 'returning'].includes(state.stage) && !state.paused;
      if (moving) { for (const w of wheels) w.rotation.x += dt * 8; lidar.rotation.y += dt * 3; }
      scan.visible = state.stage === 'scanning' && !state.paused;
      if (scan.visible) scan.rotation.z = Math.sin(time * 2) * .25;
      halo.scale.setScalar(moving || scan.visible ? 1 + Math.sin(time * 2) * .04 : 1);
      for (const p of config.points) {
        const warning = state.alerts.some(a => a.pointId === p.id), complete = state.results.some(r => r.pointId === p.id);
        const ring = rings.get(p.id), active = state.target?.id === p.id;
        ring.material = warning ? amber : (active || selected === p.id ? glow : teal);
        ring.scale.setScalar(active && !state.paused ? 1 + Math.sin(time * 3) * .1 : 1);
        ring.visible = true;
        screenMeshes.get(p.id).material = warning ? amber : glow;
        if (complete) ring.scale.multiplyScalar(.9);
      }
      if (view === 'follow' && hasPose) {
        const direction = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.robot.yaw);
        destPosition.copy(robot.position).addScaledVector(direction, 7.5); destPosition.y = 5;
        destTarget.copy(robot.position); destTarget.y = .4; movingCamera = true;
      }
      if (movingCamera) {
        const t = 1 - Math.exp(-dt * 3); camera.position.lerp(destPosition, t); controls.target.lerp(destTarget, t);
        if (view !== 'follow' && camera.position.distanceTo(destPosition) < .02) movingCamera = false;
      }
      controls.update(); composer.render();
    },
    dispose() {
      disposed = true; observer.disconnect(); controls.removeEventListener('start', userOrbit); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointerup', up);
      for (const g of geometries) g.dispose(); for (const t of textures) t.dispose();
      for (const m of Object.values(mats)) m.dispose(); for (const m of disposableMaterials) m.dispose();
      env.dispose(); for (const pass of composer.passes) pass.dispose?.(); composer.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
