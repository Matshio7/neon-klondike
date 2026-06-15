# KLONDAIRE

**Retro-Roguelike-Solitaire** — ein Balatro-artiger Deckbuilder auf Basis von Klondike Solitaire. Neon-Arcade-Look, CRT-Scanlines, Pixel-Font und „juicy" Score-Pops.

### ▶️ Jetzt spielen: **https://matshio7.github.io/neon-klondike/**

> 📱 **Auf dem iPhone als App:** im Safari öffnen → Teilen-Symbol → „Zum Home-Bildschirm". Läuft danach wie eine echte App und aktualisiert sich automatisch.

---

## Worum geht's

Klondike, das jeder kennt — aber als **Run**. Jede gebankte Karte gibt **Chips**, ein **Multiplikator** skaliert den Ertrag (`Chips × Mult`). Jede Runde hat ein Score-Ziel, das mit jeder *Ante* steigt. Zwischen den Runden ein **Shop** mit Perks, dazu eine Coin-/Zins-Ökonomie, und alle 3 Runden ein **Boss** mit Spezialregel. Sieg ab Ante 8 → danach Endlosmodus für den Highscore.

## Features

- Vollständiges Klondike mit Tap-Steuerung (mobil-first)
- Chips-×-Mult-Scoring, eskalierende Ziele, Perk-Shop, Bosse
- Freischaltbare Start-Decks & persistente VOLT-Währung
- Undo, Karten aus der Bank zurücknehmen, Umkehr-Deck
- 18 Erfolge, Highscore, gescriptetes Tutorial
- ☁️ **Cloud-Speicherstand** — geräteübergreifend per 8-stelligem Code
- 🔄 **Auto-Update & Offline-Betrieb** über einen Service Worker
- Hintergrundmusik, getrennte Sound-/Musik-Regler, einstellbare UI-Größe

## Technik

Vanilla JavaScript, kein Build, keine Frameworks: `index.html` + `styles.css` + `game.js` + `sw.js`. Fortschritt lokal via `localStorage`; optionaler Cloud-Save über ein Supabase-Backend (RLS-gesichert — nur Anlegen/Laden per Code). Bewusst modular gehalten für eine spätere **Steam-Version** (Electron-Wrapper).

## Status

Aktuelle Version: **v0.6** · in aktiver Entwicklung.

---

*Privates Projekt von Mats — in Entwicklung.*
