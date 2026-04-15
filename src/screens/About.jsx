/**
 * About.jsx
 *
 * App information, credits, and legal disclaimer.
 *
 * ROLE
 * ─────────────────────────────────────────
 * Purely informational component. Displays versions, links to data sources
 * (warframe-items, browse.wf, etc.), and a critical warning about the
 * ban risk associated with memory-based extraction.
 */
import { AlertTriangle, Github, Box, Globe, Database, Layers, Palette, Terminal, BookOpen } from 'lucide-react'
import { PageLayout, Card } from '../components/UI'
import { open } from '@tauri-apps/api/shell'

const CREDITS = [
  { name: 'warframe-api-helper', desc: 'Credential extraction from game memory', href: 'https://github.com/Obsidian-Jackal/warframe-api-helper/' },
  { name: 'browse.wf', desc: 'Worldstate, bounty cycle, arbitration and incursion data', href: 'https://browse.wf' },
  { name: 'warframe-items', desc: 'Item database', href: 'https://github.com/wfcd/warframe-items' },
  { name: 'warframe-public-export-plus', desc: 'Data exports for the game', href: 'https://github.com/calamity-inc/warframe-public-export-plus' },
  { name: 'Warframe Checklist', desc: 'Inspiration for the checklist feature', href: 'https://warframetools.com/Task-Checklist/' },
]

export default function About() {
  const handleOpenLink = async (e, url) => {
    e.preventDefault()
    try {
      await open(url)
    } catch (err) {
      console.error('Failed to open link:', err)
      // Fallback for web/dev environment
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <PageLayout title="About">
      <div className="space-y-6">

        {/* App Info */}
        <Card glow>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img
                src="/IconKronos.png"
                alt="Cephalon Kronos"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Cephalon Kronos</h2>
              <p className="text-kronos-dim text-sm">v0.1.0 - Open source Warframe companion</p>
            </div>
          </div>
          <p className="text-kronos-text/90 mb-4 leading-relaxed text-sm">
            Track your inventory, relics, rivens and mastery alongside a live worldstate with timers, fissures, arbitrations and more.
          </p>
          <a
            href="https://github.com/glowseeker/cephalon-kronos"
            onClick={(e) => handleOpenLink(e, 'https://github.com/glowseeker/cephalon-kronos')}
            className="inline-flex items-center gap-2 text-kronos-accent hover:text-kronos-accent-secondary transition-colors text-sm font-medium"
          >
            <Github size={18} />
            View on GitHub
          </a>
        </Card>

        {/* Credits */}
        <Card glow>
          <h3 className="text-sm font-bold uppercase tracking-widest text-kronos-dim mb-3">Credits</h3>
          <ul className="space-y-2">
            {CREDITS.map(({ name, desc, href }) => (
              <li key={name} className="flex items-start gap-2 text-sm">
                <span className="text-kronos-accent font-bold flex-shrink-0">•</span>
                <span>
                  <a
                    href={href}
                    onClick={(e) => handleOpenLink(e, href)}
                    className="font-bold text-kronos-accent hover:underline"
                  >
                    {name}
                  </a>
                  <span className="text-kronos-dim ml-1.5">- {desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Disclaimer */}
        <Card glow className="bg-red-500/10 border-red-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-1" size={22} />
            <div>
              <h3 className="text-base font-semibold text-red-400 mb-2">Important Disclaimer</h3>
              <p className="text-kronos-text/90 text-sm leading-relaxed mb-2">
                This app uses{' '}
                <a
                  href="https://github.com/Obsidian-Jackal/warframe-api-helper"
                  onClick={(e) => handleOpenLink(e, 'https://github.com/Obsidian-Jackal/warframe-api-helper')}
                  className="text-kronos-accent hover:underline"
                >
                  warframe-api-helper
                </a>
                {' '}to extract your session tokens from game memory.
              </p>
              <ul className="text-kronos-text/80 text-xs space-y-0.5 mb-2 list-disc list-inside">
                <li>I am not the developer of the software linked above.</li>
                <li>Digital Extremes has not approved this application.</li>
              </ul>
              <p className="text-red-400 font-medium text-xs">Use at your own risk - potential ban risk always exists.</p>
              <p className="text-kronos-dim text-xs mt-1">The app never modifies game files or memory, only reads authentication tokens.</p>
            </div>
          </div>
        </Card>

      </div>
    </PageLayout>
  )
}

