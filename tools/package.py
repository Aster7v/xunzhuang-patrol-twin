"""Create a self-contained offline HTML and source zip. No npm is required.

Usage: python tools/package.py --esbuild /path/to/esbuild
The esbuild executable is a packaging tool; the app needs only a browser.
"""
import argparse
import pathlib
import re
import shutil
import subprocess
import tempfile
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--esbuild', default=shutil.which('esbuild'))
parser.add_argument('--output', default=str(ROOT.parent / 'artifacts'))
parser.add_argument('--label', default='日间优化版')
args = parser.parse_args()
if not args.esbuild:
    parser.error('Provide --esbuild pointing to an esbuild executable (0.24+).')
out = pathlib.Path(args.output)
out.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as temp:
    bundle = pathlib.Path(temp) / 'patrol-twin.js'
    subprocess.run([args.esbuild, 'src/main.js', '--bundle', '--format=iife',
                    '--global-name=PatrolTwinModule', '--alias:three/addons=./vendor',
                    '--alias:three=./vendor/three.module.js', '--target=es2020',
                    '--minify', '--legal-comments=inline', f'--outfile={bundle}'], cwd=ROOT, check=True)
    html = (ROOT / 'index.html').read_text()
    html = re.sub(r'\s*<script type="importmap">.*?</script>', '', html, flags=re.S)
    css = (ROOT / 'styles.css').read_text()
    html = html.replace('<link rel="stylesheet" href="./styles.css">', f'<style>\n{css}\n</style>')
    day_css = (ROOT / 'theme-day.css').read_text()
    html = html.replace('<link rel="stylesheet" href="./theme-day.css">', f'<style>\n{day_css}\n</style>')
    script = bundle.read_text().replace('</script', '<\\/script')
    html = html.replace('<script type="module" src="./src/main.js"></script>', f'<script>\n{script}\n</script>')
    html = html.replace('<head>', '<head>\n<!-- Offline demo. All telemetry is simulated until an explicitly configured live adapter is used. -->', 1)
    target = out / f'巡桩问诊-{args.label}.html'
    target.write_text(html)
    # A reusable IIFE for Vue and other host platforms. CSS is supplied separately.
    (out / 'patrol-twin.js').write_text(bundle.read_text())
    (out / 'patrol-twin.css').write_text(css + '\n' + day_css)
    for path in (ROOT / 'platform').glob('*'):
        if path.is_file(): shutil.copy2(path, out / path.name)
    archive = out / f'巡桩问诊-{args.label}-完整工程.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in sorted(ROOT.rglob('*')):
            if path.is_file() and '__pycache__' not in path.parts and '.git' not in path.parts:
                z.write(path, '巡桩问诊完整工程/' + path.relative_to(ROOT).as_posix())
        for path in [target, out / 'patrol-twin.js', out / 'patrol-twin.css']:
            z.write(path, '巡桩问诊完整工程/交付文件/' + path.name)
    for path in [target, archive]:
        print(f'{path} ({path.stat().st_size:,} bytes)')
