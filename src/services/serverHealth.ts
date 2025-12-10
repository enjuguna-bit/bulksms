// src/services/serverHealth.ts
import axios from "axios";

export async function checkServerHealth(url: string): Promise<boolean> {
  try {
    const res = await axios.get(`${url}/`);
    return res.status === 200;
  } catch (_) {
    return false;
  }
}
