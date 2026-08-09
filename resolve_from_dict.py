#!/usr/bin/env python3
"""
Resolve translations using ONLY dict files (game-sourced localization).
No FR-as-fallback ever.
For entries not in dict files:
- If it's a game proper noun (same name in all languages) -> keep EN
- If it's UI text -> needs manual translation per locale

Uses dict files as the ONLY source for translations.
"""
import json, os, sys
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Build EN->localized map from dict files (case-insensitive)
en_to_local_ci = {}
for lo in LOCALES:
    d = load_json(f'{RESOURCES}/dict.{lo}.json')
    d_en = load_json(f'{RESOURCES}/dict.en.json')
    for key, en_val in d_en.items():
        loc_val = d.get(key, en_val)
        if loc_val == en_val or not loc_val.strip():
            continue
        en_lower = en_val.lower()
        if en_lower not in en_to_local_ci:
            en_to_local_ci[en_lower] = {}
        if lo not in en_to_local_ci[en_lower] or not en_to_local_ci[en_lower][lo]:
            en_to_local_ci[en_lower][lo] = loc_val

# Also build exact match map
en_to_local_exact = {}
for lo in LOCALES:
    d = load_json(f'{RESOURCES}/dict.{lo}.json')
    d_en = load_json(f'{RESOURCES}/dict.en.json')
    for key, en_val in d_en.items():
        loc_val = d.get(key, en_val)
        if loc_val != en_val and en_val not in en_to_local_exact:
            en_to_local_exact.setdefault(en_val, {})
            if lo not in en_to_local_exact[en_val] or not en_to_local_exact[en_val][lo]:
                en_to_local_exact[en_val][lo] = loc_val

# Load locale files
en = load_json('src/lib/i18n/en.json')
fr = load_json('src/lib/i18n/fr.json')
langs = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

flat_en = dict(en.get('ui', {}))
flat = {lo: dict(langs[lo].get('ui', {})) for lo in LOCALES}

# Build reverse map: en_value -> keys
en_val_to_keys = {}
for k, v in flat_en.items():
    if isinstance(v, str):
        en_val_to_keys.setdefault(v, []).append(k)

# Load list of EN values needing work
data = load_json('/tmp/tables/ui_text_to_translate.json')
needs_work_en = set(item['en'] for item in data)

to_apply = {}  # {en_val: {locale: translation}}

for en_val in sorted(needs_work_en):
    if en_val not in en_val_to_keys:
        continue
    keys = en_val_to_keys[en_val]
    translations = {}
    
    for lo in LOCALES:
        already_done = any(flat[lo].get(k, en_val) != en_val for k in keys)
        if already_done:
            continue
        
        # Try exact dict match
        if en_val in en_to_local_exact and lo in en_to_local_exact[en_val]:
            translations[lo] = en_to_local_exact[en_val][lo]
        
        # Try case-insensitive
        elif en_val.lower() in en_to_local_ci and lo in en_to_local_ci[en_val.lower()]:
            translations[lo] = en_to_local_ci[en_val.lower()][lo]
    
    if translations:
        to_apply[en_val] = translations

print(f"Entries resolvable from dict files: {len(to_apply)}")
for en_val, trans in sorted(to_apply.items()):
    print(f"  {en_val!r}: {len(trans)}/{len(LOCALES)} locales -> {trans}")

# Save
with open('/tmp/tables/dict_resolved.json', 'w', encoding='utf-8') as f:
    json.dump(to_apply, f, ensure_ascii=False, indent=2)

# Also save the remaining entries that need manual translation
remaining = []
for en_val in sorted(needs_work_en):
    if en_val in to_apply:
        continue
    if en_val in en_val_to_keys:
        remaining.append(en_val)
    
print(f"\nEntries needing manual translation: {len(remaining)}")
for v in remaining:
    print(f"  {v!r}")
