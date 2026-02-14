# 🍪 Auto Login - Chrome Extension

Ekstensi Chrome untuk menyimpan dan me-restore session login menggunakan cookies. Tidak perlu lagi mengingat password - cukup simpan session cookies Anda!

## 🎯 Fitur Utama

- **Simpan Session** - Simpan cookies login dari tab aktif dengan satu klik
- **Restore Session** - Kembalikan cookies untuk login otomatis
- **Buka & Login** - Buka website di tab baru dengan session langsung aktif
- **Multi Session** - Simpan banyak session untuk website yang berbeda
- **Aman** - Tidak menyimpan password, hanya cookies session

## 📁 Struktur File

```
d:/Tools/Autologin/
├── manifest.json      # Konfigurasi ekstensi Chrome
├── popup.html         # UI popup ekstensi
├── popup.css          # Styling popup
├── popup.js           # Logika popup (save/load sessions)
├── background.js      # Service worker (restore cookies)
├── content.js         # Content script (cookie injection)
├── icons/             # Folder icon ekstensi
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # Dokumentasi ini
```

## 🚀 Cara Install

1. **Buka Chrome Extensions**
   - Ketik `chrome://extensions/` di address bar Chrome
   - Atau klik menu Chrome → More tools → Extensions

2. **Aktifkan Developer Mode**
   - Toggle "Developer mode" di kanan atas (ON)

3. **Load Extension**
   - Klik tombol **"Load unpacked"**
   - Pilih folder `d:/Tools/Autologin`
   - Ekstensi akan muncul di daftar

4. **Pin Extension (Opsional)**
   - Klik icon puzzle 🧩 di toolbar Chrome
   - Klik pin 📌 di sebelah "Auto Login"
   - Icon akan muncul di toolbar untuk akses cepat

## 📖 Cara Penggunaan

### Menyimpan Session Login

1. **Login ke website** yang ingin disimpan (contoh: Gmail, Facebook, Netflix)
2. **Pastikan sudah login** dan session aktif
3. **Klik icon Auto Login** di toolbar Chrome
4. **Masukkan nama session** (contoh: "Gmail Pribadi")
5. **Klik "Simpan Session"**
6. Extension akan mengambil semua cookies dari website tersebut

### Restore Session (Login Otomatis)

**Cara 1: Restore di Tab Aktif**
1. Buka website yang ingin di-login (atau biarkan di halaman mana saja)
2. Klik icon Auto Login
3. Klik tombol **"🔓 Restore Session"** pada session yang diinginkan
4. Cookies akan di-set ke tab aktif
5. Refresh halaman (F5) jika perlu

**Cara 2: Buka Tab Baru + Auto Login**
1. Klik icon Auto Login
2. Klik tombol **"🌐 Buka & Login"** pada session yang diinginkan
3. Tab baru akan terbuka dengan URL website
4. Session cookies otomatis di-restore
5. Anda langsung login!

### Menghapus Session

1. Klik icon Auto Login
2. Klik tombol **"🗑️"** (delete) pada session yang ingin dihapus
3. Konfirmasi penghapusan

## 🔧 Permissions yang Dibutuhkan

| Permission | Fungsi |
|------------|--------|
| `storage` | Menyimpan data session lokal |
| `cookies` | Mengambil dan mengatur cookies |
| `tabs` | Membuka tab baru dan mengakses tab aktif |
| `activeTab` | Akses tab yang sedang aktif |
| `scripting` | Inject script untuk set cookies |
| `<all_urls>` | Akses ke semua website |

## ⚠️ Catatan Penting

### Keamanan & Privasi
- **Cookies disimpan lokal** di browser Anda (Chrome Storage)
- **Tidak ada data yang dikirim ke server** - 100% offline
- **Hati-hati berbagi device** - siapapun dengan akses browser bisa menggunakan session tersimpan

### Keterbatasan
- **HttpOnly Cookies** - Beberapa cookies dengan flag `httpOnly` tidak bisa diakses JavaScript, tapi tetap dicoba restore via Chrome Cookies API
- **Session Expired** - Jika session di server sudah expired, restore cookies tidak akan berfungsi
- **Cross-Domain** - Cookies dengan domain restrictions mungkin tidak berfungsi di subdomain berbeda
- **Secure Cookies** - Cookies dengan flag `secure` hanya berfungsi di HTTPS

### Troubleshooting

**Session tidak berfungsi setelah restore?**
- Pastikan Anda tidak logout dari website di device lain
- Coba refresh halaman (F5) setelah restore
- Periksa apakah session sudah expired di server

**Cookies tidak tersimpan?**
- Pastikan Anda sudah login sebelum menyimpan session
- Beberapa website menggunakan proteksi anti-cookie-stealing
- Coba simpan session lagi setelah beberapa detik login

**Website tidak recognize login?**
- Beberapa website menggunakan fingerprinting tambahan (IP, User-Agent, dll)
- Session mungkin terbatas untuk device/browser tertentu

## 🛠️ Teknis

### Bagaimana Cara Kerjanya?

1. **Save Session:**
   - Ambil semua cookies dari domain website menggunakan `chrome.cookies.getAll()`
   - Simpan ke Chrome Storage dengan metadata (nama, URL, timestamp)

2. **Restore Session:**
   - Gunakan `chrome.cookies.set()` untuk restore httpOnly cookies
   - Inject JavaScript untuk restore cookies yang bisa diakses JS
   - Refresh tab untuk apply perubahan

3. **Auto-Login:**
   - Buka tab baru dengan URL tersimpan
   - Tunggu page load
   - Restore cookies
   - Refresh untuk apply session

### Browser Support

- ✅ Chrome (Chromium-based)
- ✅ Microsoft Edge
- ✅ Brave
- ✅ Opera
- ❌ Firefox (memerlukan modifikasi manifest v2)

## 📝 Changelog

### v1.0.0
- Initial release
- Cookie-based session save/restore
- Auto-login dengan tab baru
- UI dalam Bahasa Indonesia

## 🤝 Kontribusi

Silakan fork dan submit pull request untuk perbaikan atau fitur baru!

## 📄 Lisensi

MIT License - Bebas digunakan untuk personal atau komersial.

---

**Dibuat dengan ❤️ untuk memudahkan akses website favorit Anda**
