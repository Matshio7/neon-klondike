# KLONDAIRE — Projektübersicht

> Spieltitel: **KLONDAIRE** (früher „Neon Klondike"). Web-App auf GitHub Pages, später als Steam-Spiel geplant.


## Was wir bauen

Ein **Roguelike-Deckbuilder auf Basis von Klondike Solitaire** — im Geist von Balatro. Wir nehmen ein klassisches, jedem bekanntes Kartenspiel und biegen die Regeln mit Synergien, einem Shop und eskalierenden Runs zu etwas Süchtigmachendem um. Der Kern-Skill bleibt die befriedigende Logik von Solitaire; die Roguelike-Schicht macht aus jeder Partie einen Run mit Aufbau-Entscheidungen.

**Ästhetik:** Retro-Arcade — CRT-Scanlines, Pixel-Font (Press Start 2P), neon-grünes Filz, glühende Karten, „juicy" Score-Pops.

**Plattform-Strategie:** Wir prototypen mobil-zuerst als eigenständige HTML-Datei, die direkt auf dem Handy läuft (kein Xcode, kein Mac nötig). So testen wir Mechaniken unterwegs. Die App ist bewusst so gebaut, dass sie sich später **als Steam-Spiel** (z. B. via Electron-Wrapper) verpacken lässt — Szenen-System und Speicher-API bleiben dabei identisch.

## Aktueller Stand

Spielbarer Prototyp, live als Web-App: **https://matshio7.github.io/neon-klondike/**. Seit v0.6 in drei Dateien aufgeteilt (`index.html` + `styles.css` + `game.js`) plus Service Worker (`sw.js`) für automatische Updates und Offline-Betrieb. Läuft im Browser, auf dem Handy auf den Homescreen legbar. Optionaler Cloud-Speicherstand über ein schlankes Supabase-Backend (Benutzername → 8-stelliger Code), sonst weiterhin lokal via `localStorage`.

Was bereits drin ist:

- **Voll funktionsfähiges Klondike** — Stock, Waste, vier Foundations, sieben Tableau-Spalten, korrekte Zug-Validierung.
- **Tap-Steuerung** — Karte antippen zum Aufheben (hebt sich an, glüht golden), Zielstapel antippen zum Ablegen. Optimiert für Touch.
- **Chips × Mult Scoring** — das Balatro-Herzstück. Karten geben Chips, ein Multiplikator skaliert den Ertrag. Builds können „explodieren" statt nur zu addieren.
- **Score-Targets pro Runde** — steigen mit jeder Ante (wie Balatros Blinds).
- **Shop zwischen den Runden** — Perks kaufen mit Coins, aufgeteilt in eine Chip-Lane und eine Mult-Lane. Plus Reroll und Balatro-artiges Zins-System auf gespartem Geld.
- **Boss-Antes** — alle 3 Runden ein Boss mit Spezialregel (z. B. „Bildkarten zählen 0 Chips", „Target +40 %", „nur 1 Recycle"). Belohnt mit Bonus-Coins.
- **Verlustbedingung** — Stuck-Erkennung: wenn keine Züge mehr möglich sind und das Target nicht erreicht ist → Game Over.

### NEU in dieser Version (v0.2)

- **Hauptmenü** — eigenes Startmenü mit animiertem Neon-Logo und vier Buttons: **START**, **ERFOLGE**, **OPTIONS**, **EXIT**. Zeigt unten den persönlichen Rekord (Best Ante) und den Erfolgs-Fortschritt.
- **Szenen-System** — sauberer Screen-Manager (`showScene`) für Menü / Spiel / Erfolge / Optionen / Game-Over / Verabschiedung. Das ist die Architektur-Grundlage für die spätere Steam-Version.
- **Game-Over-System mit Visualisierung** — dedizierter Bildschirm mit:
  - **Neon-Balkendiagramm „Chips pro Ante"** über den ganzen Run, farbcodiert (grün = geschafft, gold = Boss, pink = gescheitert) mit eingezeichneter Target-Linie.
  - **Statistik-Kacheln** — Runden, Chips gesamt, beste Runde, Perks.
  - **Rekord-Hinweise** — „Neuer Rekord: Ante X" / „Beste Runde".
  - Buttons **NEW RUN** und **HAUPTMENÜ**.
- **Erfolge / Achievements** — 13 Erfolge (z. B. *Boss-Jäger*, *Hochstapler*, *Legende*, *Thronräuber*). Eigener Erfolgs-Screen mit Fortschrittsbalken; freigeschaltete Erfolge poppen während des Spiels als Toast auf.
- **Options** — Sound an/aus, CRT-Scanlines an/aus, Fortschritt zurücksetzen (mit Sicherheitsabfrage).
- **Sound** — leichtgewichtige WebAudio-SFX (Banking, Kauf, Sieg, Niederlage, Erfolg). Keine Audiodateien nötig, abschaltbar in den Optionen.
- **Persistenz** — Erfolge und Rekorde werden in `localStorage` gespeichert (mit In-Memory-Fallback, falls Speicher blockiert ist). Bleibt in der Steam-Version per identischer API erhalten.

### NEU in v0.3

- **Decks & VOLT** (vom Meta Designer ergänzt) — persistente Währung VOLT, freischaltbare Start-Decks mit Trade-offs, eigener DECKS-Screen.
- **Pause & Fortsetzen** — der Menü-Button oben links pausiert den Run (statt ihn zu beenden); im Hauptmenü erscheint **FORTSETZEN**.
- **Steuerung oben** — die alten unteren Buttons sind weg (kein versehentliches Antippen mehr beim Mobil-Spielen). Oben jetzt: **Menü · Items · Recycle-Zähler · Aufgeben**.
- **AUFGEBEN-Button** — beendet den Run bewusst (mit Rückfrage) und führt zum Game-Over.
- **AUTO & NEW RUN entfernt** — der Spieler legt alle Karten selbst; ein neuer Run startet nur über das Hauptmenü. (Recyceln durch Antippen des Stock-Stapels.)
- **ITEMS-Ansicht** — zeigt im Spiel die eigenen Perks, das aktive Deck und den Boss.
- **NEUES (Patch-Notes)** — Menüpunkt mit Update-Feed. Die Einträge pflegt Mats selbst im `PATCH_NOTES`-Array oben in der Datei.
- **Echte Symbole statt Emojis** — alle Icons sind jetzt sauberes Inline-SVG (kein „Tofu"-Viereck mehr oben).
- **Shop-Fix** — Coins werden korrekt synchron angezeigt (Overlay deckt jetzt voll ab + HUD aktualisiert beim Kauf).

### NEU in v0.6

- **Cloud-Speicherstand (geräteübergreifend)** — Benutzernamen wählen, 8-stelligen Code bekommen; der Fortschritt (Statistiken, Erfolge, VOLT & laufender Run) wird nach jeder Runde automatisch in der Cloud gesichert und lässt sich per Code auf jedem Gerät laden. Backend: Supabase (RLS-gesicherte Tabelle, nur Anlegen/Laden per Code).
- **Auto-Updater** — Service Worker (network-first): die Homescreen-App lädt beim Start die neueste Version und läuft offline aus dem Cache.
- **Lebendiger Hintergrund** — sanfte Drift, Pulsation & Farb-Atmosphäre (respektiert „prefers-reduced-motion").
- **Code aufgeteilt** — aus der einen großen HTML-Datei wurden `index.html` + `styles.css` + `game.js`; schlanker, schneller, einfacher zu pflegen.

### NEU in v0.5.2

- **Auto-Update für die iPhone-Homescreen-App** via Service Worker (`sw.js`, network-first): lädt beim Start die neueste Version, funktioniert offline aus dem Cache. **Spielstände/Fortschritt bleiben erhalten** (liegen in `localStorage`, unabhängig von Dateien/Cache). Hosting muss HTTPS sein; `sw.js` mit hochladen.
- **Lebendiger Hintergrund**: dezente Drift, Pulsation und Farb-Atmosphäre über dem Standbild (`#bgfx`-Layer), respektiert `prefers-reduced-motion`. Das Hintergrundbild bleibt erhalten.

### NEU in v0.5

- **Undo** mit steigender Coin-Strafe (pro Run teurer) und **Karten aus der Bank zurücknehmen** (wie echtes Solitär; Chips/Mult werden korrekt zurückgerechnet).
- **Sieg ab Ante 8** → Siegescreen, danach **Endlosmodus** + **Highscore** (beste Ante, Sieg-Zähler).
- **Savegame**: Der Run wird laufend in `localStorage` gespeichert; **FORTSETZEN** lädt ihn auch nach Neuladen/Tab-Schließen.
- **Joker & Spezialkarten** im Shop (mit Glück): JOKER, GOLDKARTE, MULT-KARTE — wild anlegbar/bankbar, sie **wachsen ins Deck**.
- **Gescriptetes Tutorial** in der ersten Runde (Coach + Glows), in den Optionen **zurücksetzbar**.
- **Umkehr-Deck** (Bank baut K→A), **roter „Letzter Versuch"** beim letzten Recycle.
- **Mehr Inhalt**: 15 Perks, 7 Bosse (alle deutsch), 18 Erfolge.
- **iPhone-Hinweis** im Menü (Homescreen-App), Items/Perks komplett auf Deutsch.

### Mechanik-Referenz (aktuelle Werte)

- **Basis-Chips pro gebankter Karte:** 10
- **Target-Formel:** `60 × 1,55^(Ante−1)`, auf 5 gerundet → A1=60, A2=95, A3=145, A4=225, A5=345, A6=535 …
- **Recycles (Stock-Durchläufe) pro Runde:** 2 (Basis)
- **Coins-Belohnung:** 3 Basis + 1 pro 40 erzielten Chips + Zins (1 pro 5 Coins, max. 5) + Bonus fürs Leerräumen/Boss
- **Aktuelle Perks:**
  - `+5 CHIP` — Foundation-Karten +5 Chips
  - `RED HEAT` — rote Karten +4 Chips
  - `TEN ENGINE` — Zehner +12 Chips
  - `FEVER` — +0,5 Basis-Mult (permanent)
  - `COMBO` — +0,1 Mult pro Bank (pro Runde, ramped innerhalb der Runde)
  - `ACE MULT` — Asse +0,5 Mult (pro Runde)
  - `EXTRA PASS` — +1 Recycle pro Runde
- **Bosse:** `THE TAX` (Target +40 %), `PAPER CROWN` (J/Q/K = 0 Chips), `DROUGHT` (nur 1 Recycle)
- **Erfolge:** ANGEZÄHLT, AUFRÄUMER, BOSS-JÄGER, THRONRÄUBER, WARMGELAUFEN (A3), AUFSTEIGER (A5), LEGENDE (A8), HOCHSTAPLER (500+), ÜBERFLIEGER (1000+), SAMMLER (5 Perks), MULTIPLIKATOR (×5.0), SPARFUCHS (20+ Coins), DURCHHALTER (10 Runs)

## In welche Richtung wir arbeiten

Das Ziel ist ein vollwertiger Roguelike mit echter Run-Varianz und tiefem Build-Crafting. Die nächsten Schritte, grob nach Priorität:

1. **Mult-System vertiefen** — mehr Perks, die multiplikativ statt additiv wirken; seltenere „Legendary"-Perks, die Runs definieren.
2. **Boss-Vielfalt** — mehr Boss-Typen mit interessanteren Regeln (z. B. „eine Farbe zählt doppelt", „Foundations brauchen zwei Durchgänge").
3. **Deal-3-Modus** + ein richtiger Stock/Waste-Fächer (näher am echten Klondike).
4. **Run-definierende Start-Decks** — verschiedene Decks, die unterschiedliche Strategien erzwingen.
5. **Mehr Juice** — bessere Animationen, mehr Sound-Layer, Bildschirm-Feedback.
6. ~~**Game-Over-Visualisierung**~~ ✅ erledigt (v0.2).
7. ~~**Hauptmenü**~~ ✅ erledigt (v0.2).
8. **Speichern/Fortschritt** — Grundlage steht (localStorage für Erfolge & Rekorde). Als Nächstes: laufenden Run speichern/fortsetzen, mehr freischaltbare Inhalte.

### Vom Prototyp zur „echten" Version

Der aktuelle HTML-Prototyp dient dazu, die **Spielmechaniken und das Game-Feel** schnell zu validieren — er ist absichtlich leichtgewichtig. Das neue **Szenen-System** und die **Store-API** (Persistenz) sind aber schon so gebaut, dass der Sprung zur Steam-Version klein bleibt: Ein Electron-Wrapper kann die Datei direkt laden; der EXIT-Button ist bereits dafür vorbereitet (`doExit()` → später `app.quit()`), und `localStorage` funktioniert im Wrapper unverändert.

## Dateien im Projekt

- `index.html` — HTML-Grundgerüst (Szenen, Menü)
- `styles.css` — gesamtes Styling (Retro-/CRT-Look)
- `game.js` — die komplette Spiellogik (Klondike, Scoring, Shop, Cloud-Save …)
- `data.js` — statische Spieldaten (Perks, Specials, Bosse, Decks, Themes, Icons, PATCH_NOTES, Flavor-Texte)
- `bg.js` — die 5 interaktiven WebGL-Shader-Hintergründe (`window.BG`)
- `bosses/` — animierte Boss-Sprites (je eine Datei, exposed als Global)
- `sw.js` — Service Worker (Auto-Update + Offline)
- `img/`, `music/`, `sfx/` — Hintergrundbild, Soundtracks, Soundeffekte
- `neon-klondike.html` — nur noch eine Weiterleitung auf `index.html`
- `README.md` — Projekt-Startseite im GitHub-Repo
- `docs/PROJEKT.md` — dieses Dokument (archiviert)

## Arbeitsweise

Schnelle Iteration: Mats spielt ein paar Runden, gibt Feedback zu Game-Feel und Schwierigkeitskurve, wir bauen die nächste Schicht. Entscheidungen über die nächste Richtung treffen wir gemeinsam anhand dessen, was sich beim Spielen gut oder schlecht anfühlt.
