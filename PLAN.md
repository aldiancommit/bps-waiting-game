# BPS Waiting Game - Work Plan

## Status Tracker

### MASALAH 1: Ikon mahkota terlalu kecil
- [x] Crown fix committed (3012aa1): setDisplaySize(120, 72.2)
- [x] logo-bps: already uses setDisplaySize(34, 26) — resolution-independent ✓
- [x] restart-icon: already uses setDisplaySize(34, 34) — resolution-independent ✓
- [x] opening-game-bps: already uses setDisplaySize(360, 640) — resolution-independent ✓
- [ ] Add audit test to reject setScale magic numbers on these textures

### MASALAH 2: Layar HP terpotong, belum full screen
- [x] Step 1: main.js adaptive height (computeLogicH, resize handler) — build green, NOT YET COMMITTED
- [ ] Step 2: Commit main.js, verify regression gate
- [ ] Step 3: OpeningScene — cover background for full canvas
- [ ] Step 4: BlockPuzzleScene (Tenten) — setBackgroundColor to fill canvas
- [ ] Step 5: MemoryScene + LevelSelectScene — setBackgroundColor to fill canvas
- [ ] Step 6: HubScene — extend background gradient to full H
- [ ] Step 7: viewport-sim.mjs audit script
- [ ] Step 8: Handle resize events in scenes

### MASALAH 3: Refresh browser resets to Opening
- [ ] Session state persistence (sessionStorage)
- [ ] Silent scene restore on refresh
- [ ] Game state save/restore for Tenten and Memory Angka
- [ ] Tests for save/restore

## Files Currently Being Edited
- src/main.js (uncommitted adaptive height changes)

## Next Step
Commit main.js adaptive height, run regression gate.
