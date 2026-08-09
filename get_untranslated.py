#!/usr/bin/env python3
"""
Get the COMPLETE list of untranslated EN keys across all 13 locales
and write to /tmp/all_untranslated.txt
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']

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

# Collect all keys that are still EN in at least one locale
needs_translation = set()
for lo in LOCALES:
    d = flat_ui(load_json(f'src/lib/i18n/{lo}.json'))
    for k, v in en.items():
        if d.get(k) == v:
            needs_translation.add(k)

# Write the list with EN values
results = []
for k in sorted(needs_translation):
    results.append(f"{k} = \"{en[k]}\"")

with open('/tmp/all_untranslated.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))

print(f"Total unique untranslated keys: {len(needs_translation)}")
