# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- Go ≥ 1.20
- PostgreSQL (local or Supabase)

### Development Setup
The application requires **two separate terminals** running simultaneously:

**Terminal 1 — Backend (Go)**
```bash
cd backend
go mod tidy
go run main.go
# Serves at http://localhost:8080
```

**Terminal 2 — Frontend (React)**
```bash
cd frontend
npm install
npm run dev
# Serves at http://localhost:3000
```

### LAN/Mobile Access
To access from a phone on the same Wi-Fi network:
```bash
cd frontend
npm run dev -- --host
# Then visit http://<your-computer-ip>:3000 from mobile
```

---

## 🏗️ Architecture Overview

### Role-Based Access Control (RBAC)
The system supports 6 distinct user roles, each with a separate dashboard and feature set:

| Role | Dashboard | Key Features |
|---|---|---|
| **mahasiswa** (student) | Feed + courses + UKT payment | Assignments, attendance (QR scan), transcripts, chat |
| **dosen** (lecturer) | Course management | Upload materials/tasks, grade students, generate attendance QR |
| **admin** | System dashboard | User management, announcements, UKT monitoring, analytics |
| **orangtua** (parent) | Child monitoring | View child's attendance, track UKT payment status |
| **ukm** (clubs/orgs) | Organization dashboard | Create posts, interact with feed |
| **ormawa** (student assoc.) | Organization dashboard | Create posts, interact with feed |

### Technology Stack

**Frontend**
- React 19 + Vite 7 (HMR development)
- Routing: React Router 7
- State Management: TanStack React Query 5
- Styling: Tailwind CSS + MUI + Emotion
- Animations: GSAP + Framer Motion
- 3D: Three.js with postprocessing
- QR/Barcode: qr-scanner, qrcode.react
- HTTP: Axios with token-based auth

**Backend**
- Go 1.24 with Gin framework
- Database: PostgreSQL (GORM ORM) — typically Supabase
- Authentication: JWT (HS256, stateless)
- Real-time: Gorilla WebSocket for chat
- File Storage: PostgreSQL BYTEA column (no filesystem uploads)
- Automation: OpenClaw microservice (embedded in main backend)
  - Cron-based task reminders
  - Telegram Bot notifications
  - Outbox pattern for reliable delivery

### Data Flow

1. **Frontend** (React + Router) → **Backend API** (Gin at :8080)
2. **Backend** queries **PostgreSQL** via GORM
3. **Real-time Chat** via WebSocket (`/ws/chat` endpoint)
4. **File Uploads** stored as BYTEA; served via `/api/files/{id}`
5. **OpenClaw** polls database on cron schedule, sends Telegram notifications

---

## 📁 Directory Structure

```
NF-Student-HUB/
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Route definitions (role-protected)
│   │   ├── main.jsx             # Vite entry point
│   │   ├── pages/               # Role-based dashboards
│   │   │   ├── Mahasiswa/       # Student routes
│   │   │   ├── Dosen/           # Lecturer routes
│   │   │   ├── Admin/           # Admin routes
│   │   │   ├── Ortu/            # Parent routes
│   │   │   ├── UKM/             # Club routes
│   │   │   ├── Ormawa/          # Association routes
│   │   │   ├── Public/          # Landing page, public profiles
│   │   │   └── Auth/            # Login page
│   │   ├── components/          # Reusable UI components
│   │   ├── hooks/               # Custom React hooks (useAuth, useChatNotification)
│   │   ├── services/            # API calls (typically Axios wrappers)
│   │   ├── styles/              # Global CSS (Tailwind config + custom)
│   │   └── lib/                 # Utilities (queryClient, constants)
│   ├── public/                  # Static assets
│   ├── vite.config.js           # Vite configuration
│   ├── tailwind.config.js        # Tailwind CSS config
│   └── package.json
│
├── backend/
│   ├── main.go                  # Server startup, OpenClaw initialization
│   ├── config/
│   │   └── database.go          # PostgreSQL connection via GORM
│   ├── controllers/             # Business logic handlers
│   │   ├── authController.go    # Login/register
│   │   ├── mahasiswaController.go
│   │   ├── dosenController.go
│   │   ├── adminController.go
│   │   ├── chatController.go    # Real-time chat with WebSocket hub
│   │   ├── feedController.go    # Social feed (posts/likes/comments)
│   │   ├── uploadController.go  # File upload to BYTEA
│   │   └── ...other role controllers
│   ├── models/                  # GORM data models (database schema)
│   │   ├── user.go              # Base user model
│   │   ├── mahasiswa.go
│   │   ├── dosen.go
│   │   └── ...
│   ├── routes/
│   │   └── routes.go            # Gin route definitions (protected by JWT & role middleware)
│   ├── middlewares/
│   │   ├── jwt.go               # JWT token verification
│   │   ├── role.go              # RBAC enforcement
│   │   ├── security.go          # CORS, security headers, rate limit
│   │   └── ...
│   ├── handlers/
│   │   └── websocket_hub.go     # WebSocket hub for real-time chat
│   ├── openclaw/                # Embedded notification service
│   │   ├── config/              # OpenClaw config loader
│   │   ├── handler/             # Event handlers (tugas-created)
│   │   ├── telegram/            # Telegram Bot sender
│   │   ├── scheduler/           # Cron job scheduler
│   │   ├── outbox/              # Outbox pattern worker
│   │   └── discord/             # (Optional future) Discord support
│   ├── go.mod                   # Go dependencies
│   └── uploads/                 # Auto-generated uploads (currently unused — files in DB)
│
└── README.md
```

---

## 🔐 Security & Authentication

### JWT Flow
1. User logs in via `/api/auth/login` → backend returns signed JWT token
2. Frontend stores token (localStorage) → sends in `Authorization: Bearer <token>` header
3. Backend validates via `middlewares.JWTMiddleware()` → extracts user claims
4. All protected routes require valid JWT

### RBAC Enforcement
Routes are protected by both:
- **JWTMiddleware** — verifies token is valid and not expired
- **RoleMiddleware** — checks user's role matches route requirements (e.g., `RoleMiddleware("mahasiswa")`)

Example from routes.go:
```go
ortu := api.Group("/ortu")
ortu.Use(middlewares.RoleMiddleware("orangtua"))
{
    ortu.GET("/profile/anak", controllers.GetChildUKTInfo)
    // Only users with role="orangtua" can access
}
```

### Security Features
- **CORS**: Configured per environment; allows localhost, Vercel frontend, custom domains, local IPs
- **Rate Limiting**: Global 200 req/min per IP; login endpoints have stricter per-attempt limits
- **Security Headers**: `X-Content-Type-Options`, `X-Frame-Options`, etc. via `SecurityHeaders()` middleware
- **File Uploads**: Stored in PostgreSQL BYTEA (no filesystem exposure); served with proper caching headers

---

## 🔄 Real-Time Features

### WebSocket Chat
- **Endpoint**: `GET /ws/chat` (requires WebSocket Auth Middleware)
- **Hub**: `handlers.WebSocketHub` manages connections and broadcasts messages
- **Database**: Chat messages stored in PostgreSQL; WebSocket provides real-time delivery
- Flow:
  1. Frontend connects to `/ws/chat` with JWT token
  2. Backend `wsHub.HandleWebSocket()` registers connection
  3. Messages broadcast to recipient's active connections (if online)
  4. All messages also persisted in DB for history

---

## 📦 File Upload System

**Important**: Files are **NOT stored on filesystem**. All uploads go to PostgreSQL BYTEA column.

- **Upload**: `POST /api/uploads` → validates, compresses image to JPEG 75%, stores in DB
- **Serve**: `GET /api/files/{id}` → retrieves from BYTEA, streams with cache headers
- **Delete**: `DELETE /api/uploads/{id}` → removes from DB
- Benefits: Single source of truth, easier backups (DB dump), no disk space issues on Supabase

---

## 🦀 OpenClaw — Embedded Notification Service

OpenClaw is the **automation engine** embedded inside the main backend. It handles:

1. **Event Processing** (Outbox Pattern)
   - When a task is created, an event is written to `outbox` table
   - OpenClaw worker polls and processes these events
   - On success, event is marked as delivered

2. **Scheduler** (Cron-based Reminders)
   - Runs on schedule (default: every hour via `OPENCLAW_CRON_SCHEDULE="0 * * * *"`)
   - Queries for upcoming deadlines
   - Sends Telegram notifications to enrolled students

3. **Telegram Integration**
   - Sends notifications via Telegram Bot API
   - Target: channel or DM (configurable per user subscription)
   - Message template: task title, deadline, submission link

### Configuration (`.env`)
```env
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_CHANNEL_ID=@your_channel_name
OPENCLAW_CRON_SCHEDULE="0 * * * *"  # Every hour
OPENCLAW_BASE_URL=http://localhost:8080  # For generating links in messages
```

### Startup Flow
When backend starts:
1. Reads OpenClaw config from env
2. Reuses main DB connection (prevents Supabase connection limit issues)
3. Starts scheduler, outbox worker, and Telegram sender
4. Logs readiness status

---

## 🧠 Key Code Patterns & Conventions

### Frontend (React)
- **Component Structure**: Functional components with hooks; lazy loading via `React.lazy()` + `Suspense`
- **Routing**: Role-protected routes wrapped in `<ProtectedRoute allowedRoles={['mahasiswa']}>` component
- **State Management**: TanStack React Query for server state; local state via `useState`
- **Auth Hook**: `useAuth()` provides `user`, `token`, `logout()`, `isAuthenticated` context
- **Styling**: Tailwind classes primarily; MUI components for complex layouts; custom CSS in `styles/global.css`
- **API Calls**: Axios wrapper functions in `services/` folder (e.g., `mahasiswaService.js`)
- **Error Handling**: Try-catch in async functions; toast notifications for user feedback

### Backend (Go)
- **Controller Pattern**: Each role has a `*Controller.go` file; handlers return JSON responses
- **Middleware Composition**: Use `r.Use()` for global; route groups for role-specific (e.g., `api.Group("/ortu").Use(RoleMiddleware(...))`)
- **Error Responses**: Consistent JSON format with `"error"` and `"message"` fields
- **Database Queries**: GORM for all DB interactions; models in `models/` folder match table schemas
- **File Handling**: All file I/O goes through `uploadController.go` and `config.DB` (BYTEA)
- **Logging**: Use Go's standard `log` package or inject structured logging as needed

### Database (PostgreSQL)
- **Connection**: Configured in `config/database.go`; uses GORM for ORM layer
- **Pooling**: On Supabase, **must use Transaction Pooler** (port 6543), not Session Pooler (port 5432)
- **File Storage**: `uploads` table with `file_data BYTEA` column
- **Outbox Pattern**: `outbox` table for reliable event delivery (OpenClaw reads and processes)
- **JWT Secret**: Must match between frontend (verify) and backend (sign) — set in `.env` as `JWT_SECRET`

---

## 🛠️ Common Development Tasks

### Add a New Route
1. Create a new controller function in `backend/controllers/` (e.g., `NewFeatureController()`)
2. Add route definition in `backend/routes/routes.go`
3. If role-restricted, add to appropriate group (e.g., `mahasiswa := api.Group("/mahasiswa")`)
4. If role-restricted, apply role middleware: `mahasiswa.Use(middlewares.RoleMiddleware("mahasiswa"))`
5. Test via Postman/curl with valid JWT token

### Add a New Page
1. Create new file in `frontend/src/pages/{Role}/NewPage.jsx`
2. Add lazy import in `frontend/src/App.jsx`: `const NewPage = lazy(() => import('./pages/{Role}/NewPage'))`
3. Add route in `App.jsx` Routes section with `<ProtectedRoute>` wrapper
4. Add navigation link in relevant Sidebar or navbar component

### Update Database Schema
1. Modify the model in `backend/models/*.go` (add/change struct fields with GORM tags)
2. Run migration (depends on how migrations are handled — typically via GORM's `AutoMigrate()` or manual SQL)
3. Update controller logic to handle new fields
4. Update frontend to display/edit new fields

### Test Real-Time Chat
1. Start both backend and frontend
2. Log in as two different users in two browsers
3. Navigate to `/mahasiswa/pesan` (student) or `/dosen/pesan` (lecturer)
4. Send a message — should appear in real-time on both sides via WebSocket

### Test File Upload
1. Upload a file via `POST /api/uploads` (form-data with file field)
2. Backend returns file ID
3. Retrieve via `GET /api/files/{id}`
4. Browser should stream file with correct MIME type

### Test OpenClaw Notifications
1. Ensure `.env` has valid `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHANNEL_ID`
2. Create a new task via frontend/API
3. Wait for cron schedule (or manually trigger via internal endpoint if exposed)
4. Check Telegram for notification

---

## 🐛 Debugging Tips

### Backend Logs
- All major operations logged to stdout
- Look for `[OpenClaw]`, `[JWT]`, `[CORS]` prefixes
- Rate limit rejections show as `429 Too Many Requests`
- WebSocket connection issues appear in `wsHub.Run()` logs

### Frontend Console
- React Router navigation logs (if dev mode enabled)
- Axios request/response logs (check network tab in DevTools)
- TanStack React Query DevTools available (installed but may need UI import)

### Database Connection Issues
- Supabase: Verify you're using **Transaction Pooler** (port 6543), not Session Pooler (5432)
- DSN format: `postgresql://user.ref:password@aws-region.pooler.supabase.com:6543/postgres`
- Connection pool exhaustion: Check OpenClaw is reusing main DB connection (it does — see `main.go` line 192)

### JWT/Auth Failures
- Verify `JWT_SECRET` matches between frontend and backend (should be in `.env`)
- Check token expiration: look at JWT payload in `jwt.io`
- Inspect request headers: `Authorization: Bearer <token>` must be present
- Role mismatch: Ensure user's role matches route's `RoleMiddleware` requirement

### CORS Errors
- Check backend's `AllowOriginFunc` in `main.go` (lines 68–99)
- Localhost always allowed; production domains hardcoded
- For custom domains, add to `ALLOWED_ORIGINS` env var (comma-separated)

---

## 📝 Testing

### Frontend
- No test suite yet (README says "No tests yet")
- Manual testing required; verify UI behavior in browser

### Backend
- No formal test files visible in controllers
- Integration tests recommended for critical endpoints (auth, payments, chat)
- Load test OpenClaw scheduler if high volume of tasks expected

---

## 🚢 Deployment Notes

### Frontend (Production)
```bash
cd frontend
npm install
npm run build
# Output: dist/ folder
# Serve via Nginx or Vercel
```

### Backend (Production)
```bash
cd backend
go build -o server main.go
# Create systemd service (example in README)
# Run behind Nginx as reverse proxy
```

### Environment Variables
**Critical for production**:
- `DB_DSN` — Supabase pooler connection
- `JWT_SECRET` — Secure, long random string (≥32 chars)
- `ALLOWED_ORIGINS` — Comma-separated list of frontend domains
- `TELEGRAM_BOT_TOKEN` — Bot token from BotFather (if using notifications)
- `TELEGRAM_CHANNEL_ID` — Target channel or DM ID

### File Storage
- No uploads directory needed (files in DB)
- Database backups automatically include all uploaded files

### Rate Limiting
- Global: 200 req/min per IP
- Login: stricter limit (see `middlewares.LoginRateLimiter()`)
- Adjust in `main.go` line 108 if needed

---

## 📚 Additional Resources

- **README.md** — Full setup guide, feature overview, stack details
- **Gin Framework** — http://gin-gonic.com/
- **GORM** — https://gorm.io/docs/
- **React Router** — https://reactrouter.com/
- **TanStack React Query** — https://tanstack.com/query/latest
- **Tailwind CSS** — https://tailwindcss.com/
- **JWT.io** — Decode/verify JWT tokens for debugging
- **PostgreSQL Docs** — BYTEA column type, connection pooling

