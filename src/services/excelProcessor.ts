// ------------------------------------------------------
// 📤 src/services/excelProcessor.ts
// Excel data processing and contact validation
// ------------------------------------------------------

import { normalizePhone } from "@/utils/dataParsers";
import type { ContactRecord, ProcessContactsResult, ExcelRow } from "@/types/bulkSms";

/**
 * Phone number validation pattern for Kenyan numbers
 * Supports: 07XXXXXXXX, 01XXXXXXXX, +254XXXXXXXXX, 254XXXXXXXXX
 */
const PHONE_PATTERN = /^(?:\+?254|0)[17]\d{8}$/;

/**
 * Validate a phone number
 */
export function validatePhoneNumber(phone: string): boolean {
    if (!phone) return false;
    const normalized = normalizePhone(phone);
    return PHONE_PATTERN.test(normalized);
}

/**
 * Auto-detect column mapping from Excel headers
 * Looks for common patterns in column names
 */
export function autoDetectColumns(
    sampleRow: ExcelRow
): Record<string, string> {
    const mapping: Record<string, string> = {};
    const columns = Object.keys(sampleRow);

    for (const col of columns) {
        const colLower = col.toLowerCase().replace(/[_\s-]+/g, "");

        // Phone detection
        if (
            colLower.includes("phone") ||
            colLower.includes("mobile") ||
            colLower.includes("tel") ||
            colLower.includes("msisdn") ||
            colLower.includes("phonenumber")
        ) {
            mapping.phone = col;
        }
        // Name detection
        else if (
            colLower.includes("name") ||
            colLower.includes("fullname") ||
            colLower.includes("fullnames") ||
            colLower.includes("customer")
        ) {
            mapping.name = col;
        }
        // Email detection
        else if (colLower.includes("email") || colLower.includes("mail")) {
            mapping.email = col;
        }
        // Amount detection
        else if (
            colLower.includes("amount") ||
            colLower.includes("balance") ||
            colLower.includes("arrears") ||
            colLower.includes("due") ||
            colLower.includes("total")
        ) {
            mapping.amount = col;
        }
    }

    return mapping;
}

/**
 * Process contacts from raw Excel data
 * Validates and categorizes each contact
 */
export async function processContacts(
    rawData: ExcelRow[],
    customMapping?: Record<string, string>
): Promise<ProcessContactsResult> {
    const validContacts: ContactRecord[] = [];
    const invalidContacts: ContactRecord[] = [];

    // Auto-detect columns if no custom mapping
    const columnMapping =
        customMapping || (rawData.length > 0 ? autoDetectColumns(rawData[0]) : {});

    const phoneField = columnMapping.phone || "phone";
    const nameField = columnMapping.name || "name";
    const amountField = columnMapping.amount || "amount";

    // Track seen phone numbers to deduplicate
    const seenPhones = new Set<string>();

    for (let index = 0; index < rawData.length; index++) {
        const row = rawData[index];
        const validationErrors: string[] = [];
        const contactId = `contact_${Date.now()}_${index}`;

        // Extract phone number
        const rawPhone = row[phoneField];
        const phoneString = rawPhone != null ? String(rawPhone).trim() : "";
        const normalizedPhone = normalizePhone(phoneString);

        // Validate phone
        if (!phoneString) {
            validationErrors.push("Phone number is required");
        } else if (!validatePhoneNumber(phoneString)) {
            validationErrors.push(`Invalid phone number format: ${phoneString}`);
        } else if (seenPhones.has(normalizedPhone)) {
            validationErrors.push("Duplicate phone number");
        }

        // Extract name
        const rawName = row[nameField];
        const name = rawName != null ? String(rawName).trim() : undefined;

        // Extract amount
        const rawAmount = row[amountField];
        let amount: number | undefined;
        if (rawAmount != null) {
            const amountStr = String(rawAmount).replace(/[,\s]/g, "");
            const parsed = parseFloat(amountStr);
            amount = isNaN(parsed) ? undefined : parsed;
        }

        // Build custom fields (all other columns)
        const customFields: Record<string, unknown> = {};
        for (const key of Object.keys(row)) {
            if (
                key !== phoneField &&
                key !== nameField &&
                key !== amountField
            ) {
                customFields[key] = row[key];
            }
        }

        // Create contact record
        const contact: ContactRecord = {
            id: contactId,
            phoneNumber: normalizedPhone,
            name,
            amount,
            customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
            status: validationErrors.length > 0 ? "invalid" : "valid",
            validationErrors:
                validationErrors.length > 0 ? validationErrors : undefined,
        };

        // Categorize
        if (validationErrors.length > 0) {
            invalidContacts.push(contact);
        } else {
            seenPhones.add(normalizedPhone);
            validContacts.push(contact);
        }
    }

    return {
        validContacts,
        invalidContacts,
        columnMapping,
    };
}

/**
 * Convert ContactRecord back to Recipient format for sending
 * Compatible with existing useBulkPro hook
 * ⚡ Now includes all custom fields for dynamic placeholder support
 */
export function contactRecordToRecipient(contact: ContactRecord): {
    name: string;
    phone: string;
    amount?: number;
    fields?: Record<string, string | number | null>;
} {
    // Convert customFields to the fields format expected by Recipient
    let fields: Record<string, string | number | null> | undefined;

    if (contact.customFields && Object.keys(contact.customFields).length > 0) {
        fields = {};
        for (const [key, value] of Object.entries(contact.customFields)) {
            if (value === null || value === undefined) {
                fields[key] = null;
            } else if (typeof value === 'number') {
                fields[key] = value;
            } else {
                fields[key] = String(value);
            }
        }
    }

    return {
        name: contact.name || "",
        phone: contact.phoneNumber,
        amount: contact.amount,
        fields,
    };
}
