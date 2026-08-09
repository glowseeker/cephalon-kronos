#!/usr/bin/env python3
"""
Apply translations to descendia/dash keys that have 'ui.' prefix in the JSON.
These are keys stored as ui['ui.dashboard.xxx'] in the locale JSON files.
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']
T_path = '/tmp/tables/translation_table.json'
T = json.load(open(T_path, encoding='utf-8'))

# Load all locale files
files = {}
for lo in ['en','fr'] + LOCALES:
    files[lo] = json.load(open(f'src/lib/i18n/{lo}.json', encoding='utf-8'))

# The 34 remaining EN values from apply_translations_v2.py output
# These are long description texts where FR has different (shorter) text
# We need to translate these based on the EN descriptions + FR reference

# From the unresolved list, extract the EN values and their keys
# The keys are in flat_ui format, but the actual JSON stores them as ui['ui.xxx.xxx']

# Get all ui keys that are still untranslated (de value == en value)
untranslated_with_prefix = []
en_ui = files['en'].get('ui', {})
de_ui = files['de'].get('ui', {})
for k, v in en_ui.items():
    if k.startswith('ui.') and k in de_ui and de_ui[k] == v and v not in ['', None]:
        fr_v = files['fr'].get('ui', {}).get(k, v)
        if fr_v != v:  # FR differs from EN — needs translation
            untranslated_with_prefix.append((k, v, fr_v))

print(f"Found {len(untranslated_with_prefix)} untranslated 'ui.'-prefixed keys where FR differs")

# Build translation table for these
# We'll translate based on EN description + FR reference
for k, en_val, fr_val in untranslated_with_prefix:
    if en_val in T:
        continue  # Already in T
    print(f"  {k}: EN={en_val!r}, FR={fr_val!r}")
