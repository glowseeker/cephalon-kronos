#!/usr/bin/env python3
"""
Apply all translations to locale files.
Uses: /tmp/tables/translation_table.json (the 97 entries already generated)
Then adds proper-noun handling + additional translations.
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def flat_ui(data):
    """Flatten ui section + 6 flattened sections into a flat dict."""
    m = dict(data.get('ui', {}))
    for sec in ['relics', 'rivens', 'mastery', 'collectibles', 'settings', 'adversaries']:
        s = data.get(sec)
        if isinstance(s, dict):
            for k, v in s.items():
                m[f'{sec}.{k}'] = v
    return m

# Load locale files
files = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in ['en', 'fr'] + LOCALES}
flats = {lo: flat_ui(files[lo]) for lo in ['en', 'fr'] + LOCALES}

# Load translation table
T = json.load(open('/tmp/tables/translation_table.json', encoding='utf-8'))

# Find untranslated keys (where locale value == EN value, but FR value != EN value)
# These are the keys that need translation
untranslated = {}
all_keys = set(flats['en'].keys())
for k in sorted(all_keys):
    en_val = flats['en'].get(k, '')
    fr_val = flats['fr'].get(k, en_val)
    if fr_val != en_val:  # FR has a different (translated) value -> translatable
        for lo in LOCALES:
            lv = flats[lo].get(k, en_val)
            if lv == en_val:  # locale still has EN value
                untranslated.setdefault(k, {'en': en_val, 'fr': fr_val})
                break

print(f"Keys needing translation: {len(untranslated)}")

# Apply translations
applied = 0
for key, info in untranslated.items():
    en_val = info['en']
    if en_val not in T:
        continue  # Proper noun or unknown - skip (keep EN)
    vals = T[en_val]
    for lo in LOCALES:
        file = files[lo]
        # Navigate the key path
        parts = key.split('.', 1)
        if parts[0] in ['relics', 'rivens', 'mastery', 'collectibles', 'settings', 'adversaries']:
            sec = parts[0]
            k = parts[1]
            file = files[lo]
            current = file.get(sec, {}).get(k, '')
            if current == en_val:
                idx = LOCALES.index(lo)
                file.setdefault(sec, {})[k] = vals[idx]
                applied += 1
        elif key.startswith('ui.dashboard.') and '.' in key[len('ui.dashboard.'):]:
            # Nested ui.dashboard key
            file = files[lo]
            # Navigate: file['ui']['dashboard'][subkey]
            sub_key = key[len('ui.dashboard.'):]
            ui = file.setdefault('ui', {})
            dash = ui.setdefault('dashboard', {})
            current = dash.get(sub_key, '')
            if current == en_val:
                idx = LOCALES.index(lo)
                dash[sub_key] = vals[idx]
                applied += 1
        elif key.startswith('ui.'):
            # Flat ui.* key
            file = files[lo]
            ui = file.setdefault('ui', {})
            current = ui.get(key, '')
            if current == en_val:
                idx = LOCALES.index(lo)
                ui[key] = vals[idx]
                applied += 1
        elif key in file:
            # Top-level key
            file = files[lo]
            current = file.get(key, '')
            if current == en_val:
                idx = LOCALES.index(lo)
                file[key] = vals[idx]
                applied += 1

# Save all locale files
for lo in ['en', 'fr'] + LOCALES:
    outpath = f'src/lib/i18n/{lo}.json'
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(files[lo], f, ensure_ascii=False, indent=2)

# Verify
print(f"\nApplied {applied} new translations")
print("\nRemaining EN values per locale:")
for lo in LOCALES:
    flat = flat_ui(load_json(f'src/lib/i18n/{lo}.json'))
    en_flat = flat_ui(load_json('src/lib/i18n/en.json'))
    remaining = sum(1 for k in flat if k in en_flat and flat[k] == en_flat[k])
    print(f"  {lo}: {remaining}/{len(en_flat)} still EN")
