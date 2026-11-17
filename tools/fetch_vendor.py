"""Download pinned Three.js runtime and only the required addons (no npm)."""
import concurrent.futures
import pathlib
import re
import urllib.request
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = 'https://cdn.jsdelivr.net/npm/three@0.160.1/'
SEEDS = ['build/three.module.js', 'examples/jsm/controls/OrbitControls.js',
         'examples/jsm/environments/RoomEnvironment.js',
         'examples/jsm/postprocessing/EffectComposer.js',
         'examples/jsm/postprocessing/RenderPass.js',
         'examples/jsm/postprocessing/UnrealBloomPass.js',
         'examples/jsm/postprocessing/OutputPass.js',
         'examples/jsm/geometries/RoundedBoxGeometry.js',
         'examples/jsm/exporters/GLTFExporter.js']

def fetch(path):
    target = ROOT / 'vendor' / ('three.module.js' if path == 'build/three.module.js' else path.removeprefix('examples/jsm/'))
    if not target.exists():
        error = None
        for attempt in range(4):
            try:
                base = BASE if attempt % 2 == 0 else 'https://unpkg.com/three@0.160.1/'
                with urllib.request.urlopen(base + path, timeout=40) as response:
                    data = response.read()
                break
            except Exception as exc:
                error = exc
                if attempt == 3:
                    raise error
                time.sleep(.5)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    source = target.read_text()
    deps = []
    for item in re.findall(r"(?:from\s*|import\s*)['\"]([^'\"]+)['\"]", source):
        if item.startswith('.'):
            import posixpath
            deps.append(posixpath.normpath(posixpath.join(posixpath.dirname(path), item)))
    return path, deps

pending, seen = SEEDS[:], set()
while pending:
    batch = list(dict.fromkeys(p for p in pending if p not in seen))
    seen.update(batch)
    pending = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for path, deps in pool.map(fetch, batch):
            print(path)
            pending.extend(d for d in deps if d not in seen)
with urllib.request.urlopen(BASE + 'LICENSE', timeout=40) as response:
    (ROOT / 'vendor' / 'THREE-LICENSE.txt').write_bytes(response.read())
