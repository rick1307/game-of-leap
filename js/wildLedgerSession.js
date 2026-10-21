// Wild Ledger session manager. All application sessionStorage access belongs here.
// One wallet per tab; no persistent browser storage.
const PREFIX = /^wildledger(?:[._-]|$)/i;
const USER_KEY = 'wildLedger.user';
const OPERATOR_KEY = 'wildLedger.operator';
const MEMBER_KEY = 'wildLedger.member';

function readObject(key) {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || 'null');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch (_) { return null; }
}

export function clearWildLedgerSessions() {
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (key && PREFIX.test(key)) sessionStorage.removeItem(key);
  }
}

export function writeUserSession({ wallet, authority, selectedCommunity }) {
  if (typeof wallet !== 'string' || !wallet.trim()) throw new Error('User wallet is required.');
  if (!['owner', 'operator', 'member'].includes(authority)) throw new Error('Invalid user authority.');
  const previous = readUserSession();
  const sameIdentity = previous && previous.wallet === wallet.trim() && previous.authority === authority;
  const selection = selectedCommunity === undefined
    ? (sameIdentity ? previous.selectedCommunity : null)
    : selectedCommunity;
  if (authority === 'owner' && selection !== null &&
      (typeof selection !== 'string' || !selection.trim())) {
    throw new Error('Selected community must be a community ID or null.');
  }
  const user = {
    wallet: wallet.trim(), authority,
    ...(authority === 'owner' ? { selectedCommunity: selection === null ? null : selection.trim() } : {})
  };
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  if (!previous || previous.wallet !== user.wallet) {
    sessionStorage.removeItem(OPERATOR_KEY);
    sessionStorage.removeItem(MEMBER_KEY);
  }
  return user;
}

export function readUserSession() {
  const user = readObject(USER_KEY);
  if (!user || typeof user.wallet !== 'string' || !user.wallet.trim() ||
      !['owner', 'operator', 'member'].includes(user.authority)) return null;
  if (user.authority !== 'owner') return { wallet: user.wallet, authority: user.authority };
  const selectedCommunity = user.selectedCommunity === undefined ? null : user.selectedCommunity;
  if (selectedCommunity !== null &&
      (typeof selectedCommunity !== 'string' || !selectedCommunity.trim())) return null;
  return { wallet: user.wallet, authority: user.authority, selectedCommunity };
}

export function updateUserSession(changes) {
  const current = readUserSession();
  return current ? writeUserSession({ ...current, ...changes }) : null;
}

export function removeUserSession() {
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(OPERATOR_KEY);
  sessionStorage.removeItem(MEMBER_KEY);
}

export function writeOperatorSession({ communityId, communityName }) {
  if (typeof communityId !== 'string' || !communityId.trim()) throw new Error('Community ID is required.');
  if (typeof communityName !== 'string' || !communityName.trim()) throw new Error('Community name is required.');
  const operator = { communityId: communityId.trim(), communityName: communityName.trim() };
  const previous = readOperatorSession();
  sessionStorage.setItem(OPERATOR_KEY, JSON.stringify(operator));
  if (!previous || previous.communityId !== operator.communityId) sessionStorage.removeItem(MEMBER_KEY);
  return operator;
}

export function readOperatorSession() {
  const operator = readObject(OPERATOR_KEY);
  return operator && typeof operator.communityId === 'string' && !!operator.communityId.trim() &&
    typeof operator.communityName === 'string' && !!operator.communityName.trim()
    ? { communityId: operator.communityId, communityName: operator.communityName } : null;
}

export function updateOperatorSession(changes) {
  const current = readOperatorSession();
  return current ? writeOperatorSession({ ...current, ...changes }) : null;
}

export function removeOperatorSession() {
  sessionStorage.removeItem(OPERATOR_KEY);
  sessionStorage.removeItem(MEMBER_KEY);
}

const isNumber = n => typeof n === 'number' && Number.isFinite(n);
const isArray = Array.isArray;

export function writeMemberSession({ totalLeap, earnedLeap, starLevel, greatChats, history }) {
  if (![totalLeap, earnedLeap, starLevel, greatChats].every(isNumber)) {
    throw new Error('Member session requires four verified numeric values.');
  }
  if (!history || ![history.badges, history.challenges, history.events].every(isArray)) {
    throw new Error('Member history requires badges, challenges, and events arrays.');
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
    member.history && [member.history.badges, member.history.challenges, member.history.events].every(isArray)
    ? member : null;
}

export function updateMemberSession(changes) {
  const current = readMemberSession();
  return current ? writeMemberSession({
    ...current, ...changes,
    history: { ...current.history, ...(changes.history || {}) }
  }) : null;
}

export function removeMemberSession() { sessionStorage.removeItem(MEMBER_KEY); }

// Legacy function names remain callable while existing pages are migrated.
// They do not create a fourth storage object.
export function writeGetWildSession({ wallet, authority, communityId, communityName }) {
  const user = writeUserSession({ wallet, authority });
  if (communityId != null && communityName != null) writeOperatorSession({ communityId, communityName });
  return user;
}
export function readGetWildSession() { return readUserSession(); }
export function updateGetWildSession(changes) { return updateUserSession(changes); }
export function removeGetWildSession() { return removeUserSession(); }
