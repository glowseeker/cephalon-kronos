import { invoke } from '@tauri-apps/api/tauri'

let cachedSettings = null

/**
 * Load all settings from the Rust backend.
 * Falls back to localStorage if the file doesn't exist yet (migration).
 */
export async function loadSettings() {
  try {
    const settings = await invoke('load_settings')
    
    // Migration logic: if settings are empty, try to pull from localStorage
    if (Object.keys(settings).length === 0) {
      const legacy = {}
      const keys = [
        'disclaimer-accepted',
        'kronos-theme',
        'notif_position',
        'notif_sound',
        'autoStartMonitoring',
        'notif_arbitration_enabled',
        'notif_arbitration_hours',
        'notif_arbitration_remind',
        'notif_foundry_enabled',
        'notif_foundry_minutes',
        'notif_syndicate_enabled',
        'notif_syndicate_waste_enabled',
        'notif_mastery_enabled',
        'notif_mastery_percent',
        'notif_checklist_minutes'
      ]
      keys.forEach(k => {
        const val = localStorage.getItem(k)
        if (val !== null) legacy[k] = val
      })
      
      if (Object.keys(legacy).length > 0) {
        await saveSettings(legacy)
        cachedSettings = legacy
        return legacy
      }
    }

    cachedSettings = settings
    return settings
  } catch (err) {
    console.error('Failed to load settings:', err)
    return cachedSettings || {}
  }
}

/**
 * Update a specific setting and persist it.
 */
export async function setSetting(key, value) {
  if (!cachedSettings) await loadSettings()
  cachedSettings[key] = value
  await saveSettings(cachedSettings)
}

/**
 * Save the entire settings object.
 */
export async function saveSettings(settings) {
  try {
    await invoke('save_settings', { settings })
    cachedSettings = settings
  } catch (err) {
    console.error('Failed to save settings:', err)
  }
}

/**
 * Synchronous getter for cached settings.
 */
export function getSetting(key, defaultValue = null) {
  if (!cachedSettings) return defaultValue
  return cachedSettings[key] ?? defaultValue
}
