# Relic Reward Workflow

Documentation of the log triggers used to automate the relic reward overlay.

### 1. Mission Start (Fissure Loading)
Triggered when a user loads into a fissure mission.
- **Trigger:** `_ActiveMission"} with MissionInfo`
- **Context:**
  - Client: `Sys [Info]: Client loaded {...,"name":"SolNode78_ActiveMission"} with MissionInfo:`
  - Host: `Script [Info]: ThemedSquadOverlay.lua: Host loading {...,"name":"SolNode107_ActiveMission"} with MissionInfo:`

### 2. Relic Detection (Squad Size & Tiers)
Determines which relics are in play by tracking unique Resloader instances.
- **Triggers:** `Resloader` + `/Lotus/Types/Game/Projections/` + `starting`
- **Example:** `Sys [Info]: Resloader 0x000000002E20A710 (/Lotus/Types/Game/Projections/T3VoidProjectionZephyrPrimeABronze) starting`
- **Logic:** Unique hex codes (e.g., `0x2E20A710`) are counted to determine squad size.

### 3. User Reward Identification
Identifies the specific reward granted to the player.
- **Trigger:** `gets reward`
- **Example:** `Sys [Info]: VoidProjections: ... gets reward /Lotus/StoreItems/Types/...`

### 4. Reward Screen Initialization (OCR Trigger)
Spawn the overlay and start the OCR pipeline.
- **Trigger:** `ProjectionRewardChoice.lua: Got rewards`
- **Timing:** This occurs immediately before the UI renders, providing a ~15-second window for selection.

### 5. Reward Screen Closure
Cleanup and state reset.
- **Trigger:** `ProjectionRewardChoice.lua: Relic reward screen shut down`

### 6. Endless Mission Handling
Tracks whether the user continues or extracts in endless missions.
- **Trigger:** `answer` (Specifically `answer 1` to continue or `answer 0` to extract)
- **Example:** `Game [Info]: Sending continue dialogue to host with answer 1.`
- **Logic:** If `answer 1` is detected, the workflow returns to **Step 2 (Relic Detection)**.

### 7. Mission Exit
Return to idle state.
- **Trigger:** `ExitState: Disconnected`
