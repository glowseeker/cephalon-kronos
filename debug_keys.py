#!/usr/bin/env python3
"""Debug: check what keys EN values correspond to in ui_text_to_translate.json"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')

data = json.load(open('/tmp/tables/ui_text_to_translate.json', encoding='utf-8'))
# Show keys for a few entries we know should have translations
for en_val in ['1999 Calendar', 'Alert before (min)', 'Alerts', 'Deimos', 'Meso']:
    matches = [item for item in data if item['en'] == en_val][:3]
    for m in matches:
        print(f"EN: {en_val!r}, key: {m.get('key')!r}, locales: {m.get('locales', {})}")
    print()
