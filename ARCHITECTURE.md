# Bulk SMS App - Architectural Overview

## 1. Executive Summary
This application is a high-performance, Android-first React Native solution designed for bulk SMS management and financial transaction tracking (M-Pesa). It leverages a **Hybrid Architecture** where business logic is split between a flexible JavaScript layer and robust Native Android modules for critical tasks like SMS sending and background processing.

**Key Technical Highlights:**
- **Database:** High-performance JSI-based SQLite (`op-sqlite`) with WAL mode.
- **SMS Engine:** Dual-strategy sending (Interactive JS-loop & Background WorkManager).
- **Compliance:** Android 14 foreground service compliance (`dataSync`).
- **Parsing:** On-device PDF parsing using native PDFBox libraries for security.

---

## 2. System Overview

### Core Stack
- **Framework:** React Native 0.76+
- **Language:** TypeScript (Strict Mode)
- **Engine:** Hermes (Optimized for low-memory devices)
- **Platform:** Android Primary (iOS support limited to non-SMS features)

### Architecture Patterns
- **Repository Pattern:** All database access is abstracted via repositories (`src/db/repositories`).
- **Service Layer:** Business logic resides in `src/services`, decoupled from UI.
- **Bridge Pattern:** Extensive use of Native Modules to expose Android APIs to JS.
- **Write-Ahead Logging:** Used in both SQLite and SMS Queue processing for data integrity.

---

## 3. Data Layer

### SQLite Implementation (`src/db`)
The app uses `op-sqlite` for direct JSI binding, offering ~10x performance over the asynchronous bridge.

- **Connection:** Singleton instance in `src/db/database/core.ts`.
- **Concurrency:** **WAL (Write-Ahead Logging)** mode enabled to allow simultaneous reads/writes.
- **Migrations:** Versioned migration system (`src/db/migrations.ts`) handling schema evolution from v1 to v6.
- **Resilience:** Auto-repair logic for corrupted database files on startup.

### Key Schemas
- `messages`: Core storage for SMS history.
- `sms_queue`: Persistent queue for outgoing messages with priority support.
- `campaigns`: Grouping for bulk operations with stats tracking.
- `mpesa_transactions`: Parsed financial data.

---

## 4. SMS Infrastructure

The app employs a **Hybrid SMS Sending Architecture** to balance flexibility and reliability.

### Strategy A: Interactive / Foreground (`UnifiedMessageManager.ts`)
Used when the app is open.
- **Logic:** JavaScript-based chunking loop.
- **Batching:** Processes messages in chunks (default 50) with configurable delays.
- **Throttling:** Prevents carrier spam blocking.
- **Flow:** `UI` -> `UnifiedMessageManager` -> `SmsSenderModule` (Native).

### Strategy B: Background / Resilient (`BulkSmsSchedulerModule.kt`)
Used for large jobs or when the app might be closed.
- **Logic:** Android `WorkManager` (Persistent).
- **Reliability:** Survives app restarts and device reboots.
- **Worker:** `BulkSmsSendingWorker.kt` handles exponential backoff and retry logic natively.

### Queue System (`src/background/smsWatcher.ts`)
- **Deduplication:** 60-second window to prevent duplicate sends.
- **Circuit Breaker:** Automatically pauses queue after consecutive failures to protect credits/reputation.
- **Priority:** Supports `High`, `Normal`, and `Urgent` message priorities.

---

## 5. Native Modules (`android/.../smsmanager`)

Custom Kotlin modules bridge the gap between React Native and Android APIs.

| Module | Purpose | Key Features |
|--------|---------|--------------|
| `SmsSenderModule` | SMS Transmission | Dual-SIM support, Sent/Delivered Intent tracking. |
| `SmsReaderModule` | Inbox Access | Fast reading of device SMS store, M-Pesa filtering. |
| `BulkSmsScheduler` | Background Jobs | WorkManager integration for battery-efficient sending. |
| `PdfParser` | M-Pesa | Native PDFBox integration for password-protected PDFs. |
| `BackgroundService` | Process Life | Android 14 `dataSync` foreground service to keep app alive. |

---

## 6. Business Logic

### M-Pesa Parsing (`src/services/mpesaPdfParserService.ts`)
- **Privacy-First:** Parsing happens 100% on-device; no data leaves the phone.
- **Implementation:** Passes file URI to Native Module -> Uses PDFBox to extract text -> RegEx pattern matching in JS.
- **Features:** Password handling, transaction deduplication, high-value filtering.

### Compliance & Safety
- **Permission Guards:** Checks `SEND_SMS`, `READ_PHONE_STATE` before operations.
- **Blacklists:** Filters recipients against a local blocklist before queuing.
- **Default Role:** Helper methods to request "Default SMS App" status for high-throughput access.

---

## 7. Performance & Resource Management

- **Memory:**
  - `FlashList` used for rendering large conversation lists.
  - Chunked processing in `UnifiedMessageManager` prevents JS heap exhaustion.
- **Battery:**
  - `WorkManager` delegates heavy lifting to the system scheduler.
  - `WakeLocks` used sparingly during active queue processing.
- **Network:**
  - `NetInfo` checks before bulk operations (warns if on cellular).
  - Retry logic adapts to signal strength (exponential backoff).

---

## 8. Recommendations for Future Development

1.  **Migration to WorkManager:** Fully deprecate the JS-loop sender in favor of `BulkSmsScheduler` for all bulk operations to improve battery life.
2.  **Battery Optimization:** Implement stricter "Doze Mode" handling for the background watcher.
3.  **Testing:** Add unit tests for the Kotlin layer (currently mostly JS tests exist).
