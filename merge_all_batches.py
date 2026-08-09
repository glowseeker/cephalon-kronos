#!/usr/bin/env python3
"""Merge all batch JSON files into T."""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
T = json.load(open('/tmp/tables/translation_table.json', encoding='utf-8'))
print(f"T had {len(T)} entries")

LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']
added = 0
for fname in ['translations_batch.json', 'translations_batch2.json', 'translations_batch3.json']:
    batch = json.load(open(fname, encoding='utf-8'))
    for en_val, translations in batch.items():
        if en_val not in T:
            if isinstance(translations, dict):
                T[en_val] = [translations.get(lo, en_val) for lo in LOCALES]
            else:
                T[en_val] = translations
            added += 1
    print(f"  {fname}: {len(batch)} entries, {added} total new")

with open('/tmp/tables/translation_table.json', 'w', encoding='utf-8') as f:
    json.dump(T, f, ensure_ascii=False, indent=2)
print(f"T now has {len(T)} entries")
