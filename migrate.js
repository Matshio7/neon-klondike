/* KLONDAIRE — Umzugs-Helfer.
   Läuft NUR auf der alten Domain (matshio7.github.io). Auf play.klondaire.com
   und lokal passiert nichts (Hostname-Gate unten).
   Neues Zuhause: https://play.klondaire.com
   Spielstand-Transfer: packt den kompletten localStorage in den Link
   (#klimport=…); die neue Seite liest ihn beim ersten Laden ein. */
(function () {
  if (!/(^|\.)github\.io$/i.test(location.hostname)) return; // nur alte URL

  var NEW = 'https://play.klondaire.com/';
  // Bis zu diesem Datum funktioniert die alte URL noch normal (mit Banner),
  // danach erscheint nur noch der Umzugs-Hinweis. Datum nach Bedarf ändern.
  var CUTOFF = Date.parse('2026-07-09T00:00:00');
  var past = !isNaN(CUTOFF) && Date.now() > CUTOFF;
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

  var addText = iOS
    ? 'Tippe unten in Safari auf <b>Teilen</b> &#9650; <b>Zum Home-Bildschirm</b>.'
    : 'Browser-Men&uuml; <b>(&#8942;)</b> &#9650; <b>Zum Startbildschirm hinzuf&uuml;gen</b>.';

  var st = document.createElement('style');
  st.textContent = [
    '#klmig-bar{position:fixed;top:0;left:0;right:0;z-index:2147483600;display:flex;align-items:center;gap:10px;',
    'padding:8px 12px;background:#071109;border-bottom:2px solid #36e0a0;color:#d8f5e8;',
    "font:500 12px/1.4 system-ui,-apple-system,'Segoe UI',Roboto,monospace;box-shadow:0 4px 18px rgba(0,0,0,.5)}",
    '#klmig-bar .klmig-txt{flex:1;min-width:0}#klmig-bar b{color:#36e0a0}',
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

  function build() {
    if (past) {
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
    } else {
      var bar = document.createElement('div');
      bar.id = 'klmig-bar';
      var d = new Date(CUTOFF).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      bar.innerHTML =
        '<span class="klmig-txt">&#127381; <b>KLONDAIRE ist umgezogen</b> &rarr; play.klondaire.com &middot; ' +
        'bitte neu zum Homescreen hinzuf&uuml;gen (alter Link noch bis ' + d + ').</span>' +
        '<button class="klmig-go" id="klmig-go">Umziehen</button>' +
        '<button class="klmig-x" id="klmig-x" aria-label="schlie&szlig;en">&#10005;</button>';
      document.body.appendChild(bar);
      var x = document.getElementById('klmig-x');
      if (x) x.onclick = function () { bar.style.display = 'none'; };
    }
    var go = document.getElementById('klmig-go');
    if (go) go.onclick = move;
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
