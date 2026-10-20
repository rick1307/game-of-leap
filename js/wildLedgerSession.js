// Wild Ledger: all application sessionStorage access belongs here.
// One active wallet and community per browser tab. No persistent browser storage.
const PREFIX = /^wildledger(?:[._-]|$)/i;
const USER_KEY = "wildLedger.user";
const MEMBER_KEY = "wildLedger.member";

function readObject(key) {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "null");
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch (_) { return null; }
}

export function clearWildLedgerSessions() {
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (key && PREFIX.test(key)) sessionStorage.removeItem(key);
  }
}

export function writeUserSession({ wallet, authority, communityId }) {
  if (typeof wallet !== "string" || !wallet.trim()) throw new Error("User wallet is required.");
  if (!["owner", "operator", "member"].includes(authority)) throw new Error("Invalid user authority.");
  if (authority !== "owner" && (typeof communityId !== "string" || !communityId.trim())) throw new Error("Active community ID is required.");
  if (authority === "owner" && communityId == null) communityId = null;
  const user = { wallet, authority, communityId };
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  // Member data belongs to the wallet/community for which it was fetched.
  sessionStorage.removeItem(MEMBER_KEY);
  return user;
}

export function readUserSession() {
  const user = readObject(USER_KEY);
  return user && typeof user.wallet === "string" &&
    ["owner", "operator", "member"].includes(user.authority) &&
    (typeof user.communityId === "string" || (user.authority === "owner" && user.communityId === null)) ? user : null;
}

export function updateUserSession(changes) {
  const current = readUserSession();
  if (!current) return null;
  const next = { ...current, ...changes };
  if (next.wallet === current.wallet && next.communityId === current.communityId) {
    // Updating authority does not invalidate the member's cached ledger record.
    const member = readMemberSession();
    const user = writeUserSession(next);
    if (member) sessionStorage.setItem(MEMBER_KEY, JSON.stringify(member));
    return user;
  }
  return writeUserSession(next);
}

export function removeUserSession() {
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(MEMBER_KEY);
}

const isNumber = n => typeof n === "number" && Number.isFinite(n);
const isArray = a => Array.isArray(a);

export function writeMemberSession({ totalLeap, earnedLeap, starLevel, greatChats, history }) {
  if (![totalLeap, earnedLeap, starLevel, greatChats].every(isNumber)) {
    throw new Error("Member session requires four verified numeric values.");
  }
  if (!history || ![history.badges, history.challenges, history.events].every(isArray)) {
    throw new Error("Member history requires badges, challenges, and events arrays.");
  }
  const member = {
    totalLeap, earnedLeap, starLevel, greatChats,
    history: {
      badges: [...history.badges],
      challenges: [...history.challenges],
      events: [...history.events]
    }
  };
  sessionStorage.setItem(MEMBER_KEY, JSON.stringify(member));
  return member;
}

export function readMemberSession() {
  const member = readObject(MEMBER_KEY);
  return member &&
    [member.totalLeap, member.earnedLeap, member.starLevel, member.greatChats].every(isNumber) &&
    member.history &&
    [member.history.badges, member.history.challenges, member.history.events].every(isArray)
    ? member : null;
}

export function updateMemberSession(changes) {
  const current = readMemberSession();
  if (!current) return null;
  return writeMemberSession({
    ...current, ...changes,
    history: { ...current.history, ...(changes.history || {}) }
  });
}

export function removeMemberSession() {
  sessionStorage.removeItem(MEMBER_KEY);
}

// Compatibility for existing pages that import the earlier Get Wild API.
// These functions use wildLedger.user; they do NOT create a getWild storage object.
export function writeGetWildSession({ wallet, authority, communityId }) {
  return writeUserSession({ wallet, authority, communityId });
}
export function readGetWildSession() { return readUserSession(); }
export function updateGetWildSession(changes) { return updateUserSession(changes); }
export function removeGetWildSession() { return removeUserSession(); }
