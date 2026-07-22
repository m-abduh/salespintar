# PRD: SalesPintar (haloAI) — Multi-Tenant SaaS

> **Versi:** 3.1  
> **Status:** Multi-Tenant SaaS  
> **Target MVP:** 10 minggu
> **Catatan:** Multi-tenant menambah kompleksitas di WA session management, row-level authorization, dan onboarding flow. Estimasi 8 minggu + 2 minggu buffer.

---

## 1. Ringkasan Eksekutif

Platform **AI-powered CS WhatsApp multi-tenant SaaS** dengan fitur **Auto Reply real-time**, **Broadcast Scheduler**, dan **Dashboard Overview**. Satu platform melayani banyak bisnis, masing-masing dengan nomor WA, data, dan pengguna sendiri.

**Masalah:** Bisnis kehilangan leads karena lambat respon di WhatsApp (rata-rata response time > 5 menit). Solusi AI CS mandiri mahal dan sulit di-maintain tiap bisnis.

**Solusi:** SaaS multi-tenant — tiap bisnis daftar, scan QR WA sendiri, langsung dapat AI CS otomatis. Pricing based on usage/tenant.

---

## 2. Fitur Utama

### 2.0 Landing Page & Onboarding (Prioritas: P0)

| ID | Fitur | Detail |
|----|-------|--------|
| LND-01 | Landing Page | Halaman publik SaaS: hero, fitur, harga, CTA "Coba Gratis", footer |
| LND-02 | Register | Form daftar **bisnis baru**: nama bisnis, nama admin, email, password. Register = create **business + admin user** sekaligus. Auto login → redirect ke **setup WA** |
| LND-03 | Login | Form login email + password. **Multi-tenant aware:** email unique secara global, login menentukan business context dari user |
| LND-04 | Protected Routes | Landing & auth = public. Dashboard + fitur = wajib login & punya business_id aktif |

> **Flow User:** `Landing → Register (create business + admin) → Setup WA (scan QR) → Dashboard`

### 2.1 Auto CS (Prioritas: P0)

| ID | Fitur | Detail |
|----|-------|--------|
| ACS-01 | Integrasi WhatsApp | Scan QR via Baileys — **per bisnis**. Masing-masing bisnis punya koneksi WA sendiri. Multi-device support (satu nomor WA di banyak device) |
| ACS-02 | AI Auto Reply | LLM (Groq) balas pesan masuk real-time per bisnis, prompt disesuaikan konteks bisnis tersebut |
| ACS-03 | Context Window | Riwayat chat per lead disimpan, dikirim sebagai konteks ke LLM (last 20 messages) |
| ACS-04 | Human Takeover | Sales ambil alih chat via dashboard. Hanya sales dalam satu bisnis yang bisa takeover chat bisnis tersebut |
| ACS-05 | Smart Tagging | Deteksi intent lead (minat, tanya harga, komplain, spam) via LLM, per-bisnis |
| ACS-06 | Lead Scoring | Skor 0-100 berdasarkan engagement & intent per bisnis |
| ACS-07 | Typing Indicator | Kirim "typing..." biar natural |
| ACS-08 | Anti Spam | Rate limit: max 1 pesan/3 detik per lead, max 3 berturut-turut tanpa balasan, max 50 AI replies/hari per lead. **Semua counter per-business** |

### 2.2 Broadcast Scheduler (Prioritas: P0)

| ID | Fitur | Detail |
|----|-------|--------|
| BRS-01 | Buat Jadwal | Admin pilih tanggal & jam kirim, sekali atau recurring |
| BRS-02 | Filter Target | Filter per segmen dalam bisnis tersebut |
| BRS-03 | Template Pesan | Variable `{{nama}}`, `{{nomor}}`, `{{produk}}`. Sanitasi input cegah injection |
| BRS-04 | Personal Massal | Kirim massal dengan variable personal per kontak |
| BRS-05 | Tracking Real-time | Status PENDING→SENDING→SENT→DELIVERED→READ via WebSocket |
| BRS-06 | Throttle Kirim | 20 pesan/menit via Baileys **per koneksi WA**. Kalau 1 bisnis, 20/menit. Untuk skala besar pake WA Business API |
| BRS-07 | Batch Cancel | Batalin broadcast yang masih PENDING/SENDING |
| BRS-08 | Retry Gagal | Auto retry 3x interval 5 menit |

### 2.3 Dashboard Overview (Prioritas: P0)

| ID | Fitur | Detail |
|----|-------|--------|
| DSH-01 | KPI Cards | Total chat hari ini, Active conversations, Leads baru, Conversion rate — **per bisnis** |
| DSH-02 | Grafik Tren | Chat trend 7/30 hari, Peak hours — scoped ke data bisnis |
| DSH-03 | Recent Conversations | List chat terbaru **bisnis ini**, filter by status |
| DSH-04 | Quick Stats | Response rate, Avg reply time, Top intent |
| DSH-05 | Broadcast Status | List broadcast milik bisnis ini |
| DSH-06 | AI Performance | AI replies, Human takeover rate, CSAT score |

### 2.4 Manajemen Kontak (Prioritas: P1)

| ID | Fitur | Detail |
|----|-------|--------|
| KNT-01 | Auto-sync | Kontak otomatis dari chat WA — **per bisnis** |
| KNT-02 | Manual CRUD | Tambah/edit/hapus kontak — dalam lingkup bisnis |
| KNT-03 | Segmen & Label | Multi-label per kontak |
| KNT-04 | Riwayat Chat | Full conversation history per kontak |
| KNT-05 | Export CSV | Export kontak bisnis ini |
| KNT-06 | Import CSV | Import dengan validasi nomor WA |

### 2.5 Auth & User Management (Prioritas: P0)

| ID | Fitur | Detail |
|----|-------|--------|
| AUT-01 | Login/Logout | JWT access token (15 menit) + refresh token (7 hari, httpOnly). Refresh rotation + stolen token detection |
| AUT-02 | Role-based Access | **Per bisnis:** ADMIN (full) vs SALES (chat only). Tidak ada super-admin global di MVP |
| AUT-03 | Session Management | Lihat & revoke session dalam bisnis yang sama |
| AUT-04 | Rate Limit Auth | Max 5 attempts per email per 15 menit, lock 30 menit |
| AUT-05 | Register | Mendaftarkan **bisnis baru + admin user** sekaligus. Sales diundang oleh ADMIN dalam bisnis yang sama |
| AUT-06 | Invite Sales | ADMIN bisa invite sales via email → sales login tanpa register mandiri |
| AUT-07 | Protected Routes | Landing & auth = public. Dashboard + fitur = protected + **wajib business_id valid & aktif** |

---

## 3. Tech Stack (Detail)

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| **Frontend** | React + Vite | Fast HMR, small bundle |
| **Styling** | Tailwind CSS | Utility-first |
| **State** | TanStack Query + Zustand | Server vs client state |
| **Form** | React Hook Form + Zod | Validasi real-time |
| **UI** | React Router, Recharts, date-fns | Minimal |
| **Backend** | Node.js (LTS) + Express | Ringan, ekosistem matang |
| **Database** | PostgreSQL + Prisma ORM | Type-safe, migration |
| **Cache/Queue** | Redis 7 + BullMQ | **Queue per-tenant via job data `business_id`**, bukan queue terpisah |
| **WA Gateway** | Baileys (WebSocket) | Satu proses handle banyak koneksi WA (satu per bisnis) |
| **AI/LLM** | Groq (Llama 3 / Mixtral) | Free tier |
| **Auth** | JWT + bcrypt | httpOnly cookie, JWT contains `business_id` |
| **Validation** | Zod | Runtime validation |
| **Logging** | Winston + Morgan | JSON logs, correlationId |
| **Security** | helmet, cors, express-rate-limit, cookie-parser | Standard |
| **Dev Tools** | tsx | TypeScript execution |
| **Deploy** | Docker + Docker Compose | Reproducible |
| **Reverse Proxy** | Nginx | SSL, static serving, rate limit |
| **Monitoring** | Sentry | Error tracking |

> **Catatan:** Versi dependencies wajib di-pin di `package.json` & `Dockerfile`.

### 3.1 ⚠️ Risk Acknowledgement: Baileys vs Official WA API

**Baileys adalah reverse-engineered WhatsApp Web library — BUKAN official API.**

| Faktor | Risiko | Mitigasi MVP |
|--------|--------|-------------|
| **Ban akun** | Tinggi — WA bisa flag number sebagai unofficial client | Gunakan nomor cadangan. **Warning di onboarding** bahwa nomor utama bisnis berisiko. Edukasi tenant |
| **Breaking changes** | Sedang — tiap update WA Web bisa break library | Pin version, test sebelum upgrade |
| **No SLA** | Tinggi — tidak ada jaminan uptime | Queue all outbound, auto-retry. Tenant lihat status koneksi WA di dashboard |
| **Multi-koneksi** | Sedang — banyak koneksi Baileys dalam 1 proses boros memory | Batasi max 50 koneksi per instance, monitoring memory tiap koneksi |
| **Feature terbatas** | Rendah — broadcast, auto-reply cukup | Jangan depend pada fitur lanjutan |

> **Migrasi WA Business API:** Trigger konkret — saat jumlah tenant aktif > 50 ATAU broadcast harian total > 10.000 pesan. Migrasi bertahap per tenant. Setiap tenant dikasih opsi upgrade ke WA Business API (dengan biaya tambahan).

### 3.2 Cost Estimation (MVP / month)

| Service | Estimasi | Catatan |
|---------|----------|---------|
| Groq API | **Gratis** | 30 req/min — shared pool semua tenant |
| VPS (4GB RAM, 4 CPU) | $20-30 | Diperlukan RAM lebih untuk banyak koneksi Baileys |
| Sentry | **Gratis** | 5k events/month |
| S3 Backup | < $1 | Backup DB harian |
| Domain + SSL | $10/year | Let's Encrypt |
| **Total** | **~$25-35/bulan** | Naik linier seiring jumlah tenant & koneksi WA |

---

## 4. Arsitektur & Flow

### 4.1 Arsitektur Sistem (Multi-Tenant)

```
                     ┌──────────────────────────────────────┐
                     │          API Server                   │
                     │  ┌─────────────────────────┐         │
                     │  │  Baileys Manager         │         │
                     │  │  ┌───┐ ┌───┐ ┌───┐     │         │
[Bisnis A] ←──→ WS──│──│Biz│ │Biz│ │...│ │         │
[Bisnis B] ←──→ WS──│──│ A │ │ B │ │   │ │         │
[Bisnis C] ←──→ WS──│──│   │ │   │ │   │ │         │
                     │  └───┘ └───┘ └───┘ │         │
                     │  ┌─────────────────┴──┐      │
                     │  │  Auth Middleware     │      │
                     │  │  (extract business_id│      │
                     │  │   from JWT)          │      │
                     │  └────────┬───────────┘      │
                     │           ▼                   │
                     │  ┌──────────────────┐         │
                     │  │  Row-Level Auth   │         │
                     │  │  WHERE business_id│         │
                     │  │  = jwt.business_id│         │
                     │  └────────┬──────────┘         │
                     │           ▼                     │
                     │  ┌──────────────────┐         │
                     │  │  Routes / Services│         │
                     │  └────────┬─────────┘         │
                     └───────────┼───────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              [PostgreSQL]  [BullMQ Queue] [Redis Cache]
                              ↕
                         [LLM Service]
                              ↕
                         [Groq API]
```

### 4.2 WA Session Management (Multi-Tenant)

```
Tiap bisnis punya 1 koneksi Baileys sendiri:

┌──────────────────────────────────────────┐
│          BaileysManager (Singleton)       │
│                                          │
│  Map<business_id, BaileysInstance>        │
│  ┌───────────┐  ┌───────────┐           │
│  │ Biz A     │  │ Biz B     │  ...       │
│  │ - sock    │  │ - sock    │           │
│  │ - store   │  │ - store   │           │
│  │ - creds   │  │ - creds   │           │
│  │ - state   │  │ - state   │           │
│  └───────────┘  └───────────┘           │
│                                          │
│  Methods:                                │
│  - getConnection(business_id)            │
│  - connect(business_id, creds)           │
│  - disconnect(business_id)               │
│  - getStatus(business_id)                │
│  - getTotalConnections()                 │
└──────────────────────────────────────────┘

Storage: ./wa_sessions/<business_id>/creds.json
         ./wa_sessions/<business_id>/session.data
```

**Kapasitas:** 1 koneksi Baileys ≈ 50-80MB RAM. Dengan 4GB RAM VPS, max ~40-50 koneksi. Jika > 50 tenant butuh koneksi → scaling ke server lain atau batasi tenant aktif.

### 4.3 Auto CS Flow (Detail)

```
1. LEAD → kirim WA ke nomor bisnis
2. Baileys instance untuk bisnis tersebut terima pesan
3. Server cari/create conversation untuk lead ini:
   a. Cek conversation dgn lead_id = x AND business_id = y AND status IN (AI, HUMAN)
   b. Jika tidak ada → CREATE conversation baru (business_id dari konteks Baileys)
4. Simpan pesan ke messages (dengan business_id dari conversation)
5. Jika AI mode:
   a. Enqueue ai-reply job dengan { business_id, conversation_id, lead_id }
   b. Query konteks (last 20 messages, scoped per business_id)
   c. Generate prompt → kirim ke Groq
   d. Simpan balasan AI
   e. Kirim typing + balasan via wa-send queue (scoped per business_id)
6. Update lead.last_message_at
7. Enqueue ai-tagging async
```

### 4.4 Human Takeover Flow

```
1. Sales di dashboard buka conversation
2. Klik "Ambil Alih"
3. API: POST /conversations/:id/takeover
4. Server cek: conversation.business_id === user.business_id (wajib sama)
5. Cek status + human_id → tolak 409 jika sudah di-takeover
6. Update conversation.status = HUMAN, conversation.human_id = sales_id
7. AI auto-reply STOP untuk conversation ini
8. Sales balas manual via POST /messages
9. Sales klik "Selesai" → status = DONE
10. Notifikasi WebSocket ke sales dalam bisnis yang sama
```

> **Optimistic locking:** Gunakan `updated_at` comparison untuk cegah duplicate takeover.

### 4.5 Broadcast Flow (Detail)

```
1. Admin buat broadcast via dashboard
2. API POST /broadcasts → simpan ke DB dengan business_id = admin.business_id
3. BullMQ job di-schedule
4. Job trigger (dengan business_id di job data):
   a. Query leads WHERE business_id = job.business_id AND filter ...
   b. Batch 100 leads → generate pesan
   c. Insert BroadcastLog
   d. Kirim via Baileys instance milik business_id tersebut
   e. Update BroadcastLog
5. Tracking via WebSocket (filter events by business_id)
```

### 4.6 Queue Architecture (BullMQ) — Multi-Tenant

```
                   ┌──────────────────────┐
                   │  Baileys (per-bisnis) │
                   └──────┬───────────────┘
                          │ pesan masuk (dengan business_id)
                          ▼
                ┌─────────────────┐
                │  AI Reply Queue  │
                │ (business_id di  │
                │  job data)       │
                └────────┬────────┘
                         │ balasan AI
                         ▼
                ┌──────────────────┐
                │  WA Send Queue    │
                │ (business_id di   │
                │  job data)        │
                └────────┬─────────┘
                         │ kirim via Baileys
                         ▼
                ┌──────────────────┐
                │  BaileysManager  │
                │ (route ke instance│
                │  by business_id)  │
                └──────────────────┘
```

| Queue | Fungsi | Priority | Concurrency | Tenant Isolation |
|-------|--------|----------|-------------|-----------------|
| **ai-reply** | Panggil Groq API untuk auto-reply | HIGH | 5 | `business_id` di job data. Filter konteks per tenant |
| **ai-tagging** | Smart tagging + scoring (async) | LOW | 2 | Scoped per `business_id` |
| **wa-send** | Kirim pesan ke WA via Baileys | HIGH: AI reply, LOW: broadcast | 3 | Route ke Baileys instance berdasarkan `business_id` |
| **broadcast** | Eksekusi broadcast | LOW | 1 | Query + kirim dalam lingkup `business_id` |

> **Redis Keys:** Semua cache key wajib prefix `business_id:` — `{business_id}:lead:{id}`, `{business_id}:dashboard:stats`, dll.

---

## 5. Database Schema (Detail)

### 5.1 Entity Relationship (Multi-Tenant)

```
businesses ──1:N── users
businesses ──1:N── wa_credentials
businesses ──1:N── leads
businesses ──1:N── broadcasts
leads ──1:N── conversations (sessions)
leads ──1:N── broadcast_logs
broadcasts ──1:N── broadcast_logs
conversations ──1:N── messages (chat history)
users ──1:N── conversations (sales takeover)
```

### 5.2 Schema

```sql
-- Businesses (tenants)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE, -- untuk subdomain/identitas
  is_active BOOLEAN NOT NULL DEFAULT true,
  ai_config JSONB DEFAULT '{}', -- { "prompt_prefix": "...", "model": "..." }
  settings JSONB DEFAULT '{}',  -- { "timezone": "Asia/Jakarta", "language": "id" }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users (admin/sales) — terikat ke satu bisnis
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE, -- unique global (cross-tenant login)
  password VARCHAR(255) NOT NULL, -- bcrypt hash
  role VARCHAR(20) NOT NULL DEFAULT 'ADMIN', -- ADMIN | SALES
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  invite_token VARCHAR(255), -- untuk invite sales
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_business ON users(business_id);
CREATE INDEX idx_users_email ON users(email);

-- WhatsApp credentials per business
CREATE TABLE wa_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  wa_number VARCHAR(15) NOT NULL,
  wa_id VARCHAR(100),
  session_data JSONB, -- Baileys auth state (creds + keys)
  status VARCHAR(20) NOT NULL DEFAULT 'DISCONNECTED', -- CONNECTED | DISCONNECTED | EXPIRED | BANNED
  qr_code TEXT, -- current QR (base64), expired after 60s
  qr_expires_at TIMESTAMPTZ,
  last_connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, wa_number) -- ganti wa_number UNIQUE global
);

CREATE INDEX idx_wa_credentials_business ON wa_credentials(business_id);

-- Leads (contacts from WA) — terikat ke bisnis
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(200),
  wa_number VARCHAR(15) NOT NULL,
  wa_id VARCHAR(100), -- Baileys JID
  avatar_url TEXT,
  segment VARCHAR(50),
  labels TEXT[] DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0, -- 0-100
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | INACTIVE | CONVERTED | BLOCKED
  intent VARCHAR(50), -- minat | tanya_harga | komplain | spam | unknown
  last_message_at TIMESTAMPTZ,
  daily_ai_count INTEGER NOT NULL DEFAULT 0, -- reset midnight via cron (per business timezone)
  total_messages INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, wa_number) -- satu nomor WA bisa jadi lead di banyak bisnis
);

CREATE INDEX idx_leads_business ON leads(business_id);
CREATE INDEX idx_leads_business_status ON leads(business_id, status);
CREATE INDEX idx_leads_business_segment ON leads(business_id, segment);
CREATE INDEX idx_leads_business_last_message ON leads(business_id, last_message_at);

-- Conversations (sessions) — terikat ke bisnis
-- Satu lead bisa punya banyak sesi percakapan dalam satu bisnis
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status VARCHAR(10) NOT NULL DEFAULT 'AI', -- AI | HUMAN | DONE
  human_id UUID REFERENCES users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_business ON conversations(business_id);
CREATE INDEX idx_conversations_business_lead ON conversations(business_id, lead_id);
CREATE INDEX idx_conversations_business_status ON conversations(business_id, status);

-- Messages — terikat ke bisnis (via conversation)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text', -- text | image | document | location
  media_url TEXT,
  from_role VARCHAR(10) NOT NULL, -- LEAD | AI | HUMAN
  human_id UUID REFERENCES users(id),
  ai_model VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_business ON messages(business_id);
CREATE INDEX idx_messages_conversation ON messages(business_id, conversation_id, created_at DESC);
CREATE INDEX idx_messages_created ON messages(business_id, created_at);

-- Broadcast campaigns — terikat ke bisnis
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  template_vars TEXT[] DEFAULT '{}',
  filter JSONB,
  schedule_type VARCHAR(20) NOT NULL DEFAULT 'once', -- once | daily | weekly
  schedule_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | SENDING | SENT | PARTIAL | FAILED | CANCELLED
  total_target INTEGER NOT NULL DEFAULT 0,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_delivered INTEGER NOT NULL DEFAULT 0,
  total_read INTEGER NOT NULL DEFAULT 0,
  total_failed INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_broadcasts_business ON broadcasts(business_id);
CREATE INDEX idx_broadcasts_business_status ON broadcasts(business_id, status);
CREATE INDEX idx_broadcasts_schedule ON broadcasts(business_id, schedule_at);

-- Broadcast delivery logs — terikat ke bisnis
CREATE TABLE broadcast_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  wa_message_id VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | SENT | DELIVERED | READ | FAILED
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(broadcast_id, lead_id)
);

CREATE INDEX idx_broadcast_logs_business ON broadcast_logs(business_id);
CREATE INDEX idx_broadcast_logs_broadcast ON broadcast_logs(business_id, broadcast_id);
CREATE INDEX idx_broadcast_logs_lead ON broadcast_logs(business_id, lead_id);
CREATE INDEX idx_broadcast_logs_status ON broadcast_logs(business_id, status);

-- Session store (refresh tokens) — terikat ke bisnis
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(500) NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address VARCHAR(45),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_business ON sessions(business_id);
CREATE INDEX idx_sessions_user ON sessions(business_id, user_id);
CREATE INDEX idx_sessions_token ON sessions(refresh_token);
```

### 5.3 Schema Migrasi dari Single ke Multi Tenant

**Untuk tenant pertama (development):**
- Insert 1 baris di `businesses`
- Insert user admin dengan `business_id` dari business tersebut

**Untuk tenant baru (register flow):**
1. INSERT `businesses` (nama, slug dari nama bisnis)
2. INSERT `users` role=ADMIN dengan `business_id` baru
3. INSERT `wa_credentials` kosong (status DISCONNECTED)
4. Redirect ke halaman setup WA untuk scan QR

---

## 6. API Endpoints

### 6.0 Health & System

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/v1/health` | No | Health check: DB, Redis, **total koneksi WA aktif**, memory usage, Groq API |

### 6.1 Auth

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/v1/auth/register` | No | Daftar **bisnis baru + admin user**. Body: `{ businessName, name, email, password }` |
| POST | `/api/v1/auth/login` | No | Login, return access + refresh token + `business_id` |
| POST | `/api/v1/auth/refresh` | No | Refresh access token |
| POST | `/api/v1/auth/logout` | Yes | Revoke refresh token |
| GET | `/api/v1/auth/sessions` | Yes | List active sessions (dalam bisnis ini) |
| DELETE | `/api/v1/auth/sessions/:id` | Yes | Revoke session (harus dalam bisnis yang sama) |
| POST | `/api/v1/auth/invite` | Yes (ADMIN) | Invite sales baru ke bisnis ini |

### 6.2 WhatsApp Setup

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/v1/wa/qr` | Yes (ADMIN) | Generate QR code untuk koneksi WA bisnis ini |
| GET | `/api/v1/wa/status` | Yes | Status koneksi WA bisnis ini |
| POST | `/api/v1/wa/disconnect` | Yes (ADMIN) | Putuskan koneksi WA |
| POST | `/api/v1/wa/reconnect` | Yes (ADMIN) | Reconnect WA (QR ulang) |

### 6.3 Conversations

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/v1/conversations` | Yes | List conversations (scoped ke bisnis user) |
| GET | `/api/v1/conversations/:id` | Yes | Detail + lead info + last message |
| PATCH | `/api/v1/conversations/:id` | Yes | Update status/notes |
| POST | `/api/v1/conversations/:id/takeover` | Yes | Human takeover |
| POST | `/api/v1/conversations/:id/release` | Yes | Release back to AI |
| POST | `/api/v1/conversations/:id/complete` | Yes | Tandai selesai |

### 6.4 Messages

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/v1/conversations/:id/messages` | Yes | List messages (paginated) |
| POST | `/api/v1/conversations/:id/messages` | Yes | Sales kirim reply |

### 6.5 Contacts (Leads)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/v1/leads` | Yes | List leads bisnis ini |
| GET | `/api/v1/leads/:id` | Yes | Detail lead |
| POST | `/api/v1/leads` | Yes | Create lead |
| PATCH | `/api/v1/leads/:id` | Yes | Update lead |
| DELETE | `/api/v1/leads/:id` | Yes | Soft delete (scoped) |
| POST | `/api/v1/leads/import` | Yes | Import CSV |
| GET | `/api/v1/leads/export` | Yes | Export CSV |

### 6.6 Broadcasts

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/v1/broadcasts` | Yes | List broadcast milik bisnis ini |
| POST | `/api/v1/broadcasts` | Yes (ADMIN) | Create broadcast |
| GET | `/api/v1/broadcasts/:id` | Yes | Detail + stats |
| PATCH | `/api/v1/broadcasts/:id` | Yes (ADMIN) | Update (if PENDING) |
| DELETE | `/api/v1/broadcasts/:id` | Yes (ADMIN) | Cancel |
| GET | `/api/v1/broadcasts/:id/logs` | Yes | Delivery logs |

### 6.7 Dashboard

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/v1/dashboard/stats` | Yes | KPI cards (scoped ke bisnis) |
| GET | `/api/v1/dashboard/trends` | Yes | Chart data |
| GET | `/api/v1/dashboard/recent` | Yes | Recent conversations |
| GET | `/api/v1/dashboard/performance` | Yes | AI performance metrics |

### 6.8 WebSocket

| Event | Direction | Deskripsi |
|-------|-----------|-----------|
| `chat:new` | Server → Client | Notifikasi chat baru (dalam bisnis ini) |
| `chat:status` | Server → Client | Status change (dalam bisnis ini) |
| `broadcast:progress` | Server → Client | Broadcast progress (dalam bisnis ini) |
| `wa:connected` | Server → Client | WA connection status bisnis ini |
| `ws:reconnect` | Server → Client | Client harus reconnect |

> **🔐 WebSocket Auth:**
> - Koneksi WebSocket menyertakan JWT access token di query param: `ws://host?token=<access_token>`
> - Server validasi token, **extract `business_id`**, filter event hanya untuk bisnis tersebut
> - Rate limit: max 100 messages/min per connection
> - **Room-based:** Tiap bisnis join room `business:{business_id}`, hanya terima event untuk bisnisnya

> **WebSocket Reconnection Strategy (Client-side):**
> - Exponential backoff: 1s → 2s → 4s → 8s → max 30s
> - Kirim `last_event_id` saat reconnect
> - Buffer events selama disconnected (max 50)
> - Heartbeat setiap 30 detik (ping/pong)

---

## 7. Non-Functional Requirements

### 7.1 Security

| Kategori | Requirement |
|----------|-------------|
| **Password** | bcrypt cost 12, min 8 karakter |
| **JWT** | Access token 15 menit, refresh token 7 hari. **JWT payload wajib contain:** `{ userId, businessId, role }`. Refresh rotation + stolen detection |
| **Row-Level Auth** | **WAJIB:** Setiap query Prisma/API tambah `WHERE business_id = req.user.businessId`. Jangan sampai user bisnis A bisa akses data bisnis B via ID guessing |
| **Headers** | Helmet middleware |
| **CORS** | Whitelist origin, tidak pake `*` |
| **Rate Limit** | Global: 100 req/min per IP. Auth: 5 req/15min. Broadcast API: 10 req/min per bisnis. AI reply: max 50/hari per lead |
| **Input Validation** | Zod di semua input |
| **SQL Injection** | Prisma prevents SQL injection |
| **XSS** | Output encoding, CSP header |
| **CSRF** | SameSite cookie + CSRF token |
| **Credential Storage** | WA credentials di DB (encrypted column via Prisma), bukan env var global |
| **Logging** | Jangan log password, token, message content sensitif. Setiap log punya `correlationId` + `businessId` untuk tracing |
| **Secrets Rotation** | Rotate JWT secrets setiap 90 hari |

### 7.2 Performance

| Metrik | Target |
|--------|--------|
| AI Response time | < 3 detik (P95) |
| API Response time | < 200ms (P95) |
| Broadcast speed | 20 messages/minute per koneksi WA |
| Concurrent chats | 500+ per instance |
| Concurrent WA connections | 40-50 per instance (4GB RAM) |
| Uptime | 99.5% |

### 7.3 Scalability (Realistis — Multi-Tenant)

- **Stateful WA connections:** Horizontal scaling tidak semudah stateless app. Strategi:
  - **1 instance = N koneksi WA.** Jika penuh → deploy instance baru dengan subset tenant.
  - **Routing:** Butuh router layer yang map `business_id` → instance. Bisa pake Redis pub/sub atau sticky routing.
  - **MVP:** Cukup 1 instance. Jika > 50 tenant, scale up VPS (8GB RAM) dulu, scale out belakangan.
- Redis cache key prefix `{business_id}:*` untuk shared caching
- PostgreSQL connection pool max 20 per instance
- Dashboard queries pake Redis cache TTL 5 menit
- **Post-MVP:** PgBouncer, multi-instance dengan Redis pub/sub untuk koordinasi Baileys

### 7.4 Availability

- Auto-reconnect WhatsApp per bisnis
- Graceful shutdown (SIGTERM handler):
  - Stop accept requests
  - Tunggu active jobs max 30 detik
  - Close Prisma, Redis, BullMQ
  - **Save semua WA session** sebelum exit
- Health check: `GET /api/v1/health`
- BullMQ job serialization + idempotency key
- Container: `restart: unless-stopped` + healthcheck
- **Memory limit:** Container API `--memory=1G` + `NODE_OPTIONS="--max-old-space-size=768"` (lebih besar karena banyak koneksi WA)
- **Log rotation:** Winston daily rotate, max 100MB, retain 30 hari

### 7.5 Operational Hardening

| Item | Requirement |
|------|-------------|
| **Env Validation** | Validasi env var saat startup |
| **Trust Proxy** | Express `app.set('trust proxy', 1)` |
| **Error Handler** | Global error middleware, jangan bocorkan stack trace |
| **Media Files** | WA media di `./uploads/`, Nginx serving |
| **WA Sessions** | Di-volume mount `./wa_sessions/` biar persistent. Jangan simpan di container |
| **Prisma Migration** | `prisma migrate deploy` di CI/CD. Rollback: restore DB + deploy versi lama |
| **DB Connection** | Prisma pool min 2, max 10 |
| **CORS** | Whitelist domain frontend saja |

### 7.6 Frontend Resilience

| Kategori | Requirement |
|----------|-------------|
| **Error Boundary** | Per route Error Boundary |
| **Offline State** | Banner "Koneksi terputus" + auto reconnect |
| **Loading State** | Skeleton loading |
| **Empty State** | Ilustrasi + CTA |
| **API Retry** | TanStack Query: retry 3x, no retry mutation |
| **Graceful Degradation** | WebSocket fallback ke polling REST 15 detik |
| **Optimistic Updates** | Kirim pesan langsung tampil |

---

## 8. Environment & Configuration

### 8.1 Environment Variables

```bash
# App
NODE_ENV=development|staging|production
PORT=3000
API_PREFIX=/api/v1

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/salespintar

# Redis
REDIS_URL=redis://localhost:6379
REDIS_BULL_URL=redis://localhost:6379/1

# JWT
JWT_ACCESS_SECRET=<random-64-chars>
JWT_REFRESH_SECRET=<random-64-chars>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# AI / LLM (Groq)
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.1-8b-instant
GROQ_FALLBACK_MODEL=mixtral-8x7b-32768
GROQ_MAX_TOKENS=1024
GROQ_TEMPERATURE=0.7
GROQ_DAILY_CAP_PER_LEAD=50

# WhatsApp — Per-Business (tidak ada global session file)
# Session disimpan di DB (wa_credentials.session_data) + file ./wa_sessions/<business_id>/
WA_SESSIONS_DIR=./wa_sessions

# Limit koneksi WA per instance
WA_MAX_CONNECTIONS=50

# CORS
CORS_ORIGIN=http://localhost:5173

# Rate Limit
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
LOG_DIR=./logs
LOG_CORRELATION_ENABLED=true

# Sentry
SENTRY_DSN=
SENTRY_ENVIRONMENT=${NODE_ENV}

# Broadcast
BROADCAST_BATCH_SIZE=20
BROADCAST_THROTTLE_MS=3000
BROADCAST_MAX_RETRIES=3
```

---

## 9. Edge Cases & Error Handling

### 9.1 Multi-Tenant Specific

| Skenario | Handling |
|----------|----------|
| **User A coba akses data bisnis B** | Row-level auth di Prisma middleware — tambah `business_id` filter otomatis di semua query. Return 404 (bukan 403) untuk hindari info leak |
| **Register dengan email yang sudah ada** | Tolak dengan 409 — email unique secara global |
| **Dua bisnis daftar dengan slug yang sama** | Auto-generate slug unique: `bisnisku-1`, `bisnisku-2` |
| **Bisnis non-aktif** | Middleware cek `business.is_active` di setiap request. Return 402 Payment Required jika inactive |
| **Koneksi WA terputus di satu bisnis** | Hanya bisnis tersebut yang terdampak. Tenant lain tetap jalan. Dashboard bisnis tersebut tampilkan "WA Disconnected — Scan QR Ulang" |
| **Memory overload karena banyak koneksi WA** | BaileysManager reject koneksi baru jika > WA_MAX_CONNECTIONS. Return error "Server at capacity, please try again later" |

### 9.2 WhatsApp Connection

| Skenario | Handling |
|----------|----------|
| QR expired | Notifikasi dashboard, minta scan ulang |
| WA disconnect per bisnis | Auto reconnect, queue outbound. Update `wa_credentials.status` |
| Ban/block per nomor | Deteksi, throttle, notifikasi admin bisnis tersebut |
| Network timeout | Retry 3x exponential backoff |

### 9.3 AI/LLM

| Skenario | Handling |
|----------|----------|
| Groq down / rate limit | Auto fallback ke model lain (llama → mixtral) |
| All models down | Fallback template "Maaf sedang sibuk" |
| Rate limit | Queue, retry with backoff |
| Toxic/spam input | Filter input + output |
| Empty response | Retry 1x, then template fallback |

### 9.4 Broadcast

| Skenario | Handling |
|----------|----------|
| WA number invalid | Mark FAILED, log, lanjut |
| Broadcast di-trigger saat server restart | BullMQ persistent jobs, auto-resume |
| Duplicate send | Check broadcast_log |
| Schedule missed | BullMQ retry |
| Broadcast koneksi WA bisnis sedang down | Tunda sampai koneksi pulih, mark jobs delayed |

### 9.5 Database

| Skenario | Handling |
|----------|----------|
| Connection lost | Prisma auto-reconnect |
| Slow query | Index monitoring, EXPLAIN ANALYZE |
| Deadlock | Prisma retry, short transactions |
| Connection pool exhaustion | Alarm > 80% pool |

### 9.6 Disaster Recovery & Backup

| Skenario | Handling |
|----------|----------|
| **Accidental delete / corruption** | Backup harian (pg_dump) retention 30 hari |
| **Server crash** | Docker restart policy + healthcheck |
| **WA session lost** | WA session per-bisnis di-volume mount persistent. Restore dari DB `wa_credentials.session_data` |
| **Redis data loss** | Redis AOF + RDB snapshots 5 menit. BullMQ jobs persist |

> **Backup Strategy (MVP):**
> - **Daily:** pg_dump → gzip → 30 hari di host + S3
> - **On-event:** Backup `wa_credentials` setiap QR sukses scan (sudah di DB, tinggal backup DB)
> - **Post-MVP:** Point-in-time recovery, WAL

---

## 10. Testing Strategy

| Level | Tools | Coverage Target | Notes Multi-Tenant |
|-------|-------|-----------------|-------------------|
| **Unit** | Vitest | 80%+ services & utils | Test business isolation logic |
| **Integration** | Supertest + Test DB | Semua endpoint + **row-level auth** | Test user A cannot access business B data |
| **E2E** | Playwright | Core flow: register bisnis, login, chat, broadcast | Test multi-tenant scenario |
| **WA Mock** | Custom Baileys mock | WhatsApp integration | Mock koneksi per-bisnis |
| **Race Condition** | Vitest concurrent | **Concurrent takeover, duplicate broadcast, concurrent register** | Test dengan Promise.all |

---

## 11. Deployment & DevOps

### 11.1 Container Structure

```yaml
# docker-compose.yml (MVP Multi-Tenant)
services:
  api:        # Node.js backend — handle semua koneksi WA
  web:        # Nginx serving React + reverse proxy
  postgres:   # PostgreSQL 16
  redis:      # Redis 7
```

> **Volume mounts penting:**
> - `./wa_sessions/:/app/wa_sessions/` — WA session per bisnis
> - `./uploads/:/app/uploads/` — media files

### 11.2 CI/CD Pipeline

```
Push → GitHub Actions:
  1. Lint & Type Check (ESLint + tsc)
  2. Unit Test + Integration Test (Vitest)
     — Termasuk test isolasi multi-tenant
  3. Build Docker image
  4. Push ke registry
  5. Deploy ke VPS:
     a. SSH pull image + docker compose up -d
     b. Prisma migrate deploy
     c. Healthcheck verify (3x sukses)
     d. Rollback jika gagal
```

### 11.3 Monitoring & Observability

- **Health check:** `GET /api/v1/health` (DB, Redis, **jumlah koneksi WA aktif**, Groq)
- **Logs:** Winston JSON → daily rotate. Setiap log punya `correlationId` + `businessId`
- **Errors:** Sentry, capture unhandled rejection
- **Alerts:** Error rate > 1% dalam 5 menit. **Koneksi WA turun > 20% dalam 1 menit**
- **Post-MVP:** Prometheus + Grafana, per-tenant metrics

---

## 12. Target MVP (Minggu 1-10)

| Minggu | Sprint | Deliverable |
|--------|--------|-------------|
| 1-2 | **Sprint 1** | Backend setup, Prisma schema multi-tenant (businesses + business_id di semua tabel), register bisnis, auth multi-tenant, Landing page + auth UI + setup WA page |
| 2-4 | **Sprint 2** | BaileysManager (multi-koneksi), WA connect/disconnect per bisnis, receive & store messages with business_id, typing indicator |
| 4-5 | **Sprint 3** | AI integration (Groq), auto reply with business context, context management, anti-spam per-bisnis |
| 5-7 | **Sprint 4** | Dashboard API with row-level auth (WHERE business_id = ?), React frontend layout, KPI cards, grafik, WebSocket room-based events |
| 7-8 | **Sprint 5** | Chat UI + human takeover with business scoping, sales reply, conversation list filtered per-bisnis |
| 8-9 | **Sprint 6** | Broadcast scheduler + contact management (CRUD, import/export) — semua scoped per business_id |
| 9-10 | **Sprint 7** | Production hardening: row-level auth audit, error boundary, loading/empty state, graceful shutdown (save WA sessions), backup cron, Sentry, Docker compose final, race condition tests |

---

## 13. Post-MVP Roadmap

| Fitur | Timeline | Notes |
|-------|----------|-------|
| Multi-agent (multiple WA numbers per business) | Sprint 8 | Satu bisnis punya > 1 nomor WA |
| Template quick reply | Sprint 8 | Canned responses per business |
| Export report PDF/Excel | Sprint 9 | Scoped per business |
| Super Admin (platform-wide) | Sprint 9 | Panel kelola semua bisnis |
| WA Business API migration path | Sprint 10 | Per-tenant upgrade option |
| Billing & subscription | Sprint 10 | Pricing based on usage/tier |
| Integrasi CRM (HubSpot, Salesforce) | Q3 |
| CSAT survey otomatis | Q3 |
| Mobile app (React Native) | Q4 |

---

## 14. Regulasi & Kepatuhan (UU PDP)

| Aspek | Kebijakan |
|-------|-----------|
| **Retensi Data Chat** | Riwayat chat disimpan max 90 hari setelah conversation DONE. Auto-delete via cron. Business bisa set retensi sendiri (30/60/90 hari) |
| **Consent Broadcast** | Broadcast hanya ke lead yang pernah chat inbound. Setiap broadcast wajib ada opt-out. Opt-out di-hormati forever |
| **Hak Pengguna (Data Subject)** | Endpoint `DELETE /api/v1/leads/:id/data` — hapus semua data personal lead (anonimisasi). Endpoint `GET /api/v1/leads/:id/data` — export data personal lead |
| **Data Breach Notification** | Notifikasi ke tenant dalam 24 jam jika ada indikasi kebocoran data |
| **Log Aktivitas** | Semua akses ke data personal tercatat di activity log (siapa, kapan, akses apa) |

---

## 15. Glossary

| Istilah | Definisi |
|---------|----------|
| **Tenant / Business** | Satu entitas bisnis yang menggunakan platform. Punya data, user, dan koneksi WA sendiri |
| **Lead** | Kontak WA yang ngirim chat ke nomor bisnis tertentu |
| **Human Takeover** | Sales mengambil alih chat dari AI |
| **Broadcast** | Kirim pesan massal terjadwal |
| **Baileys** | Library WhatsApp Web API via WebSocket (tanpa browser) |
| **BullMQ** | Redis-based job queue |
| **Row-Level Auth** | Mekanisme yang memastikan user hanya bisa akses data bisnisnya sendiri |
| **BaileysManager** | Singleton yang manage semua koneksi Baileys per bisnis |
| **Smart Tagging** | Klasifikasi intent lead via AI |
| **Lead Scoring** | Skoring engagement & intent |
