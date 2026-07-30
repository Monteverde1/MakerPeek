# Verification report (template)

> **Status:** Awaiting manual Phase 2 results.  
> Fill this in after completing `MANUAL_TEST.md` on ≥5 stores from `test-stores.json`.

---

## 1. Stores tested

| Store | Group | Date | Tester |
|-------|-------|------|--------|
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |

---

## 2. Pass rate by feature category

| Category | Pass | Fail | Skip | Notes |
|----------|------|------|------|-------|
| Overview | /5 | | | |
| Activity | /5 | | | |
| Store maturity | /5 | | | |
| Store profile | /5 | | | |
| App stack | /5 | | | |
| Verifiability (ⓘ) | /5 | | | |
| Pro gating | /5 | | | |
| Change monitoring | /5 | | | |
| Watchlist | /5 | | | |

---

## 3. Confirmed bugs (live test only)

| ID | File:line | Reproduction | Severity |
|----|-----------|--------------|----------|
| | | | |

---

## 4. Landing page claims NOT backed by extension

_From static audit (`CODE_MAP.md`) — confirm or overturn with live tests._

| Claim | Static audit finding | Live test result |
|-------|---------------------|------------------|
| Change monitoring is Pro-only | Diff renders for all users (`overlay.js:2257-2273`) | |
| 6th store blocked / upsell | No block in `fetchAndRender`; counter only | |
| Price histogram / pricing patterns / variant breakdown (Pro) | Computed, not rendered | N/A |
| Full product list + CSV (Pro) | Not mounted in panel | N/A |
| Collections | Not in codebase | N/A |
| Daily reset at local midnight | Uses UTC (`background.js:214-216`) | |

_Add rows for any new mismatches found in manual testing._

---

## 5. Decision

- [ ] **Ship as-is** — claims match behavior; only minor copy fixes
- [ ] **Fix and ship** — gating or metric bugs must be resolved first
- [ ] **Pull from landing page** — remove or soften claims that code does not support

**Rationale:**

<free text after manual phase>

---

## 6. Phase 1 static audit summary (pre-filled)

Completed without live Chrome testing. See `CODE_MAP.md` for full file:line map.

**High-priority flags before manual run:**

1. **Change monitoring vs Pro** — Landing/marketing positions change monitoring as Pro; panel "Changes since last visit" is built for every user when snapshots run.
2. **5/day enforcement** — Counter increments; panel may still load on 6th view (verify live).
3. **Several Pro features in older docs** (histogram, CSV, collections) are **not in the current panel UI**.

Manual testing should treat `CODE_MAP.md` methodology caveats as the source of truth when comparing to raw `/products.json`.
