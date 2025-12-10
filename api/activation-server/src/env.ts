import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  ACTIVATION_SECRET: z.string().optional(),
  BILLING_WEBHOOK_SECRET: z.string().optional(),
  BILLING_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  return EnvSchema.parse(process.env);
}