# Panduan Deployment ke Vercel

Panduan ini berisi langkah-langkah persiapan dan pelaksanaan deployment untuk proyek **BPS Waiting Game** ke platform Vercel.

---

## 1. Prasyarat
Sebelum memulai proses deployment:
- Seluruh langkah audit lokal harus hijau: `npm run build` dan `npm run predeploy` berhasil 100% tanpa error.
- Pemilik proyek **SUDAH** memverifikasi langsung di peramban HP fisik (via `npx vite preview --host`) bahwa:
  - Tampilan game layar penuh tanpa pita warna berbeda.
  - Refresh pada peramban memulihkan scene/state terakhir secara diam-diam.
  - Alur masuk ke level Memory Card berfungsi normal.

---

## 2. Prosedur Deployment

### Jalur A: Melalui Integrasi GitHub (Disarankan)
1. **Push ke Branch Baru**:
   Pemilik proyek melakukan `git push` ke branch verifikasi baru (misalnya branch `deploy-check`, **BUKAN** langsung ke `main`):
   ```bash
   git checkout -b deploy-check
   git push origin deploy-check
   ```
2. **Import Proyek di Vercel**:
   - Masuk ke dashboard [vercel.com](https://vercel.com).
   - Klik **Add New Project** lalu pilih **Import** pada repositori `bps-waiting-game`.
   - Konfigurasi Build & Output Settings:
     - **Framework Preset**: `Vite`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
   - Klik **Deploy**.
3. **Uji URL Preview di HP**:
   - Buka URL Preview yang dihasilkan Vercel pada peramban HP fisik.
   - Jalankan seluruh butir daftar periksa pasca-deploy (lihat Bagian 5).
4. **Promote ke Production**:
   - Jika pengujian di branch preview lulus, lakukan merge branch `deploy-check` ke branch `main`.
   - Vercel akan otomatis membangun dan merilis versi Production.

---

### Jalur B: Melalui Vercel CLI (Opsional)
Jika memilih deployment via terminal lokal (pemilik melakukan login sendiri):
1. **Preview Deployment**:
   ```bash
   npx vercel
   ```
2. **Production Deployment**:
   ```bash
   npx vercel --prod
   ```

---

## 3. Catatan Paket Layanan Vercel
> [!NOTE]
> Paket **Vercel Hobby** (gratis) diperuntukkan khusus bagi penggunaan pribadi non-komersial dan memiliki batasan kuota (bandwidth/fair use). Jika game ini digunakan atas nama instansi kedinasan (BPS) atau klien publik resmi dengan volume trafik tinggi, pemilik proyek perlu memeriksa syarat layanan (Terms of Service) Vercel atau mempertimbangkan opsi hosting statis instansi lainnya.

---

## 4. Catatan Proteksi Deployment Preview
Deployment preview Vercel secara bawaan dapat mengaktifkan **Deployment Protection** (fitur yang meminta autentikasi/login akun Vercel sebelum halaman dapat dibuka).
- Jika URL preview meminta login saat dibuka di HP, pemilik proyek perlu memeriksa pengaturan di:  
  **Project Settings** $\rightarrow$ **Deployment Protection** pada dashboard Vercel untuk menonaktifkan proteksi sementara bagi keperluan pengujian publik. *(Perlu diperiksa di dashboard).*

---

## 5. Daftar Periksa Pasca-Deploy di HP (URL Preview / Production)
Setelah tautan dibuka di HP fisik, lakukan verifikasi butir-butir berikut:
- [ ] **a. Layar Penuh Bebas Pita**: Transisi Opening $\rightarrow$ Hub mengisi layar penuh tanpa pita berwarna berbeda di tepi atas/bawah.
- [ ] **b. Dekorasi Hub**: Segitiga hijau/biru dan glow kuning di Hub tidak terpotong lurus di tepi batas kanvas.
- [ ] **c. Mahkota Tenten**: Ikon mahkota di game Tenten berukuran normal dan proporsional (120x72.2 px).
- [ ] **d. Alur Lengkap**: Opening $\rightarrow$ Hub $\rightarrow$ Memory Card $\rightarrow$ Pilih Level $\rightarrow$ MemoryScene dapat dimasuki dan dimainkan.
- [ ] **e. Pemulihan State Refresh**:
  - Refresh di Hub: kembali ke Hub.
  - Refresh di Level Select Memory: kembali ke Level Select.
  - Refresh di Tenten (setelah melangkah): kembali ke papan permainan dengan susunan balok dan skor tetap utuh.
  - Refresh di Memory Angka (setelah menebak kartu): kembali ke level dan urutan kartu yang sama beserta status kartu yang sudah terbuka.
- [ ] **f. Tab Baru**: Membuka tautan pada tab baru peramban selalu memulai dari OpeningScene.
- [ ] **g. Konsol & Jaringan**: Tidak ada error merah di konsol (bila dicek via remote debugging) dan tidak ada status 404 pada tab Network.
- [ ] **h. Cache-Control Header**: Di DevTools Network, berkas JS/CSS di `/assets/` memiliki header `Cache-Control: public, max-age=31536000, immutable`, sedangkan `index.html` tidak memakai cache immutable.
- [ ] **i. Perilaku Mode Pesawat (Informasi)**: Uji mengaktifkan mode pesawat setelah game selesai dimuat untuk melihat kesiapan aset offline.

---

## 6. Prosedur Rollback
Jika terjadi kendala kritis pada rilis produksi:
1. **Lewat Dashboard Vercel**: Buka menu **Deployments**, cari deployment stabil sebelumnya, klik menu titik tiga $(\dots)$, lalu pilih **Promote to Production** / **Rollback**.
2. **Lewat Git**: Kembalikan commit melalui revert (`git revert <commit-hash>`) lalu push commit revert tersebut. Jangan melakukan force push (`git push --force`).
