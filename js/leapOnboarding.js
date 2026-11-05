/* Read-only onboarding. No Basin, storage, trust-line lookup, or leaderboard scoring.
 * Browser API: await leapOnboarding.checkAddress(address, { signal }).
 * Tests/other transports may inject request(payload) => Promise<XRPL result>.
 */
(function (global) {
  'use strict';
  const ISSUER = 'rh7SidU91xGW2Za5RvoKiCgS2YB2psTBgq';
  const DISTRIBUTOR = 'rnbmFoUKhnMZ8QCJ6kA5J2uwfP8rm9cUdU';
  const CURRENCY = '4C45415000000000000000000000000000000000';
  const SERVERS = ['wss://s1.ripple.com/', 'wss://s2.ripple.com/'];
  const ALPHABET = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';
  const fail = code => Object.assign(new Error(code), { code });
  const integer = n => Number.isSafeInteger(n) && n >= 0;
  const token = a => a && typeof a === 'object' && a.issuer === ISSUER &&
    (a.currency === CURRENCY || a.currency === 'LEAP');
  const startingAmount = a => token(a) && Number(a.value) === 100;
  const txOf = e => e.tx_json || e.tx || {};
  const success = e => e.validated === true && e.meta?.TransactionResult === 'tesSUCCESS';
  const result = (address, state, details = {}) => ({
    address, state, canEnter: state === 'player', canRequest: state === 'new', ...details
  });

  // Decode XRPL Base58Check: account version 0, 20-byte account ID, 4-byte checksum.
  // Web Crypto is available on HTTPS and localhost; failure is unknown, not invalid.
  async function validAddress(address) {
    if (!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address)) return false;
    let value = 0n;
    for (const ch of address) value = value * 58n + BigInt(ALPHABET.indexOf(ch));
    const bytes = [];
    while (value > 0n) { bytes.unshift(Number(value & 255n)); value >>= 8n; }
    for (const ch of address) { if (ch !== ALPHABET[0]) break; bytes.unshift(0); }
    if (bytes.length !== 25 || bytes[0] !== 0) return false;
    const body = new Uint8Array(bytes.slice(0, 21));
    const first = await global.crypto.subtle.digest('SHA-256', body);
    const hash = new Uint8Array(await global.crypto.subtle.digest('SHA-256', first));
    return bytes.slice(21).every((byte, i) => byte === hash[i]);
  }

  function receipt(entry, address) {
    if (!success(entry)) return null;
    const tx = txOf(entry);
    let sender, destination;
    if (tx.TransactionType === 'Payment') {
      sender = tx.Account; destination = tx.Destination;
    } else if (tx.TransactionType === 'CheckCash') {
      const check = (entry.meta.AffectedNodes || []).map(n => n.DeletedNode)
        .find(n => n?.LedgerEntryType === 'Check' && n.FinalFields?.Destination === address);
      sender = check?.FinalFields?.Account; destination = check?.FinalFields?.Destination;
    } else return null;
    if (sender !== DISTRIBUTOR || destination !== address) return null;
    let amount = entry.meta.delivered_amount ?? entry.meta.DeliveredAmount;
    // Exact Amount is safe only when partial Payment delivery is not enabled.
    if (amount == null && !(tx.TransactionType === 'Payment' && (Number(tx.Flags || 0) & 0x20000))) amount = tx.Amount;
    if (amount == null || amount === 'unavailable') throw fail('ambiguous_receipt');
    return startingAmount(amount) ? {
      via: tx.TransactionType === 'Payment' ? 'payment' : 'check',
      transactionHash: entry.hash || tx.hash || null
    } : null;
  }

  function covers(ranges, first, last) {
    return typeof ranges === 'string' && ranges.split(',').some(range => {
      const parts = range.trim().split('-').map(Number);
      return parts.length <= 2 && parts.every(integer) && parts[0] <= first &&
        (parts[1] ?? parts[0]) >= last;
    });
  }

  async function inspect(address, request, maxPages) {
    const snapshot = await request({ command: 'ledger', ledger_index: 'validated' });
    const ledger = snapshot.ledger;
    const end = Number(snapshot.ledger_index ?? ledger?.ledger_index);
    const hash = snapshot.ledger_hash ?? ledger?.ledger_hash;
    const closeTime = Number(ledger?.close_time);
    if (snapshot.validated !== true || !integer(end) || !/^[A-Fa-f0-9]{64}$/.test(hash || '') || !integer(closeTime)) throw fail('invalid_snapshot');
    const details = { ledgerIndex: end, ledgerHash: hash };
    try {
      const info = await request({ command: 'account_info', account: address, ledger_hash: hash });
      if (info.validated !== true || info.account_data?.Account !== address) throw fail('invalid_account_response');
    } catch (error) {
      if (error.code === 'actNotFound') return result(address, 'unactivated', details);
      throw error;
    }

    // Read only this address's history. A positive receipt permits an early exit.
    let marker, creation = null, complete = false, uncertain = false;
    let historyError = null;
    try {
      const markers = new Set();
      for (let page = 0; page < maxPages; page++) {
        const history = await request({ command: 'account_tx', account: address,
          ledger_index_min: -1, ledger_index_max: end, binary: false, forward: false,
          limit: 200, ...(marker === undefined ? {} : { marker }) });
        if (!Array.isArray(history.transactions)) throw fail('invalid_history');
        for (const entry of history.transactions) {
          const at = Number(entry.ledger_index ?? txOf(entry).ledger_index);
          if (!integer(at) || at > end) throw fail('invalid_history');
          let received;
          try { received = receipt(entry, address); }
          catch (error) { if (error.code !== 'ambiguous_receipt') throw error; uncertain = true; }
          if (received) return result(address, 'player', { ...details, ...received });
          if (success(entry) && (entry.meta.AffectedNodes || []).some(n =>
            n.CreatedNode?.LedgerEntryType === 'AccountRoot' && n.CreatedNode.NewFields?.Account === address)) {
            creation = creation === null ? at : Math.min(creation, at);
          }
        }
        if (!integer(history.ledger_index_min) || history.ledger_index_max !== end ||
            (creation !== null && history.ledger_index_min > creation)) throw fail('incomplete_history');
        marker = history.marker;
        if (marker == null) { complete = true; break; }
        const key = JSON.stringify(marker);
        if (markers.has(key)) throw fail('repeated_marker');
        markers.add(key);
      }
    } catch (error) { historyError = error; }

    // Current Check objects exclude cancelled/cashed Checks. Expiration uses the
    // validated ledger's clock, not the visitor's device clock. No trust line needed.
    marker = undefined;
    let objectsComplete = false;
    const markers = new Set();
    for (let page = 0; page < maxPages; page++) {
      const objects = await request({ command: 'account_objects', account: address,
        type: 'check', ledger_hash: hash, limit: 200,
        ...(marker === undefined ? {} : { marker }) });
      if (objects.validated !== true || !Array.isArray(objects.account_objects)) throw fail('invalid_checks');
      const check = objects.account_objects.find(o => o.LedgerEntryType === 'Check' &&
        o.Account === DISTRIBUTOR && o.Destination === address && startingAmount(o.SendMax) &&
        /^[A-Fa-f0-9]{64}$/.test(o.index || '') &&
        (o.Expiration === undefined || (integer(o.Expiration) && o.Expiration > closeTime)));
      if (check) return result(address, 'check_pending', { ...details, checkId: check.index,
        expiration: check.Expiration ?? null });
      marker = objects.marker;
      if (marker == null) { objectsComplete = true; break; }
      const key = JSON.stringify(marker);
      if (markers.has(key)) throw fail('repeated_marker');
      markers.add(key);
    }
    if (historyError) throw historyError;
    if (!complete || !objectsComplete || creation === null || uncertain) throw fail('incomplete_history');
    // Exhausting pagination alone is not proof of complete server history.
    const server = await request({ command: 'server_info' });
    if (!covers(server.info?.complete_ledgers, creation, end)) throw fail('history_gap');
    return result(address, 'new', details);
  }

  // One bounded connection per server, cleaned up on success, failure, or abort.
  function connection(url, { signal, timeoutMs, requestTimeoutMs }) {
    const ws = new global.WebSocket(url);
    let nextId = 0, stopped = false, rejectOpen;
    const pending = new Map();
    function close(error = fail('connection_closed')) {
      if (stopped) return;
      stopped = true; clearTimeout(deadline); signal?.removeEventListener('abort', abort);
      rejectOpen?.(error);
      for (const task of pending.values()) { clearTimeout(task.timer); task.reject(error); }
      pending.clear();
      ws.removeEventListener('message', message);
      ws.removeEventListener('close', onClose); ws.removeEventListener('error', onError);
      ws.removeEventListener('open', onOpen);
      ws.close();
    }
    const abort = () => close(fail('aborted'));
    const onClose = () => close(fail('connection_closed'));
    const onError = () => close(fail('network_error'));
    let resolveOpen;
    const onOpen = () => { rejectOpen = null; resolveOpen(); };
    const ready = new Promise((resolve, reject) => { resolveOpen = resolve; rejectOpen = reject; });
    function message(event) {
      let msg; try { msg = JSON.parse(event.data); } catch { return; }
      const task = pending.get(msg.id); if (!task) return;
      pending.delete(msg.id); clearTimeout(task.timer);
      const error = msg.error || msg.result?.error;
      if (msg.status === 'error' || error) task.reject(fail(error || 'rpc_error'));
      else task.resolve(msg.result);
    }
    const deadline = setTimeout(() => close(fail('timeout')), timeoutMs);
    ws.addEventListener('open', onOpen); ws.addEventListener('message', message);
    ws.addEventListener('close', onClose); ws.addEventListener('error', onError);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    return { ready, close, request(payload) {
      if (stopped) return Promise.reject(fail('connection_closed'));
      return new Promise((resolve, reject) => {
        const id = ++nextId;
        const timer = setTimeout(() => { pending.delete(id); reject(fail('timeout')); }, requestTimeoutMs);
        pending.set(id, { resolve, reject, timer });
        try { ws.send(JSON.stringify({ ...payload, id })); }
        catch { clearTimeout(timer); pending.delete(id); reject(fail('network_error')); }
      });
    } };
  }

  async function checkAddress(value, options = {}) {
    const address = typeof value === 'string' ? value.trim() : '';
    const { signal, request, maxPages = 20, timeoutMs = 15000, requestTimeoutMs = 6000 } = options;
    const unknown = error => result(address, 'unknown', { reason: error?.code || 'lookup_failed' });
    if (signal?.aborted) return unknown(fail('aborted'));
    try { if (!await validAddress(address)) return result(address, 'invalid'); }
    catch { return unknown(fail('validation_unavailable')); }
    if (!Number.isInteger(maxPages) || maxPages < 1 || !Number.isFinite(timeoutMs) || timeoutMs <= 0 ||
        !Number.isFinite(requestTimeoutMs) || requestTimeoutMs <= 0) return unknown(fail('invalid_options'));
    const guarded = fn => async payload => {
      if (signal?.aborted) throw fail('aborted');
      const answer = await fn(payload);
      if (signal?.aborted) throw fail('aborted');
      if (answer?.error) throw fail(answer.error);
      return answer;
    };
    if (request) {
      try { return await inspect(address, guarded(request), maxPages); }
      catch (error) { return unknown(error); }
    }
    let lastError;
    for (const server of SERVERS) {
      if (signal?.aborted) return unknown(fail('aborted'));
      let client;
      try {
        client = connection(server, { signal, timeoutMs, requestTimeoutMs });
        await client.ready;
        return await inspect(address, guarded(client.request), maxPages);
      } catch (error) { lastError = error; }
      finally { client?.close(); }
    }
    return unknown(lastError);
  }
  global.leapOnboarding = Object.freeze({ checkAddress });
})(typeof window !== 'undefined' ? window : globalThis);
