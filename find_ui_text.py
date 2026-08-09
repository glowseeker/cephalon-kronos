#!/usr/bin/env python3
"""Find all 51 UI text entries where FR has translation but dict doesn't."""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

en = json.load(open('src/lib/i18n/en.json',encoding='utf-8'))
fr = json.load(open('src/lib/i18n/fr.json',encoding='utf-8'))
langs = {lo: json.load(open(f'src/lib/i18n/{lo}.json',encoding='utf-8')) for lo in LOCALES}

flat_en = dict(en.get('ui', {}))
flat_fr = dict(fr.get('ui', {}))
flat = {lo: dict(langs[lo].get('ui', {})) for lo in LOCALES}

# Find entries where FR != EN but dict doesn't have it
# These are UI text that needs translation
ui_text_entries = []
for key, en_val in flat_en.items():
    if not isinstance(en_val, str) or not en_val.strip():
        continue
    fr_val = flat_fr.get(key, en_val)
    if fr_val == en_val:
        continue
    # Check if any locale already has a non-EN translation
    has_some_translation = any(flat[lo].get(key, en_val) != en_val for lo in LOCALES)
    if not has_some_translation:
        ui_text_entries.append((key, en_val, fr_val))

print(f"UI text entries needing translation (FR != EN, no locale has translation): {len(ui_text_entries)}")
for key, en_val, fr_val in ui_text_entries:
    missing = [lo for lo in LOCALES if flat[lo].get(key, en_val) == en_val]
    print(f"  {key}: EN={en_val!r}, FR={fr_val!r}, missing={missing}")
