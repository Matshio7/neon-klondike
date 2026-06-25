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
    d.opts=Object.assign({crt:0.3,scale:1,sfxVol:0.75,musicVol:0.25,audioOn:false,fourColor:false,effects:true,testMult:false,foundationOrder:[0,1,2,3],swapStock:false,bgShader:'none',energySave:false},d.opts||{});
    delete d.opts.fit; // veraltet — applyScale() passt sich jetzt immer automatisch an
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
      themesUnlocked:['og'], selectedTheme:'og',
      tutDone:false,             // first-run tutorial shown?
      cloudCode:'', cloudName:'', // cloud-save code + username (set when activated)
      difficultyUnlocked:0, selectedDifficulty:0, // Stufen 0-7; Sieg auf Stufe d schaltet d+1 frei (Kette, siehe roundClear)
      dailyDone:''                // YYYYMMDD of last completed daily challenge
    },d.meta||{});
  },
  save(){
    try{ if(this._ok)localStorage.setItem(KEY,JSON.stringify(this.data)); else this._mem=this.data; }
    catch(e){ this._ok=false; this._mem=this.data; }
  },
  reset(){ const opts=this.data.opts; this.data={opts:opts}; this._defaults(); this.save(); }
};

/* ============================================================
   AUDIO  -  WebAudio SFX engine. Falls back to oscillator tones
   if the audio files fail to load (no asset files needed).
   ============================================================ */
const SFX={
  ctx:null, els:{},
  ensure(){ if(this.ctx)return; try{this.ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){} },
  resume(){ if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume(); },
  preload(){
    ['click','achievement','denied','card-moving-1','card-moving-2','card-moving-3','gameover',
     'bigtax-appear','bigtax-hit','bigtax-defeat'].forEach(function(id){
      var a=new Audio('sfx/'+id+'.mp3');a.volume=0;a.load();SFX.els[id]=a;
    });
  },
  play(name,synth){
    if(!Store.data.opts.audioOn)return;   // Master-Audio aus → kein Ton (lässt fremde Musik in Ruhe)
    var sv=Store.data.opts.sfxVol; if(!sv)return;
    var a=this.els[name];
    if(a&&a.readyState>=2){a.volume=sv;a.currentTime=0;a.play().catch(function(){});return;}
    if(synth)this.tone(synth.f,synth.d,synth.t||'square',synth.v||0.2);
  },
  tone(freq,dur,type,vol){
    if(!Store.data.opts.audioOn||!this.ctx)return;
    type=type||'square'; vol=(vol||0.20)*Store.data.opts.sfxVol;
    const t=this.ctx.currentTime;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t); o.stop(t+dur);
  },
  voiceAppear(){this.play('bigtax-appear');},
  voiceHit(){this.play('bigtax-hit');},
  voiceDefeat(){this.play('bigtax-defeat');},
  click(){this.play('click',{f:420,d:0.05});},
  bank(){this.play('card-moving-'+Math.ceil(Math.random()*3),{f:660,d:0.07});},
  buy(){this.play('card-moving-'+Math.ceil(Math.random()*3),{f:520,d:0.08});},
  unlock(){this.play('achievement',{f:660,d:0.12});},
  win(){[523,659,784,1047].forEach(function(f,i){setTimeout(function(){SFX.tone(f,0.12,'square',0.22);},i*90);});},
  lose(){this.play('gameover',{f:440,d:0.18,t:'sawtooth',v:0.22});},
  denied(){this.play('denied',{f:220,d:0.12,t:'sawtooth'});},
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
  _play(){ if(this.el&&this.ready&&Store.data.opts.audioOn&&Store.data.opts.musicVol>0){ var p=this.el.play(); if(p&&p.catch)p.catch(function(){}); } },
  setVol(){ this.init(); if(!this.el)return; this.el.volume=Store.data.opts.musicVol; if(Store.data.opts.audioOn&&Store.data.opts.musicVol>0&&this.ready){var p=this.el.play();if(p&&p.catch)p.catch(function(){});}else this.el.pause(); },
  sync(){                                                   // match src to mode, then play/pause per settings
    if(!Store.data.opts.audioOn){ if(this.el)this.el.pause(); return; }   // Audio AUS → keine Audio-API anfassen (fremde Musik bleibt unberührt)
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
   ICON / DATA HELPERS
   Statische Daten (IC, ACHIEVEMENTS, PATCH_NOTES, POOL, SPECIALS,
   CONSUMABLES, VOUCHERS, BOSSES, DECKS, DIFFICULTIES, THEMES,
   FORTUNES, MEAN …) liegen in data.js (geladen vor game.js).
   Hier nur die Helfer, die das DOM/svg() berühren.
   ============================================================ */
function svg(name){return '<span class="svgi">'+(IC[name]||'')+'</span>';}
function paintIcons(root){(root||document).querySelectorAll('[data-ic]').forEach(function(el){if(el.dataset.painted)return;el.innerHTML=IC[el.dataset.ic]||'';el.dataset.painted='1';});}
function suitSvg(s){return svg(SUITNAME[s]);}   // suit as inline SVG (inherits card color)

let G={};
let RUN={};   // per-run tracking (resets each new run)
let runActive=false; // true while a run is in progress (resumable from the menu)
let RNG=Math.random; // replacable seeded RNG
let RANG_MODE='all'; // 'all' | 'month' | 'week' | 'daily' leaderboard view
let RANG_DIFF=null; // null = alle Schwierigkeiten; 0..7 = nur diese Schwierigkeit
let foundSwapIdx=-1; // selected index in foundation-order UI

function $(id){return document.getElementById(id);}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function hash(s){var h=0;for(var i=0;i<s.length;i++){h=(h<<5)-h+s.charCodeAt(i);h|=0;}return h>>>0;}
function mkRng(s){
  function next(){s|=0;s=s+0x6D2B79F5|0;var t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;s=t;return((t^t>>>14)>>>0)/4294967296;}
  next.getState=function(){return s>>>0;};
  next.setState=function(v){s=v;}; // internal state for resume
  return next;
}
function rseed(x){RNG=mkRng(hash(String(x)));}
function todayStr(){const d=new Date();return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(RNG()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function target(n){return Math.round(50*Math.pow(1.45,n-1)/5)*5;}
function recBase(){return 2+(G.perks.includes('rec')?1:0)+(G.deck?G.deck.recDelta:0)+((G.vouchers&&G.vouchers.includes('recycler'))?1:0);}
function baseMult(){var b=(G.deck?G.deck.baseMult:1)+(G.perks.includes('fever')?0.5:0)+(G.perks.includes('bigfever')?1:0)+(G.perks.includes('overload')?2:0);var dd=G.dd||DIFFICULTIES[G.diff]||{};return b-(dd.basePen||0);}
function effMult(){return baseMult()+G.roundMult;}

function resetRun(){RUN={banked:0,totalChips:0,maxMult:0,bestRound:0,newBestAnte:false,newBestChips:false,newAch:[],voltEarned:0,won:false,lastSubmittedAnte:0,lastDailyAnte:0};}

function newRun(daily){
  resetRun();
  Store.data.stats.totalRuns++;
  const tut=!daily&&!Store.data.meta.tutDone;                          // first ever run -> tutorial (not in daily)
  const deck=(tut||daily)?DECK('standard'):DECK(Store.data.meta.selectedDeck);  // Tutorial + Daily immer Standard-Deck (faire Tages-Challenge)
  const diffId=tut?0:(daily?0:(Store.data.meta.selectedDifficulty||0));// daily always difficulty 0
  const diffDef=DIFFICULTIES[diffId]||DIFFICULTIES[0];
  G={ante:1,coins:Math.max(1,deck.coins-diffDef.coinPen),perks:deck.startPerks.slice(),history:[],deck:deck,undo:[],undoUses:0,tutorial:tut,tutStep:0,endless:false,specials:[],specialOffer:null,items:[],vouchers:[],diff:diffId,helpMode:false};
  if(diffId)G.dd=diffDef;
  if(daily){
    const day=todayStr();
    G.daily=day;
    G.seed=day;
    Store.data.meta.dailyDone=day;
    Store.save();
  }else{
    G.seed=Math.floor(Math.random()*1e8).toString(36).toUpperCase();
  }
  rseed(G.seed);
  runActive=true;
  newRound();           // newRound updates bestAnte + saves
  evalAch();            // covers runs10 etc.
}
function doDaily(){
  const day=todayStr();
  if(Store.data.meta.dailyDone===day){SFX.click();alert('Tages-Challenge bereits gespielt. Morgen gibt es eine neue!');return;}
  SFX.click();
  if(!confirm('TAGES-CHALLENGE\n\nFür alle Spieler heute derselbe Seed.\nNur EIN Versuch pro Tag.\n\nStarten?'))return;
  showScene('game');fitCards();newRun(true);
}
function dailySubmit(){
  if(!G||!G.daily)return;
  if(G.ante<=(RUN.lastDailyAnte||0))return;   // nur senden wenn Ante gestiegen (verhindert Spam, erlaubt Nachbesserung)
  RUN.lastDailyAnte=G.ante;
  const m=Store.data.meta;
  const username=m.cloudName||'Anonym';
  const dayFormatted=G.daily.slice(0,4)+'-'+G.daily.slice(4,6)+'-'+G.daily.slice(6,8);
  clRpc('kl_daily_submit',{p_day:dayFormatted,p_username:username,p_ante:G.ante,p_chips:RUN.bestRound||0}).catch(function(e){console.warn('[kl_daily_submit]',e);});
}
/* ============================================================
   SAVEGAME  -  persist the whole run to localStorage so it
   survives reloads / app restarts. FORTSETZEN loads it.
   ============================================================ */
const SAVE_KEY='klondaire.save';
function snapRun(){                                            // serializable copy of the active run, or null
  if(!runActive||!G||G.phase==='over'||G.tutorial)return null;
  const g=Object.assign({},G); g.undo=[]; g.sel=null;
  g.bossFx=null; g._bossIdleTimer=null;   // Laufzeit-Objekte (Canvas-Controller / Timer-ID) NICHT persistieren — beim Resume via bossFxStart() neu erzeugt
  g.deckId=g.deck?g.deck.id:'standard'; delete g.deck;
  if(RNG&&RNG.getState)g.rngState=RNG.getState();
  return {g:g,run:RUN};
}
function restoreRun(r){                                        // r = {g, run}
  if(!r||!r.g||!Array.isArray(r.g.tab))return false;
  const g=r.g; g.deck=DECK(g.deckId||'standard'); delete g.deckId; g.undo=[]; g.sel=null; g.undoUses=g.undoUses||0;
  if(g.diff&&!g.dd)g.dd=DIFFICULTIES[g.diff];
  G=g; RUN=Object.assign({banked:0,totalChips:0,maxMult:0,bestRound:0,newBestAnte:false,newBestChips:false,newAch:[],voltEarned:0,won:false},r.run||{});
  if(!Array.isArray(RUN.newAch))RUN.newAch=[];
  if(G.seed)rseed(G.seed);
  if(G.rngState!==undefined&&RNG&&RNG.setState)RNG.setState(G.rngState);
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
    body:JSON.stringify(body)}).then(function(r){
      if(!r.ok)return Promise.reject('HTTP '+r.status);
      const len=r.headers.get('content-length');
      if(r.status===204||(len!==null&&+len===0))return null;
      return r.json().catch(function(e){return null;});
    });
}
function submitScore(beacon){
  if(!runActive||!G||G.ante<1||!Store.data.meta.cloudName)return;
  if(G.ante<=(RUN.lastSubmittedAnte||0))return;
  RUN.lastSubmittedAnte=G.ante;
  var body=JSON.stringify({p_username:Store.data.meta.cloudName,p_ante:G.ante,p_chips:RUN.totalChips||0,p_difficulty:G.diff||0,p_deck:(G.deck&&G.deck.id)||'standard'});
  fetch(CLOUD.url+'/rest/v1/rpc/kl_submit',{method:'POST',headers:{'Content-Type':'application/json','apikey':CLOUD.key,'Authorization':'Bearer '+CLOUD.key},body:body,keepalive:!!beacon})
    .catch(function(e){console.warn('[kl_submit]',e);});
}
function applyPlausibility(s) {
  // Cap max ante to a reasonable limit (even for endless mode, 100 is plenty)
  if (s.bestAnte > 100) s.bestAnte = 100;
  // Check if chips are suspiciously high compared to what's possible
  // In most cases, bestChips shouldn't be in the trillions unless they've played for ages
  if (s.bestChips > 999999999) s.bestChips = 999999999;
  return s;
}

function cloudPayload(){
  const m=Store.data.meta;
  const stats = Store.data.stats;
  applyPlausibility(stats);
  return {v:1,store:{stats:stats,ach:Store.data.ach,meta:m},run:snapRun()};
}
function cloudSaveNow(){ const m=Store.data.meta; if(!m.cloudCode)return Promise.reject('nocode'); return clRpc('kl_save',{p_code:m.cloudCode,p_username:m.cloudName||'',p_data:cloudPayload()}); }
function cloudSync(){ if(!Store.data.meta.cloudCode)return; cloudSaveNow().then(function(){cloudSync.lastOk=Date.now();},function(){}); }   // Auto-Sync: Fehler still, aber loggt letzten Erfolg
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
  if(runActive&&G&&G.phase&&G.phase!=='over'){showScene('game');fitCards();render();if(G.phase==='play')bossFxStart(false);return;}
  if(!loadGame())return;
  showScene('game');fitCards();render();
  if(G.phase==='shop')renderShop();
  else if(G.phase==='clear'){
    if(G.ante>=WIN_ANTE&&!G.endless)showVictory();              // was on the victory screen
    else {G.phase='shop';openShop();}                           // otherwise jump straight to the shop
  }
  else if(G.phase==='play')bossFxStart(false);                  // GROSSE STEUER: Hintergrund-Animation nach Reload neu starten (Controller wird nicht persistiert)
}

function bossFxStop(){if(G&&G.bossFx){if(typeof G.bossFx.stop==='function')G.bossFx.stop();G.bossFx=null;}if(G&&G._bossIdleTimer){clearInterval(G._bossIdleTimer);G._bossIdleTimer=null;}var bc=$('boss-bg');if(bc){var c2=bc.getContext('2d');c2.clearRect(0,0,bc.width,bc.height);}}
/* GROSSE STEUER (bigtax): animierten Canvas-Hintergrund-Layer starten. No-op bei anderen Bossen.
   replayAppear=true → Einflug-Animation + Stimme (neue Runde); false → stiller Wiedereinstieg (Resume/Reload). */
function bossFxStart(replayAppear){
  if(!(G&&G.boss&&G.boss.id==='bigtax'&&window.BossGrosseSteuer))return;
  var bc=$('boss-bg');if(!bc)return;
  bc.width=bc.offsetWidth||440; bc.height=bc.offsetHeight||600;
  G.bossFx=BossGrosseSteuer.attach(bc,{anchor:'bottom',opacity:0.16,showText:false,state:replayAppear?'appear':'idle'});
  G._bossHitTs=0;
  G._bossVoicePlayed=false;
  G._bossRoundStartTs=Date.now();
  G._lastBossInputTs=Date.now();
  if(G._bossIdleTimer)clearInterval(G._bossIdleTimer);
  G._bossIdleTimer=setInterval(function(){
    if(G._bossVoicePlayed||!G.boss||G.boss.id!=='bigtax'){clearInterval(G._bossIdleTimer);G._bossIdleTimer=null;return;}
    var now=Date.now();
    if(now-G._bossRoundStartTs>=30000&&now-(G._lastBossInputTs||0)>=7000){G._bossVoicePlayed=true;clearInterval(G._bossIdleTimer);G._bossIdleTimer=null;SFX.voiceHit();}
  },2000);
  if(replayAppear)SFX.voiceAppear();
}
function newRound(){
  const deck=[];for(let s=0;s<4;s++)for(let r=1;r<=13;r++)deck.push({r,s,up:false});
  (G.specials||[]).forEach(id=>deck.push({r:0,s:-1,up:false,joker:true,special:id}));   // special cards grow the deck
  shuffle(deck);
  G.tab=[[],[],[],[],[],[],[]];
  for(let c=0;c<7;c++){for(let k=0;k<=c;k++){const card=deck.pop();card.up=(k===c);G.tab[c].push(card);}}
  G.stock=deck;G.waste=[];G.found=[[],[],[],[]];
  G.chips=0;G.roundMult=0;G.phase='play';G.sel=null;G._last=0;G.boss=null;G.undo=[];G.helpMode=false;
  G.target=target(G.ante);if(G.deck&&G.deck.targetMul!==1)G.target=Math.round(G.target*G.deck.targetMul/5)*5;G.rec=recBase();
  var dd=DIFFICULTIES[G.diff];if(dd&&dd.targetMul!==1)G.target=Math.round(G.target*dd.targetMul/5)*5;
  if(dd&&dd.recPen)G.rec=Math.max(0,G.rec-dd.recPen);
  var bossAnte=(G.ante%3===0)||(G.ante===WIN_ANTE)||(G.deck&&G.deck.bossEveryAnte)||(dd&&dd.bossEA);
  if(bossAnte){
    G.boss=(G.ante===WIN_ANTE)?ENDBOSS:((G.nextBoss&&BOSS(G.nextBoss))||BOSSES[Math.floor(RNG()*BOSSES.length)]);
    G.nextBoss=null;
    if(G.boss.id==='bigtax')G.target=Math.round(G.target*1.8/5)*5;   // GROSSE STEUER (Finale): Ziel +80%
    if(G.boss.id==='drought')G.rec=Math.max(1,G.rec-2);              // DÜRRE: nur 1 Recycle
    G.bossDeadSuit=(G.boss.id==='censor')?Math.floor(RNG()*4):null;  // ZENSUR: eine zufällige Farbe = 0 Chips
  }else{G.bossDeadSuit=null;}
  /* bigtax: animierter Hintergrund-Layer */
  bossFxStop();
  bossFxStart(true);
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
function validSeq(cards){const rev=G.deck&&G.deck.reverse;for(let i=1;i<cards.length;i++){const a=cards[i-1],b=cards[i];if(a.joker||b.joker)continue;if(!b.up)return false;if(rev){if(b.r!==a.r+1||color(a)===color(b))return false;}else{if(b.r!==a.r-1||color(a)===color(b))return false;}}return true;}
function moving(){if(!G.sel)return[];if(G.sel.p==='waste')return[G.waste[G.waste.length-1]];if(G.sel.p==='found')return[G.found[G.sel.suit][G.found[G.sel.suit].length-1]];return G.tab[G.sel.col].slice(G.sel.idx);}
function canFound(c,suit){const s=c.joker?suit:c.s;if(s==null)return false;const f=G.found[s];const need=(G.deck&&G.deck.reverse)?13-f.length:f.length+1;return c.joker||c.r===need;}   // count-based; wild fills any slot
function canTab(cards,col){const r0=cards[0],t=G.tab[col];const rev=G.deck&&G.deck.reverse;if(t.length===0)return r0.joker||(rev?r0.r===1:r0.r===13);const top=t[t.length-1];if(!top.up)return false;if(r0.joker||top.joker)return true;return rev?(top.r===r0.r-1&&color(top)!==color(r0)):(top.r===r0.r+1&&color(top)!==color(r0));}
function bossDesc(){if(!G.boss)return '';if(G.boss.id==='censor'&&G.bossDeadSuit!=null)return 'FARBE '+SUITS[G.bossDeadSuit]+' = 0 CHIPS';return G.boss.desc;}   // ZENSUR zeigt die konkrete zensierte Farbe
function chipsFor(c){if(c.special){const sp=SPECIAL(c.special);return sp?sp.chips:10;}   // Specials sind wild (ohne Farbe) — von keinem der 5 Bosse betroffen
  if(G.boss){if(G.boss.id==='lowtax'&&c.r<=5)return 0;if(G.boss.id==='censor'&&c.s===G.bossDeadSuit)return 0;}   // KOPFGELD: A–5 = 0 · ZENSUR: zensierte Farbe = 0
  let v=10;
  if(G.perks.includes('plus5'))v+=5;
  if(G.perks.includes('red')&&RED(c.s))v+=4;
  if(G.perks.includes('black')&&!RED(c.s))v+=4;
  if(G.perks.includes('ten')&&c.r===10)v+=12;
  if(G.perks.includes('face')&&c.r>=11)v+=8;
  if(G.perks.includes('low')&&c.r<=5)v+=5;
  if(G.perks.includes('acechip')&&c.r===1)v+=20;
  if(G.deck&&G.deck.cardMods)v+=RED(c.s)?G.deck.cardMods.red:G.deck.cardMods.black;
  return Math.max(0,v);}
function bankGain(c){
  let multAdd=0;
  const ramp=!(G.boss&&G.boss.id==='flaute');   // FLAUTE-Boss: kein Mult-Aufbau aus Perks
  const sources=[];
  if(ramp){
    if(G.perks.includes('streak')){G.roundMult+=0.1;multAdd+=0.1;sources.push({label:'Streak',add:0.1});}
    if(G.perks.includes('ace')&&c.r===1){G.roundMult+=0.5;multAdd+=0.5;sources.push({label:'Ass',add:0.5});}
    if(G.perks.includes('comboplus')){G.roundMult+=0.2;multAdd+=0.2;sources.push({label:'Combo+',add:0.2});}
    if(G.perks.includes('heartengine')&&c.s===1){G.roundMult+=0.3;multAdd+=0.3;sources.push({label:'Herz',add:0.3});}
    if(G.perks.includes('facemult')&&c.r>=11){G.roundMult+=0.3;multAdd+=0.3;sources.push({label:'Bild',add:0.3});}
  }
  if(c.special){const sp=SPECIAL(c.special);if(sp){if(ramp&&sp.mult){G.roundMult+=sp.mult;multAdd+=sp.mult;}sources.push({label:sp.name||'Spezial',add:(ramp&&sp.mult)?sp.mult:0});}}   // jede Spezialkarte lässt ihren Tag aufleuchten; Mult nur wenn vorhanden & nicht FLAUTE
  const m=effMult(); if(m>RUN.maxMult)RUN.maxMult=m;
  const gain=Math.round(chipsFor(c)*m);
  G.chips+=gain; RUN.banked++; RUN.totalChips+=gain;
  c.gain=gain; c.multAdd=multAdd;   // recorded so taking the card back can reverse it exactly
  SFX.bank();
  if(G.bossFx){var _n=Date.now();if(_n-(G._bossHitTs||0)>=400){G._bossHitTs=_n;G.bossFx.play('hit');}}
  evalAch();
  return {gain:gain,sources:sources};
}
/* take a card back out of the Bank -> reverse its chip + mult contribution (no exploits) */
function unbank(c){
  if(c.gain){G.chips=Math.max(0,G.chips-c.gain);RUN.totalChips=Math.max(0,RUN.totalChips-c.gain);c.gain=0;}
  if(c.multAdd){G.roundMult=Math.max(0,G.roundMult-c.multAdd);c.multAdd=0;}
}
function flip(arr){if(arr.length&&!arr[arr.length-1].up)arr[arr.length-1].up=true;}
function pop(g,scale){if(g<=0)return;const d=document.createElement('div');d.className='scorepop';d.textContent='+'+g;if(scale&&scale>2)d.style.fontSize=(11+scale*2.5)+'px';$('stage').appendChild(d);setTimeout(()=>d.remove(),800);}
function handleStock(){
  if(!(G.stock.length||(G.rec>0&&G.waste.length)))return; // nothing to draw/recycle
  pushUndo();
  if(G.stock.length){const c=G.stock.pop();c.up=true;G.waste.push(c);}
  else if(G.rec>0&&G.waste.length){while(G.waste.length){const c=G.waste.pop();c.up=false;G.stock.push(c);}G.rec--;}
  SFX.bank();
  G.sel=null;render();checkStuck();tutGate('stock');
}
function doFound(suit){pushUndo();const cs=moving();const c=cs[0];if(!c.special){const s=c.joker?suit:c.s;G.found[s].push(c);}/* Spezialkarten füllen KEINEN Rang-Slot — sie werden für Chips eingelöst, sperren also keine echten Karten aus */if(G.sel.p==='waste')G.waste.pop();else{G.tab[G.sel.col].pop();flip(G.tab[G.sel.col]);}const r=bankGain(c);var m=effMult();if(Store.data.opts.testMult)m=5;if(Store.data.opts.effects!==false&&!Store.data.opts.energySave&&m>3){shake();}if(Store.data.opts.effects!==false&&!Store.data.opts.energySave&&navigator.vibrate)navigator.vibrate(8);G.sel=null;tutGate('bank');check();if(r.sources.length)setTimeout(function(){animateMultTags(r.sources,r.gain,m);},30);else pop(r.gain,m);}
function doTab(col){pushUndo();const cs=moving();if(G.sel.p==='waste'){G.waste.pop();}else if(G.sel.p==='found'){const c=G.found[G.sel.suit].pop();unbank(c);}else G.tab[G.sel.col].splice(G.sel.idx);cs.forEach(c=>G.tab[col].push(c));if(G.sel.p==='tab')flip(G.tab[G.sel.col]);if(G.sel.p!=='found'){SFX.buy();}G.sel=null;render();checkStuck();}
function same(p,col,idx){return G.sel&&G.sel.p===p&&G.sel.col===col&&G.sel.idx===idx;}
function shake(){const s=$('stage');s.classList.add('shake');setTimeout(()=>s.classList.remove('shake'),180);}
function multTags(){
  var tags=[];
  if(!G||!G.perks)return tags;
  if(G.perks.includes('streak'))tags.push({label:'Streak',add:0.1});
  if(G.perks.includes('ace'))tags.push({label:'Ass',add:0.5});
  if(G.perks.includes('comboplus'))tags.push({label:'Combo+',add:0.2});
  if(G.perks.includes('heartengine'))tags.push({label:'Herz',add:0.3});
  if(G.perks.includes('facemult'))tags.push({label:'Bild',add:0.3});
  (G.specials||[]).forEach(function(id){var sp=SPECIAL(id);if(sp)tags.push({label:sp.name,mark:sp.mark,spec:true});});   // deine Joker/Spezialkarten
  return tags;
}
function renderMultTags(){
  var el=$('multtags');if(!el)return;
  var h='';
  multTags().forEach(function(t){
    if(t.spec) h+='<div class="mtag mtag-spec" data-tag="'+esc(t.label)+'">'+esc(t.mark||'')+' '+esc(t.label)+'</div>';
    else h+='<div class="mtag" data-tag="'+esc(t.label)+'">'+esc(t.label)+' +'+t.add.toFixed(1)+'</div>';
  });
  ((G&&G.items)||[]).forEach(function(id){var it=CONS(id);if(it)h+='<button class="mtag mtag-item" data-use-item="'+id+'" title="'+esc(it.desc)+'">'+esc(it.mark)+' '+esc(it.name)+' ▸</button>';});   // Items direkt einsetzbar
  el.innerHTML=h;
}
function animateMultTags(sources,gain,mult){
  var el=$('multtags');if(!el)return;
  if(!sources.length){pop(gain,mult);return;}
  var cur=mult-sources.reduce(function(s,src){return s+src.add;},0);
  function step(i){
    if(i>=sources.length){
      $('mult').innerHTML='x'+mult.toFixed(1);
      pop(gain,mult);
      setTimeout(function(){el.querySelectorAll('.mtag').forEach(function(t){t.classList.remove('mtag-hit');});},800);
      return;
    }
    cur+=sources[i].add;
    $('mult').innerHTML='x'+cur.toFixed(1);
    el.querySelectorAll('.mtag').forEach(function(t){if(t.dataset.tag===sources[i].label)t.classList.add('mtag-hit');});
    setTimeout(function(){step(i+1);},220);
  }
  step(0);
}
function selWaste(){if(G.waste.length)G.sel={p:'waste'};}
/* ---- UNDO: snapshot before each move; each undo costs escalating coins (per run) ---- */
function pushUndo(){
  if(!G.undo)G.undo=[];
  G.undo.push(JSON.stringify({tab:G.tab,waste:G.waste,stock:G.stock,found:G.found,chips:G.chips,roundMult:G.roundMult,rec:G.rec,rt:RUN.totalChips,rmax:RUN.maxMult,rb:RUN.banked}));
  if(G.undo.length>60)G.undo.shift();
}
function undoCost(){return (G.undoUses||0)+1;}
function doUndo(){
  if(G.dd&&G.dd.noUndo)return;
  if(G.phase!=='play'||!G.undo||!G.undo.length)return;
  const cost=undoCost();
  if(G.coins<cost){SFX.denied();shake();return;}
  const s=JSON.parse(G.undo.pop());
  G.tab=s.tab;G.waste=s.waste;G.stock=s.stock;G.found=s.found;
  G.chips=s.chips;G.roundMult=s.roundMult;G.rec=s.rec;
  if(s.rt!==undefined)RUN.totalChips=s.rt;if(s.rmax!==undefined)RUN.maxMult=s.rmax;if(s.rb!==undefined)RUN.banked=s.rb;   // Run-Summen mit zurücksetzen → kein Chip-Doppelzählen
  G.coins-=cost;G.undoUses=(G.undoUses||0)+1;G.sel=null;G._last=G.chips;
  const d=document.createElement('div');d.className='scorepop';d.style.color='var(--pink)';d.textContent='-'+cost+' COINS';$('stage').appendChild(d);setTimeout(function(){d.remove();},800);
  SFX.play('denied',{f:320,d:0.08});setTimeout(function(){SFX.play('denied',{f:200,d:0.1});},60);
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
  if(G._lastBossInputTs!==undefined)G._lastBossInputTs=Date.now();
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
    if(cs.length===1&&canFound(cs[0],suit))doFound(suit);else{SFX.denied();shake();}return;
  }
  if(p==='tab'){
    if(canTab(cs,col)){doTab(col);return;}
    const c=idx>=0?G.tab[col][idx]:null;
    if(c&&c.up&&validSeq(G.tab[col].slice(idx))){G.sel={p:'tab',col,idx};render();return;}
    SFX.denied();shake();return;
  }
  if(p==='waste'){G.sel=null;selWaste();render();return;}
}
/* AUTO-collect removed by design: the player banks every card by hand. */
function anyMove(){
  if(G.stock.length)return true;
  if(G.rec>0&&G.waste.length)return true;
  const tops=[];if(G.waste.length)tops.push(G.waste[G.waste.length-1]);
  for(let c=0;c<7;c++){const t=G.tab[c];if(t.length&&t[t.length-1].up)tops.push(t[t.length-1]);}
  for(const c of tops){if(c.joker)return true;if(canFound(c))return true;}   // Joker ist immer bankbar
  for(let c=0;c<7;c++){const t=G.tab[c];for(let i=0;i<t.length;i++){if(t[i].up&&validSeq(t.slice(i))){const run=t.slice(i);for(let d=0;d<7;d++)if(d!==c&&canTab(run,d))return true;}}}
  if(G.waste.length){const w=[G.waste[G.waste.length-1]];for(let d=0;d<7;d++)if(canTab(w,d))return true;}
  return false;
}
function checkStuck(){render();if(G.phase==='play'&&G.chips<G.target&&!anyMove())gameOver();}
/* Echte "kein Zug mehr"-Prüfung: gibt es IRGENDEINEN produktiven Zug — jetzt
   oder nachdem man den ganzen Stapel durchgezogen/recycelt hat? Anders als
   anyMove() zählt bloßes Nachziehen NICHT als Zug; geprüft wird, ob irgendeine
   erreichbare Karte bankbar oder auf eine Spalte legbar ist. */
function hasProductiveMove(){
  // 1) eine aufgedeckte Tableau-Sequenz auf eine andere Spalte bewegbar?
  for(let c=0;c<7;c++){const t=G.tab[c];for(let i=0;i<t.length;i++){if(t[i].up&&validSeq(t.slice(i))){const run=t.slice(i);for(let d=0;d<7;d++)if(d!==c&&canTab(run,d))return true;}}}
  // 2) erreichbare Einzelkarten: Tableau-Tops, Waste-Top, ALLE Stock-Karten (ziehbar) + bei Recycle auch alle Waste-Karten
  const cand=[];
  for(let c=0;c<7;c++){const t=G.tab[c];if(t.length&&t[t.length-1].up)cand.push(t[t.length-1]);}
  if(G.waste.length)cand.push(G.waste[G.waste.length-1]);
  for(const c of G.stock)cand.push(c);
  if(G.rec>0)for(const c of G.waste)cand.push(c);
  for(const c of cand){
    if(c.joker)return true;                          // Joker ist immer bankbar
    if(canFound(c))return true;                       // in eine Bank legbar
    for(let d=0;d<7;d++)if(canTab([c],d))return true;  // auf eine Spalte legbar
  }
  return false;
}
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
  if(G.boss&&(cleared||earned>=G.target)&&G.bossFx&&typeof G.bossFx.play==='function'){G.bossFx.play('defeat');SFX.voiceDefeat();}
  Store.save();
  // ---- reward (unchanged economy) ----
  const diffData=G.dd||DIFFICULTIES[G.diff]||{};
  const interest=diffData.noInt?0:Math.min((G.perks.includes('deepinterest')?8:5)+(hasV('interestcap')?3:0),Math.floor(G.coins/5));
  const perf=Math.min(8,Math.ceil(G.ante/2));   // Bonus skaliert mit der Ante-Tiefe (die Runde endet beim Ziel, Überschuss gibt es kaum), gedeckelt bei 8
  const bonus=cleared?6:0;
  const bounty=G.boss?8*((G.deck&&G.deck.bossBountyMul)||1):0;
  const reward=Math.max(0,3+(G.deck?G.deck.rewardDelta:0)+(G.perks.includes('richbank')?2:0)+perf+interest+bonus+bounty);
  G.coins+=reward;
  evalAch();
  cloudSync();   // sync progress after each cleared round
  SFX.win();
  const base=3+(G.deck?G.deck.rewardDelta:0)+(G.perks.includes('richbank')?2:0);
  const rows=[['Grundbelohnung',base],['Ante-Bonus',perf]];
  if(interest>0)rows.push(['Zinsen (1 je 5 Coins)',interest]);
  if(cleared)rows.push(['Board geräumt',6]);
  if(bounty)rows.push(['Boss besiegt',bounty]);
  const rh=rows.map(r=>'<div class="rr"><span class="rl">'+r[0]+'</span><span class="rv">+'+r[1]+'</span></div>').join('');
  if(G.ante>=WIN_ANTE && !G.endless){            // ---- RUN WON ----
    if(!RUN.won){RUN.won=true;Store.data.stats.wins=(Store.data.stats.wins||0)+1;
      // Ketten-Freischaltung: Sieg AUF der aktuell höchsten Stufe schaltet die nächste frei (Sieg auf Stufe d → Stufe d+1).
      // Siege auf niedrigeren Stufen schalten nichts frei — man muss jede Stufe selbst schlagen.
      var du=Store.data.meta.difficultyUnlocked||0, wonDiff=G.diff||0;
      if(wonDiff>=du && du<7){Store.data.meta.difficultyUnlocked=du+1;}
      Store.save();evalAch();}
    showVictory('<div class="rwd">'+rh+'<div class="rtot"><span>BELOHNUNG</span><span>+'+reward+' COINS</span></div></div>');
    render();return;
  }
  showOv('<h3 style="color:var(--gold)">'+(G.boss?'BOSS BESIEGT!':(cleared?'BOARD GERÄUMT!':'RUNDE GESCHAFFT'))+'</h3>'+
    '<div class="sub">CHIPS '+earned+' / '+G.target+'</div>'+
    '<div class="rwd">'+rh+'<div class="rtot"><span>BELOHNUNG</span><span>+'+reward+' COINS</span></div></div>'+
    '<button class="btn gold" data-act="shop" style="flex:0;padding:11px 18px">SHOP ÖFFNEN &#8599;</button>');
  render();
}
function prerollBoss(){   // nächsten Boss vorab ziehen (seed-deterministisch) → für die Vorschau
  const na=G.ante+1;
  const ba=(na%3===0)||(na===WIN_ANTE)||(G.deck&&G.deck.bossEveryAnte)||(G.dd&&G.dd.bossEA);
  if(!ba){G.nextBoss=null;return;}
  if(na===WIN_ANTE){G.nextBoss=ENDBOSS.id;return;}   // Endboss-Vorschau
  if(!G.nextBoss||G.nextBoss===ENDBOSS.id)G.nextBoss=BOSSES[Math.floor(RNG()*BOSSES.length)].id;
}
function hasV(id){return (G.vouchers||[]).includes(id);}
function perkSlots(){return 3+(hasV('perkslot')?1:0);}
function rerollCost(){return ((G.deck&&G.deck.freeReroll)||hasV('luckyroll'))?0:1;}
function perkPrice(p){return Math.max(1,p.price+(G.dd?G.dd.shopPen:0)-(hasV('discount')?1:0));}
function weightR(r){return r==='l'?5:(r==='s'?25:70);}
function pickOffers(avail,n){var pool=avail.slice(),out=[];while(out.length<n&&pool.length){var tot=0;for(var i=0;i<pool.length;i++)tot+=weightR(pool[i].r);var x=RNG()*tot,idx=0;for(var j=0;j<pool.length;j++){x-=weightR(pool[j].r);if(x<=0){idx=j;break;}}out.push(pool.splice(idx,1)[0]);}return out;}
function openShop(){
  G.phase='shop';
  SFX.buy();
  prerollBoss();
  const avail=POOL.filter(p=>!G.perks.includes(p.id));
  G.offers=pickOffers(avail,perkSlots());
  const savail=SPECIALS.filter(s=>!(G.specials||[]).includes(s.id));   // jede Spezialkarte nur 1× (kein Stacking)
  G.specialOffer=((G.dd&&G.dd.noSpec)||!savail.length)?null:(RNG()<0.45)?savail[Math.floor(RNG()*savail.length)].id:null;
  G.itemOffer=(RNG()<0.5)?CONSUMABLES[Math.floor(RNG()*CONSUMABLES.length)].id:null;        // Verbrauchsgegenstand-Angebot
  const vavail=VOUCHERS.filter(v=>!hasV(v.id));
  G.voucherOffer=(vavail.length&&RNG()<0.45)?vavail[Math.floor(RNG()*vavail.length)].id:null;  // Voucher-Angebot
  renderShop();
  saveGame();
}
function renderShop(){
  const spen=G.dd?G.dd.shopPen:0;
  const owned=G.perks.map(id=>{const p=POOL.find(x=>x.id===id);return '<span class="tag-pill '+(p.m?'m':'')+'">'+p.name+'</span>';}).join('');
  const rows=G.offers.map((p,i)=>{const pr=perkPrice(p);const aff=G.coins>=pr;
    return '<div class="perk '+(p.m?'mlt':'')+(p.r?' pr-'+p.r:'')+'"><div><div class="pn">'+p.name+'</div><div class="pd">'+p.desc+'</div></div><button class="buy" data-buy="'+i+'" '+(aff?'':'disabled')+'>'+pr+' COINS</button></div>';}).join('')||'<div class="sub">SOLD OUT — NICE COLLECTION</div>';
  let specRow='';
  if(G.specialOffer&&!(G.dd&&G.dd.noSpec)){const sp=SPECIAL(G.specialOffer),pr=sp.price+spen,aff=G.coins>=pr;specRow='<div class="perk spec"><div><div class="pn">'+sp.mark+' '+sp.name+' <span style="color:#7a5c00">(SPEZIAL)</span></div><div class="pd">'+sp.desc+'</div></div><button class="buy" data-spec-buy="'+sp.id+'" '+(aff?'':'disabled')+'>'+pr+' COINS</button></div>';}
  let itemRow='';
  if(G.itemOffer){const it=CONS(G.itemOffer),pr=it.price,aff=G.coins>=pr&&(G.items||[]).length<2;itemRow='<div class="perk cons"><div><div class="pn">'+it.mark+' '+it.name+' <span style="color:#3a6b54">(ITEM)</span></div><div class="pd">'+it.desc+'</div></div><button class="buy" data-item-buy="'+it.id+'" '+(aff?'':'disabled')+'>'+pr+' COINS</button></div>';}
  let vouchRow='';
  if(G.voucherOffer&&!hasV(G.voucherOffer)){const v=VOUCHER(G.voucherOffer),pr=v.price+spen,aff=G.coins>=pr;vouchRow='<div class="perk vouch"><div><div class="pn">'+v.name+' <span style="color:#7a5c00">(UPGRADE)</span></div><div class="pd">'+v.desc+'</div></div><button class="buy" data-voucher-buy="'+v.id+'" '+(aff?'':'disabled')+'>'+pr+' COINS</button></div>';}
  const _na=G.ante+1;
  const _pb=(_na===WIN_ANTE)?ENDBOSS:(G.nextBoss?BOSS(G.nextBoss):null);
  const nb=_pb?' ·BOSS':'';
  const bossPrev=_pb?'<div class="bossprev">⚠ NÄCHSTE ANTE — BOSS · '+_pb.name+': '+_pb.desc+'</div>':'';
  let rerollBtn='';
  if(!(G.deck&&G.deck.noReroll)){
    const cost=rerollCost();
    const dis=(G.coins>=cost&&G.offers.length)?'':'disabled';
    rerollBtn='<button class="btn" data-act="reroll" '+dis+' style="flex:1">REROLL '+(cost?'1 COIN':'GRATIS')+'</button>';
  }
  showOv('<h3 style="color:var(--mint)">SHOP — '+G.coins+' COINS</h3>'+
    '<div class="shop">'+rows+specRow+itemRow+vouchRow+'</div>'+
    (owned?'<div class="owned">'+owned+'</div>':'')+
    bossPrev+
    '<div style="display:flex;gap:6px;width:100%;margin-top:2px">'+
      rerollBtn+
      '<button class="btn gold" data-act="next" style="flex:1.4">DEAL ANTE '+(G.ante+1)+nb+' &#8599;</button>'+
    '</div>');
}
function buy(i){const p=G.offers[i];if(!p)return;const pr=perkPrice(p);if(G.coins<pr)return;G.coins-=pr;G.perks.push(p.id);G.offers.splice(i,1);SFX.buy();evalAch();renderShop();render();}
function buySpecial(id){const sp=SPECIAL(id);if(!sp||G.specialOffer!==id||G.coins<sp.price)return;if((G.specials||[]).includes(id))return;G.coins-=sp.price;(G.specials=G.specials||[]).push(id);G.specialOffer=null;SFX.buy();renderShop();render();}
function buyItem(id){const it=CONS(id);if(!it||G.itemOffer!==id||G.coins<it.price)return;if((G.items||[]).length>=2)return;G.coins-=it.price;(G.items=G.items||[]).push(id);G.itemOffer=null;SFX.buy();renderShop();render();}
function buyVoucher(id){const v=VOUCHER(id);if(!v||G.voucherOffer!==id||G.coins<v.price)return;if(hasV(id))return;G.coins-=v.price;(G.vouchers=G.vouchers||[]).push(id);G.voucherOffer=null;SFX.buy();renderShop();render();}
function useItem(id){const i=(G.items||[]).indexOf(id);if(i<0||G.phase!=='play')return;
  if(id==='spark')G.roundMult+=1.0;
  else if(id==='midas')G.coins+=6;
  else if(id==='bossbreak'){G.boss=null;G.bossDeadSuit=null;bossFxStop();}   // Boss-Regel weg → auch animierten Boss-Layer (GROSSE STEUER) stoppen, nicht weiterlaufen lassen
  else if(id==='reshuffle'){var all=G.stock.concat(G.waste);all.forEach(function(c){c.up=false;});G.waste=[];G.stock=shuffle(all);}
  G.items.splice(i,1);SFX.buy();hideOv();render();
}
function reroll(){if(G.deck&&G.deck.noReroll)return;const cost=rerollCost();if(G.coins<cost||!G.offers.length)return;G.coins-=cost;const avail=POOL.filter(p=>!G.perks.includes(p.id));G.offers=pickOffers(avail,perkSlots());SFX.click();renderShop();render();}

/* ---- ITEMS: in-game view of owned perks + active deck + boss ---- */
function showItems(){
  if(G.phase!=='play')return;
  const perks=(G.perks||[]).map(id=>{const p=POOL.find(x=>x.id===id);return p?'<div class="perk'+(p.m?' mlt':'')+'"><div><div class="pn">'+p.name+'</div><div class="pd">'+p.desc+'</div></div></div>':'';}).join('')
    ||'<div class="sub">NOCH KEINE ITEMS — KAUFE PERKS IM SHOP</div>';
  const deck=G.deck?'<div class="ideck"><b>DECK · '+G.deck.name+'</b><br>'+G.deck.desc+'</div>':'';
  const boss=G.boss?'<div class="iboss">BOSS · '+G.boss.name+' — '+bossDesc()+'</div>':'';
  const specs=(G.specials||[]).length?'<div class="ispec"><b>SPEZIALKARTEN ('+G.specials.length+')</b><br>'+G.specials.map(id=>{const sp=SPECIAL(id);return sp?sp.mark+' '+sp.name:'?';}).join(' · ')+'</div>':'';
  const items=(G.items||[]).length?G.items.map(id=>{const it=CONS(id);return it?'<div class="perk cons"><div><div class="pn">'+it.mark+' '+it.name+'</div><div class="pd">'+it.desc+'</div></div><button class="buy" data-use-item="'+id+'">EINSETZEN</button></div>':'';}).join(''):'';
  const vouchers=(G.vouchers||[]).length?'<div class="ispec"><b>UPGRADES</b><br>'+G.vouchers.map(id=>{const v=VOUCHER(id);return v?v.name:'?';}).join(' · ')+'</div>':'';
  showOv('<h3 style="color:var(--mint)">DEINE ITEMS</h3>'+
    '<div class="items-list">'+deck+boss+items+specs+vouchers+perks+'</div>'+
    '<button class="btn gold" data-act="items-close" style="flex:0;padding:11px 18px">'+svg('back')+' ZURÜCK</button>');
}

/* ---- help: highlights + floating labels on the actual board ---- */
function showHelp(){
  if(G.phase!=='play')return;
  G.helpMode=!G.helpMode;
  if(!G.helpMode){cleanHelp();$('overlay').classList.add('hidden');}
  render();
}
function addHelpLabels(){
  if(!G.helpMode)return;
  var stage=$('stage'),board=$('board');
  cleanHelp();
  // Glow + label for founds (BANK)
  var founds=board.querySelector('.founds');
  if(founds){founds.classList.add('hlp-glow','hlp-glow-found');
    var l1=hlpLabel(stage,board,'BANK: <b>Ass→König</b> je Farbe = Chips!','found');}
  // Glow + label for stock
  var stock=board.querySelector('[data-pile="stock"]');
  if(stock){stock.classList.add('hlp-glow','hlp-glow-stock');
    var l2=hlpLabel(stage,board,'STAPEL: antippen / <b>LEERTASTE</b>','stock');}
  // Glow + label for tableau
  var tab=board.querySelector('#tab');
  if(tab){tab.classList.add('hlp-glow','hlp-glow-tab');
    var l3=hlpLabel(stage,board,'TABLEAU: <b>absteigend</b>, Farbe <b>abwechselnd</b>','tab');}
  // Glow for HUD
  var hud=$('hud');
  if(hud){hud.classList.add('hlp-glow','hlp-glow-hud');}
  // Goal summary
  var goal=document.createElement('div');
  goal.className='hlp-goal'; goal.innerHTML='Erreiche CHIPS ≥ ZIEL → <b>SHOP</b> &nbsp;·&nbsp; Doppeltipp = direkt auf die Bank';
  stage.appendChild(goal);
  // Dismiss
  var dis=document.createElement('button');
  dis.className='hlp-dismiss'; dis.textContent='✕';
  dis.addEventListener('click',function(e){e.stopPropagation();G.helpMode=false;cleanHelp();render();showScene('game');});
  stage.appendChild(dis);
}
function hlpLabel(stage,board,html,id){
  var el=document.createElement('div');
  el.className='hlp-label hlp-label-'+id; el.innerHTML=html;
  stage.insertBefore(el,board);
  return el;
}
function cleanHelp(){
  document.querySelectorAll('.hlp-label,.hlp-goal,.hlp-dismiss').forEach(function(el){el.remove();});
  document.querySelectorAll('.hlp-glow').forEach(function(el){el.classList.remove('hlp-glow','hlp-glow-found','hlp-glow-stock','hlp-glow-tab','hlp-glow-hud');});
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
function finalizeRun(){   // Run-Abschluss — läuft GENAU EINMAL pro Run (Sieg ODER Niederlage)
  if(RUN.finalized)return; RUN.finalized=true;
  if(G.chips>RUN.bestRound)RUN.bestRound=G.chips;
  if(RUN.totalChips>Store.data.stats.bestRunChips)Store.data.stats.bestRunChips=RUN.totalChips;
  Store.save();
  awardVolt();      // VOLT für die erreichte Tiefe — jetzt AUCH bei sauberem Sieg
  dailySubmit();    // Tages-Score, falls Daily-Run
  submitScore();   // Ewig-/Monats-Leaderboard (idempotent, lastSubmittedAnte guard)
  cloudSync();      // finalen Fortschritt sichern
}

/* ---- GAME OVER: record, persist, render visualization, switch scene ---- */
function gameOver(){
  G.phase='over';
  if(G.tutorial){G.tutorial=false;Store.data.meta.tutDone=true;tutHide();}
  G.helpMode=false; cleanHelp();
  G.history.push({ante:G.ante,chips:G.chips,target:G.target,cleared:false,boss:G.boss?G.boss.id:null,failed:true});
  if(G.chips>Store.data.stats.bestChips){Store.data.stats.bestChips=G.chips;RUN.newBestChips=true;}
  Store.save();
  evalAch();
  finalizeRun();   // bestRunChips + VOLT + Daily + Cloud (einmalig pro Run)
  runActive=false;clearSave();
  SFX.lose();
  renderGameOver();
  showScene('over');
}

function showOv(html){const o=$('overlay');o.innerHTML=html;o.classList.remove('hidden');}
function hideOv(){$('overlay').classList.add('hidden');}
function fitCards(){const inner=$('stage').clientWidth-16;let cw=Math.floor((inner-6*4)/7);cw=Math.max(34,Math.min(cw,60));const ch=Math.round(cw*1.36);const app=$('app');if(!app)return;app.style.setProperty('--cw',cw+'px');app.style.setProperty('--ch',ch+'px');app.style.setProperty('--fanUp',(-Math.round(ch*0.7))+'px');app.style.setProperty('--fanDn',(-Math.round(ch*0.8))+'px');}
function cardEl(c,attr,extra){if(!c.up)return '<div class="card down '+(extra||'')+'" '+attr+'></div>';if(c.special){const sp=SPECIAL(c.special),mk=sp?sp.mark:'?';return '<div class="card spec '+(extra||'')+'" '+attr+'><span class="cn">'+mk+'</span><span class="pip">'+mk+'</span></div>';}return '<div class="card '+(RED(c.s)?'red':'blk')+' s-'+c.s+' '+(extra||'')+'" '+attr+'><span class="cn">'+RANKS[c.r]+suitSvg(c.s)+'</span><span class="pip">'+suitSvg(c.s)+'</span></div>';}
function autoCollect(){
  if(!canAutoCollect())return;
  pushUndo();   // ganzen Auto-Räum-Vorgang rückgängig machbar (kein Chip-Desync)
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
  if(G.boss){bs.classList.remove('hidden');bs.innerHTML='BOSS · '+G.boss.name+' — '+bossDesc();}else bs.classList.add('hidden');
  const nm=$('nomovestrip');
  if(G.phase==='play'&&G.chips<G.target&&!hasProductiveMove()){
    if(nm.classList.contains('hidden'))nm.innerHTML='⚠ KEINE ZÜGE MEHR MÖGLICH — auch Nachziehen &amp; Recyceln bringt keine spielbare Karte.<button data-act="nomove-end">RUNDE BEENDEN</button>';
    nm.classList.remove('hidden');
  }else nm.classList.add('hidden');
  $('hud').classList.toggle('tutglow',G.tutGlow==='hud');
  const _bg=G.tutGlow==='bank'?' tut-glow':'';
  const fOrder=Store.data.opts.foundationOrder||[0,1,2,3];
  let f='';for(let i=0;i<4;i++){const s=fOrder[i];const fo=G.found[s];if(fo.length){const fsel=(G.sel&&G.sel.p==='found'&&G.sel.suit===s)?'sel':'';f+=cardEl(fo[fo.length-1],'data-pile="found" data-suit="'+s+'"',fsel+_bg);}else f+='<div class="slot'+_bg+'" data-pile="found" data-suit="'+s+'">'+suitSvg(s)+'</div>';}
  let w;if(G.waste.length){const sel=G.sel&&G.sel.p==='waste'?'sel':'';w=cardEl(G.waste[G.waste.length-1],'data-pile="waste"',sel);}else w='<div class="slot" data-pile="waste"></div>';
  let st;const _sg=G.tutGlow==='stock'?' tut-glow':'';if(G.stock.length)st='<div class="card down'+_sg+'" data-pile="stock"></div>';else st='<div class="slot'+_sg+'" data-pile="stock">'+(G.rec>0?svg('recycle'):svg('close'))+'</div>';
  let tb='';for(let c=0;c<7;c++){const col=G.tab[c];let inner='';if(col.length===0){inner='<div class="slot" data-pile="tab" data-col="'+c+'" data-idx="-1"></div>';}else{col.forEach((card,i)=>{const fanCls=i===0?'':(card.up?'fan':'fan dn');const selThis=G.sel&&G.sel.p==='tab'&&G.sel.col===c&&i>=G.sel.idx?'sel':'';inner+=cardEl(card,'data-pile="tab" data-col="'+c+'" data-idx="'+i+'"',fanCls+' '+selThis);});}
    tb+='<div class="col">'+inner+'</div>';}
  let autoBtn=canAutoCollect()?'<div class="auto-clear" data-act="autoclear">'+svg('star')+' AUTO-RÄUMEN</div>':'';
  const _sw=Store.data.opts.swapStock?w+st:st+w;
  $('board').innerHTML='<div id="top"><div class="founds">'+f+'</div><div class="spacer"></div>'+_sw+'</div><div id="tab">'+tb+'</div>'+autoBtn;
  if(G.helpMode)addHelpLabels();
  saveGame(); evalAch();   // persist + check achievements after every state change
  renderMultTags();
}

/* ============================================================
   SCENE MANAGER  -  menu / game / ach / opts / over / bye
   ============================================================ */
function showScene(name){
  if(name!=='game')bossFxStop();   // rAF-Schleife stoppen wenn Spielszene verlassen wird
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
  {c:'G',q:'Was ist Klondaire?',a:'Ein Roguelike-Solitär – kombiniert klassisches Klondike mit Balatro-artigem Chip/Mult-Scoring. Baue Karten auf die Bank, sammle Chips, erreiche das Ziel und kaufe Perks im Shop.'},
  {c:'G',q:'Warum heißt das Spiel Klondaire?',a:'Der Name ist ein Wortspiel aus „Klondike" (die bekannteste Solitaire-Variante) und „Solitär". So wie Balatro seinen Namen aus dem Kartenspiel-Jargon nimmt und zu etwas Eigenem verdreht, steht Klondaire für: klassisches Solitaire – aber verdreht zu einem rasanten Roguelike-Deckbuilder.'},
  {c:'G',q:'Wie funktioniert das Scoring?',a:'Jede gebankte Karte gibt BASIS-CHIPS × MULT. Basis-Chips starten bei 10 und werden durch Perks erhöht. MULT startet bei 1.0 und steigt durch Perks wie FIEBER, COMBO und ASS-MULT. Dein Ziel ist es, mit diesen Chips das ANTE-ZIEL zu erreichen.'},
  {c:'G',q:'Was sind Antes?',a:'Antes sind die Runden. Mit jedem Sieg steigt die Ante und das Ziel wird höher. Jede 3. Ante ist ein Boss mit einer Spezialregel, die es schwerer macht.'},
  {c:'P',q:'Was sind Perks?',a:'Perks sind passive Upgrades, die du im SHOP zwischen den Runden kaufst. Sie erhöhen Chips oder MULT. Manche Perks sind permanent (m), andere wirken jede Runde neu.'},
  {c:'P',q:'Was sind Bosse?',a:'Bosse erscheinen alle 3 Antes. Jeder Boss hat eine negative Regel: z.B. STEUER (+40% Ziel), DÜRRE (nur 1 Recycle), HALBE KRAFT (alle Chips halbiert). Bosse besiegen gibt extra Belohnung.'},
  {c:'P',q:'Was passiert nach Ante 8?',a:'Ante 8 zu schaffen = RUN GEWONNEN. Du kannst im ENDLOS-Modus weiterspielen, um deinen Highscore zu verbessern. Oder du gehst ins Hauptmenü und startest mit einem höheren Schwierigkeitsgrad.'},
  {c:'V',q:'Was ist VOLT?',a:'VOLT ist die persistente Währung, die du nach jedem Run bekommst – auch wenn du verlierst. Damit kaufst du neue Decks im DECKS-Menü. Erfolge geben einmalig VOLT dazu.'},
  {c:'V',q:'Wie schalte ich Decks frei?',a:'Im DECKS-Menü kaufst du Decks mit VOLT. Jedes Deck hat Vor- und Nachteile. Das BOSS-STURM-Deck wird durch den Erfolg THRONRÄUBER freigeschaltet.'},
  {c:'V',q:'Was bedeuten die Schwierigkeitsgrade?',a:'Nach einem Sieg (Ante 8) schaltest du den nächsten Schwierigkeitsgrad frei. Höhere Grade erhöhen das Ziel, reduzieren Coins/Recycles, schalten Zinsen oder Undo aus – und bringen Bosse öfter.'},
  {c:'F',q:'Wie funktioniert der Cloud-Save?',a:'Aktiviere die Cloud im CLOUD-Menü mit einem Benutzernamen. Du bekommst einen 8-stelligen Code. Dein Fortschritt wird automatisch nach jeder Runde gespeichert. Mit dem Code lädst du ihn auf jedem Gerät.'},
  {c:'F',q:'Was sind Spezialkarten?',a:'Spezialkarten (Joker, Goldkarte, Mult-Karte) tauchen zufällig im Shop auf. Sie sind WILD – überall anlegbar – und geben beim Einlösen Bonus-Chips oder MULT.'},
  {c:'F',q:'Warum stoppt meine eigene Musik, wenn ich spiele?',a:'Auf dem Handy kann eine Web-App ihren Ton leider nicht mit deiner laufenden Musik (z.B. Apple Music oder Spotify) mischen – sobald das Spiel Musik ODER Soundeffekte abspielt, übernimmt es die Audio-Wiedergabe. Deshalb ist SPIEL-AUDIO standardmäßig AUS – so läuft deine eigene Musik ungestört weiter. Wenn du die Spielmusik & Soundeffekte hören möchtest, schalte SPIEL-AUDIO in den OPTIONEN auf AN.'},
];
function renderFAQ(){
  var cats={G:{n:'GRUNDLAGEN',ic:'star'},P:{n:'GAMEPLAY',ic:'trophy'},V:{n:'FORTSCHRITT',ic:'volt'},F:{n:'FEATURES',ic:'cloud'}};
  var html='', last='';
  FAQ.forEach(function(f,i){
    if(f.c!==last){last=f.c;var c=cats[f.c];html+='<div class="faq-cat"><span class="faq-cat-ic">'+svg(c.ic)+'</span>'+c.n+'</div>';}
    html+='<div class="faq-item" data-faq="'+i+'"><div class="faq-q"><span>'+f.q+'</span></div><div class="faq-a"><span>'+f.a+'</span></div></div>';
  });
  $('faq-list').innerHTML=html;
}
function clStatus(msg,ok){const s=$('cl-status');if(!s)return;s.textContent=msg;s.style.color=(ok===false)?'var(--pink)':(ok?'var(--mint)':'#8fbfa6');s.classList.toggle('loading-pulse',msg.endsWith('…'));}
function renderCloud(){
  const m=Store.data.meta; let h='';
  if(m.cloudCode){
    h+='<div class="cloud-card"><div class="cl-lbl">DEIN CODE</div><div class="cl-code">'+esc(m.cloudCode)+'</div>'+
       '<div class="cl-sub">Benutzer: '+esc(m.cloudName||'—')+'<br>Wird automatisch nach jeder Runde gespeichert.</div>'+
       '<div style="display:flex;gap:6px;width:100%"><button class="btn" data-act="cl-copy" style="flex:1;padding:9px 8px">CODE KOPIEREN</button><button class="btn gold" data-act="cl-upload" style="flex:1;padding:9px 8px">JETZT SICHERN</button></div></div>';
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
  var body=$('rang-body'),sub=$('rang-sub'),tog=$('rang-toggle'),diffTog=$('rang-diff-toggle');
  const today=todayStr();
  const todayFormatted=today.slice(0,4)+'-'+today.slice(4,6)+'-'+today.slice(6,8);
  var isDaily=RANG_MODE==='daily';
  if(sub)sub.textContent=isDaily?('TAGES-CHALLENGE · '+today):(RANG_MODE==='month'?'DIESER MONAT · BESTE ANTE':(RANG_MODE==='week'?'DIESE WOCHE · BESTE ANTE':'EWIG · BESTE ANTE'));
  if(tog){tog.querySelectorAll('.lb-tab').forEach(b=>b.classList.toggle('active',b.dataset.lb===RANG_MODE));}
  if(diffTog){
    diffTog.hidden=isDaily;
    diffTog.querySelectorAll('.lb-tab').forEach(function(b){
      var isAll=b.dataset.lbDiff==='all';
      b.classList.toggle('active',isAll?(RANG_DIFF===null):(+b.dataset.lbDiff===RANG_DIFF));
    });
  }
  body.innerHTML='<div class="ach-prog loading-pulse" style="color:#8fbfa6">Lade …</div>';
  var promise=isDaily?clRpc('kl_daily_board',{p_day:todayFormatted,p_limit:50}):clRpc('kl_board',{p_scope:RANG_MODE,p_limit:50});
  var emptyMsg=isDaily?'Noch keine Einträge für heute – sei der Erste!':(RANG_MODE==='month'?'Diesen Monat noch keine Einträge.':(RANG_MODE==='week'?'Diese Woche noch keine Einträge.':'Noch keine Einträge – spiel eine Runde mit aktivierter Cloud!'));
  promise.then(function(rows){
    var filtered=(!isDaily&&RANG_DIFF!==null)?(rows||[]).filter(function(r){return (r.difficulty||0)===RANG_DIFF;}):rows;
    if(!filtered||!filtered.length){body.innerHTML='<div class="ach-prog" style="color:#8fbfa6">'+emptyMsg+'</div>';return;}
    body.innerHTML=filtered.map(function(r,i){
      r=Object.assign({},r,{rank:i+1});
      var rank=r.rank||(i+1);
      var medal=rank===1?' lb-1':(rank===2?' lb-2':(rank===3?' lb-3':''));
      var cls=(r.username===Store.data.meta.cloudName)?' lb-me':'';
      var chips=(r.best_chips||0).toLocaleString('de-DE');
      var iso=r.created_at?String(r.created_at).slice(0,10):'';
      var dateDE=iso?iso.split('-').reverse().join('.'):'';
      var diff=isDaily?'NORMAL':((DIFFICULTIES[r.difficulty]||DIFFICULTIES[0]).name);
      var deckName=isDaily?'STANDARD':((DECK(r.deck)||{}).name||(r.deck||'STANDARD'));
      var meta=isDaily?'TAGES-CHALLENGE':(dateDE+(diff?' · '+diff:''));
      return '<div class="lb-row'+medal+cls+'" data-expand="'+i+'">'+
        '<div class="lb-rank">'+rank+'</div>'+
        '<div class="lb-mid"><div class="lb-name">'+esc(r.username)+'</div><div class="lb-meta">'+esc(meta)+'</div></div>'+
        '<div class="lb-sc"><div class="lb-ante">A'+r.best_ante+'</div><div class="lb-chips">'+chips+'</div></div>'+
        '<div class="lb-exp">▾</div>'+
        '</div>'+
        '<div class="lb-det" data-det="'+i+'" hidden><span class="lb-detk">DECK</span> '+esc(deckName)+(isDaily?'':' &nbsp;·&nbsp; <span class="lb-detk">MODUS</span> '+esc(diff)+' &nbsp;·&nbsp; <span class="lb-detk">DATUM</span> '+esc(dateDE||'?'))+'</div>';
    }).join('');
  }).catch(function(){
    body.innerHTML='<div class="ach-prog" style="color:var(--pink)">Rangliste nicht erreichbar – bist du online?</div>';
  });
}

/* the menu post-it shows the latest 2 versions */
function renderPostit(){
  const p=PATCH_NOTES[0], p2=PATCH_NOTES[1];
  if(!p){$('postit').style.display='none';return;}
  $('postit-ver').textContent='NEU · '+p.v;
  // Post-it zeigt nur Kurzbezeichnungen — Details im Update-Menü
  function shortNote(n){var s=(n.split(' — ')[0]||n).replace(/\.$/, '');return s.length>45?s.slice(0,44).trimEnd()+'…':s;}
  $('postit-list').innerHTML=p.notes.map(n=>'<li>'+shortNote(n)+'</li>').join('');
  if(p2){$('postit-list').innerHTML+='<li class="pt-old"><b>'+p2.v+'</b>: '+shortNote(p2.notes[0]||'')+'</li>';}
  $('postit-more').style.display='block';
  const tear=document.querySelector('#postit-more .pt-tear'); if(tear)tear.style.display='none';
  document.querySelectorAll('#postit-fringe span.torn').forEach(s=>s.classList.remove('torn'));
}
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
  const bd=$('btn-daily'),chk=$('daily-check');
  if(bd){bd.disabled=(Store.data.meta.dailyDone===todayStr());}
  if(chk){chk.textContent=(Store.data.meta.dailyDone===todayStr()?' ✓':'');}
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

  const fc=$('opt-fourcolor'); if(fc){fc.textContent=o.fourColor?'AN':'AUS';fc.classList.toggle('on',!!o.fourColor);}
  const ef=$('opt-effects'); if(ef){ef.textContent=o.effects!==false?'AN':'AUS';ef.classList.toggle('on',o.effects!==false);}
  const ss=$('opt-swapstock'); if(ss){ss.textContent=o.swapStock?'AN':'AUS';ss.classList.toggle('on',!!o.swapStock);}
  const es2=$('opt-energysave'); if(es2){es2.textContent=o.energySave?'AN':'AUS';es2.classList.toggle('on',!!o.energySave);}
  const bs=$('bg-set');
  if(bs){const cur=o.bgShader||'none';bs.innerHTML=Object.keys(BG.NAMES).map(function(id){return'<button class="theme-btn'+(id===cur?' theme-active':'')+'" data-bg="'+id+'">'+BG.NAMES[id]+'</button>';}).join('');}
  const mo=$('opt-audio'); if(mo){mo.textContent=o.audioOn!==false?'AN':'AUS';mo.classList.toggle('on',o.audioOn!==false);}
  const sp=Math.round(o.sfxVol*100), mp=Math.round(o.musicVol*100);
  $('opt-sfx').value=sp; $('sfx-pct').textContent=sp+'%';
  $('opt-musicvol').value=mp; $('music-pct').textContent=mp+'%';
  document.querySelectorAll('#scaleset .sbtn').forEach(b=>b.classList.toggle('on',parseFloat(b.dataset.scale)===(o.scale||1)));
  // theme rendering
  var selTheme=Store.data.meta.selectedTheme||'og';
  $('theme-set').innerHTML=Object.keys(THEMES).map(function(k){
    var t=THEMES[k];
    var active=k===selTheme?' theme-active':'';
    return '<button class="theme-btn'+active+'" data-theme="'+k+'" title="'+t.mint+'/'+t.gold+'/'+t.pink+'"><span class="theme-swatch" style="background:'+t.mint+'"></span>'+k.toUpperCase()+'</button>';
  }).join('');
  // foundation order rendering
  const fo=$('found-order');
  if(fo){
    const order=o.foundationOrder||[0,1,2,3];
    fo.innerHTML=order.map(function(s,i){
      const sel=i===foundSwapIdx?' fo-sel':'';
      return '<button class="fo-suit'+sel+'" data-fo="'+i+'">'+suitSvg(s)+'</button>';
    }).join('');
  }
}

/* WEBGL BACKGROUND SHADERS — siehe bg.js (Global `BG`, geladen vor game.js) */
function applyOpts(){ const v=Store.data.opts.crt||0; document.documentElement.style.setProperty('--crt-opacity',v); document.body.classList.toggle('crt-off',v===0); const es=!!Store.data.opts.energySave; document.body.classList.toggle('energy-save',es); BG.select(es?'none':(Store.data.opts.bgShader||'none')); applyTheme(); var app=$('app'); if(app)app.classList.toggle('four-color',!!Store.data.opts.fourColor); fitCards(); }
function applyTheme(){
  var t=THEMES[Store.data.meta.selectedTheme]||THEMES.og, app=$('app');
  if(!app)return;
  app.style.setProperty('--mint',t.mint);
  app.style.setProperty('--gold',t.gold);
  app.style.setProperty('--pink',t.pink);
  app.style.setProperty('--felt',t.felt);
  app.style.setProperty('--panel',t.panel);
  var bg=$('bgfx'),tint=$('bgtint');
  if(bg){
    if(t.bg){
      var x0=hexRgb(t.bg[0]);
      bg.style.background=
        'radial-gradient(45% 45% at 28% 32%, rgba('+x0.r+','+x0.g+','+x0.b+',.70), transparent 70%),'+
        'radial-gradient(50% 50% at 76% 70%, rgba('+x0.r+','+x0.g+','+x0.b+',.60), transparent 72%),'+
        'radial-gradient(42% 42% at 60% 18%, rgba('+x0.r+','+x0.g+','+x0.b+',.40), transparent 75%)';
    }else bg.style.background='none';
  }
  if(tint){tint.style.background=t.bg?'rgba('+hexRgb(t.bg[0]).r+','+hexRgb(t.bg[0]).g+','+hexRgb(t.bg[0]).b+',.65)':'none';}
}
/* UI scaling — immer automatisch an die Fenstergröße angepasst.
   o.scale dient als relativer Multiplikator (0.8 = 20% kleiner als Auto-Fit).
   transform:scale lässt clientWidth unverändert, sodass fitCards() korrekt bleibt. */
function applyScale(){
  const o=Store.data.opts, app=$('app');
  const aw=Math.min(window.innerWidth-16, 440);
  let base=(window.innerWidth-16)/aw; // nur Breite — Höhe scrollt
  base=Math.max(0.4,Math.min(base,2.5));
  const s=Math.max(0.3,Math.min(base*(o.scale||1),3));
  app.style.transform='scale('+s+')';
  app.style.marginBottom=Math.round((s-1)*(app.offsetHeight||640))+'px';
}

/* ---- GAME OVER visualization ---- */
function renderGameOver(){
  const s=Store.data.stats, h=G.history;
  $('go-sub').innerHTML=(G.endless?'ENDLOSMODUS · ':'')+'RUN BEENDET — ANTE '+G.ante+(G.boss?' · BOSS':'')+'<br>'+
    'BENÖTIGT '+G.target+' · ERREICHT '+G.chips+'<br>'+
    '<span style="font-size:.7em;opacity:.75">SEED '+esc(G.seed||'?')+'</span>';
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
$('multtags').addEventListener('click',function(e){var b=e.target.closest('[data-use-item]');if(b)useItem(b.dataset.useItem);});   // Items aus der Leiste einsetzen
// overlay (round-clear + shop + items)
$('overlay').addEventListener('click',function(e){
  const b=e.target.closest('[data-buy]');if(b){buy(+b.dataset.buy);return;}
  const sb=e.target.closest('[data-spec-buy]');if(sb){buySpecial(sb.dataset.specBuy);return;}
  const ib=e.target.closest('[data-item-buy]');if(ib){buyItem(ib.dataset.itemBuy);return;}
  const vb=e.target.closest('[data-voucher-buy]');if(vb){buyVoucher(vb.dataset.voucherBuy);return;}
  const ui=e.target.closest('[data-use-item]');if(ui){SFX.click();useItem(ui.dataset.useItem);return;}
  const a=e.target.closest('[data-act]');if(!a)return;const act=a.dataset.act;
  if(act==='shop'){SFX.click();openShop();}
  else if(act==='next'){SFX.click();G.ante++;newRound();submitScore();dailySubmit();}
  else if(act==='reroll')reroll();
  else if(act==='items-close')hideOv();
  else if(act==='endless'){G.endless=true;SFX.click();openShop();}     // keep playing past the win
  else if(act==='winmenu'){finalizeRun();runActive=false;clearSave();SFX.click();showScene('menu');}
});
// top bar: home pauses to menu (run stays); items + give up
$('homebtn').addEventListener('click',function(){SFX.click();if(runActive){submitScore();dailySubmit();}showScene('menu');if(G)G.helpMode=false;});
$('itemsbtn').addEventListener('click',function(){SFX.click();showItems();});
$('undobtn').addEventListener('click',function(){doUndo();});
$('helpbtn').addEventListener('click',function(){SFX.click();showHelp();});
$('giveupbtn').addEventListener('click',function(){SFX.click();if(runActive&&confirm('Diesen Run aufgeben? Das führt direkt zum Game-Over.'))gameOver();});
$('nomovestrip').addEventListener('click',function(e){if(!e.target.closest('[data-act="nomove-end"]'))return;SFX.click();if(G.phase==='play'&&confirm('Keine Züge mehr möglich — Runde beenden?'))gameOver();});
// main menu
$('scene-menu').addEventListener('click',function(e){
  const b=e.target.closest('[data-go]');
  if(b){
    SFX.click();
    const go=b.dataset.go;
    if(go==='resume')doResume();
    else if(go==='start'){showScene('game');fitCards();newRun();}
    else if(go==='daily')doDaily();
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
// leaderboard toggle: all vs daily
$('scene-rang').addEventListener('click',function(e){
  const t=e.target.closest('[data-lb]');
  if(t){SFX.click();RANG_MODE=t.dataset.lb;renderRang();return;}
  const df=e.target.closest('[data-lb-diff]');
  if(df){SFX.click();RANG_DIFF=(df.dataset.lbDiff==='all')?null:+df.dataset.lbDiff;renderRang();return;}
  const row=e.target.closest('[data-expand]');
  if(row){var d=$('rang-body').querySelector('[data-det="'+row.dataset.expand+'"]');if(d){d.hidden=!d.hidden;SFX.click();}}
});
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
  }else if(act==='cl-upload'){
    clStatus('Lade hoch …');
    cloudSaveNow().then(function(){clStatus('In der Cloud gesichert ✓',true);},function(err){console.log('cloudSaveNow error',err);clStatus('Sichern fehlgeschlagen'+(err?': '+err:''),false);});
  }else if(act==='cl-disconnect'){
    Store.data.meta.cloudCode='';Store.data.meta.cloudName='';Store.save();renderCloud();clStatus('Cloud getrennt (lokaler Stand bleibt).',true);
  }
});
// options toggles + reset + UI scale
$('scene-opts').addEventListener('click',function(e){
  const sc=e.target.closest('[data-scale]');
  if(sc){Store.data.opts.scale=parseFloat(sc.dataset.scale);Store.save();applyScale();renderOpts();SFX.click();return;}
  const t=e.target.closest('[data-opt]');
  if(t){const k=t.dataset.opt;Store.data.opts[k]=!Store.data.opts[k];Store.save();applyOpts();applyScale();if(k==='audioOn'){if(Store.data.opts.audioOn){SFX.ensure();SFX.resume();SFX.preload();}Music.setVol();}renderOpts();SFX.click();return;}
  const th=e.target.closest('[data-theme]');
  if(th){Store.data.meta.selectedTheme=th.dataset.theme;Store.save();applyOpts();renderOpts();SFX.click();return;}
  const bg=e.target.closest('[data-bg]');
  if(bg){Store.data.opts.bgShader=bg.dataset.bg;Store.save();applyOpts();renderOpts();SFX.click();return;}
  const fo=e.target.closest('[data-fo]');
  if(fo){
    const idx=+fo.dataset.fo;
    const order=(Store.data.opts.foundationOrder||[0,1,2,3]).slice();
    if(foundSwapIdx===-1){foundSwapIdx=idx;renderOpts();}
    else if(foundSwapIdx===idx){foundSwapIdx=-1;renderOpts();}
    else {const tmp=order[foundSwapIdx];order[foundSwapIdx]=order[idx];order[idx]=tmp;Store.data.opts.foundationOrder=order;foundSwapIdx=-1;Store.save();applyOpts();renderOpts();SFX.click();}
    return;
  }
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
// dev menu: tap build label 10 times to toggle
(function(){
  let devTaps=0, devTimer=null, devShown=false;
  const build=$('menu-build'), panel=$('dev-panel');
  const tm=$('dev-testmult');
  function updateDevTestMult(){if(tm)tm.textContent='TEST-MULT: '+(Store.data.opts.testMult?'x5':'AUS');}
  if(!build||!panel)return;
  build.addEventListener('click',function(){
    devTaps++;
    if(devTimer)clearTimeout(devTimer);
    devTimer=setTimeout(function(){devTaps=0;},1200);
    if(devTaps>=10){
      devTaps=0; if(devTimer)clearTimeout(devTimer); devTimer=null;
      devShown=!devShown; panel.hidden=!devShown; build.classList.toggle('dev-active',devShown);
      if(devShown){SFX.buy();updateDevTestMult();}
      else SFX.click();
    }
  });
  $('dev-daily').addEventListener('click',function(){
    if(!confirm('Tages-Lock wirklich zurücksetzen?'))return;
    Store.data.meta.dailyDone='';Store.save();renderMenu();SFX.click();alert('Tages-Lock zurückgesetzt – du kannst die Challenge erneut testen.');
  });
  if(tm){tm.addEventListener('click',function(){Store.data.opts.testMult=!Store.data.opts.testMult;Store.save();updateDevTestMult();SFX.click();});}
})();
// tutorial coach buttons (Weiter / Los / Überspringen)
$('tutbox').addEventListener('click',function(e){const b=e.target.closest('[data-tut]');if(!b)return;SFX.click();if(b.dataset.tut==='skip')endTutorial();else tutNext();});
// game over buttons
$('scene-over').addEventListener('click',function(e){
  const a=e.target.closest('[data-act]');if(!a)return;SFX.click();
  if(a.dataset.act==='retry'){showScene('game');fitCards();newRun();}
  else if(a.dataset.act==='menu')showScene('menu');
});
// resize: refit cards (while playing) + recompute UI scale (fit-to-window)
window.addEventListener('resize',function(){
  if(!$('scene-game').hidden){fitCards();render();}
  var bc=$('boss-bg');if(bc){bc.width=bc.offsetWidth||440;bc.height=bc.offsetHeight||600;}
  applyScale();
});
// keyboard: Space draws the next card (only in active play, no overlay open)
window.addEventListener('keydown',function(e){
  if($('scene-game').hidden||G.phase!=='play')return;
  if(!$('overlay').classList.contains('hidden'))return;
  if(e.code==='Space'||e.key===' '){e.preventDefault();handleStock();}
});
// resume audio on first user gesture (mobile autoplay policy)
window.addEventListener('pointerdown',function init(){if(Store.data.opts.audioOn){SFX.ensure();SFX.resume();SFX.preload();}Music.kick();window.removeEventListener('pointerdown',init);},{once:true});
document.addEventListener('visibilitychange',function(){if(document.hidden){submitScore(true);dailySubmit();if(Music.el)Music.el.pause();}else{Music.sync();}});
window.addEventListener('pagehide',function(){submitScore(true);dailySubmit();});

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
if('serviceWorker' in navigator){
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(function(reg){
      // check for updates every 60s while the app is open
      setInterval(function(){reg.update();},60000);
      // if a new version is waiting, reload when back in the menu (avoid mid-run reload)
      reg.addEventListener('updatefound',function(){
        const newWorker=reg.installing;
        if(!newWorker)return;
        newWorker.addEventListener('statechange',function(){
          if(newWorker.state==='installed'&&navigator.serviceWorker.controller){
            function tryReload(){if(G&&G.phase!=='play'&&runActive===false){window.location.reload();}}
            tryReload();
            setInterval(tryReload,5000);
          }
        });
      });
    }).catch(function(){});
  });
}
})();
