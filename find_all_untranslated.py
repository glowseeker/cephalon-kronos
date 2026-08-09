#!/usr/bin/env python3
"""Find all untranslated descendia/penance keys across all 13 locales."""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

en = json.load(open('src/lib/i18n/en.json',encoding='utf-8'))
flat_en = dict(en.get('ui', {}))

langs = {lo: json.load(open(f'src/lib/i18n/{lo}.json',encoding='utf-8')) for lo in LOCALES}
flat = {lo: dict(langs[lo].get('ui', {})) for lo in LOCALES}

# Find all descendia/penance keys where value differs from EN
all_untranslated = {}
for k, en_val in sorted(flat_en.items()):
    if ('descendia' not in k and 'penance' not in k and 'albrecht' not in k and 'riven' not in k):
        continue
    if isinstance(en_val, str) and en_val.strip():
        untranslated_locales = []
        for lo in LOCALES:
            lo_val = flat[lo].get(k, en_val)
            if lo_val == en_val:
                untranslated_locales.append(lo)
        if untranslated_locales:
            all_untranslated[k] = (en_val, untranslated_locales)

print(f"Total untranslated descendia/penance keys: {len(all_untranslated)}")
for k, (en_val, missing) in sorted(all_untranslated.items()):
    print(f"  {len(missing)} missing: {k} = {en_val!r}")
    print(f"    missing locales: {missing}")
