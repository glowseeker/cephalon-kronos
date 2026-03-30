/**
 * Maps.jsx
 *
 * A pannable and zoomable viewer for Warframe's open-world maps.
 *
 * DATA SOURCE
 * ─────────────────────────────────────────
 * - Images are served from the local filesystem via Tauri's `get_maps_path()`
 *   and `convertFileSrc()`.
 * - Map filenames are hardcoded in this file.
 *
 * FEATURES
 * ─────────────────────────────────────────
 * - Click-and-drag panning.
 * - Mouse wheel zooming (clamped between 0.8x and 8x).
 * - "Reset Transform" button to snap back to the center.
 * - Hardware-accelerated transforms (translate + scale) for smooth performance.
 */
import { useRef, useEffect, useCallback, useState } from 'react'
import { PageLayout, Card, Tabs } from '../components/UI'
import { convertFileSrc, invoke } from '@tauri-apps/api/tauri'

const MAPS = [
  { name: 'Plains of Eidolon', filename: 'PlainsofEidolon_4k_Map.png' },
  { name: 'Orb Vallis', filename: 'OrbVallis4kMap-min.png' },
  { name: 'Cambion Drift', filename: 'CambianDrift4kMap.png' },
  { name: 'Duviri', filename: 'Duviri_map_with_caves.png' },
]

const PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect fill="#0b0b0b" width="100%" height="100%"/><text x="50%" y="50%" fill="#cccccc" font-size="20" text-anchor="middle" dominant-baseline="middle">Image unavailable</text></svg>'
)}`

const MIN_SCALE = 0.8
const MAX_SCALE = 8
const MIN_VISIBLE = 100 // px - minimum image strip that must remain on screen

export default function Maps() {
  const [activeTab, setActiveTab] = useState('0')
  const [mapsPath, setMapsPath] = useState('')

  const xfRef = useRef({ x: 0, y: 0, scale: 1 })
  const imgRef = useRef(null)
  const wrapRef = useRef(null)
  const rafRef = useRef(null)
  const panning = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    invoke('get_maps_path').then(setMapsPath).catch(console.error)
  }, [])

  const applyTransform = useCallback(() => {
    if (!imgRef.current) return
    const { x, y, scale } = xfRef.current
    imgRef.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale})`
  }, [])

  // Clamp so at least MIN_VISIBLE px of the image is always visible on each edge.
  // Image is centered at (cw/2, ch/2) with offset (x, y) applied.
  // Image screen rect: center=(cw/2+x, ch/2+y), half-size=(iw*s/2, ih*s/2)
  //   left edge  = cw/2 + x - iw*s/2    must be <= cw - MIN_VISIBLE
  //   right edge = cw/2 + x + iw*s/2    must be >= MIN_VISIBLE
  //   top edge   = ch/2 + y - ih*s/2    must be <= ch - MIN_VISIBLE
  //   bot edge   = ch/2 + y + ih*s/2    must be >= MIN_VISIBLE
  const clamp = useCallback((xf) => {
    if (!imgRef.current || !wrapRef.current) return xf
    const cw = wrapRef.current.offsetWidth
    const ch = wrapRef.current.offsetHeight
    const iw = imgRef.current.offsetWidth || 800
    const ih = imgRef.current.offsetHeight || 600
    const s = xf.scale
    const hw = iw * s / 2
    const hh = ih * s / 2

    // x bounds: right edge >= MIN_VISIBLE  →  x >= MIN_VISIBLE - cw/2 - hw
    //           left edge  <= cw-MIN_VISIBLE →  x <= cw/2 - hw + (cw - MIN_VISIBLE - (cw/2 - hw))
    //        simplifies to:
    const minX = MIN_VISIBLE - cw / 2 - hw   // right edge of image at screen x=MIN_VISIBLE
    const maxX = cw / 2 + hw - MIN_VISIBLE   // left edge of image at screen x=cw-MIN_VISIBLE
    const minY = MIN_VISIBLE - ch / 2 - hh
    const maxY = ch / 2 + hh - MIN_VISIBLE

    return {
      scale: s,
      x: Math.min(maxX, Math.max(minX, xf.x)),
      y: Math.min(maxY, Math.max(minY, xf.y)),
    }
  }, [])

  const resetTransform = useCallback(() => {
    xfRef.current = { x: 0, y: 0, scale: 1 }
    applyTransform()
  }, [applyTransform])

  const onWheel = useCallback((e) => {
    e.preventDefault()
    const { x, y, scale } = xfRef.current
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor))
    if (newScale === scale) return

    const rect = wrapRef.current.getBoundingClientRect()
    const cx = e.clientX - rect.left - rect.width / 2
    const cy = e.clientY - rect.top - rect.height / 2
    const imageX = (cx - x) / scale
    const imageY = (cy - y) / scale
    const newX = cx - imageX * newScale
    const newY = cy - imageY * newScale

    xfRef.current = clamp({ x: newX, y: newY, scale: newScale })
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(applyTransform)
  }, [applyTransform, clamp])

  const onPointerDown = useCallback((e) => {
    panning.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
    wrapRef.current.setPointerCapture(e.pointerId)
    wrapRef.current.style.cursor = 'grabbing'
  }, [])

  const onPointerMove = useCallback((e) => {
    if (!panning.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    const { x, y, scale } = xfRef.current
    xfRef.current = clamp({ x: x + dx, y: y + dy, scale })
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(applyTransform)
  }, [applyTransform, clamp])

  const stopPan = useCallback((e) => {
    if (!panning.current) return
    panning.current = false
    wrapRef.current.style.cursor = 'grab'
    try { wrapRef.current.releasePointerCapture(e.pointerId) } catch { }
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  const switchTab = useCallback((id) => {
    setActiveTab(id)
    xfRef.current = { x: 0, y: 0, scale: 1 }
    requestAnimationFrame(applyTransform)
  }, [applyTransform])

  const mapTabs = MAPS.map((m, i) => ({ id: i.toString(), label: m.name }))

  return (
    <PageLayout title="Maps">
      <div className="h-full flex flex-col min-h-0">
        <Card className="glass-panel rounded-lg overflow-hidden p-0 relative flex-1 min-h-0 bg-black/40">
          <div className="absolute top-4 left-4 z-10 max-w-[calc(100%-120px)]">
            <Tabs tabs={mapTabs} activeTab={activeTab} onChange={switchTab} />
          </div>

          <ZoomBadge xfRef={xfRef} />

          <button onClick={resetTransform}
            className="absolute bottom-4 right-4 z-10 bg-kronos-bg/80 backdrop-blur px-3 py-1.5 rounded-md text-xs text-kronos-dim font-bold shadow-lg border border-white/5 hover:text-kronos-text transition-colors">
            Reset view
          </button>

          <div ref={wrapRef} className="w-full h-full overflow-hidden" style={{ cursor: 'grab' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={stopPan}
            onPointerLeave={stopPan}
          >
            <img
              ref={imgRef}
              src={mapsPath ? convertFileSrc(`${mapsPath}/${MAPS[parseInt(activeTab)].filename}`) : PLACEHOLDER}
              alt={MAPS[parseInt(activeTab)].name}
              onLoad={applyTransform}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER }}
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%) scale(1)',
                willChange: 'transform',
                maxWidth: '100%', maxHeight: '100%',
                objectFit: 'contain',
                userSelect: 'none', pointerEvents: 'none',
              }}
              draggable={false}
            />
          </div>
        </Card>
      </div>
    </PageLayout>
  )
}

function ZoomBadge({ xfRef }) {
  const [label, setLabel] = useState('100%')
  useEffect(() => {
    const id = setInterval(() => setLabel(`${Math.round(xfRef.current.scale * 100)}%`), 120)
    return () => clearInterval(id)
  }, [xfRef])
  return (
    <div className="absolute top-4 right-4 z-10 bg-kronos-bg/80 backdrop-blur px-3 py-1.5 rounded-md text-xs text-kronos-text font-mono font-bold shadow-lg border border-white/5 pointer-events-none">
      {label}
    </div>
  )
}