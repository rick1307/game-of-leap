# Game of LEAP — ZIP review and rules worksheet

Review date: November 18, 2026
Planning revision: 4 — invite-only signup, two addresses, distributor check memo, and lasting onboarding credit confirmed
Source: game-of-leap-main(5).zip, SHA-256 2d6c4bedcd617dbccad5b7f81620bdeb7853e04e0349dc5e2184783168995a7f

## Scope and status

Step 1 (existing-app source review) is complete. This document prepares step 2 (agree and document the rules). Step 2 is not yet signed off. No application files were changed. No repository was accessed. No Basin forms were submitted, wallet transactions signed, or deployments performed. Future changed files will be delivered to Rick for his own repository upload.

This is a review of the ZIP, not verification of the deployed site, live ledger balances, account flags, or external services. Issuer and distribution addresses below are verified as source configuration only. The ZIP cannot establish the current supply or whether future issuance is disabled.

## 1. Existing application

A static HTML and browser-JavaScript site, with no package manifest, bundled test suite, build pipeline, or payout backend in this archive. CNAME specifies gameofleap.com. Main pages are index.html, leaderboard.html, distributionMining.html, and newToCryptos.html.

Configured token:

- Issuer: rh7SidU91xGW2Za5RvoKiCgS2YB2psTBgq
- Distribution account: rnbmFoUKhnMZ8QCJ6kA5J2uwfP8rm9cUdU
- Currency: 4C45415000000000000000000000000000000000
- Read endpoints: wss://s1.ripple.com/ and wss://s2.ripple.com/
- Starter and additional-distribution requests: the same configured Basin form.

The token identifiers are repeated in several files. A shared rules/configuration module should eventually remove that duplication. No need to change these addresses for this redesign unless Rick explicitly chooses otherwise.

### File map

| File | Current responsibility | Redesign implication |
|---|---|---|
| js/leapOnboarding.js | Address checksum validation; validated snapshot; exact 100-LEAP distributor receipt or outstanding check; states player/new/check_pending/invalid/unactivated/unknown | Separate existing-player admission, starter-grant eligibility, new-to-LEAP introduction eligibility, and completed onboarding. These are different questions. |
| js/leapHome.js | Address dialog; status messages; explicit starter request to Basin; session duplicate suppression | Include applicant and inviter addresses in the starter Basin request; update guidance and preserve stale-response cancellation and rechecks. |
| js/leapParticipant.js | Session address and request history; optional legacy P/B/N classifications and 100/200 levels | Preserve address/session helpers; revisit unused legacy fields and numeric levels. Session storage is not authoritative claim accounting. |
| js/leapScore.js | Distributor-based player discovery, receipts, 3+7 scoring, balance reads, cycle resets and pending 200 checks | Major scoring replacement: inviter attribution from distributor check-creation memos, completed player onboarding, downstream conditions, used-point reconstruction. |
| js/leapLeaderboard.js | Admission gate, Xaman TrustSet link, scores, sorting, Basin request for 200 LEAP | Replace eligibility display and request action; retain Basin requests, show pending status, and recognize manually paid rewards from the ledger. |
| index.html | Landing page, old rules, starter dialog, gameplay image | Add the required Inviter’s XRPL address field alongside Your XRPL address for new signup; replace old rules and graphic description. |
| leaderboard.html | Optional payment setup, 100-point meter and 200-LEAP request | New progress counts, mandatory completion guidance, reward list and Claim now. |
| distributionMining.html | Explainer plus inline circulation and holder/player measurements | Update economics and definitions; separate distribution reserve from LEAP in the wild. |
| newToCryptos.html | Xaman setup and general onboarding instructions | Align with final onboarding sequence; wallet-support expansion is not part of this review. |
| README.md and README.txt | Old 100 starter / 200 additional distribution description | Update after rules approval. |
| gameplay.png | Home-page rules graphic | Review and replace artwork before launch; its HTML alt text explicitly describes old rules. Image pixels were not inspected in this review. |
| .well-known/xrp-ledger.toml | Public token identity and icon URL | Preserve unless token metadata intentionally changes. |
| supabase.html | Standalone reachability/WebSocket diagnostic with public client configuration | Not a claim service, database schema, or evidence of an operating application database. |

### Current onboarding behavior

A player enters a public address; there is no wallet-signature login. The app confirms a successful exact 100-LEAP receipt from the distributor, by Payment or CheckCash. That grants leaderboard access regardless of the million-LEAP trust limit. An outstanding qualifying check does not grant access.

The checker has useful safeguards: checksum validation, validated-ledger snapshot, paginated history, transaction-success filtering, actual delivered-amount handling, check expiration handling, account-creation evidence, and a continuous-history coverage check before returning new. Lookup uncertainty becomes unknown rather than new.

However, new currently means no qualifying 100-LEAP distributor onboarding evidence was found. It does NOT mean the wallet has never received LEAP from anyone. That distinction is essential for the new model.

A starter request is posted to Basin. This source does not create or sign the check. Rick has confirmed that he handles fulfillment manually. The redesign retains that manual payment process.

### Current trust-line behavior

The leaderboard reads the player's current LEAP limit. If the limit is not exactly 1,000,000, it offers a Xaman link containing a TrustSet for 1,000,000, with Flags 131072. The interface labels this optional direct-payment setup.

Scoring does not use that exact-million requirement. It finds a recipient's first successful TrustSet with any positive LEAP LimitAmount. Therefore the setup interface and scoring use different thresholds.

### Current scoring behavior

The app discovers players from exact 100-LEAP distributor receipts. Later exact 200-LEAP distributor receipts set a new cycle boundary.

For each distinct recipient first paid by a player after that player's entry:

- Three points for the first qualifying positive LEAP receipt.
- Seven additional points when a positive LEAP TrustSet is found for the recipient, even if that TrustSet predates the player's transfer.
- Repeated transfers to that recipient add no points for that sender.
- The sender, issuer and distributor are excluded as recipients for scoring.
- Prior LEAP ownership from another sender does not disqualify the recipient.
- There is no unique global inviter and no downstream-introduction test.
- Current-cycle points are determined by event times relative to the latest distribution, not a permanent set of individually used onboarding points.

At 100 cycle points, the button submits a Basin form asking for 200 LEAP. It does not sign, submit, or deliver a reward payment. Session flags and outstanding-check detection suppress some repeat requests, but do not coordinate claims across users or devices.

### Current measurements

The circulation total sums positive holdings outside the issuer, INCLUDING the distribution account. Holder count is current positive-balance wallets, not all wallets ever reached. Player count is wallets with an exact 100-LEAP distributor receipt. These definitions must change or be relabeled for the new dashboard.

### Verification performed

- Read all five application JavaScript files and the main HTML pages, README files and token metadata.
- All five standalone JavaScript files passed a Node parsing check.
- Executed isolated synthetic checks against the existing score function: tiny positive transfers score; repeated recipients deduplicate; previously reached recipients still score; an earlier enabled timestamp adds seven points; a later distribution boundary resets cycle points.
- Compared every extracted file byte-for-byte against the ZIP: unchanged.
- No live ledger, network-form, browser interaction, or payout tests were performed. These checks do not certify production behavior.

## 2. Rules already agreed in conversation

1. The game rewards bringing new players on board, not sending gifts. No introductory gift is required. Gifts of any amount neither establish inviter credit nor grant player status. A wallet becomes a player by successfully cashing a 10-LEAP check from the distribution account. An uncashed check or a direct Payment is not a substitute for that check-cashing requirement under the new rule.
2. To complete onboarding and count toward the inviter’s point, the new wallet must BOTH cash the distributor’s 10-LEAP check AND enable payments. Technically, Enable payments sets the LEAP trust-line limit to 1,000,000. There are no partial points. Both requirements also apply to each downstream onboarding used for the five-pass-it-on condition.
3. New signup is invite-only. The applicant supplies their own XRPL address and the inviter’s XRPL address. The inviter recorded in the distributor’s qualifying 10-LEAP check-creation memo receives credit after completed onboarding. This replaces first-transfer attribution. The earlier new-to-LEAP history rule needs a precise boundary under this new flow; do not silently treat that boundary as settled.
4. Each new wallet contributes one lifetime onboarding point to its credited inviter only after both onboarding requirements are complete. Cashing the check alone makes the wallet a player but does not award the inviter a point.
5. Each reward requires ten unused points from ten newly onboarded players. At least five of those players must each have brought another new player through completed onboarding. Sending LEAP alone does not meet either requirement.
6. Passing it on is a condition on an onboarding point, not an additional point for the original inviter.
7. That downstream introduction can earn its own point for the downstream inviter. Example: Alice introduces Bob; Bob introduces Carol. Carol's completed onboarding earns Bob a point and satisfies the passed-it-on condition attached to Alice's Bob point.
8. The game selects points automatically. Extra unused points carry forward. On successful reward payment, ten points become used permanently and cannot count for another reward for that inviter.
9. Claim now enables when qualified. Clicking rechecks eligibility and sends Rick a Basin request. After a confirmed submission, show Request pending. Neither qualification nor submission reserves a reward number or amount.
10. Players may repeat the process. No calendar-based reward release.
11. Display the public reward schedule, cross off completed rewards, show each paid reward recipient’s abbreviated wallet address, highlight the next available reward, and show player progress.
12. A Basin request alone never marks points used. Failed requests or failed payments must not permanently use points. Duplicate requests must not result in duplicate rewards.
13. Rick reviews requests and pays manually. Rick chooses which valid request to handle first. The order Rick pays determines reward order, not the order players qualify or submit requests. Confirmed ledger receipts establish completed rewards.
14. After detecting a confirmed reward receipt, the app marks the selected ten onboarding points used and updates the public payout list. Automatic payment signing and sending are not part of this plan.
15. A completed onboarding remains credited even if the player later changes the trust-line limit or balance. Used points remain used; a later setting change never creates a second lifetime point.
16. The current setup target is exactly 1,000,000. For any other known limit, including zero or 10,000,000, offer Enable payments, which prepares the 1,000,000 setting. This setup prompt does not revoke an already-earned point. A failed lookup is unknown, not proof of a particular limit.

Use the words used and unused for points. Avoid describing points as money being spent. No LEAP is removed from players or introduced wallets when onboarding points are marked used.

## 3. Recommendations awaiting explicit agreement

| Decision | Recommendation |
|---|---|
| Repeat starter requests | The 10-LEAP distributor check and its role in player entry are agreed. The proposed one-starter-grant-per-eligible-wallet restriction and its enforcement remain to be finalized. |
| Existing players | Keep access and holdings; no replacement starter grant; can earn new introduction points. |
| Launch boundary | Count introductions from an announced ledger boundary; no retroactive reward points. |
| Selection | Use five oldest unused passed-it-on points, then five oldest remaining unused points, with a deterministic event-order tie-breaker. |
| Reward economics | Proposed 1,000,000 total including existing issuance; 1,000 rewards; first 1,000; decline 0.16%; round each original-formula reward to two decimals. |

Reward n = round(1000 × 0.9984^(n−1), 2), n=1 through 1000. Total rewards: 498,976.23 LEAP. Last: 201.96 LEAP. Outside rewards: 501,023.77 LEAP, BEFORE subtracting already-issued tokens or other allocations. Actual prior issuance remains unverified.

These recommendations must not silently become approved implementation requirements.

## 4. Decisions surfaced by the ZIP review

### Agreed player entry and completed onboarding

This replaces the earlier recommendation to grant player access from a gift plus a trust-line setting. The distributor’s 10-LEAP check is required for new player entry; it is not an optional, separate grant.

| Wallet state | Player under the new entry rule? | Inviter’s onboarding point earned? |
|---|---|---|
| Received a gift from another player only | No | No |
| Distributor’s 10-LEAP check issued but not cashed | No | No |
| Cashed the distributor’s 10-LEAP check, but has not enabled payments | Yes | No |
| Cashed the distributor’s 10-LEAP check and enabled payments | Yes | One point, provided new-wallet and inviter-credit requirements are satisfied |

A gift plus Enable payments without cashing the distributor’s 10-LEAP check is also insufficient. The same completed-onboarding requirements apply to downstream wallets. Existing players admitted under the old 100-LEAP model still need the separate migration decision listed above; do not silently lock them out or require another starter grant.

### Agreed website wording

Use these plain-language steps on the website:

1. **Cash your 10 LEAP check.**
2. **Enable payments.**

Use **Enable payments** for the action label and player instructions. Keep TrustSet and the 1,000,000 LEAP trust-line limit in technical documentation and code instead of using those terms to explain the steps to players. The million is a limit, not a balance players need to hold.

One completed onboarding earns one point. Do not bring forward the old three-points-plus-seven-points model or award partial points for just one step.

### Agreed invite-only signup and invitation record

The normal onboarding path is an invitation to join through the app. The inviter does not need to send a gift or teach the applicant to create a trust line manually.

1. Keep the existing applicant field, labeled **Your XRPL address**.
2. Add a second required field for new signup, labeled **Inviter’s XRPL address**.
3. Send both addresses in the starter Basin request. Rick must be able to tell the addresses apart and copy the inviter’s address easily.
4. Rick issues the 10-LEAP check from the distribution account to the applicant’s address.
5. Rick puts the inviter’s XRPL address in the memo of the transaction that creates the check.
6. The applicant cashes the check and becomes a player.
7. The player completes Enable payments. The inviter then receives one onboarding point, subject to the finalized new-player eligibility rules.

The ledger invitation record is the memo on the distributor’s check-creation transaction. Match the successful cashing to that original check by its check identifier. Do not expect the cashing transaction to repeat the memo, and do not accept arbitrary memos or checks from other senders as invitation evidence. The intended starter-check memo content is the inviter’s XRPL address.

No invite-link system is required. The first sender of a gift does not determine credit. The distribution account sends the starter check but is not thereby the inviter; credit follows the inviter named in that check’s memo.

The two fields apply to new signup. Do not require existing players to submit a fresh inviter every time they look up their progress. Existing-player access and the initial seed players remain a separate migration decision.

### Invitation implementation details still to settle

- Define the precise new-player/new-to-LEAP cutoff. Earlier discussion required never having received LEAP before introduction. Now the introduction is recorded on a distributor check, not a first gift; specify how to handle wallets with earlier gifts without silently dropping or extending that rule.
- Define what makes an inviter eligible, how to validate both addresses, and how to reject self-invitations or invalid inviter references.
- Define treatment of missing or malformed memos, cancelled or replacement starter checks, and conflicting duplicate checks so one player can never create multiple lifetime onboarding points.
- Verify the manual wallet memo entry and decoding format during implementation. The agreed content is the inviter address; the exact encoding is not yet specified.
- Agree the initial-player exception so existing players can invite people without a new starter check.

### Current setup versus lasting credit

Exactly 1,000,000 is the setup target. If the known current limit is anything else, show Enable payments. The button prepares the required setting for the player; the player does not choose a number in the game interface.

Once completed onboarding has earned an inviter a point, the point remains credited even if the introduced player later changes the limit or sends away LEAP. Current setup guidance and historical point credit are separate. A later successful setup does not award another point for the same introduced player.

### Agreed request and manual payment flow

This replaces the earlier proposal for an automatic claim-and-payment service. Keep Basin. No automatic payout service or distribution-wallet signer is required in the app.

1. The app checks the player’s unused onboarding points and passed-it-on conditions.
2. When the player qualifies, the app enables Claim now.
3. Clicking the button rechecks eligibility and sends a Basin request to Rick.
4. After Basin confirms submission, show Request pending. This means the request was sent and the player is waiting for Rick to handle it.
5. Rick reviews the request and checks that the player still has the required unused points before paying.
6. Rick sends the next available reward manually. Rick chooses which valid request to handle first.
7. When the app detects the confirmed reward receipt on the ledger, the app marks the selected ten points used, crosses off the reward, and shows the recipient’s abbreviated wallet address.
8. Any extra unused points remain available toward another reward.

Example: Alice and Bob both send requests. Rick handles Alice first and pays reward 1 to Alice. Rick then handles Bob and pays reward 2 to Bob. Alice’s earlier qualification or Bob’s earlier button click would not reserve a different position. The public list shows Alice’s shortened wallet next to reward 1 and Bob’s next to reward 2.

| Reward | Display after payment | Recipient |
|---|---|---|
| 1 | Crossed off as paid | Alice’s abbreviated wallet address |
| 2 | Crossed off as paid | Bob’s abbreviated wallet address |
| 3 | Next available | Not paid yet |

This example illustrates display and order only; the proposed reward amounts remain subject to approval. Abbreviated addresses follow the leaderboard style and do not make public ledger activity private.

### Details still to design for manual fulfillment

These are implementation questions, not changes to the agreed flow:

- How a confirmed distribution transaction identifies its reward number and the ten onboarding points used. Do not assume amount alone proves a reward claim. Choose a simple, reliable manual-payment convention and deterministic point accounting.
- Whether rewards use direct Payments or Checks. If Checks are used, define how an issued but uncashed Check affects the next available reward; issuing a Check is not receipt of LEAP. This choice is still open.
- What eligibility evidence accompanies the Basin request so Rick can review it easily. No request field supplied by a browser should be treated as proof without verification.
- How Request pending survives reloads, new browser sessions or devices, and how rejected or stale requests are cleared. Existing session-only flags cannot establish a durable shared request queue. Basin requests are not on the ledger.
- How repeat submissions and interrupted requests are handled without duplicate fulfillment. A timed-out submission may still have reached Basin. A payment with an uncertain result must be checked before Rick retries it.
- Whether a request needs wallet proof or may be submitted for an eligible address while always paying that same eligible address. Address entry currently proves no ownership.

The preference for no application database remains. Manual fulfillment removes the need for an automatic payment coordinator, but ledger-derived used-point records and pending-request handling still need a concrete design. No distribution-wallet secrets belong in the website.

### Evidence and performance

Onboarding's continuous-history check is stronger than scoring's: scoring checks account creation and range endpoints but does not inspect continuous server coverage. Reuse the stronger behavior. Never turn missing history into new-wallet eligibility.

The old scorer loads distributor history, then every player's history and each recipient's history sequentially. One missing recipient history can fail the whole leaderboard. Adding downstream traversal increases this work. Plan bounded lookups and reusable, verifiable caches; distinguish selected-player eligibility from full public rankings.

The existing receipt parser covers Payment and CheckCash. A never-received-LEAP rule needs an explicit policy for other balance-changing ledger operations. Do not assume absence from those two transaction types alone proves a wallet has never held LEAP.

### Supply and measurements

A displayed constant does not establish a fixed ledger supply. Read-only ledger verification of actual balances and issuer settings is a separate next action, not completed here. No issuance, account-setting change, or irreversible issuer action is authorized by this review.

Define separately: total outstanding supply, distribution reserve, current LEAP in the wild (excluding reserve), wallets ever reached, fully onboarded wallets, and rewards paid. Do not label current positive holders as all wallets ever reached.

## 5. File delivery plan

This revision updates the planning document only. It records the agreed manual Basin request/payment flow, fulfillment order, pending status, public payout recipients, required 10-LEAP check for player entry, completed-onboarding point requirement, Enable payments website wording, two-address signup, inviter attribution from the distributor check memo, and lasting onboarding credit. Other proposed rules remain clearly marked as awaiting agreement. The extracted application remains identical to the supplied ZIP.

Step 2: agree the open rule choices, then produce a versioned rules document with examples and acceptance criteria. A shared runtime configuration file can follow when values and eligibility definitions are settled; it must not partially change the live old model.

Step 3, a later session: implement revised starter onboarding and deliver only the changed/new files with exact relative paths and an upload checklist. Continue the remaining numbered implementation stages after that. Rick uploads changes to his repository; do not access or update it on his behalf.

## 6. Upload instructions and next discussion

Upload this file as `docs/LEAP-Step-1-Review-and-Step-2-Rules.md` in the repository (create the docs folder if needed). If the earlier version was already uploaded elsewhere, replace that copy instead of keeping two conflicting plans.

This is an internal planning document, not new live-site behavior. No JavaScript, HTML, README, images, or deployment settings are included in this update.

Next, discuss one open rule at a time. Player entry and completed onboarding are now settled above. Inviter attribution is now settled: use the inviter address in the distributor’s 10-LEAP check-creation memo. A suggested next topic is how existing players become the first inviters under the new model. Step 2 remains in progress; step 3 is reserved for a later session.
