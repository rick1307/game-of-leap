/*
 * Wild Ledger — shared Ledger Trail presentation (Move 3).
 *
 * Use with ../ledgerTrail.css. This module draws the approved Get Wild Trail;
 * the calling page owns the wallet, XRPL reads/writes, automatic recovery,
 * any navigation and the decision to complete each real checkpoint.
 *
 * No retry buttons, invented progress, artificial checkpoint pauses, or
 * oversized completion checkmark. Only the final completed checkpoint is
 * held for 500 ms before the calling page's onFinished callback.
 *
 * Example (when a page is later integrated):
 *   const trail = createLedgerTrail({
 *     title: 'Join a Community',
 *     description: 'Follow your request on XRPL.',
 *     steps: [{ id: 'authority', title: 'Verify community', detail: 'Waiting…' },
 *             { id: 'ready', title: 'Ready', detail: 'Waiting…' }],
 *     onClose: () => { /* optional page cleanup * / }
 *   });
 *   trail.open();
 *   trail.setStep('authority', 'working', 'Checking XRPL…');
 *   trail.setStep('authority', 'done', 'Community verified.');
 *   trail.setStep('ready', 'waiting', 'Approve in Bifrost.');
 *   // After actual wallet approval: trail.finish({ onFinished: navigate });
 */

let nextTrailId = 0;

function element(tag, className = '', text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = String(text);
  return node;
}

function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`Ledger Trail: ${field} must be a non-empty string.`);
  }
  return value.trim();
}

/**
 * @param {object} config
 * @param {string} config.title - Page-specific white title.
 * @param {string} [config.description] - Page-specific intro below title.
 * @param {Array<{id:string,title:string,detail?:string}>} config.steps
 * @param {function} [config.onClose] - Called after the human closes the Trail.
 * @param {HTMLElement} [config.mount] - Defaults to document.body.
 * @returns {{open:function,close:function,reset:function,setStep:function,
 *           setStatus:function,showPrompt:function,hidePrompt:function,
 *           finish:function,destroy:function,element:HTMLElement}}
 */
export function createLedgerTrail({
  title,
  description = '',
  steps,
  onClose = null,
  mount = document.body
} = {}) {
  requireText(title, 'title');
  if (!Array.isArray(steps) || !steps.length) {
    throw new TypeError('Ledger Trail: provide at least one checkpoint.');
  }
  if (!mount || typeof mount.appendChild !== 'function') {
    throw new TypeError('Ledger Trail: mount must be an HTML element.');
  }
  if (onClose != null && typeof onClose !== 'function') {
    throw new TypeError('Ledger Trail: onClose must be a function.');
  }

  const definitions = steps.map((item, index) => ({
    id: requireText(item?.id, `steps[${index}].id`),
    title: requireText(item?.title, `steps[${index}].title`),
    detail: String(item.detail ?? '')
  }));
  if (new Set(definitions.map(item => item.id)).size !== definitions.length) {
    throw new TypeError('Ledger Trail: checkpoint IDs must be unique.');
  }

  // IDs are only used for labeling: all DOM lookups are local, never global.
  const uid = `wild-ledger-trail-${++nextTrailId}`;
  const overlay = element('div', 'ledger-trail');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', `${uid}-title`);
  overlay.setAttribute('aria-hidden', 'true');
  overlay.inert = true;

  const panel = element('div', 'ledger-trail-panel');
  const topline = element('div', 'trail-topline');
  const closeButton = element('button', 'trail-close', '×');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close Ledger Trail');
  const kicker = element('div', 'trail-kicker', 'Wild Ledger · Ledger Trail');
  topline.append(closeButton, kicker);

  const heading = element('h2', '', title);
  heading.id = `${uid}-title`;
  const lede = element('p', 'trail-lede', description);

  // Human handoff or information panel. No controls are introduced by default.
  const prompt = element('div', 'trail-action');
  const promptHeading = element('strong');
  const promptCopy = element('p');
  const qr = element('img');
  qr.alt = 'Wallet connection QR code';
  qr.hidden = true;
  prompt.append(promptHeading, promptCopy, qr);

  const route = element('div', 'trail-route');
  const records = new Map();
  for (const definition of definitions) {
    const row = element('div', 'trail-step');
    row.dataset.trailStep = definition.id;
    const marker = element('div', 'trail-marker', '○');
    marker.setAttribute('aria-hidden', 'true');
    const copy = element('div', 'trail-copy');
    const label = element('strong', '', definition.title);
    const detail = element('span', '', definition.detail);
    copy.append(label, detail);
    row.append(marker, copy);
    route.appendChild(row);
    records.set(definition.id, {row,marker,detail,definition,state:'pending'});
  }

  const status = element('p', 'trail-status', 'Starting the trail…');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  panel.append(topline, heading, lede, prompt, route, status);
  overlay.appendChild(panel);
  mount.appendChild(overlay);

  let destroyed = false;
  let completionTimer = null;
  let previouslyFocused = null;
  let completionInProgress = false;

  function assertAlive() {
    if (destroyed) throw new Error('Ledger Trail has been destroyed.');
  }

  function cancelCompletion() {
    if (completionTimer !== null) clearTimeout(completionTimer);
    completionTimer = null;
    completionInProgress = false;
  }

  function hidePrompt() {
    assertAlive();
    prompt.classList.remove('show');
    promptHeading.textContent = '';
    promptCopy.textContent = '';
    qr.hidden = true;
    qr.removeAttribute('src');
  }

  function showPrompt({ heading: text = '', detail = '', qrDataUrl = '' } = {}) {
    assertAlive();
    // Caller generates QR; no WalletConnect or other protocol code lives here.
    // Require an actual image data URL so external content isn't embedded.
    if (qrDataUrl && !/^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(qrDataUrl)) {
      throw new TypeError('Ledger Trail: qrDataUrl must be a base64 image data URL.');
    }
    promptHeading.textContent = String(text);
    promptCopy.textContent = String(detail);
    qr.hidden = !qrDataUrl;
    if (qrDataUrl) qr.src = qrDataUrl;
    else qr.removeAttribute('src');
    prompt.classList.add('show');
  }

  function setStatus(message, tone = '') {
    assertAlive();
    if (!['', 'busy', 'error'].includes(tone)) {
      throw new TypeError('Ledger Trail: status tone must be "", "busy", or "error".');
    }
    status.className = `trail-status${tone ? ` ${tone}` : ''}`;
    status.textContent = String(message);
  }

  /** working = spinner; waiting = pulsar; done = Get Wild's ordinary ✓. */
  function setStep(id, state, detail) {
    assertAlive();
    if (!['pending', 'working', 'waiting', 'done', 'failed'].includes(state)) {
      throw new TypeError(`Ledger Trail: unknown checkpoint state "${state}".`);
    }
    const record = records.get(id);
    if (!record) throw new RangeError(`Ledger Trail: unknown checkpoint "${id}".`);
    record.state = state;
    record.row.className = state === 'working' ? 'trail-step active'
      : state === 'waiting' ? 'trail-step active is-awaiting-wallet'
      : `trail-step ${state === 'pending' ? '' : state}`.trim();
    record.marker.replaceChildren();
    if (state === 'working' || state === 'waiting') {
      // Existing Get Wild activity CSS chooses the animation from the row class.
      const activity = element('span', 'trail-activity');
      activity.setAttribute('aria-hidden', 'true');
      record.marker.appendChild(activity);
    } else {
      record.marker.textContent = state === 'done' ? '✓' : state === 'failed' ? '×' : '○';
    }
    if (detail !== undefined) record.detail.textContent = String(detail);
  }

  function reset() {
    assertAlive();
    cancelCompletion();
    for (const {definition} of records.values()) {
      setStep(definition.id, 'pending', definition.detail);
    }
    setStatus('Starting the trail…');
    hidePrompt();
  }

  function open({ resetSteps = true } = {}) {
    assertAlive();
    if (resetSteps) reset();
    if (!overlay.classList.contains('show')) {
      previouslyFocused = document.activeElement;
    }
    overlay.inert = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('show');
    closeButton.focus({preventScroll:true});
  }

  function close({ notify = false } = {}) {
    assertAlive();
    cancelCompletion();
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.inert = true;
    if (previouslyFocused?.isConnected && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus({preventScroll:true});
    }
    previouslyFocused = null;
    if (notify && onClose) onClose();
  }

  function onKeyDown(event) {
    if (event.key === 'Escape' && overlay.classList.contains('show')) {
      event.preventDefault();
      close({notify:true});
    }
  }
  closeButton.addEventListener('click', () => close({notify:true}));
  document.addEventListener('keydown', onKeyDown);

  /**
   * Complete only the real final checkpoint (never mark other steps successful).
   * Hold the normal ✓ / "Completed" for 500 ms, then let the caller navigate
   * or continue. Without a callback, dismiss the Trail. No other artificial wait.
   */
  function finish({ message = 'Completed', onFinished = null } = {}) {
    assertAlive();
    if (onFinished != null && typeof onFinished !== 'function') {
      throw new TypeError('Ledger Trail: onFinished must be a function.');
    }
    if (completionInProgress) return;
    cancelCompletion();
    const last = definitions[definitions.length - 1];
    setStep(last.id, 'done', message);
    setStatus(message);
    hidePrompt();
    completionInProgress = true;
    completionTimer = setTimeout(() => {
      completionTimer = null;
      completionInProgress = false;
      if (destroyed || !overlay.classList.contains('show')) return;
      if (onFinished) onFinished();
      else close();
    }, 500);
  }

  function destroy() {
    if (destroyed) return;
    close();
    document.removeEventListener('keydown', onKeyDown);
    overlay.remove();
    destroyed = true;
  }

  return Object.freeze({
    element: overlay,
    open, close, reset, setStep, setStatus, showPrompt, hidePrompt, finish, destroy
  });
}
