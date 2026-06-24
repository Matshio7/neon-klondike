/* ============================================================
   KLONDAIRE — STATISCHE SPIELDATEN
   ------------------------------------------------------------
   Reine Daten + zustandslose Zugriffshelfer. Geladen VOR game.js;
   alle Bezeichner sind global lesbar (klassisches Script, kein Modul).
   Hier gehört Balancing/Content rein (Perks, Specials, Bosse, Decks,
   Schwierigkeiten, Themes, Icons, Patch-Notes, Flavor-Texte) — NICHT
   die Spiellogik. game.js konsumiert diese Globals.

   Zugriffshelfer hier: RED · SPECIAL · CONS · VOUCHER · BOSS · DECK · hexRgb
   (suitSvg bleibt in game.js, da es svg()/IC nutzt.)
   ============================================================ */
"use strict";

/* ===== ACHIEVEMENTS ===== */
/* ============================================================
   ACHIEVEMENTS  -  each tests against {G, RUN, S} (stats).
   ============================================================ */
const ACHIEVEMENTS=[
 {id:'first_bank',name:'ANGEZÄHLT',   desc:'Banke deine erste Karte.',            test:c=>c.RUN.banked>=1},
 {id:'clear_board',name:'AUFRÄUMER',  desc:'Räume ein Board komplett ab.',        test:c=>c.S.boardClears>=1},
 {id:'all_revealed',name:'VOLL IM BLICK',desc:'Alle Karten auf dem Brett aufgedeckt.', test:c=>c.G.tab&&c.G.tab.every(col=>col.every(card=>card.up))},
 {id:'boss1',     name:'BOSS-JÄGER',  desc:'Besiege deinen ersten Boss.',         test:c=>c.S.bossesBeaten.length>=1},
 {id:'allboss',   name:'THRONRÄUBER', desc:'Besiege 3 verschiedene Bosse.',        test:c=>c.S.bossesBeaten.length>=3},
 {id:'boss5',     name:'BOSS-PLAGE',  desc:'Besiege 5 verschiedene Bosse.',        test:c=>c.S.bossesBeaten.length>=5},
 {id:'ante3',     name:'WARMGELAUFEN',desc:'Erreiche Ante 3.',                    test:c=>c.S.bestAnte>=3},
 {id:'ante5',     name:'AUFSTEIGER',  desc:'Erreiche Ante 5.',                    test:c=>c.S.bestAnte>=5},
 {id:'ante8',     name:'LEGENDE',     desc:'Erreiche Ante 8.',                    test:c=>c.S.bestAnte>=8},
 {id:'chips500',  name:'HOCHSTAPLER', desc:'Erziele 500+ Chips in einer Runde.',  test:c=>c.S.bestChips>=500},
 {id:'chips1000', name:'ÜBERFLIEGER', desc:'Erziele 1000+ Chips in einer Runde.', test:c=>c.S.bestChips>=1000},
 {id:'perks5',    name:'SAMMLER',     desc:'Besitze 5 Perks gleichzeitig.',       test:c=>c.G.perks&&c.G.perks.length>=5},
 {id:'perks8',    name:'HAMSTERER',   desc:'Besitze 8 Perks gleichzeitig.',       test:c=>c.G.perks&&c.G.perks.length>=8},
 {id:'mult5',     name:'MULTIPLIKATOR',desc:'Erreiche ×5.0 Mult oder mehr.',      test:c=>c.RUN.maxMult>=5},
 {id:'coins20',   name:'SPARFUCHS',   desc:'Halte 20+ Coins gleichzeitig.',       test:c=>c.G.coins>=20},
 {id:'runs10',    name:'DURCHHALTER', desc:'Spiele 10 Runs.',                     test:c=>c.S.totalRuns>=10},
 {id:'souvenir',  name:'ZUM MITNEHMEN', desc:'Nimm dir ein Andenken vom schwarzen Brett.', test:c=>!!c.S.souvenir},
 {id:'win',       name:'DURCHGESPIELT',desc:'Gewinne einen Run (Ante 8 schaffen).',     test:c=>(c.S.wins||0)>=1},
 {id:'endless12', name:'GRENZENLOS',   desc:'Erreiche Ante 12 im Endlosmodus.',         test:c=>c.S.bestAnte>=12},
];
/* VOLT bounty paid the FIRST time each achievement unlocks (one-off, tracked in
   Store.data.meta.paidAch) + any deck it unlocks. */
const ACH_VOLT={first_bank:2,clear_board:5,all_revealed:5,boss1:8,allboss:15,boss5:20,ante3:5,ante5:10,ante8:20,chips500:8,chips1000:15,perks5:8,perks8:12,mult5:8,coins20:5,runs10:10,souvenir:7,win:25,endless12:20};
const ACH_DECK={allboss:'bossrush'};

/* ===== ICONS — inline SVG (currentColor), via game.js paintIcons() ins DOM ===== */
const IC={
 menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
 items:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3.5" y="5" width="10" height="14" rx="1.6"/><path d="M10.6 5l7.4 1.8a1.6 1.6 0 0 1 1.2 2L17 19"/></svg>',
 giveup:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 21V4"/><path d="M5.5 4.5h12l-2.4 4.2 2.4 4.2H5.5"/></svg>',
 back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
 play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5l13 7.5-13 7.5z"/></svg>',
 trophy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v4.5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4.2v1.2A3.2 3.2 0 0 0 7 10.3M17 6h2.8v1.2A3.2 3.2 0 0 1 17 10.3"/><path d="M10 13.6V17M14 13.6V17M8.5 20h7"/></svg>',
 lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
 gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1.5 12 5M12 19 12 22.5M1.5 12 5 12M19 12 22.5 12M4.5 4.5 6.5 6.5M17.5 17.5 19.5 19.5M4.5 19.5 6.5 17.5M17.5 6.5 19.5 4.5"/></svg>',
 power:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 3v8"/><path d="M6.5 6.5a8 8 0 1 0 11 0"/></svg>',
 cloud:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18h10a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 6.7 8.6 3.7 3.7 0 0 0 7 18z"/><path d="M12 16.5V10M9.5 12.5 12 10l2.5 2.5"/></svg>',
 spade:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C8.2 7 4 9.2 4 13.2c0 2.3 1.9 3.9 3.9 3.9 1 0 1.9-.4 2.6-1-.2 2-.9 3-2 3.9h7c-1.1-.9-1.8-1.9-2-3.9.7.6 1.6 1 2.6 1 2 0 3.9-1.6 3.9-3.9C20 9.2 15.8 7 12 3z"/></svg>',
 heart:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.3l-1.45-1.32C5.4 14.24 2 11.16 2 7.5 2 4.92 4.02 3 6.5 3c1.74 0 3.41.81 4.5 2.09C12.09 3.81 13.76 3 15.5 3 17.98 3 20 4.92 20 7.5c0 3.66-3.4 6.74-8.55 11.49L12 20.3z"/></svg>',
 diamond:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l7.5 10L12 22 4.5 12z"/></svg>',
 club:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="6.6" r="3.4"/><circle cx="6.8" cy="13" r="3.4"/><circle cx="17.2" cy="13" r="3.4"/><path d="M10.4 12.5h3.2l1.3 7.5h-5.8z"/></svg>',
 star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.7-4.9 4.5 1.4 6.6L12 17.6 5.9 20.9l1.4-6.6L2.4 9.3l6.7-.7z"/></svg>',
 coin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none"/></svg>',
 news:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10.5v3a1 1 0 0 0 1 1h2.5l6 3.5V6L7 9.5H4.5a1 1 0 0 0-1 1z"/><path d="M16.5 9.5a3.5 3.5 0 0 1 0 5"/></svg>',
 volt:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 13.5h6L9 22l9-12h-6z"/></svg>',
 recycle:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(0.1,-0.95)"><path d="M7 19H4.8a1.83 1.83 0 0 1-1.57-2.66L7.2 9.5"/><path d="M11 19h8.2a1.83 1.83 0 0 0 1.55-2.66l-1.22-2.12"/><path d="m14 16-3 3 3 3"/><path d="M8.3 13.6 7.2 9.5 3.1 10.6"/><path d="m9.34 5.81 1.1-1.9a1.83 1.83 0 0 1 3.1.01l3.94 6.84"/><path d="m13.38 9.63 4.1 1.1 1.1-4.1"/></g></svg>',
 close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
 help:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.3 9.3a2.7 2.7 0 0 1 5.2 1c0 1.8-2.5 2.1-2.5 3.9"/><path d="M12 17.5h.01"/></svg>',
 undo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-4"/></svg>',
};

/* ============================================================
   PATCH NOTES  -  shown in the NEUES menu screen.
   >>> Mats: trage hier deine eigenen Punkte ein. Neueste Version oben.
   Format: { v:'Titel', date:'optional', notes:['Punkt 1','Punkt 2', ...] }
   ============================================================ */
const PATCH_NOTES=[
 {v:'v0.8.6', date:'24.06.2026', notes:[
   'Automatische Bildschirmbreite — UI passt sich jetzt immer an die Fensterbreite an, kein manueller Toggle mehr nötig.',
   'MIDAS-Fix — Item-Preise werden nicht mehr von der Schwierigkeits-Strafe erhöht; MIDAS kostet jetzt immer 4 Coins.',
   'Neue Boss-Riege — 5 Bosse, jeder kontert eine andere Strategie; GROSSE STEUER als animiertes Finale mit Sprachausgabe.',
   'Sackgassen-Hinweis — meldet dir, wenn kein Zug mehr möglich ist (auch Nachziehen hilft nicht), statt dich rätseln zu lassen.',
 ]},
 {v:'v0.8.5', date:'23.06.2026', notes:[
   'WebGL-Hintergründe — 5 interaktive Shader in den Options: AURORA, GRID, CELLS, LIQUID, SUITS — mausreaktiv, mit Klick-Wellen.',
   'ENERGIESPAREN-Modus — friert alle Animationen ein und schont Akku & CPU, ideal für Unterwegs.',
   'Ranglisten-Filter — nach Schwierigkeit filtern (NORMAL, SCHWER, EXPERTE …) oder alles gemeinsam ansehen.',
 ]},
 {v:'v0.8.4', date:'23.06.2026', notes:[
   'Schwierigkeits-Tuning — Ante 1 startet bei 50 statt 60 Chips, Wachstum flacher.',
   'Joker ★ — kein Verwechsler mehr mit dem Buben. (★ ist Übergangslösung — jeder Joker bekommt bald ein eigenes Cover.)',
   'STAPEL SPIEGELN — Ablagestapel links, Nachziehstapel rechts.',
   'Feedback-Link — direkt in den Options Rückmeldung geben.',
 ]},
 {v:'v0.8.3', date:'21.06.2026', notes:[
   'Neues Info-Post-it im Hauptmenü: erklärt die Ranglisten-Resets (Woche/Monat/Ewig) und den einmaligen Reset zum Launch v1.0 — plus eine kleine Roadmap, was bis dahin noch kommt.',
 ]},
 {v:'v0.8.2', date:'21.06.2026', notes:[
   'Neue Wochen-Rangliste: eigener Tab „WOCHE", der jeden Montag neu startet — zusätzlich zu Ewig, Monat und Heute.',
   'Rangliste: Datum & Schwierigkeit stehen jetzt sauber unter dem Namen — auch lange Namen werden nicht mehr abgeschnitten.',
   'Aufräumen: alte Ranglisten-Einträge ohne echten Lauf-Bezug entfernt. Es zählen ab jetzt nur noch echte, abgeschlossene Läufe (mit korrektem Datum, Schwierigkeit und Deck).',
 ]},
 {v:'v0.8.1', date:'21.06.2026', notes:[
   'Ranglisten-Optik überarbeitet: übersichtliche Karten (Name · Datum · Schwierigkeit), Medaillen-Farben für Top 3, sauberes Deck-Detail per Klick.',
 ]},
 {v:'v0.8.0', date:'19.06.2026', notes:[
   'GROSSES UPDATE — mehr Roguelike-Tiefe!',
   'Joker & Spezialkarten überarbeitet: fairer & klarer, ohne Schneeball, reagieren auf Bosse.',
   'Boss-Vorschau: du siehst die Regel jetzt vorab — plus ein fordernder ENDBOSS bei Ante 8 und neue Boss-Typen.',
   'Perk-Raritäten (Selten/Legendär) + neue Synergie-Perks: Herz-Motor, Krönung, Überladung.',
   'Verbrauchsgegenstände: taktische Einmal-Karten (Funke, Midas, Störer, Neumischen) im Shop.',
   'Upgrades (Vouchers): dauerhafte Shop-Verbesserungen — Rabatt, Tresor, Auslage, Recycler, Würfelglück.',
   'Spiel-Audio (Musik & Effekte) ist jetzt standardmäßig AUS, damit deine eigene Musik (Apple Music, Spotify) nicht unterbrochen wird — in den Optionen mit SPIEL-AUDIO einschaltbar.',
   'Coin-Belohnung skaliert jetzt mit der Ante (kein Geld-Überfluss mehr in späten Runden).',
   'Ranglisten überarbeitet: Ewig · diesen Monat · Heute, mit Datum & Schwierigkeit — tippe eine Zeile für das Deck. (Daily-Bug behoben.)',
 ]},
 {v:'v0.7.9', date:'18.06.2026', notes:[
   'iPhone Homescreen-App aktualisiert sich jetzt zuverlässiger (Service-Worker-Update-Logik + App-Shell ohne Cache).',
 ]},
 {v:'v0.7.8', date:'18.06.2026', notes:[
   'Cloud-Speichern repariert: leere RPC-Antworten werden jetzt korrekt als Erfolg gewertet.',
 ]},
 {v:'v0.7.7', date:'18.06.2026', notes:[
   'Fehlerbehebungen rund um Sieg-Belohnung, faire Tages-Challenge und sauberere Chip-Zählung.',
   'Cloud: „Jetzt sichern"-Button + zuverlässigeres Hochladen; Tages-Challenge nur noch einmal pro Tag wertbar.',
 ]},
 {v:'v0.7.6', date:'17.06.2026', notes:[
   'UMKEHR-Deck: Tableau baut jetzt korrekt A→K auf (Bank weiterhin K→A).',
   'Soundeffekte: Neue Sounds für Banking, Card-Moves, Klicks, Erfolge, Game-Over und ungültige Aktionen – in OPTIONS regelbar.',
   'Zinsen bei SCHWER+ jetzt korrekt deaktiviert (samt Anzeige).',
   'Post-it zeigt jetzt die letzten 2 Versionen auf einen Blick.',
 ]},
 {v:'v0.7.5', date:'17.06.2026', notes:[
   'TEST-MULT aus Options entfernt (nur noch intern für Tests verfügbar).',
   'FAQ: Erklärung zum Namen „Klondaire" hinzugefügt.',
   'Neue Sounds: Eigene Soundeffekte für Klicks, Banking, Card-Moves, Erfolge und Game-Over – in den Optionen regulierbar.',
 ]},
 {v:'v0.7.4', date:'17.06.2026', notes:[
   'Option: Reihenfolge der Bank-Farben frei anpassen.',
 ]},
 {v:'v0.7.3', date:'17.06.2026', notes:[
   'Tages-Challenge: Jeden Tag derselbe Seed für alle Spieler.',
   'Rangliste: Umschalter zwischen GESAMT und HEUTE.',
   'Mehr Juice: EFFEKTE-Option, Screen-Shake, Vibration und größere Score-Pops bei hohem Mult.',
 ]},
 {v:'v0.7.2', date:'17.06.2026', notes:[
   'Technische Verbesserungen unter der Haube.',
   'Neue Bedienungshilfe: Vier-Farben-Deck für bessere Lesbarkeit (Karo blau, Kreuz grün).',
 ]},
 {v:'v0.7.1', date:'16.06.2026', notes:[
   'Feat: FAQ-Button rechts unten im Hauptmenü mit ausklappbaren Fragen & Antworten.',
   'Feat: Farb-Themes (Neon, Pink, Amber, Midnight, Blood) in den Optionen – färbt auch den Hintergrund ein. (Danke für den Wunsch, liebe*r Spieler*in! 💜)',
   'Fix: Musik-Slider feinere Steuerung (step 1 statt 5) und direkte Lautstärke-Setzung.',
 ]},
 {v:'v0.7', date:'15.06.2026', notes:[
   'UI: Konsistente max-width für alle Unter-Seiten — kein wildes Auseinanderziehen.',
    'Etwas wurde im Hauptmenü hinzugefügt … vielleicht findest du ja raus, was es ist.',
    'Neuer Erfolg: VOLL IM BLICK — alle Karten auf dem Brett aufdecken.',
    'AUTO-RÄUMEN-Button: wenn das ganze Brett sortiert ist, werden alle Karten animiert eingebankt.',
    'Musik: Deutlich komprimiert (128kbps) und wird nach erstem Laden im Cache gehalten.',
    'CRT-Scanlines: Stufenlos regelbar statt nur an/aus.',
  ]},
 {v:'v0.6.1', date:'15.06.2026', notes:[
   'CRT-Filter: kräftigere Scanlines + Flimmern & Glitch-Effekte.',
   'Rangliste: Bestenliste mit allen gespeicherten Runs — wer kommt am weitesten?',
   'UI: Post-it hängt tiefer, verdeckt nicht mehr den Titel.',
   'UI: Update-Fenster geht jetzt bis zum unteren Rand — mehr Platz für die News.',
 ]},
 {v:'v0.6', date:'15.06.2026', notes:[
    'Cloud-Speicherstand: Benutzernamen wählen, 8-stelligen Code bekommen — dein Fortschritt wird nach jeder Runde automatisch in der Cloud gesichert.',
    'Mit dem Code holst du deinen kompletten Stand (Statistiken, Erfolge, VOLT & laufender Run) auf jedes Gerät.',
    'Die Homescreen-App aktualisiert sich jetzt automatisch — beim Start kommt die neueste Version, offline läuft sie aus dem Cache.',
    'Lebendiger Hintergrund: sanfte Drift, Pulsation & Farb-Atmosphäre über deinem Bild — dezent, nicht aufdringlich.',
    'Unter der Haube aufgeräumt: schlankerer Code für schnelleres Laden und stabilere Updates.',
  ]},
 {v:'v0.5', date:'14.06.2026', notes:[
    'Sieg ab Ante 8 — danach Endlosmodus für den Highscore.',
    'Joker & Spezialkarten im Shop: dein Deck wächst.',
    'Undo-Button (kostet Coins, wird teurer) & Karten aus der Bank zurücknehmen.',
    'Speicherstand: FORTSETZEN lädt deinen Run nach dem Schließen.',
    'Gescriptetes Tutorial in der ersten Runde (in den Optionen zurücksetzbar).',
    'Neues Umkehr-Deck (Bank baut K→A), mehr Perks & mehr Bosse.',
    'Roter „Letzter Versuch" beim letzten Recycle, iPhone-Tipp im Menü.',
  ]},
 {v:'v0.4', date:'14.06.2026', notes:[
    'Das Spiel heißt jetzt KLONDAIRE.',
    'Hintergrundmusik: ein eigener Menü-Track und vier Tracks im Spiel.',
    'Lautstärke für Sound und Musik getrennt regelbar.',
    'UI-Größe einstellbar (0,5×–1,5×) oder automatisch ans Fenster anpassen.',
    'Doppeltipp auf eine Karte legt sie direkt auf die Bank.',
    'Leertaste zieht die nächste Karte vom Stapel.',
    'Neue Spielhilfe (?) erklärt Chips, Mult, Ante & Co.',
    'Übersichtliche Belohnungs-Aufschlüsselung nach jeder Runde.',
    'Schärfere Kartensymbole, neuer Hintergrund — und ein Notizzettel am Menü mit kleiner Überraschung.',
  ]},
 {v:'v0.3', date:'13.06.2026', notes:[
    'Hauptmenü: FORTSETZEN pausiert und lädt den laufenden Run.',
    'Steuerung ist nach oben gewandert (Menü · Items · Aufgeben).',
    'Neuer AUFGEBEN-Knopf führt direkt zum Game-Over.',
    'ITEMS-Ansicht zeigt deine Perks, dein Deck und den Boss.',
    'Symbole statt Emojis — sauberere Optik.',
  ]},
 // { v:'v0.5', date:'', notes:[ 'Dein nächster Punkt …' ] },
];

/* ============================================================
   GAME CORE  (Klondike + Balatro-style scoring/shop/bosses)
   ============================================================ */

/* ===== KARTEN · PERKS · SPECIALS · BOSSE · DECKS · SCHWIERIGKEITEN · THEMES ===== */
const SUITS=['♠','♥','♦','♣'];
const SUITNAME=['spade','heart','diamond','club'];
const RED=s=>s===1||s===2;
const RANKS=['','A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const POOL=[
 {id:'plus5',name:'+5 CHIPS',desc:'BANK-KARTEN +5 CHIPS',price:4,m:false,r:'c'},
 {id:'red',name:'ROTGLUT',desc:'ROTE KARTEN +4 CHIPS',price:3,m:false,r:'c'},
 {id:'ten',name:'ZEHNER-MOTOR',desc:'ZEHNER +12 CHIPS',price:4,m:false,r:'c'},
 {id:'fever',name:'FIEBER',desc:'+0,5 BASIS-MULT (DAUERHAFT)',price:6,m:true,r:'s'},
 {id:'streak',name:'COMBO',desc:'+0,1 MULT JE BANK (PRO RUNDE)',price:5,m:true,r:'s'},
 {id:'ace',name:'ASS-MULT',desc:'GEBANKTE ASSE +0,5 MULT (PRO RUNDE)',price:5,m:true,r:'s'},
 {id:'rec',name:'EXTRA-DURCHGANG',desc:'+1 RECYCLE / RUNDE',price:4,m:false,r:'c'},
 {id:'black',name:'SCHWARZGLUT',desc:'SCHWARZE KARTEN +4 CHIPS',price:3,m:false,r:'c'},
 {id:'face',name:'HOFSTAAT',desc:'BILDKARTEN (J/Q/K) +8 CHIPS',price:4,m:false,r:'c'},
 {id:'low',name:'KELLERKIND',desc:'KARTEN A–5 +5 CHIPS',price:4,m:false,r:'c'},
 {id:'acechip',name:'ASS IM ÄRMEL',desc:'ASSE +20 CHIPS',price:5,m:false,r:'s'},
 {id:'richbank',name:'SPARSCHWEIN',desc:'+2 COINS GRUNDBELOHNUNG / RUNDE',price:5,m:false,r:'c'},
 {id:'deepinterest',name:'ZINSESZINS',desc:'ZINS-LIMIT 5 → 8 COINS',price:6,m:false,r:'s'},
 {id:'bigfever',name:'HOCHSPANNUNG',desc:'+1,0 BASIS-MULT (DAUERHAFT)',price:9,m:true,r:'l'},
 {id:'comboplus',name:'KETTENREAKTION',desc:'+0,2 MULT JE BANK (PRO RUNDE)',price:7,m:true,r:'s'},
 {id:'heartengine',name:'HERZ-MOTOR',desc:'+0,3 MULT JE GEBANKTE HERZ-KARTE (PRO RUNDE)',price:7,m:true,r:'s'},
 {id:'facemult',name:'KRÖNUNG',desc:'BILDKARTEN +0,3 MULT (PRO RUNDE)',price:7,m:true,r:'s'},
 {id:'overload',name:'ÜBERLADUNG',desc:'+2,0 BASIS-MULT (DAUERHAFT)',price:14,m:true,r:'l'},
];
/* SPECIAL CARDS — bought (with luck) in the shop, added to the run's deck (deck grows).
   All are WILD: anlegbar auf jede Karte, bankbar in jede Lücke. They give bonus chips/mult. */
const SPECIALS=[
 {id:'joker',   name:'JOKER',      mark:'★', chips:15, mult:0,   price:6, desc:'Wild im Tableau (Lücken-Helfer); eingelöst +15 Chips (×Mult).'},
 {id:'gold',    name:'GOLDKARTE',  mark:'$', chips:45, mult:0,   price:10,desc:'Wild im Tableau; eingelöst +45 Chips (×Mult).'},
 {id:'multcard',name:'MULT-KARTE', mark:'×', chips:10, mult:0.5, price:9, desc:'Wild im Tableau; eingelöst +0,5 MULT (für die Runde).'},
];
const SPECIAL=id=>SPECIALS.find(x=>x.id===id);
/* CONSUMABLES — Einmal-Karten, im Shop kaufbar, sofort im Run einsetzbar (max. 2 im Inventar) */
const CONSUMABLES=[
 {id:'spark',    name:'FUNKE',     mark:'⚡',price:4, desc:'+1,0 MULT für diese Runde.'},
 {id:'midas',    name:'MIDAS',     mark:'$', price:4, desc:'Sofort +6 Coins.'},
 {id:'bossbreak',name:'STÖRER',    mark:'⊘',price:6, desc:'Hebt die Boss-Regel für diese Runde auf.'},
 {id:'reshuffle',name:'NEUMISCHEN',mark:'↻',price:4, desc:'Mischt Stock + Waste neu (kostet kein Recycle).'},
];
const CONS=id=>CONSUMABLES.find(x=>x.id===id);
/* VOUCHERS — dauerhafte, run-weite Upgrades (jedes nur 1×) */
const VOUCHERS=[
 {id:'discount',   name:'GROSSHANDEL', price:6, desc:'Alle Perks −1 Coin.'},
 {id:'interestcap',name:'TRESOR',      price:7, desc:'Zins-Limit +3 Coins.'},
 {id:'perkslot',   name:'AUSLAGE',     price:8, desc:'Shop zeigt 4 Perks statt 3.'},
 {id:'recycler',   name:'RECYCLER',    price:7, desc:'+1 Recycle pro Runde (dauerhaft).'},
 {id:'luckyroll',  name:'WÜRFELGLÜCK', price:6, desc:'Reroll ist gratis.'},
];
const VOUCHER=id=>VOUCHERS.find(x=>x.id===id);
/* Finale Boss-Riege (v1.0): 4 Herausforderer (Ante 3/6) + GROSSE STEUER als
   Finale (Ante 8). Jeder kontert eine andere Strategie. Effekt-Hooks: game.js
   (prepareRound / chipsFor / bankGain-Mult-Ramp). Nur GROSSE STEUER hat bisher
   Sprite + Stimme (bosses/grosse_steuer.js); die 4 anderen laufen als Banner,
   bis Sprites + Voice-Samples vorliegen. */
const BOSSES=[
 {id:'drought', name:'DIE DÜRRE',  desc:'NUR 1 RECYCLE'},            // kontert langsames/schlampiges Spiel
 {id:'flaute',  name:'FLAUTE',     desc:'KEIN MULT-AUFBAU'},         // kontert Combo-/Engine-Builds
 {id:'lowtax',  name:'KOPFGELD',   desc:'KARTEN A–5 = 0 CHIPS'},     // kontert Low-Card-Fokus
 {id:'censor',  name:'DIE ZENSUR', desc:'EINE ZUFÄLLIGE FARBE = 0 CHIPS'}, // kontert Anpassung (Farbe wird pro Runde gewürfelt)
];
const ENDBOSS={id:'bigtax',name:'GROSSE STEUER',desc:'ZIEL +80%'};   // erzwungenes Finale @ Ante 8 (Sprite + 3 Stimmen)
const BOSS=id=>(id===ENDBOSS.id?ENDBOSS:BOSSES.find(b=>b.id===id));
/* ============================================================
   DECKS  -  starting-condition modifiers chosen before a run.
   Standard is free; the rest are unlocked with VOLT in the DECKS screen.
   Every deck is a TRADEOFF (a buff paired with a cost).
   ============================================================ */
const DECKS=[
 {id:'standard',  name:'STANDARD',    desc:'AUSGEWOGEN — KEINE MODIFIKATOREN',     coins:4, recDelta:0, baseMult:1, startPerks:[], targetMul:1,    rewardDelta:0,  cost:0},
 {id:'highroller',name:'HIGH ROLLER', desc:'+6 START-COINS · ALLE ZIELE +15%',    coins:10,recDelta:0, baseMult:1, startPerks:[], targetMul:1.15, rewardDelta:0,  cost:20},
 {id:'marathon',  name:'MARATHON',    desc:'+1 RECYCLE/RUNDE · BASIS-REWARD -1',   coins:4, recDelta:1, baseMult:1, startPerks:[], targetMul:1,    rewardDelta:-1, cost:20},
 {id:'combo',     name:'KOMBO',       desc:'START MIT COMBO-PERK · NUR 2 COINS',   coins:2, recDelta:0, baseMult:1,   startPerks:['streak'], targetMul:1,    rewardDelta:0,  cost:25},
 {id:'founders',  name:'FUNDAMENT',   desc:'FOUNDATION +5 CHIPS · KEIN REROLL',    coins:4, recDelta:0, baseMult:1,   startPerks:['plus5'],  targetMul:1,    rewardDelta:0,  noReroll:true, cost:28},
 {id:'redheat',   name:'ROTGLUT',     desc:'ROT +6 · SCHWARZ -2 CHIPS',            coins:4, recDelta:0, baseMult:1,   startPerks:[],         targetMul:1,    rewardDelta:0,  cardMods:{red:6,black:-2}, cost:30},
 {id:'reverse',   name:'UMKEHR',      desc:'BANK BAUT K→A STATT A→K',              coins:5, recDelta:0, baseMult:1,   startPerks:[],         targetMul:1,    rewardDelta:0,  reverse:true, cost:28},
 {id:'glasscannon',name:'GLASKANONE', desc:'BASIS-MULT ×1.5 · NUR 1 RECYCLE',      coins:4, recDelta:-1,baseMult:1.5, startPerks:[],         targetMul:1,    rewardDelta:0,  cost:35},
 {id:'minimalist',name:'MINIMALIST',  desc:'5 COINS, GRATIS REROLL · ZIELE +25%',  coins:5, recDelta:-1,baseMult:1,   startPerks:[],         targetMul:1.25, rewardDelta:0,  freeReroll:true, cost:40},
 {id:'bossrush',  name:'BOSS-STURM',  desc:'BOSS JEDE ANTE · ×2 BEUTE & VOLT',     coins:4, recDelta:0, baseMult:1,   startPerks:[],         targetMul:1,    rewardDelta:0,  bossEveryAnte:true, bossBountyMul:2, bossVoltMul:2, cost:0, unlockVia:'allboss'},
];
const DECK=id=>DECKS.find(d=>d.id===id)||DECKS[0];
const WIN_ANTE=8;   // clear this ante = run won; then optional endless mode for highscore
const DIFFICULTIES=[
 {id:0, name:'NORMAL',   lab:'0 · NORMAL',         targetMul:1,   coinPen:0,  recPen:0, noInt:false, noUndo:false, bossEA:false, shopPen:0, noSpec:false,  basePen:0},
 {id:1, name:'ERHÖHT',   lab:'1 · ERHÖHT',         targetMul:1.15,coinPen:0,  recPen:0, noInt:false, noUndo:false, bossEA:false, shopPen:0, noSpec:false,  basePen:0},
 {id:2, name:'SCHWER',   lab:'2 · SCHWER',         targetMul:1.3, coinPen:1,  recPen:0, noInt:true,  noUndo:false, bossEA:false, shopPen:0, noSpec:false,  basePen:0},
 {id:3, name:'FORTGESCHRITTEN',lab:'3 · FORTGESCHRITTEN',targetMul:1.45,coinPen:2,recPen:0, noInt:true,  noUndo:false, bossEA:false, shopPen:1, noSpec:false,  basePen:0},
 {id:4, name:'EXPERTE',  lab:'4 · EXPERTE',        targetMul:1.6, coinPen:2,  recPen:1, noInt:true,  noUndo:false, bossEA:false, shopPen:1, noSpec:false,  basePen:0},
 {id:5, name:'MEISTER',  lab:'5 · MEISTER',        targetMul:1.8, coinPen:3,  recPen:1, noInt:true,  noUndo:false, bossEA:false, shopPen:2, noSpec:true,   basePen:0},
 {id:6, name:'ALBTRAUM', lab:'6 · ALBTRAUM',       targetMul:2,   coinPen:3,  recPen:2, noInt:true,  noUndo:true,  bossEA:true,  shopPen:3, noSpec:true,   basePen:0.3},
 {id:7, name:'HARDCORE', lab:'7 · HARDCORE',       targetMul:2.5, coinPen:5,  recPen:9, noInt:true,  noUndo:true,  bossEA:true,  shopPen:0, noSpec:true,   basePen:0.5},
];
function hexRgb(h){return {r:parseInt(h.slice(1,3),16),g:parseInt(h.slice(3,5),16),b:parseInt(h.slice(5,7),16)};}
const THEMES={
  og:{mint:'#36e0a0',gold:'#ffd23f',pink:'#ff5b7f',felt:'#0e2c1d',panel:'#0a0f0b',bg:null},
  pink:{mint:'#f472b6',gold:'#fbbf24',pink:'#ec4899',felt:'#2d0a1e',panel:'#12050c',bg:['#f472b6','#b91c6c','#f9a8d4']},
  amber:{mint:'#ffb347',gold:'#ff8c00',pink:'#ff6347',felt:'#1a1200',panel:'#0a0800',bg:['#ffb347','#cc7000','#ffd699']},
  midnight:{mint:'#60a5fa',gold:'#facc15',pink:'#f472b6',felt:'#0a1628',panel:'#060a12',bg:['#60a5fa','#1e3a5f','#93c5fd']},
  blood:{mint:'#ff6b6b',gold:'#ffd93d',pink:'#ff4757',felt:'#1a0a0a',panel:'#0a0505',bg:['#ff6b6b','#8b0000','#ffa3a3']},
};

/* ===== FLAVOR — Post-it-Laschen (Easter Egg) ===== */
/* Easter egg: tear off a fringe tab -> a little souvenir note + a secret achievement. */
const FORTUNES=[
  'Glückskeks sagt: Asse zuerst.',
  'Spar deine Coins — Zinsen sind dein Freund.',
  'Geheimtipp: Könige räumen Platz.',
  'Doppeltipp = direkt auf die Bank.',
  'Hier könnte deine Werbung stehen.',
  'Solitär seit 1989. Retro 4 ever.',
  'Den hat schon jemand abgerissen… ach, du warst es.',
  '+0 Coins. Aber ein gutes Gefühl.',
  'Viel Glück beim nächsten Run!',
  'Du Sammler. Immer am Mitnehmen.',
];
/* tearing the FINAL tab earns a slightly mean line for hogging them all */
const MEAN=[
  'Die letzte?! Jetzt geht jeder andere leer aus. Stark.',
  'Gierig. Jetzt hat NIEMAND sonst mehr eine Lasche.',
  'Alle abgerissen. Teilen war wohl keine Option, was?',
  'Du Monster. Jetzt hängt da nur noch ein nackter Zettel.',
];
