/* Home-page onboarding controller. Admission decisions come from leapOnboarding. */
(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const dialog = byId('leaderboard-dialog');
  const form = byId('leaderboard-signin-form');
  const input = byId('leaderboard-xrpl-address');
  const submit = byId('leaderboard-signin-submit');
  const requestButton = byId('request-starting-leap');
  const status = byId('leaderboard-signin-status');
  const helpers = window.leap.participantHelpers;
  const sentHere = new Set();
  const inFlight = new Set();
  let generation = 0, lookup = null, checkedAddress = null, busy = false;

  function invalidate() {
    generation++;
    lookup?.abort(); lookup = null;
    checkedAddress = null; busy = false;
    requestButton.hidden = true; requestButton.disabled = false;
    submit.disabled = false; submit.textContent = 'Continue';
    form.setAttribute('aria-busy', 'false');
  }
  function reset() {
    invalidate();
    try { helpers.clearParticipant(); } catch (_) { /* Report only if admission needs storage. */ }
    form.reset(); input.value = ''; status.textContent = '';
  }
  function hasRequest(address) {
    try { return sentHere.has(address) || helpers.hasRequestSent(address); }
    catch (_) { return sentHere.has(address); }
  }
  function waiting() {
    status.textContent = 'Your request has been received. When your 100 LEAP Check arrives, cash it in Xaman to enter the Player\'s Leaderboard. Check again to see your progress.';
    submit.textContent = 'Check again';
    requestButton.hidden = true;
  }
  function render(state, address) {
    checkedAddress = null;
    requestButton.hidden = true;
    switch (state) {
      case 'player':
        try { helpers.setParticipantAddress(address); }
        catch (_) {
          status.textContent = 'Your starting 100 LEAP is confirmed, but this browser cannot remember your address. Allow session storage and try again.';
          submit.textContent = 'Retry'; return;
        }
        status.textContent = 'Your starting 100 LEAP is confirmed. Opening the leaderboard…';
        window.location.assign('leaderboard.html');
        break;
      case 'check_pending':
        status.textContent = 'Your 100 LEAP Check is ready. Open Xaman and cash it to enter the Player\'s Leaderboard. Then return here and select Check again.';
        submit.textContent = 'Check again'; break;
      case 'new':
        if (hasRequest(address)) { waiting(); break; }
        if (inFlight.has(address)) {
          status.textContent = 'Your request is still being sent. Check again shortly.';
          submit.textContent = 'Check again'; break;
        }
        checkedAddress = address;
        status.textContent = 'Ready to play? Request your first 100 LEAP. Once your Check arrives, cash it in Xaman to enter the Player\'s Leaderboard.';
        requestButton.hidden = false;
        submit.textContent = 'Check again'; break;
      case 'invalid':
        status.textContent = 'Please enter a valid XRPL account address beginning with r. Copy it from your wallet and try again.';
        input.focus(); break;
      case 'unactivated':
        status.textContent = 'This account is not activated on the XRP Ledger. Activate it in your wallet, then check again.';
        submit.textContent = 'Check again'; break;
      default:
        status.textContent = 'Unable to verify this account. Please try again. If this keeps happening and you’re new to the game using an older account, try a newer XRPL account that you control.';
        submit.textContent = 'Retry';
    }
  }
  async function check(address, ticket) {
    lookup = new AbortController();
    const answer = await window.leapOnboarding.checkAddress(address, { signal: lookup.signal });
    if (ticket !== generation || !dialog.open || input.value.trim() !== address) return null;
    // Treat a malformed/mismatched response as unknown, never as a new applicant.
    return answer?.address === address ? answer.state : 'unknown';
  }
  function begin() {
    invalidate(); busy = true;
    submit.disabled = true; requestButton.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Checking the XRP Ledger…';
    return generation;
  }
  function finish(ticket) {
    if (ticket !== generation) return;
    busy = false; submit.disabled = false; requestButton.disabled = false;
    form.setAttribute('aria-busy', 'false');
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !dialog.open) return;
    input.value = input.value.trim();
    const address = input.value, ticket = begin();
    try {
      const state = await check(address, ticket);
      if (state) render(state, address);
    } catch (_) {
      if (ticket === generation && dialog.open) render('unknown', address);
    } finally { finish(ticket); }
  });
  requestButton.addEventListener('click', async () => {
    const address = input.value.trim();
    if (busy || !dialog.open || requestButton.hidden || checkedAddress !== address || hasRequest(address) || inFlight.has(address)) return;
    const ticket = begin();
    let timer, posting = false;
    try {
      // Recheck on the explicit request action: a Check may have arrived since Continue.
      const state = await check(address, ticket);
      if (!state) return;
      if (state !== 'new' || hasRequest(address)) { render(state, address); return; }
      posting = true;
      status.textContent = 'Sending your request…';
      inFlight.add(address);
      const controller = new AbortController();
      timer = setTimeout(() => controller.abort(), 15000);
      const body = new FormData();
      body.set('xrpl_address', address);
      body.set('request_type', "Sailing Frog's LEAP — I Want to Play");
      const response = await fetch('https://usebasin.com/f/93034286b67b', {
        method: 'POST', body, headers: { Accept: 'application/json' }, signal: controller.signal
      });
      if (!response.ok) throw new Error('Submission failed');
      // A closed dialog must not discard proof of delivery or cause a duplicate POST.
      sentHere.add(address);
      try { helpers.recordRequestSent(address); } catch (_) { /* In-page fallback remains. */ }
      if (ticket === generation && dialog.open) waiting();
    } catch (_) {
      if (ticket === generation && dialog.open) {
        if (!posting) { render('unknown', address); return; }
        status.textContent = 'Could not confirm delivery. Your request may have arrived. Check again before retrying.';
        submit.textContent = 'Check again';
      }
    } finally {
      clearTimeout(timer); inFlight.delete(address); finish(ticket);
    }
  });
  input.addEventListener('input', () => { invalidate(); status.textContent = ''; });
  byId('see-leaderboard').addEventListener('click', () => { reset(); dialog.showModal(); input.focus(); });
  byId('close-leaderboard-dialog').addEventListener('click', () => { invalidate(); dialog.close(); });
  dialog.addEventListener('cancel', invalidate);
  dialog.addEventListener('close', invalidate);
  window.addEventListener('pagehide', invalidate);
  window.addEventListener('pageshow', () => { reset(); if (dialog.open) dialog.close(); });
  reset();
})();
