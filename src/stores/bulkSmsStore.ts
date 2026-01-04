import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Types
interface BulkSmsState {
  // Core state
  mode: 'excel' | 'contacts';
  template: string;
  recents: string[];
  excelRows: Recipient[];
  contacts: SimpleContact[];
  selectedIds: Set<string>;

  // UI state
  importLoading: boolean;
  contactsLoading: boolean;
  query: string;

  // Session state
  activeSession: ExcelUploadData | null;
  showResumePrompt: boolean;
  sessionLoading: boolean;

  // Sending state
  sending: boolean;
  paused: boolean;
  sent: number;
  failed: number;
  queued: number;
  sendSpeed: number;
  simSlot: number;
  currentBulkId: string | null;
  smsStatus: 'checking' | 'ok' | 'fail' | 'unknown';

  // Queue diagnostics
  queueStatus: {
    pending: number;
    failed: number;
    exhausted: number;
    circuitBreakerActive: boolean;
    cooldownRemainingMs: number | null;
  };
}

interface BulkSmsActions {
  // Core actions
  setMode: (mode: 'excel' | 'contacts') => void;
  setTemplate: (template: string) => void;
  addRecent: (template: string) => void;
  clearRecents: () => void;
  setExcelRows: (rows: Recipient[]) => void;
  clearExcelRows: () => void;
  setContacts: (contacts: SimpleContact[]) => void;
  setSelectedIds: (ids: Set<string>) => void;
  toggleContactSelection: (id: string) => void;
  setQuery: (query: string) => void;

  // Session actions
  setActiveSession: (session: ExcelUploadData | null) => void;
  setShowResumePrompt: (show: boolean) => void;
  setSessionLoading: (loading: boolean) => void;
  handleSessionResume: () => void;
  handleSessionDiscard: () => void;

  // Sending actions
  startSending: () => void;
  stopSending: () => void;
  togglePause: () => void;
  resetCounters: () => void;
  incrementSent: () => void;
  incrementFailed: () => void;
  incrementQueued: () => void;
  setSendSpeed: (speed: number) => void;
  setSimSlot: (slot: number) => void;
  generateBulkId: () => string;
  resetBulkId: () => void;
  setSmsStatus: (status: 'checking' | 'ok' | 'fail' | 'unknown') => void;

  // UI actions
  setImportLoading: (loading: boolean) => void;
  setContactsLoading: (loading: boolean) => void;

  // Queue actions
  setQueueStatus: (status: BulkSmsState['queueStatus']) => void;

  // Computed getters
  getMergedRecipients: () => Recipient[];
  getPickedFromContacts: () => Recipient[];
}

// Import types (these would be defined elsewhere)
interface Recipient {
  name: string;
  phone: string;
  amount?: number;
  fields?: Record<string, any>;
}

interface SimpleContact {
  id: string;
  name: string;
  phoneNumbers: string[];
}

interface ExcelUploadData {
  fileId: string;
  fileName: string;
  uploadTimestamp: number;
  lastAccessed: number;
  parsedData: any[];
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  processingStatus: string;
  columnMapping: any;
  previewData: any[];
  isActive: boolean;
}

/**
 * Optimized Zustand store for bulk SMS state management
 * Replaces the complex useBulkPro hook with better performance and maintainability
 */
export const useBulkSmsStore = create<BulkSmsState & BulkSmsActions>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    mode: 'excel',
    template: "Hello {name}, your arrears are KES {amount}. Pay via Paybill 247777.",
    recents: [],
    excelRows: [],
    contacts: [],
    selectedIds: new Set(),
    importLoading: false,
    contactsLoading: false,
    query: '',
    activeSession: null,
    showResumePrompt: false,
    sessionLoading: true,
    sending: false,
    paused: false,
    sent: 0,
    failed: 0,
    queued: 0,
    sendSpeed: 400,
    simSlot: 0,
    currentBulkId: null,
    smsStatus: 'checking',
    queueStatus: {
      pending: 0,
      failed: 0,
      exhausted: 0,
      circuitBreakerActive: false,
      cooldownRemainingMs: null,
    },

    // Actions
    setMode: (mode) => set({ mode }),

    setTemplate: (template) => set({ template }),

    addRecent: (template) => set((state: BulkSmsState) => ({
      recents: [template, ...state.recents.filter((t: string) => t !== template)].slice(0, 10)
    })),

    clearRecents: () => set({ recents: [] }),

    setExcelRows: (excelRows: Recipient[]) => set({ excelRows }),

    clearExcelRows: () => set({ excelRows: [] }),

    setContacts: (contacts: SimpleContact[]) => set({ contacts }),

    setSelectedIds: (selectedIds: Set<string>) => set({ selectedIds }),

    toggleContactSelection: (id: string) => set((state: BulkSmsState) => {
      const newSelectedIds = new Set(state.selectedIds);
      if (newSelectedIds.has(id)) {
        newSelectedIds.delete(id);
      } else {
        newSelectedIds.add(id);
      }
      return { selectedIds: newSelectedIds };
    }),

    setQuery: (query: string) => set({ query }),

    setActiveSession: (activeSession: ExcelUploadData | null) => set({ activeSession }),

    setShowResumePrompt: (showResumePrompt: boolean) => set({ showResumePrompt }),

    setSessionLoading: (sessionLoading: boolean) => set({ sessionLoading }),

    handleSessionResume: () => set({ showResumePrompt: false }),

    handleSessionDiscard: () => set({
      activeSession: null,
      showResumePrompt: false,
      excelRows: []
    }),

    startSending: () => set({
      sending: true,
      paused: false,
      sent: 0,
      failed: 0,
      queued: 0
    }),

    stopSending: () => set({ sending: false }),

    togglePause: () => set((state: BulkSmsState) => ({ paused: !state.paused })),

    resetCounters: () => set({ sent: 0, failed: 0, queued: 0 }),

    incrementSent: () => set((state: BulkSmsState) => ({ sent: state.sent + 1 })),

    incrementFailed: () => set((state: BulkSmsState) => ({ failed: state.failed + 1 })),

    incrementQueued: () => set((state: BulkSmsState) => ({ queued: state.queued + 1 })),

    setSendSpeed: (sendSpeed: number) => set({ sendSpeed }),

    setSimSlot: (simSlot: number) => set({ simSlot }),

    generateBulkId: () => {
      const bulkId = `blk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      set({ currentBulkId: bulkId });
      return bulkId;
    },

    resetBulkId: () => set({ currentBulkId: null }),

    setSmsStatus: (smsStatus: 'checking' | 'ok' | 'fail' | 'unknown') => set({ smsStatus }),

    setImportLoading: (importLoading: boolean) => set({ importLoading }),

    setContactsLoading: (contactsLoading: boolean) => set({ contactsLoading }),

    setQueueStatus: (queueStatus: BulkSmsState['queueStatus']) => set({ queueStatus }),

    // Computed getters
    getMergedRecipients: () => {
      const state = get();
      const list = state.mode === 'excel' ? state.excelRows : get().getPickedFromContacts();
      const seen = new Set<string>();

      return list.filter((r) => {
        const key = normalizePhone(r.phone);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },

    getPickedFromContacts: () => {
      const state = get();
      const picked: Recipient[] = [];

      for (const id of state.selectedIds) {
        const contact = state.contacts.find(c => c.id === id);
        if (contact?.phoneNumbers?.[0]) {
          picked.push({
            name: contact.name,
            phone: contact.phoneNumbers[0]
          });
        }
      }

      return picked;
    },
  }))
);

// Helper function for phone normalization
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Selectors for optimized re-renders
export const useBulkSmsMode = () => useBulkSmsStore((state: BulkSmsState) => state.mode);
export const useBulkSmsTemplate = () => useBulkSmsStore((state: BulkSmsState) => state.template);
export const useBulkSmsSendingState = () => useBulkSmsStore((state: BulkSmsState) => ({
  sending: state.sending,
  paused: state.paused,
  sent: state.sent,
  failed: state.failed,
  queued: state.queued,
}));
export const useBulkSmsRecipients = () => useBulkSmsStore((state: BulkSmsState & BulkSmsActions) => ({
  excelRows: state.excelRows,
  contacts: state.contacts,
  selectedIds: state.selectedIds,
  mergedRecipients: state.getMergedRecipients(),
}));
export const useBulkSmsSession = () => useBulkSmsStore((state: BulkSmsState) => ({
  activeSession: state.activeSession,
  showResumePrompt: state.showResumePrompt,
  sessionLoading: state.sessionLoading,
}));
