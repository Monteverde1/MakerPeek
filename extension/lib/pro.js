// MakerPeek - Pro entitlement via Supabase subscriptions (client_reference_id)

import { SUPABASE_URL, SUPABASE_ANON_KEY, MONTHLY_PAYMENT_LINK } from "./config.js";

const VERIFICATION_MODE = false;
const PRO_CACHE_TTL = 60 * 60 * 1000;

export function isVerificationMode() {
  return VERIFICATION_MODE;
}

/** Sync check from a { paid } status object (popup / message responses). */
export function isPro(status) {
  if (VERIFICATION_MODE) return true;
  if (typeof status === "boolean") return status;
  return !!(status && status.paid);
}

export async function checkIsPro() {
  if (VERIFICATION_MODE) return true;

  const data = await chrome.storage.local.get([
    "clientReferenceId",
    "userIsPro",
    "proCheckedAt",
  ]);
  if (!data.clientReferenceId) return false;

  if (data.proCheckedAt && Date.now() - data.proCheckedAt < PRO_CACHE_TTL) {
    return data.userIsPro === true;
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?client_reference_id=eq.${encodeURIComponent(data.clientReferenceId)}&select=status`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    const rows = await res.json();
    const active = rows?.[0]?.status === "active";
    await chrome.storage.local.set({
      userIsPro: active,
      proCheckedAt: Date.now(),
    });
    return active;
  } catch {
    return data.userIsPro === true;
  }
}

export async function getProStatus() {
  if (VERIFICATION_MODE) {
    return { paid: true, source: "verification" };
  }
  const paid = await checkIsPro();
  return { paid, source: "storage" };
}

export async function requireProOrPrompt() {
  const paid = await checkIsPro();
  if (paid) return true;
  const { clientReferenceId } = await chrome.storage.local.get("clientReferenceId");
  const ref = clientReferenceId ? `?client_reference_id=${clientReferenceId}` : "";
  chrome.tabs.create({ url: `${MONTHLY_PAYMENT_LINK}${ref}` });
  return false;
}
