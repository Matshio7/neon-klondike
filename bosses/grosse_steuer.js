/* bosses/grosse_steuer.js — Große Steuer Boss Canvas-Layer
   Nutzung: const ctrl = BossGrosseSteuer.attach(canvasEl, opts);
   ctrl.play('appear'|'hit'|'defeat')  ctrl.setState('idle')  ctrl.stop() */
window.BossGrosseSteuer=(function(){
'use strict';

function attach(canvas,opts){
  opts=Object.assign({anchor:'bottom',opacity:0.16,showText:false,state:'appear'},opts||{});
  var ctx=canvas.getContext('2d');
  var raf=null, t=0;
  var appearProg=(opts.state==='appear')?0:1;
  var defeatProg=0;
  var hitFlash=0;
  var lastHitMs=-99999;

  canvas.style.opacity=opts.opacity;
  canvas.style.pointerEvents='none';
  canvas.style.position='absolute';
  canvas.style.top='0'; canvas.style.left='0';

  /* polyfill für ältere Safari */
  function rr(x,y,w,h,r){
    if(ctx.roundRect){ctx.roundRect(x,y,w,h,r);return;}
    r=Math.min(r||0,w/2,h/2);
    ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
  }

  /* Zeichne den Steuer-Eintreiber. Koordinaten relativ zu Mittelpunkt/Boden der Figur. */
  function drawCharacter(al){
    var c=ctx;
    /* ── Hut ── */
    c.fillStyle='#13111f'; c.beginPath();rr(-22,-112,44,72,3);c.fill();
    c.fillStyle='#09080f'; c.beginPath();rr(-32,-44,64,10,2);c.fill();
    c.fillStyle='#c89820'; c.fillRect(-22,-48,44,7);           /* Hutband gold */
    c.fillStyle='#c89820'; c.font='bold 17px serif';           /* § auf dem Hut */
    c.textAlign='center'; c.textBaseline='middle'; c.fillText('§',0,-82);

    /* ── Kopf ── */
    c.fillStyle='#f0b870';
    c.beginPath();c.ellipse(0,-10,28,30,0,0,Math.PI*2);c.fill();
    c.fillStyle='#d89050';                                     /* Backen */
    c.beginPath();c.ellipse(-18,-3,10,8,0,0,Math.PI*2);c.fill();
    c.beginPath();c.ellipse(18,-3,10,8,0,0,Math.PI*2);c.fill();

    /* ── Augen ── */
    c.fillStyle='#18101e';
    c.beginPath();c.ellipse(-10,-12,5,6,0,0,Math.PI*2);c.fill();
    c.beginPath();c.ellipse(11,-12,5,6,0,0,Math.PI*2);c.fill();
    /* Monokel */
    c.strokeStyle='#c89820'; c.lineWidth=2;
    c.beginPath();c.arc(11,-12,9,0,Math.PI*2);c.stroke();
    c.beginPath();c.moveTo(20,-12);c.lineTo(26,-4);c.stroke();/* Kette */
    /* Monokel-Glitzern */
    c.fillStyle='rgba(255,230,80,'+(0.55+0.45*Math.sin(t*0.08))+')';
    c.beginPath();c.arc(14,-16,2,0,Math.PI*2);c.fill();

    /* ── Augenbrauen (zornig V) ── */
    c.strokeStyle='#3c1e08'; c.lineWidth=3; c.lineCap='round';
    c.beginPath();c.moveTo(-19,-22);c.lineTo(-4,-17);c.stroke();
    c.beginPath();c.moveTo(4,-17);c.lineTo(20,-22);c.stroke();

    /* ── Mund (grimmig) + Schnurrbart ── */
    c.strokeStyle='#662010'; c.lineWidth=2.5;
    c.beginPath();c.moveTo(-12,8);c.quadraticCurveTo(0,3,12,8);c.stroke();
    c.fillStyle='#28100a';
    c.beginPath();c.ellipse(-8,1,9,4,-0.3,0,Math.PI*2);c.fill();
    c.beginPath();c.ellipse(8,1,9,4,0.3,0,Math.PI*2);c.fill();

    /* ── Körper ── */
    c.fillStyle='#18213c';
    c.beginPath();c.ellipse(0,58,44,52,0,0,Math.PI*2);c.fill();
    c.fillStyle='#0b1222';                                     /* Mantel-Mitte */
    c.beginPath();c.moveTo(-8,26);c.lineTo(-20,72);c.lineTo(0,54);c.lineTo(20,72);c.lineTo(8,26);c.closePath();c.fill();
    c.fillStyle='#e0e0e0';                                     /* Hemd */
    c.beginPath();c.moveTo(-7,26);c.lineTo(7,26);c.lineTo(5,56);c.lineTo(-5,56);c.closePath();c.fill();
    c.fillStyle='#9a1c0c';                                     /* Krawatte */
    c.beginPath();c.moveTo(-4,26);c.lineTo(4,26);c.lineTo(5,52);c.lineTo(0,62);c.lineTo(-5,52);c.closePath();c.fill();
    c.fillStyle='#c89820'; c.fillRect(-2,37,4,3);             /* Krawatten-Nadel */

    /* ── Linker Arm + Papier-Stapel ── */
    c.fillStyle='#18213c';
    c.beginPath();c.ellipse(-46,36,13,9,0.5,0,Math.PI*2);c.fill();
    c.beginPath();c.ellipse(-58,52,10,7,0.6,0,Math.PI*2);c.fill();
    c.fillStyle='#e8e8e0';c.fillRect(-82,38,26,34);           /* Papier 3 */
    c.fillStyle='#f0f0e8';c.fillRect(-80,35,26,34);           /* Papier 2 */
    c.fillStyle='#f8f8f4';c.fillRect(-78,32,26,34);           /* Papier 1 (oben) */
    c.strokeStyle='#aaaabc'; c.lineWidth=1;
    for(var l=0;l<6;l++){c.beginPath();c.moveTo(-75,39+l*4);c.lineTo(-56,39+l*4);c.stroke();}
    c.fillStyle='#b00010'; c.font='bold 13px monospace';
    c.textAlign='center'; c.textBaseline='middle'; c.fillText('%',-67,47);

    /* ── Rechter Arm (zeigend) ── */
    c.fillStyle='#18213c';
    c.beginPath();c.ellipse(46,32,13,9,-0.5,0,Math.PI*2);c.fill();
    c.beginPath();c.ellipse(60,18,10,7,-0.5,0,Math.PI*2);c.fill();
    c.fillStyle='#f0b870';
    c.beginPath();c.ellipse(68,8,5,10,-0.15,0,Math.PI*2);c.fill();/* Zeigefinger */

    /* ── Schwebende Münzen ── */
    var coins=[[-44,-60,7],[-62,-24,5],[44,-62,8],[60,-26,6],[2,-98,5]];
    c.fillStyle='#c89820';
    for(var ci=0;ci<coins.length;ci++){
      var cd=coins[ci];
      var bob=8*Math.sin(t*0.032+ci*1.4);
      c.globalAlpha=al*(0.5+0.22*Math.sin(t*0.06+ci));
      c.beginPath();c.arc(cd[0],cd[1]+bob,cd[2],0,Math.PI*2);c.fill();
      c.fillStyle='#8a5810'; c.font='bold '+(cd[2]*1.4)+'px sans-serif';
      c.textAlign='center'; c.textBaseline='middle';
      c.fillText('€',cd[0],cd[1]+bob);
      c.fillStyle='#c89820';
    }
    c.globalAlpha=al;
  }

  function frame(){
    t++;
    var cw=canvas.width, ch=canvas.height;
    ctx.clearRect(0,0,cw,ch);
    var sc=ch/380;          /* Figur skaliert zur Canvas-Höhe */
    var cx=cw/2;
    var cy=ch+8*sc;         /* Füße am unteren Rand */

    /* ── Erscheinen ── */
    if(appearProg<1){
      appearProg=Math.min(1,appearProg+0.030);
      var ease=1-Math.pow(1-appearProg,3);
      ctx.save();
      ctx.translate(cx,cy);ctx.scale(sc*ease,sc*ease);
      ctx.globalAlpha=ease;
      drawCharacter(1);
      ctx.restore();
      raf=requestAnimationFrame(frame);
      return;
    }

    /* ── Niederlage ── */
    if(defeatProg>0){
      defeatProg=Math.min(1,defeatProg+0.014);
      var dp=defeatProg;
      var da=Math.max(0,1-dp*1.3);
      ctx.save();
      ctx.translate(cx+cw*0.38*dp*dp, cy+ch*0.08*dp);
      ctx.rotate(dp*0.9);
      ctx.globalAlpha=da;
      ctx.translate(-cx,-cy);
      ctx.translate(cx,cy);ctx.scale(sc,sc);
      ctx.globalAlpha=da;
      drawCharacter(1);
      ctx.restore();
      if(dp>=1){defeatProg=0;ctx.clearRect(0,0,cw,ch);stop();return;}
      raf=requestAnimationFrame(frame);
      return;
    }

    /* ── Treffer-Blitz ── */
    if(hitFlash>0){
      hitFlash=Math.max(0,hitFlash-0.055);
      ctx.save();ctx.globalAlpha=hitFlash*0.22;
      ctx.fillStyle='#ff1c1c';ctx.fillRect(0,0,cw,ch);
      ctx.restore();
    }

    /* ── Idle: sanftes Wippen ── */
    var bob=Math.sin(t*0.026)*3*sc;
    var shakeX=(hitFlash>0.05)?Math.sin(t*1.6)*5*hitFlash*sc:0;
    ctx.save();
    ctx.translate(cx+shakeX,cy+bob);ctx.scale(sc,sc);
    ctx.globalAlpha=1;
    drawCharacter(1);
    ctx.restore();

    raf=requestAnimationFrame(frame);
  }

  function play(anim){
    if(anim==='appear'){
      appearProg=0; defeatProg=0;
      if(!raf){t=0;raf=requestAnimationFrame(frame);}
    } else if(anim==='hit'){
      var now=performance.now();
      if(now-lastHitMs<400)return;
      lastHitMs=now;
      hitFlash=1;
    } else if(anim==='defeat'){
      defeatProg=0.001;
    }
  }

  function setState(s){
    if(s==='idle'&&!raf)raf=requestAnimationFrame(frame);
  }

  function stop(){
    if(raf){cancelAnimationFrame(raf);raf=null;}
    if(canvas&&ctx)ctx.clearRect(0,0,canvas.width,canvas.height);
  }

  raf=requestAnimationFrame(frame);
  return {play:play, setState:setState, stop:stop};
}

return {attach:attach};
})();
