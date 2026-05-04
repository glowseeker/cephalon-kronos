# Relic Reward Workflow

Documentation of the log triggers used to automate the relic reward overlay.

## 1. Mission Start (Fissure Loading)
Triggered when a user loads into a fissure mission.
- **Trigger:** `_ActiveMission"} with MissionInfo`

## 2. Relic Pool Detection
Identifies which relics were picked by everyone to determine the pool of relics to scan rewards from
- **Triggers:** `Resloader` + `/Lotus/Types/Game/Projections/` + `starting`
- **Example:** `Sys [Info]: Resloader 0x000000002E20A710 (/Lotus/Types/Game/Projections/T3VoidProjectionZephyrPrimeABronze) starting`
We disregard the hex code and only care about the relic type to build a pool of relics to scan rewards from (so duplicates dont matter)
 
## 3. User Reward Identification
Identifies the specific reward granted to the player.
- **Trigger:** `gets reward`
- **Example:** `gets reward /Lotus/StoreItems/Types/Recipes/Weapons/WeaponParts/PrimeTigrisReceiver`

## 4. Reward screen initialization and slot count
After determining the players reward, we wait for the reward screen to initialize and count the number of rewards the game loads (root types)
- **Triggers:**
  - `ProjectionRewardChoice.lua: Got rewards`
  and exactly 2 lines later 
  - `ResourceLoader` + `(x root types)` 
- **Example Snippet:**
662.769 Script [Info]: ProjectionRewardChoice.lua: Got rewards
662.770 Sys [Info]: Created /Lotus/Interface/ProjectionsCountdown.swf
662.770 Sys [Info]: ResourceLoader 0x0000021EB1578B10 (3 root types) Found 11 items to load (0ms) [Heap: 1,038,059,520/1,090,387,968 Footprint: 4,411,088,896 Handles: 1,162]

## 5. Reward Screen Initialization (OCR Trigger)
After the previous step, spawn the overlay with "x root types" as slot size and start the OCR pipeline. The number of root types is the number of rewards available in total.

## 6. Reward Screen Closure
Cleanup and state reset.
- **Trigger:** `ProjectionRewardChoice.lua: Relic reward screen shut down`

## 7. Endless Mission Handling
If the user is in an endless mission, after the reward screen closes, they'll be prompted to pick another relic, which is triggered by `Created /Lotus/Interface/ThemedProjectionManager.swf`.
- **Trigger:** `Created /Lotus/Interface/ThemedProjectionManager.swf`
- **Logic:** after the reward screen closes, theres two possible triggers, 
    - if step 7 is triggered, reset relic pool and go back to step 2
    - otherwise wait for step 8

## 8. Mission Exit
Return to idle state.
- **Trigger:** `ExitState: Disconnected`