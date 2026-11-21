# Code Lab Application Architecture

[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-v18-blue.svg)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Sandbox-Docker%20%7C%20Isolated%20VM-orange.svg)](https://www.docker.com/)
[![BullMQ](https://img.shields.io/badge/Task%20Queue-BullMQ%20%2B%20Redis-red.svg)](https://bullmq.io/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

An enterprise-grade, high-concurrency online coding and assessment platform engineered after HackerEarth. Built with a modular MERN architecture, stateless microservices, distributed asynchronous task queuing with BullMQ, ephemeral sandboxed container isolation, real-time WebSockets, strict anti-cheat surveillance, and automated Excel scorecard reporting.

---

## 1. System Architecture Diagram

```
                              +------------------------------------------+
                              |      Candidate / Mentor Browser          |
                              |   (React 18, Monaco Editor, Tailwind)    |
                              +--------------------+---------------------+
                                                   |
                             HTTPS / REST          |  WebSockets (Socket.io)
                             (JWT Cookie / Bearer) |  (Bidirectional Real-Time)
                                                   v
                              +------------------------------------------+
                              |         Express.js API Gateway           |
                               |   (Stateless, Rate-Limited, RBAC)        |
                              +--------+--------------------+------------+
                                       |                    |
                 Cache & Pub/Sub       |                    | Enqueue Test Run (202 Accepted)
                                       v                    v
                   +-----------------------+     +-----------------------+
                   |     Redis Cluster     |     |   BullMQ Task Queue   |
                   | (Cache / Rate-Limits) |     |  (Buffered Test Jobs) |
                   +-----------------------+     +-----------+-----------+
                                                             |
                                                             | Consumes Jobs
                                                             v
                                                 +-----------------------+
                                                 | BullMQ Worker Thread  |
                                                 |  + Circuit Breaker    |
                                                 +-----------+-----------+
                                                             |
                                      +----------------------+----------------------+
                                      | Spawns Ephemeral                             | Fallback Sandboxed
                                      v Execution Runner                             v Subprocess Runner
                         +--------------------------+                   +--------------------------+
                         |      Docker Sandbox      |                   |    Isolated VM Runner    |
                         |  --net none              |                   |  --max-old-space-size    |
                         |  --cpus 0.5              |                   |  Strict Execution Timeout|
                         |  --memory 256m           |                   |  Read-only Jest Suite    |
                         |  Timeout: 10s            |                   +--------------------------+
                         +------------+-------------+                                |
                                      |                                              |
                                      +----------------------+-----------------------+
                                                             | Parses Jest JSON Output
                                                             v
                                                 +-----------------------+
                                                 |  MongoDB Primary DB   |
                                                 | (User, Challenge, Sub)|
                                                 +-----------------------+
```

---

## 2. Key Pillars & Implementation Highlights

### A. Authentication & Access Control (RBAC)
* **Learner Authentication:** Standard Registration and Unified Login (`/register`, `/login`).
* **Mentor Authentication:** No public registration link exists. Dedicated, unlinked, obfuscated route:
  `/auth/invite/mentor-secret-signup-99x`
* **JWT Token Rotation:** Dual-token security utilizing HTTP-only, SameSite Refresh Token cookies and in-memory short-lived Access Tokens.

### B. Challenge Engine (Mentor Capabilities)
* **3 Supported Stacks:**
  1. **Pure JavaScript:** Algorithmic functions with Jest assertions.
  2. **Frontend:** HTML, CSS, Vanilla JS with simulated JSDOM testing.
  3. **Full-Stack (MERN No-DB):** React frontend components + Node.js/Express REST endpoints.
* **Scaffolding Builder:** Hierarchical file/folder tree with protected read-only `__tests__/` directory.

### C. Assessment & Anti-Cheat Engine (Learner Capabilities)
* **Interactive Monaco IDE:** Real-time syntax highlighting, multiple file tabs, and read-only locks on test suites.
* **Anti-Cheat Enforcement:**
  * Blocks global copy, cut, paste (`Ctrl+C`, `Ctrl+V`, `Cmd+C`, `Cmd+V`, `Ctrl+X`, `Cmd+X`).
  * Disables right-click context menu.
  * Enforces fullscreen mode with automatic exit detection.
  * Real-time blur and tab-switch telemetry auditing.
  * Exceeding 5 violations automatically flags the candidate in the mentor dashboard.
* **Instant Evaluation:** Non-blocking test runner execution with streaming live terminal progress and Jest score breakdown.

### D. Analytics & Excel Reporting (Mentor Capabilities)
* Detailed candidate scorecard breakdown with pass/fail ratios and integrity indicators.
* **Excel Report Generator (`exceljs`):** Exports candidate results to `.xlsx` complete with formatted banners, styling, and color-coded score cells.

### E. High-Traffic Resilience & Sandbox Isolation
* **Stateless API:** Express controllers are completely decoupled from code execution.
* **BullMQ Distributed Queue:** The main API thread never executes learner code synchronously.
* **Circuit Breaker:** Automatically trips to `OPEN` state if execution workers encounter repeated failures, preventing worker crashes under high load.
* **Sandbox Constraints:**
  * CPU Cap: 0.5 Cores
  * RAM Cap: 256MB
  * Execution Timeout: 10 seconds max
  * Network Access: Disabled (`--net none`)

---

## 3. Directory Layout

```
├── client/
│   ├── src/
│   │   ├── api/            # Axios API clients with token refresh interceptor
│   │   ├── components/
│   │   │   ├── common/     # Navbar, ProtectedRoute
│   │   │   ├── dashboard/  # ChallengeEditor, LearnerAnalyticsTable, ExportExcelButton
│   │   │   └── ide/        # MonacoWrapper, FileTree, TerminalOutput, TestResultsPanel
│   │   ├── hooks/          # useAntiCheat, useSocket
│   │   ├── pages/          # LandingPage, LoginPage, RegisterPage, MentorDashboardPage, LearnerAssessmentPage
│   │   └── store/          # Zustand stores: authStore, ideStore
│   └── Dockerfile
├── server/
│   ├── src/
│   │   ├── config/         # MongoDB, Redis, and Environment settings
│   │   ├── controllers/    # Auth, Challenge, Submission, Analytics, Health
│   │   ├── execution/      # BullMQ queue, Worker, DockerDriver, IsolatedProcessDriver, CircuitBreaker
│   │   ├── middleware/     # JWT Auth, RBAC, RateLimiter, ErrorHandler
│   │   ├── models/         # Mongoose Schemas (User, Challenge, Submission, AntiCheatAudit)
│   │   ├── repositories/   # Unified data layer with high-resilience in-memory fallback
│   │   ├── routes/         # Express API routes
│   │   ├── services/       # Business logic, ExcelJS generator, Redis cache
│   │   └── sockets/        # Socket.io connection lifecycle & live events
│   └── Dockerfile
├── docker/
│   ├── runner.Dockerfile   # Ephemeral sandbox container image
│   └── jest.config.js      # Sandbox Jest runner configuration
├── docker-compose.yml      # Orchestration for MongoDB, Redis, API, Worker, Client
└── README.md
```

---

## 4. Quick Start & Execution

### Option A: Standard Local Development
```bash
# 1. Install root & server dependencies
cd server
npm install

# 2. Seed default benchmark accounts & challenges
npm run seed

# 3. Start Server
npm run dev

# 4. In a new terminal, install and start client
cd ../client
npm install
npm run dev
```

### Option B: Full-Stack Docker Compose
```bash
docker-compose up --build
```

---

## 5. Seed Credentials

* **Mentor Account:** `mentor@antigravity.io` / `Password@123`
* **Learner Account:** `learner@antigravity.io` / `Password@123`
* **Mentor Invitation Secret Route:** `/auth/invite/mentor-secret-signup-99x`

