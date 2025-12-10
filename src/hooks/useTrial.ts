// src/hooks/useTrial.ts
import { useEffect, useState } from "react";
import {
  activateOnServer,
  checkStatusOffline,
  checkStatusOnServer,
} from "@/services/activation";

type TrialState = "loading" | "active" | "expired" | "error";

export default function useTrialAtStartup(): TrialState {
  const [status, setStatus] = useState<TrialState>("loading");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // 1) Try offline first
        const offlineStatus = await checkStatusOffline();
        if (!mounted) return;

        if (offlineStatus === "active") {
          setStatus("active");

          // Background refresh (non-blocking)
          setTimeout(() => {
            checkStatusOnServer().catch((err) =>
              console.warn("[useTrial] Background refresh failed:", err)
            );
          }, 0);

          return;
        }

        // 2) Fallback to online activation/refresh
        const online = await activateOnServer();
        if (!mounted) return;

        if (online.status === "activated" || online.status === "active") {
          setStatus("active");
        } else if (online.status === "expired") {
          setStatus("expired");
        } else {
          setStatus("error");
        }
      } catch (e) {
        console.warn("[useTrial] Activation error:", e);
        if (mounted) setStatus("error");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return status;
}
