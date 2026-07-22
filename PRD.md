# PRD: SalesPintar (haloAI)

## 1. Ringkasan
Aplikasi AI-powered CS WhatsApp dengan fitur Auto Reply real-time, Broadcast Scheduler, dan Dashboard Overview. Target: mengurangi lost leads dengan respon instan 24/7 dan follow-up terjadwal.

## 2. Fitur Utama

### 2.1 Auto CS
- Integrasi WhatsApp via open-wa / baileys (scan QR)
- AI (LLM) balas pesan masuk real-time kayak CS manusia
- Konteks percakapan per lead (riwayat chat tersimpan)
- Human takeover — sales bisa ambil alih kapan aja
- Smart tagging & lead scoring (otomatis deteksi minat)

### 2.2 Broadcast Scheduler
- Admin buat jadwal kirim pesan ke kontak/segmen
- Massal (pesan sama) atau personal (dengan variable seperti nama)
- Filter target: semua kontak, segmen tertentu, lead aktif, lead inactive
- Tracking: siapa yang terkirim, baca, balas

### 2.3 Dashboard Overview
- KPI Cards: total chat, active conversation, leads hari ini
- Grafik tren chat (7/30 hari)
- Recent conversations list (status: AI / human / done / pending)
- Quick stats: response rate, avg reply time, conversion rate
- Scheduled & active broadcast list

### 2.4 Manajemen Kontak
- Daftar kontak otomatis dari siapa yang chat
- Manual add/edit kontak
- Segmen/label kontak
- Riwayat chat per kontak

## 3. Tech Stack

| Layer | Pilihan |
|-------|---------|
| Frontend | React + Vite |
| Backend | Node.js (Express) |
| Database | PostgreSQL |
| WA Gateway | open-wa / Baileys |
| AI | OpenAI / Claude API |
| Scheduler | node-cron / Bull + Redis |
| Auth | JWT |
| Deploy | Docker |

## 4. User Flow

### 4.1 Auto CS Flow
```
Lead WA → Server terima pesan → Simpan ke DB →
AI generate balasan (dengan konteks chat) →
Kirim balasan ke WA → Update status
```

### 4.2 Human Takeover Flow
```
Admin di dashboard → Klik "Ambil Alih" →
Flag conversation = human →
AI berhenti balas otomatis →
Sales balas manual via dashboard
```

### 4.3 Broadcast Flow
```
Admin buat jadwal → Pilih kontak/segmen →
Tulis pesan (bisa pake template) →
Atur waktu kirim → Scheduler jalan →
Kirim pesan → Track status kirim
```

## 5. Database Schema (Awal)

```
leads: id, nama, nomor_wa, segmen, skor, status, created_at
conversations: id, lead_id, pesan, dari (lead/ai/human), created_at
broadcasts: id, pesan, filter_segmen, jadwal, status, created_at
broadcast_logs: id, broadcast_id, lead_id, status_kirim, status_baca, created_at
users: id, nama, email, password (admin)
```

## 6. Target MVP
- Auto CS: AI bisa balas chat WA dasar (sapa, tanya produk, jawab FAQ)
- Broadcast: Admin bisa kirim pesan terjadwal ke semua kontak
- Dashboard: Lihat chat masuk, KPI, grafik
- Human takeover: Sales bisa ambil alih chat

## 7. Future (Post-MVP)
- Multi-agent (multiple WA numbers)
- Template quick reply
- Export report (PDF/Excel)
- Integrasi CRM
