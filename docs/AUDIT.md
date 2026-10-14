# Panduan Toolkit Audit Berkala (Recurring Audit Toolkit)

Dokumen ini menjelaskan rangkaian pemeriksaan otomatis (audit toolkit) pada proyek **BPS Waiting Game** (`bps-waiting-game`). Toolkit ini dirancang agar pemilik proyek dan pengembang dapat memverifikasi stabilitas, kepatuhan ukuran, kompatibilitas perangkat, dan keamanan aplikasi secara mandiri sebelum melakukan rilis ke Vercel atau domain dinas.

---

## 1. Ringkasan Perintah

| Perintah | Deskripsi | Waktu Eksekusi |
| :--- | :--- | :--- |
| `npm run predeploy` | **Direkomendasikan**: Menjalankan build produksi lalu mengeksekusi seluruh 7 modul audit. | ~3-4 detik |
| `npm run audit:all` | Menjalankan seluruh 7 modul audit pada bundle `dist/` dan kode sumber. | ~2-3 detik |
| `npm run audit:viewport` | Simulasi geometris layout 9:16 pada 17 profil perangkat & notch. | < 100 ms |
| `npm run audit:size` | Memeriksa ukuran raw, gzip, brotli terhadap ambang batas `budgets.json`. | < 200 ms |
| `npm run audit:compat` | Memverifikasi sintaks ES2021 (iOS 15 / Chrome 100) dan ketiadaan API terlarang. | ~1 detik |
| `npm run audit:fonts` | Memeriksa ketersediaan file woff2 lokal, anggaran font <= 90 KB, dan ketiadaan CDN eksternal. | < 100 ms |
| `npm run audit:deps` | Memeriksa pinning versi ketat di `package.json` dan 0 vulnerability via `npm audit`. | ~1-2 detik |
| `npm run audit:external` | Memindai `dist/` terhadap URL eksternal tidak resmi atau sisa IP captive-portal. | < 100 ms |
| `npm run audit:logic` | Menjalankan unit test logika game generator angka, DDA, dan ketahanan storage. | < 400 ms |
| `npm test` | Alias untuk `npm run audit:logic`. | < 400 ms |

---

## 2. Rincian Modul Audit

### 2.1. Audit Viewport (`scripts/audit/viewport-sim.mjs`)
- **Tujuan**: Menjamin rasio 9:16 tetap utuh, konten Hub berada di dalam zona aman (top margin $\ge 28$, bottom margin $\ge 28$), dan tidak ada elemen terpotong notch atau bilah navigasi dinamis.
- **Matriks Pengujian**: 17 profil perangkat riil, mencakup iPhone SE (320x568), iPhone 14/15 Pro Max dengan Safe Area Insets (Dynamic Island), ponsel Android layar jangkung (Galaxy S20, Pixel 7/8), tablet iPad/iPad Air (letterboxing pita samping), dan orientasi landscape (pillarboxing).
- **Kriteria Lulus**: Penyimpangan rasio 0.0000%, margin vertikal $\ge 28$ unit logika, zero clipping.

### 2.2. Audit Ukuran & Anggaran Performa (`scripts/audit/check-size.mjs`)
- **Tujuan**: Memastikan muatan aset tidak membengkak agar game tetap instan dimuat pada jaringan mobile seluler lambat.
- **Konfigurasi**: `scripts/audit/budgets.json`
  - `totalDistRawMaxBytes`: 1.700.000 B (1,62 MB)
  - `totalDistGzipMaxBytes`: 540.000 B (527 KB)
  - `jsGzipMaxBytes`: 395.000 B (385 KB)
  - `gameAssetsMaxBytes`: 61.440 B (60 KB)
  - `totalImagesMaxBytes`: 81.920 B (80 KB)
  - `totalFontsMaxBytes`: 92.160 B (90 KB)
- **Kriteria Lulus**: Semua metrik di bawah atau sama dengan ambang batas.

### 2.3. Audit Kompatibilitas (`scripts/audit/check-compat.mjs`)
- **Tujuan**: Memastikan kode kompatibel dengan target minimum Safari 15 / iOS 15 dan Chrome 100+ tanpa memerlukan polyfill runtime berat.
- **Pemeriksaan**:
  1. `es-check es2021 --module "dist/assets/*.js"`: Memeriksa sintaks AST bundel JavaScript.
  2. AST scan pada `src/` untuk API modern yang belum didukung browser target: `ctx.roundRect`, `ctx.letterSpacing`, `structuredClone`, `Array.prototype.at`, `ResizeObserver`.
- **Kriteria Lulus**: AST parser lulus tanpa error sintaks, 0 API terlarang ditemukan di `src/`.

### 2.4. Audit Font & Tipografi (`scripts/audit/check-fonts.mjs`)
- **Tujuan**: Menjamin font dimuat 100% lokal dari `public/fonts/` tanpa ketergantungan Google Fonts / CDN pihak ketiga yang berisiko gagal saat koneksi tertutup.
- **Pemeriksaan**:
  - Keberadaan file `Poppins-Regular.woff2`, `Poppins-Bold.woff2`, dan `Inter-Variable.woff2`.
  - Format harus murni `woff2` (tidak boleh TTF/OTF mentah).
  - Total ukuran font $\le 90$ KB.
  - Pemindaian seluruh file sumber terhadap URL CDN font eksternal.
  - Verifikasi dokumentasi lisensi di `docs/LICENSES.md`.
- **Kriteria Lulus**: Semua font lokal ada, ukuran sesuai anggaran, 0 CDN eksternal.

### 2.5. Audit Dependency & Keamanan (`scripts/audit/check-deps.mjs`)
- **Tujuan**: Mencegah supply chain attack dan bug tak terduga akibat update minor/patch otomatis package eksternal.
- **Pemeriksaan**:
  - Memverifikasi seluruh dependency di `package.json` ter-pin ketat (tanpa simbol `^`, `~`, `>`, `<`).
  - Memastikan deklarasi `engines.node` terdefinisi.
  - Menjalankan `npm audit --omit=dev --json` dan memastikan 0 kerentanan keamanan.
- **Kriteria Lulus**: Versi ter-pin ketat, 0 CVE/vulnerability.

### 2.6. Audit URL Eksternal & Jaringan (`scripts/audit/check-external.mjs`)
- **Tujuan**: Memastikan tidak ada kebocoran data, pemanggilan script pihak ketiga tanpa izin, atau sisa konfigurasi portal captive (misal IP lokal `192.168.x.x`).
- **Pemeriksaan**: Memindai seluruh artefak `dist/` (`.html`, `.js`, `.css`, `.json`) untuk mendeteksi URL atau IP address.
- **Kriteria Lulus**: Hanya URL resmi terdaftar yang diizinkan (`w3.org` untuk namespace SVG dan banner Phaser). Zero network leakage.

### 2.7. Audit Logika & Uji Unit (`scripts/audit/check-logic.mjs` / `npm test`)
- **Tujuan**: Menjaga integritas generator level dan penyimpanan status tanpa merusak aturan gameplay.
- **Cakupan Pengujian**:
  - `tests/memory-generator.test.mjs`:
    - Validasi struktur level 1 s.d. 60.
    - Invarian generator angka pada 1.000 seed (panjang urutan, angka unik, batas minimum jeda).
    - Determinisme PRNG Mulberry32.
    - Batas penyesuaian dinamis Soft DDA ($\pm 25\%$).
  - `tests/storage.test.mjs`:
    - Migrasi high score lama ke format baru.
    - Ketahanan terhadap data JSON korup di `localStorage`.
    - Progresi bintang Memory Angka.
    - Graceful fallback saat kuota penyimpanan peramban penuh (`QuotaExceededError`).
- **Kriteria Lulus**: Seluruh 8 test case lulus dengan status PASS.

---

## 3. Ambang Batas & Konfigurasi (`budgets.json`)

Jika di masa mendatang tim menambahkan aset baru, sesuaikan konfigurasi anggaran di `scripts/audit/budgets.json`:

```json
{
  "totalDistRawMaxBytes": 1700000,
  "totalDistGzipMaxBytes": 540000,
  "jsGzipMaxBytes": 395000,
  "gameAssetsMaxBytes": 61440,
  "totalImagesMaxBytes": 81920,
  "totalFontsMaxBytes": 92160
}
```

---

## 4. Checklist Pra-Rilis (Pre-Release Checklist)

Sebelum melakukan deployment ke Vercel atau production:
1. Pastikan perubahan kode telah disimpan dan diuji lokal (`npm run dev`).
2. Jalankan perintah komprehensif:
   ```bash
   npm run predeploy
   ```
3. Pastikan output terminal menampilkan:
   ```text
   HASIL: SEMUA PENGUJIAN 100% LULUS!
   HASIL AUDIT UKURAN: SEMUA ANGGARAN LULUS (100% PASS)!
   HASIL AUDIT KOMPATIBILITAS: 100% LULUS!
   HASIL AUDIT FONT: LULUS (Semua Font Lokal, Sesuai Anggaran, Lisensi Terdokumentasi)!
   HASIL AUDIT DEPENDENCY: LULUS (0 Vulnerabilities, All Pinned)!
   HASIL AUDIT JARINGAN: LULUS (Semua URL Terdaftar & Diizinkan, 0 Leak)!
   ℹ pass 8
   ℹ fail 0
   ```
4. Lakukan pengujian manual visual pada minimal 1 perangkat fisik iOS (Safari) dan 1 Android (Chrome) menggunakan panduan pengujian manual di [AUDIT_REPORT.md](file:///home/geewonii/projects/game/bps-waiting-game/AUDIT_REPORT.md).
