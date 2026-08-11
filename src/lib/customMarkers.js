/**
 * Custom Markers (LocTags)  -  in-game player-placed markers imported from inventory.json
 *
 * Coordinate mapping: in-game world (x, z) → 2D map pixel (u, v).
 * Map bounds and reference points are approximate  -  tune MAP_BOUNDS per map as needed.
 *
 * World coordinate system:
 *   x = east-west  (positive = east)
 *   y = height     (ignored for 2D)
 *   z = north-south (positive = north)
 *
 * Map pixel coordinate system:
 *   u = right   (0 at left edge, WIDTH at right edge)
 *   v = down    (0 at top edge, HEIGHT at bottom edge)
 */

// ── Map pixel dimensions (from stitched images) ──
const MAP_SIZE = {
  poe:     { w: 2560, h: 2560 },
  venus:   { w: 3054, h: 3061 },
  deimos:  { w: 3670, h: 2376 },
  duviri:  { w: 2048, h: 2048 }, // fallback
}

// ── AnchorName patterns → map key ──
function detectMap(anchorName) {
  if (!anchorName) return null
  if (/PoeRemaster|EidolonPlains|Eidolon|Cetus/i.test(anchorName)) return 'poe'
  if (/VenusLandscape|OrbVallis/i.test(anchorName)) return 'venus'
  if (/InfestedMicroplanet|Cambion|Deimos|Fleshscape/i.test(anchorName)) return 'deimos'
  return null
}

// Map-specific world bounds (in-game meters).
// These define the full visible map rectangle for each open world.
// Calibrated against reference markers near known landmarks.
// Actual terrain extents may be larger, but markers beyond these are placed
// at the map edge. Tune further by placing a marker at a known map-edge
// landmark (e.g. Cetus gate, Fortuna entrance) and measuring its world coords.
const MAP_BOUNDS = {
  poe:    { xMin: -600, xMax: 600, zMin: -600, zMax: 600 },
  venus:  { xMin: -800, xMax: 800, zMin: -800, zMax: 800 },
  deimos: { xMin: -300, xMax: 300, zMin: -300, zMax: 300 },
}
// ── Zone grid layout per map ──
// Plains zones are column-first: zoneNum = col * numRows + row
// (col 0 row 0 = top-left, col 9 row 9 = bottom-right)
const ZONE_GRID = {
  poe:   { numRows: 10 },  // 10×10 grid (confirmed: zone 9=bottom-left, 99=bottom-right)
  venus: { numRows: 10 },  // guess  -  needs verification
  deimos:{ numRows: 10 },  // guess  -  needs verification
}

/**
 * Convert zone-local coords to world coords, then to map fraction.
 * The game uses per-zone coordinate spaces; zone origin + local offset = world position.
 * Local x/z are measured from zone CENTER.
 */
function zoneLocalToMapFraction(zoneNum, localX, localZ, mapKey) {
  const bounds = MAP_BOUNDS[mapKey]
  const grid = ZONE_GRID[mapKey]
  if (!bounds || !grid) return null
  const spanX = bounds.xMax - bounds.xMin
  const spanZ = bounds.zMax - bounds.zMin
  const numCols = 10
  const cellX = spanX / numCols
  const cellZ = spanZ / grid.numRows
  const col = Math.floor(zoneNum / grid.numRows)
  const row = zoneNum % grid.numRows
  // Zone grid is column-first: zone 0 = col 0 row 0 (top-left).
  // row 0 = top of map (zMax), row N-1 = bottom (zMin).
  // Local x/z are offset from zone CENTER.
  // Verified: Point 1 (zone 34, row 4) → ~0.465 fy matches correction 0.462
  const worldX = bounds.xMin + col * cellX + cellX / 2 + localX
  const worldZ = bounds.zMax - row * cellZ - cellZ / 2 + localZ
  return worldToMapFractionWithBounds(worldX, worldZ, bounds)
}
function parseZoneNum(anchorName) {
  if (!anchorName) return -1
  const m = anchorName.match(/(?:EPOutdoorZoneAttribs|OVOutdoorZoneAttribs|InfestedMicroplanetZoneAttribs)(\d+)$/i)
  return m ? parseInt(m[1], 10) : -1
}

function worldToMapFractionWithBounds(worldX, worldZ, bounds) {
  if (!bounds) return { x: 0.5, y: 0.5 }
  const spanX = bounds.xMax - bounds.xMin
  const spanZ = bounds.zMax - bounds.zMin
  if (spanX <= 0 || spanZ <= 0) return { x: 0.5, y: 0.5 }
  const fx = (worldX - bounds.xMin) / spanX
  const fz = (worldZ - bounds.zMin) / spanZ
  return {
    x: Math.max(0, Math.min(1, fx)),
    y: Math.max(0, Math.min(1, 1 - fz)),
  }
}
/**
 * Convert in-game world (x, z) to map fractional coordinates (0..1, 0..1).
 * Maps.jsx uses fractional coords where (0,0) = top-left, (1,1) = bottom-right.
 */
function worldToMapFraction(worldX, worldZ, mapKey) {
  const bounds = MAP_BOUNDS[mapKey]
  if (!bounds) return null
  const fx = (worldX - bounds.xMin) / (bounds.xMax - bounds.xMin)
  const fz = (worldZ - bounds.zMin) / (bounds.zMax - bounds.zMin)
  return {
    x: Math.max(0, Math.min(1, fx)),
    y: Math.max(0, Math.min(1, 1 - fz)),
  }
}

// ── Icon mapping ──
const ICON_MAP = {
  'MiniMapEidolonWeaponsmith': 'Star',
  'MiniMapFishingSpot':        'MapPin',
  'MiniMapMiningSpot':         'Diamond',
  'MiniMapConservationSpot':   'Shield',
  'MiniMapRareContainer':      'Star',
  'MiniMapEnemy':              'Skull',
}

function gameIconToIconName(gameIconPath) {
  if (!gameIconPath) return 'MapPin'
  for (const [key, name] of Object.entries(ICON_MAP)) {
    if (gameIconPath.includes(key)) return name
  }
  return 'MapPin'
}
/**
 * Parse raw CustomMarkers from inventory.json into the Maps.jsx config format.
 * Uses zone-aware coordinate conversion when anchorName includes zone ID.
 */
export function parseCustomMarkers(customMarkers) {
  if (!Array.isArray(customMarkers)) return {}

  const result = {}
  for (const group of customMarkers) {
    const tag = group.tag || ''
    let mapKey = detectMap(tag)

    for (const markerInfo of (group.markerInfos || [])) {
      const iconPath = markerInfo.icon || ''
      const iconName = gameIconToIconName(iconPath)

      for (const marker of (markerInfo.markers || [])) {
        const ak = detectMap(marker.anchorName) || mapKey
        if (!ak) continue
        if (!mapKey) mapKey = ak

        const bounds = MAP_BOUNDS[ak]
        let pos
        const zoneNum = parseZoneNum(marker.anchorName)
        if (zoneNum >= 0) {
          pos = zoneLocalToMapFraction(zoneNum, marker.x, marker.z, ak)
        } else if (bounds) {
          pos = worldToMapFractionWithBounds(marker.x, marker.z, bounds)
        }
        if (!pos) continue

        if (!result[ak]) result[ak] = []
        result[ak].push({
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 9),
          label: marker.label || markerInfo.label || `In-Game Marker`,
          x: pos.x,
          y: pos.y,
          color: marker.color ? `#${marker.color.toString(16).padStart(6, '0')}` : '#3b82f6',
          icon: iconName,
          notes: `Imported from game${tag ? ` (${tag})` : ''}`,
        })
      }
    }
  }

  return result
}

export { detectMap, MAP_BOUNDS, MAP_SIZE }
