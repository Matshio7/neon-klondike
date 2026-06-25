# KLONDAIRE

**Retro-Roguelike-Solitaire** — ein Balatro-artiger Deckbuilder auf Basis von Klondike Solitaire. Neon-Arcade-Look, CRT-Scanlines, Pixel-Font und „juicy" Score-Pops.

### ▶️ Jetzt spielen: **https://matshio7.github.io/neon-klondike/**

> 📱 **Auf dem iPhone als App:** im Safari öffnen → Teilen-Symbol → „Zum Home-Bildschirm". Läuft danach wie eine echte App und aktualisiert sich automatisch.

---

## Worum geht's

Klondike, das jeder kennt — aber als **Run**. Jede gebankte Karte gibt **Chips**, ein **Multiplikator** skaliert den Ertrag (`Chips × Mult`). Jede Runde hat ein Score-Ziel, das mit jeder *Ante* steigt. Zwischen den Runden ein **Shop** mit Perks, Spezial- und Einmal-Karten, dazu eine Coin-/Zins-Ökonomie — und alle 3 Antes ein **Boss** mit einer Spezialregel, die genau eine Strategie kontert. **Sieg ab Ante 8** → danach Endlosmodus für den Highscore.

## Features

### Gameplay
- Vollständiges Klondike mit **Tap-Steuerung** (mobil-first): Antippen oder Doppeltipp = direkt auf die Bank, Leertaste zieht
- **Chips × Mult**-Scoring mit eskalierenden Zielen und sichtbaren Mult-Tags pro Bank
- **Perk-Shop** (18 Perks mit Selten/Legendär-Raritäten), **Spezialkarten** (Joker · Gold · Mult), **Einmal-Items** (Funke · Midas · Störer · Neumischen) und dauerhafte **Upgrades/Vouchers**
- **5 Bosse**, jeder kontert eine andere Strategie — Finale **GROSSE STEUER** mit animiertem Pixel-Sprite + Sprachausgabe; Boss-Vorschau schon im Shop
- **10 Start-Decks** mit echten Trade-offs, freigeschaltet mit der persistenten **VOLT**-Währung
- **8 Schwierigkeitsgrade** (NORMAL → HARDCORE), als Kette freischaltbar
- Undo (kostet Coins), Karten aus der Bank zurücknehmen, AUTO-RÄUMEN, Sackgassen-Hinweis
- **19 Erfolge**, gescriptetes Tutorial in der ersten Runde

### Online & Wettbewerb
- ☁️ **Cloud-Speicherstand** — geräteübergreifend per 8-stelligem Code (Supabase, RLS-gesichert)
- 🏆 **Ranglisten**: Ewig · Monat · Woche, dazu **Tages-Challenge** mit täglichem festen Seed für alle Spieler — mit Schwierigkeits-Filter
- 🔄 **Auto-Update & Offline-Betrieb** über einen Service Worker

### Look & Komfort
- 5 interaktive **WebGL-Shader-Hintergründe** (Aurora · Grid · Cells · Liquid · Suits) — maus-/touchreaktiv
- 5 Farb-Themes, stufenlose CRT-Scanlines, **Energiesparmodus** (friert Animationen ein)
- Eigene **Soundeffekte** & Hintergrundmusik (getrennt regelbar; standardmäßig aus, damit deine eigene Musik läuft)
- Vier-Farben-Deck (Farbenblind-Hilfe), frei sortierbare Bank-Reihenfolge, automatische Anpassung an die Fensterbreite

## Technik

Vanilla JavaScript — **kein Build, keine Frameworks, keine Dependencies**. Modular nach Verantwortung getrennt:

| Datei | Inhalt |
|---|---|
| `index.html` | Szenen-Gerüst |
| `styles.css` | komplettes Styling |
| `data.js` | statische Spieldaten (Perks · Specials · Bosse · Decks · Schwierigkeiten · Themes · Icons · Patch-Notes) |
| `bg.js` | die 5 WebGL-Shader-Hintergründe (`BG`) |
| `bosses/*.js` | animierte Boss-Sprites (Canvas-Pixel-Art) |
| `game.js` | gesamte Spiellogik (eine strict-IIFE) |
| `sw.js` | Service Worker (network-first, Offline-Cache) |

Fortschritt lokal via `localStorage`; optionaler Cloud-Save über ein **Supabase**-Backend (RLS-gesichert — Zugriff nur über Security-Definer-RPCs, niemals der Code in öffentlichen Listen). Ladereihenfolge der Scripts zählt: `data.js` → `bg.js` → `bosses/*.js` → `game.js`. Bewusst so gehalten für eine spätere **Steam-Version** (Electron-Wrapper).

### Lokal starten

```bash
# Service Worker braucht einen echten Server (nicht file://):
python3 -m http.server 8000      # → http://localhost:8000
```

Mehr zu Architektur, Konventionen und Backlog: siehe [`AGENTS.md`](./AGENTS.md) (Single Source of Truth) · [`CHANGELOG.md`](./CHANGELOG.md).

## Status

Aktuelle Version: **v0.8.6** · in aktiver Entwicklung — Roadmap bis **v1.0** (faire Ranglisten/Anti-Cheat, Run-Historie, mehr Inhalte, dann Steam) ist im Spiel-Menü einsehbar.

## Lizenz & Rechte

© 2026 Mats (Matshio7) — **Alle Rechte vorbehalten.**

Dies ist **kein** Open-Source-Projekt. Der Quellcode ist auf GitHub einsehbar, **es wird jedoch keine Lizenz erteilt.** Ohne ausdrückliche schriftliche Genehmigung ist die **Nutzung, das Kopieren, Verändern, Verbreiten** sowie das **Verwenden von Teilen** (Code, Grafik, Sound, Konzepte, Mechaniken) in anderen Projekten **untersagt**. Erlaubt ist allein das private Spielen über die offizielle Website. Vollständige Bedingungen: siehe [`LICENSE`](./LICENSE).

---

*Privates Projekt von Mats — in Entwicklung. Alle Rechte vorbehalten.*
