/* KLONDAIRE © 2026 Mats (Matshio7) — Alle Rechte vorbehalten. Keine Lizenz: Nutzung, Kopieren, Verändern oder Weiterverwendung (auch von Teilen) ohne schriftliche Genehmigung untersagt. Siehe LICENSE. */
/* ============================================================================
 *  Boss-Asset: GROSSE STEUER  (Boss-ID: "bigtax", ZIEL +80%)
 *  48x48 Pixel-Art + 4 Animationszustaende. Vanilla JS, keine Dependencies.
 *  Bindet sich an  window.BossGrosseSteuer.
 *
 *  Zustaende:
 *    'appear'  – Boss faellt mit Overshoot + gruenem Blitzring ins Bild
 *    'idle'    – Atmen/Wippen, €-Augen pulsieren, Monokelkette schwingt
 *    'hit'     – Treffer: Ruckeln + Weiss/Rot-Flash + Muenzen spritzen ab
 *    'defeat'  – Niederlage: ergraut, kippt/sackt weg, X-Augen, faded aus
 *
 *  Plan / Einbau: dezenter Hintergrund-Layer, UNTEN verankert, HINTER den
 *  Karten, 16% Deckkraft. Canvas hinter dem Spielfeld platzieren (z-index < Karten),
 *  dann:
 *    const ctrl = BossGrosseSteuer.attach(bossCanvas, {
 *      anchor: 'bottom',   // Sprite-Fuss an der Unterkante
 *      marginBottom: 0,    // ggf. Abstand nach unten
 *      opacity: 0.16,      // setzt canvas.style.opacity
 *      showText: false,    // "AUTSCH!"/"BESIEGT" im Hintergrund ausblenden
 *      state: 'appear'
 *    });
 *    ctrl.play('hit');      // wenn der Spieler punktet (Boss bekommt Schaden)
 *    ctrl.play('defeat');   // wenn der Boss besiegt ist
 *    ctrl.setState('idle'); // Dauerzustand
 *    ctrl.stop();           // rAF-Schleife beenden
 *
 *  Einzelframe ohne Schleife:
 *    BossGrosseSteuer.renderFrame(ctx, cx, cy, scale, { state:'idle', t: ms });
 * ========================================================================== */
(function (global) {
  'use strict';
  var G = 48;

  var P = {
    hatDark: '#14141e', hatMid: '#20202e', hatHi: '#3a3a52',
    bandG: '#1f7a3d', bandGHi: '#2fa355',
    money: '#4dff7a', moneyHi: '#b6ffd0',
    skin: '#e7b98a', skinHi: '#f5d4a8', skinSh: '#b97e4f', skinSh2: '#7c4f23',
    white: '#f2f5ff', gold: '#ffd24d', goldHi: '#fff0b0',
    mouth: '#2a0712', tie: '#ff2e63', tieHi: '#ff6f91',
    suit: '#1b1f33', suitHi: '#2a3050', coin: '#ffd24d', coinSh: '#c79a2e'
  };

  /* ---- Sprite einmalig in einen Pixel-Puffer zeichnen -------------------- */
  function build() {
    var buf = [];
    for (var y = 0; y < G; y++) { buf.push(new Array(G).fill(null)); }
    function s(x, y, c) { if (x >= 0 && x < G && y >= 0 && y < G) buf[y][x] = c; }
    function m(x, y, c) { s(x, y, c); s(G - 1 - x, y, c); }
    function rect(x0, y0, w, h, c) { for (var yy = y0; yy < y0 + h; yy++) for (var xx = x0; xx < x0 + w; xx++) s(xx, yy, c); }

    // Zylinder
    rect(13, 2, 22, 2, P.hatDark);
    rect(14, 4, 20, 16, P.hatDark);
    rect(15, 5, 2, 11, P.hatHi);
    rect(31, 5, 2, 13, P.hatMid);
    rect(14, 15, 20, 5, P.bandG);
    rect(14, 15, 20, 1, P.bandGHi);
    [[20, 16], [21, 15], [21, 16], [21, 17], [20, 17], [20, 18], [21, 19]].forEach(function (p) { s(p[0], p[1], P.money); });
    [[24, 15], [25, 15], [26, 15], [24, 16], [24, 17], [25, 17], [26, 17], [24, 18], [24, 19], [25, 19], [26, 19]].forEach(function (p) { s(p[0], p[1], P.money); });
    rect(9, 20, 30, 3, P.hatDark);
    rect(10, 20, 7, 1, P.hatHi);
    rect(9, 22, 30, 1, P.hatMid);

    // Gesicht
    rect(13, 23, 22, 18, P.skin);
    m(13, 23, null); m(14, 23, null); m(13, 24, null);
    rect(15, 24, 16, 2, P.skinHi);
    rect(13, 29, 2, 10, P.skinSh2);
    rect(13, 35, 3, 5, P.skinSh);

    // Augenbrauen (boese, schraeg)
    [[15, 28], [16, 28], [17, 27], [18, 27], [19, 26], [20, 26], [21, 26],
     [15, 29], [16, 29], [17, 28], [18, 28], [19, 27], [20, 27], [21, 27]]
      .forEach(function (p) { m(p[0], p[1], P.skinSh2); });

    // Augen-Sklera + €-Glyphe (gespiegelt)
    rect(15, 29, 6, 7, P.white);
    rect(27, 29, 6, 7, P.white);
    [[16, 30], [17, 30], [18, 30], [15, 31], [16, 31], [15, 32], [16, 32], [17, 32],
     [18, 32], [15, 33], [16, 33], [16, 34], [17, 34], [18, 34]]
      .forEach(function (p) { m(p[0], p[1], P.money); });
    m(18, 30, P.moneyHi); m(18, 34, P.moneyHi);

    // Monokel (nur rechtes Auge) + Kette
    [[27, 28], [28, 28], [29, 28], [30, 28], [31, 28], [32, 28],
     [26, 29], [26, 30], [26, 31], [26, 32], [26, 33], [26, 34], [26, 35],
     [33, 29], [33, 30], [33, 31], [33, 32], [33, 33], [33, 34], [33, 35],
     [27, 36], [28, 36], [29, 36], [30, 36], [31, 36], [32, 36]]
      .forEach(function (p) { s(p[0], p[1], P.gold); });
    [[33, 37], [34, 38], [34, 39], [34, 40], [33, 41], [33, 42]].forEach(function (p) { s(p[0], p[1], P.goldHi); });

    // Nase
    rect(22, 31, 4, 6, P.skin);
    rect(25, 32, 1, 5, P.skinSh);
    s(22, 36, P.mouth); s(25, 36, P.mouth);
    s(23, 30, P.skinHi);

    // Schnurrbart (Handlebar)
    [[15, 37], [16, 37], [17, 37], [18, 37], [19, 37], [20, 37], [21, 37], [22, 37],
     [16, 38], [17, 38], [18, 38], [19, 38], [20, 38], [21, 38], [22, 38],
     [14, 36], [15, 36], [14, 35]].forEach(function (p) { m(p[0], p[1], P.skinSh2); });

    // Mund + Goldzaehne
    rect(18, 39, 12, 1, P.mouth);
    for (var x = 18; x < 30; x++) s(x, 40, (x % 2 === 0) ? P.gold : P.mouth);
    s(20, 40, P.goldHi); s(26, 40, P.goldHi);
    rect(19, 41, 10, 1, P.skinSh);

    // Kinn
    rect(16, 41, 16, 1, P.skin);
    rect(18, 42, 12, 1, P.skin);
    rect(20, 43, 8, 1, P.skinSh);

    // Kragen / Anzug / Fliege
    rect(15, 43, 18, 2, P.white);
    s(15, 45, P.white); s(32, 45, P.white);
    rect(8, 45, 32, 3, P.suit);
    [[9, 45], [10, 45], [11, 46], [12, 46], [10, 46]].forEach(function (p) { m(p[0], p[1], P.suitHi); });
    rect(21, 43, 6, 4, P.tie);
    rect(22, 43, 4, 1, P.tieHi);
    rect(23, 45, 2, 2, P.mouth);

    // Muenzen am Kragen
    [[7, 44], [6, 46], [10, 46], [40, 44], [41, 46], [37, 46]].forEach(function (c) {
      rect(c[0], c[1], 3, 2, P.coin); s(c[0], c[1], P.goldHi); s(c[0] + 2, c[1] + 1, P.coinSh);
    });

    return buf;
  }

  var BUF = build();
  var MONEY = { '#4dff7a': 1, '#b6ffd0': 1 };

  /* ---- Farb-Helfer ------------------------------------------------------- */
  function hx(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function toHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join('');
  }
  function lerpHex(a, b, t) { var A = hx(a), B = hx(b); return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  function greyHex(a, t) { var A = hx(a); var l = A[0] * 0.299 + A[1] * 0.587 + A[2] * 0.114; return toHex(A[0] + (l - A[0]) * t, A[1] + (l - A[1]) * t, A[2] + (l - A[2]) * t); }

  function modColor(hex, mod) {
    if (!mod) return hex;
    var c = hex;
    if (mod.grey) c = greyHex(c, mod.grey);
    if (mod.white) c = lerpHex(c, '#ffffff', mod.white);
    if (mod.red) c = lerpHex(c, '#ff3344', mod.red);
    return c;
  }

  /* ---- Sprite zeichnen (mit Glow + Farb-Mod) ----------------------------- */
  function drawSprite(ctx, ox, oy, scale, opt) {
    opt = opt || {};
    var mod = opt.mod, glow = (opt.glow == null ? 1 : opt.glow);
    var r, c, col;
    for (var pass = 0; pass < 2; pass++) {
      ctx.shadowColor = P.money; ctx.shadowBlur = pass === 0 ? scale * glow : 0;
      for (r = 0; r < G; r++) for (c = 0; c < G; c++) {
        col = BUF[r][c]; if (!col) continue;
        ctx.fillStyle = modColor(col, mod);
        ctx.fillRect(ox + c * scale, oy + r * scale, scale, scale);
      }
    }
    // €-Augen extra Glow
    var eg = opt.eyeGlow == null ? 1.8 : opt.eyeGlow;
    ctx.shadowColor = P.money; ctx.shadowBlur = scale * eg;
    for (r = 0; r < G; r++) for (c = 0; c < G; c++) {
      col = BUF[r][c]; if (!MONEY[col]) continue;
      ctx.fillStyle = modColor(col, mod);
      ctx.fillRect(ox + c * scale, oy + r * scale, scale, scale);
    }
    ctx.shadowBlur = 0;
  }

  /* ---- Ein Animationsframe ----------------------------------------------- */
  // anim = { state, t (ms seit Zustands-Start), seed? }
  function renderFrame(ctx, cx, cy, scale, anim) {
    var st = anim.state || 'idle', t = anim.t || 0;
    var spriteW = G * scale, spriteH = G * scale;
    var ox = cx - spriteW / 2, oy = cy - spriteH / 2;

    ctx.save();

    if (st === 'idle') {
      var bob = Math.sin(t / 600) * scale * 1.2;
      var breathe = 1 + Math.sin(t / 600) * 0.012;
      var glow = 0.7 + 0.5 * (0.5 + 0.5 * Math.sin(t / 380));
      ctx.translate(cx, cy + bob);
      ctx.scale(breathe, breathe);
      ctx.translate(-cx, -cy);
      drawSprite(ctx, ox, oy, scale, { glow: 1, eyeGlow: glow * 1.8 });
      ctx.restore();
      return;
    }

    if (st === 'appear') {
      var D = 950, p = Math.min(t / D, 1);
      var eb = easeOutBack(Math.min(p / 0.8, 1));
      var dropY = (1 - eb) * -spriteH * 1.4;
      var alpha = Math.min(t / 260, 1);
      ctx.globalAlpha = alpha;
      ctx.translate(0, dropY);
      drawSprite(ctx, ox, oy, scale, { glow: 1 + (1 - p) * 2, eyeGlow: 1.8 });
      ctx.restore();
      // gruener Blitzring (in Bildschirm-Koordinaten, ohne drop)
      if (p < 0.55) {
        var rp = p / 0.55;
        ctx.save();
        ctx.globalAlpha = (1 - rp) * 0.8;
        ctx.strokeStyle = P.money; ctx.lineWidth = Math.max(1, scale * 0.6);
        ctx.shadowColor = P.money; ctx.shadowBlur = scale * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, spriteW * 0.2 + rp * spriteW * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    if (st === 'hit') {
      var DH = 460, ph = Math.min(t / DH, 1);
      var decay = 1 - ph;
      var shake = Math.sin(t / 24) * scale * 1.6 * decay;
      var squash = 1 - 0.12 * Math.sin(Math.min(ph / 0.3, 1) * Math.PI) * decay;
      var white = Math.max(0, 1 - t / 120);
      var red = Math.max(0, (1 - t / 320)) * 0.6;
      ctx.translate(cx + shake, cy);
      ctx.scale(1 / squash, squash);
      ctx.translate(-cx, -cy);
      drawSprite(ctx, ox, oy, scale, { glow: 1, eyeGlow: 1.8, mod: { white: white, red: red } });
      ctx.restore();
      // Schaden-Partikel (Muenzen) + "-" Marker
      hitParticles(ctx, cx, cy, scale, t, anim);
      return;
    }

    if (st === 'defeat') {
      var DD = 1500, pd = Math.min(t / DD, 1);
      var shakeD = (pd < 0.25) ? Math.sin(t / 26) * scale * 1.4 : 0;
      var slump = ease(Math.max(0, (pd - 0.2) / 0.8));
      var rot = slump * 0.5;          // kippt zur Seite
      var sink = slump * spriteH * 0.9;
      var alphaD = 1 - Math.max(0, (pd - 0.55) / 0.45);
      var grey = Math.min(1, pd / 0.5);
      ctx.globalAlpha = Math.max(0, alphaD);
      ctx.translate(cx + shakeD, cy + sink);
      ctx.rotate(rot);
      ctx.translate(-cx, -cy);
      drawSprite(ctx, ox, oy, scale, { glow: (1 - grey) * 0.8, eyeGlow: 0, mod: { grey: grey, red: 0 } });
      // X-Augen ab Mitte
      if (pd > 0.3) drawDeadEyes(ctx, ox, oy, scale, Math.min(1, (pd - 0.3) / 0.2));
      ctx.restore();
      defeatParticles(ctx, cx, cy, scale, t, anim);
      return;
    }

    ctx.restore();
  }

  function drawDeadEyes(ctx, ox, oy, scale, a) {
    ctx.save();
    ctx.globalAlpha = a; ctx.strokeStyle = '#ff3344'; ctx.lineWidth = Math.max(1.5, scale * 0.5);
    ctx.lineCap = 'round';
    [[15, 20, 29, 35], [27, 32, 29, 35]].forEach(function (e) {
      var x0 = ox + e[0] * scale, x1 = ox + (e[1] + 1) * scale, y0 = oy + e[2] * scale, y1 = oy + (e[3] + 1) * scale;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.moveTo(x1, y0); ctx.lineTo(x0, y1); ctx.stroke();
    });
    ctx.restore();
  }

  /* ---- Partikel ---------------------------------------------------------- */
  function rng(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }

  function hitParticles(ctx, cx, cy, scale, t, anim) {
    var R = rng((anim.seed || 1) * 7 + 13), n = 7, g = 0.0009 * scale;
    ctx.save();
    for (var i = 0; i < n; i++) {
      var ang = -Math.PI / 2 + (R() - 0.5) * 2.2;
      var sp = (0.18 + R() * 0.14) * scale;
      var px = cx + Math.cos(ang) * sp * t * 0.16;
      var py = cy + Math.sin(ang) * sp * t * 0.16 + g * t * t;
      var a = Math.max(0, 1 - t / 420);
      ctx.globalAlpha = a; ctx.fillStyle = P.coin;
      ctx.shadowColor = P.gold; ctx.shadowBlur = scale;
      var sz = scale * 0.8;
      ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
    }
    if (anim.showText !== false) {
      ctx.globalAlpha = Math.max(0, 1 - t / 360);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ff5577';
      ctx.font = '600 ' + Math.round(scale * 4) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AUTSCH!', cx, cy - G * scale * 0.45 - t * 0.03 * scale);
    }
    ctx.restore();
  }

  function defeatParticles(ctx, cx, cy, scale, t, anim) {
    var R = rng((anim.seed || 1) * 11 + 5), n = 12, g = 0.0006 * scale;
    ctx.save();
    for (var i = 0; i < n; i++) {
      var ang = -Math.PI / 2 + (R() - 0.5) * 3.0;
      var sp = (0.1 + R() * 0.16) * scale;
      var px = cx + Math.cos(ang) * sp * t * 0.12;
      var py = cy + Math.sin(ang) * sp * t * 0.12 + g * t * t;
      var a = Math.max(0, 1 - t / 1300);
      ctx.globalAlpha = a; ctx.fillStyle = (i % 2) ? P.coin : P.money;
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = scale;
      var sz = scale * (0.6 + R() * 0.5);
      ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
    }
    ctx.shadowBlur = 0;
    var ta = Math.max(0, Math.min(1, (t - 500) / 300)) * Math.max(0, 1 - (t - 900) / 600);
    if (ta > 0 && anim.showText !== false) {
      ctx.globalAlpha = ta; ctx.fillStyle = P.money;
      ctx.shadowColor = P.money; ctx.shadowBlur = scale * 1.5;
      ctx.font = '600 ' + Math.round(scale * 4.2) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BESIEGT', cx, cy - G * scale * 0.3);
    }
    ctx.restore();
  }

  /* ---- Easing ------------------------------------------------------------ */
  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function easeOutBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }

  /* ---- Controller mit rAF-Schleife ---------------------------------------
   * opts:
   *   scale      Pixelgroesse (Default: passt ins Canvas)
   *   state      Startzustand ('idle' | 'appear' | 'hit' | 'defeat')
   *   anchor     'center' (Default) | 'bottom' – am unteren Rand ausrichten
   *   marginBottom  Abstand des Sprite-Fusses zur Unterkante (px, Default 0)
   *   opacity    setzt canvas.style.opacity (z.B. 0.16 fuer Hintergrund-Layer)
   *   showText   false blendet "AUTSCH!"/"BESIEGT" aus (fuer Hintergrundmodus)
   *   clear      false: Canvas nicht selbst leeren (Layer ueber anderem Inhalt)
   * ------------------------------------------------------------------------ */
  function attach(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var scale = opts.scale || Math.floor(Math.min(canvas.width, canvas.height) / (G + 8));
    var spriteH = G * scale;
    var cx = opts.cx == null ? canvas.width / 2 : opts.cx;
    var cy;
    if (opts.cy != null) cy = opts.cy;
    else if (opts.anchor === 'bottom') cy = canvas.height - (opts.marginBottom || 0) - spriteH / 2;
    else cy = canvas.height / 2;
    var showText = opts.showText;
    if (opts.opacity != null) canvas.style.opacity = String(opts.opacity);
    var state = opts.state || 'idle';
    var seed = opts.seed || ((Math.random() * 1e6) | 0);
    var stateStart = performance.now();
    var raf = 0, running = true;
    // Zustaende, die einmal laufen und danach zu 'idle' zurueckfallen:
    var ONESHOT = { appear: 950, hit: 460 };

    function loop(now) {
      if (!running) return;
      var t = now - stateStart;
      if (ONESHOT[state] && t > ONESHOT[state]) { state = 'idle'; stateStart = now; t = 0; }
      if (opts.clear !== false) ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (opts.onFrame) opts.onFrame(ctx, t, state);
      renderFrame(ctx, cx, cy, scale, { state: state, t: t, seed: seed, showText: showText });
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return {
      setState: function (s) { state = s; stateStart = performance.now(); seed = (Math.random() * 1e6) | 0; },
      play: function (s) { state = s; stateStart = performance.now(); seed = (Math.random() * 1e6) | 0; },
      get state() { return state; },
      stop: function () { running = false; cancelAnimationFrame(raf); },
      resume: function () { if (!running) { running = true; stateStart = performance.now(); raf = requestAnimationFrame(loop); } }
    };
  }

  global.BossGrosseSteuer = {
    W: G, H: G, buffer: BUF, palette: P,
    build: build, drawSprite: drawSprite, renderFrame: renderFrame, attach: attach
  };
})(typeof window !== 'undefined' ? window : this);
