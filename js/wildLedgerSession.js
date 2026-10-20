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

// Member Record snapshot. A missing object means the reads are not complete.
const MEMBER_KEY = "wildLedger.member";
export function writeMemberSession({ totalLeap, earnedLeap, starLevel, greatChats }) {
  const values = [totalLeap, earnedLeap, starLevel, greatChats];
  if (!values.every(value => typeof value === "number" && Number.isFinite(value))) {
    throw new Error("Member session requires verified numeric values.");
  }
  const record = { totalLeap, earnedLeap, starLevel, greatChats };
  sessionStorage.setItem(MEMBER_KEY, JSON.stringify(record));
  return record;
}
export function readMemberSession() {
  try {
    const value = JSON.parse(sessionStorage.getItem(MEMBER_KEY) || "null");
    return value && typeof value === "object" &&
      [value.totalLeap, value.earnedLeap, value.starLevel, value.greatChats].every(
        n => typeof n === "number" && Number.isFinite(n)
      ) ? value : null;
  } catch (_) { return null; }
}
export function removeMemberSession() {
  sessionStorage.removeItem(MEMBER_KEY);
}
