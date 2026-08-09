#!/usr/bin/env python3
"""Show remaining EN keys per locale."""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def flat_ui(data):
    m = dict(data.get('ui', {}))
    for sec in ['relics', 'rivens', 'mastery', 'collectibles', 'settings', 'adversaries']:
        s = data.get(sec)
        if isinstance(s, dict):
            for k, v in s.items():
                m[f'{sec}.{k}'] = v
    return m

en = flat_ui(load_json('src/lib/i18n/en.json'))
for lo in ['de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']:
    d = flat_ui(load_json(f'src/lib/i18n/{lo}.json'))
    still_en = sorted([k for k, v in en.items() if d.get(k) == v])
    print(f"--- {lo}: {len(still_en)} keys still EN ---")
    for k in still_en[:20]:
        print(f"  {k} = \"{en[k]}\"")
    if len(still_en) > 20:
        print(f"  ... and {len(still_en) - 20} more")
    print()
