# BACKLOG — Ticket-Details

> Status wird **nicht hier**, sondern im Index in `AGENTS.md` (Abschnitt 4) gepflegt.
> Hier stehen nur die Details (Ziel / Umsetzung / Fertig-wenn) als Referenz.
> Code-Anker beziehen sich auf `game.js` (nach Funktionsnamen suchen, nicht Zeilennummern).

> **v0.8.0-Scope (großes Update):** BL-3 + BL-4 + BL-15 (Shop-Trio, gleiche Dateien → EIN Branch nacheinander) und BL-5 (Boss, separater Bereich → eigener Branch parallel). BL-14 (Joker) zuerst nach main mergen, dann von dort branchen.

---

**BL-1 · Seedbarer Zufall (Fundament)**
- **Ziel:** Deterministischer Zufall — gleicher Seed ⇒ identischer Run (Basis für BL-2 & „Seed teilen").
- **Umsetzung:** mulberry32-RNG ergänzen: `function mkRng(s){return function(){s|=0;s=s+0x6D2B79F5|0;var t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}` + simple String-Hash. Globales `let RNG=Math.random;` und `function rseed(x){RNG=mkRng(hash(String(x)));}`. Dann **alle spielrelevanten `Math.random()` durch `RNG()` ersetzen**: `shuffle()`, Boss-Wahl in `newRound()`, Special-Offer in `roundClear()`, `reroll()`. (Den Audio-Zufall im `Music`-Objekt NICHT anfassen.) `G.seed` in `newRun()` setzen und in `snapRun()/restoreRun()` mitspeichern (Resume = gleicher Lauf).
- **Fertig wenn:** Zwei Runs mit gleichem Seed liefern identische Karten/Bosse/Shop-Angebote; Seed in der Game-Over-Ansicht sichtbar; `node --check` ok.

**BL-2 · Tages-Challenge + Tagesrangliste** *(braucht BL-1)*
- **Ziel:** Täglich fester Seed für alle ⇒ faire, kompetitive Rangliste + Wiederkehr-Grund. (Ersetzt das alte „Rangliste-Zeitfilter"-Item.)
- **Umsetzung:** Menübutton `data-go="daily"` → `rseed(heuteYYYYMMDD)`, `newRun()` mit `G.daily=datum`. Optional 1 Versuch/Tag via `Store.data.meta.dailyDone`. **Backend** (Muster: bestehende `kl_*`): Tabelle `daily_scores(day date, username, best_ante, best_chips, updated_at, primary key(day,username))`, RLS-locked; RPCs `kl_daily_submit(p_day,p_username,p_ante,p_chips)` (nur verbessern) + `kl_daily_board(p_day,p_limit)`, security definer, an `anon` granten. Client: am Daily-Run-Ende `clRpc('kl_daily_submit',…)`; im Rangliste-Screen Umschalter „Gesamt | Heute".
- **Fertig wenn:** Zwei Geräte spielen am selben Tag denselben Run; Tages-Board stimmt; keine Codes preisgegeben.

**BL-3 · Einmal-Karten / Verbrauchsgegenstände**
- **Ziel:** Taktische One-Shot-Items im Run (Balatro-„Tarot"-Prinzip).
- **Umsetzung:** Array `CONSUMABLES=[{id,name,desc,price,fn}]` (analog `POOL`/`SPECIALS`). Beispiele: `umfaerben` (Farbe einer gewählten Karte ändern), `funke` (+1.0 Mult diese Runde), `spaehen` (nächste 5 Stock-Karten zeigen), `bossbrecher` (Boss-Regel diese Ante aus), `neumischen`. Bestand `G.items=[]` (max. 2 Slots), in `snapRun/restoreRun` persistieren. Im `renderShop()` eine Zeile „Gegenstände" + `buyItem(i)` (analog `buySpecial`). Eigene Items in Topbar/Items-Ansicht mit Tap→`useItem(id)` (ruft `fn`, entfernt Item). Karten-Auswahl über vorhandenes `G.sel`.
- **Fertig wenn:** kaufbar, einsetzbar, Effekt wirkt, wird verbraucht, übersteht Resume; `node --check` ok.

**BL-4 · Perk-Seltenheitsstufen + Synergien**
- **Ziel:** Build-Identität durch Raritäten + comboende Perks. (Ersetzt „mehr multiplikative Perks".)
- **Umsetzung:** `POOL`-Einträge um `rarity:'common'|'selten'|'legendär'` (+ optional `tags:['herz','zahl',…]`) erweitern. Shop-Auswahl (`openShop`/`reroll`) gewichten (z.B. 70/25/5). Optik: CSS-Klassen `.perk-selten`/`.perk-legendaer` (Rahmen/Glow). Mind. 3 neue multiplikative Synergie-Perks (z.B. „Herz-Motor: +0,3 Mult je gebankter Herz-Karte diese Runde").
- **Fertig wenn:** Raritäten sichtbar & gewichtet; neue Perks funktionieren; grob balanciert.

**BL-5 · Boss-Vorschau + Endboss + mehr Bosse**
- **Ziel:** Planbarkeit + Höhepunkt. (Ersetzt „mehr Boss-Typen".)
- **Umsetzung:** Boss-Regel VOR der Boss-Ante anzeigen (im Shop-/Übergang bzw. via `#bossstrip`-Text in `newRound()`: „Nächste Ante: BOSS — <Regel>"). Bei `G.ante===8` einen härteren **Endboss** (eigener `BOSSES`-Eintrag oder Sonderfall). 2–3 neue Regeln in `BOSSES` (z.B. „eine Farbe doppelt, eine zählt 0", „Foundation braucht 2 Durchgänge").
- **Fertig wenn:** Vorschau sichtbar; Ante-8-Boss greift; neue Bosse laufen.

**BL-6 · Mehr „Juice"**
- **Ziel:** Befriedigenderes Game-Feel.
- **Umsetzung:** Score-Pops beim Banking mit Mult skalieren, Combo-Zähler-Visual; leichter Screen-Shake bei großem Mult (CSS-Klasse kurz togglen); Sound-Layer bei Bank-Serien (`SFX` erweitern); Mobile-Haptik `navigator.vibrate(...)` beim Banking/Sieg. In Options abschaltbar; `prefers-reduced-motion` respektieren.
- **Fertig wenn:** spürbares Feedback, abschaltbar.

**BL-7 · Anti-Cheat / Plausibilität (Backend)**
- **Ziel:** Offensichtlich gefälschte Scores aus der Rangliste halten (Scores kommen vom Client!).
- **Umsetzung:** In `kl_save` (und `kl_daily_submit`) serverseitig Grenzen prüfen: `bestAnte` ≤ sinnvolles Maximum, `bestRunChips` plausibel zur Ante; bei Verstoß kappen/abweisen. Hinweis: rein clientseitige Spiele sind nie 100% sicher — Ziel ist „grober Unfug raus".
- **Fertig wenn:** unrealistische Werte erscheinen nicht mehr im Board.

**BL-8 · Run-Historie & Statistik-Screen**
- **Ziel:** Vergangene Runs einsehen.
- **Umsetzung:** Bei Game Over Zusammenfassung in `Store.data.history` (Ring-Puffer, letzte ~20: `{date,seed,ante,chips,deck,win}`). Neue Szene `scene-history` + `renderHistory()` (Muster: `renderNews`/`renderRang`) + Menübutton.
- **Fertig wenn:** Historie gespeichert & angezeigt, mit Seed pro Eintrag (nachspielbar via BL-1).

**BL-9 · Barrierefreiheit**
- **Ziel:** Lesbarkeit/Inklusion.
- **Umsetzung:** Farbenblind-Modus (Rang/Buchstabe + Symbol deutlicher, nicht nur Farbe) als Options-Toggle; „Große Karten"-Option (Kartengröße unabhängig vom UI-Scale). In `Store.data.opts` persistieren.
- **Fertig wenn:** Toggles in Options wirken & bleiben erhalten.

**BL-10 · Deal-3-Modus + echter Stock/Waste-Fächer**
- **Ziel:** Näher am echten Klondike, mehr Varianz.
- **Umsetzung:** Option oder Deck-Variante: beim Stock-Ziehen 3 Karten aufdecken (nur oberste spielbar), Waste als Fächer zeigen. Betrifft Stock/Waste-Zug- und Render-Logik sowie Recycle-Zählung.
- **Fertig wenn:** umschaltbar, Regeln korrekt, kurzer Tutorial-Hinweis.

**BL-11 · In-App-Ankündigungen / Update-Benachrichtigungen**
- **Ziel:** Mats kann Spieler über wichtige Updates (z.B. „Großes Update v0.8") informieren, ohne sofort implementieren zu müssen.
- **Umsetzung (Vorschlag):** Supabase-Tabelle `announcements(id, message, active, min_version, max_version, created_at, dismiss_days)` + RPC `kl_announcement(p_version text)`. Client ruft beim Start/Hauptmenü auf und zeigt Banner/Modal, wenn eine aktive Nachricht noch nicht dismissed wurde. `localStorage` merkt sich zuletzt gesehene/dismissed ID. Optional später Erweiterung zu echten Web-Push-Benachrichtigungen (erfordert Service-Worker-Push, VAPID-Keys, iOS-Berechtigungen).
- **Fertig wenn:** Aktive Ankündigung erscheint beim App-Start; Spieler kann sie dismissen; ohne Backend-Deploy änderbar.

**BL-12 · Soundeffekte** *(erledigt — Referenz)*
- **Ziel:** Audio-Feedback für Spielaktionen.
- **Umsetzung:** MP3-Dateien in `sfx/`; `SFX.preload()` + `SFX.play(name)` mit Fallback auf Synthesizer; Trigger an Stock, Tab-Move, Shop, Undo, ungültiger Aktion, Achievement, Game Over.

**BL-14 · Joker/Spezialkarten-Rebalance** *(v0.8.0)*
- **Ziel:** Spezialkarten einlösen statt Rang-Slot belegen; kein Stacking; Boss-Integration.

**BL-22 · Leaderboard-Submit für abgebrochene/backgrounded Läufe** *(erledigt — 23.06.2026)*
- **Problem:** `kl_submit` wurde nur in `finalizeRun()` aufgerufen (Game-Over + Sieg→Menü). Verlässt ein Spieler per Home-Button, App-Background oder Reload, fehlt der Board-Eintrag trotz aktivem Cloud-Save. Real beobachtet: „SunnyBunny", 10 Runs, Beste-Ante 6, 0 Board-Zeilen.
- **Umsetzung:** `submitScore(beacon)` Helper nahe `finalizeRun()`: no-op wenn kein aktiver Run / ante<1 / kein cloudName; `RUN.lastSubmittedAnte` verhindert Doppelsendugen; `keepalive:true` bei `beacon=true` für pagehide/visibilitychange. Aufrufpunkte: `finalizeRun()` (ersetzt inline-clRpc), `act==='next'` (Ante-Aufstieg), `homebtn`-Handler, `document.visibilitychange` (hidden), `window.pagehide`. Server-seitige Dedup bleibt unberührt.
- **Fertig:** Run per Home-Button verlassen → Board-Eintrag; mobile Hintergrundwechsel → Board-Eintrag. Keine Supabase-Änderung nötig.

**BL-15 · Vouchers / permanente Shop-Upgrades** *(v0.8.0)*
- **Ziel:** Dauerhafte, run-weite Upgrades als strategische Coin-Senke (Balatro-Vouchers).
- **Umsetzung:** Array `VOUCHERS=[{id,name,desc,price,...}]`, z.B. `rerollcut` (Reroll-Kosten −1 / +1 Slot), `interestcap` (Zins-Limit +3), `perkslot` (Shop zeigt 4 statt 3 Perks), `discount` (alle Perks −1 Coin), `recycle` (+1 Recycle/Runde dauerhaft). Bestand `G.vouchers=[]` (in `snapRun`/`restoreRun` persistieren). In `renderShop()` eine eigene „UPGRADES"-Reihe mit `buyVoucher(id)` (analog `buy`/`buySpecial`), jedes Voucher nur 1× kaufbar. Effekte auslesen an: `openShop`/`reroll` (Slots/Kosten/Perk-Anzahl), Zins-Cap in `roundClear`, `recBase()` (Recycle). Pro Shop 1 Voucher anbieten (RNG aus noch nicht besessenen). Mit BL-4 abstimmen (beide ändern `openShop`/`renderShop`) → im selben Branch nacheinander bauen.
- **Fertig wenn:** Voucher kaufbar, Effekt wirkt dauerhaft im Run, übersteht Resume, nur 1× kaufbar; `node --check` ok.
