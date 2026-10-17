/*
  Wild Ledger wallet-address router.

  One wallet connection supplies an XRPL classic address. This module reads
  validated XRPL authority history and answers whether that address is:
    - the current Wild Ledger Owner Wallet;
    - the current Operating Wallet for one or more communities.

  No app username, password, Access ID, or private wallet material is used.
*/

import { isClassicAddress } from "./xrplTransport.js";
import { resolveOwnerAuthority } from "./ownerAuthority.js";
import { resolveCommunityAuthority } from "./communityAuthority.js";

function resolveProvisionedCommunityAuthority(provision) {
  const communityId = String(provision?.communityId || "").trim().toUpperCase();
  const namespace = String(provision?.namespace || `${communityId}-LEAP`).trim();
  const firstWallet = String(provision?.operatingWallet || "").trim();
  if (!communityId || !namespace || !isClassicAddress(firstWallet)) throw new Error("Owner provisioning record is incomplete.");

  const ledger = Number(provision.ledger);
  if (!Number.isFinite(ledger)) throw new Error(`${communityId} provisioning ledger is unavailable.`);
  const txIndex = provision.txIndex !== null && provision.txIndex !== undefined && Number.isFinite(Number(provision.txIndex))
    ? Number(provision.txIndex) : null;
  const establishmentOrder = { ledger, txIndex };

  return {
    communityId,
    namespace,
    authorityEstablished: true,
    currentAccount: firstWallet,
    canonicalCurrentAccount: firstWallet,
    accounts: [firstWallet],
    statements: [],
    transitions: [],
    intervals: [{
      account: firstWallet,
      source: "owner-provisioned",
      fromExclusive: establishmentOrder,
      throughInclusive: null,
      fromLedger: ledger,
      throughLedger: null
    }],
    establishment: {
      ownerWallet: String(provision.ownerWallet || ""),
      firstWallet,
      operatingWallet: firstWallet,
      ledger: provision.ledger,
      txIndex: provision.txIndex,
      hash: String(provision.hash || ""),
      memo: String(provision.memo || "")
    }
  };
}

function backendIdFor(community) {
  return String(
    window.WILD_LEDGER_BACKEND_COMMUNITY_ID?.(community) ||
    community?.backendId ||
    community?.id ||
    ""
  ).trim().toUpperCase();
}

function normalizedIntervals(authority) {
  return (authority?.intervals || []).map(interval => ({
    account: String(interval.account || ""),
    source: String(interval.source || "xrpl"),
    fromExclusive: interval.fromExclusive || null,
    throughInclusive: interval.throughInclusive || null,
    fromLedger: interval.fromLedger ?? null,
    throughLedger: interval.throughLedger ?? null
  })).filter(interval => isClassicAddress(interval.account));
}

function accessRecord({ communityId, configured, authority, source }) {
  return {
    communityId,
    communityName: configured?.communityName || communityId,
    namespace: authority.namespace || configured?.leapNamespace || `${communityId}-LEAP`,
    currentAccount: authority.currentAccount || authority.canonicalCurrentAccount || "",
    source,
    configured: Boolean(configured),
    authorityEstablished: Boolean(authority.authorityEstablished),
    authorityAccounts: [...(authority.accounts || [])],
    authorityIntervals: normalizedIntervals(authority),
    accounts: [...(authority.accounts || [])],
    intervals: normalizedIntervals(authority),
    transitions: [...(authority.transitions || [])],
    establishment: authority.establishment || {
      firstWallet: authority.initialStatement?.account || configured?.operatingWallet || "",
      operatingWallet: authority.initialStatement?.account || configured?.operatingWallet || "",
      ledger: authority.initialStatement?.ledger ?? null,
      txIndex: authority.initialStatement?.txIndex ?? null,
      hash: authority.initialStatement?.hash || "",
      memo: authority.initialStatement?.memo || ""
    }
  };
}

export async function resolveWalletAccess({ account, serverUrl, force = false } = {}) {
  const target = String(account || "").trim();
  if (!isClassicAddress(target)) throw new Error("The connected wallet is not a valid XRPL classic address.");
  if (!serverUrl) throw new Error("XRPL WebSocket server is not configured.");

  const ownerState = await resolveOwnerAuthority({ serverUrl, force });
  if (!ownerState?.authorityEstablished) throw new Error("Canonical Wild Ledger Owner authority is not established on XRPL.");

  const currentOwner = String(ownerState.currentAccount || ownerState.canonicalCurrentAccount || "");
  const registry = window.WILD_LEDGER_COMMUNITY_REGISTRY || {};
  const configuredById = new Map();
  for (const community of Object.values(registry)) {
    const id = backendIdFor(community);
    if (id) configuredById.set(id, community);
  }

  const operatorMatches = [];
  const evaluated = [];
  const provisionedIds = new Set();

  for (const provision of ownerState.provisionedCommunities || []) {
    const communityId = String(provision?.communityId || "").trim().toUpperCase();
    if (!communityId) continue;
    provisionedIds.add(communityId);
    const authority = resolveProvisionedCommunityAuthority(provision);
    const record = accessRecord({
      communityId,
      configured: configuredById.get(communityId) || null,
      authority,
      source: "Owner provisioning"
    });
    evaluated.push(record);
    if (record.currentAccount === target) operatorMatches.push(record);
  }

  for (const community of Object.values(registry)) {
    const communityId = backendIdFor(community);
    if (!communityId || provisionedIds.has(communityId) || community?.directoryTone === "reference") continue;
    const configuredWallet = String(community?.operatingWallet || "").trim();
    if (!isClassicAddress(configuredWallet)) continue;

    const authority = await resolveCommunityAuthority({ community, serverUrl, force });
    if (!authority?.authorityEstablished) continue;
    const record = accessRecord({
      communityId,
      configured: community,
      authority,
      source: "Existing-community canonical authority history"
    });
    evaluated.push(record);
    if (record.currentAccount === target) operatorMatches.push(record);
  }

  return {
    verifiedAccount: target,
    isOwner: currentOwner === target,
    ownerWallet: currentOwner,
    ownerState,
    operatorMatches,
    evaluated,
    resolvedAt: new Date().toISOString()
  };
}
