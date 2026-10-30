/* Game of LEAP — participant session helpers.
 * Browser script. No dependencies, no persistent application storage.
 */
(function (global) {
  'use strict';
  const KEY = 'leap.participant';
  const REQUESTS_KEY = 'leap.requestsSent';
  const CLASSES = new Set(['P', 'B', 'N']);
  const LEVELS = new Set([100, 200]);

  function validate(value) {
    if (!value || typeof value !== 'object') throw new Error('Participant must be an object');
    const address = String(value.address || '').trim();
    const nodeId = String(value.nodeId || '').trim().toUpperCase();
    const classification = String(value.classification || '').trim().toUpperCase();
    const level = Number(value.level);
    if (!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address)) throw new Error('Invalid XRPL classic address');
    if (nodeId && !/^[A-Z0-9]{3}$/.test(nodeId)) throw new Error('Node ID must have three letters or digits');
    if (classification && !CLASSES.has(classification)) throw new Error('Classification must be P, B, or N');
    if (value.level != null && value.level !== '' && !LEVELS.has(level)) throw new Error('Level must be 100 or 200');
    return { address, nodeId: nodeId || null, classification: classification || null, level: value.level == null || value.level === '' ? null : level };
  }

  function setParticipant(value) {
    const participant = validate(value);
    sessionStorage.setItem(KEY, JSON.stringify(participant));
    return participant;
  }
  function getParticipant() {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    try { return validate(JSON.parse(raw)); } catch (_) { return null; }
  }
  function setParticipantAddress(address) {
    const existing = getParticipant();
    return setParticipant(existing?.address === String(address).trim()
      ? { ...existing, address }
      : { address, nodeId: null, classification: null, level: null });
  }
  function clearParticipant() { sessionStorage.removeItem(KEY); }
  // Separate session history: clearing the current participant never clears these addresses.
  function getRequestsSent() {
    try {
      const addresses = JSON.parse(sessionStorage.getItem(REQUESTS_KEY) || '[]');
      return Array.isArray(addresses)
        ? [...new Set(addresses.filter(address => typeof address === 'string' && /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address)))]
        : [];
    } catch (_) { return []; }
  }
  function hasRequestSent(address) {
    return getRequestsSent().includes(String(address || '').trim());
  }
  // Call only after Basin confirms a successful submission.
  function recordRequestSent(address) {
    const normalized = validate({ address }).address;
    const addresses = getRequestsSent();
    if (!addresses.includes(normalized)) {
      addresses.push(normalized);
      sessionStorage.setItem(REQUESTS_KEY, JSON.stringify(addresses));
    }
    return addresses;
  }

  global.leap = global.leap || {};
  Object.defineProperty(global.leap, 'participant', {
    configurable: true, enumerable: true,
    get: getParticipant, set: setParticipant
  });
  global.leap.participantHelpers = Object.freeze({
    getParticipant, setParticipant, setParticipantAddress, clearParticipant,
    getRequestsSent, hasRequestSent, recordRequestSent
  });
})(window);
