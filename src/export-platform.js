import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildWorld } from './world.js';
import { makePlatformConfig } from './platform-config.js';

export async function exportPlatformAssets(config) {
  const world = buildWorld(config, { withText: false });
  try {
    world.robot.position.set(config.home.x, 0, config.home.z); world.robot.rotation.y = config.home.yaw;
    world.route.visible = false;
    const route = new THREE.Group(); route.name = 'PlannedRoute'; world.group.add(route);
    const routeMaterial = new THREE.MeshBasicMaterial({ color: '#278d85' }); world.disposableMaterials.add(routeMaterial);
    const positions = world.route.geometry.attributes.position;
    for (let index = 1; index < positions.count; index++) {
      const from = new THREE.Vector3().fromBufferAttribute(positions, index - 1), to = new THREE.Vector3().fromBufferAttribute(positions, index);
      const direction = to.clone().sub(from), length = direction.length(); if (length < .001) continue;
      const geometry = new THREE.CylinderGeometry(.018, .018, length, 6); world.geometries.add(geometry);
      const line = new THREE.Mesh(geometry, routeMaterial); line.position.copy(from).add(to).multiplyScalar(.5);
      line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); route.add(line);
    }
    world.robotLabel.visible = false;
    // The organizer's upload gateway may cap requests at 1 MiB. Share identical
    // geometry and omit unused UVs without requiring Draco or external decoders.
    const geometryCache = new Map();
    world.group.traverse(node => {
      const geometry = node.geometry;
      if (!geometry) return;
      geometry.deleteAttribute('uv');
      const signature = JSON.stringify([
        geometry.index ? Array.from(geometry.index.array) : null,
        Object.keys(geometry.attributes).sort().map(key => [key, geometry.attributes[key].itemSize, Array.from(geometry.attributes[key].array)]),
      ]);
      const shared = geometryCache.get(signature);
      if (shared) node.geometry = shared;
      else geometryCache.set(signature, geometry);
    });
    const exporter = new GLTFExporter();
    const data = await exporter.parseAsync(world.group, { binary: true, onlyVisible: true });
    const reference = new URL(config.platformModelUrl);
    if (!['https:', 'http:'].includes(reference.protocol)) throw new Error('platformModelUrl 需要可访问的 HTTP(S) 模型地址');
    const screen = makePlatformConfig(reference.href, config);
    return { glb: data, screen };
  } finally {
    for (const geometry of world.geometries) geometry.dispose();
    for (const texture of world.textures) texture.dispose();
    for (const material of Object.values(world.mats)) material.dispose();
    for (const material of world.disposableMaterials) material.dispose();
  }
}
