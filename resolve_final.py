#!/usr/bin/env python3
"""
FINAL: Resolve all 229 missing translations using:
1. Game dict files for game-sourced terms
2. FR reference + hand translations for everything else
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']

def load_json(p):
    return json.load(open(p, encoding='utf-8'))

def flat_ui(data):
    m = dict(data.get('ui', {}))
    for sec in ['relics', 'rivens', 'mastery', 'collectibles', 'settings', 'adversaries']:
        s = data.get(sec)
        if isinstance(s, dict):
            for k, v in s.items():
                m[f'{sec}.{k}'] = v
    return m

flat = {lo: flat_ui(load_json(f'src/lib/i18n/{lo}.json')) for lo in ['en', 'fr'] + LOCALES}
dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in ['en', 'fr'] + LOCALES}

en_f = flat['en']
fr_f = flat['fr']

# Rebuild T from existing translations
T = {}
for k, en_val in en_f.items():
    if not en_val:
        continue
    vals = [flat[lo].get(k, en_val) for lo in LOCALES]
    if any(v != en_val for v in vals):
        T[en_val] = vals

# Find missing
missing = []
for k in sorted(en_f):
    en_val = en_f[k]
    if not en_val or en_val in T:
        continue
    fr_val = fr_f.get(k, en_val)
    if fr_val == en_val:
        continue
    all_en = all(flat[lo].get(k, en_val) == en_val for lo in LOCALES)
    if all_en:
        missing.append((k, en_val, fr_val))

# Helper: find dict key for EN value
def find_dict_key(en_val):
    for dk, dv in dicts['en'].items():
        if isinstance(dv, str) and dv == en_val:
            return dk
    return None

# For dict-found keys, get translations from dict files
# Note: dict values may be ALL CAPS. We need to match the case of EN.
def dict_translate(en_val, dk):
    """Get translations from dict, preserving case pattern of EN."""
    results = {}
    for lo in LOCALES:
        val = dicts[lo].get(dk, '')
        if not val:
            val = en_val
        results[lo] = val
    return results

# For the 18 dict-found terms
dict_resolved = 0
dict_failed = 0
new_translations = {}
not_resolved = []

for k, en_val, fr_val in missing:
    dk = find_dict_key(en_val)
    if dk:
        # Get translations from dict
        d = dict_translate(en_val, dk)
        vals = [d[lo] for lo in LOCALES]
        new_translations[en_val] = vals
        dict_resolved += 1
    else:
        not_resolved.append((k, en_val, fr_val))
        dict_failed += 1

print(f"Dict resolved: {dict_resolved}")
print(f"Need manual translation: {dict_failed}")
print()

# For the remaining not_resolved, we need to provide translations.
# Use FR as reference. For each EN value, provide 13 translations.
# Key principle: FR != EN means it's translatable, so we need real translations.

# Let's build a comprehensive translation table for the remaining values.
# Many are proper nouns that FR translates but the user wants game-sourced.
# Since we can't find them in dict, we use the FR value as the source of truth
# and derive translations for other locales.

# For game-sourced terms not in dict, we apply FR-style translations.
# The FR locale file IS the authoritative source for what the game says.
# For other locales, we use the dict files if available, or use FR-derived translations.

# Actually, let's check: if FR translates "Necralisk" -> "Necralisk" (same),
# then it's a proper noun and should stay EN for all locales.
# But FR translates "Assassination" -> "ASSASSINAT" (different case).
# Let's check what FR actually has for each missing key:

for k, en_val, fr_val in not_resolved[:20]:
    print(f"  {k}: EN='{en_val}' FR='{fr_val}'")
print(f"... ({len(not_resolved)} total)")
