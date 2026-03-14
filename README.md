# 🎱 Billiard POS v2

Sistem manajemen billiard lengkap — tanpa IoT, dengan Member, Waiting List, dan Absensi.

---

## Stack
- **Backend:** NestJS 10 + Prisma 5 + MySQL 8
- **Frontend:** Next.js 14 (App Router) + Tema Premium Lounge
- **Auth:** JWT Access Token (8j) + Refresh Token (30h) dengan rotasi

## Fitur Utama
- 🎱 Billing meja — Hourly, Flexible, Owner Lock, Paket
- 👥 Member — nomor member, login mandiri, riwayat billing
- 📋 Waiting List — antrian tamu & member di kasir
- 📍 Absensi — GPS + radius + shift kerja
- 🍔 Order F&B — menu, stok, modifier
- 💰 Keuangan — laporan, pengeluaran
- 🔐 RBAC — Owner, Manager, Cashier, Developer, Member

---

## Setup Cepat

### 1. Jalankan Database
```bash
docker compose up -d
```

### 2. Setup API
```bash
cd apps/api
cp .env.example .env
# Edit .env — isi JWT_SECRET dan JWT_REFRESH_SECRET
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run start:dev
```

### 3. Setup Web
```bash
cd apps/web
cp .env.example .env
npm install
npm run dev
```

### 4. Buka Browser
- **Web App:** http://localhost:3000
- **API Docs:** http://localhost:3001/api/docs
- **Halaman Absensi:** http://localhost:3000/attendance

---

## Role & Akses

| Role | Path | Keterangan |
|---|---|---|
| OWNER | `/owner/*` | Akses penuh |
| MANAGER | `/manager/*` | Operasional & laporan |
| CASHIER | `/cashier/*` | Billing & kasir harian |
| DEVELOPER | `/developer/*` | Konfigurasi meja |
| MEMBER | `/member/*` | Profil & riwayat diri sendiri |

---

## Konfigurasi Absensi (pertama kali)

1. Login sebagai **Owner**
2. **Absensi → Setting Lokasi** → isi koordinat venue + radius
3. **Absensi → Shift Kerja** → tambah shift (contoh: Shift Malam 19:00-22:00)
4. Karyawan buka `/attendance` → pilih shift → Absen Sekarang

---

## Buat Member Baru

1. Login sebagai **Owner** atau **Manager**
2. **Member → Tambah Member** → isi nama & no HP
3. Kredensial login (email + password) muncul **sekali** — simpan segera
4. Member bisa login di `/login` dengan kredensial tersebut

---

## Struktur Folder

```
billiard-pos/
├── apps/
│   ├── api/           # NestJS Backend (port 3001)
│   │   ├── prisma/    # Schema & migrasi database
│   │   └── src/
│   │       ├── auth/
│   │       ├── billing/      # Sesi billing
│   │       ├── members/      # Manajemen member (BARU)
│   │       ├── waiting-list/ # Antrian kasir (BARU)
│   │       ├── attendance/   # Absensi (BARU)
│   │       ├── tables/
│   │       ├── menu/
│   │       ├── orders/
│   │       ├── payments/
│   │       ├── finance/
│   │       └── ...
│   └── web/           # Next.js Frontend (port 3000)
│       └── src/
│           ├── app/   # Routes per role
│           ├── components/
│           └── lib/   # API client, Auth context
└── docker-compose.yml
```
