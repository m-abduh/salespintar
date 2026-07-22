# PRD: SalesPintar (haloAI)

> **Versi:** 3.0  
> **Status:** Final  
> **Target MVP:** 8 minggu
> **Catatan:** Estimasi awal 6 minggu terlalu agresif melihat kompleksitas integrasi WA + AI + broadcast. Ditambah 2 minggu untuk buffer testing & production hardening.

---

## 1. Ringkasan Eksekutif

Aplikasi AI-powered CS WhatsApp dengan fitur **Auto Reply real-time**, **Broadcast Scheduler**, dan **Dashboard Overview**. Target: mengurangi *lost leads* dengan respon instan 24/7 dan follow-up terjadwal.

**Masalah:** Bisnis kehilangan leads karena lambat respon di WhatsApp (rata-rata response time > 5 menit). Sales kewalahan handle multiple chat manual.

**Solusi:** AI CS otomatis yang balas kayak manusia, dengan kemampuan takeover oleh sales kapan saja.

---

## 2. Fitur Utama

### 2.0 Landing Page & Onboarding (Prioritas: P0)

| ID | Fitur | Detail |
|----|-------|--------|
| LND-01 | Landing Page | Halaman publik pertama saat buka app. Berisi hero section, fitur unggulan, harga/CTA, footer. Desain profesional, responsive mobile |
| LND-02 | Register | Form daftar: nama, email, password, konfirmasi password. Validasi real-time. Setelah daftar → auto login → redirect ke dashboard |
| LND-03 | Login | Form login email + password. Link ke register. Opsi "Lupa password" (post-MVP). Setelah login → redirect ke dashboard |
| LND-04 | Protected Routes | Landing page & auth pages (login/register) — public. Dashboard & semua fitur — wajib login. Redirect ke login kalau token expired |

> **Flow User:** `Landing Page → Register → Dashboard (auto login)` atau `Landing Page → Login → Dashboard`

### 2.1 Auto CS (Prioritas: P0)

| ID | Fitur | Detail |
|----|-------|--------|
| ACS-01 | Integrasi WhatsApp | Scan QR via Baileys WebSocket, auto reconnect, multi-device support |
| ACS-02 | AI Auto Reply | LLM (Groq) balas pesan masuk real-time dengan konteks percakapan |
| ACS-03 | Context Window | Riwayat chat per lead disimpan, dikirim sebagai konteks ke LLM (last 20 messages) |
| ACS-04 | Human Takeover | Sales ambil alih chat via dashboard, AI berhenti balas otomatis, flag conversation = HUMAN |
| ACS-05 | Smart Tagging | Otomatis deteksi intent lead (minat, tanya harga, komplain, spam) via LLM |
| ACS-06 | Lead Scoring | Skor otomatis (0-100) berdasarkan frekuensi chat, intent, response rate |
| ACS-07 | Typing Indicator | Kirim "typing..." biar terasa natural kayak CS manusia |
| ACS-08 | Anti Spam | Rate limit balasan AI: max 1 pesan / 3 detik per lead, max 3 pesan berturut-turut tanpa balasan lead, max 50 AI replies/hari per lead |

### 2.2 Broadcast Scheduler (Prioritas: P0)

| ID | Fitur | Detail |
|----|-------|--------|
| BRS-01 | Buat Jadwal | Admin pilih tanggal & jam kirim, bisa sekali atau recurring (setiap hari/minggu) |
| BRS-02 | Filter Target | Semua kontak, segmen tertentu, lead aktif (last chat < 7 hari), lead inactive (> 30 hari) |
| BRS-03 | Template Pesan | Dukung variable: `{{nama}}`, `{{nomor}}`, `{{produk}}`. Preview sebelum kirim. **Harus ada sanitasi input** untuk cegah template injection (escape special chars di variable values) |
| BRS-04 | Personal Massal | Kirim pesan massal dengan variable personal per kontak |
| BRS-05 | Tracking Real-time | Status: PENDING → SENDING → SENT → DELIVERED → READ. Update real-time via WebSocket |
| BRS-06 | Throttle Kirim | Kirim bertahap (20 pesan/menit via Baileys — karena unofficial, 100/menit terlalu agresif). Untuk skala besar pake WA Business API (1000+/menit) |
| BRS-07 | Batch Cancel | Batalin broadcast yang masih PENDING atau SENDING |
| BRS-08 | Retry Gagal | Auto retry 3x untuk pesan gagal kirim, interval 5 menit |

### 2.3 Dashboard Overview (Prioritas: P0)

| ID | Fitur | Detail |
|----|-------|--------|
| DSH-01 | KPI Cards | Total chat hari ini, Active conversations, Leads baru, Conversion rate (real-time) |
| DSH-02 | Grafik Tren | Chat trend 7/30 hari (line chart), Peak hours distribution (bar chart) |
| DSH-03 | Recent Conversations | List chat terbaru, filter by status (AI/HUMAN/DONE/PENDING), click to open |
| DSH-04 | Quick Stats | Response rate (%), Avg reply time (detik), Busy hours, Top intent categories |
| DSH-05 | Broadcast Status | List broadcast aktif & terjadwal, progress bar, cancel button |
| DSH-06 | AI Performance | Total AI replies, Human takeover rate, CSAT score (dari feedback lead) |

### 2.4 Manajemen Kontak (Prioritas: P1)

| ID | Fitur | Detail |
|----|-------|--------|
| KNT-01 | Auto-sync | Kontak otomatis dari siapa yang chat lewat WA |
| KNT-02 | Manual CRUD | Tambah/edit/hapus kontak manual |
| KNT-03 | Segmen & Label | Multi-label per kontak, filter & grup by label |
| KNT-04 | Riwayat Chat | Full conversation history per kontak, infinite scroll |
| KNT-05 | Export CSV | Export kontak ke CSV (dengan label & skor) |
| KNT-06 | Import CSV | Import kontak dari CSV, validasi format nomor WA |

### 2.5 Auth & User Management (Prioritas: P0)

| ID | Fitur | Detail |
|----|-------|--------|
| AUT-01 | Login/Logout | JWT access token (15 menit) + refresh token (7 hari, httpOnly cookie). **Refresh token rotation:** setiap refresh, token lama di-revoke & ganti baru. Token lama yang dipakai ulang → semua session user di-revoke (indikasi token stolen) |
| AUT-02 | Role-based Access | ADMIN (full access) vs SALES (chat only, no broadcast/config) |
| AUT-03 | Session Management | Lihat & revoke session aktif |
| AUT-04 | Rate Limit Auth | Max 5 attempts per email per 15 menit, akun lock 30 menit setelah 5 gagal |
| AUT-05 | Register | Daftar akun baru: nama, email, password. Auto login setelah register. Hanya ADMIN bisa daftar (SALES diundang/dibuat oleh ADMIN) |
| AUT-06 | Protected Routes | Landing & auth pages = public. Dashboard + semua fitur = protected (redirect ke login) |

---

## 3. Tech Stack (Detail)

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| **Frontend** | React + Vite | Fast HMR, small bundle |
| **Styling** | Tailwind CSS | Utility-first, cepat |
| **State** | TanStack Query + Zustand | Server state vs client state terpisah |
| **Form** | React Hook Form + Zod | Validasi form real-time |
| **UI** | React Router (routing), Recharts (grafik), date-fns (tanggal) | Minimal, gak ada bloat |
| **Backend** | Node.js (LTS) + Express | Ringan, ekosistem matang |
| **Database** | PostgreSQL + Prisma ORM | Type-safe query, migration otomatis |
| **Cache/Queue** | Redis 7 + BullMQ | Job queue. **Wajib Redis 7** untuk fitur priority queue & delayed jobs BullMQ. **Koneksi dedicated** untuk BullMQ (pisah dari cache) biar gak saling rebut |
| **WA Gateway** | Baileys (WebSocket) | **Unofficial library.** Bisa kena ban. Untuk production serius → migrasi ke WhatsApp Business API (Cloud API / 360Dialog) |
| **AI/LLM** | Groq (Llama 3 / Mixtral) | Free tier, ringan & cepat |
| **Auth** | JWT (access + refresh) + bcrypt | httpOnly cookie, CSRF protection |
| **Validation** | Zod | Type-safe runtime validation |
| **Logging** | Winston + Morgan | Structured JSON logs, daily rotate |
| **Routing** | React Router | Client-side routing, nested layouts, protected routes |
| **Security** | helmet, cors, express-rate-limit, cookie-parser | Middleware standard Express |
| **Dev Tools** | tsx | TypeScript execution tanpa build |
| **Deploy** | Docker + Docker Compose | Reproducible environment |
| **Reverse Proxy** | Nginx | SSL termination, static serving, rate limit |
| **Monitoring** | Sentry | Error tracking production-grade |

> **Catatan:** Versi tanpa angka di atas. Di `package.json` & `Dockerfile` tiap komponen wajib di-pin ke versi spesifik biar build reproducible. Update versi dilakukan knowingly, bukan otomatis.

### 3.1 ⚠️ Risk Acknowledgement: Baileys vs Official WA API

**Baileys adalah reverse-engineered WhatsApp Web library — BUKAN official API.**

| Faktor | Risiko | Mitigasi MVP |
|--------|--------|-------------|
| **Ban akun** | Tinggi — WA bisa flag number sebagai unofficial client | Gunakan nomor cadangan, jangan nomor utama bisnis |
| **Breaking changes** | Sedang — tiap update WA Web bisa break library | Pin version, test sebelum upgrade |
| **No SLA** | Tinggi — tidak ada jaminan uptime | Queue all outbound messages, auto-retry |
| **Feature terbatas** | Rendah — broadcast, auto-reply sudah cukup | Jangan depend pada fitur lanjutan (catalog, payment) |

> **Post-MVP:** Rencanakan migrasi ke **WhatsApp Business Cloud API** (Meta) atau **360Dialog** untuk production skala besar. Baileys untuk MVP & validasi awal saja.

### 3.2 Cost Estimation (MVP / month)

| Service | Estimasi | Catatan |
|---------|----------|---------|
| Groq API | **Gratis** | 30 req/min, 14400 req/hari — cukup untuk < 500 chat/hari |
| VPS (2GB RAM, 2 CPU) | $10-15 | Digital Ocean / Linode / Vultr |
| Sentry | **Gratis** | 5k events/month |
| S3 Backup | < $1 | Hanya untuk backup DB harian |
| Domain + SSL | $10/year | Let's Encrypt gratis |
| **Total** | **~$15-20/bulan** | |

---

## 4. Arsitektur & Flow

### 4.1 Arsitektur Sistem

```
[User WA] ←→ [Baileys (WS)] ←→ [API Server] ←→ [PostgreSQL]
                                    ↕
                              [BullMQ Queue]
                                    ↕
                              [Redis Cache]
                                    ↕
                            [LLM Service]
                                    ↕
                          [Groq API]
```

### 4.2 Auto CS Flow (Detail)

```
1. LEAD → kirim WA ke nomor bisnis
2. Baileys terima pesan via WebSocket
3. Server cari/create conversation untuk lead ini:
   a. Cek apakah ada conversation dengan status AI atau HUMAN
   b. Jika tidak ada → CREATE conversation baru (status=AI)
   c. Jika ada HUMAN → skip AI, notifikasi sales
4. Simpan pesan ke DB (messages → INSERT)
5. Jika AI mode:
   a. Enqueue job ke ai-reply queue
   b. Queue handle: query konteks (last 20 messages dari messages table)
   c. Generate AI prompt → kirim ke Groq (via queue, handle rate limit)
   d. Simpan balasan AI ke DB
   e. Kirim typing indicator + balasan via wa-send queue
6. Update lead.last_message_at
7. Enqueue job ke ai-tagging async (intent detection + scoring)
8. Total round-trip target: < 3 detik (P95)
```

### 4.3 Human Takeover Flow

```
1. Sales di dashboard → buka conversation (thread)
2. Klik "Ambil Alih"
3. API: POST /conversations/:id/takeover
4. Server cek: conversation.status === 'HUMAN' dan human_id !== null?
   Jika sudah di-takeover sales lain → tolak dengan 409 Conflict
5. Server update: conversation.status = HUMAN, conversation.human_id = sales_id
6. AI auto-reply STOP untuk lead ini (ai-reply queue skip untuk conversation ini)
7. Sales bisa balas manual via dashboard → POST /messages (from_role = HUMAN)
8. Sales klik "Selesai" → PATCH conversation.status = DONE, set ended_at
9. Conversation baru berikutnya akan auto-create dengan status AI lagi
10. Notifikasi real-time via WebSocket ke sales lain
```

> **Critical:** Harus ada optimistic locking untuk cegah dua sales takeover chat yang sama bersamaan. Gunakan `updated_at` comparison atau `SELECT ... FOR UPDATE`.

### 4.4 Broadcast Flow (Detail)

```
1. Admin buat broadcast via dashboard
2. API POST /broadcasts → simpan ke DB (status: PENDING)
3. BullMQ job di-schedule sesuai jadwal
4. Job trigger:
   a. Query leads sesuai filter
   b. Batch 100 leads → generate pesan (replace variables)
   c. Insert BroadcastLog (status: PENDING)
    d. Kirim via Baileys (throttle 20/menit — safety untuk unofficial library)
   e. Update BroadcastLog (SENT/DELIVERED/FAILED)
   f. Update Broadcast progress
5. Tracking update real-time via WebSocket ke dashboard
```

> **⚠️ Broadcast Compliance:** WhatsApp melarang broadcast massal tanpa opt-in. Risiko: nomor bisa di-block atau di-flag sebagai spam. Pastikan:
> 1. Broadcast hanya dikirim ke lead yang pernah chat inbound (pernah interaksi)
> 2. Setiap broadcast wajib ada opsi "STOP" / berhenti berlangganan
> 3. Jangan kirim broadcast ke nomor yang sudah minta berhenti (BLOCKED status)
> 4. Untuk production serius: gunakan **WhatsApp Business API Template Messages** yang sudah pre-approved Meta

### 4.5 Queue Architecture (BullMQ)

```
                  ┌──────────────────────┐
                  │   Baileys (WA Event)  │
                  └──────┬───────────────┘
                         │ pesan masuk
                         ▼
               ┌─────────────────┐
               │  AI Reply Queue  │ ← PRIORITY HIGH
               │ (Groq API call)  │
               └────────┬────────┘
                        │ balasan AI
                        ▼
               ┌──────────────────┐
               │  WA Send Queue    │ ← PRIORITY HIGH (AI reply)
               │                   │ ← PRIORITY LOW  (broadcast)
               └────────┬─────────┘
                        │ kirim via Baileys
                        ▼
                  ┌──────────┐
                  │  Baileys  │
                  └──────────┘
```

| Queue | Fungsi | Priority | Concurrency | Notes |
|-------|--------|----------|-------------|-------|
| **ai-reply** | Panggil Groq API untuk auto-reply | HIGH | 5 | Queue handle rate limit Groq (30 req/min). Auto fallback jika gagal |
| **ai-tagging** | Smart tagging + scoring (async) | LOW | 2 | Gak blocking reply, jalan di belakang |
| **wa-send** | Kirim pesan ke WA via Baileys | HIGH: AI reply, LOW: broadcast | 3 | Pisah priority biar broadcast gak blocking auto-reply |
| **broadcast** | Eksekusi broadcast | LOW | 1 | Hanya 1 job broadcast dalam satu waktu |

> **Redis Connections:**
> - `connection 1`: BullMQ queue (wajib dedicated, gak compete sama operasi lain)
> - `connection 2`: Cache + session store (shared, acceptable)
> - Environment: `REDIS_URL` untuk cache, `REDIS_BULL_URL` untuk BullMQ (bisa指向 Redis yang sama dengan `maxRetriesPerRequest: null`)

---

## 5. Database Schema (Detail)

### 5.1 Entity Relationship

```
users ──1:N── conversations (sales takeover)
leads ──1:N── conversations (sessions)
leads ──1:N── broadcast_logs
broadcasts ──1:N── broadcast_logs
conversations ──1:N── messages (chat history)
```

### 5.2 Schema

```sql
-- Users (admin/sales)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL, -- bcrypt hash
  role VARCHAR(20) NOT NULL DEFAULT 'ADMIN', -- ADMIN | SALES
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leads (contacts from WA)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200),
  wa_number VARCHAR(15) NOT NULL UNIQUE, -- max 15 digit (Indonesia: 62xxx = 10-13 digit)
  wa_id VARCHAR(100), -- Baileys JID
  avatar_url TEXT,
  segment VARCHAR(50),
  labels TEXT[] DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0, -- 0-100
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | INACTIVE | CONVERTED | BLOCKED
  intent VARCHAR(50), -- minat | tanya_harga | komplain | spam | unknown
  last_message_at TIMESTAMPTZ,
  daily_ai_count INTEGER NOT NULL DEFAULT 0, -- reset setiap tengah malam via cron
  total_messages INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_wa_number ON leads(wa_number);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_segment ON leads(segment);
CREATE INDEX idx_leads_last_message ON leads(last_message_at);

-- Conversations (sessions between lead and business)
-- Satu lead bisa punya banyak sesi percakapan
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status VARCHAR(10) NOT NULL DEFAULT 'AI', -- AI | HUMAN | DONE
  human_id UUID REFERENCES users(id), -- sales yang sedang/telah mengambil alih
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_lead ON conversations(lead_id);
CREATE INDEX idx_conversations_status ON conversations(status);

-- Messages (individual chat messages within a conversation)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text', -- text | image | document | location
  media_url TEXT,
  from_role VARCHAR(10) NOT NULL, -- LEAD | AI | HUMAN
  human_id UUID REFERENCES users(id), -- who replied (if from HUMAN)
  ai_model VARCHAR(50), -- llama-3.1-8b | mixtral-8x7b
  metadata JSONB, -- { "score": 85, "intent": "minat" }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_messages_role ON messages(from_role);

-- Broadcast campaigns
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  template_vars TEXT[] DEFAULT '{}', -- ["nama", "produk"]
  filter JSONB, -- { "segments": ["all"], "status": "ACTIVE", "last_chat_days": null }
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

CREATE INDEX idx_broadcasts_status ON broadcasts(status);
CREATE INDEX idx_broadcasts_schedule ON broadcasts(schedule_at);

-- Broadcast delivery logs
CREATE TABLE broadcast_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  wa_message_id VARCHAR(100), -- WhatsApp message ID
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | SENT | DELIVERED | READ | FAILED
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(broadcast_id, lead_id) -- cegah duplicate send
);

CREATE INDEX idx_broadcast_logs_broadcast ON broadcast_logs(broadcast_id);
CREATE INDEX idx_broadcast_logs_lead ON broadcast_logs(lead_id);
CREATE INDEX idx_broadcast_logs_status ON broadcast_logs(status);

-- Session store (refresh tokens)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(500) NOT NULL UNIQUE, -- refresh_token wajib unique
  user_agent TEXT,
  ip_address VARCHAR(45),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(refresh_token);
```

---

## 6. API Endpoints

### 6.0 Health & System

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/v1/health` | No | Health check: returns status DB, Redis, WA connection, **Groq API (ping dengan request minimal)**, uptime |

### 6.1 Auth

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/v1/auth/register` | No | Daftar akun baru (hanya ADMIN role yang bisa daftar) |
| POST | `/api/v1/auth/login` | No | Login, return access + refresh token |
| POST | `/api/v1/auth/refresh` | No | Refresh access token |
| POST | `/api/v1/auth/logout` | Yes | Revoke refresh token |
| GET | `/api/v1/auth/sessions` | Yes | List active sessions |
| DELETE | `/api/v1/auth/sessions/:id` | Yes | Revoke specific session |

### 6.2 Conversations (Sessions)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/v1/conversations` | Yes | List conversations (threads), paginated, filter by status/lead |
| GET | `/api/v1/conversations/:id` | Yes | Detail conversation + lead info + last message |
| PATCH | `/api/v1/conversations/:id` | Yes | Update status/notes |
| POST | `/api/v1/conversations/:id/takeover` | Yes | Human takeover (set status=HUMAN, assign sales) |
| POST | `/api/v1/conversations/:id/release` | Yes | Release back to AI (set status=AI, unassign sales) |
| POST | `/api/v1/conversations/:id/complete` | Yes | Tandai selesai (status=DONE, set ended_at) |

### 6.3 Messages

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/v1/conversations/:id/messages` | Yes | List messages dalam conversation (paginated, infinite scroll) |
| POST | `/api/v1/conversations/:id/messages` | Yes | Sales kirim manual reply (from_role=HUMAN) |

### 6.4 Contacts (Leads)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/v1/leads` | Yes | List leads (paginated, filter: segment, status, search) |
| GET | `/api/v1/leads/:id` | Yes | Detail lead |
| POST | `/api/v1/leads` | Yes | Create lead manually |
| PATCH | `/api/v1/leads/:id` | Yes | Update lead (segment, label, notes) |
| DELETE | `/api/v1/leads/:id` | Yes | Soft delete lead |
| POST | `/api/v1/leads/import` | Yes | Import CSV |
| GET | `/api/v1/leads/export` | Yes | Export CSV |

### 6.5 Broadcasts

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/v1/broadcasts` | Yes | List broadcasts |
| POST | `/api/v1/broadcasts` | Yes | Create broadcast |
| GET | `/api/v1/broadcasts/:id` | Yes | Detail broadcast + stats |
| PATCH | `/api/v1/broadcasts/:id` | Yes | Update broadcast (if PENDING) |
| DELETE | `/api/v1/broadcasts/:id` | Yes | Cancel broadcast |
| GET | `/api/v1/broadcasts/:id/logs` | Yes | Delivery logs |

### 6.6 Dashboard

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/v1/dashboard/stats` | Yes | KPI cards data |
| GET | `/api/v1/dashboard/trends` | Yes | Chart data (query: period=7d|30d) |
| GET | `/api/v1/dashboard/recent` | Yes | Recent conversations |
| GET | `/api/v1/dashboard/performance` | Yes | AI performance metrics |

### 6.7 WebSocket

| Event | Direction | Deskripsi |
|-------|-----------|-----------|
| `chat:new` | Server → Client | Notifikasi chat baru |
| `chat:status` | Server → Client | Status change (AI/HUMAN/DONE) |
| `broadcast:progress` | Server → Client | Broadcast progress update |
| `wa:connected` | Server → Client | WhatsApp connection status |
| `ws:reconnect` | Server → Client | Client harus reconnect (server restart) |

> **🔐 WebSocket Auth:**
> - Koneksi WebSocket **wajib** menyertakan JWT access token di query param: `ws://host?token=<access_token>`
> - Server validasi token di middleware `connection` event. Tolak jika invalid/expired (close with 4001)
> - Token direfresh via REST (`/api/v1/auth/refresh`), client reconnect dengan token baru
> - Rate limit: max 100 messages/min per connection

> **WebSocket Reconnection Strategy (Client-side):**
> - Exponential backoff: 1s → 2s → 4s → 8s → max 30s
> - Kirim `last_event_id` saat reconnect untuk missed event reconciliation
> - Buffer events selama disconnected (max 50), replay setelah connected
> - Heartbeat setiap 30 detik (ping/pong), timeout disconnect jika 3 pong berturut-turut missed

---

## 7. Non-Functional Requirements

### 7.1 Security

| Kategori | Requirement |
|----------|-------------|
| **Password** | bcrypt dengan cost factor 12, min 8 karakter |
| **JWT** | Access token 15 menit, refresh token 7 hari (httpOnly, Secure, SameSite=Strict). **Refresh rotation:** revoke old + issue new tiap refresh. Jika token lama dipakai ulang → revoke semua session user (indikasi stolen) |
| **Headers** | Helmet middleware: CSP, X-Frame-Options, X-Content-Type-Options, etc |
| **CORS** | Whitelist origin, tidak pake `*` |
| **Rate Limit** | Global: 100 req/min per IP. Auth: 5 req/15min. Broadcast API: 10 req/min. AI reply: max 50/hari per lead. WebSocket: max 100 messages/min per connection |
| **Input Validation** | Semua input divalidasi dengan Zod sebelum diproses |
| **SQL Injection** | Prisma ORM prevents SQL injection (parameterized queries) |
| **XSS** | Output encoding, Content-Security-Policy header |
| **CSRF** | SameSite cookie + CSRF token untuk form mutations |
| **WA Token** | Credentials WA disimpan di environment variable, bukan DB |
| **Logging** | Jangan log password, token, atau message content sensitif. Setiap log wajib punya `correlationId` (UUID per request) untuk tracing |
| **Secrets Rotation** | Rotate JWT secrets dan GROQ_API_KEY setiap 90 hari |

### 7.2 Performance

| Metrik | Target |
|--------|--------|
| AI Response time | < 3 detik (P95) |
| API Response time | < 200ms (P95) |
| Broadcast speed | 20 messages/minute (Baileys MVP). 1000+/menit via WA Business API (post-MVP) |
| Concurrent chats | 500+ per instance |
| Uptime | 99.5% |

### 7.3 Scalability

- Backend stateless → horizontal scaling possible
- Redis untuk session store & queue → shared state
- PostgreSQL connection pool (max 20 per instance)
- Dashboard queries (trends, stats) harus pake Redis cache dengan TTL 5 menit untuk hindari slow query
- **Post-MVP:** PgBouncer untuk connection pooling, Prisma Accelerate, materialized views

### 7.4 Availability

- Auto-reconnect WhatsApp (Baileys handles reconnection)
- Graceful shutdown (SIGTERM handler):
  - Stop accepting new requests
  - Tunggu BullMQ active jobs selesai (max 30 detik)
  - Close Prisma connection pool
  - Close Redis/BullMQ connections
  - Force exit setelah timeout 30 detik
- Health check endpoint: `GET /api/v1/health`
- Database connection retry logic
- BullMQ job serialization + idempotency key untuk cegah duplicate execution saat restart
- Container orchestration: `restart: unless-stopped` + healthcheck di Docker Compose
- **Memory limit:** Container API wajib `--memory=512M` + `NODE_OPTIONS="--max-old-space-size=384"` cegah OOM
- **Log rotation:** Winston daily rotate, max 100MB per file, compressed, retain 30 hari

### 7.6 Operational Hardening

| Item | Requirement |
|------|-------------|
| **Env Validation** | Semua env var wajib divalidasi saat startup, server gak boleh jalan kalau ada config kosong |
| **Trust Proxy** | Nginx di belakang container, Express harus `app.set('trust proxy', 1)` biar rate limit & IP logging akurat |
| **Error Handler** | Global error middleware Express — jangan bocorkan stack trace di production (return generic error) |
| **Media Files** | WA media (gambar, docs) disimpan di `./uploads/`, di-serving oleh Nginx langsung (gak lewat Node) |
| **Prisma Migration** | `prisma migrate deploy` di CI/CD. Rollback: restore DB dari backup + deploy versi sebelumnya |
| **DB Connection** | Prisma connection pool = min 2, max 10 (cukup untuk MVP). Gunakan `connection_limit` di DATABASE_URL |
| **CORS** | Whitelist ketat: hanya domain frontend yang dibolehkan. No wildcard. |

### 7.5 Frontend Resilience

| Kategori | Requirement |
|----------|-------------|
| **Error Boundary** | Setiap route punya React Error Boundary sendiri, jangan crash satu halaman merusak app |
| **Offline State** | Tampilkan banner "Koneksi terputus" + auto reconnect WebSocket saat online kembali |
| **Loading State** | Setiap data fetching punya skeleton loading, jangan white screen |
| **Empty State** | Tampilkan ilustrasi & call-to-action kalau data kosong (no conversations, no leads, etc) |
| **API Retry** | TanStack Query: retry 3x dengan exponential backoff untuk query, no retry untuk mutation |
| **Graceful Degradation** | Kalau WebSocket down, fallback ke polling REST setiap 15 detik |
| **Optimistic Updates** | Untuk kirim pesan: tampilkan langsung di UI sebelum konfirmasi server |

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
REDIS_URL=redis://localhost:6379       # cache + session store
REDIS_BULL_URL=redis://localhost:6379/1  # BullMQ queue (database 1, dedicated)

# JWT
JWT_ACCESS_SECRET=<random-64-chars>
JWT_REFRESH_SECRET=<random-64-chars>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# AI / LLM (Groq — free tier)
GROQ_API_KEY=gsk_...  # daftar gratis di console.groq.com
GROQ_MODEL=llama-3.1-8b-instant  # gratis & ringan
GROQ_FALLBACK_MODEL=mixtral-8x7b-32768
GROQ_MAX_TOKENS=1024
GROQ_TEMPERATURE=0.7
GROQ_DAILY_CAP_PER_LEAD=50  # max AI replies per lead per hari

# WhatsApp
WA_SESSION_FILE=./wa_session.json

# CORS
CORS_ORIGIN=http://localhost:5173

# Rate Limit
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
LOG_DIR=./logs
LOG_CORRELATION_ENABLED=true  # inject correlationId di setiap log

# Sentry (Error Tracking)
SENTRY_DSN=
SENTRY_ENVIRONMENT=${NODE_ENV}

# Broadcast
BROADCAST_BATCH_SIZE=20   # batch kecil untuk Baileys (safety)
BROADCAST_THROTTLE_MS=3000  # 20 msg/menit = 1 msg per 3 detik
BROADCAST_MAX_RETRIES=3

# Backup (PostgreSQL) — via host cron job
# Schedule: pg_dump harian jam 3 pagi, retensi 30 hari
# S3 upload opsional: tambah script di cron untuk aws s3 cp
```

---

## 9. Edge Cases & Error Handling

### 9.1 WhatsApp Connection

| Skenario | Handling |
|----------|----------|
| QR expired | Notifikasi dashboard, minta scan ulang |
| WA disconnect | Auto reconnect (Baileys built-in), queue outbound messages |
| Ban/block | Deteksi pattern, throttle kirim, notifikasi admin |
| Network timeout | Retry 3x with exponential backoff |

### 9.2 AI/LLM

| Skenario | Handling |
|----------|----------|
| Groq down / rate limit | Auto fallback ke model lain (llama-3.1-8b → mixtral-8x7b) |
| All models down | Fallback ke template reply "Maaf sedang sibuk, akan dijawab sales kami" |
| Rate limit API | Queue request, retry with backoff |
| Toxic/spam input | Filter input + output, jangan forward spam ke LLM |
| Empty response | Retry 1x, if still empty → template fallback |

### 9.3 Broadcast

| Skenario | Handling |
|----------|----------|
| WA number invalid | Mark FAILED, log error, lanjut ke next |
| Broadcast di-trigger saat server restart | BullMQ persistent jobs, auto-resume |
| Duplicate send | Check broadcast_log before sending |
| Schedule missed | BullMQ akan retry job yang missed |

### 9.4 Database

| Skenario | Handling |
|----------|----------|
| Connection lost | Prisma auto-reconnect, retry query |
| Slow query | Query optimization, index monitoring, EXPLAIN ANALYZE |
| Deadlock | Prisma retry logic, keep transactions short |
| Connection pool exhaustion | PgBouncer transaction mode, alarm jika >80% pool terpakai |

### 9.5 Disaster Recovery & Backup

| Skenario | Handling |
|----------|----------|
| **Accidental delete / corruption** | Backup harian (pg_dump) retention 30 hari, restore dalam < 1 jam |
| **Server crash** | Docker restart policy + healthcheck |
| **WA session lost** | WA session file di-volume mount persistent |
| **Redis data loss** | Redis AOF enabled + RDB snapshots tiap 5 menit. BullMQ jobs persist ke DB juga |

> **Backup Strategy (MVP):**
> - **Daily:** pg_dump → gzip → simpan 30 hari di host + upload ke S3 (script bash via cron)
> - **On-event:** Backup WA session file setiap QR sukses scan
> - **Post-MVP:** Point-in-time recovery (WAL), restore drill automation, offsite replication

---

## 10. Testing Strategy

| Level | Tools | Coverage Target |
|-------|-------|-----------------|
| **Unit** | Vitest (backend) | 80%+ untuk services & utils |
| **Integration** | Supertest + Test DB | Semua endpoint API |
| **E2E** | Playwright (frontend) | Core flow: login, chat, broadcast |
| **WA Mock** | Custom Baileys mock | WhatsApp integration test |

---

## 11. Deployment & DevOps

### 11.1 Container Structure

```yaml
# docker-compose.yml (MVP)
services:
  api:        # Node.js backend
  web:        # Nginx serving React build + reverse proxy ke API
  postgres:   # PostgreSQL 16
  redis:      # Redis 7
```

> **Catatan MVP:** Container structure di atas cukup untuk go-live. PgBouncer, backup container, dan multi-replica bisa ditambahkan post-MVP saat traffic sudah naik.
>
> **Backup MVP:** Cukup cron job di host (pg_dump harian, simpan 30 hari, upload S3 via script bash).
>
> **HA/Zero-downtime:** Untuk MVP, maintenance window 5 menit di jam sepi (02:00) sudah acceptable. Zero-downtime deploy post-MVP.

### 11.2 CI/CD Pipeline

```
Push → GitHub Actions:
  1. Lint & Type Check (ESLint + tsc)
  2. Unit Test + Integration Test (Vitest)
  3. Build Docker image
  4. Push ke registry (Docker Hub / GHCR)
  5. Deploy ke VPS:
     a. SSH pull image + docker compose up -d
     b. Prisma migrate deploy
     c. Healthcheck verify (3x sukses)
     d. Rollback: deploy ulang image sebelumnya jika gagal
```

### 11.3 Monitoring & Observability

- **Health check:** `GET /api/v1/health` (returns status DB, Redis, WA connection, Groq API)
- **Logs:** Winston JSON logs → daily rotation (30 days retention). Setiap log punya `correlationId` untuk request tracing
- **Errors:** Sentry integration (backend + frontend), capture unhandled rejection & uncaught exception
- **Alerts:** Sentry alert jika error rate > 1% dalam 5 menit. Docker auto-restart jika container crash
- **Post-MVP:** Uptime monitoring (Better Stack), Prometheus + Grafana untuk metrics performa

---

## 12. Target MVP (Minggu 1-6)

| Minggu | Sprint | Deliverable |
|--------|--------|-------------|
| 1-2 | **Sprint 1** | Backend setup, Prisma schema, auth (register/login/logout), Express app + healthcheck, Landing page + auth UI (frontend) |
| 2-3 | **Sprint 2** | WhatsApp integration (Baileys), receive & store messages, typing indicator |
| 3-4 | **Sprint 3** | AI integration (Groq LLM), auto reply flow, context management, anti-spam, fallback |
| 4-5 | **Sprint 4** | Dashboard API + React frontend (layout, auth UI, KPI cards, grafik), WebSocket real-time |
| 5-6 | **Sprint 5** | Chat UI + human takeover flow, sales reply, conversation list |
| 6-7 | **Sprint 6** | Broadcast scheduler + contact management (CRUD, import/export, filter target) |
| 7-8 | **Sprint 7** | Production hardening: error boundary, loading/empty state, graceful shutdown, backup cron, Sentry, Docker compose final |

---

## 13. Post-MVP Roadmap

| Fitur | Timeline |
|-------|----------|
| Multi-agent (multiple WA numbers) | Sprint 7 |
| Template quick reply (canned responses) | Sprint 7 |
| Export report PDF/Excel | Sprint 8 |
| Integrasi CRM (HubSpot, Salesforce) | Sprint 8-9 |
| CSAT survey otomatis | Sprint 9 |
| Mobile app (React Native) | Q3 |

---

## 14. Glossary

| Istilah | Definisi |
|---------|----------|
| Lead | Kontak WA yang ngirim chat ke nomor bisnis |
| Human Takeover | Sales mengambil alih chat dari AI |
| Broadcast | Fitur kirim pesan massal terjadwal |
| Baileys | Library WhatsApp Web API via WebSocket (tanpa browser) |
| BullMQ | Redis-based job queue untuk task background |
| Smart Tagging | Klasifikasi otomatis intent lead via AI |
| Lead Scoring | Skoring otomatis based on engagement & intent |
