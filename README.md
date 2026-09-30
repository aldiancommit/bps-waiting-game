# Game Ruang Tunggu BPS (Offline Web Game Collection)
  Dokumen ini ditujukan sebagai panduan teknis dan instruksi kerja bagi pengembang serta AI Assistant/IDE (Antigravity) dalam melanjutkan pengembangan suite mini game offline ini.

# 1. Konsep & Tujuan ProyekAplikasi game berbasis PWA / Client-Side Web Game yang dirancang khusus untuk pengunjung ruang tunggu BPS.Sifat: Offline sepenuhnya setelah loaded dari server lokal (Wi-Fi lokal BPS).Format: Mobile-first (layar portrait), ringan, tanpa ketergantungan koneksi internet luar.Engine/Stack: HTML5, Phaser.js (v3), Vite.

# 2. Daftar Game yang Dikembangkan
    - 1010 Block Puzzle (Fokus Saat Ini)Mekanik: Papan grid $10 \times 10$. Pemain menempatkan balok tetris/balok blok dengan bentuk acak ke papan. Baris atau kolom yang terisi penuh akan hancur dan menambah skor. Game over jika tidak ada tempat lagi untuk memasukkan balok.
    (Biar tidak over progres, kerjakan 1010 saja dlu)

    - TTS (Teka Teki Silang BPS)Mini quiz / TTS dengan konten seputar data/statistik & edukasi BPS.
    - Memory Card (Angka / Statistik)Game mencocokkan kartu angka/simbol untuk melatih ingatan.

# 3. Instruksi untuk Antigravity IDE / AI Assistant Ketika memperbarui atau menambahkan fitur pada kode:
-  Aturan Single-File / Modular Asset: Pertahankan logika game dalam main.js atau modul JS terstruktur tanpa merusak skema build Vite.
- Mobile Responsive: Semua UI dan Canvas harus menyesuaikan ukuran layar HP (Scale Mode: FIT
- Performance Optimization: Hindari pemanggilan library berat external. Gunakan Phaser Arcade Physics / Graphics API internal untuk menggambar aset jika aset gambar fisik belum tersedia.
- Offline Capability: Pastikan logika state/skor tersimpan di localStorage HP pemain.

# 4. Perintah Dasar# Menjalankan server pengembangan lokal (akses via Wi-Fi)
npm run dev

# 5.Membangun file produksi offline
npm run build
