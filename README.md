# Cephalon Kronos

An open source desktop companion for Warframe built with React, Rust, and Tauri.

Cephalon Kronos tracks inventory, relics, rivens and mastery progress while providing world-state data and personal tools to accompany you alongside your game.

## Features

* **Inventory Management**: View your inventory with search and category filters.
* **Rivens**: See currently owned rivens and their stats.
* **Relic Management**: See owned relics, their drops, and refinement status.
* **Mastery Tracker**: See your mastery progress across categories and identify items you haven't leveled yet.
* **Dashboard**: Real-time world state data with notifications for Arbitrations, Fissures, Sorties, and more.
* **Notes**: Integrated editor with markdown support to keep game-related guides and notes at hand.
* **World Maps**: Interactive maps for Cambion Drift, Orb Vallis, Duviri, and Plains of Eidolon.
* **Checklist**: Keep track of repeating daily/weekly missions and get reminded to visit vendors.

## Privacy and Security

Cephalon Kronos was designed to be independent of any external services. That means it doesn't require closed source third party software to be monitoring your game. It merely uses [**warframe-api-helper**](https://github.com/Obsidian-Jackal/warframe-api-helper) to retrieve session data from game memory to then fetch necessary data to process and display.

## Disclaimer

This application is **not** affiliated with Digital Extremes. It utilizes a memory-scanning helper. Use this software at your own risk. **I am not responsible for any bans or other consequences that may result from using this application.**

## Installation & Usage

1. Download the version for your OS from the releases page.
2. Extract and run the binary.
3. If Warframe isn't running, launch it.
4. Go to settings and start monitoring.
5. Consult the wiki in case of issues.

## Build from Source

Install prerequisites:

* Rust
* Node.js
* pnpm

Then run:

```bash
# Install dependencies
pnpm install

# Build
pnpm tauri build
```

## Known Issues

- **Nightwave** and the **1999 Calendar** in the dashboard are not fully implemented yet.

## Planned Features

- **Warframe.Market Integration**: Evaluate relics, check prices on prime parts, and use the Ducanator.
- **Live Relic Overlay**: Show value and already owned quantity of relic rewards on fissure reward screens.
- **Auto-Syncing Checklists**: Automatically identify finished tasks and cross them off.
- **Notification System**: Get system notifications of events like Arbitrations, Fissures, and Sorties.

Before reporting bugs or suggesting features in the [issues page](https://github.com/glowseeker/cephalon-kronos/issues), check the **Known Issues** and **Planned Features** headers above.

