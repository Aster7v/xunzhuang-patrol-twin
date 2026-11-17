import fs from 'node:fs';
import path from 'node:path';
import { createConfig } from '../src/config.js';
import { exportPlatformAssets } from '../src/export-platform.js';

// GLTFExporter's texture-free GLB writer needs FileReader for Blob buffers.
globalThis.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }).catch(error => this.onerror?.(error));
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then(result => { this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }).catch(error => this.onerror?.(error));
  }
};
const out = path.resolve(process.argv[2] || 'platform');
fs.mkdirSync(out, { recursive: true });
const assets = await exportPlatformAssets(createConfig());
fs.writeFileSync(path.join(out, '巡桩问诊-日间场景.glb'), Buffer.from(assets.glb));
fs.writeFileSync(path.join(out, '巡桩问诊-组委会大屏配置.json'), JSON.stringify(assets.screen, null, 2));
console.log(`GLB ${assets.glb.byteLength.toLocaleString()} bytes`);
console.log(`Native config ${JSON.stringify(assets.screen).length.toLocaleString()} characters`);
