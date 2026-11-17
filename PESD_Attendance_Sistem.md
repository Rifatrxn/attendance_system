# PRD: Sistem Absensi Multi-Method

## 1. Ikhtisar Proyek
Buat aplikasi web absensi yang mendukung tiga metode autentikasi: scan wajah, fingerprint, dan kartu/RFID. Sistem harus sederhana, fokus pada fungsi, anti-AI-slop, dengan antarmuka yang bersih dan intuitif.

## 2. Tujuan Utama
- Mendukung tiga metode absensi: wajah, sidik jari, kartu
- Antarmuka pengguna yang bersih dan intuitif
- Desain yang fokus pada fungsi (anti-AI-slop)
- Performa yang andal dan cepat
- Integrasi yang mudah dengan perangkat keras

## 3. Fitur Utama

### 3.1 Fitur Absensi
- Input scan wajah (kamera/webcam)
- Input fingerprint (scanner)
- Input kartu/RFID (reader)
- Pendaftaran pengguna multi-metode
- Riwayat absensi real-time
- Laporan dan statistik absensi

### 3.2 Fitur Pengguna
- Login dengan salah satu metode yang didukung
- Pendaftaran multi-metode (setup semua tiga metode)
- Lihat riwayat pribadi
- Export data absensi

### 3.3 Fitur Admin
- Manajemen pengguna
- Manajemen perangkat (kamera, scanner, RFID)
- Monitor status real-time
- Laporan kehadiran
- Pengaturan sistem

## 4. Arsitektur Teknis

### 4.1 Frontend
- Framework: Vanilla JS, Tailwind CSS
- Design: Clean, anti-AI-slop, fokus pada fungsi
- Responsif untuk desktop dan mobile
- Real-time updates dengan WebSocket

### 4.2 Backend
- Bahasa: Node.js + Express
- Database: MySQL
- API: RESTful
- WebSocket untuk real-time updates

### 4.3 Integrasi Perangkat Keras
- Kamera/webcam untuk face recognition
- Fingerprint scanner (USB/Serial)
- RFID card reader (USB/Serial)

## 5. Desain UI/UX

### 5.1 Prinsip Desain
- Minimalis: Hapus dekorasi yang tidak perlu
- Hierarki visual yang jelas
- Warna yang kontras untuk keterbacaan
- Font yang mudah dibaca
- Spacing yang konsisten

### 5.2 Tata Letak Utama
1. Halaman Login (pilih metode)
2. Halaman Dashboard utama
3. Halaman pendaftaran pengguna
4. Halaman monitor status
5. Halaman laporan

### 5.3 Warna dan Tipografi
- Latar belakang: Putih atau abu-abu sangat muda
- Teks utama: Hitam atau abu-abu gelap
- Aksen: Biru atau hijau untuk tindakan utama
- Font: Sistem sans-serif yang bersih (Inter, Roboto, Arial)

## 6. Alur Penggunaan Utama

### 6.1 Registrasi Pengguna
1. Admin membuat akun baru
2. Pengguna memilih metode untuk didaftarkan
3. Proses pendaftaran multi-langkah sesuai metode
4. Verifikasi dan aktivasi

### 6.2 Proses Absensi
1. Pengguna memilih metode di dashboard
2. Scanner/webcam aktif
3. Proses scan/verifikasi
4. Catatan absensi tersimpan
5. Konfirmasi real-time ditampilkan

### 6.3 Monitoring Admin
1. Login admin
2. Monitor status semua perangkat
3. Lihat absensi real-time
4. Generate laporan

## 7. Kebutuhan Perangkat Keras

### 7.1 Face Recognition
- Webcam/USB kamera
- Pencahayaan yang cukup
- Position pengguna yang konsisten

### 7.2 Fingerprint
- Fingerprint scanner (USB atau Serial)
- Driver perangkat yang kompatibel

### 7.3 RFID
- RFID reader (USB atau Serial)
- Kartu RFID yang kompatibel

## 8. Integrasi Face Recognition
- Integrasi OpenCV untuk deteksi wajah
- Library recognition (FaceNet, MTCNN)
- Registrasi wajah untuk pengguna baru
- Verifikasi wajah untuk absensi

## 9. Integrasi Fingerprint
- Kompatibel dengan scanner fingerprint HID
- Library verifikasi sidik jari (pyfingerprint, fingerlib)
- Enkripsi template sidik jari
- Pencocokan sidik jari real-time

## 10. Integrasi RFID
- Kompatibel dengan RFID reader MFRC522 atau serupa
- Decoding UID kartu NFC/RFID
- Registration dan verifikasi UID

## 11. Keamanan
- Otentikasi pengguna yang aman
- Enkripsi data sensitif
- Logging aktivitas
- Role-based access control

## 12. Skalabilitas
- Arsitektur yang dapat diskalakan
- Mendukung banyak pengguna simultan
- Database yang dapat diskalakan
- Cache untuk performa

## 13. Dokumen Tambahan
- Panduan instalasi perangkat keras
- API documentation
- Skrip integrasi perangkat keras
- Dokumentasi admin
- Troubleshooting guide

## 14. Timeline
- Fase 1: Setup dasar dan frontend (2 minggu)
- Fase 2: Integrasi perangkat keras (3 minggu)
- Fase 3: Backend dan database (2 minggu)
- Fase 4: Testing dan deployment (1 minggu)
- Total: 8 minggu