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
6. **`git commit`** (Format siehe 4) **+ `git push`**. Wird der Push abgelehnt: `git pull --rebase`, Konflikte lösen, erneut pushen.

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

- **Version:** v0.7.1 (live & gepusht)
- **Deploy:** `git commit` + `git push` auf `main` → GitHub Pages baut automatisch (~1–2 Min). *Kein manuelles Hochladen mehr.*
- **Build:** `node --check game.js` läuft sauber. Arbeitsverzeichnis i. d. R. clean.
- **Echte Spieler aktiv** (Cloud-Rangliste wird genutzt).
- **Zuletzt:** Help-Mode überarbeitet (Board-Highlights + floating Labels statt Overlay), Dead Code entfernt (#diffchip, #title), Farben theme-konsistent (color-mix statt Hex), Slider-Track via --felt, Keyboard-Hint (LEERTASTE) entfernt, Lade-Indikator für Cloud/Rangliste, OG-Thema (Neon umbenannt, bg:null = kein Hintergrund-Filter), Spielhilfe auf Basics reduziert.

---

## 3. TODO / Backlog (gemeinsam — bitte pflegen)

Status-Marker: `- [ ]` offen · `- [~] (name)` in Arbeit · `- [x]` erledigt (mit Datum).

**Sollte als Nächstes:**
- [ ] **Sicherheit:** In `renderRang()` den Benutzernamen vor dem Einfügen ins HTML **escapen** (Stored-XSS möglich, da Namen frei wählbar & allen angezeigt). Mini-Helfer `esc()` nutzen, auch bei allen anderen Stellen, die User-Text in `innerHTML` schreiben.
- [ ] **`sw.js` VER** auf die App-Version ziehen (steht auf `klondaire-v0.6.2`, App ist v0.7.1). Bei JEDEM Release mitziehen.
- [ ] **`music_orig/`** (~27 MB unkomprimierte Originale) aus dem Repo nehmen bzw. in `.gitignore` — Backup gehört nicht in den Live-Stand.

**Ideen / später:**
- [ ] Mehr multiplikative Perks (seltene „Legendary"-Perks, die Runs definieren).
- [ ] Mehr Boss-Typen mit interessanteren Regeln.
- [ ] Deal-3-Modus + echter Stock/Waste-Fächer.
- [ ] Rangliste: optional Filter (Top heute / diese Woche) — `kl_leaderboard` könnte ein Zeitfenster bekommen.

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
- **Deploy:** nur über `git push` (siehe 0). Assets (`music/`, `img/`) liegen mit im Repo.

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

- ⚠️ **XSS:** `renderRang()` schreibt `username` ungefiltert ins HTML (siehe TODO).
- `sw.js` VER hinkt der App-Version hinterher (`v0.6.2` vs `v0.7.1`). Network-first liefert trotzdem aktuell, aber bei Release mitziehen.
- `music_orig/` bläht das Repo auf (~27 MB).

---

## 8. Changelog (neueste zuerst, kurz)

- **v0.7.1** (16.–17.06.2026) — FAQ-Button, Farb-Themes (Neon/Pink/Amber/Midnight/Blood, tönen den Hintergrund), feinerer Musik-Regler; danach UI/UX-Aufräum-Pass (Dead Code raus, Hilfe-Modus mit Board-Highlights, Default-Theme „Neon"→„OG", Farben theme-konsistent, Slider-Track via --felt, Lade-Indikator).
- **v0.7** (15.06.2026) — Schwierigkeitssystem (Auswahl im Menü), stufenloser CRT-Regler, AUTO-RÄUMEN (Auto-Einbanken), Erfolg „Voll im Blick", Musik auf 128 kbps komprimiert.
- **v0.6.1** (15.06.2026) — Rangliste/Bestenliste (Client), kräftigerer CRT-Filter, UI-Tweaks.
- **v0.6** (15.06.2026) — Cloud-Speicherstand (geräteübergreifend, 8-stelliger Code), Auto-Updater (Service Worker), dynamischer Hintergrund, Code-Split in index/styles/game.
- **v0.5** (14.06.2026) — Sieg ab Ante 8 + Endlosmodus, Joker/Spezialkarten, Undo, Bank-Rücknahme, Tutorial, Umkehr-Deck, mehr Perks/Bosse.

---

*Letzte Aktualisierung dieser Datei: 17.06.2026 (Session 2).*
