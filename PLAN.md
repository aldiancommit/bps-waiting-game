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
- [x] Step 3: OpeningScene — cover background for full canvas
- [x] Step 2A: CSS index.html — remove 9:16 lock, container fills safe area (4934dce)
- [x] Step 6: HubScene — edge-fill rectangles for tall screens (3b05f31)
- [x] Step 7: viewport-sim.mjs — logicH 640-800, all 21 profiles pass (8628ea9)
- [x] Step 8: body/theme-color sync per scene (39484c7)

### MASALAH 3: Refresh browser resets to Opening
- [x] Langkah 1: Pengaman hook main.js (try/catch theme-color & create hook)
- [x] Langkah 2: Modul SessionState + tes (9875429, 44af85f)
- [x] Langkah 3: Navigasi skip opening saat refresh (2434a67)
- [x] Langkah 4: Game state save/restore for Tenten (c8e0312)
- [x] Langkah 5: Game state save/restore for Memory Angka (179f02e, 3caa94a)
- [ ] Tests for save/restore

## Files Currently Being Edited
- src/main.js (uncommitted adaptive height changes)

## Next Step
Commit main.js adaptive height, run regression gate.
