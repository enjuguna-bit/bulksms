import "dotenv/config";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { z } from "zod";
import { loadEnv } from "./env.js";

const env = loadEnv();
const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));

const activationSchema = z.object({
  deviceId: z.string().min(6, "deviceId must be at least 6 characters"),
  activationCode: z.string().min(4, "activationCode must be at least 4 characters"),
  email: z.string().email().optional(),
});

const billingWebhookSchema = z.object({
  event: z.string(),
  signature: z.string().optional(),
  data: z.object({
    customerId: z.string(),
    planId: z.string(),
    status: z
      .enum(["trialing", "active", "past_due", "canceled", "unpaid"])
      .default("active"),
    amount: z.number().nonnegative().optional(),
    currency: z.string().default("KES"),
  }),
});

const plans = [
  { id: "starter", name: "Starter", amount: 0, currency: "KES", interval: "monthly" },
  { id: "pro", name: "Pro", amount: 1499, currency: "KES", interval: "monthly" },
  { id: "business", name: "Business", amount: 3999, currency: "KES", interval: "monthly" },
];

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/billing/plans", (_req, res) => {
  res.json({ plans });
});

app.post("/activation", async (req, res) => {
  const parsed = activationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid activation payload",
      details: parsed.error.flatten(),
    });
  }

  if (env.ACTIVATION_SECRET && parsed.data.activationCode !== env.ACTIVATION_SECRET) {
    return res.status(401).json({ error: "Invalid activation code" });
  }

  const issuedAt = Date.now();
  const expiresAt = issuedAt + 30 * 24 * 60 * 60 * 1000;
  const tokenPayload = {
    deviceId: parsed.data.deviceId,
    issuedAt,
    expiresAt,
  };
  const token = Buffer.from(JSON.stringify(tokenPayload)).toString("base64url");

  return res.json({
    status: "activated",
    token,
    expiresAt: new Date(expiresAt).toISOString(),
  });
});

app.post("/billing/webhook", (req, res) => {
  const parsed = billingWebhookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid webhook payload",
      details: parsed.error.flatten(),
    });
  }

  if (env.BILLING_WEBHOOK_SECRET && parsed.data.signature !== env.BILLING_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  console.info(
    "[billing] webhook received",
    parsed.data.event,
    parsed.data.data.customerId,
    parsed.data.data.status,
  );

  return res.status(200).json({ received: true });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[activation-server] Unhandled error", err);
  res.status(500).json({ error: "Internal server error" });
});

const port = env.PORT;
app.listen(port, () => {
  console.log(`[activation-server] listening on port ${port}`);
});