/* KLONDAIRE — Umzugs-Helfer.
   Läuft NUR auf der alten Domain (matshio7.github.io). Auf play.klondaire.com
   und lokal passiert nichts — außer du hängst ?klpreview=1 an (zum Ansehen).
   Neues Zuhause: https://play.klondaire.com
   Spielstand-Transfer: packt den kompletten localStorage in den Link
   (#klimport=…); die neue Seite liest ihn beim ersten Laden ein. */
(function () {
  var isOld = /(^|\.)github\.io$/i.test(location.hostname);
  var preview = /[?&]klpreview=1/.test(location.search); // Vorschau auf jeder Domain
  if (!isOld && !preview) return;

  var NEW = 'https://play.klondaire.com/';

  /* ====== DATEN — hier anpassen ======
     DEADLINE = was die Spieler sehen (Countdown-Ziel, „danach futsch").
     CUTOFF   = echter Hard-Stop: ab hier nur noch der Vollbild-Hinweis.
                Bis dahin bleibt das Spiel über den alten Link in Wahrheit spielbar. */
  var DEADLINE = Date.parse('2026-07-02T23:59:59'); // 7 Tage (sichtbar)
  var CUTOFF   = Date.parse('2026-07-16T00:00:00'); // echtes Abschalten (still später)

  var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function exportHash() {
    var o = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      o[k] = localStorage.getItem(k);
    }
    var b64 = btoa(unescape(encodeURIComponent(JSON.stringify(o))));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function move() { location.href = NEW + '#klimport=' + exportHash(); }

  function two(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(ms) {
    if (ms < 0) ms = 0;
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600);  s -= h * 3600;
    var m = Math.floor(s / 60);    s -= m * 60;
    return (d > 0 ? d + 'T ' : '') + two(h) + ':' + two(m) + ':' + two(s);
  }

  var addText = iOS
    ? 'Tippe unten in Safari auf <b>Teilen</b> &#9650; <b>Zum Home-Bildschirm</b>.'
    : 'Browser-Men&uuml; <b>(&#8942;)</b> &#9650; <b>Zum Startbildschirm hinzuf&uuml;gen</b>.';

  var st = document.createElement('style');
  st.textContent = [
    '#klmig-bar{position:fixed;top:0;left:0;right:0;z-index:2147483600;display:flex;align-items:center;gap:10px;',
    'padding:8px 12px;background:#071109;border-bottom:2px solid #36e0a0;color:#d8f5e8;',
    "font:500 12px/1.4 system-ui,-apple-system,'Segoe UI',Roboto,monospace;box-shadow:0 4px 18px rgba(0,0,0,.5)}",
    '#klmig-bar.urgent{border-bottom-color:#ff5b7f;background:#160a0e}',
    '#klmig-bar .klmig-txt{flex:1;min-width:0}#klmig-bar b{color:#36e0a0}',
    '#klmig-bar.urgent b{color:#ff8da3}',
    '.klmig-cd{color:#ffd23f;font-variant-numeric:tabular-nums;letter-spacing:.5px}',
    '.klmig-go{flex:none;cursor:pointer;border:0;border-radius:8px;padding:8px 12px;background:#ffd23f;',
    'color:#1a1400;font-weight:700;font-size:12px;font-family:inherit}.klmig-go:hover{filter:brightness(1.08)}',
    '.klmig-x{flex:none;cursor:pointer;border:0;background:transparent;color:#7fae98;font-size:14px;padding:4px 6px}',
    '@media(max-width:560px){#klmig-bar{font-size:11px;flex-wrap:wrap}}',
    '#klmig-ov{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;',
    'padding:24px;background:rgba(4,7,5,.975);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);color:#d8f5e8;',
    "font:500 14px/1.55 system-ui,-apple-system,'Segoe UI',Roboto,monospace}",
    '.klmig-card{max-width:420px;width:100%;text-align:center;background:#08130c;border:1px solid #16321f;',
    'border-radius:16px;padding:28px 22px;box-shadow:0 18px 60px rgba(0,0,0,.6)}',
    ".klmig-logo{font-family:'Press Start 2P',monospace;font-size:18px;color:#36e0a0;letter-spacing:1px;",
    'text-shadow:0 0 12px rgba(54,224,160,.5)}',
    ".klmig-card h2{font-family:'Press Start 2P',monospace;font-size:12px;color:#ffd23f;margin:12px 0 14px;line-height:1.5}",
    '.klmig-card p{margin:10px 0}.klmig-card b{color:#36e0a0}',
    '.klmig-card .klmig-go{margin:10px 0 6px;width:100%;padding:14px;font-size:13px}',
    '.klmig-add{font-size:12px;color:#bfe8d6}.klmig-sm{font-size:11px;color:#7fae98}'
  ].join('');
  document.head.appendChild(st);

  function takeover() {
    var ov = document.createElement('div');
    ov.id = 'klmig-ov';
    ov.innerHTML =
      '<div class="klmig-card">' +
        '<div class="klmig-logo">KLONDAIRE</div>' +
        '<h2>ist umgezogen</h2>' +
        '<p>Das Spiel l&auml;uft jetzt unter<br><b>play.klondaire.com</b></p>' +
        '<button class="klmig-go" id="klmig-go">Jetzt umziehen &mdash; mit Spielstand</button>' +
        '<p class="klmig-add">Danach: ' + addText + '</p>' +
        '<p class="klmig-sm">Dein Fortschritt wird automatisch mitgenommen.</p>' +
      '</div>';
    document.body.appendChild(ov);
    document.getElementById('klmig-go').onclick = move;
  }

  function banner() {
    var bar = document.createElement('div');
    bar.id = 'klmig-bar';
    bar.innerHTML =
      '<span class="klmig-txt"></span>' +
      '<button class="klmig-go" id="klmig-go">Umziehen</button>' +
      '<button class="klmig-x" id="klmig-x" aria-label="schlie&szlig;en">&#10005;</button>';
    document.body.appendChild(bar);
    document.getElementById('klmig-go').onclick = move;
    document.getElementById('klmig-x').onclick = function () { bar.style.display = 'none'; };

    var txt = bar.querySelector('.klmig-txt');
    var iv = null;

    function showExpired() {
      if (iv) { clearInterval(iv); iv = null; }
      bar.classList.add('urgent');
      txt.innerHTML = '&#9888;&#65039; <b>Dieser alte Link ist abgelaufen</b> &middot; KLONDAIRE l&auml;uft jetzt auf ' +
                      'play.klondaire.com &middot; bitte <b>jetzt umziehen</b>.';
    }
    function tick() {
      var left = DEADLINE - Date.now();
      if (left <= 0) { showExpired(); return; }
      txt.innerHTML = '&#127381; <b>KLONDAIRE ist umgezogen</b> &rarr; play.klondaire.com &middot; ' +
                      'alter Link l&auml;uft ab in <b class="klmig-cd">' + fmt(left) + '</b> &middot; bitte umziehen.';
    }

    if (Date.now() >= DEADLINE) showExpired();
    else { tick(); iv = setInterval(tick, 1000); }
  }

  function build() {
    if (!isNaN(CUTOFF) && Date.now() >= CUTOFF) takeover();
    else banner();
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
