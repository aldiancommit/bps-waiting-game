# Game Ruang Tunggu BPS (Offline Web Game Collection)

Koleksi game web ringan, 100% offline, dan responsif untuk pengunjung Ruang Pelayanan Statistik Terpadu (PST) kantor Badan Pusat Statistik (BPS).

---

## 1. Daftar Game

1. **1010 Match Color (Tenten)**
   - Game puzzle susun balok 10x10 dengan sistem warna dinamis, Rainbow Wildcard, 3x3 Bomb, dan mode Fever 2x.
   - Folder: `src/games/tenten/`

2. **Memory Angka (Statistik)**
   - Game asah daya ingat posisi dan urutan angka (Urut Naik ↗ & Urut Turun ↘) dengan 30 level kampanye terstruktur + mode Endless ♾️.
   - Dilengkapi algoritma cerdas *Best-of-K heuristic search* dan *Soft Dynamic Difficulty Adjustment (DDA)*.
   - Folder: `src/games/memory-angka/`

---

## 2. Struktur Proyek Multi-Game

```text
src/
├── main.js                              # Hub Entry & Scene Configuration
├── scenes/
│   └── HubScene.js                      # Menu Utama Pilihan Game
├── shared/
│   ├── Audio.js                         # 8-bit Retro WebAudio Synthesizer & Haptics
│   └── Storage.js                       # LocalStorage Multi-Game Persistence
└── games/
    ├── tenten/                          # Modul Game 1010 Match Color
    │   ├── data/BlockShapes.js
    │   ├── scenes/BlockPuzzleScene.js
    │   └── utils/Constants.js
    └── memory-angka/                    # Modul Game Memory Angka
        ├── data/
        │   ├── Constants.js             # Timing, Layout, & Palette Tokens
        │   └── Levels.js                # Band 30 Level & Parameter Endless
        ├── scenes/
        │   ├── LevelSelectScene.js      # Pemilihan Level & Bintang
        │   └── MemoryScene.js           # Gameplay, HUD, & Zero-GC Tile Pool
        └── utils/
            ├── Rng.js                   # PRNG Mulberry32 & Hash
            ├── LevelGenerator.js        # Best-of-K Layout Heuristic
            └── Difficulty.js            # Soft DDA Controller
```

---

## 3. Cara Menyetel Kesulitan Memory Angka

### A. Parameter Waktu & Skor (`src/games/memory-angka/data/Constants.js`)
- **Waktu Hafal Dasar (`calculateBaseShowMs`)**:
  ```javascript
  showMs = clamp(2600 + 350 * numCount - 60 * (level - 1), 1200, 6000)
  ```
- **Durasi Bantuan INTIP**: `PEEK_DURATION_MS = 700` (ms).
- **Durasi Kedip Koreksi Salah**: `WRONG_BLINK_MS = 600` (ms).

### B. Konfigurasi Band & Jumlah Angka (`src/games/memory-angka/data/Levels.js`)
- **Band Level 1–3**: Grid $3\times4$, $3–4$ angka.
- **Band Level 4–8**: Grid $4\times4$, $4–6$ angka.
- **Band Level 9–14**: Grid $4\times5$, $6–9$ angka (*Level 10: URUT TURUN*).
- **Band Level 15–22**: Grid $5\times5$, $8–12$ angka (*Level 15 & 20: URUT TURUN*).
- **Band Level 23–30**: Grid $5\times6$, $10–15$ angka (*Level 25 & 30: URUT TURUN*).
- **Mode Endless (Level 31+)**: Grid $5\times6$, $12–18$ angka prosedural dinamis.

---

## 4. Menjalankan & Membangun Proyek

```bash
# Menjalankan server lokal pengembangan:
npm run dev

# Membangun bundle produksi offline (dist/):
npm run build

# Menjalankan unit test generator Memory Angka:
node scratch/test_memory_generator.mjs
```
