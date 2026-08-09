#!/usr/bin/env python3
"""
Comprehensive resolution: For all 182 untranslated descendia/penance/rivens/etc keys,
get FR translations from locale files and build translations for all 13 locales.
Uses FR as reference for UI text, dict files for game terms, keeps proper nouns in EN.
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

en = json.load(open('src/lib/i18n/en.json',encoding='utf-8'))
fr = json.load(open('src/lib/i18n/fr.json',encoding='utf-8'))
langs = {lo: json.load(open(f'src/lib/i18n/{lo}.json',encoding='utf-8')) for lo in LOCALES + ['fr']}

flat_en = dict(en.get('ui', {}))
flat_fr = dict(fr.get('ui', {}))
flat = {lo: dict(langs[lo].get('ui', {})) for lo in LOCALES + ['fr']}

# Also check non-flattened sections
for sec in ['relics','rivens','mastery','collectibles','settings','adversaries']:
    s_en = en.get(sec, {})
    s_fr = fr.get(sec, {})
    if isinstance(s_en, dict):
        for k, v in s_en.items():
            flat_en[f'{sec}.{k}'] = v
            flat_fr[f'{sec}.{k}'] = s_fr.get(k, v)
    for lo in LOCALES:
        s_lo = langs[lo].get(sec, {})
        if isinstance(s_lo, dict):
            for k, v in s_en.items():
                flat.setdefault(lo, {})[f'{sec}.{k}'] = s_lo.get(k, v)

# Get all untranslated keys
remaining = {}
for k, en_val in flat_en.items():
    if not isinstance(en_val, str) or not en_val.strip():
        continue
    missing_locales = []
    for lo in LOCALES:
        lo_val = flat.get(lo, {}).get(k, en_val)
        if lo_val == en_val:
            missing_locales.append(lo)
    if missing_locales:
        fr_val = flat_fr.get(k, en_val)
        remaining[k] = (en_val, fr_val, missing_locales)

print(f"Total untranslated keys: {len(remaining)}")

# Categorize
proper_nouns = {'Rivens', "Albrecht's Notes", 'Parvos', 'Lyon', 'Oraxia', 'John Prodman',
                 'Marie', 'Roathe', 'Kaithe', 'Necramech', 'Archguns', 'Rockets',
                 'Descendia', 'Steel Path', 'N/A', 'Meta', 'Niche', 'Grade', 'Name',
                 'Platinum', 'All', 'All States', 'Challenge', 'Unveiled', 'Veiled',
                 'Riven weapons collection', 'Assassination', 'Archguns'}

# Save the data for manual review
with open('/tmp/tables/all_untranslated.json', 'w', encoding='utf-8') as f:
    data = [{
        'key': k,
        'en': en_val,
        'fr': fr_val,
        'missing': missing,
        'is_proper_noun': en_val in proper_nouns,
    } for k, (en_val, fr_val, missing) in sorted(remaining.items())]
    json.dump(data, f, ensure_ascii=False, indent=2)
print(f"Saved to /tmp/tables/all_untranslated.json")

# Show summary
for item in data[:20]:
    status = "PROPER" if item['is_proper_noun'] else "TRANSLATE"
    print(f"  [{status}] {item['key']}: EN={item['en']!r}, FR={item['fr']!r}")
print("...")
for item in data[-20:]:
    status = "PROPER" if item['is_proper_noun'] else "TRANSLATE"
    print(f"  [{status}] {item['key']}: EN={item['en']!r}, FR={item['fr']!r}")
