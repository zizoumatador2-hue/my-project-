"""Builds a local, searchable index of Pexels photos (id, description, size, photographer)
from public metadata datasets, for keyless photo selection by scripts/fetch-pexels.mjs.

    pip install pyarrow && python3 scripts/pexels-index.py   -> .cache/pexels-index.jsonl
"""
import json, os, re, sys, urllib.request

DATASETS = [
    'terminusresearch/pexels-metadata-1.71M',
    'jovianzm/Pexels-400k',
    'CaptionEmporium/pexels-568k-internvl2',
    'ppbrown/pexels-photos-janpf',
]
MAX_BYTES = 900 * 1024 * 1024
OUT = '.cache/pexels-index.jsonl'
ID_RE = re.compile(r'pexels\.com/photos?/(?:[a-z0-9-]*?-)?(\d{3,})', re.I)

import pyarrow.parquet as pq


def get(url):
    req = urllib.request.Request(url, headers={'user-agent': 'fountainfinances-photo-index'})
    return urllib.request.urlopen(req, timeout=120)


def find(cols, *names):
    for n in names:
        for c in cols:
            if c.lower() == n:
                return c
    for n in names:
        for c in cols:
            if n in c.lower():
                return c
    return None


os.makedirs('.cache', exist_ok=True)
count = 0
with open(OUT, 'w') as out:
    for ds in DATASETS:
        try:
            files = json.load(get(f'https://huggingface.co/api/datasets/{ds}/parquet'))
        except Exception as e:
            print(f'{ds}: parquet list failed: {e}')
            continue
        urls = []
        if isinstance(files, dict):
            for cfg in files.values():
                for split in (cfg.values() if isinstance(cfg, dict) else [cfg]):
                    urls += split if isinstance(split, list) else [split]
        else:
            urls = files
        print(f'{ds}: {len(urls)} parquet files')
        used = 0
        for url in urls:
            if used > MAX_BYTES:
                break
            path = '.cache/shard.parquet'
            try:
                with get(url) as r, open(path, 'wb') as f:
                    while chunk := r.read(1 << 20):
                        f.write(chunk)
                used += os.path.getsize(path)
                schema = pq.read_schema(path)
                cols = [n for n in schema.names if not str(schema.field(n).type).startswith(('binary', 'struct', 'large_binary'))]
                print(f'  {url.rsplit("/", 1)[-1]}: columns {cols}')
                t = pq.read_table(path, columns=cols).to_pylist()
            except Exception as e:
                print(f'  shard failed: {e}')
                continue
            idc = find(cols, 'id', 'photo_id', 'pexels_id')
            urlc = [c for c in cols if 'url' in c.lower() or 'link' in c.lower() or 'page' in c.lower()]
            textc = [c for c in cols if c.lower() in ('alt', 'title', 'caption', 'description', 'text', 'short_caption', 'caption_short')] or \
                    [c for c in cols if any(k in c.lower() for k in ('alt', 'title', 'caption', 'desc'))]
            wc, hc = find(cols, 'width', 'w'), find(cols, 'height', 'h')
            pc = find(cols, 'photographer', 'author', 'user', 'artist')
            for row in t:
                pid = None
                for c in urlc:
                    m = ID_RE.search(str(row.get(c) or ''))
                    if m:
                        pid = int(m.group(1))
                        slug = re.search(r'/photo/([a-z0-9-]+)-\d+/?', str(row.get(c) or ''))
                        if slug and not textc:
                            row['_slug'] = slug.group(1).replace('-', ' ')
                        break
                if pid is None and idc and str(row.get(idc) or '').isdigit():
                    pid = int(row[idc])
                if pid is None:
                    continue
                texts = [str(row[c]) for c in textc if row.get(c)] or ([row['_slug']] if row.get('_slug') else [])
                if not texts:
                    continue
                alt = min(texts, key=len) if len(texts) > 1 else texts[0]
                rec = {'id': pid, 'alt': alt[:300]}
                if wc and row.get(wc):
                    rec['w'] = row[wc]
                if hc and row.get(hc):
                    rec['h'] = row[hc]
                if pc and isinstance(row.get(pc), str):
                    rec['by'] = row[pc][:80]
                out.write(json.dumps(rec) + '\n')
                count += 1
            os.remove(path)
        if count > 50000:
            break
print(f'indexed {count} photos -> {OUT}')
sys.exit(0 if count else 1)
