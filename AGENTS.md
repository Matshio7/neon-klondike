# AGENTS.md — Single Source of Truth für alle KI-Assistenten

> **An jede KI hier (Claude, opencode, …):** Diese Datei ist die *eine* gemeinsame Wahrheit.
> **Lies ZUERST:** Abschnitt 0 (Protokoll) → 1 (Quickstart) → 2 (Grenzen). Damit bist du startklar.
> Details kommen bei Bedarf aus den verlinkten Dateien (`BACKLOG.md`, `CHANGELOG.md`).
> **Am Ende deiner Arbeit:** Stand (Abschnitt 3) + Backlog-Status + Changelog aktualisieren.

> **Onboarding-Prompt für Mats (zum Kopieren):**
> *„Bevor du etwas tust: lies `AGENTS.md` im Repo-Root, befolge das Protokoll in Abschnitt 0. Nimm GENAU EINE Aufgabe. Am Ende: `node --check game.js`, Stand/Backlog/Changelog pflegen, committen — vor `git push` mich fragen."*

---

## 0. Session-Protokoll (immer)

1. **`git pull --rebase`** — zuerst, evtl. arbeiten mehrere Agents parallel.
2. **Stand** (Abschnitt 3) und **Backlog-Index** (Abschnitt 4) lesen.
3. **Genau eine** Aufgabe wählen, im Backlog-Index als in Arbeit markieren: `- [~] BL-7 (opencode)`.
4. Nach **Konventionen** (Abschnitt 5) arbeiten. Nach jeder `game.js`-Änderung: **`node --check game.js`**.
5. Diese Datei pflegen: Stand (3), Backlog-Status (4), Changelog (`CHANGELOG.md`).
6. **`git commit`** (Format siehe Abschnitt 5). **Vor `git push` IMMER Freigabe einholen.** Abgelehnt → `git pull --rebase`, Konflikte lösen, erneut freigeben lassen.

**Parallelbetrieb:** möglichst nicht dieselbe Datei gleichzeitig bearbeiten. `pull` davor, `push` danach.

---

## 1. Quickstart / Befehle

Reihenfolge: erst prüfen, dann ansehen, dann committen. **Kein Build, kein npm, keine Dependencies.**

```bash
# Lokal ansehen (Service Worker braucht einen Server, nicht file://):
python3 -m http.server 8000      # dann http://localhost:8000

# PFLICHT nach jeder Änderung an game.js:
node --check game.js

# Git-Flow:
git pull --rebase                # Session-Start
git add -A && git commit -m "BL-7: kurze Beschreibung"
# git push                        # NUR nach expliziter Freigabe von Mats
```

- **Live:** https://matshio7.github.io/neon-klondike/ · **Repo:** `Matshio7/neon-klondike` (Push auf `main` → GitHub Pages baut in ~1–2 Min).
- **Dateien:** `index.html` (Szenen-Gerüst) · `styles.css` · `data.js` (statische Daten) · `bg.js` (WebGL-Shader) · `bosses/*.js` (Boss-Sprites) · `game.js` (Spiellogik, eine IIFE) · `sw.js` (Service Worker) · `img/` `music/` `sfx/` (Assets) · `docs/` (archivierte Design-Notizen) · `neon-klondike.html` (Redirect).
- **Ladereihenfolge der Scripts** (in `index.html`, Reihenfolge zählt): `data.js` → `bg.js` → `bosses/*.js` → `game.js`. Die ersten drei definieren globale Bezeichner (`IC`, `PATCH_NOTES`, `POOL`, `BOSSES`, `THEMES`, `BG`, `BossGrosseSteuer` …), die `game.js` (strict IIFE) liest. **Neue statische Daten → `data.js`, nicht in `game.js`.**
- **Persistenz:** `localStorage`; optional Cloud-Save über Supabase (Abschnitt 7).

---

## 2. Grenzen — IMMER / FRAG ZUERST / NIEMALS

**IMMER**
- Nach `game.js`-Änderung `node --check game.js`; UI-Änderung im Browser gegentesten.
- **UI-Texte auf Deutsch.**
- Jede **User-Eingabe** (v. a. Cloud-Benutzernamen) vor `innerHTML` mit `esc()` **escapen**.
- Beim Release **drei Stellen synchron** hochzählen (siehe Abschnitt 5).
- In **kleinen Schritten** arbeiten: ein Ticket, kleiner Diff.

**FRAG ZUERST**
- `git push` / Deploy.
- Größeres Refactor, neue Szene, oder Umbau der **Scoring-/Bank-Logik**.
- Änderungen an **Supabase**-Tabellen oder RPCs.

**NIEMALS**
- Neue **Frameworks / Dependencies / Build-Schritte** — alles bleibt vanilla.
- Supabase **`service_role`-Key** in Client oder Repo (Client nutzt nur den *publishable* Key, bewusst öffentlich, Tabelle per RLS gesichert).
- Den **Audio-Zufall** im `Music`-Objekt anfassen (nicht seedbar machen).
- **Cloud-Codes** (das „Passwort") in öffentlichen Listen/Ranglisten ausgeben.
- **Zeilennummern** als Code-Anker — immer nach Funktions-/Objektnamen suchen.

---

## 3. Aktueller Stand  ← hier zuerst schauen

- **Version:** v0.8.6 (in Vorbereitung, noch nicht gepusht)
- **Build:** node nicht installiert — Syntax via Browser-Reload verifiziert (keine JS-Fehler in Konsole).
- **Echte Spieler aktiv** (Cloud-Rangliste wird genutzt).
- **Zuletzt:** Boss-Riege v1.0 (nur Logik) — finale 5 Bosse: DÜRRE/FLAUTE/KOPFGELD/ZENSUR (Herausforderer) + GROSSE STEUER (Finale @ Ante 8). `BOSSES` in `data.js` getrimmt, alte Bosse raus, neuer Effekt ZENSUR (zufällige Farbe = 0, `G.bossDeadSuit` in `prepareRound`/`chipsFor`, dynamisches Banner via `bossDesc()`). **Offen:** Sprites + 3 Voice-Samples je Herausforderer (nur GROSSE STEUER hat sie). Vorher: Repo-Restrukturierung — `game.js` 1789→1413 Zeilen, Daten→`data.js`, Shader→`bg.js`, Doku→`docs/` (Architektur: Abschnitt 1 & 6). Browser-verifiziert (Boot, Menü, Board, Shader, Boss-Daten — keine Konsolen-Fehler). v0.8.6 — Auto-Bildschirmbreite (width-only fit, Höhe scrollt), MIDAS-Item-Preis von shopPen entkoppelt, Boss GROSSE STEUER als animierter Canvas-Hintergrund-Layer mit 3 Sprachsamples + Idle-Voice (`bosses/grosse_steuer.js`, `sfx/bigtax-*.mp3`). v0.8.5 — 5 WebGL-Shader-Hintergründe + Energiesparmodus.
- **applyPlausibility()** in `cloudPayload()` ist bereits aktiv (bestAnte≤100, bestChips≤999999999) — BL-7 client-seitig partiell erledigt, serverseitig noch offen.
- Volle Historie: `CHANGELOG.md`.

---

## 4. Backlog — Index (Status NUR hier pflegen)

Marker: `- [ ]` offen · `- [~] (name)` in Arbeit · `- [x]` erledigt (mit Datum). Reihenfolge ≈ Priorität.
**Ticket-Details (Ziel/Umsetzung/Fertig-wenn): siehe [`BACKLOG.md`](./BACKLOG.md).**

- [x] **BL-1** · Seedbarer Zufall (Fundament) *(Kimi, 17.06.2026)*
- [x] **BL-2** · Tages-Challenge + Tagesrangliste *(Kimi, 17.06.2026)*
- [x] **BL-3** · Einmal-Karten / Verbrauchsgegenstände *(Claude, v0.8.0)*
- [x] **BL-4** · Perk-Seltenheitsstufen + Synergien *(Claude, v0.8.0)*
- [x] **BL-5** · Boss-Vorschau + Endboss + mehr Bosse *(Claude, v0.8.0)*
- [x] **BL-6** · Mehr „Juice" *(opencode, 17.06.2026)*
- [ ] **BL-7** · Anti-Cheat / Plausibilität fürs Leaderboard — Prio: mittel
- [x] **BL-22** · Leaderboard-Submit deckt abgebrochene/backgrounded Läufe ab *(Claude, 23.06.2026)*
- [ ] **BL-8** · Run-Historie & Statistik-Screen — Prio: niedrig
- [x] **BL-9** · Barrierefreiheit (Vier-Farben-Deck) *(19.06.2026; Große Karten verworfen)*
- [ ] **BL-10** · Deal-3-Modus + echter Stock/Waste-Fächer — Prio: niedrig
- [ ] **BL-11** · In-App-Ankündigungen / Update-Benachrichtigungen — Prio: mittel
- [x] **BL-12** · Soundeffekte *(opencode, 20.06.2026)*
- [x] **BL-14** · Joker/Spezialkarten-Rebalance *(Claude, v0.8.0)*
- [x] **BL-15** · Vouchers / permanente Shop-Upgrades *(Claude, v0.8.0)*

---

## 5. Konventionen & Code-Stil

- **Keine** neuen Frameworks/Dependencies/Build-Schritte. Alles vanilla.
- **Stil wie `game.js`:** IIFE, `$('id')`-Helfer, Szenen über `showScene(name)`, Render-Funktionen `renderX()`, Inline-SVG-Icons über `IC` + `data-ic`. Neue Szene? An einer bestehenden orientieren (z. B. `scene-cloud` / `renderCloud`).
- **UI-Texte:** Deutsch.
- **Commit-Format:** kurz, Präfix mit Ticket/Scope, Deutsch. Beispiele:
  `BL-7: Score-Plausibilität in kl_save prüfen` · `fix: UMKEHR-Deck baut A→K` · `chore: sw.js VER auf v0.8.0`.
  Branch für Features: `feature/bl-<n>`.
- **Release = drei Stellen IMMER synchron hochzählen:**
  1. `PATCH_NOTES[0]` in `data.js` (neuer Eintrag, deutscher Stil),
  2. `opt-about` in `index.html` (`KLONDAIRE · vX.Y`),
  3. `VER` in `sw.js` (`klondaire-vX.Y`).
  Das Menü-Label „build vX" leitet sich aus `PATCH_NOTES[0].v` ab.
- **Verifizieren:** `node --check game.js data.js bg.js` (falls node verfügbar); sonst Browser-Reload + Konsole prüfen (keine Fehler) — auch `data.js`/`bg.js` werden so geprüft.

---

## 6. Architektur-Landkarte — nach Namen suchen, nicht Zeilen

**`data.js`** (reine Daten + zustandslose Helfer, global lesbar):
- `IC` — Inline-SVG-Icon-Map · `ACHIEVEMENTS`/`ACH_VOLT`/`ACH_DECK` · `PATCH_NOTES` (oberster = aktuelle Version).
- `POOL` (Perks) · `SPECIALS` · `CONSUMABLES` · `VOUCHERS` · `BOSSES`/`ENDBOSS` · `DECKS` · `DIFFICULTIES` · `THEMES` · `FORTUNES`/`MEAN`.
- Zugriffshelfer: `SPECIAL`/`CONS`/`VOUCHER`/`BOSS`/`DECK`/`RED`/`hexRgb`.

**`bg.js`** — `BG` (WebGL-Shader-Hintergründe): `BG.select(id)` · `BG.cur()` · `BG.NAMES`. Self-contained, nur Canvas `#bggl`.

**`bosses/*.js`** — animierte Boss-Sprites, je Datei ein Global (z. B. `BossGrosseSteuer.attach(canvas,opts)`).

**`game.js`** (gesamte Logik, eine strict IIFE — konsumiert obige Globals):
- `Store` — `localStorage`-Persistenz; `Store._defaults()` definiert `stats`/`meta` (u. a. `cloudCode`, `cloudName`, `selectedTheme`).
- `G`, `RUN`, `runActive` — aktueller Run / Tracking / Pause-Flag.
- `showScene(name)` — Szenen-Manager; jede Szene hat `renderX()` (`renderCloud`, `renderRang`, `renderNews`, `renderOpts`).
- Menü-Click-Handler — Verzweigung über `go==='…'` (`data-go`); Zurück über `data-back`.
- `svg()`/`paintIcons()`/`suitSvg()` — Icon-Rendering (lesen `IC`/`SUITNAME` aus `data.js`).
- `CLOUD`, `clRpc(fn,body)`, `cloud*` — Cloud-Save/Backend.
- `RNG`, `mkRng()`, `rseed()` — seedbarer Zufall (Audio-Zufall im `Music`-Objekt ist NICHT betroffen).

---

## 7. Backend (Supabase)

- Projekt-Ref: `sibloltywapcvaehpsdi`. Tabelle `public.saves(code pk, username, data jsonb, …)`, **RLS-gesperrt** (kein direkter anon-Zugriff).
- Zugriff nur über **Security-Definer-RPCs** (für `anon` freigegeben):
  - `kl_create(p_username, p_data) → code` (8-stellig)
  - `kl_save(p_code, p_username, p_data)`
  - `kl_load(p_code) → (username, data, updated_at)`
  - `kl_leaderboard(p_limit=50) → (rank, username, best_ante, best_chips, updated_at)` — dedupliziert pro Name, Ante↓ dann Chips↓, **keine Codes**.
- Regel: niemals den Code in einer öffentlichen Liste ausgeben.

---

## 8. Bekannte Probleme

- (keine offenen Blocker — letzter Cleanup 17.06.2026)

---

## 9. Für kleine/lokale Modelle (z. B. Ollama `gemma4-agentic`)

- **Ein Ticket pro Lauf.** Kein Breitband-Refactor, keine „arbeite die Liste ab".
- Erst die relevante Stelle in `game.js` per **Namenssuche** finden (Abschnitt 6), dann gezielt ändern.
- Nach jeder Änderung **`node --check game.js`**; Diff klein halten.
- Bei Unsicherheit **fragen statt raten** — besonders bei Scoring, Backend, Release.
- Nie ungefragt `git push`.

---

*Verlinkt: [`BACKLOG.md`](./BACKLOG.md) (Ticket-Details) · [`CHANGELOG.md`](./CHANGELOG.md) (Versionshistorie). Letzte Aktualisierung: 19.06.2026.*
