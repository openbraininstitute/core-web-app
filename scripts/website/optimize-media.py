"""Build content-addressed public video variants; never overwrite the source masters.
Run with python3 scripts/website/optimize-media.py (requires ffmpeg/ffprobe).
"""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/static/website-optimized'
OUT.mkdir(parents=True, exist_ok=True)
models = ['fly-brain', 'microcircuits', 'somatosensory', 'hippocampus-growth', 'full-brain', 'thalamus-growth', 'dendrite-ride', 'neocortex-growth']
films = ['virtual-labs', 'explore-data-models', 'models-mosaic', 'simulation-configuration', 'notebooks', 'education', 'get-started-mosaic']
jobs = []
for name in models:
    source = f'/static/landing-v1/{name}.mp4'
    jobs.extend([(source, 'preview'), (source, 'full')])
for name in films:
    jobs.append((f'/images/start/walkthrough/{name}.mp4', 'chapter'))

def encode(job):
    source, variant = job
    original = ROOT / 'public' / source.lstrip('/')
    recipe = f'v2-{variant}-crf27-fps24'
    digest = hashlib.sha256(original.read_bytes() + recipe.encode()).hexdigest()[:12]
    output = OUT / f'{original.stem}-{variant}-{digest}.mp4'
    if not output.exists():
        width = 960 if variant == 'preview' else 1280 if variant == 'full' else 1440
        args = ['ffmpeg', '-v', 'error', '-y', '-i', str(original)]
        if variant == 'preview':
            # Growth clips must show a developed model, rather than their sparse opening frames.
            duration = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
                'format=duration', '-of', 'default=nw=1:nk=1', str(original)]))
            offset = max(0, duration - 3) if 'growth' in source else 0
            args += ['-ss', str(offset), '-t', '3']
        args += ['-map', '0:v:0', '-an', '-vf', f'scale=min({width}\\,iw):-2,fps=24',
                 '-c:v', 'libx264', '-crf', '27', '-preset', 'slow', '-threads', '2',
                 '-maxrate', '2500k' if variant == 'chapter' else '1500k', '-bufsize', '5000k',
                 '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output)]
        subprocess.run(args, check=True)
    if variant == 'full' and output.stat().st_size >= original.stat().st_size:
        output.unlink()
        return source, variant, {'src': source, 'bytes': original.stat().st_size, 'originalBytes': original.stat().st_size}
    print(f'{variant}: {original.name}: {original.stat().st_size:,} -> {output.stat().st_size:,}', flush=True)
    return source, variant, {'src': '/static/website-optimized/' + output.name, 'bytes': output.stat().st_size, 'originalBytes': original.stat().st_size}

result = {}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    for source, variant, entry in pool.map(encode, jobs):
        result.setdefault(source, {})[variant] = entry
(ROOT / 'src/ui/segments/landing/optimized-media.json').write_text(json.dumps(result, indent=2) + '\n')
