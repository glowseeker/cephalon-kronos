#!/usr/bin/env python3
"""Check current translation state and generate the full key list."""
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
fr = flat_ui(load_json('src/lib/i18n/fr.json'))
de = flat_ui(load_json('src/lib/i18n/de.json'))

# Count EN values per locale
de_en = sum(1 for k in en if de.get(k) == en[k])
es_en = sum(1 for k in en if load_json(f'src/lib/i18n/es.json').get('ui',{}).get(k.split('.',1)[1] if '.' in k else k, None) == en[k]) if False else 0
print(f"DE: {de_en} keys still EN (out of {len(en)})")
print(f"{len(en)} total ui+flat keys")

# Get the full list of untranslated keys
untrans = sorted([(k, en[k]) for k in en if de.get(k) == en[k]])
with open('/tmp/all_untranslated.txt', 'w', encoding='utf-8') as f:
    for k, v in untrans:
        f.write(f'{k} = "{v}"\n')
print(f"Wrote {len(untrans)} untranslated keys to /tmp/all_untranslated.txt")
