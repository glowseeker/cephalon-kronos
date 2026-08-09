#!/usr/bin/env python3
"""
Step 1: Identify ALL remaining EN values across all 13 locales.
Step 2: Categorize each as proper-noun or translatable.
Step 3: Write categorized list to /tmp/tables/remaining_categorized.json
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

# Load all locale files
files = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in ['en', 'fr'] + LOCALES}
flats = {lo: flat_ui(files[lo]) for lo in ['en', 'fr'] + LOCALES}

# Find ALL keys where any locale still == EN
all_keys = set(flats['en'].keys())
remaining = {}
for k in sorted(all_keys):
    en_val = flats['en'][k]
    fr_val = flats['fr'].get(k, en_val)
    locales_with_en = []
    for lo in LOCALES:
        v = flats[lo].get(k, en_val)
        if v == en_val:
            locales_with_en.append(lo)
    if locales_with_en:
        category = 'proper_noun' if fr_val == en_val else 'translatable'
        remaining[k] = {
            'en': en_val,
            'fr': fr_val,
            'category': category,
            'locales': locales_with_en
        }

# Save
with open('/tmp/tables/remaining_categorized.json', 'w', encoding='utf-8') as f:
    json.dump(remaining, f, ensure_ascii=False, indent=2)

# Print summary
proper = [k for k, v in remaining.items() if v['category'] == 'proper_noun']
trans = [k for k, v in remaining.items() if v['category'] == 'translatable']
print(f"Total keys still EN in any locale: {len(remaining)}")
print(f"  Proper nouns (FR==EN): {len(proper)}")
print(f"  Needs translation (FR!=EN): {len(trans)}")
print(f"\nTranslatable keys:")
for k in sorted(trans):
    v = remaining[k]
    print(f"  {k}: EN={v['en']!r}, FR={v['fr']!r}")
