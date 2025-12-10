export type MsgType = "incoming" | "outgoing" | "mms";
export type MsgStatus = "pending" | "sent" | "delivered" | "failed";

export type MessageRow = {
    id: number;
    address: string;
    body: string;
    type: MsgType;
    status: MsgStatus;
    timestamp: number;
    simSlot?: number | null;
    threadId?: string | null;
    isRead?: number;
    isArchived?: number;
};
