/*
  Wild Ledger Community Authority resolver — LEAP Protocol 1.0.

  Canonical authority state is published as a validated no-op AccountSet:
    <COMMUNITY>-LEAP/AUTHORITY/OPERATING-WALLET=<XRPL-ADDRESS>

  Sailing Frog's Leap / existing configured community:
  - The configured Operating Wallet is the permanent community wallet.
  - Its one-time initial self-statement must still validate before the
    existing recognition workflows allow new official activity.
  - Later statements cannot change that wallet.
  - Preserve the initial-statement fields and authority-result shape used
    by the existing membership, CONFIG, Check, and recognition readers.

  Owner-provisioned community wallets are resolved separately by
  communityAccess.js and will be simplified in Step 3B.
*/

import { DirectXRPLClient, isClassicAddress } from "./xrplTransport.js";

const ACCOUNTSET_SPECIFIC_FIELDS = [
  "ClearFlag", "Domain", "EmailHash", "MessageKey", "NFTokenMinter",
  "SetFlag", "TransferRate", "TickSize", "WalletLocator", "WalletSize"
];

const CACHE = new Map();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeTx(entry) {
  return entry?.tx_json || entry?.tx || entry?.transaction || entry || {};
}

function transactionSucceeded(entry) {
  if (entry?.validated === false) return false;
  const meta = entry?.meta || entry?.metaData || entry?.metadata || {};
  const result = meta?.TransactionResult ?? meta?.transaction_result;
  return !result || result === "tesSUCCESS";
}

function ledgerIndex(entry, tx = normalizeTx(entry)) {
  const value = entry?.ledger_index ?? entry?.ledgerIndex ?? tx?.ledger_index ?? tx?.ledgerIndex ?? tx?.inLedger;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function transactionIndex(entry) {
  const meta = entry?.meta || entry?.metaData || entry?.metadata || {};
  const value = entry?.tx_index ?? entry?.transaction_index ?? meta?.TransactionIndex ?? meta?.transaction_index;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function transactionHash(entry, tx = normalizeTx(entry)) {
  return String(entry?.hash || entry?.tx_hash || tx?.hash || "");
}

function orderFromEntry(entry, tx = normalizeTx(entry)) {
  const ledger = ledgerIndex(entry, tx);
  if (!Number.isFinite(ledger)) return null;
  return { ledger, txIndex: transactionIndex(entry) };
}

function compareOrder(a, b) {
  if (a.ledger !== b.ledger) return a.ledger - b.ledger;
  const ai = Number.isFinite(a.txIndex) ? a.txIndex : -1;
  const bi = Number.isFinite(b.txIndex) ? b.txIndex : -1;
  return ai - bi;
}

function isAfter(a, b) {
  return compareOrder(a, b) > 0;
}

function isAtOrBefore(a, b) {
  return compareOrder(a, b) <= 0;
}

function hexToText(value) {
  if (!value || typeof value !== "string") return "";
  if (!/^[A-Fa-f0-9]+$/.test(value) || value.length % 2 !== 0) return value;
  try {
    const bytes = new Uint8Array(value.match(/.{2}/g).map(pair => parseInt(pair, 16)));
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/\0+$/g, "");
  } catch (_) {
    return value;
  }
}

function decodedMemoTexts(tx) {
  const texts = [];
  for (const wrapper of Array.isArray(tx?.Memos) ? tx.Memos : []) {
    const memo = wrapper?.Memo || {};
    for (const field of [memo.MemoData, memo.MemoType, memo.MemoFormat]) {
      if (field === undefined || field === null || field === "") continue;
      const decoded = hexToText(field).trim();
      if (decoded) texts.push(decoded);
    }
  }
  return texts;
}

export function isCanonicalNoOpAccountSet(tx) {
  if (tx?.TransactionType !== "AccountSet") return false;
  if (Number(tx.Flags || 0) !== 0) return false;
  return ACCOUNTSET_SPECIFIC_FIELDS.every(field => !(field in tx));
}

export function operatingWalletMemo(namespace, account) {
  const ns = String(namespace || "").trim();
  const wallet = String(account || "").trim();
  if (!ns) throw new Error("Community LEAP namespace is required.");
  if (!isClassicAddress(wallet)) throw new Error("A valid XRPL classic address is required for OPERATING-WALLET.");
  return `${ns}/AUTHORITY/OPERATING-WALLET=${wallet}`;
}

function authorityStatementFromEntry(entry, namespace) {
  const tx = normalizeTx(entry);
  if (!transactionSucceeded(entry) || !isCanonicalNoOpAccountSet(tx) || !isClassicAddress(tx.Account)) return null;

  const texts = decodedMemoTexts(tx);
  if (texts.length !== 1) return null;

  const prefix = `${namespace}/AUTHORITY/OPERATING-WALLET=`;
  const text = texts[0];
  if (!text.startsWith(prefix)) return null;

  const value = text.slice(prefix.length);
  if (!isClassicAddress(value)) return null;
  if (text !== operatingWalletMemo(namespace, value)) return null;

  const order = orderFromEntry(entry, tx);
  if (!order) return null;

  return {
    account: String(tx.Account),
    value,
    ledger: order.ledger,
    txIndex: order.txIndex,
    hash: transactionHash(entry, tx),
    memo: text
  };
}

async function readAccountHistory(client, account) {
  let marker;
  const rows = [];
  do {
    const fields = {
      account,
      ledger_index_min: -1,
      ledger_index_max: -1,
      binary: false,
      forward: true,
      limit: 400
    };
    if (marker !== undefined) fields.marker = marker;

    const response = await client.request("account_tx", fields, 30000);
    const result = response.result || {};
    rows.push(...(Array.isArray(result.transactions) ? result.transactions : []));
    marker = result.marker;
  } while (marker !== undefined && marker !== null);
  return rows;
}

function sortStatements(statements) {
  const sorted = [...statements].sort((a, b) => compareOrder(a, b));
  for (let i = 1; i < sorted.length; i += 1) {
    const prior = sorted[i - 1];
    const current = sorted[i];
    if (prior.ledger === current.ledger && (!Number.isFinite(prior.txIndex) || !Number.isFinite(current.txIndex))) {
      throw new Error(`Authority resolution needs XRPL transaction ordering for ledger ${current.ledger}, but TransactionIndex was unavailable.`);
    }
  }
  return sorted;
}

function cacheKey({ namespace, legacyOperatingWallet, serverUrl }) {
  return `${serverUrl}|${namespace}|${legacyOperatingWallet || ""}`;
}

function intervalContains(interval, order) {
  if (!order || !Number.isFinite(order.ledger)) return false;
  if (interval.fromExclusive && !isAfter(order, interval.fromExclusive)) return false;
  if (interval.throughInclusive && !isAtOrBefore(order, interval.throughInclusive)) return false;
  return true;
}

export async function resolveCommunityAuthority({
  community,
  serverUrl,
  force = false
}) {
  if (!community) throw new Error("Community configuration is required.");
  const namespace = String(community.leapNamespace || "").trim();
  if (!namespace) throw new Error("Community LEAP namespace is required.");
  if (!serverUrl) throw new Error("XRPL WebSocket URL is required.");

  const configuredOperatingWallet = String(community.operatingWallet || "").trim();
  const legacyWallet = isClassicAddress(configuredOperatingWallet) ? configuredOperatingWallet : "";
  if (!legacyWallet) throw new Error("The configured permanent Community Operating Wallet is required.");

  const key = cacheKey({ namespace, legacyOperatingWallet: legacyWallet, serverUrl });
  if (!force && CACHE.has(key)) return clone(CACHE.get(key));

  const client = new DirectXRPLClient(serverUrl);
  const statementCache = new Map();

  async function statementsFor(account) {
    if (statementCache.has(account)) return statementCache.get(account);
    const rows = await readAccountHistory(client, account);
    const statements = sortStatements(rows.map(entry => authorityStatementFromEntry(entry, namespace)).filter(Boolean));
    statementCache.set(account, statements);
    return statements;
  }

  try {
    await client.connect();

    const migrationCandidates = (await statementsFor(legacyWallet)).filter(statement =>
      statement.account === legacyWallet && statement.value === legacyWallet
    );
    const initialStatement = migrationCandidates[0] || null;

    if (!initialStatement) {
      const state = {
        namespace,
        authorityEstablished: false,
        initialStatementNeeded: true,
        initialStatement: null,
        legacyConfiguredAccount: legacyWallet,
        currentAccount: legacyWallet,
        canonicalCurrentAccount: "",
        accounts: [legacyWallet],
        statements: [],
        transitions: [],
        intervals: [{
          account: legacyWallet,
          source: "pre-authority-state",
          fromExclusive: null,
          throughInclusive: null,
          fromLedger: 0,
          throughLedger: null
        }],
        resolvedAt: new Date().toISOString(),
        // Legacy compatibility aliases retained for pages using the earlier bootstrap naming.
        bootstrapped: false,
        bootstrapNeeded: true,
        bootstrapStatement: null
      };
      CACHE.set(key, state);
      return clone(state);
    }

    // Only the original wallet can operate this community. All of its valid
    // history remains readable; a later replacement statement has no effect.
    const currentAccount = legacyWallet;
    const accounts = [legacyWallet];
    const statements = [{ ...initialStatement, kind: "INITIAL" }];
    const transitions = [];
    const intervals = [{
      account: legacyWallet,
      source: "xrpl",
      fromExclusive: null,
      throughInclusive: null,
      fromLedger: 0,
      throughLedger: null
    }];

    const state = {
      namespace,
      authorityEstablished: true,
      initialStatementNeeded: false,
      initialStatement: { ...initialStatement },
      legacyConfiguredAccount: legacyWallet,
      currentAccount,
      canonicalCurrentAccount: currentAccount,
      accounts,
      statements,
      transitions,
      intervals,
      resolvedAt: new Date().toISOString(),
      // Legacy compatibility aliases retained for pages using the earlier bootstrap naming.
      bootstrapped: true,
      bootstrapNeeded: false,
      bootstrapStatement: { ...initialStatement }
    };

    CACHE.set(key, state);
    return clone(state);
  } finally {
    client.close();
  }
}

function ledgerOnlyCandidate(interval, ledgerNumber) {
  if (interval.fromExclusive && ledgerNumber < Number(interval.fromExclusive.ledger)) return false;
  if (interval.throughInclusive && ledgerNumber > Number(interval.throughInclusive.ledger)) return false;
  return true;
}

export function isAuthorizedAtLedger(authorityState, account, ledger, txIndex = null) {
  const target = String(account || "");
  const ledgerNumber = Number(ledger);
  if (!target || !Number.isFinite(ledgerNumber)) return false;

  const parsedIndex = txIndex === null || txIndex === undefined || txIndex === "" ? null : Number(txIndex);
  if (!Number.isFinite(parsedIndex)) {
    const possibleAccounts = new Set(
      (authorityState?.intervals || [])
        .filter(interval => ledgerOnlyCandidate(interval, ledgerNumber))
        .map(interval => interval.account)
    );
    return possibleAccounts.size === 1 && possibleAccounts.has(target);
  }

  const exactOrder = { ledger: ledgerNumber, txIndex: parsedIndex };
  return (authorityState?.intervals || []).some(interval =>
    interval.account === target && intervalContains(interval, exactOrder)
  );
}

export function authorityAccountAtLedger(authorityState, ledger, txIndex = null) {
  const ledgerNumber = Number(ledger);
  if (!Number.isFinite(ledgerNumber)) return "";

  const parsedIndex = txIndex === null || txIndex === undefined || txIndex === "" ? null : Number(txIndex);
  if (!Number.isFinite(parsedIndex)) {
    const possibleAccounts = [...new Set(
      (authorityState?.intervals || [])
        .filter(interval => ledgerOnlyCandidate(interval, ledgerNumber))
        .map(interval => interval.account)
    )];
    return possibleAccounts.length === 1 ? possibleAccounts[0] : "";
  }

  const exactOrder = { ledger: ledgerNumber, txIndex: parsedIndex };
  return (authorityState?.intervals || []).find(interval => intervalContains(interval, exactOrder))?.account || "";
}

export function clearCommunityAuthorityCache() {
  CACHE.clear();
}
