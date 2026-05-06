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
 
## 3. 10 Reactant Detection
Latest detectable point in relic mission when player receives buff from collecting 10 reactant. This is where our reward screen detection OCR is gonna start.
- **Trigger:** `VoidTearIcon.png) starting`

## 4. Start Reward Screen Detection
After the previous step, we keep scanning 7 spots (4 for 4 players, 3 for 3 players, 2 from 2 player align with 2 from 4 players)
Possible colors for rarity
  - Common = #774430 / #62392f
  - Uncommon = #878787 / #454645
  - Rare = #89772b / #4a3b15

1/4. Spot = 595x476 / 595x479 
2/4 (or 1/2). Spot = 839x476 / 839x479 
3/4 (or 2/2). Spot = 1080x476 / 1080x479
4/4. Spot = 1324x476 / 1324x479

1/3. Spot = 718x476 / 718x479
2/3. Spot = 960x476 / 960x479
3/3. Spot = 1202x476 / 1202x479

Once an euclidian distance treshold is met, we fire the overlay with the slot size based on how many colors match any of the rarity colors (2 matches = 2 slots, 3 matches = 3 slots, 4 matches = 4 slots) and start the OCR pipeline.

## 5. Reward Screen Closure
Cleanup and state reset.
- **Trigger:** `ProjectionRewardChoice.lua: Relic reward screen shut down`

## 6. Endless Mission Handling
If the user is in an endless mission, after the reward screen closes, they'll be prompted to pick another relic, which is triggered by `Created /Lotus/Interface/ThemedProjectionManager.swf`.
- **Trigger:** `Created /Lotus/Interface/ThemedProjectionManager.swf`
- **Logic:** after the reward screen closes, theres two possible triggers, 
    - if step 5 is triggered, reset relic pool and go back to step 2
    - otherwise wait for step 6

## 7. Mission Exit
Return to idle state.
- **Trigger:** `ExitState: Disconnected`