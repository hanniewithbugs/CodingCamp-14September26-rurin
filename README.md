# Expense & Budget Visualizer

Aplikasi web sederhana untuk mencatat pengeluaran harian dan memvisualisasikan distribusi pengeluaran per kategori. Semua data tersimpan langsung di browser — tidak butuh akun, tidak butuh internet, tidak butuh server.

---

## Fitur

**Fitur utama (MVP):**

- Form input pengeluaran dengan validasi — nama item, jumlah (Rupiah), dan kategori (Food / Transport / Fun) semuanya wajib diisi
- Daftar transaksi yang bisa di-scroll, lengkap dengan tombol hapus per item
- Total pengeluaran yang terupdate otomatis setiap kali transaksi ditambah atau dihapus, diformat dalam Rupiah (Rp)
- Doughnut chart (Chart.js) yang menampilkan proporsi pengeluaran per kategori, ikut berubah secara real-time
- Data tersimpan di Local Storage — refresh halaman tidak menghapus data

**Optional challenges:**

- **Monthly Summary** — tabel ringkasan pengeluaran per bulan, dipecah berdasarkan kategori
- **Highlight Over Limit** — set batas budget bulanan; jika pengeluaran bulan ini melebihi batas, semua item di list dan baris di tabel bulanan langsung diberi highlight merah beserta peringatan di kartu total
- **Dark / Light Mode** — toggle tema di pojok kanan header, pilihan tersimpan dan tetap aktif setelah refresh

---

## Teknologi

- **HTML** — struktur halaman
- **CSS** — styling custom tanpa framework, mobile-first, dengan CSS custom properties untuk tema
- **Vanilla JavaScript** — semua logika aplikasi tanpa library tambahan selain Chart.js
- **Chart.js** — doughnut chart via CDN
- **Local Storage** — penyimpanan data di sisi browser

Tidak ada React, Vue, Bootstrap, Tailwind, atau backend sama sekali.

---

## Cara Menjalankan

**Cara paling mudah:** download atau clone repo ini, lalu buka file `index.html` langsung di browser.

```
Klik dua kali index.html  →  langsung jalan di Chrome / Firefox / Edge / Safari
```

Atau kalau pakai VS Code, install ekstensi **Live Server** lalu klik *Go Live* di status bar.

**Live demo:** [GitHub Pages link menyusul setelah deployment]

---

## Struktur Folder

```
├── index.html          # Halaman utama aplikasi
├── css/
│   └── style.css       # Semua styling (light & dark mode, responsive)
├── js/
│   └── script.js       # Semua logika aplikasi
└── README.md
```

---

Dibuat untuk tugas CodingCamp — Revou, September 2026.
