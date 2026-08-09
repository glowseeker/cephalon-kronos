#!/usr/bin/env python3
"""Merge translations_batch.json into T."""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
T_path = '/tmp/tables/translation_table.json'
T = json.load(open(T_path, encoding='utf-8'))
print(f"T had {len(T)} entries before")

batch = json.load(open('translations_batch.json', encoding='utf-8'))
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

added = 0
for en_val, translations in batch.items():
    if en_val not in T:
        # translations could be a list (already in locale order) or a dict
        if isinstance(translations, dict):
            T[en_val] = [translations.get(lo, en_val) for lo in LOCALES]
        else:
            T[en_val] = translations  # already a list
        added += 1

print(f"Added {added} new entries")
print(f"T now has {len(T)} entries")

with open(T_path, 'w', encoding='utf-8') as f:
    json.dump(T, f, ensure_ascii=False, indent=2)
print("Saved")
