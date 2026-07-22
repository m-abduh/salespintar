# PRD: SalesPintar (haloAI)

> **Versi:** 2.1  
> **Status:** Draft  
> **Target MVP:** 6 minggu

---

## 1. Ringkasan Eksekutif

Aplikasi AI-powered CS WhatsApp dengan fitur **Auto Reply real-time**, **Broadcast Scheduler**, dan **Dashboard Overview**. Target: mengurangi *lost leads* dengan respon instan 24/7 dan follow-up terjadwal.

**Masalah:** Bisnis kehilangan leads karena lambat respon di WhatsApp (rata-rata response time > 5 menit). Sales kewalahan handle multiple chat manual.

**Solusi:** AI CS otomatis yang balas kayak manusia, dengan kemampuan takeover oleh sales kapan saja.

---

## 2. Fitur Utama

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
| ACS-08 | Anti Spam | Rate limit balasan AI: max 1 pesan / 3 detik per lead, max 3 pesan berturut-turut tanpa balasan lead |

### 2.2 Broadcast Scheduler (Prioritas: P0)

| ID | Fitur | Detail |
|----|-------|--------|
| BRS-01 | Buat Jadwal | Admin pilih tanggal & jam kirim, bisa sekali atau recurring (setiap hari/minggu) |
| BRS-02 | Filter Target | Semua kontak, segmen tertentu, lead aktif (last chat < 7 hari), lead inactive (> 30 hari) |
| BRS-03 | Template Pesan | Dukung variable: `{{nama}}`, `{{nomor}}`, `{{produk}}`. Preview sebelum kirim |
| BRS-04 | Personal Massal | Kirim pesan massal dengan variable personal per kontak |
| BRS-05 | Tracking Real-time | Status: PENDING → SENDING → SENT → DELIVERED → READ. Update real-time via WebSocket |
| BRS-06 | Throttle Kirim | Kirim bertahap (100 pesan/menit) biar gak kena ban WA |
| BRS-07 | Batch Cancel | Batalin broadcast yang masih PENDING atau SENDING |
| BRS-08 | Retry Gagal | Auto retry 3x untuk pesan gagal kirim,间隔 5 menit |

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
| AUT-01 | Login/Logout | JWT access token (15 menit) + refresh token (7 hari, httpOnly cookie) |
| AUT-02 | Role-based Access | ADMIN (full access) vs SALES (chat only, no broadcast/config) |
| AUT-03 | Session Management | Lihat & revoke session aktif |
| AUT-04 | Rate Limit Auth | Max 5 attempts per email per 15 menit, akun lock 30 menit setelah 5 gagal |

---

## 3. Tech Stack (Detail)

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| **Frontend** | React 18 + Vite 5 | Fast HMR, small bundle |
| **Styling** | Tailwind CSS 3 | Utility-first, cepat develop |
| **State** | TanStack Query + Zustand | Server state vs client state terpisah |
| **Backend** | Node.js 20 + Express 4 | Ringan, ekosistem matang |
| **Database** | PostgreSQL 16 + Prisma ORM | Type-safe query, migration otomatis |
| **Cache/Queue** | Redis 7 + BullMQ | Job queue untuk broadcast & AI |
| **WA Gateway** | Baileys (WebSocket) | Tanpa browser, hemat RAM (~50MB) |
| **AI/LLM** | Groq (Llama 3.1 70B / Mixtral 8x7B) | Free tier, inferensi super cepat (< 1 detik) |
| **Auth** | JWT (access + refresh) | httpOnly cookie, CSRF protection |
| **Validation** | Zod | Type-safe runtime validation |
| **Logging** | Winston + Morgan | Structured JSON logs, daily rotate |
| **Deploy** | Docker + Docker Compose | Reproducible environment |
| **Reverse Proxy** | Nginx | SSL termination, static serving, rate limit |
| **Monitoring** | Sentry (error) + Grafana/Prometheus (opsional) | Error tracking |

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
3. Server simpan pesan ke DB (conversations)
4. Cek: apakah conversation sedang HUMAN? Jika ya → skip AI, notifikasi sales
5. Jika AI mode → query konteks (last 20 messages)
6. Generate AI prompt → kirim ke LLM
7. Simpan balasan AI ke DB
8. Kirim typing indicator ke WA
9. Kirim balasan via Baileys
10. Update lead.last_message_at
11. Jalankan smart tagging async (intent detection + scoring)
12. Total round-trip target: < 3 detik
```

### 4.3 Human Takeover Flow

```
1. Sales di dashboard → buka conversation
2. Klik "Ambil Alih"
3. API: PATCH /conversations/:id/takeover
4. Server update: conversation.status = HUMAN
5. AI auto-reply STOP untuk lead ini
6. Sales bisa balas manual via dashboard
7. Sales klik "Selesai" → status = DONE, AI aktif lagi
8. Notifikasi real-time via WebSocket ke sales lain
```

### 4.4 Broadcast Flow (Detail)

```
1. Admin buat broadcast via dashboard
2. API POST /broadcasts → simpan ke DB (status: PENDING)
3. BullMQ job di-schedule sesuai jadwal
4. Job trigger:
   a. Query leads sesuai filter
   b. Batch 100 leads → generate pesan (replace variables)
   c. Insert BroadcastLog (status: PENDING)
   d. Kirim via Baileys (throttle 100/menit)
   e. Update BroadcastLog (SENT/DELIVERED/FAILED)
   f. Update Broadcast progress
5. Tracking update real-time via WebSocket ke dashboard
```

---

## 5. Database Schema (Detail)

### 5.1 Entity Relationship

```
users ──1:N── conversations (via human takeover)
leads ──1:N── conversations
leads ──1:N── broadcast_logs
broadcasts ──1:N── broadcast_logs
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
  wa_number VARCHAR(20) NOT NULL UNIQUE,
  wa_id VARCHAR(100), -- Baileys JID
  avatar_url TEXT,
  segment VARCHAR(50),
  labels TEXT[] DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0, -- 0-100
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | INACTIVE | CONVERTED | BLOCKED
  intent VARCHAR(50), -- minat | tanya_harga | komplain | spam | unknown
  last_message_at TIMESTAMPTZ,
  total_messages INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_wa_number ON leads(wa_number);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_segment ON leads(segment);
CREATE INDEX idx_leads_last_message ON leads(last_message_at);

-- Conversations (chat history)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text', -- text | image | document | location
  media_url TEXT,
  from_role VARCHAR(10) NOT NULL, -- LEAD | AI | HUMAN
  human_id UUID REFERENCES users(id), -- who replied (if from HUMAN)
  ai_model VARCHAR(50), -- llama-3-70b | mixtral-8x7b
  metadata JSONB, -- { "score": 85, "intent": "minat" }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_lead ON conversations(lead_id, created_at DESC);
CREATE INDEX idx_conversations_created ON conversations(created_at);

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_broadcast_logs_broadcast ON broadcast_logs(broadcast_id);
CREATE INDEX idx_broadcast_logs_lead ON broadcast_logs(lead_id);
CREATE INDEX idx_broadcast_logs_status ON broadcast_logs(status);

-- Session store (refresh tokens)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(500) NOT NULL,
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

### 6.1 Auth

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/v1/auth/login` | No | Login, return access + refresh token |
| POST | `/api/v1/auth/refresh` | No | Refresh access token |
| POST | `/api/v1/auth/logout` | Yes | Revoke refresh token |
| GET | `/api/v1/auth/sessions` | Yes | List active sessions |
| DELETE | `/api/v1/auth/sessions/:id` | Yes | Revoke specific session |

### 6.2 Conversations

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/v1/conversations` | Yes | List conversations (paginated, filterable) |
| GET | `/api/v1/conversations/:id` | Yes | Detail conversation + messages |
| GET | `/api/v1/conversations/:id/messages` | Yes | Messages for a conversation (paginated) |
| POST | `/api/v1/conversations/:id/takeover` | Yes | Human takeover |
| POST | `/api/v1/conversations/:id/release` | Yes | Release back to AI |
| POST | `/api/v1/conversations/:id/messages` | Yes | Sales kirim manual reply |
| PATCH | `/api/v1/conversations/:id` | Yes | Update status/notes |

### 6.3 Contacts (Leads)

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/v1/leads` | Yes | List leads (paginated, filter: segment, status, search) |
| GET | `/api/v1/leads/:id` | Yes | Detail lead |
| POST | `/api/v1/leads` | Yes | Create lead manually |
| PATCH | `/api/v1/leads/:id` | Yes | Update lead (segment, label, notes) |
| DELETE | `/api/v1/leads/:id` | Yes | Soft delete lead |
| POST | `/api/v1/leads/import` | Yes | Import CSV |
| GET | `/api/v1/leads/export` | Yes | Export CSV |

### 6.4 Broadcasts

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/v1/broadcasts` | Yes | List broadcasts |
| POST | `/api/v1/broadcasts` | Yes | Create broadcast |
| GET | `/api/v1/broadcasts/:id` | Yes | Detail broadcast + stats |
| PATCH | `/api/v1/broadcasts/:id` | Yes | Update broadcast (if PENDING) |
| DELETE | `/api/v1/broadcasts/:id` | Yes | Cancel broadcast |
| GET | `/api/v1/broadcasts/:id/logs` | Yes | Delivery logs |

### 6.5 Dashboard

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/v1/dashboard/stats` | Yes | KPI cards data |
| GET | `/api/v1/dashboard/trends` | Yes | Chart data (query: period=7d|30d) |
| GET | `/api/v1/dashboard/recent` | Yes | Recent conversations |
| GET | `/api/v1/dashboard/performance` | Yes | AI performance metrics |

### 6.6 WebSocket

| Event | Direction | Deskripsi |
|-------|-----------|-----------|
| `chat:new` | Server → Client | Notifikasi chat baru |
| `chat:status` | Server → Client | Status change (AI/HUMAN/DONE) |
| `broadcast:progress` | Server → Client | Broadcast progress update |
| `wa:connected` | Server → Client | WhatsApp connection status |

---

## 7. Non-Functional Requirements

### 7.1 Security

| Kategori | Requirement |
|----------|-------------|
| **Password** | bcrypt dengan cost factor 12, min 8 karakter |
| **JWT** | Access token 15 menit, refresh token 7 hari (httpOnly, Secure, SameSite=Strict) |
| **Headers** | Helmet middleware: CSP, X-Frame-Options, X-Content-Type-Options, etc |
| **CORS** | Whitelist origin, tidak pake `*` |
| **Rate Limit** | Global: 100 req/min per IP. Auth: 5 req/15min. Broadcast API: 10 req/min |
| **Input Validation** | Semua input divalidasi dengan Zod sebelum diproses |
| **SQL Injection** | Prisma ORM prevents SQL injection (parameterized queries) |
| **XSS** | Output encoding, Content-Security-Policy header |
| **CSRF** | SameSite cookie + CSRF token untuk form mutations |
| **WA Token** | Credentials WA disimpan di environment variable, bukan DB |
| **Logging** | Jangan log password, token, atau message content sensitif |

### 7.2 Performance

| Metrik | Target |
|--------|--------|
| AI Response time | < 3 detik (P95) |
| API Response time | < 200ms (P95) |
| Broadcast speed | 100 messages/minute |
| Concurrent chats | 500+ per instance |
| Uptime | 99.5% |

### 7.3 Scalability

- Backend stateless → horizontal scaling possible
- Redis untuk session store & queue → shared state
- PostgreSQL connection pool (max 20 per instance)
- Prisma Accelerate untuk production (optional)

### 7.4 Availability

- Auto-reconnect WhatsApp (Baileys handles reconnection)
- Graceful shutdown (SIGTERM handler)
- Health check endpoint: `GET /api/v1/health`
- Database connection retry logic

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

# JWT
JWT_ACCESS_SECRET=<random-64-chars>
JWT_REFRESH_SECRET=<random-64-chars>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# AI / LLM (Groq — free tier)
GROQ_API_KEY=gsk_...  # daftar gratis di console.groq.com
GROQ_MODEL=llama-3.1-70b-versatile  # gratis: llama-3.1-70b | mixtral-8x7b | gemma2-9b
GROQ_FALLBACK_MODEL=mixtral-8x7b-32768
GROQ_MAX_TOKENS=1024
GROQ_TEMPERATURE=0.7

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

# Broadcast
BROADCAST_BATCH_SIZE=100
BROADCAST_THROTTLE_MS=600
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
| Groq down / rate limit | Auto fallback ke model lain (llama-3.1-70b → mixtral-8x7b → gemma2-9b) |
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
| Slow query | Query optimization, index monitoring |
| Deadlock | Prisma retry logic, keep transactions short |

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
# docker-compose.yml
services:
  api:        # Node.js backend
  web:        # Nginx serving React build
  postgres:   # PostgreSQL 16
  redis:      # Redis 7
```

### 11.2 CI/CD Pipeline

```
Push → GitHub Actions:
  1. Lint & Type Check
  2. Unit Test
  3. Build Docker image
  4. Push ke registry
  5. Deploy ke VPS/Cloud Run
```

### 11.3 Monitoring

- **Health check:** `GET /api/v1/health` (returns DB, Redis, WA connection status)
- **Logs:** Winston JSON logs → daily rotation (30 days retention)
- **Errors:** Sentry integration (backend + frontend)
- **Metrics:** (Post-MVP) Prometheus + Grafana

---

## 12. Target MVP (Minggu 1-6)

| Minggu | Sprint | Deliverable |
|--------|--------|-------------|
| 1-2 | **Sprint 1** | Backend setup, auth, Prisma schema, user management, basic Express app |
| 2-3 | **Sprint 2** | WhatsApp integration (Baileys), receive & store messages |
| 3-4 | **Sprint 3** | AI integration (LLM), auto reply flow, context management |
| 4-5 | **Sprint 4** | Dashboard API + frontend, human takeover, real-time chat UI |
| 5-6 | **Sprint 5** | Broadcast scheduler, contact management, Polish & deploy |

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
