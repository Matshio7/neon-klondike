# Neon Klondike — Meta-Progression Design (v1)

*Scope: medium. Two persistent systems built on one currency — **Decks** (starting-condition modifiers) and a **between-runs meta-shop** — wired into the existing `neon-klondike.html`. Designed to be additive: nothing currently in the game is removed or nerfed.*

---

## 1. The problem this solves

Today the game has the *infrastructure* for meta-progression but no actual loop. `Store` persists `bestAnte`, `bossesBeaten`, and 13 achievements — but all of it only **records** history. Every run starts identical: ante 1, 4 coins, no perks, the same 7-perk `POOL`. The achievements unlock nothing.

The fix is a single **feed-forward loop**: runs pay out a persistent currency, the currency buys permanent unlocks, and the unlocks change how the *next* run starts. Decks are the headline unlock; the meta-shop is the spine that also expands the perk pool and sells cosmetics.

---

## 2. Design principles (guardrails)

These keep a 755-line score-attack game from turning into a grind treadmill:

**Sideways, not vertical.** The meta-shop sells *options and variety*, not flat power. Every deck is a **tradeoff** (each buff carries a cost), so unlocking content widens the strategy space without making a fresh save objectively weaker. This protects score comparisons.

**The Standard deck stays fully viable.** A new player with zero unlocks must be able to reach high antes. Unlocks are alternatives, not catch-up crutches.

**Losing runs are productive.** VOLT is earned from *progress* (antes reached, bosses beaten), paid out on game-over too — so a failed run still moves the meta forward. This is the single most important feel-good lever.

**Anti-grind pacing.** First deck affordable in ~2–3 runs; the full roster over ~20–30 runs. Early achievements front-load a windfall so the first unlock comes fast.

---

## 3. The currency — VOLT (⚡)

A persistent currency, distinct from in-run **COINS** (◉, resets each run) and per-round **CHIPS**. Suggested name **VOLT** (fits the neon theme, reads fine in the German UI). Stored in `Store.data.meta.volt`.

### Earned at the end of every run (win *or* loss)

| Source | VOLT |
|---|---|
| Highest ante reached | +1 per ante |
| Boss defeated this run | +3 each |
| Board fully cleared this run | +1 each |
| First-time achievement bounty | one-off, see §6 |

A typical early run (ante 3, 1 boss, 1 clear) pays **~7 VOLT**; a strong run (ante 8, 2 bosses, 3 clears) pays **~17 VOLT**. The game-over screen already renders stats — add one line: `+N ⚡ VERDIENT`.

---

## 4. Decks (primary unlock)

A deck is a **starting-condition modifier** applied in `newRun()` / `newRound()`. Because perks already hook into scoring, most decks are a handful of lines. The player selects a deck in the meta-hub; `newRun()` reads `Store.data.meta.selectedDeck` and applies it.

### Deck schema

```js
{
  id:'highroller', name:'HIGH ROLLER', desc:'+6 START COINS · ALLE ZIELE +15%',
  coins:10,            // starting coins (default 4)
  recDelta:0,          // +/- recycles per round (default 0)
  baseMult:1,          // starting base mult (default 1)
  startPerks:[],       // perk ids granted free at run start
  targetMul:1.15,      // every target ×N (default 1)
  rewardDelta:0,       // +/- to the base-3 round reward (default 0)
  noReroll:false,      // disable shop reroll
  freeReroll:false,    // one free reroll per shop
  bossEveryAnte:false, // boss every ante instead of every 3rd
  cardMods:null,       // optional scoring tweaks, e.g. {red:+6, black:-2}
  unlockCost:20,       // VOLT price (0 = default/free)
  unlockVia:null       // optional achievement id that unlocks it instead
}
```

### Launch roster

| Deck | Effect (buff / cost) | Unlock |
|---|---|---|
| **Standard** (Standard) | Baseline: 4 coins, 2 recycles, ×1 mult | Free |
| **High Roller** (Großverdiener) | +6 start coins **/** all targets +15% | 20 ⚡ |
| **Marathon** (Marathon) | +1 recycle every round **/** base reward −1 | 20 ⚡ |
| **Combo** (Kombo) | Start owning the COMBO perk **/** only 2 start coins | 25 ⚡ |
| **Founders** (Fundament) | Foundation cards +5 chips baked in **/** no shop reroll | 28 ⚡ |
| **Red Heat** (Rotglut) | Red cards +6 chips **/** black cards −2 chips | 30 ⚡ |
| **Glass Cannon** (Glaskanone) | Base mult starts ×1.5 **/** only 1 recycle | 35 ⚡ |
| **Minimalist** (Minimalist) | 5 coins + free reroll each shop **/** targets +25%, 1 recycle | 40 ⚡ |
| **Boss Rush** (Boss-Sturm) | Boss every ante; ×2 boss bounty & ×2 boss VOLT | Achievement `allboss` |

Every deck pulls only on values that already exist (`G.coins`, `G.rec`/`recBase()`, `baseMult()`, `target()`, `G.perks`, the reroll button, boss frequency, `chipsFor()`), so none requires new core systems.

---

## 5. The meta-shop / hub

A new scene (`scene-meta`) reached from the main menu via a **"WERKSTATT"** (workshop) button. It shows the VOLT balance and three tabs:

**Decks** — a gallery of the roster above; locked decks show price, owned decks are selectable. Selecting sets `meta.selectedDeck`; the menu's START button launches with it.

**Perks** — permanent, *additive* expansions to the run's `POOL` (see §5.1). The current 7 perks stay unlocked from the start; these are brand-new options layered on top.

**Themes** *(cosmetic VOLT sink, optional)* — alternate neon palettes via the existing CSS variables and the CRT toggle. Pure long-tail spend, zero balance impact: e.g. `AMBER`, `VAPOR`, `MONO`, 10–15 ⚡ each.

### 5.1 Unlockable perks (additive to `POOL`)

| Perk | Effect | Unlock |
|---|---|---|
| **SUIT BONUS** | First card of each suit banked +20 chips | 12 ⚡ |
| **HOT STREAK** | Every 3rd bank +0.3 mult (per round) | 15 ⚡ |
| **OVERFLOW** | Chips over target → +1 coin per 25 overshoot | 15 ⚡ |
| **DOUBLE DOWN** | Kings banked +15 chips | 12 ⚡ |
| **SCOUT** | Shop shows 4 offers instead of 3 | 18 ⚡ |

Once bought, a perk's id joins `meta.perksUnlocked` and becomes eligible to appear in any future run's shop — widening build variety without buffing the starting state.

---

## 6. Achievements, repurposed

The 13 existing achievements keep their badges but gain two jobs: a **one-off VOLT bounty** (paid the first time each fires, tracked in `meta.paidAch`) and, for two of them, a **direct unlock**.

| Achievement | VOLT | Also unlocks |
|---|---|---|
| `first_bank` | 2 | — |
| `clear_board` | 5 | — |
| `boss1` | 8 | — |
| `allboss` | 15 | **Boss Rush** deck |
| `ante3` | 5 | — |
| `ante5` | 10 | — |
| `ante8` | 20 | `AMBER` theme (prestige) |
| `chips500` | 8 | — |
| `chips1000` | 15 | — |
| `perks5` | 8 | — |
| `mult5` | 8 | — |
| `coins20` | 5 | — |
| `runs10` | 10 | — |

That's ~119 ⚡ spread across natural play — most of it in the first several runs, which funds the first deck or two without any deliberate grinding.

---

## 7. Data model

All additions live under one new key so a reset is trivial and old saves migrate cleanly via `Object.assign` defaults.

```js
// inside Store._defaults(), alongside d.stats / d.ach / d.opts:
d.meta = Object.assign({
  volt: 0,
  selectedDeck: 'standard',
  decksUnlocked: ['standard'],
  perksUnlocked: ['plus5','red','ten','fever','streak','ace','rec'], // current 7 stay free
  paidAch: [],            // achievement ids already paid out in VOLT
  themesUnlocked: ['neon'],
  selectedTheme: 'neon'
}, d.meta || {});
```

`Store.reset()` already preserves `opts`; extend it to also wipe `meta` (or keep a "reset progress" that clears `meta` too — your existing reset button copy already promises to clear records).

---

## 8. Code hooks — what changes where

Everything maps onto functions that already exist:

| Existing function | Change |
|---|---|
| `Store._defaults()` | Add the `d.meta` block above. |
| `newRun()` | Before `newRound()`, call `applyDeck(DECKS[meta.selectedDeck])` to seed `G.coins`, `G.perks`, `G.deck` (the active modifier object). |
| `newRound()` | After computing `G.target`/`G.rec`, apply `G.deck`: `G.target = Math.round(G.target*deck.targetMul/5)*5`, `G.rec += deck.recDelta`, boss-every-ante if `deck.bossEveryAnte`. |
| `recBase()` / `baseMult()` | Add the deck's `recDelta` / `baseMult` start value. |
| `chipsFor(c)` | Add a `G.deck.cardMods` branch (Red Heat) and check `meta.perksUnlocked` membership is irrelevant here — the perk only needs to be *owned in-run*, which the shop already gates. |
| `openShop()` | Filter the offer pool to perks in `meta.perksUnlocked`; honor `deck.noReroll` / `deck.freeReroll`; `SCOUT` → 4 offers. |
| `roundClear()` | Apply `deck.rewardDelta` and the `×2` boss bounty for Boss Rush. |
| `gameOver()` | Compute VOLT (`ante + 3·bosses + clears + boss-rush bonus`) via `awardVolt()`, add to `meta.volt`, `Store.save()`, surface `+N ⚡` on the game-over screen. *(Runs end only here today — there is no run-win terminus; if you add an ante cap later, award there too.)* |
| `evalAch()` | When an achievement first fires, pay its bounty if not in `meta.paidAch`, push the id, and apply any `unlockVia` deck/theme. |
| Scene manager + menu | Add `scene-meta` and a `WERKSTATT` button; render deck/perk/theme tabs; wire buy + select handlers (mirrors the existing `openShop`/`buy` pattern). |

### Sketch — applying a deck

```js
function applyDeck(deck){
  G.deck = deck;
  G.coins = deck.coins ?? 4;
  G.perks = (deck.startPerks || []).slice();
}
// recBase/baseMult read G.deck:
function recBase(){ return 2 + (G.perks.includes('rec')?1:0) + (G.deck?.recDelta||0); }
function baseMult(){ return (G.deck?.baseMult||1) + (G.perks.includes('fever')?0.5:0); }
```

### Sketch — VOLT at run end

```js
function awardVolt(){
  const bosses = G.history.filter(h=>h.boss && !h.failed).length;
  const clears = G.history.filter(h=>h.cleared).length;
  let v = G.ante + 3*bosses + clears;
  if (G.deck?.id==='bossrush') v += 3*bosses;       // ×2 boss VOLT
  Store.data.meta.volt += v;
  RUN.voltEarned = v;
  Store.save();
}
```

---

## 9. Economy at a glance

| | Value |
|---|---|
| Early run payout (ante 3, 1 boss, 1 clear) | ~7 ⚡ |
| Strong run payout (ante 8, 2 bosses, 3 clears) | ~17 ⚡ |
| Achievement windfall (lifetime, front-loaded) | ~119 ⚡ |
| First deck | 20 ⚡ → ~2–3 runs |
| Full deck roster (7 paid + Standard free + Boss Rush via ach) | ~198 ⚡ |
| All unlockable perks | ~72 ⚡ |
| Everything incl. themes | ~300 ⚡ → ~20–30 runs |

Numbers are first-pass; tune the `unlockCost` table after a play session. The lever that matters most is the **per-ante VOLT rate** (currently +1) — nudge it before touching prices.

---

## 10. Build order (suggested phases)

1. **Currency plumbing.** Add `d.meta`, `awardVolt()` in `gameOver()` (the sole run terminus today), and the `+N ⚡` game-over line. Ship it — VOLT accumulates with nothing to spend yet. Verifies persistence end-to-end.
2. **Deck engine + 3 decks.** `DECKS` table, `applyDeck()`, hooks in `newRun`/`newRound`. Ship Standard + High Roller + Marathon, selectable from a minimal menu list.
3. **Meta-hub scene.** The `WERKSTATT` screen, deck gallery, buy/select with VOLT. Add the rest of the roster.
4. **Perk-pool expansion.** `meta.perksUnlocked` filter in `openShop()`, the 5 new perks, the Perks tab.
5. **Achievement payouts + unlocks.** Bounty table, `paidAch`, `unlockVia` for Boss Rush / prestige theme.
6. *(Cosmetic)* **Themes** tab as a VOLT sink.

Each phase is independently shippable and testable.

---

## 11. Future hook — Stakes (out of scope for v1)

When you want endgame replay: after reaching ante 8 (or clearing the run), unlock stacking **difficulty tiers** — faster target scaling, tougher/earlier bosses, reduced interest — each clear unlocking the next plus a VOLT premium. This is the right home for *vertical* challenge, kept opt-in so default high-score runs stay comparable. If online leaderboards ever land, **segment by deck and stake**, since both change scoring.

---

*Open tuning questions for after a playtest: is +1 VOLT/ante too slow once players own most decks? Should Boss Rush also raise the target, or is doubling boss frequency enough pressure? Should themes be VOLT-bought or purely achievement rewards to keep VOLT focused on gameplay unlocks?*
