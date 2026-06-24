# CHANGELOG (neueste zuerst, kurz)

> Bei jedem Release ergänzen. Die Kurz-Zusammenfassung der letzten Arbeit steht in `AGENTS.md` (Abschnitt 3).

- **Boss-Riege v1.0 (Logik)** (24.06.2026) — Finale 5er-Auswahl festgelegt: DIE DÜRRE (1 Recycle), FLAUTE (kein Mult), KOPFGELD (A–5 = 0), DIE ZENSUR (zufällige Farbe = 0, **neuer Effekt**) als Herausforderer; GROSSE STEUER (+80 %) als festes Finale @ Ante 8. Alte Bosse (STEUER/PAPIERKRONE/HALBE KRAFT/SCHWARZSPERRE/STÖRSENDER + generisches FINALE) aussortiert. Banner zeigt bei ZENSUR die konkrete Farbe. *Nur Daten/Logik* — Sprites + Voice-Samples der 4 Herausforderer folgen (bisher nur GROSSE STEUER animiert).
- **Refactor** (24.06.2026) — Repo-Struktur entkoppelt: statische Daten (Perks/Specials/Bosse/Decks/Difficulties/Themes/Icons/Patch-Notes/Flavor) aus `game.js` → neue `data.js`; WebGL-Shader → neue `bg.js`. `game.js` 1789→1413 Zeilen. Veraltete Design-Docs nach `docs/` archiviert. Reine Umstrukturierung, kein Verhaltenseingriff; im Browser verifiziert.
- **v0.8.6** (24.06.2026) — Auto-Bildschirmbreite (nur Breite, Höhe scrollt); MIDAS-Item-Preis von shopPen entkoppelt; Boss GROSSE STEUER als animierter Canvas-Hintergrund-Layer mit Sprachsamples (Erscheinen/Niederlage) + Idle-Voice (einmal pro Runde, frühestens 30 s nach Start und nach 7 s ohne Eingabe).
- **BL-22** (23.06.2026) — Leaderboard-Submit robuster: `submitScore(beacon)` Helper mit `keepalive:true`-Support; feuert jetzt auch beim Home-Button, Ante-Aufstieg, App-Background (visibilitychange) und pagehide — nie wieder verlorene Board-Einträge durch abgebrochene Läufe. Leere `.catch` durch `console.warn` ersetzt.
- **v0.8.5** (23.06.2026) — 5 interaktive WebGL-Hintergründe (AURORA, GRID, CELLS, LIQUID, SUITS) in Options; ENERGIESPAREN-Modus friert alle Animationen ein und stoppt Shader.
- **v0.8.4** (23.06.2026) — Spieler-Feedback: Joker-Mark J→★, STAPEL SPIEGELN-Option, Feedback-Link (Tally), Difficulty-Tuning (50×1.45 statt 60×1.55).
- **v0.7.9** (18.06.2026) — iPhone-Homescreen-App aktualisiert sich jetzt zuverlässiger (Service-Worker-Update-Logik + App-Shell ohne Cache).
- **v0.7.8** (18.06.2026) — Cloud-Speichern repariert: leere RPC-Antworten von `kl_save` werden als Erfolg gewertet.
- **BL-12** (20.06.2026) — Soundeffekte als MP3-Dateien integriert (click, card-moving, achievement, denied, gameover); `SFX.preload()` + `play()` mit Fallback auf Synthesizer; Trigger an allen Spiel-Stellen (Stock, Tab-Move, Shop, Undo, ungültige Aktion); Post-it zeigt jetzt 2 Versionen.
- **v0.7.6** (17.06.2026) — UMKEHR-Deck: Tableau baut jetzt korrekt A→K auf, Bank bleibt K→A.
- **v0.7.6** (17.06.2026) — UMKEHR-Deck-Fix; Soundeffekte (BL-12) mit Dateien + Fallback; Zinsen bei SCHWER+ gefixt; Post-it zeigt 2 Versionen.
- **v0.7.5** (17.06.2026) — TEST-MULT aus Options entfernt; FAQ-Eintrag zur Herkunft des Namens „Klondaire" hinzugefügt; Soundeffekte integriert.
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
