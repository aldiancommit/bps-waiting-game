# REPO_MAP.md: Peta Teknis & Rencana Audit BPS Waiting Game

> **Status Audit**: Pemetaan & Perencanaan (Read-Only)  
> **Tanggal Audit**: 14 Oktober 2026  
> **Auditor**: Technical Auditor (Antigravity)  
> **Basis Bukti**: Seluruh temuan merujuk langsung ke `file:baris` aktual di repositori. Tidak ada asumsi atau rekayasa data.

---

## 1. INVENTARIS

### 1.1. Pohon Folder & Daftar File Sumber
Pohon direktori (maksimal 3 tingkat, tanpa `node_modules` dan `dist`):

```text
.
├── AGENTS.md
├── index.html
├── package.json
├── package-lock.json
├── README.md
├── vite.config.js
├── public/
│   └── assets/
│       ├── block-puzzle-kit/
│       ├── logo-bps.webp
│       ├── mahkota-icon.webp
│       ├── opening-game-bps.webp
│       └── restart-icon.webp
├── scratch/
│   ├── fast_benchmark.py
│   ├── run_heavy_training_suite.py
│   ├── simulate_algorithm.py
│   ├── test_balance_sim.py
│   ├── test_memory_generator.mjs
│   └── verify_balance.py
└── src/
    ├── main.js
    ├── games/
    │   ├── memory-angka/
    │   └── tenten/
    ├── scenes/
    │   ├── HubScene.js
    │   └── OpeningScene.js
    └── shared/
        ├── Audio.js
        └── Storage.js
```

Daftar file sumber dan jumlah baris kode (`wc -l`):

| File | Baris | Peran / Deskripsi Singkat |
|---|---:|---|
| `index.html` | 76 | Dokumen HTML utama, deklarasi viewport, CSS layout container, dan host tag Phaser |
| `vite.config.js` | 8 | Konfigurasi bundler Vite (base, build target ES) |
| `package.json` | 20 | Konfigurasi metadata proyek, npm scripts, dan dependensi |
| `src/main.js` | 56 | Titik masuk game, kalkulasi DPR, konfigurasi Phaser Scale Manager, inisiasi scene |
| `src/scenes/OpeningScene.js` | 83 | Splash screen pembuka BPS, asset preload, transisi mulus ke Hub |
| `src/scenes/HubScene.js` | 664 | Menu utama pemilihan game (Tenten & Memory Angka) via offscreen 2D canvas texture |
| `src/shared/Audio.js` | 461 | Synthesizer audio 8-bit retro berbasis native WebAudio API & controller haptic |
| `src/shared/Storage.js` | 167 | Abstraksi LocalStorage multi-game tahan crash (try/catch untuk private browsing) |
| `src/games/tenten/data/BlockShapes.js` | 140 | Definisi bentuk poliomino balok puzzle dan asosiasi warna kit |
| `src/games/tenten/scenes/BlockPuzzleScene.js` | 2421 | Gameplay lengkap game 1010 block puzzle (grid, drag-drop, scoring, HUD, modal) |
| `src/games/tenten/utils/Constants.js` | 72 | Konstanta ukuran grid, layout, palet warna, dan string font Tenten |
| `src/games/memory-angka/data/Constants.js` | 84 | Konstanta grid, durasi timing hafal/intip, skor, palet warna Memory Angka |
| `src/games/memory-angka/data/Levels.js` | 65 | Parameter kampanye level 1–30 dan parameter mode Endless 31+ |
| `src/games/memory-angka/scenes/LevelSelectScene.js` | 403 | Menu paginasi pemilihan level Memory Angka, display bintang, dan tombol Endless |
| `src/games/memory-angka/scenes/MemoryScene.js` | 1274 | Gameplay Memory Angka (tile pool nol-GC, timer hafal, evaluasi tap urut, modal) |
| `src/games/memory-angka/utils/Difficulty.js` | 73 | Controller Soft Dynamic Difficulty Adjustment (DDA) adaptif |
| `src/games/memory-angka/utils/LevelGenerator.js` | 133 | Algoritma heuristik *Best-of-K* penempatan angka acak non-kluster |
| `src/games/memory-angka/utils/Rng.js` | 57 | Pseudorandom Number Generator (Mulberry32) deterministik berbasis seed |
| **Total Sumber (`src/` + config)** | **6.257** | **18 file kode sumber aktif** |

### 1.2. Package & Dependensi Terpasang
- **`package.json`**:
  - `scripts`:
    - `"dev": "vite --host"` (`package.json:6`)
    - `"build": "vite build"` (`package.json:7`)
    - `"test": "echo \"Error: no test specified\" && exit 1"` (`package.json:8`)
  - `dependencies`: `"phaser": "^4.2.1"` (`package.json:14`)
  - `devDependencies`: `"vite": "^8.3.1"` (`package.json:17`)
  - `engines`: **tidak ditemukan** (tidak dideklarasikan di `package.json`)
- **Hasil `npm ls --depth=0`**:
  ```text
  bps_waiting_game@1.0.0 /home/geewonii/projects/game/bps-waiting-game
  ├── phaser@4.2.1
  └── vite@8.3.1
  ```
- **Versi Terpasang Sebenarnya**:
  - Phaser: **4.2.1** (Release "Giedi", rujukan: `node_modules/phaser/package.json:3`)
  - Vite: **8.3.1** (rujukan: `node_modules/vite/package.json:3`)
  - Node.js runtime lingkungan: **v22.22.1**, npm: **9.2.0**

### 1.3. Konfigurasi Build & Deployment
- **`vite.config.js`**:
  - `base`: `'./'` (`vite.config.js:4`)
  - `build.target`: `['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4']` (`vite.config.js:6`)
  - `manualChunks`: **tidak ditemukan** (semua modul digabung menjadi 1 bundle JS monolitik)
  - `plugins`: **tidak ditemukan** (tanpa plugin kompresi gzip/brotli atau legacy polyfill)
- **`index.html`**:
  - `meta viewport`: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />` (`index.html:6`)
  - Link font eksternal: **tidak ditemukan**
  - `<title>`: `Game Ruang Tunggu BPS - 1010 Block Puzzle` (`index.html:7`)
  - Favicon (`<link rel="icon">`): **tidak ditemukan**
- **File Konfigurasi Vercel & Git**:
  - `vercel.json`: **tidak ditemukan**
  - `.vercelignore`: **tidak ditemukan**
  - `.gitignore`: **ada** (`.gitignore:1-3`), berisi:
    ```text
    node_modules/
    .env
    scratch/
    ```
    *Catatan Penting*: Folder `dist/` **tidak ada** di `.gitignore` dan saat ini berstatus terlacak (committed) di dalam repositori git.

### 1.4. Ukuran Bundle `dist/`
Hasil pengukuran audit presisi pada berkas produksi `dist/` yang telah ter-generate:
- **Total Ukuran Raw**: 1.647.284 bytes (**1.608,68 KB** / ~1,57 MB)
- **Total Ukuran Gzip**: 539.759 bytes (**527,11 KB** / ~0,51 MB)

Rincian per berkas (diurutkan dari ukuran raw terbesar):

| File Path di `dist/` | Ukuran Raw | Ukuran Gzip | Keterangan |
|---|---:|---:|---|
| `assets/index-Cg5__uoc.js` | 1.481.422 B (1.446,70 KB) | 379.729 B (370,83 KB) | Bundle JS gabungan (Phaser engine + seluruh logika game) |
| `assets/opening-game-bps.webp` | 89.914 B (87,81 KB) | 89.613 B (87,51 KB) | Gambar splash screen (dimensi 1710x3040) |
| `assets/restart-icon.webp` | 25.386 B (24,79 KB) | 25.038 B (24,45 KB) | Icon restart game (dimensi 778x837) |
| `assets/logo-bps.webp` | 22.214 B (21,69 KB) | 22.242 B (21,72 KB) | Logo resmi Badan Pusat Statistik (dimensi 540x418) |
| `assets/mahkota-icon.webp` | 21.946 B (21,43 KB) | 17.128 B (16,73 KB) | Icon mahkota high score (dimensi 2400x1444) |
| `index.html` | 1.210 B (1,18 KB) | 656 B (0,64 KB) | HTML entry produksi (CSS ter-minify) |
| `assets/block-puzzle-kit/.../particles/glow.webp` | 888 B (0,87 KB) | 911 B (0,89 KB) | Tekstur partikel glow |
| `assets/block-puzzle-kit/.../glossy/hd/blue.webp` | 772 B (0,75 KB) | 795 B (0,78 KB) | Tekstur balok biru (128x128) |
| `assets/block-puzzle-kit/.../glossy/hd/yellow.webp` | 764 B (0,75 KB) | 787 B (0,77 KB) | Tekstur balok kuning (128x128) |
| `assets/block-puzzle-kit/.../glossy/hd/red.webp` | 756 B (0,74 KB) | 779 B (0,76 KB) | Tekstur balok merah (128x128) |
| `assets/block-puzzle-kit/.../glossy/hd/green.webp` | 746 B (0,73 KB) | 769 B (0,75 KB) | Tekstur balok hijau (128x128) |
| `assets/block-puzzle-kit/.../glossy/hd/purple.webp` | 740 B (0,72 KB) | 763 B (0,75 KB) | Tekstur balok ungu (128x128) |
| `assets/block-puzzle-kit/.../particles/sparkle.webp` | 526 B (0,51 KB) | 549 B (0,54 KB) | Tekstur partikel sparkle |

### 1.5. Inventaris Font & Aset
#### A. Analisis Font
- **File Font Fisik**: **tidak ditemukan** (tidak ada file `.woff2`, `.woff`, `.ttf`, atau `.otf` di seluruh repositori).
- **URL Eksternal Font**: **tidak ditemukan** (tidak ada koneksi ke Google Fonts atau CDN).
- **Deklarasi Font**: **tidak ditemukan** `@font-face` di CSS maupun pemanggilan FontFace API di JS.
- **Font Families yang Digunakan di Kode**:
  1. `'Public Pixel', sans-serif`:
     - Rujukan: `index.html:30`, `src/scenes/HubScene.js:16`, `src/games/memory-angka/data/Constants.js:11`, `src/games/tenten/utils/Constants.js:49`.
     - Status: **Font lokal tidak ada**. Perangkat yang tidak memiliki font 'Public Pixel' di sistem OS-nya akan langsung *fallback* ke font generik `sans-serif` (proportional font), menyebabkan tipografi retro pixel berpotensi bergeser/tidak beraturan.
  2. `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`:
     - Rujukan: `src/games/memory-angka/data/Constants.js:12`, `src/games/tenten/utils/Constants.js:50`.
     - Status: Bergantung pada ketersediaan font sistem di perangkat pengguna.
  3. `'Fredoka', 'Baloo 2', 'Nunito', ui-rounded, system-ui, sans-serif` (`DISPLAY`):
     - Rujukan: `src/scenes/HubScene.js:17`.
     - Status: Bergantung pada font sistem, tidak ada aset lokal.
  4. `'Nunito', 'Fredoka', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` (`BODY`):
     - Rujukan: `src/scenes/HubScene.js:18`.
     - Status: Bergantung pada font sistem, tidak ada aset lokal.
- **Pengecekan Kesiapan Font**: `src/scenes/OpeningScene.js:52-54` mengevaluasi `document.fonts.ready`. Karena tidak ada font kustom yang didaftarkan ke stylesheet, promise ini langsung resolve seketika.

#### B. Analisis Aset di `public/` dan `src/`
- Folder `src/`: Berisi 100% kode sumber JavaScript (0 file aset binary).
- Folder `public/assets/`:
  - `opening-game-bps.webp` (87,81 KB): Dipakai aktif di `OpeningScene.js:16`.
  - `logo-bps.webp` (21,69 KB): Dipakai aktif di `OpeningScene.js:19`, `HubScene.js:463`, `BlockPuzzleScene.js:40`, `LevelSelectScene.js:25`, `MemoryScene.js:33`.
  - `mahkota-icon.webp` (21,43 KB): Dipakai aktif di `BlockPuzzleScene.js:41`, `LevelSelectScene.js:26`, `MemoryScene.js:34`.  
    *Tanda Redundansi*: Di-preload di `OpeningScene.js:20` dan `HubScene.js:464` tetapi **tidak pernah digambar/ditampilkan** di OpeningScene maupun HubScene.
  - `restart-icon.webp` (24,79 KB): Dipakai aktif di `BlockPuzzleScene.js:42`, `MemoryScene.js:35`.  
    *Tanda Redundansi*: Di-preload di `OpeningScene.js:21` dan `HubScene.js:465` tetapi **tidak pernah digambar/ditampilkan** di OpeningScene maupun HubScene.
  - Kit Balok `public/assets/block-puzzle-kit/...` (7 file WebP): Seluruhnya dipakai aktif di `BlockPuzzleScene.js:46-55` dan `BlockShapes.js:7-11`.
- Aset Audio: **tidak ditemukan file audio fisik** (.mp3, .wav, .ogg). Seluruh efek audio dibangkitkan secara prosedural pada runtime menggunakan WebAudio API (`src/shared/Audio.js:1-461`).

---

## 2. ARSITEKTUR

### 2.1. Titik Masuk, Registrasi Game, & Siklus Scene
- **Titik Masuk (Entry Point)**:
  `index.html:73` mengeksekusi `<script type="module" src="/src/main.js"></script>`.
  `src/main.js:46-56`: Event listener memeriksa status DOM (`DOMContentLoaded` atau `interactive`/`complete`), lalu menjalankan `new Phaser.Game(config)`. Instance dijaga via guard `window.__bpsGameStarted` (`src/main.js:47-48`).
- **Registrasi Game & Scene**:
  Daftar scene didaftarkan langsung di konfigurasi Phaser (`src/main.js:43`):
  `scene: [OpeningScene, HubScene, BlockPuzzleScene, LevelSelectScene, MemoryScene]`.
  Scene pertama yang dihidupkan otomatis oleh Phaser adalah `OpeningScene`.
  Katalog game pada Hub didefinisikan secara statis di array `GAMES` (`src/scenes/HubScene.js:30-33`):
  - `tenten` (Tenten Blocks)
  - `memory-angka` (Memory Angka)
- **Siklus Hidup & Navigasi Antar Scene**:
  ```text
  [OpeningScene]
        │ (delayedCall / tap layar)
        ▼
    [HubScene] ◄────────────────────────────────────────┐
        │                                               │
        ├──► [BlockPuzzleScene (Tenten)]                │
        │         │ (GameOver Modal: line 1983)         │
        │         │ (Pause Overlay: line 2056)          │
        │         └─────────────────────────────────────┤
        │                                               │
        └──► [MemoryLevelSelectScene]                   │
                  │                                     │
                  ├── (Tombol Back ◀: line 86) ─────────┘
                  │
                  ▼
             [MemoryScene]
                  │ (GameOver / Pause / Result Modal: line 934, 1028, 1095)
                  ▼
             [MemoryLevelSelectScene]
  ```
  - **Kembali ke Hub**:
    - Dari Tenten: Pemain harus membuka menu Pause (`BlockPuzzleScene.js:2056`) atau mengalami Game Over (`BlockPuzzleScene.js:1983`), lalu menekan tombol menu utama. Tidak ada tombol keluar instan saat permainan berlangsung.
    - Dari Memory Angka: Pemain kembali ke `LevelSelectScene` dari modal game, lalu menekan tombol ◀ di kiri atas header (`LevelSelectScene.js:86`) yang memicu `this.scene.start('HubScene')`.

### 2.2. Penentuan Ukuran Canvas (Hub vs Game)
- **Lapisan CSS (`index.html:17-67`)**:
  - `html, body`:
    `width: 100%; height: 100%; overflow: hidden;` (`index.html:19-24`)
  - `body`:
    `min-height: 100dvh; display: flex; justify-content: center; align-items: center;` (`index.html:31-36`)
    `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);` (`index.html:37-41`)
  - `#game-root`:
    ```css
    width: min(100vw, calc(100svh * 0.5625));
    width: min(100vw, calc(100dvh * 0.5625));
    height: min(100svh, calc(100vw * 1.7777778));
    height: min(100dvh, calc(100vw * 1.7777778));
    max-width: 100%;
    max-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    ```
    (`index.html:48-60`)
  - `canvas`:
    `display: block; width: 100%; height: 100%; touch-action: none;` (`index.html:62-67`)
- **Konfigurasi Phaser Scale (`src/main.js:13-32`)**:
  - `DPR`: Dibatasi minimal 2, maksimal 3 (`Math.min(Math.max(window.devicePixelRatio || 1, 2), 3)`).
  - Resolusi internal game: `GAME_WIDTH = 360 * DPR`, `GAME_HEIGHT = 640 * DPR` (misal 720x1280 pada DPR=2 atau 1080x1920 pada DPR=3). Rasio tepat 9:16 (0.5625).
  - `scale.mode`: `Phaser.Scale.FIT` (`src/main.js:27`).
  - `scale.autoCenter`: `Phaser.Scale.CENTER_BOTH` (`src/main.js:28`).
  - `scale.expandParent`: `true` (`src/main.js:31`).
- **Skala Kamera di Tiap Scene (`setZoom(dpr)`)**:
  Seluruh scene (`OpeningScene.js:28-30`, `HubScene.js:470-472`, `BlockPuzzleScene.js:60-62`, `LevelSelectScene.js:36-38`, `MemoryScene.js:57-59`) mengeksekusi logika yang identik:
  ```javascript
  const dpr = this.game.config.width / 360;
  this.cameras.main.setZoom(dpr);
  this.cameras.main.centerOn(180, 320);
  ```
- **Listener Resize & OrientationChange**:
  - `window.addEventListener('resize')`: **tidak ditemukan**
  - `window.addEventListener('orientationchange')`: **tidak ditemukan**
  - `this.scale.on('resize')`: **tidak ditemukan**
- **Penggunaan Unit Viewport & Safe Area**:
  - `100vh / 100svh / 100dvh`: Dideklarasikan hanya di CSS `index.html:34-36, 49-53`.
  - `safe-area`: Dideklarasikan hanya di padding `body` `index.html:38-41`.
  - `visualViewport`: **tidak ditemukan** (tidak diakses di kode mana pun).

### 2.3. Perbedaan Penggambaran: Hub vs Game
- **Game Scene (`BlockPuzzleScene`, `LevelSelectScene`, `MemoryScene`)**:
  Digambar murni menggunakan Phaser Game Objects standar (`Phaser.GameObjects.Graphics`, `Image`, `Text`, `Container`) langsung di dalam scene display list dengan batas koordinat `0..360` (lebar) dan `0..640` (tinggi).
- **Hub Scene (`HubScene.js`)**:
  Digambar menggunakan pendekatan **Hybrid Offscreen HTML5 2D Canvas**:
  1. Background statis digambar ke elemen canvas 2D terpisah di memori via fungsi `drawStaticBackground` (`HubScene.js:219-323`) dengan basis koordinat desain `DESIGN_W = 391` dan `DESIGN_H = 695.11` (skala 2x: 782x1390).
  2. Canvas tersebut dikonversi menjadi Phaser Texture: `this.textures.addCanvas('hub-static-bg', bgCanvas)` (`HubScene.js:500`).
  3. Tekstur tersebut kemudian dirender ke layar Phaser via sebuah Image tunggal: `this.add.image(180, 320, 'hub-static-bg').setDisplaySize(360, 640)` (`HubScene.js:521-523`).
  4. Kartu game digambar dengan cara yang sama via fungsi `drawCardToCanvas` (`HubScene.js:325-453`), dijadikan canvas texture, lalu dirender sebagai Sprite dengan rescaling kalkulasi manual `scaleX = 360 / 391` dan `scaleY = 640 / 695.11` (`HubScene.js:577-586`).

---

## 3. DIAGNOSIS MENU TERPOTONG

Berdasarkan investigasi menyeluruh terhadap kode, berikut adalah daftar hipotesis penyebab menu pembuka (hub) terpotong atas dan bawah di HP, diurutkan dari yang paling mungkin:

### Hipotesis 1 (Paling Mungkin): Konflik Formula CSS `#game-root` terhadap Padding Safe Area `body` & Flexbox Centering
- **Bukti File & Baris**:
  - `index.html:31-41`:
    `body { min-height: 100dvh; display: flex; justify-content: center; align-items: center; padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); overflow: hidden; }`
  - `index.html:48-55`:
    `#game-root { width: min(100vw, calc(100dvh * 0.5625)); height: min(100dvh, calc(100vw * 1.7777778)); max-width: 100%; max-height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; }`
- **Mekanisme Terpotong**:
  1. Pada HP (terutama yang memiliki notch, punch hole, atau browser address bar), nilai `100vw` dan `100dvh` adalah dimensi layar/viewport penuh (tanpa memperhitungkan inset aman).
  2. Misal pada perangkat dengan rasio layar sedikit lebih pendek dari 9:16 (seperti saat browser toolbar muncul atau pada perangkat 16:9/SE dengan safe-area), tinggi content box yang tersedia di `body` adalah `100dvh - (safe-area-inset-top + safe-area-inset-bottom)`.
  3. Namun rumus `height: min(100dvh, calc(100vw * 1.7777778))` menghasilkan angka tinggi yang lebih besar dari tinggi content box `body`.
  4. Karena `body` menggunakan `display: flex; align-items: center; justify-content: center;`, elemen anak (`#game-root`) diposisikan persis di tengah secara vertikal. Ketika elemen anak melebihi tinggi container induk, elemen tersebut akan meluber secara simetris: **setengah ke atas dan setengah ke bawah**.
  5. Ditambah dengan `html, body { overflow: hidden; }`, area yang meluber ke luar batas atas dan bawah dipotong (*clipped*) dan tidak dapat digulir sama sekali.
- **Cara Verifikasi**:
  Buka game di Chrome DevTools Device Mode (emulasikan iPhone 12/14 atau browser mobile dengan toolbar). Inspect elemen `body` dan `#game-root`. Jalankan di console:
  `const b = document.body.getBoundingClientRect(); const r = document.getElementById('game-root').getBoundingClientRect(); console.log({ bodyTop: b.top, rootTop: r.top, bodyBottom: b.bottom, rootBottom: r.bottom });`
  Jika `rootTop < b.top` atau `rootBottom > b.bottom`, maka elemen container terbukti terpotong simetris di atas dan bawah.

### Hipotesis 2: Margin Vertikal Komposisi Visual `HubScene` Terlalu Mepet ke Batas Ekstrem Canvas
- **Bukti File & Baris**:
  - `src/scenes/HubScene.js:12-13`: `const DESIGN_W = 391; const DESIGN_H = 695.11;`
  - `src/scenes/HubScene.js:262`: Logo BPS digambar pada `y = 22`.
  - `src/scenes/HubScene.js:264-265`: Teks judul 'BPS' di `y = 41` dan 'Badan Pusat Statistik' di `y = 55`.
  - `src/scenes/HubScene.js:321`: Footer 'Ruang Pelayanan Badan Pusat Statistik' digambar pada `y = h - 18` (`677.11`).
  - `src/scenes/HubScene.js:521-523`: Tekstur `hub-static-bg` di-squeeze ke `setDisplaySize(360, 640)`.
- **Mekanisme Terpotong**:
  1. Ketika canvas background berukuran tinggi 695.11 dikompresi ke 640, rasio skalanya adalah `640 / 695.11 = 0.9207`.
  2. Titik puncak logo BPS yang berada di `y = 22` terkonversi menjadi `y = 20.25px` dari tepi atas canvas 640.
  3. Titik footer yang berada di `y = 677.11` terkonversi menjadi `y = 623.4px`, menyisakan jarak ke batas bawah canvas hanya sebesar `640 - 623.4 = 16.6px`.
  4. Karena margin batas atas (~20px) dan bawah (~16px) sangat tipis, setiap deviasi minor pada scaling letterboxing, status bar browser, atau rounding pixel DPR di layar ponsel langsung memotong visual teks BPS di atas dan teks footer di bawah.
- **Cara Verifikasi**:
  Render scene Hub di layar uji. Gambar garis batas `strokeRect(0, 0, 360, 640)` pada Phaser canvas. Periksa apakah logo BPS atau footer berada dalam jarak kurang dari 20 pixel dari tepi canvas.

### Hipotesis 3: Konflik Aturan CSS `canvas { width: 100%; height: 100%; }` terhadap Inline Style `Phaser.Scale.FIT`
- **Bukti File & Baris**:
  - `index.html:62-67`:
    `canvas { display: block; width: 100%; height: 100%; touch-action: none; }`
  - `src/main.js:27-31`:
    `scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: GAME_WIDTH, height: GAME_HEIGHT, expandParent: true }`
- **Mekanisme Terpotong**:
  1. Phaser `Scale.FIT` bertugas menghitung aspect ratio dan menyematkan inline styling pada elemen `<canvas>` (misal `style="width: ...px; height: ...px; margin-top: ...px;"`).
  2. Kehadiran deklarasi stylesheet CSS global `canvas { width: 100%; height: 100%; }` bersama `#game-root { display: flex; align-items: center; justify-content: center; }` dapat mengganggu perhitungan letterboxing Phaser jika `#game-root` mengalami peregangan flexbox yang tidak simetris atau terbatasi oleh `max-height: 100%`.
- **Cara Verifikasi**:
  Periksa atribut style vs computed style pada tag `<canvas>` di browser mobile. Cek apakah ada nilai `margin-top` negatif atau ukuran canvas yang dipaksa melar mengisi container yang terdistorsi.

### Hipotesis 4: Tidak Adanya Penanganan Event `resize` / `visualViewport` saat Browser Mobile Mengubah Tinggi Viewport
- **Bukti File & Baris**:
  - `src/main.js`: Tidak ditemukan pemanggilan event listener `window.addEventListener('resize')` maupun `scale.on('resize')`.
  - `index.html:36, 50, 53`: Mengandalkan unit CSS `100dvh` secara pasif.
- **Mekanisme Terpotong**:
  1. Pada mobile browser nyata, saat halaman pertama kali dimuat, bar alamat (URL bar) browser berstatus muncul (mengurangi tinggi viewport). Ketika pengguna berinteraksi atau browser masuk ke mode fullscreen, ukuran viewport dinamis (`visualViewport`) berubah.
  2. Karena engine game tidak mengamati perubahan ukuran viewport, ScaleManager Phaser tetap mengunci ukuran berdasarkan pembacaan awal saat startup.
- **Cara Verifikasi**:
  Buka game di Chrome Android atau Safari iOS, geser sedikit layar agar address bar menyusut/muncul, lalu amati apakah canvas me-refresh posisinya atau tetap terpotong.

---

## 4. PETA RISIKO

| Domain | File Relevan | Apa yang Diperiksa | Alat / Perintah Pemeriksa | Kriteria Lulus | Tingkat Risiko |
|---|---|---|---|---|:---:|
| **UI & Viewport Scaling** | `index.html`, `src/main.js`, `src/scenes/HubScene.js` | Dimensi `#game-root`, safe-area handling, rasio 9:16 di layar HP aspek 19.5:9, 20:9, dan 16:9 | Script simulasi viewport (`python3` / node DOM parser) | `#game-root` tidak pernah melebihi area aman; seluruh UI (header BPS s.d. footer) berjarak >24px dari tepi potong | **TINGGI** |
| **Kompatibilitas Runtime Lama** | `vite.config.js`, `dist/assets/index-*.js` | Sintaks modern (`??`, `?.`, `#field`, `dvh`/`svh`) yang menargetkan Safari 16.4 & Chrome 111 vs target WebView Android 80 / iOS 12 | Regex search pada bundle JS & validasi AST Babel/ESLint | Tidak ada operator `??`, `?.`, private `#`, dan fallback CSS untuk browser tanpa `dvh` | **TINGGI** |
| **Font & Tipografi** | `index.html`, `src/scenes/HubScene.js`, `src/games/*/Constants.js` | Ketersediaan file font 'Public Pixel' dan 'Inter'; status fallback ke sans-serif | Script pencarian file font & CSS `@font-face` | Font ter-embed lokal via `@font-face` (format WOFF2) tanpa ketergantungan koneksi luar | **SEDANG** |
| **Konfigurasi Deployment Vercel** | `package.json`, `.gitignore`, `dist/` | Status pelacakan folder `dist/` di git, keberadaan `vercel.json` untuk clean routing dan caching header | `git status`, `git ls-files dist`, `ls vercel.json` | `dist/` di-ignore dari git, `vercel.json` tersedia dengan header cache immutable untuk assets | **SEDANG** |
| **Ukuran Bundle & Aset** | `dist/assets/`, `public/assets/` | Aset yang di-preload tapi tidak dipakai (`mahkota-icon`, `restart-icon` di Hub), ukuran bundle JS (>1.4 MB raw) | Script kalkulasi ukuran byte & gzip | Aset mati dihapus dari preload; bundle JS teroptimasi dan terkompresi | **SEDANG** |
| **Storage & Persistence** | `src/shared/Storage.js` | Ketahanan LocalStorage saat diakses di iOS Private Browsing / Captive Network Assistant (CNA) | Code inspection & unit test eksekusi Storage mock | Seluruh operasi `localStorage.getItem/setItem` terbungkus `try/catch` tanpa melempar uncaught exception | **RENDAH** |
| **Audio & Haptics** | `src/shared/Audio.js` | Respon WebAudio API autoplay policy, unlock on gesture, memory leak AudioContext | Code inspection event unlock gesture & WebAudio node graph | AudioContext di-resume saat first tap, masterGain terhubung benar, silent fail saat mute | **RENDAH** |
| **Logika Permainan Tenten** | `src/games/tenten/` | Siklus game over, scoring, collision matrix 10x10, auto-pause saat window blur | Code inspection auto-pause dan state reset | Game over terdeteksi akurat saat tidak ada balok yang muat; state dibersihkan saat exit | **RENDAH** |
| **Logika Permainan Memory Angka** | `src/games/memory-angka/` | Heuristik level generator, reproduktifitas PRNG Mulberry32, DDA scaling | Script pengujian `node scratch/test_memory_generator.mjs` | 100% tes generator lulus (<2ms per level, non-kluster, seed deterministik) | **RENDAH** |
| **Sisa Asumsi Offline / Captive Portal** | `src/`, `index.html` | Keberadaan hardcoded IP (`192.168.x.x`), tombol "Buka di Safari", atau fetch URL eksternal | `grep -rn "192\.168\|http:\|https:\|Safari"` | Nol referensi IP hardcoded, nol permintaan jaringan eksternal saat game berjalan | **RENDAH** |
| **Keamanan & Sanitasi Input** | `src/`, `index.html` | Penggunaan `innerHTML`, `eval()`, atau injeksi skrip berbahaya | `grep -rn "innerHTML\|eval(\|document.write"` | Nol kerentanan injeksi DOM atau dynamic code execution | **RENDAH** |
| **Performa & GC (Garbage Collection)** | `src/games/*/scenes/` | Object pooling pada tile & partikel, pencegahan alokasi memori berulang di loop `update()` | Code inspection object pool & loop update | Tidak ada instansiasi objek Phaser baru per frame; garbage collection stabil 60 FPS | **RENDAH** |

---

## 5. RENCANA AUDIT

Tabel urutan kerja terstruktur untuk fase audit teknis berikutnya:

| No | Domain | Pemeriksaan Spesifik | Alat / Perintah | Kriteria Lulus | Perkiraan Usaha | Status Kelayakan Lingkungan |
|:---:|---|---|---|---|:---:|:---:|
| **1** | **UI & Layout** | Audit matematis bounding box `#game-root` vs safe area pada 10 profil resolusi HP | Script Python kalkulasi geometri DOM | Tidak ada clipping overflow pada rasio 16:9 hingga 20:9 | 2 jam | **Dapat Dijalankan** (CLI) |
| **2** | **UI & Layout** | Uji visual rendering aktual pada perangkat fisik HP (iOS Safari & Android Chrome) | Browser perangkat nyata / Chrome DevTools Remote Debug | Menu Hub terlihat utuh dari logo BPS atas hingga footer bawah | 3 jam | **TIDAK DAPAT** *(Butuh perangkat fisik / browser GUI)* |
| **3** | **Kompatibilitas** | Pengecekan AST sintaks ES2018 untuk target WebView Android 80 dan Safari 12 | Babel / ESLint parser script CLI | Nol sintaks ES2020+ (`??`, `?.`, `#`) yang belum ter-transpile | 2 jam | **Dapat Dijalankan** (CLI) |
| **4** | **Font** | Audit layout text metrics canvas saat font offline disematkan via `@font-face` WOFF2 | Headless browser / canvas text measure test script | Teks pixel konsisten dan tidak bergeser antar browser | 2 jam | **Dapat Sebagian** *(Pengukuran via node-canvas)* |
| **5** | **Build & Vercel** | Audit konfigurasi build Vite, single chunking, dan penyusunan `vercel.json` | `vite build`, `git status`, verifikasi manifest output | Build clean, `dist/` terpisah rapi dari git history, header cache siap | 1.5 jam | **Dapat Dijalankan** (CLI) |
| **6** | **Aset & Ukuran** | Pembersihan aset redundant (unreferenced preload) dan optimalisasi kompresi WebP | Script analisis referensi aset dan file size check | Pengurangan beban bundle preload hingga >60 KB | 1 jam | **Dapat Dijalankan** (CLI) |
| **7** | **Logika Game** | Audit integritas state save/load dan transisi antar-scene saat pause/gameover | Headless state flow simulator script | Tidak ada memory leak pada texture cache dan display list Phaser | 2 jam | **Dapat Dijalankan** (CLI) |

> **Catatan Batasan Lingkungan Audit**:
> Pemeriksaan yang ditandai **TIDAK DAPAT** dijalankan di lingkungan ini disebabkan oleh ketiadaan interface grafis desktop (GUI display server), ketiadaan browser browser-engine nyata (seperti WebKit iOS aktual), dan ketiadaan akses fisik ke handset mobile untuk pengujian gesture sentuh nyata. Pemeriksaan tersebut harus diverifikasi oleh tim pengembang pada perangkat nyata.

---

## 6. PERTANYAAN TERBUKA

Daftar hal yang tidak dapat disimpulkan semata-mata dari kode sumber dan memerlukan keputusan dari pemilik proyek (maksimal 10 butir):

1. **Target Minimal Perangkat & Browser**: Apakah game wajib mendukung perangkat lama seperti Android WebView 80 (Android 10 awal / Android Go) dan iOS 12 (iPhone 6), ataukah cukup mendukung standar modern (iOS 15+ / Chrome 100+)? Penurunan target ke iOS 12 memerlukan plugin `@vitejs/plugin-legacy` dan polyfill ES2018.
2. **Ketersediaan File Font 'Public Pixel'**: Apakah ada file fisik berlisensi bebas (misal `.woff2`) untuk font 'Public Pixel' yang dapat disertakan langsung ke dalam folder `public/fonts/`, ataukah tipografi retro diizinkan menggunakan font pixel alternatif / fallback sistem?
3. **Penyertaan File Font 'Inter'**: Apakah font teks UI ('Inter') perlu di-embed secara offline (ukuran ~50–100 KB) untuk keseragaman visual di seluruh perangkat, atau tetap mengandalkan font sistem bawaan (`sans-serif` / `-apple-system`)?
4. **Strategi Responsif Hub (Letterboxing vs Fluid Responsive)**: Jika rasio layar ponsel pengguna lebih panjang (misal 20:9), apakah preferensi tampilan menu Hub adalah:
   - *Pilihan A*: Strict Letterbox (tetap 9:16 di tengah dengan margin warna latar `#F1F5F9` di atas/bawah).
   - *Pilihan B*: Fluid Vertical (background dan elemen header/footer dinamis meregang mengisi seluruh tinggi layar HP).
5. **Manajemen Git untuk Folder `dist/`**: Mengapa folder `dist/` saat ini di-commit ke repositori git? Apakah pemilik proyek berniat menghapus `dist/` dari git dan membiarkan Vercel melakukan build otomatis secara CI/CD dari kode sumber `src/`?
6. **Aset Redundant pada Preloader Hub**: Apakah icon `mahkota-icon.webp` dan `restart-icon.webp` yang saat ini di-preload di `OpeningScene` dan `HubScene` (tetapi tidak pernah ditampilkan di Hub) boleh ditunda pemuatannya (*lazy load*) hingga pemain benar-benar masuk ke scene game terkait demi mempercepat waktu loading awal?
7. **Tombol Navigasi Cepat Keluar ke Hub pada Tenten**: Pada game Tenten, saat ini tidak ada tombol kembali langsung di header (hanya bisa keluar lewat menu Pause atau GameOver). Apakah perlu disediakan tombol tombol "Keluar" langsung di pojok header seperti halnya pada Memory Angka?
8. **Pengaturan Durasi Opening Screen**: Apakah durasi minimal splash screen pembuka BPS sebesar 1600ms (`OpeningScene.js:51`) sudah sesuai dengan arahan branding BPS, atau ingin dipersingkat agar pengunjung ruang tunggu dapat lebih cepat memilih game?
9. **Kebutuhan Favicon & Metadata Web App**: Apakah logo resmi BPS (`logo-bps.webp`) disetujui untuk dikonversi menjadi favicon (`favicon.ico` / `apple-touch-icon`) dan deklarasi PWA manifest (agar game dapat ditambahkan ke Home Screen tablet/HP ruang tunggu)?
10. **Target URL & Domain Vercel**: Apakah deployment Vercel ini akan menggunakan custom domain kedinasan (misal `*.bps.go.id`) yang memerlukan konfigurasi DNS dan header keamanan (CSP) khusus di `vercel.json`?
