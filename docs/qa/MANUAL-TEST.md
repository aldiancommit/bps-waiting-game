# Lembar Periksa Uji Manual (Manual QA Checklist)
Proyek: BPS Waiting Game  
Status Visual & Browser: **TIDAK TERVERIFIKASI (Menunggu Uji Nyata Pemilik di HP Fisik)**

Daftar periksa berikut harus diuji secara manual oleh pemilik proyek pada peramban HP fisik (Chrome Android / Safari iOS) melalui server preview produksi:

- [ ] **1. Layar Penuh Bebas Pita**: Layar penuh tanpa pita berbeda warna di HubScene, Tenten (BlockPuzzleScene), dan Memory Angka (MemoryScene).
- [ ] **2. Dekorasi Hub**: Dekorasi latar Hub (segitiga hijau/biru dan glow kuning) tidak terpotong lurus di tepi atas maupun bawah layar.
- [ ] **3. Ukuran Mahkota Tenten**: Ikon mahkota di atas skor game Tenten berukuran semula dan proporsional (120x72.2 px), bukan titik kecil.
- [ ] **4. Alur Navigasi Lengkap**: Transisi berjalan mulus dari OpeningScene -> HubScene -> Memory Card (Level Select) -> Pilih Level -> MemoryScene (game dapat dimainkan).
- [ ] **5. Pemulihan State pada Refresh (Tanpa Opening)**:
  - Refresh saat berada di Hub: kembali ke Hub langsung.
  - Refresh saat di Level Select Memory: kembali ke Level Select.
  - Refresh di Tenten setelah beberapa langkah: kembali ke papan Tenten dengan susunan balok dan skor yang sama.
  - Refresh di Memory Angka setelah membuka beberapa kartu: kembali ke level dan urutan kartu yang sama beserta status kartu yang sudah terbuka.
- [ ] **6. Isolasi Tab Baru**: Membuka game pada tab baru browser memulai permainan dari awal (OpeningScene).
- [ ] **7. Konsol Bersih**: Tidak ada error uncaught atau unhandled exception pada console peramban saat bermain atau me-refresh.
