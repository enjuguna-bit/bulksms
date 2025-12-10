import Contacts from "react-native-contacts"; // ✅ Correct CLI library

export interface SimpleContact {
  id: string;
  name: string;
  phoneNumbers: string[];
}

/** ✅ Request contact access permission */
export async function ensureContactsPermission(): Promise<boolean> {
  try {
    const permission = await Contacts.requestPermission();
    return permission === "authorized";
  } catch (e) {
    console.warn("[Contacts] Permission request failed", e);
    return false;
  }
}

/** * ✅ Load contacts efficiently.
 * - Uses NATIVE filtering when a search term is present (Prevents JS Heap Spikes).
 * - Uses a single-pass loop for data transformation (Memory Efficient).
 */
export async function getAllContacts(searchTerm: string = ""): Promise<SimpleContact[]> {
  const ok = await ensureContactsPermission();
  if (!ok) return [];

  try {
    // ⚡ PERFORMANCE: Filter on Native side if searching. 
    // This prevents passing 5000+ objects over the bridge just to filter them in JS.
    const rawContacts = searchTerm.trim().length > 0 
      ? await Contacts.getContactsMatchingString(searchTerm) 
      : await Contacts.getAll();

    if (!rawContacts || rawContacts.length === 0) return [];

    // ⚡ MEMORY OPTIMIZATION: Use single loop instead of .filter().map().filter()
    const results: SimpleContact[] = [];

    for (const c of rawContacts) {
      // 1. Quick skip empty contacts
      if (!c.phoneNumbers || c.phoneNumbers.length === 0) continue;

      // 2. Extract Numbers
      const validNumbers: string[] = [];
      for (const p of c.phoneNumbers) {
        const clean = p.number?.trim();
        if (clean) validNumbers.push(clean);
      }

      // 3. Only add if valid
      if (validNumbers.length > 0) {
        // 4. Name Construction (Safe)
        const firstName = c.givenName || "";
        const lastName = c.familyName || "";
        const fullName = firstName && lastName 
          ? `${firstName} ${lastName}` 
          : (firstName || lastName || "Unnamed");

        results.push({
          id: c.recordID, // CLI version uses recordID
          name: fullName,
          phoneNumbers: validNumbers,
        });
      }
    }

    // 3. Sort by name
    return results.sort((a, b) => a.name.localeCompare(b.name));

  } catch (e) {
    console.warn("[Contacts] Failed to load contacts", e);
    return [];
  }
}

/** ✅ Pick a few contacts manually (fallback/demo) */
export async function pickContacts(limit = 10): Promise<SimpleContact[]> {
  // Note: Native fetch doesn't support limit/offset directly in standard RN-Contacts,
  // but since this is for "picking", we just load all and slice.
  const contacts = await getAllContacts();
  return contacts.slice(0, limit);
}

/** ✅ Search contacts quickly by name (Native Optimized) */
export async function searchContacts(term: string): Promise<SimpleContact[]> {
  return getAllContacts(term);
}