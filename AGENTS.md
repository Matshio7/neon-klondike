# AGENTS.md — Single Source of Truth für ALLE KI-Assistenten

> **An jede KI, die hier mitarbeitet (Claude, opencode, …):** Diese Datei ist die *eine* gemeinsame Wahrheit für dieses Projekt. **Lies sie ZUERST komplett** — dann bist du auf dem Stand, ohne dass dich jemand „abholen" muss. **Aktualisiere sie am Ende** deiner Arbeit. Halte dich an das Protokoll in Abschnitt 0.

> **So weist Mats eine KI an (zum Kopieren):**
> *„Bevor du irgendetwas tust: lies `AGENTS.md` im Repo-Root und befolge das Protokoll dort. Am Ende: aktualisiere Stand, TODO und Changelog in `AGENTS.md` und committe."*

---

## 0. Protokoll für jede Session (WICHTIG)

1. **`git pull`** — immer zuerst, du arbeitest evtl. parallel zu anderen Agents.
2. Lies **Abschnitt 2 (Aktueller Stand)** und **Abschnitt 3 (TODO)**.
3. Wähle eine Aufgabe und **markiere sie in Abschnitt 3 als in Arbeit** mit deinem Namen, z. B. `- [~] (opencode) …`.
4. Arbeite nach den **Konventionen (Abschnitt 4)**. Nach Code-Änderung: **`node --check game.js`**.
5. **Aktualisiere diese Datei**: Stand (Abschnitt 2), TODO (Abschnitt 3), Changelog (Abschnitt 8).
6. **`git commit`** (Format siehe 4). **Vor `git push` immer den Nutzer fragen / Freigabe einholen.** Erst nach explizitem OK pushen. Wird der Push abgelehnt: `git pull --rebase`, Konflikte lösen, erneut freigeben lassen.

**Parallelbetrieb:** Möglichst **nicht dieselbe Datei gleichzeitig** von zwei Agents bearbeiten lassen. Immer `pull` vor und `push` nach jeder Änderung — so bleiben alle synchron und Merge-Konflikte klein.

---

## 1. Das Projekt in Kürze

**KLONDAIRE** — ein Balatro-artiger Roguelike-Deckbuilder auf Basis von Klondike Solitaire. Retro-Arcade-Look (CRT-Scanlines, Pixel-Font, Neon-Filz). Mobil-first, später als Steam-Spiel (Electron) geplant.

- **Live:** https://matshio7.github.io/neon-klondike/ (GitHub Pages, Repo `Matshio7/neon-klondike`)
- **Stack:** Vanilla JavaScript, **kein Build, kein Framework, keine Dependencies** (außer Google-Webfont „Press Start 2P").
- **Dateien:** `index.html` (Gerüst/Szenen) · `styles.css` (Styling) · `game.js` (gesamte Logik, eine IIFE) · `sw.js` (Service Worker: Auto-Update + Offline) · `img/`, `music/` (Assets) · `neon-klondike.html` (Redirect auf index.html).
- **Persistenz:** lokal via `localStorage`; optional **Cloud-Save** über Supabase (siehe Abschnitt 6).

---

## 2. Aktueller Stand  ← hier zuerst schauen

- **Version:** v0.7.5 (Release vorbereitet)
- **Deploy:** `git commit` + `git push` auf `main` → GitHub Pages baut automatisch (~1–2 Min). *Kein manuelles Hochladen mehr.*
- **Build:** `node --check game.js` läuft sauber. Arbeitsverzeichnis i. d. R. clean.
- **Echte Spieler aktiv** (Cloud-Rangliste wird genutzt).
- **Zuletzt:** TEST-MULT aus Options ins Dev-Menü verschoben; FAQ-Eintrag zum Namen „Klondaire" hinzugefügt.
- **Cleanup (17.06.2026):** XSS-Helfer `esc()` eingebaut und in `renderRang()` + `renderCloud()` genutzt, `sw.js` VER auf `klondaire-v0.7.1` gezogen, `music_orig/` aus dem Repo entfernt und ins `.gitignore` aufgenommen.

---

## 3. TODO / Backlog (gemeinsam — bitte pflegen)

Status-Marker: `- [ ]` offen · `- [~] (name)` in Arbeit · `- [x]` erledigt (mit Datum).

**Sollte als Nächstes:**
- [x] **Sicherheit:** In `renderRang()` den Benutzernamen vor dem Einfügen ins HTML **escapen** (Stored-XSS möglich, da Namen frei wählbar & allen angezeigt). Mini-Helfer `esc()` nutzen, auch bei allen anderen Stellen, die User-Text in `innerHTML` schreiben. *(erledigt 17.06.2026)*
- [x] **`sw.js` VER** auf die App-Version ziehen (steht auf `klondaire-v0.6.2`, App ist v0.7.1). Bei JEDEM Release mitziehen. *(erledigt 17.06.2026)*
- [x] **`music_orig/`** (~27 MB unkomprimierte Originale) aus dem Repo nehmen bzw. in `.gitignore` — Backup gehört nicht in den Live-Stand. *(erledigt 17.06.2026)*

### Feature-Backlog (detaillierte Tickets)

> Jedes Ticket ist eigenständig umsetzbar. **Status nur HIER im Index pflegen** (Marker + `(name)` + Datum); die Details darunter sind Referenz. Reihenfolge = grobe Priorität. Code-Anker beziehen sich auf `game.js` (mit Funktionsnamen suchen, nicht Zeilennummern).

**Index:**
- [x] **BL-1** · Seedbarer Zufall (Fundament) — Prio: hoch *(Kimi, 17.06.2026)*
- [x] **BL-2** · Tages-Challenge + Tagesrangliste — Prio: hoch *(Kimi, 17.06.2026; braucht BL-1)*
- [ ] **BL-3** · Einmal-Karten / Verbrauchsgegenstände — Prio: hoch
- [ ] **BL-4** · Perk-Seltenheitsstufen + Synergien — Prio: hoch
- [ ] **BL-5** · Boss-Vorschau + Endboss + mehr Bosse — Prio: mittel
- [x] **BL-6** · Mehr „Juice" (Feedback/Animation/Haptik) — Prio: mittel *(opencode, 17.06.2026)*
- [ ] **BL-7** · Anti-Cheat / Plausibilität fürs Leaderboard — Prio: mittel *(sobald Rangliste ernster)*
- [ ] **BL-8** · Run-Historie & Statistik-Screen — Prio: niedrig
- [x] **BL-9** · Barrierefreiheit (Farbenblind, große Karten) — Prio: niedrig *(Vier-Farben-Deck: erledigt 19.06.2026; Große Karten: verworfen, mobil nicht praktikabel)*
- [ ] **BL-10** · Deal-3-Modus + echter Stock/Waste-Fächer — Prio: niedrig
- [ ] **BL-11** · In-App-Ankündigungen / Update-Benachrichtigungen — Prio: mittel

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

---

## 4. Konventionen & Hausregeln

- **Keine** neuen Frameworks/Dependencies/Build-Schritte. Alles bleibt vanilla.
- **Code-Stil:** kompakt, im Stil von `game.js` (IIFE, `$('id')`-Helfer, Szenen über `showScene(name)`, Render-Funktionen `renderX()`, Inline-SVG-Icons über das `IC`-Objekt + `data-ic`). Neue Szene? Orientiere dich an einer bestehenden (z. B. `scene-cloud` / `renderCloud`).
- **UI-Texte:** **Deutsch**.
- **Versionierung bei einem Release — drei Stellen IMMER synchron hochzählen:**
  1. `PATCH_NOTES[0]` in `game.js` (neuer Eintrag, deutscher Stil — Agents dürfen das pflegen),
  2. `opt-about` in `index.html` (`KLONDAIRE · vX.Y`),
  3. `VER` in `sw.js` (`klondaire-vX.Y`).
  Das Menü-Label „build vX" leitet sich aus `PATCH_NOTES[0].v` ab.
- **Sicherheit:** Jegliche **User-Eingabe** (v. a. Benutzernamen aus der Cloud) vor `innerHTML` **escapen**. Niemals den Supabase **`service_role`-Key** in den Client/das Repo schreiben — im Client wird ausschließlich der **publishable** Key benutzt (steht im `CLOUD`-Objekt in `game.js`, ist bewusst öffentlich; Tabelle ist per RLS gesichert).
- **Verifizieren:** nach Code-Änderung `node --check game.js`; bei UI-Änderungen im Browser gegentesten.
- **Deploy:** nur über `git push` (siehe 0) — **vor dem Push immer Nutzer-Freigabe einholen.** Assets (`music/`, `img/`) liegen mit im Repo.

---

## 5. Architektur-Landkarte (`game.js`, grobe Wegweiser)

Suche nach diesen Namen statt nach Zeilennummern (die wandern):

- `Store` — `localStorage`-Persistenz; `Store._defaults()` definiert `stats` / `meta` (u. a. `cloudCode`, `cloudName`, `selectedTheme`).
- `G`, `RUN`, `runActive` — aktueller Run / Run-Tracking / Pause-Flag.
- `showScene(name)` — Szenen-Manager; jede Szene hat `renderX()` (z. B. `renderCloud`, `renderRang`, `renderNews`, `renderOpts`).
- Menü-Click-Handler — Verzweigung über `go==='…'` (Buttons mit `data-go`). Zurück-Buttons: `data-back`.
- `IC` + `paintIcons()` — Inline-SVG-Icons für `[data-ic]`.
- `PATCH_NOTES` — Array der Update-Notes (oberster Eintrag = aktuelle Version).
- `CLOUD`, `clRpc(fn,body)`, `cloud*`-Funktionen — Cloud-Save/Backend-Aufrufe.

---

## 6. Backend (Supabase)

- Projekt-Ref: `sibloltywapcvaehpsdi`. Tabelle `public.saves(code pk, username, data jsonb, …)`, **RLS-gesperrt** (kein direkter anon-Zugriff).
- Zugriff nur über **Security-Definer-RPCs** (für `anon` freigegeben):
  - `kl_create(p_username, p_data) → code` (8-stellig)
  - `kl_save(p_code, p_username, p_data)`
  - `kl_load(p_code) → (username, data, updated_at)`
  - `kl_leaderboard(p_limit=50) → (rank, username, best_ante, best_chips, updated_at)` — dedupliziert pro Name, sortiert Ante↓ dann Chips↓, gibt **keine Codes** preis.
- Regel: niemals den Code (das „Passwort") in einer öffentlichen Liste ausgeben.

---

## 7. Bekannte Probleme

- (keine offenen Blocker — letzter Cleanup erledigt 17.06.2026)

---

## 8. Changelog (neueste zuerst, kurz)

- **v0.7.5** (17.06.2026) — TEST-MULT aus Options entfernt; FAQ-Eintrag zur Herkunft des Namens „Klondaire" hinzugefügt.
- **v0.7.4** (17.06.2026) — Option zum freien Anpassen der Bank-Reihenfolge in OPTIONS.
- **v0.7.3** (17.06.2026) — Tages-Challenge mit täglichem festen Seed + Rangliste GESAMT/HEUTE; mehr Juice mit EFFEKTE-Option, Screen-Shake, Vibration und skalierenden Score-Pops.
- **v0.7.2** (17.06.2026) — Seedbarer Zufall (BL-1) + Vier-Farben-Deck (BL-9) veröffentlicht.
- **v0.7.1-bl9** (19.06.2026) — BL-9 Barrierefreiheit: Vier-Farben-Deck-Toggle in OPTIONS (Farbenblind-Hilfe: getrennte Suit-Farben für Karo/Kreuz).
- **feature/bl-1** (17.06.2026) — BL-1: Seedbarer Zufall via mulberry32-RNG, `G.seed` in `newRun/snapRun/restoreRun`, RNG-State für Resume, alle spielrelevanten `Math.random()` durch `RNG()` ersetzt, Seed-Anzeige im Game-Over-Screen.
- **v0.7.1** (16.–18.06.2026) — FAQ-Button, Farb-Themes (Neon/Pink/Amber/Midnight/Blood, tönen den Hintergrund), feinerer Musik-Regler; UI/UX-Aufräum-Pass (Dead Code raus, Hilfe-Modus mit Board-Highlights, Default-Theme „Neon"→„OG", Farben theme-konsistent, Slider-Track via --felt, Lade-Indikator, FAQ-Seite visuell überarbeitet mit Kategorien & Animation).
- **v0.7.1-cleanup** (17.06.2026) — Sicherheit: `esc()`-Helfer gegen Stored-XSS in `renderRang()` / `renderCloud()`; `sw.js` Cache-Version auf `klondaire-v0.7.1` synchronisiert; `music_orig/` (~27 MB) aus dem Repository entfernt und ins `.gitignore` aufgenommen.
- **v0.7** (15.06.2026) — Schwierigkeitssystem (Auswahl im Menü), stufenloser CRT-Regler, AUTO-RÄUMEN (Auto-Einbanken), Erfolg „Voll im Blick", Musik auf 128 kbps komprimiert.
- **v0.6.1** (15.06.2026) — Rangliste/Bestenliste (Client), kräftigerer CRT-Filter, UI-Tweaks.
- **v0.6** (15.06.2026) — Cloud-Speicherstand (geräteübergreifend, 8-stelliger Code), Auto-Updater (Service Worker), dynamischer Hintergrund, Code-Split in index/styles/game.
- **v0.5** (14.06.2026) — Sieg ab Ante 8 + Endlosmodus, Joker/Spezialkarten, Undo, Bank-Rücknahme, Tutorial, Umkehr-Deck, mehr Perks/Bosse.

---

*Letzte Aktualisierung dieser Datei: 17.06.2026.*
