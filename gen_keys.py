#!/usr/bin/env python3
"""Generate translations JSON for all 13 locales."""
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

en_m = flat_ui(load_json('src/lib/i18n/en.json'))
fr_m = flat_ui(load_json('src/lib/i18n/fr.json'))

scopes = {}
for lo in LOCALES:
    lo_m = flat_ui(load_json(f'src/lib/i18n/{lo}.json'))
    scopes[lo] = set(k for k in en_m if lo_m.get(k) == en_m[k])

common = set(scopes[LOCALES[0]])
for lo in LOCALES[1:]:
    common &= scopes[lo]

proper = set(k for k in common if fr_m.get(k, en_m[k]) == en_m[k])
translatable = sorted(k for k in common if k not in proper)

print(f"Total keys need translation: {len(translatable)}")
print(f"Proper nouns (keep EN): {len(proper)}")

# Save the list of keys
with open('/tmp/translation_keys.json', 'w') as f:
    json.dump({'translatable': translatable, 'proper': sorted(proper), 'common': len(common)}, f, indent=2)
print("Saved keys to /tmp/translation_keys.json")
