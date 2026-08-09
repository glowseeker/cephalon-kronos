#!/usr/bin/env python3
"""
Generate complete translation tables for all 13 locales based on the 342 common
untranslated keys. Uses FR translations as reference and applies language-appropriate
rendering. Output: translations_complete.json
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')

LOCALES = ['de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def flat_ui(data):
    m = dict(data.get('ui', {}))
    for sec in ['relics', 'rivens', 'mastery', 'collectibles', 'settings', 'adversaries']:
        s = data.get(sec)
        if isinstance(s, dict):
            for k, v in s.items():
                m[f'{sec}.{k}'] = v
    return m

en_data = load_json('src/lib/i18n/en.json')
fr_data = load_json('src/lib/i18n/fr.json')
en_m = flat_ui(en_data)
fr_m = flat_ui(fr_data)

# Identify all keys still == EN across ALL 13 locales
scopes = {}
for lo in LOCALES:
    lo_m = flat_ui(load_json(f'src/lib/i18n/{lo}.json'))
    scopes[lo] = set(k for k in en_m if lo_m.get(k) == en_m[k])

common = set(scopes[LOCALES[0]])
for lo in LOCALES[1:]:
    common &= scopes[lo]

# Build {key: {locale: value}} table
T = {}

def get_fr(key):
    return fr_m.get(key, en_m[key])

# Proper nouns/loanwords: keep EN for ALL locales
PROPER_NOUNS = {
    'about.discord', 'about.github', 'about.title',
    'adversaries.rank',
    'badge_evolved', 'badge_mod', 'badge_not_evolved', 'badge_owned',
    'badge_prime_part', 'badge_unmastered', 'badge_unowned',
    'cat_amps',  # Amps - translatable but let's check
    'cat_arcanes', 'cat_archweapons', 'cat_arcwing', 'cat_ayatan',
    'cat_beasts', 'cat_companions', 'cat_consumables', 'cat_exotic',
    'cat_hounds', 'cat_kdrives', 'cat_kits', 'cat_moas', 'cat_mods',
    'cat_necramechs', 'cat_prime_parts', 'cat_relics', 'cat_resources',
    'cat_rivens', 'cat_sentinels', 'cat_vehicles', 'cat_warframes', 'cat_zaws',
    'catalysts', 'credits', 'endo', 'filled',
    'mastery.mp', 'mastery.mp_close', 'mastery.mp_short', 'mastery.mp_value',
    'none_owned',
    'notes.lang_css', 'notes.lang_html', 'notes.lang_js', 'notes.lang_json',
    'notes.lang_jsx', 'notes.lang_py', 'notes.lang_rs', 'notes.lang_ts', 'notes.lang_tsx',
    'platinum', 'reactors',
    'relics.all', 'relics.era_label', 'relics.platinum', 'relics.sort_name',
    'riven_card.na', 'riven_card.plat_short', 'riven_card.tier_label',
    'riven_card.weapon_rank',
    'rivens.sort_grade', 'rivens.sort_name', 'rivens.sort_plat', 'rivens.type_all',
    'rivens.type_archgun', 'rivens.type_kitgun', 'rivens.type_melee', 'rivens.type_zaw',
    'settings.sidebar_left', 'settings.sidebar_right',
    'sync.waiting',
    'ui.dashboard.card_1999',  # Nexus 1999 - proper noun
    'ui.dashboard.checkpoint',  # CHECKPOINT
    'ui.dashboard.descendia_penance_oraxia',  # Oraxia - proper noun
    'ui.dashboard.descendia_penance_wisp',  # Marie - proper noun
    'ui.dashboard.descendia_penance_john_prodman',  # John Prodman - proper noun
    'ui.dashboard.inf',  # INF.
    'ui.elements.gas', 'ui.inf': 'INF',  # placeholder
    'ui.relic_reward.bp',  # BP
    'ui.relic_reward.top_ducat_ev', 'ui.relic_reward.top_plat_ev',
    'ui.relic_reward.platinum',
    'ui.raven_card': 'placeholder',
}

# Actually, let me just use FR reference and build from there.
# For proper nouns, FR keeps them EN too, so I can detect...
# But FR has 'Warframes' -> 'Warframes' (kept EN as loanword).
# Let me just use fr_m values directly when they match en_m (proper nouns)
# and translate otherwise.

# Actually, the simplest approach: use FR as the base translation for Romance langs
# and translate for others. But FR is only complete for the 342 + what was already done.
# Let me just build the full table with actual translations.

# I'll define translations keyed by key, using a helper that fills remaining locales
# with the FR value (for Romance langs) or EN (for proper nouns).

# Let me define per-key translations where FR differs from EN.
# For keys where fr_val == en_val (proper nouns), all locales keep EN.

ROMANCE = ['es', 'it', 'pt']  # Share similar translations
# German is somewhat close but needs its own
# Slavic: pl, ru, uk
# Asian: ja, ko, tc, zh, th

# Build the table
for key in sorted(common):
    en_val = en_m[key]
    fr_val = fr_m.get(key, en_val)
    
    entry = {}
    
    # If FR value == EN value, it's a proper noun - keep EN everywhere
    if fr_val == en_val:
        # Could still translate for non-Romance langs (e.g. German might translate "Mods")
        # But since FR keeps it EN, and user's rule is "resolve from dict at runtime"
        # for game terms, we keep EN for true proper nouns.
        # For UI terms that happen to be EN in FR too, we might still translate.
        # Let's check: 'Mods' is EN in FR? Let's handle case by case below.
        # For now, skip (keep EN)
        pass
    else:
        # FR translated it - use for Romance, translate for others
        # But we need actual translations, not just FR->X
        # Let me just use a comprehensive lookup

    T[key] = entry

# This is getting too complex for inline. Let me write the actual translation data.
# The FR values ARE the translations for fr. For other locales, I need separate translations.

print(f"Need to translate {len(common)} keys × {len(LOCALES)} locales = {len(common) * len(LOCALES)} entries")
print(f"Of these, keys where FR == EN (proper nouns): ", end='')

proper_count = sum(1 for k in common if fr_m.get(k, en_m[k]) == en_m[k])
translatable = len(common) - proper_count
print(f"{proper_count} (keep EN), {translatable} need actual translation")
print(f"Actual translations needed: {translatable} × {len(LOCALES)} = {translatable * len(LOCALES)} entries")
