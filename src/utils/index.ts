// ------------------------------------------------------
// 📦 src/utils/index.ts
// Central exports for all utility modules (React Native CLI build)
// Fully de-duped and collision-safe
// ------------------------------------------------------

// =============================================
// 1) CORE DATA UTILITIES (FLAT EXPORTS)
// =============================================

// dataParsers.ts exports:
// - normalizePhone
// - parseMobileMoneyTransaction
// - parseCustomerRow
// - parseLoanRecord
// (parseDateSafely REMOVED — not exported by dataParsers.ts)
export {
  normalizePhone,
  parseMobileMoneyTransaction,
  parseCustomerRow,
  parseLoanRecord,
} from "./dataParsers";

// excelParser.ts exports flat SAFE functions (non-pro)
export * from "./excelParser";

// CSV exporter
export * from "./export-csv";

// =============================================
// 2) EXCEL PRO UTILS (namespaced)
// =============================================
import * as excelPro from "./excel-pro";
export { excelPro };

// =============================================
// 3) M-PESA PARSERS
// =============================================

// Basic lightweight raw-SMS → Parsed M-PESA
export { parseMobileMoneyMessage } from "./parseMobileMoney";

// Pro parser (namespaced)
import * as mpesaPro from "./mpesaParser";
export { mpesaPro };

// =============================================
// 4) MISC UTILITIES
// =============================================
export * from "./safeReload";
export * from "./useDebounce";
