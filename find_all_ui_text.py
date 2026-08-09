#!/usr/bin/env python3
"""Find ALL entries where FR != EN and each locale still has EN value."""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

en = json.load(open('src/lib/i18n/en.json',encoding='utf-8'))
fr = json.load(open('src/lib/i18n/fr.json',encoding='utf-8'))
langs = {lo: json.load(open(f'src/lib/i18n/{lo}.json',encoding='utf-8')) for lo in LOCALES}

flat_en = dict(en.get('ui', {}))
flat_fr = dict(fr.get('ui', {}))
flat = {lo: dict(langs[lo].get('ui', {})) for lo in LOCALES}

# Find entries where FR != EN and EN value is missing in any locale
entries = []
for key, en_val in flat_en.items():
    if not isinstance(en_val, str) or not en_val.strip():
        continue
    fr_val = flat_fr.get(key, en_val)
    if fr_val == en_val:
        continue
    # Check which locales are missing (value == EN)
    missing = [lo for lo in LOCALES if flat[lo].get(key, en_val) == en_val]
    if missing:
        entries.append((key, en_val, fr_val, missing))

print(f"Total entries where FR != EN and some locale is missing: {len(entries)}")
for key, en_val, fr_val, missing in entries:
    print(f"  KEY: {key}")
    print(f"    EN: {en_val!r}")
    print(f"    FR: {fr_val!r}")
    print(f"    Missing: {missing}")

# Save to JSON for data file
data = [{
    'key': key,
    'en': en_val,
    'fr': fr_val,
    'missing': missing
} for key, en_val, fr_val, missing in entries]
with open('/tmp/tables/ui_text_to_translate.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print(f"\nSaved {len(data)} entries to /tmp/tables/ui_text_to_translate.json")
