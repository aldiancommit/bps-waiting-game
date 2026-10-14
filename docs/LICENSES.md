# Inventaris Lisensi & Font (docs/LICENSES.md)

Dokumen ini mencatat inventaris font, lisensi hukum, asal sumber, dan status integrasi aset tipografi untuk **Ruang Game BPS**.

---

## 1. Tabel Inventaris Font

| Nama Font | Bobot / Varian | Format | Ukuran File | Lisensi | Sumber Asli | Status di Repositori |
|---|---|---|---:|---|---|:---:|
| **Poppins** | 400 (Regular) | WOFF2 (Latin subset) | 7.884 B (~7,7 KB) | SIL Open Font License 1.1 (OFL) | Google Fonts / Indian Type Foundry | **TERPASANG** (`public/fonts/Poppins-Regular.woff2`) |
| **Poppins** | 700 (Bold) | WOFF2 (Latin subset) | 7.816 B (~7,6 KB) | SIL Open Font License 1.1 (OFL) | Google Fonts / Indian Type Foundry | **TERPASANG** (`public/fonts/Poppins-Bold.woff2`) |
| **Inter** | Variable (100–900) | WOFF2 (Latin subset) | 48.256 B (~47,1 KB) | SIL Open Font License 1.1 (OFL) | Google Fonts / Rasmus Andersson | **TERPASANG** (`public/fonts/Inter-Variable.woff2`) |
| **Public Pixel** | 400 (Regular) | WOFF2 | *TBD* | Proprietary / Free for personal use (GGBotNet) | Menunggu penyediaan file dari pemilik proyek | **MENUNGGU FILE FONT DARI PEMILIK** (Pipeline siap) |

**Total Ukuran Font Terpasang**: **63.956 bytes (~62,45 KB)**  
*Batas Anggaran Maksimal*: <= 90 KB (**LULUS / Terpenuhi**, sisa ruang anggaran ~27,5 KB).

---

## 2. Rincian Lisensi & Hak Cipta

### A. Poppins
- **Hak Cipta**: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/poppins)
- **Teks Lisensi**: SIL Open Font License, Version 1.1.
- **Ketentuan**: Bebas digunakan, dipelajari, dimodifikasi, dan didistribusikan ulang secara komersial maupun non-komersial, selama tidak dijual secara mandiri.

### B. Inter
- **Hak Cipta**: Copyright (c) 2016-2024 The Inter Project Authors (https://github.com/rsms/inter)
- **Teks Lisensi**: SIL Open Font License, Version 1.1.
- **Ketentuan**: Bebas digunakan, di-embed dalam web app, dan didistribusikan ulang sesuai klausul OFL 1.1.

### C. Public Pixel
- **Kreator**: GGBotNet
- **Status Kebijakan**: Sesuai Keputusan Pemilik No. 2, font ini wajib di-embed lokal bila file resmi disediakan. Tim pengembang dilarang mengunduh font dari situs pihak ketiga yang tidak jelas lisensinya.
- **Mitigasi Teknis**: Pipeline `@font-face` di `index.html` telah disiapkan mengarah ke `/fonts/PublicPixel.woff2`. Sebelum file dimasukkan oleh pemilik, sistem secara aman menggunakan fallback font `'Public Pixel', 'Courier New', monospace, sans-serif` tanpa crash atau error blocking.
