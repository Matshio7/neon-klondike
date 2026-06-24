/* ============================================================
   WEBGL BACKGROUND SHADERS  —  5 interactive shader wallpapers
   Standalone module loaded before game.js; exposes the global `BG`.
   Self-contained: touches only the #bggl canvas, window and WebGL.
   API:  BG.select(id)  ·  BG.cur()  ·  BG.NAMES
   ============================================================ */
"use strict";
const BG=(function(){
const VERT=`attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.,1.);}`;
const PRE=`precision highp float;
uniform vec2 u_res;uniform float u_time;uniform vec2 u_mouse,u_mvel;uniform float u_mspeed;
uniform vec3 u_ripples[8];
const vec3 MINT=vec3(.212,.878,.627),GOLD=vec3(1.,.824,.247),PINK=vec3(1.,.357,.498),DEEP=vec3(.027,.071,.051);
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+34.56);return fract(p.x*p.y);}
vec2 hash22(vec2 p){float n=sin(dot(p,vec2(41.,289.)));return fract(vec2(262144.,32768.)*n);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);float a=hash21(i),b=hash21(i+vec2(1,0)),c=hash21(i+vec2(0,1)),d=hash21(i+vec2(1,1));return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*vnoise(p);p=m*p;a*=.5;}return v;}
float rippleField(vec2 uv){float asp=u_res.x/u_res.y,s=0.;for(int i=0;i<8;i++){vec3 r=u_ripples[i];if(r.z>900.)continue;vec2 d=uv-r.xy;d.x*=asp;float dist=length(d),rad=r.z*.42,ring=exp(-pow((dist-rad)*8.,2.));s+=ring*exp(-r.z*1.5);}return s;}
float rippleWarp(vec2 uv){float asp=u_res.x/u_res.y,s=0.;for(int i=0;i<8;i++){vec3 r=u_ripples[i];if(r.z>900.)continue;vec2 d=uv-r.xy;d.x*=asp;float dist=length(d),rad=r.z*.42,w=sin((dist-rad)*40.)*exp(-pow((dist-rad)*6.,2.));s+=w*exp(-r.z*1.7);}return s;}
vec3 tonemap(vec3 c){c=max(c,0.);return c/(c+.62);}`;
const SH={
aurora:PRE+`\nvoid main(){vec2 uv=gl_FragCoord.xy/u_res,p=(gl_FragCoord.xy-.5*u_res)/u_res.y;float t=u_time*.12;vec2 m=u_mouse-.5;m.x*=u_res.x/u_res.y;vec2 toM=m-p;float pr=exp(-dot(toM,toM)*2.2);p+=normalize(toM+1e-4)*pr*.10;vec2 q=vec2(fbm(p*1.6+t),fbm(p*1.6-t+5.2)),r=vec2(fbm(p*1.8+1.5*q+vec2(1.7,9.2)+t*1.3),fbm(p*1.8+1.5*q+vec2(8.3,2.8)-t*1.1));float f=fbm(p*1.7+2.4*r+t),band=f+.18*sin(u_time*.5+length(p)*3.);vec3 col=mix(DEEP,MINT,smoothstep(.20,.72,band));col=mix(col,GOLD,smoothstep(.55,.92,band+.10*r.x));col=mix(col,PINK,smoothstep(.80,1.05,band+.25*q.y));col+=MINT*pr*(.35+.5*u_mspeed)+GOLD*rippleField(uv)*1.4;col*=.82+.55*f;col+=DEEP*.4;gl_FragColor=vec4(tonemap(col*1.25),1.);}`,
grid:PRE+`\nfloat gL(vec2 g){vec2 w=fwidth(g),l=abs(fract(g)-.5)/max(w,1e-4);return 1.-min(min(l.x,l.y),1.);}void main(){vec2 uv=gl_FragCoord.xy/u_res,p=(gl_FragCoord.xy-.5*u_res)/u_res.y,m=u_mouse-.5;m.x*=u_res.x/u_res.y;vec2 d=p-m;float dist=length(d),lens=exp(-dist*dist*3.);p-=normalize(d+1e-4)*lens*.14;p+=normalize(d+1e-4)*rippleWarp(uv)*.05;float t=u_time*.18;vec2 g1=vec2(p.x*9.,p.y*9.+t*4.),g2=vec2(p.x*4.5+sin(t)*.3,p.y*4.5+t*2.);float ln=gL(g1)*.7+gL(g2)*.9;vec3 col=DEEP*.7,lc=mix(mix(MINT,PINK,smoothstep(.3,.9,.5+.5*sin(p.y*1.6-u_time*.4+p.x*.5))),GOLD,lens*.8);col+=lc*ln*(1.1+lens*1.6)+MINT*lens*.5+GOLD*(rippleField(uv)*1.6+pow(gL(g1)*gL(g1.yx),2.)*.6);col*=1.+.4*u_mspeed*lens;gl_FragColor=vec4(tonemap(col*1.3),1.);}`,
cells:PRE+`\nvoid main(){vec2 uv=gl_FragCoord.xy/u_res;float asp=u_res.x/u_res.y;vec2 p=uv,mp=u_mouse;p.x*=asp;mp.x*=asp;vec2 sp=p*6.,g=floor(sp),f=fract(sp);float d1=8.,d2=8.;vec2 cId=g;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(float(x),float(y)),pos=o+.5+.42*sin(u_time*.6+6.2831*hash22(g+o));float d=length(pos-f);if(d<d1){d2=d1;d1=d;cId=g+o;}else if(d<d2)d2=d;}float border=1.-smoothstep(0.,.06,d2-d1),r=hash21(cId),near=exp(-dot(p-mp,p-mp)*7.),rf=rippleField(uv);vec3 base=r<.5?mix(DEEP,MINT*.5,r*2.):mix(MINT*.5,PINK*.5,(r-.5)*2.);vec3 col=base*.5+mix(MINT,PINK,hash21(cId+3.1))*border*1.3+GOLD*near*(.6+.8*border)+GOLD*border*(near*1.4+rf*2.2)+MINT*(rf*.6+smoothstep(.10,0.,d1)*.5);col*=.9+.3*u_mspeed*near;gl_FragColor=vec4(tonemap(col*1.25),1.);}`,
liquid:PRE+`\nvoid main(){vec2 uv=gl_FragCoord.xy/u_res;float asp=u_res.x/u_res.y;vec2 p=uv,mp=u_mouse;p.x*=asp;mp.x*=asp;float field=0.;vec3 acc=vec3(0.);for(int i=0;i<6;i++){float fi=float(i);vec2 c=vec2(.5*asp+.34*asp*sin(u_time*.30+fi*1.7),.5+.34*cos(u_time*.37+fi*2.3));float d2=dot(p-c,p-c),rad=.10+.03*sin(u_time*.5+fi),w=rad*rad/(d2+.0008);field+=w;acc+=((i==0||i==3)?MINT:(i==1||i==4)?GOLD:PINK)*w;}float dm2=dot(p-mp,p-mp),wm=.030/(dm2+.0007);field+=wm;acc+=MINT*wm*1.4;for(int i=0;i<8;i++){vec3 rp=u_ripples[i];if(rp.z>900.)continue;vec2 c=rp.xy;c.x*=asp;float d2r=dot(p-c,p-c),w=(.05*exp(-rp.z*1.8))/(d2r+.001);field+=w;acc+=GOLD*w*1.3;}vec3 bcol=acc/max(field,.0001);float surf=smoothstep(.85,1.35,field),inner=smoothstep(1.2,3.,field);vec3 col=mix(DEEP*.6,bcol*.55,surf);col+=bcol*(pow(surf*(1.-inner),1.5)*1.8+inner*.5+smoothstep(.4,.95,field)*.18);col*=1.+.4*u_mspeed*smoothstep(.6,1.,wm);gl_FragColor=vec4(tonemap(col*1.2),1.);}`,
suits:PRE+`\nfloat sdT(vec2 p,vec2 a,vec2 b,vec2 c){vec2 e0=b-a,e1=c-b,e2=a-c,v0=p-a,v1=p-b,v2=p-c;vec2 pq0=v0-e0*clamp(dot(v0,e0)/dot(e0,e0),0.,1.),pq1=v1-e1*clamp(dot(v1,e1)/dot(e1,e1),0.,1.),pq2=v2-e2*clamp(dot(v2,e2)/dot(e2,e2),0.,1.);float s=sign(e0.x*e2.y-e0.y*e2.x);vec2 d=min(min(vec2(dot(pq0,pq0),s*(v0.x*e0.y-v0.y*e0.x)),vec2(dot(pq1,pq1),s*(v1.x*e1.y-v1.y*e1.x))),vec2(dot(pq2,pq2),s*(v2.x*e2.y-v2.y*e2.x)));return -sqrt(d.x)*sign(d.y);}float sdH(vec2 q){return min(min(length(q-vec2(-.33,.33))-.42,length(q-vec2(.33,.33))-.42),sdT(q,vec2(-.74,.20),vec2(.74,.20),vec2(0.,-.88)));}float sdS(vec2 q,float s){if(s<.5)return sdH(q);if(s<1.5)return sdH(vec2(q.x,-q.y));if(s<2.5)return abs(q.x)/.60+abs(q.y)/.92-.92;return min(min(min(length(q-vec2(0.,.40))-.36,length(q-vec2(-.38,-.08))-.36),length(q-vec2(.38,-.08))-.36),sdT(q,vec2(0.,-.05),vec2(-.32,-.92),vec2(.32,-.92)));}void main(){vec2 uv=gl_FragCoord.xy/u_res;float asp=u_res.x/u_res.y;vec2 p=uv,mp=u_mouse;p.x*=asp;mp.x*=asp;vec2 off=p-mp;float halo=exp(-dot(off,off)*6.);p+=normalize(off+1e-4)*halo*.10;vec3 col=DEEP*.55;for(int L=0;L<2;L++){float lf=float(L),sc2=6.-lf*2.,spd=.6-lf*.25,dep=1.-lf*.45;vec2 gp=vec2(p.x*sc2+lf*3.7,p.y*sc2-u_time*spd+lf*11.),id=floor(gp),f=fract(gp)-.5;float rnd=hash21(id+lf*57.),rnd2=hash21(id+lf*91.+7.),suit=floor(rnd*4.),sc=.36+.05*sin(u_time*.8+rnd*30.),d=sdS(f/sc,suit)*sc,fill=smoothstep(.02,-.02,d),glow=exp(-max(d,0.)*7.),life=.45+.55*sin(u_time*.5+rnd*40.+id.y*.6);float isRed=(suit<.5||(suit>1.5&&suit<2.5))?1.:0.;vec3 scol=mix(MINT,PINK,isRed);if(rnd2>.86)scol=GOLD;col+=scol*(fill*.9+glow*.5)*dep*(.30+.70*life)+GOLD*fill*halo*dep*.9;}col+=GOLD*rippleField(uv)*1.7+MINT*halo*.15;gl_FragColor=vec4(tonemap(col*1.25),1.);}`,
};
const NAMES={none:'ORIGINAL',aurora:'AURORA',grid:'GRID',cells:'CELLS',liquid:'LIQUID',suits:'SUITS'};
let _gl=null,_progs={},_quad=null,_raf=null,_cur='none',_t0=0,_tl=0,_inited=false;
let _rpls=[],_rpBuf=new Float32Array(24);
let _mx=.5,_my=.5,_tx=.5,_ty=.5,_px=.5,_py=.5,_vx=0,_vy=0,_sp=0;
function _mk(gl,type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.error('BG shader:',gl.getShaderInfoLog(s));return null;}return s;}
function _mkProg(gl,fsrc,deriv){var src=deriv?('#extension GL_OES_standard_derivatives : enable\n'+fsrc):fsrc,vs=_mk(gl,gl.VERTEX_SHADER,VERT),fs=_mk(gl,gl.FRAGMENT_SHADER,src);if(!vs||!fs)return null;var p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){console.error('BG link:',gl.getProgramInfoLog(p));return null;}return p;}
function _init(){
  if(_inited)return;_inited=true;
  var cv=document.getElementById('bggl');if(!cv)return;
  _gl=cv.getContext('webgl',{antialias:false,powerPreference:'low-power'});if(!_gl)return;
  _gl.getExtension('OES_standard_derivatives');
  Object.keys(SH).forEach(function(id){var p=_mkProg(_gl,SH[id],id==='grid');if(!p)return;_progs[id]={p:p,l:{a:_gl.getAttribLocation(p,'a_pos'),r:_gl.getUniformLocation(p,'u_res'),t:_gl.getUniformLocation(p,'u_time'),m:_gl.getUniformLocation(p,'u_mouse'),mv:_gl.getUniformLocation(p,'u_mvel'),ms:_gl.getUniformLocation(p,'u_mspeed'),rp:_gl.getUniformLocation(p,'u_ripples[0]')}};});
  _quad=_gl.createBuffer();_gl.bindBuffer(_gl.ARRAY_BUFFER,_quad);_gl.bufferData(_gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),_gl.STATIC_DRAW);
  function resize(){var dpr=Math.min(window.devicePixelRatio||1,2);cv.width=Math.floor(window.innerWidth*dpr);cv.height=Math.floor(window.innerHeight*dpr);}
  window.addEventListener('resize',resize);resize();
  window.addEventListener('mousemove',function(e){_tx=e.clientX/window.innerWidth;_ty=1-e.clientY/window.innerHeight;});
  window.addEventListener('touchmove',function(e){if(e.touches[0]){_tx=e.touches[0].clientX/window.innerWidth;_ty=1-e.touches[0].clientY/window.innerHeight;}},{passive:true});
  function addRipple(x,y){_rpls.push({x:x/window.innerWidth,y:1-y/window.innerHeight,t:performance.now()/1000});if(_rpls.length>8)_rpls.shift();}
  window.addEventListener('mousedown',function(e){if(_cur==='none'||e.target.closest('#app'))return;addRipple(e.clientX,e.clientY);});
  window.addEventListener('touchstart',function(e){if(_cur==='none'||e.target.closest('#app'))return;var t=e.touches[0];if(t)addRipple(t.clientX,t.clientY);},{passive:true});
  _t0=performance.now()/1000;
}
function _frame(){
  var cv=document.getElementById('bggl');
  if(!_gl||!cv||_cur==='none'||!_progs[_cur]){_raf=null;return;}
  var now=performance.now()/1000,dt=Math.min(now-(_tl||now),0.05);_tl=now;
  _px=_mx;_py=_my;
  _mx+=(_tx-_mx)*Math.min(dt*9,1);_my+=(_ty-_my)*Math.min(dt*9,1);
  _vx=(_mx-_px)/Math.max(dt,1e-3);_vy=(_my-_py)/Math.max(dt,1e-3);
  _sp+=(Math.min(Math.hypot(_vx,_vy),4)-_sp)*Math.min(dt*6,1);
  for(var i=0;i<8;i++){if(i<_rpls.length){_rpBuf[i*3]=_rpls[i].x;_rpBuf[i*3+1]=_rpls[i].y;_rpBuf[i*3+2]=now-_rpls[i].t;}else{_rpBuf[i*3]=0;_rpBuf[i*3+1]=0;_rpBuf[i*3+2]=999;}}
  while(_rpls.length&&now-_rpls[0].t>4)_rpls.shift();
  var P=_progs[_cur];
  _gl.viewport(0,0,cv.width,cv.height);_gl.useProgram(P.p);
  _gl.bindBuffer(_gl.ARRAY_BUFFER,_quad);_gl.enableVertexAttribArray(P.l.a);_gl.vertexAttribPointer(P.l.a,2,_gl.FLOAT,false,0,0);
  _gl.uniform2f(P.l.r,cv.width,cv.height);_gl.uniform1f(P.l.t,now-_t0);
  _gl.uniform2f(P.l.m,_mx,_my);_gl.uniform2f(P.l.mv,_vx,_vy);_gl.uniform1f(P.l.ms,_sp);
  _gl.uniform3fv(P.l.rp,_rpBuf);_gl.drawArrays(_gl.TRIANGLES,0,6);
  _raf=requestAnimationFrame(_frame);
}
return{
  NAMES:NAMES,
  select:function(id){_cur=(SH[id]?id:'none');document.body.classList.toggle('bg-shader',_cur!=='none');if(_cur!=='none'){_init();if(!_raf)_raf=requestAnimationFrame(_frame);}else if(_raf){cancelAnimationFrame(_raf);_raf=null;}},
  cur:function(){return _cur;},
};
})();
window.BG=BG;
