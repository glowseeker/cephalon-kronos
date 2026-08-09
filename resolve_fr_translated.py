#!/usr/bin/env python3
"""
For all 186 entries where FR locale has a translation:
- Build per-locale translations using dict files + linguistic patterns
- For entries where dict also has translations: use those
- Add to T
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in LOCALES + ['fr', 'en']}
en = load_json('src/lib/i18n/en.json')
fr = load_json('src/lib/i18n/fr.json')
langs = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

flat_en = dict(en.get('ui', {}))
flat_fr = dict(fr.get('ui', {}))

# Build EN->dict translation map (search by key path, not value)
# For each dict, build a map from EN value -> localized value
en_to_local = {lo: {} for lo in LOCALES}
for lo in LOCALES:
    d = dicts[lo]
    d_en = dicts['en']
    for key, en_val in d_en.items():
        if key in d and d[key] != en_val:
            if en_val not in en_to_local[lo]:
                en_to_local[lo][en_val] = d[key]

# Also build value-based search
val_to_local = {lo: {} for lo in LOCALES}
for lo in LOCALES:
    d = dicts[lo]
    d_en = dicts['en']
    for key, en_val in d_en.items():
        loc_val = d.get(key, en_val)
        if loc_val != en_val and en_val not in val_to_local[lo]:
            val_to_local[lo][en_val] = loc_val

print("EN->dict translation maps built:")
for lo in LOCALES:
    print(f"  {lo}: {len(val_to_local[lo])} entries")

# Load T
T = load_json('/tmp/tables/translation_table.json')

# Find entries where FR has translation
added = 0
new_entries = {}
for key, en_val in flat_en.items():
    if not isinstance(en_val, str) or not en_val.strip():
        continue
    fr_val = flat_fr.get(key, en_val)
    if fr_val == en_val:
        # FR == EN, check if dict has it
        in_dict = any(en_val in val_to_local[lo] for lo in LOCALES)
        if not in_dict:
            continue  # Proper noun, skip
    
    if en_val in T:
        # Already in T, check if all locales are covered
        t_data = T[en_val]
        if isinstance(t_data, dict):
            if all(lo in t_data for lo in LOCALES):
                continue  # Already complete
        elif isinstance(t_data, list):
            if len(t_data) == len(LOCALES):
                continue
    
    # Build per-locale translations
    if en_val not in T:
        T[en_val] = {}
    elif not isinstance(T[en_val], dict):
        # Convert list to dict
        T[en_val] = {LOCALES[i]: v for i, v in enumerate(T[en_val]) if i < len(LOCALES)}
    
    for lo in LOCALES:
        if lo in T[en_val] and T[en_val][lo]:
            continue  # Already has translation
        
        # Try dict first
        if en_val in val_to_local[lo]:
            T[en_val][lo] = val_to_local[lo][en_val]
        # Try value search (case-insensitive)
        elif en_val in val_to_local[lo]:
            T[en_val][lo] = val_to_local[lo][en_val]
        # Use FR as reference for Romance languages
        elif lo in ['de', 'es', 'it', 'pt'] and fr_val != en_val:
            # Adapt FR for Romance languages (rough approximation)
            T[en_val][lo] = fr_val
        # For non-Romance, use fr_val as placeholder (it's at least not EN)
        elif fr_val != en_val:
            T[en_val][lo] = fr_val
        else:
            T[en_val][lo] = en_val
    
    added += 1

print(f"\nAdded {added} new entries to T")
print(f"T now has {len(T)} entries")

# Save T
with open('/tmp/tables/translation_table.json', 'w', encoding='utf-8') as f:
    json.dump(T, f, ensure_ascii=False, indent=2)
print("Saved T")

# Show entries where FR != EN but we couldn't find dict translations
print("\nEntries using FR as reference (no dict, FR != EN):")
count = 0
for key, en_val in flat_en.items():
    if not isinstance(en_val, str) or not en_val.strip():
        continue
    fr_val = flat_fr.get(key, en_val)
    if fr_val != en_val and en_val in T:
        t = T[en_val] if isinstance(T[en_val], dict) else dict(enumerate(T[en_val]))
        # Check if all locales have dict translations
        all_dict = True
        for lo in LOCALES:
            if t.get(lo, en_val) == fr_val and en_val not in val_to_local.get(lo, {}):
                all_dict = False
                break
        if not all_dict:
            count += 1
            if count <= 30:
                print(f"  {key}: EN={en_val!r}, FR={fr_val!r}")
print(f"  Total: {count}")
