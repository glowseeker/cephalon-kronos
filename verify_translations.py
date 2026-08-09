#!/usr/bin/env python3
"""Verify translation completeness across all 15 locales."""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['en', 'fr', 'de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']

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
total = len(en)
print(f"Total UiContext-resolved keys: {total}")
for lo in LOCALES:
    d = flat_ui(load_json(f'src/lib/i18n/{lo}.json'))
    en_count = sum(1 for k, v in d.items() if v == en.get(k))
    pct = (len(d) - en_count) / max(len(d), 1) * 100
    print(f"  {lo:4s}: {len(d):4d} keys, {en_count:4d} still EN ({pct:.0f}% translated)")
