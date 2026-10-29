/* Game of LEAP — participant session and XRPL Check helpers.
 * Browser script. No dependencies, no persistent application storage.
 * Configure the issuing account and XRPL client from your application.
 */
(function (global) {
  'use strict';
  const KEY = 'leap.participant';
  const CLASSES = new Set(['P', 'B', 'N']);
  const LEVELS = new Set([100, 200]);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  function validate(value) {
    if (!value || typeof value !== 'object') throw new Error('Participant must be an object');
    const address = String(value.address || '').trim();
    const nodeId = String(value.nodeId || '').trim().toUpperCase();
    const classification = String(value.classification || '').trim().toUpperCase();
    const level = Number(value.level);
    if (!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address)) throw new Error('Invalid XRPL classic address');
    if (!/^[A-Z0-9]{3}$/.test(nodeId)) throw new Error('Node ID must have three letters or digits');
    if (!CLASSES.has(classification)) throw new Error('Classification must be P, B, or N');
    if (!LEVELS.has(level)) throw new Error('Level must be 100 or 200');
    return { address, nodeId, classification, level };
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
  function clearParticipant() { sessionStorage.removeItem(KEY); }
  function formatMemo({ nodeId, classification, level }) {
    const id = String(nodeId || '').trim().toUpperCase();
    const cls = String(classification || '').trim().toUpperCase();
    const lvl = Number(level);
    if (!/^[A-Z0-9]{3}$/.test(id) || !CLASSES.has(cls) || !LEVELS.has(lvl)) throw new Error('Invalid Check memo fields');
    return `${id}-${cls}-${lvl}`;
  }
  function parseMemo(text) {
    const match = /^([A-Z0-9]{3})-([PBN])-(100|200)$/.exec(String(text || '').trim().toUpperCase());
    return match ? { nodeId: match[1], classification: match[2], level: Number(match[3]) } : null;
  }
  function toHex(text) {
    return Array.from(encoder.encode(text), b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  function fromHex(hex) {
    if (!/^(?:[0-9a-f]{2})*$/i.test(hex || '')) return null;
    try { return decoder.decode(Uint8Array.from(hex.match(/../g) || [], h => parseInt(h, 16))); }
    catch (_) { return null; }
  }
  function encodeCheckMemo(fields) { return { Memo: { MemoData: toHex(formatMemo(fields)) } }; }
  function decodeCheckMemo(tx) {
    for (const wrapper of tx.Memos || []) {
      const text = fromHex(wrapper?.Memo?.MemoData);
      const parsed = parseMemo(text);
      if (parsed) return parsed;
    }
    return null;
  }
  function checkIndex(tx, kind) {
    const nodes = tx.meta?.AffectedNodes || [];
    for (const entry of nodes) {
      const [action, node] = Object.entries(entry)[0] || [];
      if (node?.LedgerEntryType === 'Check' && action === kind) return node.LedgerIndex;
    }
    return null;
  }
  async function accountHistory(client, address, options = {}) {
    if (!client || typeof client.request !== 'function') throw new Error('An XRPL client with request() is required');
    const records = [];
    let marker;
    do {
      const response = await client.request({
        command: 'account_tx', account: address, ledger_index_min: options.ledgerMin ?? -1,
        ledger_index_max: -1, forward: true, limit: 200, ...(marker ? { marker } : {})
      });
      records.push(...(response.result.transactions || []));
      marker = response.result.marker;
    } while (marker);
    return records;
  }
  function extractChecks(records, issuerAddress) {
    const checks = new Map();
    const later = [];
    for (const record of records) {
      const tx = record.tx || record.tx_json || {};
      const meta = record.meta || tx.meta || {};
      if (meta.TransactionResult !== 'tesSUCCESS') continue;
      const full = { ...tx, meta };
      if (tx.TransactionType === 'CheckCreate' && tx.Account === issuerAddress) {
        const memo = decodeCheckMemo(tx);
        if (!memo) continue;
        const id = checkIndex(full, 'CreatedNode');
        if (!id) continue;
        checks.set(id, {
          checkId: id, recipient: tx.Destination, issuer: tx.Account,
          sendMax: tx.SendMax, memo, sequence: tx.Sequence,
          createdLedger: record.ledger_index ?? tx.ledger_index,
          createdHash: record.hash || tx.hash, status: 'outstanding'
        });
      } else if (tx.TransactionType === 'CheckCash' || tx.TransactionType === 'CheckCancel') {
        later.push({ tx, meta });
      }
    }
    for (const { tx } of later) {
      const check = checks.get(tx.CheckID);
      if (check) check.status = tx.TransactionType === 'CheckCash' ? 'cashed' : 'cancelled';
    }
    return Array.from(checks.values());
  }
  async function readIssuedChecks(client, issuerAddress, options = {}) {
    const history = await accountHistory(client, issuerAddress, options);
    return extractChecks(history, issuerAddress);
  }
  async function findParticipantChecks(client, issuerAddress, participantAddress, options = {}) {
    const checks = await readIssuedChecks(client, issuerAddress, options);
    return checks.filter(check => check.recipient === participantAddress);
  }
  async function loadParticipantFromLedger(client, issuerAddress, participantAddress, options = {}) {
    const checks = await findParticipantChecks(client, issuerAddress, participantAddress, options);
    if (!checks.length) return null;
    const latest = checks.reduce((a, b) => (a.createdLedger || 0) >= (b.createdLedger || 0) ? a : b);
    return setParticipant({ address: participantAddress, ...latest.memo });
  }
  global.leap = global.leap || {};
  Object.defineProperty(global.leap, 'participant', {
    configurable: true, enumerable: true,
    get: getParticipant, set: setParticipant
  });
  global.leap.participantHelpers = Object.freeze({
    getParticipant, setParticipant, clearParticipant, formatMemo, parseMemo,
    encodeCheckMemo, decodeCheckMemo, accountHistory, extractChecks,
    readIssuedChecks, findParticipantChecks, loadParticipantFromLedger
  });
})(window);
