// Central sessionStorage management for Wild Ledger pages.
// No wallet connection, XRPL, or browser persistence beyond this tab.
const PREFIX = /^wildledger(?:[._-]|$)/i;
const GET_WILD_KEY = "wildLedger.getWild";

export function clearWildLedgerSessions() {
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (key && PREFIX.test(key)) sessionStorage.removeItem(key);
  }
}

export function writeGetWildSession({ wallet, authority, communityId = "", communityName = "", configSchema = null, config = null }) {
  const savedConfig = config && typeof config === "object" && !Array.isArray(config)
    ? { ...config }
    : {};
  const session = { wallet, authority, communityId, communityName, configSchema, config: savedConfig };
  sessionStorage.setItem(GET_WILD_KEY, JSON.stringify(session));
  return session;
}

export function readGetWildSession() {
  const raw = sessionStorage.getItem(GET_WILD_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch (_) {
    return null;
  }
}

export function updateGetWildSession(changes) {
  const current = readGetWildSession();
  if (!current) return null;
  return writeGetWildSession({ ...current, ...changes });
}

export function removeGetWildSession() {
  sessionStorage.removeItem(GET_WILD_KEY);
}
