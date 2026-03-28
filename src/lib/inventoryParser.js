/**
 * inventoryParser.js
 *
 * Parses raw inventory.json from Warframe using local export data.
 */

// Riven tag data ported from calamity-inc/warframe-riven-info/riven_tags.json
// Contains per-weapon-type base values, prefixes, and suffixes for all riven stats.
const RIVEN_TAGS = { "LotusArchgunRandomModRare": [{ "tag": "WeaponArmorPiercingDamageMod", "value": 0.01, "prefix": "insi", "suffix": "cak" }, { "tag": "WeaponCritChanceMod", "value": 0.0111, "prefix": "crita", "suffix": "cron" }, { "tag": "WeaponCritDamageMod", "value": 0.0089, "prefix": "acri", "suffix": "tis" }, { "tag": "WeaponElectricityDamageMod", "value": 0.0133, "prefix": "vexi", "suffix": "tio" }, { "tag": "WeaponFireDamageMod", "value": 0.0133, "prefix": "igni", "suffix": "pha" }, { "tag": "WeaponFireRateMod", "value": 0.00667, "prefix": "croni", "suffix": "dra" }, { "tag": "WeaponFreezeDamageMod", "value": 0.0133, "prefix": "geli", "suffix": "do" }, { "tag": "WeaponImpactDamageMod", "value": 0.01, "prefix": "magna", "suffix": "ton" }, { "tag": "WeaponProcTimeMod", "value": 0.01111, "prefix": "deci", "suffix": "des" }, { "tag": "WeaponSlashDamageMod", "value": 0.01, "prefix": "sci", "suffix": "sus" }, { "tag": "WeaponStunChanceMod", "value": 0.0067, "prefix": "hexa", "suffix": "dex" }, { "tag": "WeaponToxinDamageMod", "value": 0.0133, "prefix": "toxi", "suffix": "tox" }, { "tag": "WeaponAmmoMaxMod", "value": 0.0111, "prefix": "ampi", "suffix": "bin" }, { "tag": "WeaponClipMaxMod", "value": 0.0067, "prefix": "arma", "suffix": "tin" }, { "tag": "WeaponDamageAmountMod", "value": 0.0111, "prefix": "visi", "suffix": "ata" }, { "tag": "WeaponFireIterationsMod", "value": 0.0067, "prefix": "sati", "suffix": "can" }, { "tag": "WeaponPunctureDepthMod", "value": 0.03, "prefix": "lexi", "suffix": "nok" }, { "tag": "WeaponRecoilReductionMod", "value": -0.01, "prefix": "zeti", "suffix": "mag" }, { "tag": "WeaponReloadSpeedMod", "value": 0.0111, "prefix": "feva", "suffix": "tak" }, { "tag": "WeaponFactionDamageCorpus", "value": 0.005, "prefix": "manti", "suffix": "tron" }, { "tag": "WeaponFactionDamageGrineer", "value": 0.005, "prefix": "argi", "suffix": "con" }, { "tag": "WeaponZoomFovMod", "value": 0.006666, "prefix": "hera", "suffix": "lis" }], "LotusModularMeleeRandomModRare": [{ "tag": "WeaponMeleeDamageMod", "value": 0.0183, "prefix": "visi", "suffix": "ata" }, { "tag": "WeaponArmorPiercingDamageMod", "value": 0.0133, "prefix": "insi", "suffix": "cak" }, { "tag": "WeaponImpactDamageMod", "value": 0.0133, "prefix": "magna", "suffix": "ton" }, { "tag": "WeaponSlashDamageMod", "value": 0.0133, "prefix": "sci", "suffix": "sus" }, { "tag": "WeaponCritChanceMod", "value": 0.02, "prefix": "crita", "suffix": "cron" }, { "tag": "WeaponCritDamageMod", "value": 0.01, "prefix": "acri", "suffix": "tis" }, { "tag": "WeaponElectricityDamageMod", "value": 0.01, "prefix": "vexi", "suffix": "tio" }, { "tag": "WeaponFireDamageMod", "value": 0.01, "prefix": "igni", "suffix": "pha" }, { "tag": "WeaponFreezeDamageMod", "value": 0.01, "prefix": "geli", "suffix": "do" }, { "tag": "WeaponToxinDamageMod", "value": 0.01, "prefix": "toxi", "suffix": "tox" }, { "tag": "WeaponProcTimeMod", "value": 0.01111, "prefix": "deci", "suffix": "des" }, { "tag": "WeaponMeleeFactionDamageCorpus", "value": 0.005, "prefix": "manti", "suffix": "tron" }, { "tag": "WeaponMeleeFactionDamageGrineer", "value": 0.005, "prefix": "argi", "suffix": "con" }, { "tag": "WeaponMeleeFactionDamageInfested", "value": 0.005, "prefix": "pura", "suffix": "ada" }, { "tag": "WeaponFireRateMod", "value": 0.0061, "prefix": "croni", "suffix": "dra" }, { "tag": "WeaponStunChanceMod", "value": 0.01, "prefix": "hexa", "suffix": "dex" }, { "tag": "ComboDurationMod", "value": 0.09, "prefix": "tempi", "suffix": "nem" }, { "tag": "SlideAttackCritChanceMod", "value": 0.013334, "prefix": "pleci", "suffix": "nent" }, { "tag": "WeaponMeleeRangeIncMod", "value": 0.02158, "prefix": "locti", "suffix": "tor" }, { "tag": "WeaponMeleeFinisherDamageMod", "value": 0.0133, "prefix": "exi", "suffix": "cta" }, { "tag": "WeaponMeleeComboEfficiencyMod", "value": 0.00816, "prefix": "forti", "suffix": "us" }, { "tag": "WeaponMeleeComboInitialBonusMod", "value": 0.27224, "prefix": "para", "suffix": "um" }, { "tag": "WeaponMeleeComboPointsOnHitMod", "value": -0.01165 }, { "tag": "WeaponMeleeComboBonusOnHitMod", "value": 0.00653, "prefix": "laci", "suffix": "nus" }], "LotusModularPistolRandomModRare": [{ "tag": "WeaponArmorPiercingDamageMod", "value": 0.01333, "prefix": "insi", "suffix": "cak" }, { "tag": "WeaponCritChanceMod", "value": 0.016666, "prefix": "crita", "suffix": "cron" }, { "tag": "WeaponCritDamageMod", "value": 0.01, "prefix": "acri", "suffix": "tis" }, { "tag": "WeaponElectricityDamageMod", "value": 0.01, "prefix": "vexi", "suffix": "tio" }, { "tag": "WeaponFireDamageMod", "value": 0.01, "prefix": "igni", "suffix": "pha" }, { "tag": "WeaponFireRateMod", "value": 0.0083, "prefix": "croni", "suffix": "dra" }, { "tag": "WeaponFreezeDamageMod", "value": 0.01, "prefix": "geli", "suffix": "do" }, { "tag": "WeaponImpactDamageMod", "value": 0.013333, "prefix": "magna", "suffix": "ton" }, { "tag": "WeaponProcTimeMod", "value": 0.01111, "prefix": "deci", "suffix": "des" }, { "tag": "WeaponSlashDamageMod", "value": 0.013333, "prefix": "sci", "suffix": "sus" }, { "tag": "WeaponStunChanceMod", "value": 0.01, "prefix": "hexa", "suffix": "dex" }, { "tag": "WeaponToxinDamageMod", "value": 0.01, "prefix": "toxi", "suffix": "tox" }, { "tag": "WeaponAmmoMaxMod", "value": 0.01, "prefix": "ampi", "suffix": "bin" }, { "tag": "WeaponClipMaxMod", "value": 0.005555, "prefix": "arma", "suffix": "tin" }, { "tag": "WeaponDamageAmountMod", "value": 0.0244, "prefix": "visi", "suffix": "ata" }, { "tag": "WeaponFireIterationsMod", "value": 0.0133, "prefix": "sati", "suffix": "can" }, { "tag": "WeaponProjectileSpeedMod", "value": 0.01, "prefix": "conci", "suffix": "nak" }, { "tag": "WeaponPunctureDepthMod", "value": 0.03, "prefix": "lexi", "suffix": "nok" }, { "tag": "WeaponRecoilReductionMod", "value": -0.01, "prefix": "zeti", "suffix": "mag" }, { "tag": "WeaponReloadSpeedMod", "value": 0.005555, "prefix": "feva", "suffix": "tak" }, { "tag": "WeaponFactionDamageCorpus", "value": 0.005, "prefix": "manti", "suffix": "tron" }, { "tag": "WeaponFactionDamageGrineer", "value": 0.005, "prefix": "argi", "suffix": "con" }, { "tag": "WeaponFactionDamageInfested", "value": 0.005, "prefix": "pura", "suffix": "ada" }, { "tag": "WeaponZoomFovMod", "value": 0.0089, "prefix": "hera", "suffix": "lis" }], "LotusPistolRandomModRare": [{ "tag": "WeaponArmorPiercingDamageMod", "value": 0.01333, "prefix": "insi", "suffix": "cak" }, { "tag": "WeaponCritChanceMod", "value": 0.016666, "prefix": "crita", "suffix": "cron" }, { "tag": "WeaponCritDamageMod", "value": 0.01, "prefix": "acri", "suffix": "tis" }, { "tag": "WeaponElectricityDamageMod", "value": 0.01, "prefix": "vexi", "suffix": "tio" }, { "tag": "WeaponFireDamageMod", "value": 0.01, "prefix": "igni", "suffix": "pha" }, { "tag": "WeaponFireRateMod", "value": 0.0083, "prefix": "croni", "suffix": "dra" }, { "tag": "WeaponFreezeDamageMod", "value": 0.01, "prefix": "geli", "suffix": "do" }, { "tag": "WeaponImpactDamageMod", "value": 0.013333, "prefix": "magna", "suffix": "ton" }, { "tag": "WeaponProcTimeMod", "value": 0.01111, "prefix": "deci", "suffix": "des" }, { "tag": "WeaponSlashDamageMod", "value": 0.013333, "prefix": "sci", "suffix": "sus" }, { "tag": "WeaponStunChanceMod", "value": 0.01, "prefix": "hexa", "suffix": "dex" }, { "tag": "WeaponToxinDamageMod", "value": 0.01, "prefix": "toxi", "suffix": "tox" }, { "tag": "WeaponAmmoMaxMod", "value": 0.01, "prefix": "ampi", "suffix": "bin" }, { "tag": "WeaponClipMaxMod", "value": 0.005555, "prefix": "arma", "suffix": "tin" }, { "tag": "WeaponDamageAmountMod", "value": 0.0244, "prefix": "visi", "suffix": "ata" }, { "tag": "WeaponFireIterationsMod", "value": 0.0133, "prefix": "sati", "suffix": "can" }, { "tag": "WeaponProjectileSpeedMod", "value": 0.01, "prefix": "conci", "suffix": "nak" }, { "tag": "WeaponPunctureDepthMod", "value": 0.03, "prefix": "lexi", "suffix": "nok" }, { "tag": "WeaponRecoilReductionMod", "value": -0.01, "prefix": "zeti", "suffix": "mag" }, { "tag": "WeaponReloadSpeedMod", "value": 0.005555, "prefix": "feva", "suffix": "tak" }, { "tag": "WeaponFactionDamageCorpus", "value": 0.005, "prefix": "manti", "suffix": "tron" }, { "tag": "WeaponFactionDamageGrineer", "value": 0.005, "prefix": "argi", "suffix": "con" }, { "tag": "WeaponFactionDamageInfested", "value": 0.005, "prefix": "pura", "suffix": "ada" }, { "tag": "WeaponZoomFovMod", "value": 0.0089, "prefix": "hera", "suffix": "lis" }], "LotusRifleRandomModRare": [{ "tag": "WeaponArmorPiercingDamageMod", "value": 0.01333, "prefix": "insi", "suffix": "cak" }, { "tag": "WeaponCritChanceMod", "value": 0.016666, "prefix": "crita", "suffix": "cron" }, { "tag": "WeaponCritDamageMod", "value": 0.013333, "prefix": "acri", "suffix": "tis" }, { "tag": "WeaponElectricityDamageMod", "value": 0.01, "prefix": "vexi", "suffix": "tio" }, { "tag": "WeaponFireDamageMod", "value": 0.01, "prefix": "igni", "suffix": "pha" }, { "tag": "WeaponFireRateMod", "value": 0.00667, "prefix": "croni", "suffix": "dra" }, { "tag": "WeaponFreezeDamageMod", "value": 0.01, "prefix": "geli", "suffix": "do" }, { "tag": "WeaponImpactDamageMod", "value": 0.013333, "prefix": "magna", "suffix": "ton" }, { "tag": "WeaponProcTimeMod", "value": 0.01111, "prefix": "deci", "suffix": "des" }, { "tag": "WeaponSlashDamageMod", "value": 0.013333, "prefix": "sci", "suffix": "sus" }, { "tag": "WeaponStunChanceMod", "value": 0.01, "prefix": "hexa", "suffix": "dex" }, { "tag": "WeaponToxinDamageMod", "value": 0.01, "prefix": "toxi", "suffix": "tox" }, { "tag": "WeaponAmmoMaxMod", "value": 0.00555, "prefix": "ampi", "suffix": "bin" }, { "tag": "WeaponClipMaxMod", "value": 0.005555, "prefix": "arma", "suffix": "tin" }, { "tag": "WeaponDamageAmountMod", "value": 0.018333, "prefix": "visi", "suffix": "ata" }, { "tag": "WeaponFireIterationsMod", "value": 0.01, "prefix": "sati", "suffix": "can" }, { "tag": "WeaponProjectileSpeedMod", "value": 0.01, "prefix": "conci", "suffix": "nak" }, { "tag": "WeaponPunctureDepthMod", "value": 0.03, "prefix": "lexi", "suffix": "nok" }, { "tag": "WeaponRecoilReductionMod", "value": -0.01, "prefix": "zeti", "suffix": "mag" }, { "tag": "WeaponReloadSpeedMod", "value": 0.005555, "prefix": "feva", "suffix": "tak" }, { "tag": "WeaponFactionDamageCorpus", "value": 0.005, "prefix": "manti", "suffix": "tron" }, { "tag": "WeaponFactionDamageGrineer", "value": 0.005, "prefix": "argi", "suffix": "con" }, { "tag": "WeaponFactionDamageInfested", "value": 0.005, "prefix": "pura", "suffix": "ada" }, { "tag": "WeaponZoomFovMod", "value": 0.006666, "prefix": "hera", "suffix": "lis" }], "LotusShotgunRandomModRare": [{ "tag": "WeaponArmorPiercingDamageMod", "value": 0.01333, "prefix": "insi", "suffix": "cak" }, { "tag": "WeaponCritChanceMod", "value": 0.01, "prefix": "crita", "suffix": "cron" }, { "tag": "WeaponCritDamageMod", "value": 0.01, "prefix": "acri", "suffix": "tis" }, { "tag": "WeaponElectricityDamageMod", "value": 0.01, "prefix": "vexi", "suffix": "tio" }, { "tag": "WeaponFireDamageMod", "value": 0.01, "prefix": "igni", "suffix": "pha" }, { "tag": "WeaponFireRateMod", "value": 0.01, "prefix": "croni", "suffix": "dra" }, { "tag": "WeaponFreezeDamageMod", "value": 0.01, "prefix": "geli", "suffix": "do" }, { "tag": "WeaponImpactDamageMod", "value": 0.013333, "prefix": "magna", "suffix": "ton" }, { "tag": "WeaponProcTimeMod", "value": 0.01111, "prefix": "deci", "suffix": "des" }, { "tag": "WeaponSlashDamageMod", "value": 0.013333, "prefix": "sci", "suffix": "sus" }, { "tag": "WeaponStunChanceMod", "value": 0.01, "prefix": "hexa", "suffix": "dex" }, { "tag": "WeaponToxinDamageMod", "value": 0.01, "prefix": "toxi", "suffix": "tox" }, { "tag": "WeaponAmmoMaxMod", "value": 0.01, "prefix": "ampi", "suffix": "bin" }, { "tag": "WeaponClipMaxMod", "value": 0.005555, "prefix": "arma", "suffix": "tin" }, { "tag": "WeaponDamageAmountMod", "value": 0.0183, "prefix": "visi", "suffix": "ata" }, { "tag": "WeaponFireIterationsMod", "value": 0.0133, "prefix": "sati", "suffix": "can" }, { "tag": "WeaponProjectileSpeedMod", "value": 0.01, "prefix": "conci", "suffix": "nak" }, { "tag": "WeaponPunctureDepthMod", "value": 0.03, "prefix": "lexi", "suffix": "nok" }, { "tag": "WeaponRecoilReductionMod", "value": -0.01, "prefix": "zeti", "suffix": "mag" }, { "tag": "WeaponReloadSpeedMod", "value": 0.005555, "prefix": "feva", "suffix": "tak" }, { "tag": "WeaponFactionDamageCorpus", "value": 0.005, "prefix": "manti", "suffix": "tron" }, { "tag": "WeaponFactionDamageGrineer", "value": 0.005, "prefix": "argi", "suffix": "con" }, { "tag": "WeaponFactionDamageInfested", "value": 0.005, "prefix": "pura", "suffix": "ada" }], "PlayerMeleeWeaponRandomModRare": [{ "tag": "WeaponMeleeDamageMod", "value": 0.0183, "prefix": "visi", "suffix": "ata" }, { "tag": "WeaponArmorPiercingDamageMod", "value": 0.0133, "prefix": "insi", "suffix": "cak" }, { "tag": "WeaponImpactDamageMod", "value": 0.0133, "prefix": "magna", "suffix": "ton" }, { "tag": "WeaponSlashDamageMod", "value": 0.0133, "prefix": "sci", "suffix": "sus" }, { "tag": "WeaponCritChanceMod", "value": 0.02, "prefix": "crita", "suffix": "cron" }, { "tag": "WeaponCritDamageMod", "value": 0.01, "prefix": "acri", "suffix": "tis" }, { "tag": "WeaponElectricityDamageMod", "value": 0.01, "prefix": "vexi", "suffix": "tio" }, { "tag": "WeaponFireDamageMod", "value": 0.01, "prefix": "igni", "suffix": "pha" }, { "tag": "WeaponFreezeDamageMod", "value": 0.01, "prefix": "geli", "suffix": "do" }, { "tag": "WeaponToxinDamageMod", "value": 0.01, "prefix": "toxi", "suffix": "tox" }, { "tag": "WeaponProcTimeMod", "value": 0.01111, "prefix": "deci", "suffix": "des" }, { "tag": "WeaponMeleeFactionDamageCorpus", "value": 0.005, "prefix": "manti", "suffix": "tron" }, { "tag": "WeaponMeleeFactionDamageGrineer", "value": 0.005, "prefix": "argi", "suffix": "con" }, { "tag": "WeaponMeleeFactionDamageInfested", "value": 0.005, "prefix": "pura", "suffix": "ada" }, { "tag": "WeaponFireRateMod", "value": 0.0061, "prefix": "croni", "suffix": "dra" }, { "tag": "WeaponStunChanceMod", "value": 0.01, "prefix": "hexa", "suffix": "dex" }, { "tag": "ComboDurationMod", "value": 0.09, "prefix": "tempi", "suffix": "nem" }, { "tag": "SlideAttackCritChanceMod", "value": 0.013334, "prefix": "pleci", "suffix": "nent" }, { "tag": "WeaponMeleeRangeIncMod", "value": 0.02158, "prefix": "locti", "suffix": "tor" }, { "tag": "WeaponMeleeFinisherDamageMod", "value": 0.0133, "prefix": "exi", "suffix": "cta" }, { "tag": "WeaponMeleeComboEfficiencyMod", "value": 0.00816, "prefix": "forti", "suffix": "us" }, { "tag": "WeaponMeleeComboInitialBonusMod", "value": 0.27224, "prefix": "para", "suffix": "um" }, { "tag": "WeaponMeleeComboPointsOnHitMod", "value": -0.01165 }, { "tag": "WeaponMeleeComboBonusOnHitMod", "value": 0.00653, "prefix": "laci", "suffix": "nus" }] };
// ─── Helpers ─────────────────────────────────────────────────────────────────

const RIVEN_STAT_MAP = {
  'WeaponMeleeDamageMod': 'Melee Damage',
  'WeaponCritChanceMod': 'Critical Chance',
  'WeaponCritDamageMod': 'Critical Damage',
  'WeaponSpeedMod': 'Attack Speed',
  'WeaponFireRateMod': 'Attack Speed',
  'WeaponStatusChanceMod': 'Status Chance',
  'WeaponStunChanceMod': 'Status Chance',
  'WeaponRangeMod': 'Range',
  'WeaponMeleeRangeIncMod': 'Range',
  'WeaponDamageAmountMod': 'Damage',
  'WeaponPunctureDamageMod': 'Puncture',
  'WeaponSlashDamageMod': 'Slash',
  'WeaponImpactDamageMod': 'Impact',
  'WeaponElectricityDamageMod': 'Electricity',
  'WeaponFireDamageMod': 'Heat',
  'WeaponFreezeDamageMod': 'Cold',
  'WeaponToxinDamageMod': 'Toxin',
  'WeaponRecoilReductionMod': 'Recoil',
  'WeaponReloadSpeedMod': 'Reload Speed',
  'WeaponClipMaxMod': 'Magazine Capacity',
  'WeaponAmmoMaxMod': 'Ammo Maximum',
  'WeaponCritFireRateBonusMod': 'Fire Rate',
  'WeaponChannelingDamageMod': 'Initial Combo',
  'WeaponMeleeComboDurationMod': 'Combo Duration',
  'WeaponMeleeComboChanceFromDot': 'Combo Count Chance',
  'WeaponMeleeFinisherDamageMod': 'Finisher Damage',
  'WeaponProjectileSpeedMod': 'Projectile Speed',
  'WeaponBeamDistanceMod': 'Beam Length',
  'WeaponMultishotMod': 'Multishot',
  'WeaponPunchThroughMod': 'Punch Through',
  'WeaponZoomFovMod': 'Zoom',
  'WeaponExplosionRadiusMod': 'Blast Radius',
  'InnateElectricityDamage': 'Electricity',
  'InnateFireDamage': 'Heat',
  'InnateFreezeDamage': 'Cold',
  'InnateToxinDamage': 'Toxin',
  'WeaponFireIterationsMod': 'Multishot',
  'WeaponArmorPiercingDamageMod': 'Puncture',
  'WeaponProcTimeMod': 'Status Duration',
  'WeaponPunctureDepthMod': 'Punch Through',
  'WeaponFactionDamageCorpus': 'Damage to Corpus',
  'WeaponFactionDamageGrineer': 'Damage to Grineer',
  'WeaponFactionDamageInfested': 'Damage to Infested',
  'WeaponMeleeFactionDamageCorpus': 'Damage to Corpus',
  'WeaponMeleeFactionDamageGrineer': 'Damage to Grineer',
  'WeaponMeleeFactionDamageInfested': 'Damage to Infested',
  'ComboDurationMod': 'Combo Duration',
  'SlideAttackCritChanceMod': 'Slide Crit Chance',
  'WeaponMeleeComboEfficiencyMod': 'Combo Efficiency',
  'WeaponMeleeComboInitialBonusMod': 'Initial Combo',
  'WeaponMeleeComboPointsOnHitMod': 'Combo Count',
  'WeaponMeleeComboBonusOnHitMod': 'Combo Count',
};

const RIVEN_AFFIXES = {
  'WeaponMeleeDamageMod': { pre: 'Visi', suf: 'ata' },
  'WeaponDamageAmountMod': { pre: 'Visi', suf: 'ata' },
  'WeaponCritChanceMod': { pre: 'Crita', suf: 'cron' },
  'WeaponCritDamageMod': { pre: 'Acri', suf: 'tis' },
  'WeaponFireRateMod': { pre: 'Croni', suf: 'dra' },
  'WeaponSpeedMod': { pre: 'Croni', suf: 'dra' },
  'WeaponStunChanceMod': { pre: 'Hexa', suf: 'dex' },
  'WeaponStatusChanceMod': { pre: 'Hexa', suf: 'dex' },
  'WeaponElectricityDamageMod': { pre: 'Vexi', suf: 'tio' },
  'WeaponFireDamageMod': { pre: 'Igni', suf: 'pha' },
  'WeaponFreezeDamageMod': { pre: 'Geli', suf: 'do' },
  'WeaponToxinDamageMod': { pre: 'Toxi', suf: 'tox' },
  'WeaponSlashDamageMod': { pre: 'Sci', suf: 'sus' },
  'WeaponPunctureDamageMod': { pre: 'Insi', suf: 'cak' },
  'WeaponImpactDamageMod': { pre: 'Magna', suf: 'ton' },
  'WeaponMultishotMod': { pre: 'Sati', suf: 'can' },
  'WeaponReloadSpeedMod': { pre: 'Feva', suf: 'tak' },
  'WeaponClipMaxMod': { pre: 'Arma', suf: 'tin' },
  'WeaponRangeMod': { pre: 'Locti', suf: 'tor' },
  'WeaponMeleeRangeIncMod': { pre: 'Locti', suf: 'tor' },
  'WeaponZoomFovMod': { pre: 'Hera', suf: 'lis' },
  'WeaponRecoilReductionMod': { pre: 'Zeti', suf: 'mag' },
  'WeaponProjectileSpeedMod': { pre: 'Conci', suf: 'nak' },
  'WeaponPunchThroughMod': { pre: 'Lexi', suf: 'nok' },
};

function getRankLimit(un, category) {
  if (category === 'necramechs') return 40;
  if (un?.includes('Paracesis')) return 40;
  if (un?.includes('Kuva') || un?.includes('Tenet')) return 40;
  return 30;
}

/**
 * Calculates the rank based on cumulative XP using the official formula:
 * For heavy items (Warframe, Companion, Vehicle): Total XP = rank² × 1000
 * For weapons: Total XP = rank² × 500
 * @param {number} xp - The cumulative Affinity (XP) the item has earned.
 * @param {string} category - The item's category (e.g., 'warframes', 'primary').
 * @param {string} un - The item's unique name (used for special cases like Paracesis).
 * @param {number} limit - The maximum possible rank for this item (30 or 40).
 * @returns {number} The correct rank (0-40).
 */
function calculateRank(xp, category, un, limit = 30) {
  if (!xp || xp <= 0) return 0;

  // Determine the XP multiplier based on item type
  const heavyCategories = [
    'warframes', 'companions', 'necramechs', 'archwings',
    'sentinels', 'moas', 'hounds', 'beasts', 'robotics', 'plexus', 'kdrives'
  ];
  const isHeavy = heavyCategories.includes(category);

  // The XP required for a given rank is: rank² * baseXPPerRank²
  // For heavy: 1000 per rank, for weapons: 500 per rank.
  const baseXPPerRank = isHeavy ? 1000 : 500;

  // Find the highest rank where cumulative required XP is <= the item's XP
  let rank = 0;
  for (let r = 1; r <= limit; r++) {
    // Cumulative XP needed to reach this rank from unranked
    const requiredXP = r * r * baseXPPerRank;
    if (xp >= requiredXP) {
      rank = r;
    } else {
      break;
    }
  }

  return rank;
}

function cleanName(name) {
  if (!name) return '';
  if (typeof name === 'string' && name.startsWith('/Lotus/')) return '';
  return name.replace(/<[^>]*>/g, '').trim();
}

function splitPascal(str) {
  return str
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
}

const FOLDER_OVERRIDES = {
  Harlequin: 'Mirage', Pirate: 'Hydroid', Tengu: 'Zephyr',
  Paladin: 'Oberon', Berserker: 'Valkyr', Priest: 'Trinity',
  Sandman: 'Equinox', Ranger: 'Ivara', AntiMatter: 'Limbo',
  Pacifist: 'Baruuk', Magician: 'Nyx', YinYang: 'Equinox',
  Trapper: 'Khora', Necro: 'Nekros', Dragon: 'Chroma',
  Brawler: 'Atlas', Cowgirl: 'Cyte-09',
  BrokenFrame: 'Broken Warframe',
  ConcreteFrame: 'Kullervo',
  Alchemist: 'Citrine', PaxDuviricus: 'Voruna',
  Infestation: 'Nidus', Geode: 'Gauss',
  IronFrame: 'Styanax', Frumentarius: 'Grendel',
  Devourer: 'Lavos', Choir: 'Octavia',
  Bard: 'Octavia', Odalisk: 'Caliban',
  Pagemaster: 'Xaku', Werewolf: 'Voruna',
  Glass: 'Gara', Temple: 'Whisper',
  Fairy: 'Wisp', Jade: 'Nyx',
};

function nameFromPath(path = '') {
  const parts = path.split('/').filter(Boolean);
  const leaf = parts.at(-1) ?? path;
  const folder = parts.at(-2) ?? '';

  if (FOLDER_OVERRIDES[folder]) {
    const suffix = leaf.match(/(Prime|Vandal|Wraith|Prisma|Kuva|Tenet|Umbra)$/i)?.[0] ?? '';
    return FOLDER_OVERRIDES[folder] + (suffix ? ' ' + suffix : '');
  }

  const stripped = leaf
    .replace(/(BaseSuit|PowerSuit|PrimeName|OperatorAmp|HoverboardSuit|MotorcyclePowerSuit|MoaPetPowerSuit|KubrowPet|KavatPet|SentientPet|Pet|Suit|Blueprint)$/g, '');
  return splitPascal(stripped).trim() || leaf;
}

function resolveName(un, dict, ...tables) {
  if (!un) return '';
  if (un.includes('DrifterPistol')) return 'Sirocco';

  // Try direct match or normalized path (stripping /StoreItems/)
  const normalized = un.replace('/StoreItems/', '/');
  for (const tbl of tables) {
    const entry = tbl?.[un] || tbl?.[normalized];
    if (!entry) continue;
    const locKey = entry.name ?? entry.displayName ?? '';
    if (locKey) {
      if (dict[locKey]) {
        const resolved = cleanName(dict[locKey]);
        if (resolved) return resolved;
      }
      if (!locKey.startsWith('/Lotus/')) {
        const cleaned = cleanName(locKey);
        if (cleaned) return cleaned;
      }
    }
  }

  // Handle Recipe paths (e.g. /Lotus/Types/Recipes/Helmets/BrawlerAltHelmetBlueprint)
  if (un.includes('/Recipes/')) {
    const leaf = un.split('/').pop().replace('Blueprint', '');
    if (FOLDER_OVERRIDES[leaf]) return FOLDER_OVERRIDES[leaf];
    // Try to find the associated item name by checking without "Blueprint"
    for (const tbl of tables) {
      if (!tbl) continue;
      const match = Object.keys(tbl).find(k => k.endsWith('/' + leaf));
      if (match && tbl[match].name) return cleanName(tbl[match].name);
    }
  }

  return cleanName(nameFromPath(un));
}

function resolveImage(un, ...tables) {
  // Check exact match first
  for (const tbl of tables) {
    if (!tbl) continue;
    const entry = tbl?.[un];
    if (entry && (entry.icon || entry.thumbnail)) {
      const icon = entry.icon ?? entry.thumbnail;
      return `https://browse.wf${icon.startsWith('/') ? '' : '/'}${icon}`;
    }
  }

  // If it's a recipe, try the leaf match
  if (un && un.includes('/Recipes/')) {
    const leaf = un.split('/').pop().replace('Blueprint', '');
    for (const tbl of tables) {
      if (!tbl) continue;
      const matchKey = Object.keys(tbl).find(k => k.endsWith('/' + leaf));
      if (matchKey && (tbl[matchKey]?.icon || tbl[matchKey]?.thumbnail)) {
        const icon = tbl[matchKey].icon ?? tbl[matchKey].thumbnail;
        return `https://browse.wf${icon.startsWith('/') ? '' : '/'}${icon}`;
      }
    }
  }
  return null;
}

function parseFP(raw) {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function rivenWeaponType(itemType = '') {
  const t = (itemType || '').toLowerCase();
  if (t.includes('modularmelee') || t.includes('zaw')) return 'zaw';
  if (t.includes('modularpistol') || t.includes('kitgun')) return 'kitgun';
  if (t.includes('melee')) return 'melee';
  if (t.includes('sniper')) return 'sniper';
  if (t.includes('shotgun')) return 'shotgun';
  if (t.includes('pistol') || t.includes('sidearm')) return 'pistol';
  if (t.includes('rifle') || t.includes('bow') || t.includes('launcher') || t.includes('speargun')) return 'rifle';
  if (t.includes('archgun')) return 'archgun';
  return 'unknown';
}

function resolveAmpComponents(sourceItem, dict, EW, ER) {
  const modParts = sourceItem?.ModularParts ?? [];
  if (modParts.length > 0) {
    return modParts.map(c => resolveName(c, dict, EW, ER)).filter(Boolean);
  }
  if (!sourceItem?.UpgradeFingerprint) return [];
  const fp = parseFP(sourceItem.UpgradeFingerprint);
  const compPaths = Array.isArray(fp.components) && fp.components.length > 0
    ? fp.components
    : Array.isArray(fp.ModularParts) && fp.ModularParts.length > 0
      ? fp.ModularParts
      : [];
  return compPaths.map(c => resolveName(c, dict, EW, ER)).filter(Boolean);
}

function resolveHoverboardComponents(sourceItem, dict, EW) {
  const modParts = sourceItem?.ModularParts ?? [];
  return modParts.map(c => resolveName(c, dict, EW)).filter(Boolean);
}

export function parseInventory(raw, exports) {
  if (!raw || typeof raw !== 'object' || !exports) return { all: [] };
  const dict = exports['dict.en'] ?? {};

  const toMap = (data, wrapperKey) => {
    if (!data) return {};
    let arr = data;
    if (typeof data === 'object' && !Array.isArray(data)) {
      if (wrapperKey && data[wrapperKey]) arr = data[wrapperKey];
      else {
        const keys = Object.keys(data);
        if (keys.length === 1) arr = data[keys[0]];
      }
    }
    if (Array.isArray(arr)) {
      const map = {};
      for (const item of arr) {
        const key = item.uniqueName || item.ItemType || item.name;
        if (key) map[key] = item;
      }
      return map;
    }
    return arr || {};
  };

  const EWf = toMap(exports.ExportWarframes, 'ExportWarframes');
  const EW = toMap(exports.ExportWeapons, 'ExportWeapons');
  const ES = toMap(exports.ExportSentinels, 'ExportSentinels');
  const EM = toMap(exports.ExportUpgrades, 'ExportUpgrades');
  const EA = toMap(exports.ExportArcanes, 'ExportArcanes');
  const ER = toMap(exports.ExportResources, 'ExportResources');
  const ERel = toMap(exports.ExportRelics, 'ExportRelics');
  const ERew = toMap(exports.ExportRewards, 'ExportRewards');

  const xpMap = {};
  (raw.XPInfo ?? []).forEach(i => {
    if (i.ItemType) xpMap[i.ItemType] = i.XP ?? 0;
  });

  const ownedItems = {};
  const processList = (list) => {
    for (const item of (list ?? [])) {
      const un = item.ItemType;
      if (!un) continue;
      if (!ownedItems[un]) ownedItems[un] = [];
      ownedItems[un].push(item);
    }
  };

  [
    raw.Suits, raw.LongGuns, raw.Pistols, raw.Melee,
    raw.Sentinels, raw.KubrowPets, raw.MoaPets, raw.SentinelWeapons,
    raw.SpaceMelee, raw.SpaceGuns, raw.MechSuits, raw.OperatorAmps,
    raw.SpaceSuits, raw.Hoverboards
  ].forEach(processList);

  const subsumedSet = new Set((raw.InfestedFoundry?.ConsumedSuits ?? []).map(s => s.s).filter(Boolean));
  const incarnonSet = new Set((raw.EvolutionProgress ?? []).map(e => e.ItemType).filter(Boolean));

  const createItem = (un, category, nameTbls, imgTbls, sourceItem = null) => {
    const xp = sourceItem?.XP ?? xpMap[un] ?? 0;
    const limit = getRankLimit(un, category);

    // For mods, prioritize rank from Fingerprint or Item data over XP calculation
    const fp = sourceItem?.UpgradeFingerprint ? parseFP(sourceItem.UpgradeFingerprint) : null;
    let rank = parseInt(fp?.lvl ?? sourceItem?.UpgradeLevel ?? -1, 10);

    if (rank === -1) {
      rank = calculateRank(xp, category, un, limit);
    }

    // Mastery XP is rank * (100 for weapons, 200 for heavy)
    const heavyCategories = [
      'warframes', 'companions', 'necramechs', 'archwings',
      'sentinels', 'moas', 'hounds', 'beasts', 'robotics', 'plexus', 'kdrives'
    ];
    const masteryPerRank = heavyCategories.includes(category) ? 200 : 100;
    const mastery_xp = rank * masteryPerRank;
    const max_mastery_xp = limit * masteryPerRank;
    const mastered = rank >= limit;

    let baseName = resolveName(un, dict, ...nameTbls);
    if (un.includes('/BoardSuit')) baseName = 'Merulina';

    let name = baseName;
    let image = resolveImage(un, ...imgTbls);

    const customName = sourceItem?.ItemName || sourceItem?.CustomName || sourceItem?.Details?.Name;
    if (customName && !customName.startsWith('/Lotus/') && customName !== name) {
      name = `${customName} (${baseName})`;
    }

    // Reuse fp from rank calculation
    let components = [];

    if (category === 'amps') {
      components = resolveAmpComponents(sourceItem, dict, EW, ER);
      const prismPart = sourceItem?.ModularParts?.[0] || parseFP(sourceItem.UpgradeFingerprint)?.ModularParts?.[0];
      if (prismPart) image = resolveImage(prismPart, EW, ER);
      if (un.includes('DrifterPistol')) name = 'Sirocco';
      else name = (customName && !customName.startsWith('/Lotus/')) ? customName : 'Operator Amp';
    } else {
      components = fp?.components?.map(c => resolveName(c, dict, EW, ES, ER, EA)) ?? [];
    }

    if (!image && fp?.components?.length > 0) {
      for (const compUn of fp.components) {
        image = resolveImage(compUn, EW, ES, ER, EWf, EA);
        if (image) break;
      }
    }

    return {
      unique_name: un,
      name,
      image,
      category,
      xp,
      rank,
      mastery_xp,
      owned: !!sourceItem || !!xpMap[un],
      mastered,
      subsumed: subsumedSet.has(un),
      is_incarnon: incarnonSet.has(un),
      quantity: sourceItem?.ItemCount ?? (sourceItem || xpMap[un] ? 1 : 0),
      formas: sourceItem?.FormaCount ?? 0,
      components,
      ...sourceItem
    };
  };

  const FOUNDER_ITEMS = new Set([
    '/Lotus/Powersuits/Excalibur/ExcaliburPrime',
    '/Lotus/Weapons/Tenno/Pistol/LatoPrime',
    '/Lotus/Weapons/Tenno/Melee/LongSword/SkanaPrime'
  ]);

  const processCategory = (map, category, nameTbls, imgTbls, filterFn = null) => {
    const results = [];
    for (const [un, entry] of Object.entries(map)) {
      if (filterFn && !filterFn(entry, un)) continue;
      const instances = ownedItems[un];
      if (!instances && FOUNDER_ITEMS.has(un)) continue;
      (instances ?? [null]).forEach(inst => results.push(createItem(un, category, nameTbls, imgTbls, inst)));
    }
    return results;
  };

  const warframes = processCategory(EWf, 'warframes', [EWf], [EWf],
    (e, un) => e.productCategory === 'Suits' && !un.includes('SpaceSuits') && !un.includes('MechSuits'));

  const weaponsRaw = processCategory(EW, 'weapons', [EW], [EW],
    (e) => !e.sentinel && !e.excludeFromCodex && !['SpaceGuns', 'SpaceMelee', 'SentinelWeapons'].includes(e.productCategory));

  const primary = [], secondary = [], melee = [], kitguns = [], zaws = [];
  weaponsRaw.forEach(i => {
    const e = EW[i.unique_name];
    const un = i.unique_name;
    if (un.includes('ModularPistol') || un.includes('ModularPrimary')) {
      i.category = 'kitguns';
      kitguns.push(i);
    } else if (un.includes('ModularMelee')) {
      i.category = 'zaws';
      zaws.push(i);
    } else if (e.productCategory === 'LongGuns' && e.noise) {
      // LongGuns: noise field present on real weapons; excludes bayonet-only melee attachments
      i.category = 'primary';
      i.weapon_type = 'primary';
      primary.push(i);
    } else if (e.productCategory === 'Pistols' && e.noise) {
      // Pistols: noise field absent on MOA/companion parts and kubrow antigens/mutagents
      i.category = 'secondary';
      i.weapon_type = 'secondary';
      secondary.push(i);
    } else if (e.productCategory === 'Melee' && e.damagePerShot) {
      // Melee: damagePerShot absent on Vinquibus bayonet attachment (which is a primary)
      i.category = 'melee';
      i.weapon_type = 'melee';
      melee.push(i);
    }
  });

  const companionsRaw = processCategory(ES, 'companions', [ES], [ES]);
  const sentinels = [], moas = [], hounds = [], beasts = [], robotics = [];

  // Beast Checklist unique names
  const venariNames = [
    '/Lotus/Powersuits/Khora/Kavat/KhoraKavatPowerSuit',
    '/Lotus/Powersuits/Khora/Kavat/KhoraPrimeKavatPowerSuit'
  ];

  companionsRaw.forEach(i => {
    const un = i.unique_name;
    const entry = ES[un];

    if (entry?.productCategory === 'Sentinels') {
      const item = { ...i, category: 'sentinels' };
      sentinels.push(item);
      robotics.push(item);
    } else if (un.includes('/Sentinels/MoaPets/')) {
      const item = { ...i, category: 'moas' };
      moas.push(item);
      robotics.push(item);
    } else if (un.includes('/Sentinels/ZanukaPets/')) {
      const item = { ...i, category: 'hounds' };
      hounds.push(item);
      robotics.push(item);
    } else if (entry?.productCategory === 'KubrowPets' || venariNames.includes(un)) {
      const beast = { ...i, category: 'beasts' };
      // Fix name order: createItem produces "CustomName (BaseName)", we want "BaseName (CustomName)"
      const parenIdx = beast.name.indexOf(' (');
      if (parenIdx > 0 && beast.name.endsWith(')')) {
        const custom = beast.name.slice(0, parenIdx);
        const base = beast.name.slice(parenIdx + 2, -1);
        beast.name = `${base} (${custom})`;
        beast.ownedCustomName = custom;
      }
      beasts.push(beast);
    }
  });

  const companion_weapons = processCategory(EW, 'companion_weapons', [EW], [EW], (e) => e.productCategory === 'SentinelWeapons');

  const archweapons = processCategory(EW, 'archweapons', [EW], [EW], (e) => ['SpaceGuns', 'SpaceMelee'].includes(e.productCategory))
    .map(i => { i.weapon_type = EW[i.unique_name].productCategory === 'SpaceGuns' ? 'archgun' : 'archmelee'; return i; });

  const necramechs = processCategory(EWf, 'necramechs', [EWf], [EWf], (e) => e.productCategory === 'MechSuits');

  const archwings = [], kdrives = [];
  Object.entries(EWf).filter(([, e]) => e.productCategory === 'SpaceSuits').forEach(([un]) => {
    (ownedItems[un] ?? [null]).forEach(inst => archwings.push(createItem(un, 'archwings', [EWf], [EWf], inst)));
  });
  if (raw.Hoverboards) {
    raw.Hoverboards.forEach(h => {
      const components = resolveHoverboardComponents(h, dict, EW);
      const deckPart = h.ModularParts?.[0];
      const baseName = deckPart ? resolveName(deckPart, dict, EW) : 'K-Drive';
      const image = deckPart ? resolveImage(deckPart, EW) : null;
      const customName = h.ItemName || h.CustomName || h.Details?.Name;
      const ownedCustomName = (customName && !customName.startsWith('/Lotus/') && customName !== baseName) ? customName : '';
      const displayName = ownedCustomName ? `${baseName} (${ownedCustomName})` : baseName;
      const item = createItem(h.ItemType, 'kdrives', [EW], [EW], h);
      kdrives.push({ ...item, name: displayName, ownedCustomName, image: image || item.image, components, vehicle_type: 'kdrive' });
    });
  }

  const plexus = (raw.XPInfo ?? [])
    .filter(i => i.ItemType?.includes('/RailJack/DefaultHarness'))
    .map(i => ({ ...createItem(i.ItemType, 'plexus', [EW], [EW], i), name: 'Railjack Plexus' }));

  const intrinsics = [];
  if (raw.PlayerSkills) {
    const rjKeys = ['LPS_TACTICAL', 'LPS_PILOTING', 'LPS_ENGINEERING', 'LPS_GUNNERY', 'LPS_COMMAND'];
    const driftKeys = ['LPS_DRIFT_RIDING', 'LPS_DRIFT_COMBAT', 'LPS_DRIFT_OPPORTUNITY', 'LPS_DRIFT_ENDURANCE'];

    rjKeys.forEach(k => {
      const rank = raw.PlayerSkills[k] ?? 0;
      intrinsics.push({
        name: `Railjack ${k.replace('LPS_', '').charAt(0) + k.replace('LPS_', '').slice(1).toLowerCase()}`,
        rank: rank,
        mastery_xp: rank * 1500,
        category: 'intrinsics',
        owned: true,
        mastered: rank >= 10
      });
    });

    driftKeys.forEach(k => {
      const rank = raw.PlayerSkills[k] ?? 0;
      intrinsics.push({
        name: `Drifter ${k.replace('LPS_DRIFT_', '').charAt(0) + k.replace('LPS_DRIFT_', '').slice(1).toLowerCase()}`,
        rank: rank,
        mastery_xp: rank * 1500,
        category: 'intrinsics',
        owned: true,
        mastered: rank >= 10
      });
    });
  } else {
    const parseIntrinsicSet = (data, prefix) => {
      if (!data || typeof data !== 'object') return [];
      return Object.entries(data).map(([key, rank]) => ({
        name: `${prefix} ${key}`,
        rank: rank,
        mastery_xp: rank * 1500,
        category: 'intrinsics',
        owned: true,
        mastered: rank >= 10
      }));
    };
    intrinsics.push(...parseIntrinsicSet(raw.PlayerIntrinsics, 'Railjack'));
    intrinsics.push(...parseIntrinsicSet(raw.ParadoxIntrinsics, 'Drifter'));
  }

  const ERegs = exports.ExportRegions ?? {};
  const missionTags = new Set((raw.Missions ?? []).map(m => m.Tag));
  const spTags = new Set((raw.Missions ?? []).filter(m => m.Tier === 1).map(m => m.Tag));

  // nodeType 0 = mission nodes, nodeType 7 = junctions (1000 XP each)
  // masteryExp field on nodeType 0 is the direct mastery XP value for that node (0 means no mastery)
  const starchartNodes = Object.entries(ERegs)
    .filter(([, v]) => v.nodeType === 0)
    .map(([tag, v]) => ({
      tag,
      name: dict[v.name] || v.name?.split('/').pop() || tag,
      system: dict[v.systemName] || v.systemName?.split('/').pop() || '',
      mastery_xp: v.masteryExp ?? 0,   // direct mastery XP for this node (0 = not a mastery node)
      played: missionTags.has(tag),
      sp_played: spTags.has(tag),
    }));

  // Junction nodes (nodeType 7) each grant 1000 mastery XP once completed
  const junctionNodes = Object.entries(ERegs)
    .filter(([, v]) => v.nodeType === 7)
    .map(([tag, v]) => ({
      tag,
      name: dict[v.name] || v.name?.split('/').pop() || tag,
      system: dict[v.systemName] || v.systemName?.split('/').pop() || '',
      mastery_xp: 1000,
      played: missionTags.has(tag),
      sp_played: spTags.has(tag),
      isJunction: true,
    }));

  // Only count mastery-eligible nodes (masteryExp > 0 for missions, always for junctions)
  const masteryMissionNodes = starchartNodes.filter(n => n.mastery_xp > 0);
  const allMasteryNodes = [...masteryMissionNodes, ...junctionNodes];

  const starchart = {
    nodes: [...starchartNodes, ...junctionNodes],  // all for display purposes
    masteryNodes: allMasteryNodes,                         // only mastery-eligible
    total: allMasteryNodes.length,
    origin: allMasteryNodes.filter(n => n.played).length,
    steel_path: allMasteryNodes.filter(n => n.sp_played).length,
    origin_xp: allMasteryNodes.filter(n => n.played).reduce((s, n) => s + n.mastery_xp, 0),
    steel_path_xp: allMasteryNodes.filter(n => n.sp_played).reduce((s, n) => s + n.mastery_xp, 0),
  };

  const ampMasteryItems = {};
  // Pass 1: build prismPath → highest-XP amp custom name map
  const prismCustomNameMap = {};
  (raw.OperatorAmps ?? []).forEach(a => {
    if (a.ItemType?.includes('DrifterPistol')) return;
    const parts = a.ModularParts ?? [];
    const barrel = parts.find(p => p.toLowerCase().includes('barrel')) ?? parts[2] ?? parts[0];
    if (!barrel) return;
    const existing = prismCustomNameMap[barrel];
    const xp = a.XP ?? 0;
    if (!existing || xp > existing.xp) {
      prismCustomNameMap[barrel] = { xp, name: a.ItemName || a.CustomName || '' };
    }
  });

  (raw.OperatorAmps ?? []).forEach(a => {
    const un = a.ItemType;
    let mKey = '';
    let mName = '';
    let prismPath = '';

    if (un?.includes('DrifterPistol')) {
      mKey = un;
      mName = 'Sirocco';
      prismPath = un;
    } else {
      const parts = a.ModularParts ?? (a.UpgradeFingerprint ? (parseFP(a.UpgradeFingerprint)?.ModularParts ?? []) : []);
      // Prism (barrel) is the part whose path contains 'barrel' (case-insensitive)
      prismPath = parts.find(p => p.toLowerCase().includes('barrel')) ?? parts[2] ?? parts[0];

      if (prismPath) {
        mKey = prismPath;
        mName = resolveName(prismPath, dict, EW);
        // Training amp barrel resolves to its internal name; normalise to "Mote Amp"
        if (un?.includes('TrainingAmp')) mName = 'Mote Amp';
      } else if (un?.includes('TrainingAmp')) {
        mKey = 'mote_amp';
        mName = 'Mote Amp';
        prismPath = 'mote_amp';
      }
    }

    if (!mKey) return;

    // Prefer XPInfo (per-prism mastery XP) over the individual amp's XP
    const xp = xpMap[prismPath] ?? a.XP ?? 0;
    const rank = calculateRank(xp, 'weapons', prismPath);
    const mastery_xp = rank * 100;
    const owned = xp > 0;
    const mastered = mastery_xp >= 3000;
    const image = resolveImage(prismPath, EW) || resolveImage(un, EW, ER);
    const ownedCustomName = prismCustomNameMap[prismPath]?.name ?? '';

    if (!ampMasteryItems[mKey] || xp > (ampMasteryItems[mKey].xp ?? 0)) {
      ampMasteryItems[mKey] = {
        unique_name: mKey,
        name: ownedCustomName ? `${mName} (${ownedCustomName})` : mName,
        image, category: 'amps',
        xp, rank, mastery_xp, owned, mastered,
        ownedCustomName,
        components: resolveAmpComponents(a, dict, EW, ER),
      };
    }
  });

  const amps = Object.values(ampMasteryItems);

  const arcanes = [], mods = [];
  const rawUpgrades = raw.RawUpgrades ?? [];
  const upgrades = raw.Upgrades ?? [];
  [...rawUpgrades, ...upgrades].forEach(u => {
    const un = u.ItemType;
    if (!un || un.includes('Randomized') || un.includes('RandomMod')) return;
    const isArcane = un.includes('CosmeticEnhancers') || un.includes('/Arcane/') || un.toLowerCase().includes('arcane');
    if (isArcane) {
      arcanes.push({
        unique_name: un,
        name: resolveName(un, dict, EA, EM) || nameFromPath(un),
        image: resolveImage(un, EA, EM),
        category: 'arcanes',
        quantity: u.ItemCount ?? 1,
        rank: u.UpgradeLevel ?? 0,
        owned: true,
      });
    } else {
      mods.push(createItem(un, 'mods', [EM], [EM], u));
    }
  });

  const resources = [], prime_parts = [];
  for (const item of (raw.MiscItems ?? [])) {
    const un = item.ItemType ?? '';
    if (un.includes('/Upgrades/Relic/')) continue;
    const name = resolveName(un, dict, ER, ERel);
    const isPrimePart = /Prime (Barrel|Receiver|Stock|Blade|Handle|Link|Neuroptics|Chassis|Systems|Blueprint|Carapace|Cerebrum)/i.test(name);
    const obj = { unique_name: un, name, image: resolveImage(un, ER, ERel), category: isPrimePart ? 'prime_parts' : 'resources', quantity: item.ItemCount ?? 1, owned: true };
    if (isPrimePart) prime_parts.push(obj);
    else resources.push(obj);
  }

  const relics = (raw.MiscItems ?? []).filter(i => i.ItemType?.includes('/Projections/') || i.ItemType?.includes('/Upgrades/Relic/')).map(item => {
    const un = item.ItemType;
    const entry = ERel[un];
    let name = relicNameFromPath(un, ERel);
    let rewards = [];
    let refinement = 'Intact';

    const qualityMap = {
      'VPQ_BRONZE': 'Intact',
      'VPQ_SILVER': 'Exceptional',
      'VPQ_GOLD': 'Flawless',
      'VPQ_PLATINUM': 'Radiant'
    };

    if (entry) {
      if (entry.quality && qualityMap[entry.quality]) {
        refinement = qualityMap[entry.quality];
      }

      // Resolve rewards from ExportRewards using rewardManifest
      if (entry.rewardManifest && ERew[entry.rewardManifest]) {
        const manifest = ERew[entry.rewardManifest];
        // manifest is typically [[{type, itemCount, rarity}, ...]]
        const rewardList = Array.isArray(manifest[0]) ? manifest[0] : (Array.isArray(manifest) ? manifest : []);
        rewards = rewardList.map(r => ({
          name: resolveName(r.type || r.rewardItem, dict, EW, ES, ER, EWf, EA, EM),
          rarity: r.rarity,
          tier: r.rarity === 'COMMON' ? 0 : (r.rarity === 'UNCOMMON' ? 1 : 2)
        }));
      } else if (Array.isArray(entry.relicRewards)) {
        rewards = entry.relicRewards.map(r => ({
          name: resolveName(r.rewardItem, dict, EW, ES, ER, EWf, EA, EM),
          rarity: r.rarity,
          tier: r.rarity === 'COMMON' ? 0 : (r.rarity === 'UNCOMMON' ? 1 : 2)
        }));
      }
    } else {
      // Fallback refinement from name
      const leaf = un.split('/').at(-1) ?? un;
      if (leaf.endsWith('Silver')) refinement = 'Exceptional';
      else if (leaf.endsWith('Gold')) refinement = 'Flawless';
      else if (leaf.endsWith('Platinum')) refinement = 'Radiant';
    }

    return {
      unique_name: un,
      name,
      image: resolveImage(un, ERel),
      category: 'relics',
      count: item.ItemCount ?? 1,
      owned: true,
      refinement,
      rewards
    };
  });

  const rivens = [
    ...(raw.RawUpgrades ?? []).filter(u => u.ItemType?.includes('Randomized') || u.ItemType?.includes('RandomMod')).map(u => ({
      unique_name: u.ItemType, image: null, category: 'rivens', weapon_type: rivenWeaponType(u.ItemType),
      name: `Veiled ${splitPascal(rivenWeaponType(u.ItemType))} Riven`, veiled: true, owned: true, quantity: u.ItemCount ?? 1
    })),
    ...(raw.Upgrades ?? []).filter(u => u.ItemType?.includes('Randomized')).map(u => {
      const fp = parseFP(u.UpgradeFingerprint);
      const weaponUn = fp.compat ?? fp.challenge?.compat ?? '';
      const weaponName = weaponUn ? resolveName(weaponUn, dict, EW) : 'Unknown';
      const isChallenge = !!fp.challenge;

      let challengeText = '';
      if (isChallenge) {
        const type = fp.challenge.Type || '';
        const baseKey = type.split('/').pop();
        const locKey = `/Lotus/Language/Challenges/Challenge_${baseKey}_Description`;
        const singleLocKey = `/Lotus/Language/Challenges/Challenge_${baseKey}_Single_Description`;

        let rawText = dict[locKey] || dict[singleLocKey] || baseKey;
        challengeText = rawText.replace(/\|COUNT\|/g, fp.challenge.Required || '1');

        if (fp.challenge.Complication) {
          const compBase = fp.challenge.Complication.split('/').pop();
          const compLocKey = `/Lotus/Language/Challenges/Challenge_Complication_${compBase}`;
          const compText = dict[compLocKey] || compBase;
          challengeText += ` ${compText}`;
        }

        challengeText = challengeText.replace(/<[^>]*>/g, '').trim();
      }


      // ── Riven stat formula ── (ported from calamity-inc/warframe-riven-info/RivenParser.js)
      //
      // rivenIntToFloat: maps Value ∈ [0, 0x3FFFFFFF] → [0, 1]
      // roll: lerp(0.9, 1.1, rivenIntToFloat(Value))  ← random multiplier per stat
      //
      // Buff:
      //   base * (1.5 * dispo * 10) * pow(1.25, nCurses) * roll * numBuffsAtten[nBuffs] * (lvl+1)
      //
      // Curse:
      //   base * -1 * (1.5 * dispo * 10) * roll * numBuffsCurseAtten[nBuffs] * numBuffsAtten[nCurses] * (lvl+1)
      //
      // numBuffsAtten      = [0, 1, 0.66, 0.5, 0.4, 0.35]
      // numBuffsCurseAtten = [0, 1, 0.33, 0.5, 1.25, 1.5]

      const RIVEN_INT_MAX = 0x3FFFFFFF; // 1073741823
      const numBuffsAtten = [0, 1, 0.66000003, 0.5, 0.40000001, 0.34999999];
      const numBuffsCurseAtten = [0, 1, 0.33000001, 0.5, 1.25, 1.5];

      const rivenIntToFloat = (v) => { const f = v / RIVEN_INT_MAX; return (f >= 0 && f <= 1) ? f : 0; };
      const rivenLerp = (a, b, t) => a + (b - a) * t;

      const dispo = EW[weaponUn]?.omegaAttenuation ?? 1.0;
      const lvl = parseInt(fp.lvl ?? u.UpgradeLevel ?? 0, 10);
      const nBuffs = (fp.buffs ?? []).length;
      const nCurses = (fp.curses ?? []).length;
      const attenuation = 1.5 * dispo * 10;
      const curseAtten = Math.pow(1.25, nCurses);

      // Base values from riven_tags keyed by riven type (last path segment)
      const rivenTypeName = u.ItemType.split('/').pop(); // e.g. LotusRifleRandomModRare
      const rivenTagList = RIVEN_TAGS[rivenTypeName] ?? [];
      const getBase = (tag) => rivenTagList.find(e => e.tag === tag)?.value ?? 0.01;

      const formatStat = (s, pos) => {
        const tag = s.Tag.split('/').pop();
        const roll = rivenLerp(0.9, 1.1, rivenIntToFloat(s.Value));
        const base = Math.abs(getBase(tag));

        let val;
        if (pos) {
          val = base * attenuation * curseAtten * roll
            * numBuffsAtten[Math.min(nBuffs, numBuffsAtten.length - 1)]
            * (lvl + 1);
        } else {
          val = base * attenuation * roll
            * numBuffsCurseAtten[Math.min(nBuffs, numBuffsCurseAtten.length - 1)]
            * numBuffsAtten[Math.min(nCurses, numBuffsAtten.length - 1)]
            * (lvl + 1);
        }

        // Faction damage and other special stats often have different base scales or display formats.
        // User reports Aksomati curse is -0.95 (likely a multiplier display for the curse).
        const SPECIAL_FACTOR = new Set(['WeaponFactionDamageGrineer', 'WeaponFactionDamageCorpus', 'WeaponFactionDamageInfested', 'WeaponMeleeFactionDamageGrineer', 'WeaponMeleeFactionDamageCorpus', 'WeaponMeleeFactionDamageInfested']);
        const SPECIAL_ONE_DP = new Set(['WeaponMeleeComboInitialBonusMod', 'ComboDurationMod', 'WeaponMeleeRangeIncMod']);

        let displayVal;
        let finalSign = pos ? 1 : -1;

        if (SPECIAL_FACTOR.has(tag)) {
          if (!pos) {
            // Curse format: 1.0 - penalty (e.g. 1.0 - 0.05 = 0.95 multiplier)
            displayVal = 1 - (val * 1); // val is usually 0.04-0.05
            finalSign = 1; // It's shown as a positive multiplier 0.95
          } else {
            displayVal = val * 100; // Positive faction damage is usually shown as a percentage +30%
          }
        } else if (SPECIAL_ONE_DP.has(tag)) {
          displayVal = val * 10;
        } else {
          displayVal = val * 100; // standard percentage
        }

        let tagName = RIVEN_STAT_MAP[s.Tag] || RIVEN_STAT_MAP[tag] || null;
        if (!tagName) {
          tagName = splitPascal(tag.replace(/^(Weapon|Avatar|Innate|Player|Mod)/g, '').replace(/Mod$/g, '').replace(/Damage$/, ' Damage').replace(/Faction/, 'Faction ').replace(/Melee/, '').trim()) || tag;
        }

        const isMultiplier = SPECIAL_FACTOR.has(tag) && !pos;
        let valueStr = (displayVal * finalSign).toFixed(isMultiplier ? 2 : 1);
        if (isMultiplier) valueStr = `x ${valueStr}`;

        return {
          tag: tagName,
          value: valueStr,
          positive: pos,
          rawTag: s.Tag,
          isPercent: !isMultiplier && !SPECIAL_ONE_DP.has(tag)
        };
      };

      const stats = [...(fp.buffs ?? []).map(b => formatStat(b, true)), ...(fp.curses ?? []).map(b => formatStat(b, false))];

      let rivenFullName = `${weaponName} Riven`;
      if (!isChallenge && (fp.buffs ?? []).length > 0) {
        const getTagEntry = (tag) => rivenTagList.find(e => e.tag === tag);
        const sortedBuffs = [...(fp.buffs ?? [])].sort((a, b) => {
          if (a.Value === b.Value) {
            return (getTagEntry(a.Tag)?.value ?? 0) - (getTagEntry(b.Tag)?.value ?? 0);
          }
          return b.Value - a.Value;
        });
        let name = '';
        for (const buff of sortedBuffs) {
          const entry = getTagEntry(buff.Tag);
          if (!entry) continue;
          if (buff.Tag === sortedBuffs[sortedBuffs.length - 1].Tag) {
            name += entry.suffix ?? '';
          } else if (buff.Tag === sortedBuffs[0].Tag) {
            name += (entry.prefix ?? '').charAt(0).toUpperCase() + (entry.prefix ?? '').slice(1);
          } else {
            name += '-' + (entry.prefix ?? '');
          }
        }
        if (name) rivenFullName = `${weaponName} ${name}`;
      } else if (isChallenge) {
        rivenFullName = `${weaponName} Riven (Challenge)`;
      }

      return {
        unique_name: u.ItemType,
        image: resolveImage(weaponUn, EW),
        category: 'rivens',
        weapon_type: rivenWeaponType(weaponUn || u.ItemType),
        name: rivenFullName,
        veiled: false,
        rank: parseInt(fp.lvl || u.UpgradeLevel || 0, 10),
        rerolls: fp.rerolls ?? u.RerollCount ?? 0,
        stats,
        challenge: challengeText,
        owned: true
      };
    })
  ];

  // ── Modular mastery components ──────────────────────────────────────────────
  // ── Owned-item lookup maps for modular components ────────────────────────────
  // Kitgun: barrel path → highest-XP build's custom name
  const kitgunBarrelToCustomName = {};
  [...(raw.Pistols ?? []), ...(raw.LongGuns ?? [])].forEach(item => {
    const barrel = item.ModularParts?.[0];
    if (!barrel || (!barrel.toLowerCase().includes('barrel'))) return;
    const existing = kitgunBarrelToCustomName[barrel];
    const xp = item.XP ?? 0;
    if (!existing || xp > existing.xp) {
      kitgunBarrelToCustomName[barrel] = { xp, name: item.ItemName || item.CustomName || '' };
    }
  });

  // Zaw: tip path → highest-XP build's custom name
  const zawTipToCustomName = {};
  (raw.Melee ?? []).forEach(item => {
    const parts = item.ModularParts ?? [];
    const tip = parts.find(p => p.includes('/Tip') || p.includes('/Tips'));
    if (!tip) return;
    const existing = zawTipToCustomName[tip];
    const xp = item.XP ?? 0;
    if (!existing || xp > existing.xp) {
      zawTipToCustomName[tip] = { xp, name: item.ItemName || item.CustomName || '' };
    }
  });

  // MOA: head path → highest-XP pet's custom name
  const moaHeadToCustomName = {};
  (raw.MoaPets ?? []).forEach(item => {
    const head = (item.ModularParts ?? []).find(p => p.includes('MoaPetHead'));
    if (!head) return;
    const existing = moaHeadToCustomName[head];
    const xp = item.XP ?? 0;
    if (!existing || xp > existing.xp) {
      moaHeadToCustomName[head] = { xp, name: item.ItemName || item.CustomName || item.Details?.Name || '' };
    }
  });

  // Hound: head path → highest-XP pet's custom name (pets in KubrowPets with Zanuka type)
  const houndHeadToCustomName = {};
  (raw.KubrowPets ?? []).filter(p => p.ItemType?.includes('Zanuka')).forEach(item => {
    const head = (item.ModularParts ?? []).find(p => p.includes('ZanukaPetPartHead'));
    if (!head) return;
    const existing = houndHeadToCustomName[head];
    const xp = item.XP ?? 0;
    if (!existing || xp > existing.xp) {
      houndHeadToCustomName[head] = { xp, name: item.ItemName || item.CustomName || item.Details?.Name || '' };
    }
  });

  // Kitgun: mastery is per chamber (barrel part), not per full build
  const KITGUN_BARREL_PREFIXES = [
    '/Lotus/Weapons/SolarisUnited/Secondary/SUModularSecondarySet1/Barrel/',
    '/Lotus/Weapons/Infested/Pistols/InfKitGun/Barrels/',
  ];
  const kitgunChambers = Object.entries(EW)
    .filter(([un]) => KITGUN_BARREL_PREFIXES.some(p => un.startsWith(p)) && un.endsWith('Part'))
    .map(([un]) => {
      const xp = xpMap[un] ?? 0;
      // Kitguns are weapons (100 mastery per rank)
      const rank = calculateRank(xp, 'weapons', un);
      const mastery_xp = rank * 100;
      const ownedCustomName = kitgunBarrelToCustomName[un]?.name || '';
      const baseName = resolveName(un, dict, EW);
      return {
        unique_name: un,
        name: ownedCustomName ? `${baseName} (${ownedCustomName})` : baseName,
        image: resolveImage(un, EW), category: 'kitguns',
        xp, rank, mastery_xp, owned: xp > 0, mastered: mastery_xp >= 3000,
        ownedCustomName,
      };
    });

  // Zaw: mastery is per strike (Tip part)
  const seenZawNames = new Set();
  const zawStrikes = Object.entries(EW)
    .filter(([un]) => un.includes('/Ostron/Melee/') && un.includes('/Tip') && !un.includes('PvP'))
    .map(([un]) => {
      const baseName = resolveName(un, dict, EW);
      if (seenZawNames.has(baseName)) return null;
      seenZawNames.add(baseName);
      const xp = xpMap[un] ?? 0;
      // Zaws are weapons (100 mastery per rank)
      const rank = calculateRank(xp, 'weapons', un);
      const mastery_xp = rank * 100;
      const ownedCustomName = zawTipToCustomName[un]?.name || '';
      return {
        unique_name: un,
        name: ownedCustomName ? `${baseName} (${ownedCustomName})` : baseName,
        image: resolveImage(un, EW), category: 'zaws',
        xp, rank, mastery_xp, owned: xp > 0, mastered: mastery_xp >= 3000,
        ownedCustomName,
      };
    })
    .filter(Boolean);

  // MOA: mastery is per head model
  const moaHeads = Object.entries(EW)
    .filter(([un]) => un.includes('/MoaPetParts/MoaPetHead'))
    .map(([un]) => {
      const xp = xpMap[un] ?? 0;
      // MOAs are heavy (200 mastery per rank)
      const rank = calculateRank(xp, 'moas', un);
      const mastery_xp = rank * 200;
      const ownedCustomName = moaHeadToCustomName[un]?.name || '';
      const baseName = resolveName(un, dict, EW);
      return {
        unique_name: un,
        name: ownedCustomName ? `${baseName} (${ownedCustomName})` : baseName,
        image: resolveImage(un, EW), category: 'moas',
        xp, rank, mastery_xp, owned: xp > 0, mastered: mastery_xp >= 6000,
        ownedCustomName,
      };
    });

  // Hound: mastery is per head model
  const houndHeads = Object.entries(EW)
    .filter(([un]) => un.includes('/ZanukaPetParts/ZanukaPetPartHead'))
    .map(([un]) => {
      const xp = xpMap[un] ?? 0;
      // Hounds are heavy (200 mastery per rank)
      const rank = calculateRank(xp, 'hounds', un);
      const mastery_xp = rank * 200;
      const ownedCustomName = houndHeadToCustomName[un]?.name || '';
      const baseName = resolveName(un, dict, EW);
      return {
        unique_name: un,
        name: ownedCustomName ? `${baseName} (${ownedCustomName})` : baseName,
        image: resolveImage(un, EW), category: 'hounds',
        xp, rank, mastery_xp, owned: xp > 0, mastered: mastery_xp >= 6000,
        ownedCustomName,
      };
    });

  const all = [...warframes, ...primary, ...secondary, ...melee, ...kitguns, ...zaws, ...sentinels, ...moas, ...hounds, ...beasts, ...archwings, ...kdrives, ...archweapons, ...necramechs, ...amps, ...mods, ...arcanes, ...relics, ...resources, ...rivens, ...prime_parts, ...intrinsics, ...plexus];

  const playerLevel = raw.PlayerLevel ?? 0;
  const rivenBin = raw.RandomModBin ?? { Slots: 0, Extra: 0 };

  const voidTraces = (raw.MiscItems ?? []).find(i => i.ItemType === '/Lotus/Types/Items/MiscItems/VoidTearDrop')?.ItemCount ?? 0;
  const voidTracesMax = (playerLevel * 50) + 100;

  return {
    account: {
      mastery_rank: playerLevel,
      credits: raw.RegularCredits ?? 0,
      platinum: raw.PremiumCredits ?? 0,
      riven_capacity: 15 + playerLevel + (rivenBin.Extra ?? 0),
      void_traces: voidTraces,
      void_traces_max: voidTracesMax
    },
    warframes,
    weapons: weaponsRaw, // Compatibility
    primary, secondary, melee, kitguns, zaws,
    companions: companionsRaw, // Compatibility
    sentinels, moas, hounds, beasts, robotics,
    companion_weapons,
    vehicles: [...archwings, ...kdrives], // Compatibility
    archwings, kdrives,
    archweapons, necramechs, amps, mods, arcanes, relics, resources, rivens, prime_parts, intrinsics, starchart, plexus, all,
    kitgunChambers, zawStrikes, moaHeads, houndHeads,
    foundry: (raw.PendingItems ?? []).map(p => ({
      unique_name: p.ItemType,
      name: resolveName(p.ItemType, dict, EW, ES, ER, EWf, EA, EM),
      image: resolveImage(p.ItemType, EW, ES, ER, EWf, EA, EM),
      startTime: p.StartTime,
      finishTime: p.FinishTime,
      ready: (Date.now() / 1000) > p.FinishTime,
      ...p
    })),
    globalBoosters: (raw.GlobalUpgrades || []).map(u => {
      const typeMap = {
        'GAMEPLAY_KILL_XP_AMOUNT': 'Affinity Booster',
        'GAMEPLAY_MONEY_PICKUP_AMOUNT': 'Credit Booster',
        'GAMEPLAY_PICKUP_AMOUNT': 'Resource Booster'
      }
      return {
        name: typeMap[u.UpgradeType] || splitPascal(u.UpgradeType.replace('GAMEPLAY_', '')),
        expiry: u.Expiry,
        activation: u.Activation
      }
    })
  };
}

function relicNameFromPath(path, ERel = {}) {
  const leaf = path.split('/').at(-1) ?? path;
  const entry = ERel[path];

  const qualityMap = {
    'Bronze': 'Intact',
    'Silver': 'Exceptional',
    'Gold': 'Flawless',
    'Platinum': 'Radiant'
  };

  const vpqMap = {
    'VPQ_BRONZE': 'Intact',
    'VPQ_SILVER': 'Exceptional',
    'VPQ_GOLD': 'Flawless',
    'VPQ_PLATINUM': 'Radiant'
  };

  if (entry) {
    const era = entry.era || 'Unknown';
    const cat = entry.category || 'Unknown';
    let quality = 'Intact';

    if (entry.quality && vpqMap[entry.quality]) {
      quality = vpqMap[entry.quality];
    } else {
      for (const [raw, clean] of Object.entries(qualityMap)) {
        if (leaf.endsWith(raw)) { quality = clean; break; }
      }
    }

    return `${era} ${cat} Relic (${quality})`;
  }

  // Fallback if no entry found
  const tierMatch = leaf.match(/^T(\d)VoidProjection/i);
  if (tierMatch) {
    const tiers = { '1': 'Lith', '2': 'Meso', '3': 'Neo', '4': 'Axi', '5': 'Requiem' };
    const era = tiers[tierMatch[1]] || 'Other';
    let rest = leaf.replace(/^T\dVoidProjection/i, '');
    let quality = '';
    for (const [raw, clean] of Object.entries(qualityMap)) {
      if (rest.endsWith(raw)) {
        rest = rest.replace(raw, '');
        quality = clean;
        break;
      }
    }
    const baseName = splitPascal(rest).replace(/Relic$/, '').trim();
    return `${era} ${baseName} Relic${quality ? ` (${quality})` : ''}`;
  }

  return splitPascal(leaf.replace(/Relic$/, ' Relic')).trim();
}