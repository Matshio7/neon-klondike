(function(){
"use strict";

/* ============================================================
   PERSISTENCE  -  localStorage with graceful in-memory fallback.
   (This is a standalone file the player runs locally; persistence
   is what makes achievements/highscores meaningful. The Steam/
   Electron build keeps the exact same API.)
   ============================================================ */
const KEY='neonklondike.v1';
const Store={
  data:null, _mem:null, _ok:true,
  load(){
    try{const raw=localStorage.getItem(KEY); this.data=raw?JSON.parse(raw):{};}
    catch(e){this._ok=false;this.data=this._mem||{};}
    this._defaults();
  },
  _defaults(){
    const d=this.data;
    d.stats=Object.assign({totalRuns:0,bestAnte:0,bestChips:0,bestRunChips:0,boardClears:0,bossesBeaten:[],wins:0},d.stats||{});
    if(!Array.isArray(d.stats.bossesBeaten))d.stats.bossesBeaten=[];
    d.ach=Array.isArray(d.ach)?d.ach:[];
    d.opts=Object.assign({crt:0.3,scale:1,fit:false,sfxVol:0.75,musicVol:0.25},d.opts||{});
    if(typeof d.opts.sound==='boolean'){ d.opts.sfxVol=d.opts.sound?0.75:0; delete d.opts.sound; }      // migrate old on/off
    if(typeof d.opts.music==='boolean'){ d.opts.musicVol=d.opts.music?0.25:0; delete d.opts.music; }
    if(typeof d.opts.crt==='boolean')d.opts.crt=d.opts.crt?0.3:0;  // migrate old boolean to opacity
    if(typeof d.opts.sfxVol!=='number')d.opts.sfxVol=0.75;
    if(typeof d.opts.musicVol!=='number')d.opts.musicVol=0.25;
    d.meta=Object.assign({
      volt:0,                    // persistent currency, earned every run (win OR loss)
      selectedDeck:'standard',
      decksUnlocked:['standard'],
      perksUnlocked:['plus5','red','ten','fever','streak','ace','rec'], // current 7 stay free
      paidAch:[],                // achievement ids already paid out in VOLT
      themesUnlocked:['neon'], selectedTheme:'neon',
      tutDone:false,             // first-run tutorial shown?
      cloudCode:'', cloudName:'', // cloud-save code + username (set when activated)
      difficultyUnlocked:0, selectedDifficulty:0 // difficulty tiers 0-7, unlocked by winning
    },d.meta||{});
  },
  save(){
    try{ if(this._ok)localStorage.setItem(KEY,JSON.stringify(this.data)); else this._mem=this.data; }
    catch(e){ this._ok=false; this._mem=this.data; }
  },
  reset(){ const opts=this.data.opts; this.data={opts:opts}; this._defaults(); this.save(); }
};

/* ============================================================
   AUDIO  -  tiny WebAudio SFX engine (no asset files).
   ============================================================ */
const SFX={
  ctx:null,
  ensure(){ if(this.ctx)return; try{this.ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){} },
  resume(){ if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume(); },
  tone(freq,dur,type,vol){
    var sv=Store.data.opts.sfxVol; if(!sv||!this.ctx)return;
    type=type||'square'; vol=(vol||0.20)*sv;
    const t=this.ctx.currentTime;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t); o.stop(t+dur);
  },
  click(){this.tone(420,0.05);},
  bank(){this.tone(660,0.07);setTimeout(()=>this.tone(880,0.06),40);},
  buy(){this.tone(520,0.08);setTimeout(()=>this.tone(820,0.08),60);},
  unlock(){[660,990,1320].forEach((f,i)=>setTimeout(()=>this.tone(f,0.12,'square',0.22),i*80));},
  win(){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>this.tone(f,0.12,'square',0.22),i*90));},
  lose(){[440,330,220,165].forEach((f,i)=>setTimeout(()=>this.tone(f,0.18,'sawtooth',0.22),i*120));},
};

/* ============================================================
   MUSIC  -  background tracks (HTML5 Audio, files in /music).
   Menu loops one track; a run plays the other four back-to-back
   on loop. Starts on first user gesture (autoplay policy) and
   follows the active scene. Toggle in Options.
   ============================================================ */
const Music={
  el:null, mode:'menu', idx:0, ready:false, cur:'',
  MENU:'music/menu-blue-saga.mp3',
  RUN:['music/run-out-to-the-world.mp3','music/run-rocket-jr.mp3','music/run-ava-low.mp3','music/run-wave-saver.mp3'],
  init(){
    if(this.el)return;
    try{this.el=new Audio();}catch(e){return;}
    this.el.volume=Store.data.opts.musicVol;
    var self=this;
    this.el.addEventListener('ended',function(){            // advance the run playlist
      if(self.mode==='run'){ self.idx=(self.idx+1)%self.RUN.length; self.cur=self.RUN[self.idx]; self.el.src=self.cur; self._play(); }
    });
  },
  _target(){ return this.mode==='menu'?this.MENU:this.RUN[this.idx]; },
  _play(){ if(this.el&&this.ready&&Store.data.opts.musicVol>0){ var p=this.el.play(); if(p&&p.catch)p.catch(function(){}); } },
  setVol(){ this.init(); if(!this.el)return; this.el.volume=Store.data.opts.musicVol; if(Store.data.opts.musicVol>0&&this.ready){var p=this.el.play();if(p&&p.catch)p.catch(function(){});}else if(Store.data.opts.musicVol===0)this.el.pause(); },
  sync(){                                                   // match src to mode, then play/pause per settings
    this.init(); if(!this.el)return;
    this.el.volume=Store.data.opts.musicVol;
    var t=this._target();
    this.el.loop=(this.mode==='menu');
    if(this.cur!==t){ this.cur=t; this.el.src=t; }
    if(this.ready&&Store.data.opts.musicVol>0) this._play(); else this.el.pause();
  },
  setMode(m){ this.init(); if(m!==this.mode){ this.mode=m; if(m==='run')this.idx=Math.floor(Math.random()*this.RUN.length); } this.sync(); },
  kick(){ this.ready=true; this.sync(); }                   // first user gesture unlocks playback
};

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

/* ============================================================
   ICONS  -  inline SVG (currentColor). Painted into any element
   that has a data-ic="name" attribute (see paintIcons). Replaces
   emoji and font-missing glyphs with crisp, themeable symbols.
   ============================================================ */
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
function svg(name){return '<span class="svgi">'+(IC[name]||'')+'</span>';}
function paintIcons(root){(root||document).querySelectorAll('[data-ic]').forEach(function(el){if(el.dataset.painted)return;el.innerHTML=IC[el.dataset.ic]||'';el.dataset.painted='1';});}

/* ============================================================
   PATCH NOTES  -  shown in the NEUES menu screen.
   >>> Mats: trage hier deine eigenen Punkte ein. Neueste Version oben.
   Format: { v:'Titel', date:'optional', notes:['Punkt 1','Punkt 2', ...] }
   ============================================================ */
const PATCH_NOTES=[
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
const SUITS=['♠','♥','♦','♣'];
const SUITNAME=['spade','heart','diamond','club'];
function suitSvg(s){return svg(SUITNAME[s]);}   // suit as inline SVG (inherits card color)
const RED=s=>s===1||s===2;
const RANKS=['','A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const POOL=[
 {id:'plus5',name:'+5 CHIPS',desc:'BANK-KARTEN +5 CHIPS',price:4,m:false},
 {id:'red',name:'ROTGLUT',desc:'ROTE KARTEN +4 CHIPS',price:3,m:false},
 {id:'ten',name:'ZEHNER-MOTOR',desc:'ZEHNER +12 CHIPS',price:4,m:false},
 {id:'fever',name:'FIEBER',desc:'+0,5 BASIS-MULT (DAUERHAFT)',price:6,m:true},
 {id:'streak',name:'COMBO',desc:'+0,1 MULT JE BANK (PRO RUNDE)',price:5,m:true},
 {id:'ace',name:'ASS-MULT',desc:'GEBANKTE ASSE +0,5 MULT (PRO RUNDE)',price:5,m:true},
 {id:'rec',name:'EXTRA-DURCHGANG',desc:'+1 RECYCLE / RUNDE',price:4,m:false},
 {id:'black',name:'SCHWARZGLUT',desc:'SCHWARZE KARTEN +4 CHIPS',price:3,m:false},
 {id:'face',name:'HOFSTAAT',desc:'BILDKARTEN (J/Q/K) +8 CHIPS',price:4,m:false},
 {id:'low',name:'KELLERKIND',desc:'KARTEN A–5 +5 CHIPS',price:4,m:false},
 {id:'acechip',name:'ASS IM ÄRMEL',desc:'ASSE +20 CHIPS',price:5,m:false},
 {id:'richbank',name:'SPARSCHWEIN',desc:'+2 COINS GRUNDBELOHNUNG / RUNDE',price:5,m:false},
 {id:'deepinterest',name:'ZINSESZINS',desc:'ZINS-LIMIT 5 → 8 COINS',price:6,m:false},
 {id:'bigfever',name:'HOCHSPANNUNG',desc:'+1,0 BASIS-MULT (DAUERHAFT)',price:9,m:true},
 {id:'comboplus',name:'KETTENREAKTION',desc:'+0,2 MULT JE BANK (PRO RUNDE)',price:7,m:true},
];
/* SPECIAL CARDS — bought (with luck) in the shop, added to the run's deck (deck grows).
   All are WILD: anlegbar auf jede Karte, bankbar in jede Lücke. They give bonus chips/mult. */
const SPECIALS=[
 {id:'joker',   name:'JOKER',      mark:'J', chips:15, mult:0,   price:6, desc:'Wild — überall anlegbar, bankt jede Lücke. +15 Chips.'},
 {id:'gold',    name:'GOLDKARTE',  mark:'$', chips:60, mult:0,   price:8, desc:'Wild & gebankt: +60 Bonus-Chips.'},
 {id:'multcard',name:'MULT-KARTE', mark:'×', chips:10, mult:0.5, price:9, desc:'Wild & gebankt: +0,5 MULT (für die Runde).'},
];
const SPECIAL=id=>SPECIALS.find(x=>x.id===id);
const BOSSES=[
 {id:'tax',     name:'STEUER',        desc:'ZIEL +40%'},
 {id:'crown',   name:'PAPIERKRONE',   desc:'J Q K = 0 CHIPS'},
 {id:'drought', name:'DÜRRE',         desc:'NUR 1 RECYCLE'},
 {id:'half',    name:'HALBE KRAFT',   desc:'ALLE CHIPS HALBIERT'},
 {id:'blackout',name:'SCHWARZSPERRE', desc:'SCHWARZE KARTEN = 0 CHIPS'},
 {id:'flaute',  name:'FLAUTE',        desc:'KEIN MULT-AUFBAU'},
 {id:'bigtax',  name:'GROSSE STEUER', desc:'ZIEL +80%'},
];
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
  neon:{mint:'#36e0a0',gold:'#ffd23f',pink:'#ff5b7f',felt:'#0e2c1d',panel:'#0a0f0b',bg:['#36e0a0','#106e56','#78e0b4']},
  pink:{mint:'#f472b6',gold:'#fbbf24',pink:'#ec4899',felt:'#2d0a1e',panel:'#12050c',bg:['#f472b6','#b91c6c','#f9a8d4']},
  amber:{mint:'#ffb347',gold:'#ff8c00',pink:'#ff6347',felt:'#1a1200',panel:'#0a0800',bg:['#ffb347','#cc7000','#ffd699']},
  midnight:{mint:'#60a5fa',gold:'#facc15',pink:'#f472b6',felt:'#0a1628',panel:'#060a12',bg:['#60a5fa','#1e3a5f','#93c5fd']},
  blood:{mint:'#ff6b6b',gold:'#ffd93d',pink:'#ff4757',felt:'#1a0a0a',panel:'#0a0505',bg:['#ff6b6b','#8b0000','#ffa3a3']},
};
let G={};
let RUN={};   // per-run tracking (resets each new run)
let runActive=false; // true while a run is in progress (resumable from the menu)

function $(id){return document.getElementById(id);}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function target(n){return Math.round(60*Math.pow(1.55,n-1)/5)*5;}
function recBase(){return 2+(G.perks.includes('rec')?1:0)+(G.deck?G.deck.recDelta:0);}
function baseMult(){var b=(G.deck?G.deck.baseMult:1)+(G.perks.includes('fever')?0.5:0)+(G.perks.includes('bigfever')?1:0);return b-((G.dd&&G.dd.basePen)||0);}
function effMult(){return baseMult()+G.roundMult;}

function resetRun(){RUN={banked:0,totalChips:0,maxMult:0,bestRound:0,newBestAnte:false,newBestChips:false,newAch:[],voltEarned:0,won:false};}

function newRun(){
  resetRun();
  Store.data.stats.totalRuns++;
  const tut=!Store.data.meta.tutDone;                          // first ever run -> tutorial
  const deck=tut?DECK('standard'):DECK(Store.data.meta.selectedDeck);  // tutorial always on the standard deck
  const diffId=tut?0:(Store.data.meta.selectedDifficulty||0);
  const diffDef=DIFFICULTIES[diffId]||DIFFICULTIES[0];
  G={ante:1,coins:Math.max(1,deck.coins-diffDef.coinPen),perks:deck.startPerks.slice(),history:[],deck:deck,undo:[],undoUses:0,tutorial:tut,tutStep:0,endless:false,specials:[],specialOffer:null,diff:diffId};
  if(diffId)G.dd=diffDef;
  runActive=true;
  newRound();           // newRound updates bestAnte + saves
  evalAch();            // covers runs10 etc.
}
/* ============================================================
   SAVEGAME  -  persist the whole run to localStorage so it
   survives reloads / app restarts. FORTSETZEN loads it.
   ============================================================ */
const SAVE_KEY='klondaire.save';
function snapRun(){                                            // serializable copy of the active run, or null
  if(!runActive||!G||G.phase==='over'||G.tutorial)return null;
  const g=Object.assign({},G); g.undo=[]; g.sel=null;
  g.deckId=g.deck?g.deck.id:'standard'; delete g.deck;
  return {g:g,run:RUN};
}
function restoreRun(r){                                        // r = {g, run}
  if(!r||!r.g||!Array.isArray(r.g.tab))return false;
  const g=r.g; g.deck=DECK(g.deckId||'standard'); delete g.deckId; g.undo=[]; g.sel=null; g.undoUses=g.undoUses||0;
  if(g.diff&&!g.dd)g.dd=DIFFICULTIES[g.diff];
  G=g; RUN=Object.assign({banked:0,totalChips:0,maxMult:0,bestRound:0,newBestAnte:false,newBestChips:false,newAch:[],voltEarned:0,won:false},r.run||{});
  if(!Array.isArray(RUN.newAch))RUN.newAch=[];
  runActive=true; return true;
}
function saveGame(){ const r=snapRun(); if(!r)return; try{localStorage.setItem(SAVE_KEY,JSON.stringify(Object.assign({v:1},r)));}catch(e){} }
function hasSave(){try{const d=JSON.parse(localStorage.getItem(SAVE_KEY));return !!(d&&d.g&&Array.isArray(d.g.tab));}catch(e){return false;}}
function loadGame(){ try{ return restoreRun(JSON.parse(localStorage.getItem(SAVE_KEY))); }catch(e){return false;} }
function clearSave(){try{localStorage.removeItem(SAVE_KEY);}catch(e){}}

/* ============================================================
   CLOUD SAVE (Supabase) — username + 8-char code. Syncs the full
   progress (stats + achievements + meta + active run) after each
   round, so saves survive new versions AND work cross-device.
   ============================================================ */
const CLOUD={url:'https://sibloltywapcvaehpsdi.supabase.co',key:'sb_publishable_hoXPLyY0xEcZM4O1T8MfQQ_aOLai6jI'};
function clRpc(fn,body){
  return fetch(CLOUD.url+'/rest/v1/rpc/'+fn,{method:'POST',
    headers:{'Content-Type':'application/json','apikey':CLOUD.key,'Authorization':'Bearer '+CLOUD.key},
    body:JSON.stringify(body)}).then(function(r){return r.ok?r.json():Promise.reject(r.status);});
}
function cloudPayload(){ return {v:1,store:{stats:Store.data.stats,ach:Store.data.ach,meta:Store.data.meta},run:snapRun()}; }
function cloudSync(){ const m=Store.data.meta; if(!m.cloudCode)return; clRpc('kl_save',{p_code:m.cloudCode,p_username:m.cloudName||'',p_data:cloudPayload()}).catch(function(){}); }
function cloudCreate(name){ Store.data.meta.cloudName=name||''; return clRpc('kl_create',{p_username:name||'',p_data:cloudPayload()}).then(function(code){Store.data.meta.cloudCode=code;Store.save();return code;}); }
function cloudApply(payload){
  if(!payload)return false;
  if(payload.store){ if(payload.store.stats)Store.data.stats=payload.store.stats; if(payload.store.ach)Store.data.ach=payload.store.ach; if(payload.store.meta)Store.data.meta=payload.store.meta; }
  Store._defaults(); Store.save();
  if(payload.run&&restoreRun(payload.run))saveGame(); else { runActive=false; clearSave(); }
  return true;
}
function cloudLoad(code){
  code=(code||'').trim().toUpperCase();
  if(code.length<4)return Promise.reject('code');
  return clRpc('kl_load',{p_code:code}).then(function(rows){
    const row=rows&&rows[0]; if(!row)return Promise.reject('notfound');
    cloudApply(row.data);
    Store.data.meta.cloudCode=code; Store.data.meta.cloudName=row.username||''; Store.save();
    return {username:row.username};
  });
}
/* FORTSETZEN: continue the in-memory run if present, else load from disk */
function doResume(){
  if(runActive&&G&&G.phase&&G.phase!=='over'){showScene('game');fitCards();render();return;}
  if(!loadGame())return;
  showScene('game');fitCards();render();
  if(G.phase==='shop')renderShop();
  else if(G.phase==='clear'){
    if(G.ante>=WIN_ANTE&&!G.endless)showVictory();              // was on the victory screen
    else {G.phase='shop';openShop();}                           // otherwise jump straight to the shop
  }
}

function newRound(){
  const deck=[];for(let s=0;s<4;s++)for(let r=1;r<=13;r++)deck.push({r,s,up:false});
  (G.specials||[]).forEach(id=>deck.push({r:0,s:-1,up:false,joker:true,special:id}));   // special cards grow the deck
  shuffle(deck);
  G.tab=[[],[],[],[],[],[],[]];
  for(let c=0;c<7;c++){for(let k=0;k<=c;k++){const card=deck.pop();card.up=(k===c);G.tab[c].push(card);}}
  G.stock=deck;G.waste=[];G.found=[[],[],[],[]];
  G.chips=0;G.roundMult=0;G.phase='play';G.sel=null;G._last=0;G.boss=null;G.undo=[];
  G.target=target(G.ante);if(G.deck&&G.deck.targetMul!==1)G.target=Math.round(G.target*G.deck.targetMul/5)*5;G.rec=recBase();
  var dd=DIFFICULTIES[G.diff];if(dd&&dd.targetMul!==1)G.target=Math.round(G.target*dd.targetMul/5)*5;
  if(dd&&dd.recPen)G.rec=Math.max(0,G.rec-dd.recPen);
  var bossAnte=(G.ante%3===0)||(G.deck&&G.deck.bossEveryAnte)||(dd&&dd.bossEA);
  if(bossAnte){G.boss=BOSSES[Math.floor(Math.random()*BOSSES.length)];
    if(G.boss.id==='tax')G.target=Math.round(G.target*1.4/5)*5;
    if(G.boss.id==='bigtax')G.target=Math.round(G.target*1.8/5)*5;
    if(G.boss.id==='drought')G.rec=Math.max(1,G.rec-2);}
  if(G.tutorial&&G.ante===1)tutForceAce();   // ensure the bank-an-Ace step is doable
  // reaching an ante = a record candidate
  if(G.ante>Store.data.stats.bestAnte){Store.data.stats.bestAnte=G.ante;RUN.newBestAnte=true;}
  Store.save();
  evalAch();
  hideOv();render();
  if(G.tutorial&&G.ante===1){G.tutStep=0;tutShow();}else tutHide();
  cloudSync();   // sync progress at the start of each round
}
function color(c){return RED(c.s)?'r':'b';}
function validSeq(cards){for(let i=1;i<cards.length;i++){const a=cards[i-1],b=cards[i];if(!b.up||b.r!==a.r-1||color(a)===color(b))return false;}return true;}
function moving(){if(!G.sel)return[];if(G.sel.p==='waste')return[G.waste[G.waste.length-1]];if(G.sel.p==='found')return[G.found[G.sel.suit][G.found[G.sel.suit].length-1]];return G.tab[G.sel.col].slice(G.sel.idx);}
function canFound(c,suit){const s=c.joker?suit:c.s;if(s==null)return false;const f=G.found[s];const need=(G.deck&&G.deck.reverse)?13-f.length:f.length+1;return c.joker||c.r===need;}   // count-based; wild fills any slot
function canTab(cards,col){const r0=cards[0],t=G.tab[col];if(t.length===0)return r0.joker||r0.r===13;const top=t[t.length-1];if(!top.up)return false;if(r0.joker||top.joker)return true;return top.r===r0.r+1&&color(top)!==color(r0);}
function chipsFor(c){if(c.special){const sp=SPECIAL(c.special);return sp?sp.chips:10;}
  if(G.boss){if(G.boss.id==='crown'&&c.r>=11)return 0;if(G.boss.id==='blackout'&&!RED(c.s))return 0;}
  let v=10;
  if(G.perks.includes('plus5'))v+=5;
  if(G.perks.includes('red')&&RED(c.s))v+=4;
  if(G.perks.includes('black')&&!RED(c.s))v+=4;
  if(G.perks.includes('ten')&&c.r===10)v+=12;
  if(G.perks.includes('face')&&c.r>=11)v+=8;
  if(G.perks.includes('low')&&c.r<=5)v+=5;
  if(G.perks.includes('acechip')&&c.r===1)v+=20;
  if(G.deck&&G.deck.cardMods)v+=RED(c.s)?G.deck.cardMods.red:G.deck.cardMods.black;
  if(G.boss&&G.boss.id==='half')v=Math.ceil(v/2);
  return Math.max(0,v);}
function bankGain(c){
  let multAdd=0;
  const ramp=!(G.boss&&G.boss.id==='flaute');   // FLAUTE-Boss: kein Mult-Aufbau aus Perks
  if(ramp){
    if(G.perks.includes('streak')){G.roundMult+=0.1;multAdd+=0.1;}
    if(G.perks.includes('ace')&&c.r===1){G.roundMult+=0.5;multAdd+=0.5;}
    if(G.perks.includes('comboplus')){G.roundMult+=0.2;multAdd+=0.2;}
  }
  if(c.special){const sp=SPECIAL(c.special);if(sp&&sp.mult){G.roundMult+=sp.mult;multAdd+=sp.mult;}}
  const m=effMult(); if(m>RUN.maxMult)RUN.maxMult=m;
  const gain=Math.round(chipsFor(c)*m);
  G.chips+=gain; RUN.banked++; RUN.totalChips+=gain;
  c.gain=gain; c.multAdd=multAdd;   // recorded so taking the card back can reverse it exactly
  SFX.bank();
  evalAch();
  return gain;
}
/* take a card back out of the Bank -> reverse its chip + mult contribution (no exploits) */
function unbank(c){
  if(c.gain){G.chips=Math.max(0,G.chips-c.gain);RUN.totalChips=Math.max(0,RUN.totalChips-c.gain);c.gain=0;}
  if(c.multAdd){G.roundMult=Math.max(0,G.roundMult-c.multAdd);c.multAdd=0;}
}
function flip(arr){if(arr.length&&!arr[arr.length-1].up)arr[arr.length-1].up=true;}
function pop(g){if(g<=0)return;const d=document.createElement('div');d.className='scorepop';d.textContent='+'+g;$('stage').appendChild(d);setTimeout(()=>d.remove(),800);}
function handleStock(){
  if(!(G.stock.length||(G.rec>0&&G.waste.length)))return; // nothing to draw/recycle
  pushUndo();
  if(G.stock.length){const c=G.stock.pop();c.up=true;G.waste.push(c);}
  else if(G.rec>0&&G.waste.length){while(G.waste.length){const c=G.waste.pop();c.up=false;G.stock.push(c);}G.rec--;}
  G.sel=null;render();checkStuck();tutGate('stock');
}
function doFound(suit){pushUndo();const cs=moving();const c=cs[0];const s=c.joker?suit:c.s;G.found[s].push(c);if(G.sel.p==='waste')G.waste.pop();else{G.tab[G.sel.col].pop();flip(G.tab[G.sel.col]);}const g=bankGain(c);pop(g);G.sel=null;tutGate('bank');check();}
function doTab(col){pushUndo();const cs=moving();if(G.sel.p==='waste')G.waste.pop();else if(G.sel.p==='found'){const c=G.found[G.sel.suit].pop();unbank(c);}else G.tab[G.sel.col].splice(G.sel.idx);cs.forEach(c=>G.tab[col].push(c));if(G.sel.p==='tab')flip(G.tab[G.sel.col]);G.sel=null;render();checkStuck();}
function same(p,col,idx){return G.sel&&G.sel.p===p&&G.sel.col===col&&G.sel.idx===idx;}
function shake(){const s=$('stage');s.classList.add('shake');setTimeout(()=>s.classList.remove('shake'),180);}
function selWaste(){if(G.waste.length)G.sel={p:'waste'};}
/* ---- UNDO: snapshot before each move; each undo costs escalating coins (per run) ---- */
function pushUndo(){
  if(!G.undo)G.undo=[];
  G.undo.push(JSON.stringify({tab:G.tab,waste:G.waste,stock:G.stock,found:G.found,chips:G.chips,roundMult:G.roundMult,rec:G.rec}));
  if(G.undo.length>60)G.undo.shift();
}
function undoCost(){return (G.undoUses||0)+1;}
function doUndo(){
  if(G.dd&&G.dd.noUndo)return;
  if(G.phase!=='play'||!G.undo||!G.undo.length)return;
  const cost=undoCost();
  if(G.coins<cost){shake();return;}
  const s=JSON.parse(G.undo.pop());
  G.tab=s.tab;G.waste=s.waste;G.stock=s.stock;G.found=s.found;
  G.chips=s.chips;G.roundMult=s.roundMult;G.rec=s.rec;
  G.coins-=cost;G.undoUses=(G.undoUses||0)+1;G.sel=null;G._last=G.chips;
  const d=document.createElement('div');d.className='scorepop';d.style.color='var(--pink)';d.textContent='-'+cost+' COINS';$('stage').appendChild(d);setTimeout(function(){d.remove();},800);
  SFX.tone(320,0.08);setTimeout(function(){SFX.tone(200,0.1);},60);
  render();
}

/* ============================================================
   TUTORIAL  -  scripted, coached first round (Ante 1, first run).
   Resettable in Options. Glows the relevant pile, gates on actions.
   ============================================================ */
const TUT=[
 {t:'Willkommen bei <b>KLONDAIRE</b>! Eine kurze Einführung — tippe „Weiter".',btn:'Weiter'},
 {t:'Ziel: Karten auf die <b>BANK</b> legen und genug <b>CHIPS</b> sammeln, um das <b>ZIEL</b> oben zu erreichen.',btn:'Weiter',glow:'hud'},
 {t:'Tippe den verdeckten <b>Zieh-Stapel</b> an, um eine Karte aufzudecken.',gate:'stock',glow:'stock'},
 {t:'Oben rechts ist die <b>BANK</b> (4 Ablagen). Lege je Farbe A → 2 → … → K ab.',btn:'Weiter',glow:'bank'},
 {t:'Jetzt bank ein <b>Ass</b>: Karte antippen, dann die Bank antippen. (Doppeltipp geht auch.)',gate:'bank',glow:'bank'},
 {t:'Super! Jede gebankte Karte gibt <b>CHIPS × MULT</b>. Perks aus dem SHOP machen daraus Combos.',btn:'Weiter',glow:'hud'},
 {t:'Im Tableau stapelst du <b>absteigend & abwechselnd farbig</b> (rote 6 auf schwarze 7). Leere Spalten nehmen Könige.',btn:'Weiter'},
 {t:'Schaffst du das ZIEL, geht es in den SHOP. Ab jetzt spielst du frei — viel Erfolg!',btn:'Los!'},
];
function tutForceAce(){                 // guarantee a face-up Ace on column 0 for the bank step
  const t0=G.tab[0]&&G.tab[0][0]; if(!t0||t0.r===1)return;
  let src=null;
  for(let c=1;c<7&&!src;c++){for(const card of G.tab[c])if(card.r===1){src=card;break;}}
  if(!src){for(const card of G.stock)if(card.r===1){src=card;break;}}
  if(src){const s=src.s;src.r=t0.r;src.s=t0.s;t0.r=1;t0.s=s;}
}
function tutShow(){
  const step=TUT[G.tutStep]; if(!step){endTutorial();return;}
  G.tutGlow=step.glow||null;
  $('tuttext').innerHTML=step.t;
  $('tutact').innerHTML=step.btn?'<button class="btn gold" data-tut="next" style="flex:0;padding:9px 16px">'+step.btn+'</button>':'<div class="tuthint">↑ mach den gezeigten Zug</div>';
  $('tutbox').hidden=false; render();
}
function tutNext(){G.tutStep++;if(G.tutStep>=TUT.length)endTutorial();else tutShow();}
function tutGate(action){if(G.tutorial){const step=TUT[G.tutStep];if(step&&step.gate===action)tutNext();}}
function endTutorial(){G.tutorial=false;G.tutGlow=null;$('tutbox').hidden=true;Store.data.meta.tutDone=true;Store.save();render();}
function tutHide(){$('tutbox').hidden=true;G.tutGlow=null;}
function onClick(e){
  if(G.phase!=='play')return;
  const ac=e.target.closest('[data-act]');if(ac&&ac.dataset.act==='autoclear'){autoCollect();return;}
  const el=e.target.closest('[data-pile]');if(!el)return;
  const p=el.dataset.pile,col=el.dataset.col!==undefined?+el.dataset.col:null,idx=el.dataset.idx!==undefined?+el.dataset.idx:null,suit=el.dataset.suit!==undefined?+el.dataset.suit:null;
  if(p==='tab'||p==='waste'){
    const tapId=p+':'+col+':'+idx, now=Date.now();
    if(G._dt&&G._dt.id===tapId&&now-G._dt.t<350){G._dt=null;if(tryQuickFound(p,col,idx))return;}
    else G._dt={id:tapId,t:now};
  }
  if(p==='stock'){handleStock();return;}
  if(!G.sel){
    if(p==='waste'){selWaste();}
    else if(p==='found'&&suit!==null){if(G.found[suit].length)G.sel={p:'found',suit:suit};}   // pick up from the Bank
    else if(p==='tab'&&idx>=0){const c=G.tab[col][idx];if(c.up&&validSeq(G.tab[col].slice(idx)))G.sel={p:'tab',col,idx};}
    render();return;
  }
  if(p==='waste'&&G.sel.p==='waste'){G.sel=null;render();return;}
  if(p==='tab'&&same('tab',col,idx)){G.sel=null;render();return;}
  if(p==='found'&&G.sel.p==='found'&&G.sel.suit===suit){G.sel=null;render();return;}
  const cs=moving();
  if(p==='found'){
    if(G.sel.p==='found'){G.sel=null;render();return;}        // a Bank card can't go onto the Bank
    if(cs.length===1&&canFound(cs[0],suit))doFound(suit);else shake();return;
  }
  if(p==='tab'){
    if(canTab(cs,col)){doTab(col);return;}
    const c=idx>=0?G.tab[col][idx]:null;
    if(c&&c.up&&validSeq(G.tab[col].slice(idx))){G.sel={p:'tab',col,idx};render();return;}
    shake();return;
  }
  if(p==='waste'){G.sel=null;selWaste();render();return;}
}
/* AUTO-collect removed by design: the player banks every card by hand. */
function anyMove(){
  if(G.stock.length)return true;
  if(G.rec>0&&G.waste.length)return true;
  const tops=[];if(G.waste.length)tops.push(G.waste[G.waste.length-1]);
  for(let c=0;c<7;c++){const t=G.tab[c];if(t.length&&t[t.length-1].up)tops.push(t[t.length-1]);}
  for(const c of tops)if(canFound(c))return true;
  for(let c=0;c<7;c++){const t=G.tab[c];for(let i=0;i<t.length;i++){if(t[i].up&&validSeq(t.slice(i))){const run=t.slice(i);for(let d=0;d<7;d++)if(d!==c&&canTab(run,d))return true;}}}
  if(G.waste.length){const w=[G.waste[G.waste.length-1]];for(let d=0;d<7;d++)if(canTab(w,d))return true;}
  return false;
}
function checkStuck(){render();if(G.phase==='play'&&G.chips<G.target&&!anyMove())gameOver();}
function check(){
  const done=G.found.every(f=>f.length===13);
  if(done){roundClear(true);return;}
  if(G.chips>=G.target){roundClear(false);return;}
  render();if(!anyMove())gameOver();
}
function showVictory(rewardHtml){
  showOv('<h3 style="color:var(--gold)">RUN GEWONNEN!</h3>'+
    '<div class="sub">ANTE '+G.ante+' GESCHAFFT &middot; CHIPS GESAMT '+RUN.totalChips+'<br>HIGHSCORE · BESTE ANTE '+Store.data.stats.bestAnte+'</div>'+
    (rewardHtml||'')+
    '<div style="display:flex;gap:6px;width:100%"><button class="btn gold" data-act="endless" style="flex:1.5">ENDLOS WEITER &#8599;</button><button class="btn" data-act="winmenu" style="flex:1">HAUPTMENÜ</button></div>');
}
function roundClear(cleared){
  G.phase='clear';
  if(G.tutorial){G.tutorial=false;Store.data.meta.tutDone=true;tutHide();}   // finish tutorial if it was still running
  const earned=G.chips;
  // ---- record this round into run history + persistent stats ----
  G.history.push({ante:G.ante,chips:earned,target:G.target,cleared:cleared,boss:G.boss?G.boss.id:null});
  if(earned>RUN.bestRound)RUN.bestRound=earned;
  if(earned>Store.data.stats.bestChips){Store.data.stats.bestChips=earned;RUN.newBestChips=true;}
  if(cleared)Store.data.stats.boardClears++;
  if(G.boss&&(cleared||earned>=G.target)&&Store.data.stats.bossesBeaten.indexOf(G.boss.id)<0)
    Store.data.stats.bossesBeaten.push(G.boss.id);
  Store.save();
  // ---- reward (unchanged economy) ----
  const interest=G.dd&&G.dd.noInt?0:Math.min(G.perks.includes('deepinterest')?8:5,Math.floor(G.coins/5));
  const perf=Math.floor(earned/40);
  const bonus=cleared?6:0;
  const bounty=G.boss?8*((G.deck&&G.deck.bossBountyMul)||1):0;
  const reward=Math.max(0,3+(G.deck?G.deck.rewardDelta:0)+(G.perks.includes('richbank')?2:0)+perf+interest+bonus+bounty);
  G.coins+=reward;
  evalAch();
  cloudSync();   // sync progress after each cleared round
  SFX.win();
  const base=3+(G.deck?G.deck.rewardDelta:0)+(G.perks.includes('richbank')?2:0);
  const rows=[['Grundbelohnung',base],['Punkte (1 je 40 Chips)',perf],['Zinsen (1 je 5 Coins)',interest]];
  if(cleared)rows.push(['Board geräumt',6]);
  if(bounty)rows.push(['Boss besiegt',bounty]);
  const rh=rows.map(r=>'<div class="rr"><span class="rl">'+r[0]+'</span><span class="rv">+'+r[1]+'</span></div>').join('');
  if(G.ante>=WIN_ANTE && !G.endless){            // ---- RUN WON ----
    if(!RUN.won){RUN.won=true;Store.data.stats.wins=(Store.data.stats.wins||0)+1;var du=Store.data.meta.difficultyUnlocked||0;if(du<7){Store.data.meta.difficultyUnlocked=du+1;}Store.save();evalAch();}
    showVictory('<div class="rwd">'+rh+'<div class="rtot"><span>BELOHNUNG</span><span>+'+reward+' COINS</span></div></div>');
    render();return;
  }
  showOv('<h3 style="color:var(--gold)">'+(G.boss?'BOSS BESIEGT!':(cleared?'BOARD GERÄUMT!':'RUNDE GESCHAFFT'))+'</h3>'+
    '<div class="sub">CHIPS '+earned+' / '+G.target+'</div>'+
    '<div class="rwd">'+rh+'<div class="rtot"><span>BELOHNUNG</span><span>+'+reward+' COINS</span></div></div>'+
    '<button class="btn gold" data-act="shop" style="flex:0;padding:11px 18px">SHOP ÖFFNEN &#8599;</button>');
  render();
}
function openShop(){
  G.phase='shop';
  const avail=POOL.filter(p=>!G.perks.includes(p.id));
  G.offers=shuffle(avail.slice()).slice(0,3);
  G.specialOffer=(G.dd&&G.dd.noSpec)?null:(Math.random()<0.45)?SPECIALS[Math.floor(Math.random()*SPECIALS.length)].id:null;  // luck-based special
  renderShop();
  saveGame();
}
function renderShop(){
  const spen=G.dd?G.dd.shopPen:0;
  const owned=G.perks.map(id=>{const p=POOL.find(x=>x.id===id);return '<span class="tag-pill '+(p.m?'m':'')+'">'+p.name+'</span>';}).join('');
  const rows=G.offers.map((p,i)=>{const pr=p.price+spen;const aff=G.coins>=pr;
    return '<div class="perk '+(p.m?'mlt':'')+'"><div><div class="pn">'+p.name+'</div><div class="pd">'+p.desc+'</div></div><button class="buy" data-buy="'+i+'" '+(aff?'':'disabled')+'>'+pr+' COINS</button></div>';}).join('')||'<div class="sub">SOLD OUT — NICE COLLECTION</div>';
  let specRow='';
  if(G.specialOffer&&!(G.dd&&G.dd.noSpec)){const sp=SPECIAL(G.specialOffer),pr=sp.price+spen,aff=G.coins>=pr;specRow='<div class="perk spec"><div><div class="pn">'+sp.mark+' '+sp.name+' <span style="color:#7a5c00">(SPEZIAL)</span></div><div class="pd">'+sp.desc+'</div></div><button class="buy" data-spec-buy="'+sp.id+'" '+(aff?'':'disabled')+'>'+pr+' COINS</button></div>';}
  const nb=((G.deck&&G.deck.bossEveryAnte)||(G.ante+1)%3===0)?' ·BOSS':'';
  let rerollBtn='';
  if(!(G.deck&&G.deck.noReroll)){
    const free=!!(G.deck&&G.deck.freeReroll), cost=free?0:1;
    const dis=(G.coins>=cost&&G.offers.length)?'':'disabled';
    rerollBtn='<button class="btn" data-act="reroll" '+dis+' style="flex:1">REROLL '+(free?'GRATIS':'1 COIN')+'</button>';
  }
  showOv('<h3 style="color:var(--mint)">SHOP — '+G.coins+' COINS</h3>'+
    '<div class="shop">'+rows+specRow+'</div>'+
    (owned?'<div class="owned">'+owned+'</div>':'')+
    '<div style="display:flex;gap:6px;width:100%;margin-top:2px">'+
      rerollBtn+
      '<button class="btn gold" data-act="next" style="flex:1.4">DEAL ANTE '+(G.ante+1)+nb+' &#8599;</button>'+
    '</div>');
}
function buy(i){const p=G.offers[i];if(!p||G.coins<p.price)return;G.coins-=p.price;G.perks.push(p.id);G.offers.splice(i,1);SFX.buy();evalAch();renderShop();render();}
function buySpecial(id){const sp=SPECIAL(id);if(!sp||G.specialOffer!==id||G.coins<sp.price)return;G.coins-=sp.price;(G.specials=G.specials||[]).push(id);G.specialOffer=null;SFX.buy();renderShop();render();}
function reroll(){if(G.deck&&G.deck.noReroll)return;const cost=(G.deck&&G.deck.freeReroll)?0:1;if(G.coins<cost||!G.offers.length)return;G.coins-=cost;const avail=POOL.filter(p=>!G.perks.includes(p.id));G.offers=shuffle(avail.slice()).slice(0,3);SFX.click();renderShop();render();}

/* ---- ITEMS: in-game view of owned perks + active deck + boss ---- */
function showItems(){
  if(G.phase!=='play')return;
  const perks=(G.perks||[]).map(id=>{const p=POOL.find(x=>x.id===id);return p?'<div class="perk'+(p.m?' mlt':'')+'"><div><div class="pn">'+p.name+'</div><div class="pd">'+p.desc+'</div></div></div>':'';}).join('')
    ||'<div class="sub">NOCH KEINE ITEMS — KAUFE PERKS IM SHOP</div>';
  const deck=G.deck?'<div class="ideck"><b>DECK · '+G.deck.name+'</b><br>'+G.deck.desc+'</div>':'';
  const boss=G.boss?'<div class="iboss">BOSS · '+G.boss.name+' — '+G.boss.desc+'</div>':'';
  const specs=(G.specials||[]).length?'<div class="ispec"><b>SPEZIALKARTEN ('+G.specials.length+')</b><br>'+G.specials.map(id=>{const sp=SPECIAL(id);return sp?sp.mark+' '+sp.name:'?';}).join(' · ')+'</div>':'';
  showOv('<h3 style="color:var(--mint)">DEINE ITEMS</h3>'+
    '<div class="items-list">'+deck+boss+specs+perks+'</div>'+
    '<button class="btn gold" data-act="items-close" style="flex:0;padding:11px 18px">'+svg('back')+' ZURÜCK</button>');
}

/* ---- in-game help: subtle explanations of the scoring terms ---- */
function showHelp(){
  if(G.phase!=='play')return;
  const intro='<div class="hrow formula"><div class="hk">ZIEL DES SPIELS</div><div class="hv">Räume die Karten ab und „banke" sie auf die vier Ablagen oben (die BANK). Jede gebankte Karte gibt Chips. Erreiche das ZIEL an Chips, bevor dir die Züge ausgehen.</div></div>';
  const terms=[
    ['BANK','Die vier Ablagen oben rechts. Lege je Farbe A → 2 → 3 … bis K ab. „Banken" = eine Karte dorthin legen und Chips kassieren.'],
    ['ZIEL','Die Chip-Zahl hinter dem „/" oben. So viele Chips musst du in dieser Runde sammeln, um sie zu schaffen.'],
    ['CHIPS','Dein aktueller Punktestand in der Runde (vor dem „/").'],
    ['MULT','Multiplikator. Eine gebankte Karte zählt: ihre Chips × MULT.'],
    ['ANTE','Die aktuelle Stufe/Runde. Jede 3. Ante ist ein Boss mit Spezialregel.'],
    ['COINS','Währung für den Shop zwischen den Runden (Perks kaufen).'],
    ['RECYCLE','Wie oft du den verbrauchten Zieh-Stapel neu durchgehen darfst (Zähler oben). Leeren Stapel antippen = recyceln.'],
  ];
  const list=terms.map(t=>'<div class="hrow"><div class="hk">'+t[0]+'</div><div class="hv">'+t[1]+'</div></div>').join('');
  const formula='<div class="hrow formula"><div class="hk">SCORE = BASIS-CHIPS × MULT</div><div class="hv">Jede gebankte Karte: Basis-Chips (10) × MULT. Perks erhöhen Basis-Chips oder MULT — so „explodiert" dein Score statt nur zu addieren.</div></div>';
  const keys='<div class="hrow"><div class="hk">STEUERUNG</div><div class="hv">Karte antippen → aufheben, Ziel antippen → ablegen. Leertaste = nächste Karte ziehen. Doppelklick/-tipp auf eine Karte = direkt auf die Bank.</div></div>';
  showOv('<h3 style="color:var(--mint)">SPIELHILFE</h3>'+
    '<div class="help-list">'+intro+list+formula+keys+'</div>'+
    '<button class="btn gold" data-act="items-close" style="flex:0;padding:11px 18px">'+svg('back')+' ZURÜCK</button>');
}

/* double-tap / double-click a card -> straight to its foundation (speed play) */
function tryQuickFound(p,col,idx){   // double-tap auto-bank; wild cards are placed manually, so skip them here
  if(p==='waste'){if(!G.waste.length)return false;const c=G.waste[G.waste.length-1];if(!c.joker&&canFound(c)){G.sel={p:'waste'};doFound(c.s);return true;}return false;}
  if(p==='tab'){const t=G.tab[col];if(!t.length||idx!==t.length-1)return false;const c=t[idx];if(c.up&&!c.joker&&canFound(c)){G.sel={p:'tab',col,idx};doFound(c.s);return true;}return false;}
  return false;
}

/* ---- META: convert a finished run into persistent VOLT ----
   Earned from PROGRESS (ante reached + bosses beaten + board clears) so a
   losing run still pays out. Boss Rush deck doubles the boss share (bossVoltMul). */
function awardVolt(){
  const bosses=G.history.filter(h=>h.boss&&!h.failed).length; // boss rounds actually beaten
  const clears=G.history.filter(h=>h.cleared).length;         // full board clears
  const bmul=(G.deck&&G.deck.bossVoltMul)||1;
  const v=G.ante+3*bosses*bmul+clears;
  Store.data.meta.volt+=v;
  RUN.voltEarned=v;
  Store.save();
}

/* ---- GAME OVER: record, persist, render visualization, switch scene ---- */
function gameOver(){
  G.phase='over';
  if(G.tutorial){G.tutorial=false;Store.data.meta.tutDone=true;tutHide();}
  G.history.push({ante:G.ante,chips:G.chips,target:G.target,cleared:false,boss:G.boss?G.boss.id:null,failed:true});
  if(G.chips>RUN.bestRound)RUN.bestRound=G.chips;
  if(G.chips>Store.data.stats.bestChips){Store.data.stats.bestChips=G.chips;RUN.newBestChips=true;}
  if(RUN.totalChips>Store.data.stats.bestRunChips)Store.data.stats.bestRunChips=RUN.totalChips;
  Store.save();
  evalAch();
  awardVolt();
  cloudSync();   // sync final progress (VOLT/stats) at game over
  runActive=false;clearSave();
  SFX.lose();
  renderGameOver();
  showScene('over');
}

function showOv(html){const o=$('overlay');o.innerHTML=html;o.classList.remove('hidden');}
function hideOv(){$('overlay').classList.add('hidden');}
function fitCards(){const inner=$('stage').clientWidth-16;let cw=Math.floor((inner-6*4)/7);cw=Math.max(34,Math.min(cw,60));const ch=Math.round(cw*1.36);const r=document.documentElement.style;r.setProperty('--cw',cw+'px');r.setProperty('--ch',ch+'px');r.setProperty('--fanUp',(-Math.round(ch*0.7))+'px');r.setProperty('--fanDn',(-Math.round(ch*0.8))+'px');}
function cardEl(c,attr,extra){if(!c.up)return '<div class="card down '+(extra||'')+'" '+attr+'></div>';if(c.special){const sp=SPECIAL(c.special),mk=sp?sp.mark:'?';return '<div class="card spec '+(extra||'')+'" '+attr+'><span class="cn">'+mk+'</span><span class="pip">'+mk+'</span></div>';}return '<div class="card '+(RED(c.s)?'red':'blk')+' '+(extra||'')+'" '+attr+'><span class="cn">'+RANKS[c.r]+suitSvg(c.s)+'</span><span class="pip">'+suitSvg(c.s)+'</span></div>';}
function autoCollect(){
  if(!canAutoCollect())return;
  G.sel=null;
  var ids=setInterval(function(){
    for(var c=0;c<7;c++){
      var col=G.tab[c];
      if(!col.length)continue;
      var top=col[col.length-1];
      if(top.up&&!top.joker){
        var s=top.s;
        if(canFound(top,s)){
          G.found[s].push(col.pop());
          flip(col);
          bankGain(top);
          render();
          if(!canAutoCollect()){clearInterval(ids);check();}
          return;
        }
      }
    }
    clearInterval(ids);check();
  },120);
}
function canAutoCollect(){
  if(G.phase!=='play'||!G.tab)return false;
  for(var c=0;c<7;c++){var col=G.tab[c];if(!col.length)continue;if(!col.every(function(card){return card.up;}))return false;if(!validSeq(col))return false;}
  return true;
}

function render(){
  if($('scene-game').hidden)return;
  $('ante').textContent=G.ante;
  $('tgt').textContent=G.target;
  $('coins').textContent=G.coins;
  $('recnum').textContent=G.rec;
  const _rc=$('recchip'),_lastRec=(G.rec===0); _rc.classList.toggle('last',_lastRec); $('reclast').hidden=!_lastRec;
  const _uc=undoCost();$('undocost').textContent=_uc;$('undobtn').classList.toggle('off',!!(G.dd&&G.dd.noUndo)||!(G.phase==='play'&&G.undo&&G.undo.length>0&&G.coins>=_uc));
  $('mult').textContent='×'+effMult().toFixed(1);
  const ch=$('chips');ch.textContent=G.chips;
  if(G.chips>G._last){ch.classList.remove('pulse');void ch.offsetWidth;ch.classList.add('pulse');}
  G._last=G.chips;
  const bs=$('bossstrip');
  if(G.boss){bs.classList.remove('hidden');bs.innerHTML='BOSS · '+G.boss.name+' — '+G.boss.desc;}else bs.classList.add('hidden');
  $('hud').classList.toggle('tutglow',G.tutGlow==='hud');
  const _bg=G.tutGlow==='bank'?' tut-glow':'';
  let f='';for(let s=0;s<4;s++){const fo=G.found[s];if(fo.length){const fsel=(G.sel&&G.sel.p==='found'&&G.sel.suit===s)?'sel':'';f+=cardEl(fo[fo.length-1],'data-pile="found" data-suit="'+s+'"',fsel+_bg);}else f+='<div class="slot'+_bg+'" data-pile="found" data-suit="'+s+'">'+suitSvg(s)+'</div>';}
  let w;if(G.waste.length){const sel=G.sel&&G.sel.p==='waste'?'sel':'';w=cardEl(G.waste[G.waste.length-1],'data-pile="waste"',sel);}else w='<div class="slot" data-pile="waste"></div>';
  let st;const _sg=G.tutGlow==='stock'?' tut-glow':'';if(G.stock.length)st='<div class="card down'+_sg+'" data-pile="stock"></div>';else st='<div class="slot'+_sg+'" data-pile="stock">'+(G.rec>0?svg('recycle'):svg('close'))+'</div>';
  let tb='';for(let c=0;c<7;c++){const col=G.tab[c];let inner='';if(col.length===0){inner='<div class="slot" data-pile="tab" data-col="'+c+'" data-idx="-1"></div>';}else{col.forEach((card,i)=>{const fanCls=i===0?'':(card.up?'fan':'fan dn');const selThis=G.sel&&G.sel.p==='tab'&&G.sel.col===c&&i>=G.sel.idx?'sel':'';inner+=cardEl(card,'data-pile="tab" data-col="'+c+'" data-idx="'+i+'"',fanCls+' '+selThis);});}
    tb+='<div class="col">'+inner+'</div>';}
  let autoBtn=canAutoCollect()?'<div class="auto-clear" data-act="autoclear">'+svg('star')+' AUTO-RÄUMEN</div>':'';
  $('board').innerHTML='<div id="top"><div class="founds">'+f+'</div><div class="spacer"></div>'+st+w+'</div><div id="tab">'+tb+'</div>'+autoBtn;
  saveGame(); evalAch();   // persist + check achievements after every state change
}

/* ============================================================
   SCENE MANAGER  -  menu / game / ach / opts / over / bye
   ============================================================ */
function showScene(name){
  document.querySelectorAll('.scene').forEach(s=>s.hidden=true);
  const el=$('scene-'+name); if(el)el.hidden=false;
  if(name==='menu'){renderMenu();renderPostit();}
  else if(name==='ach')renderAch();
  else if(name==='opts')renderOpts();
  else if(name==='decks')renderDecks();
  else if(name==='news')renderNews();
  else if(name==='cloud')renderCloud();
  else if(name==='rang')renderRang();
  else if(name==='faq')renderFAQ();
  $('postit').style.display=(name==='menu')?'block':'none';   // sticky note only on the menu
  Music.setMode(name==='game'?'run':'menu');                  // run playlist in-game, menu track elsewhere
  applyScale();   // recompute fit-to-window for the now-visible scene height
}
function renderNews(){
  $('news-list').innerHTML=PATCH_NOTES.map(p=>
    '<div class="patch"><h4>'+p.v+(p.date?'<span class="dt">'+p.date+'</span>':'')+'</h4><ul>'+
    p.notes.map(n=>'<li>'+n+'</li>').join('')+'</ul></div>'
  ).join('')||'<div class="ach-prog">NOCH KEINE EINTRÄGE</div>';
}
const FAQ=[
  {q:'Was ist Klondaire?',a:'Ein Roguelike-Solitär – kombiniert klassisches Klondike mit Balatro-artigem Chip/Mult-Scoring. Baue Karten auf die Bank, sammle Chips, erreiche das Ziel und kaufe Perks im Shop.'},
  {q:'Wie funktioniert das Scoring?',a:'Jede gebankte Karte gibt BASIS-CHIPS × MULT. Basis-Chips starten bei 10 und werden durch Perks erhöht. MULT startet bei 1.0 und steigt durch Perks wie FIEBER, COMBO und ASS-MULT. Dein Ziel ist es, mit diesen Chips das ANTE-ZIEL zu erreichen.'},
  {q:'Was sind Antes?',a:'Antes sind die Runden. Mit jedem Sieg steigt die Ante und das Ziel wird höher. Jede 3. Ante ist ein Boss mit einer Spezialregel, die es schwerer macht.'},
  {q:'Was sind Perks?',a:'Perks sind passive Upgrades, die du im SHOP zwischen den Runden kaufst. Sie erhöhen Chips oder MULT. Manche Perks sind permanent (m), andere wirken jede Runde neu.'},
  {q:'Was sind Bosse?',a:'Bosse erscheinen alle 3 Antes. Jeder Boss hat eine negative Regel: z.B. STEUER (+40% Ziel), DÜRRE (nur 1 Recycle), HALBE KRAFT (alle Chips halbiert). Bosse besiegen gibt extra Belohnung.'},
  {q:'Was ist VOLT?',a:'VOLT ist die persistente Währung, die du nach jedem Run bekommst – auch wenn du verlierst. Damit kaufst du neue Decks im DECKS-Menü. Erfolge geben einmalig VOLT dazu.'},
  {q:'Wie schalte ich Decks frei?',a:'Im DECKS-Menü kaufst du Decks mit VOLT. Jedes Deck hat Vor- und Nachteile. Das BOSS-STURM-Deck wird durch den Erfolg THRONRÄUBER freigeschaltet.'},
  {q:'Was bedeuten die Schwierigkeitsgrade?',a:'Nach einem Sieg (Ante 8) schaltest du den nächsten Schwierigkeitsgrad frei. Höhere Grade erhöhen das Ziel, reduzieren Coins/Recycles, schalten Zinsen oder Undo aus – und bringen Bosse öfter.'},
  {q:'Was passiert nach Ante 8?',a:'Ante 8 zu schaffen = RUN GEWONNEN. Du kannst im ENDLOS-Modus weiterspielen, um deinen Highscore zu verbessern. Oder du gehst ins Hauptmenü und startest mit einem höheren Schwierigkeitsgrad.'},
  {q:'Wie funktioniert der Cloud-Save?',a:'Aktiviere die Cloud im CLOUD-Menü mit einem Benutzernamen. Du bekommst einen 8-stelligen Code. Dein Fortschritt wird automatisch nach jeder Runde gespeichert. Mit dem Code lädst du ihn auf jedem Gerät.'},
  {q:'Was sind Spezialkarten?',a:'Spezialkarten (Joker, Goldkarte, Mult-Karte) tauchen zufällig im Shop auf. Sie sind WILD – überall anlegbar – und geben Bonus-Chips oder MULT. Sie wachsen deinem Deck dauerhaft bei.'},
];
function renderFAQ(){
  $('faq-list').innerHTML=FAQ.map(function(f,i){
    return '<div class="faq-item" data-faq="'+i+'"><div class="faq-q">'+f.q+'</div><div class="faq-a">'+f.a+'</div></div>';
  }).join('');
}
function clStatus(msg,ok){const s=$('cl-status');if(!s)return;s.textContent=msg;s.style.color=(ok===false)?'var(--pink)':(ok?'var(--mint)':'#8fbfa6');}
function renderCloud(){
  const m=Store.data.meta; let h='';
  if(m.cloudCode){
    h+='<div class="cloud-card"><div class="cl-lbl">DEIN CODE</div><div class="cl-code">'+m.cloudCode+'</div>'+
       '<div class="cl-sub">Benutzer: '+(m.cloudName||'—')+'<br>Wird automatisch nach jeder Runde gespeichert.</div>'+
       '<button class="btn" data-act="cl-copy" style="flex:0;padding:9px 14px">CODE KOPIEREN</button></div>';
  }else{
    h+='<div class="cloud-card"><div class="cl-lbl">CLOUD AKTIVIEREN</div>'+
       '<div class="cl-sub">Benutzername wählen → du bekommst einen 8-stelligen Code zum Sichern & Übertragen.</div>'+
       '<input class="cloud-in" id="cl-name" maxlength="24" placeholder="BENUTZERNAME">'+
       '<button class="btn gold" data-act="cl-activate" style="flex:0;padding:10px 16px">CODE ERSTELLEN</button></div>';
  }
  h+='<div class="cloud-card"><div class="cl-lbl">MIT CODE LADEN</div>'+
     '<div class="cl-sub">Code von einem anderen Gerät / einer alten Version eingeben.</div>'+
     '<input class="cloud-in" id="cl-code" maxlength="8" placeholder="CODE" autocapitalize="characters" autocomplete="off">'+
     '<button class="btn" data-act="cl-load" style="flex:0;padding:10px 16px">LADEN</button>'+
     '<div class="cl-warn">Überschreibt den Fortschritt auf diesem Gerät.</div></div>';
  if(m.cloudCode)h+='<button class="opt-reset" data-act="cl-disconnect" style="border-color:#2c5a43;background:#0d2419;color:var(--mint)">CLOUD TRENNEN (lokal bleibt)</button>';
  h+='<div class="cl-status" id="cl-status"></div>';
  $('cloud-body').innerHTML=h;
}
function renderRang(){
  var body=$('rang-body');
  body.innerHTML='<div class="ach-prog" style="color:#8fbfa6">Lade …</div>';
  clRpc('kl_leaderboard',{p_limit:50}).then(function(rows){
    if(!rows||!rows.length){
      body.innerHTML='<div class="ach-prog" style="color:#8fbfa6">Noch keine Einträge – spiel eine Runde mit aktivierter Cloud!</div>';
      return;
    }
    body.innerHTML=rows.map(function(r,i){
      var rank=r.rank||(i+1);
      var st=rank===1?'color:var(--gold)':(rank===2?'color:#c0c0c0':(rank===3?'color:#cd7f32':''));
      var cls=(r.username===Store.data.meta.cloudName)?' lb-me':'';
      return '<div class="lb-row'+cls+'"><span class="lb-rank" style="'+st+'">'+rank+'</span><span class="lb-name">'+r.username+'</span><span class="lb-score">ANTE '+r.best_ante+' · '+(r.best_chips||0).toLocaleString('de-DE')+' CHIPS</span></div>';
    }).join('');
  }).catch(function(){
    body.innerHTML='<div class="ach-prog" style="color:var(--pink)">Rangliste nicht erreichbar – bist du online?</div>';
  });
}

/* the menu post-it shows the latest version + its first 5 points */
function renderPostit(){
  const p=PATCH_NOTES[0];
  if(!p){$('postit').style.display='none';return;}
  $('postit-ver').textContent='NEU · '+p.v;
  $('postit-list').innerHTML=p.notes.slice(0,2).map(n=>'<li>'+n+'</li>').join('');
  $('postit-more').style.display='block';   // always show the tear-off fringe (laschen)
  const tear=document.querySelector('#postit-more .pt-tear'); if(tear)tear.style.display=(p.notes.length>2)?'block':'none';  // "und noch mehr" only when there's more
  document.querySelectorAll('#postit-fringe span.torn').forEach(s=>s.classList.remove('torn')); // regrow tabs
}
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
function tearTab(tab){
  if(!tab||tab.classList.contains('torn'))return;
  tab.classList.add('torn');
  const last=$('postit-fringe').querySelectorAll('span:not(.torn)').length===0;
  if(last)SFX.tone(200,0.18,'sawtooth',0.20);else SFX.buy();
  const n=document.createElement('div');
  n.className='pt-fortune'+(last?' mean':'');
  n.textContent=last?MEAN[Math.floor(Math.random()*MEAN.length)]:FORTUNES[Math.floor(Math.random()*FORTUNES.length)];
  $('postit').appendChild(n);
  setTimeout(function(){n.remove();},last?3400:2700);
  if(!Store.data.stats.souvenir){Store.data.stats.souvenir=true;Store.save();evalAch();}
}

function renderMenu(){
  const s=Store.data.stats;
  $('m-bestante').textContent=s.bestAnte||'-';
  $('m-achcount').textContent=Store.data.ach.length+'/'+ACHIEVEMENTS.length;
  $('m-volt').textContent=Store.data.meta.volt;
  $('m-deck').textContent=DECK(Store.data.meta.selectedDeck).name;
  $('m-wins').textContent=Store.data.stats.wins||0;
  $('btn-resume').hidden=!(runActive||hasSave());   // show FORTSETZEN for a paused run or a saved one
  $('menu-build').textContent='build '+((PATCH_NOTES[0]&&PATCH_NOTES[0].v)||'?');
  $('iostip').hidden=true;             // close the iPhone tip when (re)entering the menu
  // difficulty selector
  var du=Store.data.meta.difficultyUnlocked||0,sel=Store.data.meta.selectedDifficulty||0;
  var dr=$('diff-row');
  if(dr){dr.hidden=!(du>0);}
  var dh=$('diff-holder');
  if(!dh)return;
  if(du>0){dh.hidden=false;
    dh.innerHTML=DIFFICULTIES.map(function(d,i){
      var locked=i>du?' diff-locked':'',active=i===sel?' diff-active':'';
      return '<span class="diff-dot'+locked+active+'" data-diff="'+i+'" title="'+d.lab+'">'+(i<=du?i:'?')+'</span>';
    }).join('');
  }else{dh.hidden=true;}
  var dd=$('diff-desc');
  if(dd){
    if(du>0){
      var d0=DIFFICULTIES[sel];
      var pts=[];
      if(d0.targetMul>1)pts.push((d0.targetMul*100-100).toFixed(0)+'% ZIEL');
      if(d0.coinPen)pts.push(d0.coinPen+' COIN');
      if(d0.recPen)pts.push(d0.recPen+' RECYCLE');
      if(d0.noInt)pts.push('KEINE ZINSEN');
      if(d0.noUndo)pts.push('KEIN UNDO');
      if(d0.bossEA)pts.push('BOSS JEDE ANTE');
      if(d0.shopPen)pts.push('SHOP +'+d0.shopPen);
      if(d0.noSpec)pts.push('KEINE SPEZIALK.');
      if(d0.basePen)pts.push('MULT -'+d0.basePen);
      dd.textContent=d0.name+' — '+(pts.length?pts.join(', '):'KEINE MODIFIKATOREN');
    }else{dd.textContent='';}
  }
}

function renderDecks(){
  const m=Store.data.meta;
  $('deck-volt').textContent=m.volt;
  $('deck-grid').innerHTML=DECKS.map(d=>{
    const unlocked=m.decksUnlocked.includes(d.id), sel=m.selectedDeck===d.id;
    let act;
    if(sel)act='<span class="deck-aktiv">AKTIV</span>';
    else if(unlocked)act='<button class="buy" data-deck-sel="'+d.id+'">WÄHLEN</button>';
    else if(d.unlockVia){const a=ACHIEVEMENTS.find(x=>x.id===d.unlockVia);act='<span class="deck-aktiv" style="color:#7fae98;border-color:#355">'+svg('lock')+' '+(a?a.name:d.unlockVia)+'</span>';}
    else act='<button class="buy" data-deck-buy="'+d.id+'"'+(m.volt>=d.cost?'':' disabled')+'>'+d.cost+' '+svg('volt')+'</button>';
    return '<div class="perk'+(sel?' sel':'')+(unlocked?'':' lock')+'">'+
      '<div><div class="pn">'+d.name+'</div><div class="pd">'+d.desc+'</div></div>'+act+'</div>';
  }).join('');
}

function renderAch(){
  const got=Store.data.ach;
  $('ach-count').textContent=got.length+'/'+ACHIEVEMENTS.length;
  $('ach-fill').style.width=Math.round(got.length/ACHIEVEMENTS.length*100)+'%';
  $('ach-grid').innerHTML=ACHIEVEMENTS.map(a=>{
    const on=got.indexOf(a.id)>=0;
    return '<div class="ach '+(on?'on':'off')+'">'+
      '<div class="ach-ic">'+(on?IC.trophy:IC.lock)+'</div>'+
      '<div><div class="ach-nm">'+a.name+'</div><div class="ach-ds">'+a.desc+'</div></div></div>';
  }).join('');
}

function renderOpts(){
  const o=Store.data.opts;
  const cr=Math.round((o.crt||0)*100);
  $('opt-crt').value=cr; $('crt-pct').textContent=cr+'%';
  const fb=$('opt-fit'); fb.textContent=o.fit?'AN':'AUS'; fb.classList.toggle('on',!!o.fit);
  const sp=Math.round(o.sfxVol*100), mp=Math.round(o.musicVol*100);
  $('opt-sfx').value=sp; $('sfx-pct').textContent=sp+'%';
  $('opt-musicvol').value=mp; $('music-pct').textContent=mp+'%';
  document.querySelectorAll('#scaleset .sbtn').forEach(b=>b.classList.toggle('on',!o.fit&&parseFloat(b.dataset.scale)===(o.scale||1)));
  $('scaleset').classList.toggle('disabled',!!o.fit);
  // theme rendering
  var selTheme=Store.data.meta.selectedTheme||'neon';
  $('theme-set').innerHTML=Object.keys(THEMES).map(function(k){
    var t=THEMES[k];
    var active=k===selTheme?' theme-active':'';
    return '<button class="theme-btn'+active+'" data-theme="'+k+'" title="'+t.mint+'/'+t.gold+'/'+t.pink+'"><span class="theme-swatch" style="background:'+t.mint+'"></span>'+k.toUpperCase()+'</button>';
  }).join('');
}

function applyOpts(){ const v=Store.data.opts.crt||0; document.documentElement.style.setProperty('--crt-opacity',v); document.body.classList.toggle('crt-off',v===0); applyTheme(); }
function applyTheme(){
  var t=THEMES[Store.data.meta.selectedTheme]||THEMES.neon, app=$('app');
  if(!app)return;
  app.style.setProperty('--mint',t.mint);
  app.style.setProperty('--gold',t.gold);
  app.style.setProperty('--pink',t.pink);
  app.style.setProperty('--felt',t.felt);
  app.style.setProperty('--panel',t.panel);
  var bg=$('bgfx'),tint=$('bgtint');
  if(bg&&t.bg){
    var x0=hexRgb(t.bg[0]);
    bg.style.background=
      'radial-gradient(45% 45% at 28% 32%, rgba('+x0.r+','+x0.g+','+x0.b+',.70), transparent 70%),'+
      'radial-gradient(50% 50% at 76% 70%, rgba('+x0.r+','+x0.g+','+x0.b+',.60), transparent 72%),'+
      'radial-gradient(42% 42% at 60% 18%, rgba('+x0.r+','+x0.g+','+x0.b+',.40), transparent 75%)';
  }
  if(tint){tint.style.background='rgba('+hexRgb(t.bg[0]).r+','+hexRgb(t.bg[0]).g+','+hexRgb(t.bg[0]).b+',.65)';}
}
/* UI scaling. transform:scale keeps layout/clientWidth unscaled, so fitCards()
   is unaffected and the whole UI scales uniformly (text + cards + buttons). */
function applyScale(){
  const o=Store.data.opts, app=$('app');
  let s=o.scale||1;
  if(o.fit){
    const w=app.offsetWidth||440, h=app.offsetHeight||640;
    s=Math.min((window.innerWidth-8)/w,(window.innerHeight-8)/h);
    s=Math.max(0.5,Math.min(s,2.5));
  }
  app.style.transform='scale('+s+')';
}

/* ---- GAME OVER visualization ---- */
function renderGameOver(){
  const s=Store.data.stats, h=G.history;
  $('go-sub').innerHTML=(G.endless?'ENDLOSMODUS · ':'')+'RUN BEENDET — ANTE '+G.ante+(G.boss?' · BOSS':'')+'<br>'+
    'BENÖTIGT '+G.target+' · ERREICHT '+G.chips;
  // records
  const recs=[];
  const achV=(RUN.newAch||[]).reduce((sum,id)=>sum+(ACH_VOLT[id]||0),0);
  recs.push(svg('volt')+' +'+((RUN.voltEarned||0)+achV)+' VOLT &middot; GESAMT '+Store.data.meta.volt);
  if(RUN.newBestAnte)recs.push(svg('star')+' NEUER REKORD: ANTE '+G.ante);
  if(RUN.newBestChips)recs.push(svg('star')+' BESTE RUNDE: '+s.bestChips);
  $('go-records').innerHTML=recs.map(r=>'<span class="rec">'+r+'</span>').join('');
  // bar chart (height = chips/target, target line drawn at 1.0 of a 1.4 scale)
  $('go-chart').innerHTML='<div class="tline"><span>TARGET</span></div>'+h.map(r=>{
    const ratio=Math.max(0,Math.min(r.chips/r.target,1.4));
    const hp=(ratio/1.4*100).toFixed(1);
    const cls=r.failed?'fail':(r.boss?'boss':'win');
    return '<div class="bar"><div class="bwrap"><div class="bfill '+cls+'" style="height:'+hp+'%"></div></div><div class="blab">A'+r.ante+'</div></div>';
  }).join('');
  // stat tiles
  const tile=(k,v)=>'<div class="gs"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>';
  $('go-stats').innerHTML=
    tile('RUNDEN',h.length)+
    tile('CHIPS GESAMT',RUN.totalChips)+
    tile('BESTE RUNDE',RUN.bestRound)+
    tile('PERKS',G.perks.length);
  // achievements unlocked this run
  const na=RUN.newAch.map(id=>ACHIEVEMENTS.find(a=>a.id===id)).filter(Boolean);
  $('go-ach').innerHTML=na.length?
    '<div class="go-achh">NEUE ERFOLGE</div><div class="go-achbadges">'+
    na.map(a=>'<span class="rec">'+svg('trophy')+' '+a.name+'</span>').join('')+'</div>':'';
}

/* ============================================================
   ACHIEVEMENT EVALUATION + TOASTS
   ============================================================ */
function evalAch(){
  const ctx={G:G,RUN:RUN,S:Store.data.stats};
  let changed=false;
  for(const a of ACHIEVEMENTS){
    if(Store.data.ach.indexOf(a.id)>=0)continue;
    let ok=false; try{ok=a.test(ctx);}catch(e){}
    if(ok){Store.data.ach.push(a.id);changed=true;if(RUN.newAch)RUN.newAch.push(a.id);payAch(a.id);SFX.unlock();}
  }
  if(changed)Store.save();
}
/* Pay a one-off VOLT bounty + apply any deck unlock for an achievement. Idempotent. */
function payAch(id){
  const m=Store.data.meta;
  if(m.paidAch.indexOf(id)>=0)return;
  m.volt+=(ACH_VOLT[id]||0);
  const dk=ACH_DECK[id];
  if(dk&&m.decksUnlocked.indexOf(dk)<0)m.decksUnlocked.push(dk);
  m.paidAch.push(id);
}
/* On boot, retro-pay achievements earned before this system existed (runs once each). */
function reconcileAch(){for(const id of Store.data.ach)payAch(id);Store.save();}

/* ============================================================
   EXIT  (web: goodbye screen; Steam/Electron: wire to app.quit)
   ============================================================ */
function doExit(){
  // In the Electron/Steam build, replace with: window.api?.quit() / window.close()
  try{window.close();}catch(e){}
  setTimeout(()=>{ if(document.visibilityState!=='hidden') showScene('bye'); },120);
}

/* ============================================================
   EVENT WIRING
   ============================================================ */
// in-board card taps
$('board').addEventListener('click',onClick);
// overlay (round-clear + shop + items)
$('overlay').addEventListener('click',function(e){
  const b=e.target.closest('[data-buy]');if(b){buy(+b.dataset.buy);return;}
  const sb=e.target.closest('[data-spec-buy]');if(sb){buySpecial(sb.dataset.specBuy);return;}
  const a=e.target.closest('[data-act]');if(!a)return;const act=a.dataset.act;
  if(act==='shop')openShop();
  else if(act==='next'){G.ante++;newRound();}
  else if(act==='reroll')reroll();
  else if(act==='items-close')hideOv();
  else if(act==='endless'){G.endless=true;SFX.click();openShop();}     // keep playing past the win
  else if(act==='winmenu'){runActive=false;clearSave();SFX.click();showScene('menu');}
});
// top bar: home pauses to menu (run stays); items + give up
$('homebtn').addEventListener('click',function(){SFX.click();showScene('menu');});
$('itemsbtn').addEventListener('click',function(){SFX.click();showItems();});
$('undobtn').addEventListener('click',function(){doUndo();});
$('helpbtn').addEventListener('click',function(){SFX.click();showHelp();});
$('giveupbtn').addEventListener('click',function(){SFX.click();if(runActive&&confirm('Diesen Run aufgeben? Das führt direkt zum Game-Over.'))gameOver();});
// main menu
$('scene-menu').addEventListener('click',function(e){
  const b=e.target.closest('[data-go]');
  if(b){
    SFX.click();
    const go=b.dataset.go;
    if(go==='resume')doResume();
    else if(go==='start'){showScene('game');fitCards();newRun();}
    else if(go==='decks')showScene('decks');
    else if(go==='ach')showScene('ach');
    else if(go==='news')showScene('news');
    else if(go==='cloud')showScene('cloud');
    else if(go==='rang')showScene('rang');
    else if(go==='opts')showScene('opts');
    else if(go==='exit')doExit();
  }
  // difficulty selection
  var d=e.target.closest('[data-diff]');if(d){var di=+d.dataset.diff;if(di<=Store.data.meta.difficultyUnlocked){Store.data.meta.selectedDifficulty=di;Store.save();renderMenu();SFX.click();}}
});
// generic back buttons -> menu
document.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',function(){SFX.click();showScene('menu');}));
// update post-it -> full updates screen; tearing a fringe tab is an easter egg
$('postit').addEventListener('click',function(){SFX.click();showScene('news');});
$('postit-fringe').addEventListener('click',function(e){const t=e.target.closest('span');if(!t)return;e.stopPropagation();tearTab(t);});
// iPhone homescreen tip toggle
$('iosbtn').addEventListener('click',function(e){e.stopPropagation();SFX.click();$('iostip').hidden=!$('iostip').hidden;});
// FAQ button -> FAQ scene
$('faqbtn').addEventListener('click',function(e){e.stopPropagation();SFX.click();showScene('faq');});
// FAQ scene: toggle items open/closed
$('scene-faq').addEventListener('click',function(e){
  const item=e.target.closest('[data-faq]');if(!item)return;
  item.classList.toggle('open');SFX.click();
});
// decks screen: unlock with VOLT / select active deck
$('scene-decks').addEventListener('click',function(e){
  const buy=e.target.closest('[data-deck-buy]');
  if(buy){const id=buy.dataset.deckBuy,d=DECK(id),m=Store.data.meta;
    if(!m.decksUnlocked.includes(id)&&m.volt>=d.cost){m.volt-=d.cost;m.decksUnlocked.push(id);m.selectedDeck=id;Store.save();SFX.buy();renderDecks();}
    return;}
  const sel=e.target.closest('[data-deck-sel]');
  if(sel){Store.data.meta.selectedDeck=sel.dataset.deckSel;Store.save();SFX.click();renderDecks();return;}
});
// cloud save: create code / load by code / copy / disconnect
$('scene-cloud').addEventListener('click',function(e){
  const b=e.target.closest('[data-act]'); if(!b)return; const act=b.dataset.act; SFX.click();
  if(act==='cl-activate'){
    const el=$('cl-name'),name=el?(el.value||'').trim():'';
    if(!name){clStatus('Bitte einen Benutzernamen eingeben.',false);return;}
    clStatus('Erstelle Code …');
    cloudCreate(name).then(function(code){renderCloud();clStatus('Code erstellt: '+code+' — gut merken!',true);})
                     .catch(function(){clStatus('Fehler — bist du online?',false);});
  }else if(act==='cl-load'){
    const el=$('cl-code'),code=el?(el.value||'').trim():'';
    if(code.length<4){clStatus('Bitte einen gültigen Code eingeben.',false);return;}
    clStatus('Lade Stand …');
    cloudLoad(code).then(function(r){renderCloud();renderMenu();clStatus('Geladen! Willkommen zurück'+(r.username?', '+r.username:'')+'.',true);})
                   .catch(function(err){clStatus(err==='notfound'?'Kein Stand unter diesem Code.':'Fehler — Code/Verbindung prüfen.',false);});
  }else if(act==='cl-copy'){
    const code=Store.data.meta.cloudCode||'';
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(code).then(function(){clStatus('Code kopiert.',true);},function(){clStatus('Dein Code: '+code,true);});}
    else clStatus('Dein Code: '+code,true);
  }else if(act==='cl-disconnect'){
    Store.data.meta.cloudCode='';Store.data.meta.cloudName='';Store.save();renderCloud();clStatus('Cloud getrennt (lokaler Stand bleibt).',true);
  }
});
// options toggles + reset + UI scale
$('scene-opts').addEventListener('click',function(e){
  const sc=e.target.closest('[data-scale]');
  if(sc){Store.data.opts.scale=parseFloat(sc.dataset.scale);Store.data.opts.fit=false;Store.save();applyScale();renderOpts();SFX.click();return;}
  const t=e.target.closest('[data-opt]');
  if(t){const k=t.dataset.opt;Store.data.opts[k]=!Store.data.opts[k];Store.save();applyOpts();applyScale();renderOpts();SFX.click();return;}
  const th=e.target.closest('[data-theme]');
  if(th){Store.data.meta.selectedTheme=th.dataset.theme;Store.save();applyOpts();renderOpts();SFX.click();return;}
});
// volume sliders (live)
$('scene-opts').addEventListener('input',function(e){
  const r=e.target.closest('input.vol');if(!r)return;
  const v=(+r.value)/100;
  if(r.id==='opt-sfx'){Store.data.opts.sfxVol=v;$('sfx-pct').textContent=r.value+'%';}
  else if(r.id==='opt-musicvol'){Store.data.opts.musicVol=v;$('music-pct').textContent=r.value+'%';Music.setVol();}
  else if(r.id==='opt-crt'){Store.data.opts.crt=v;$('crt-pct').textContent=r.value+'%';applyOpts();}
  Store.save();
});
$('scene-opts').addEventListener('change',function(e){ if(e.target.id==='opt-sfx')SFX.click(); }); // preview level on release
$('opt-reset').addEventListener('click',function(){
  if(confirm('Allen Fortschritt (Erfolge, Rekorde, VOLT & Decks) wirklich löschen?')){Store.reset();renderOpts();SFX.click();alert('Fortschritt zurückgesetzt.');}
});
$('opt-tut').addEventListener('click',function(){Store.data.meta.tutDone=false;Store.save();SFX.click();alert('Tutorial wird beim nächsten START gezeigt.');});
// tutorial coach buttons (Weiter / Los / Überspringen)
$('tutbox').addEventListener('click',function(e){const b=e.target.closest('[data-tut]');if(!b)return;SFX.click();if(b.dataset.tut==='skip')endTutorial();else tutNext();});
// game over buttons
$('scene-over').addEventListener('click',function(e){
  const a=e.target.closest('[data-act]');if(!a)return;SFX.click();
  if(a.dataset.act==='retry'){showScene('game');fitCards();newRun();}
  else if(a.dataset.act==='menu')showScene('menu');
});
// resize: refit cards (while playing) + recompute UI scale (fit-to-window)
window.addEventListener('resize',function(){if(!$('scene-game').hidden){fitCards();render();}applyScale();});
// keyboard: Space draws the next card (only in active play, no overlay open)
window.addEventListener('keydown',function(e){
  if($('scene-game').hidden||G.phase!=='play')return;
  if(!$('overlay').classList.contains('hidden'))return;
  if(e.code==='Space'||e.key===' '){e.preventDefault();handleStock();}
});
// resume audio on first user gesture (mobile autoplay policy)
window.addEventListener('pointerdown',function init(){SFX.ensure();SFX.resume();Music.kick();window.removeEventListener('pointerdown',init);},{once:true});
document.addEventListener('visibilitychange',function(){if(document.hidden){if(Music.el)Music.el.pause();}else{Music.sync();}});

/* ============================================================
   BOOT
   ============================================================ */
Store.load();
reconcileAch();
applyOpts();
paintIcons();        // fill all static [data-ic] elements with their SVG
renderPostit();      // fill the menu sticky note with the latest update
showScene('menu');
// auto-update for the iPhone homescreen app (network-first; needs HTTPS hosting)
if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});}
})();
