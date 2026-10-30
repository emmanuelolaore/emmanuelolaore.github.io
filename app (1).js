(function(){
"use strict";
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var naira=function(n){return "\u20A6"+Math.round(n).toLocaleString("en-NG")};
var short=function(n){return n>=1e6?"\u20A6"+(n/1e6).toFixed(2)+"M":n>=1e3?"\u20A6"+Math.round(n/1e3)+"k":"\u20A6"+Math.round(n)};

/* deterministic sample data: 180 days so every range has a previous period */
function rng(seed){return function(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646}}
var rand=rng(42),DAYS=[];
var base=new Date(2026,9,29);
for(var i=179;i>=0;i--){
  var d=new Date(base);d.setDate(base.getDate()-i);
  var wk=[0.85,0.8,0.9,0.95,1.1,1.35,1.2][d.getDay()];
  var trend=1+(179-i)/179*0.35;
  var orders=Math.round((38+rand()*14)*wk*trend);
  var basket=2900+rand()*700;
  DAYS.push({date:d,orders:orders,revenue:orders*basket});
}
function slice(n,offset){var end=DAYS.length-(offset||0);return DAYS.slice(end-n,end)}
function sum(a,k){return a.reduce(function(s,x){return s+x[k]},0)}
function stats(n){
  var cur=slice(n),prev=slice(n,n);
  var rev=sum(cur,"revenue"),ord=sum(cur,"orders"),prevRev=sum(prev,"revenue"),prevOrd=sum(prev,"orders");
  return {cur:cur,rev:rev,ord:ord,aov:rev/ord,dRev:(rev/prevRev-1)*100,dOrd:(ord/prevOrd-1)*100,dAov:((rev/ord)/(prevRev/prevOrd)-1)*100};
}
function deltaHTML(v){var up=v>=0;return '<span class="delta '+(up?"up":"down")+'">'+(up?"\u25B2 ":"\u25BC ")+Math.abs(v).toFixed(1)+'% vs previous period</span>'}

/* chart */
function drawChart(box,data,label){
  var W=640,H=230,pl=44,pr=10,pt=12,pb=26;
  var vals=data.map(function(d){return d.revenue});
  var max=Math.max.apply(null,vals)*1.1,min=0;
  var x=function(i){return pl+(W-pl-pr)*i/(data.length-1)};
  var y=function(v){return pt+(H-pt-pb)*(1-(v-min)/(max-min))};
  var pts=data.map(function(d,i){return x(i).toFixed(1)+","+y(d.revenue).toFixed(1)});
  var s='<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+label+'">';
  for(var g=0;g<=4;g++){var gv=max*g/4,gy=y(gv);s+='<line class="grid-l" x1="'+pl+'" x2="'+(W-pr)+'" y1="'+gy+'" y2="'+gy+'"/><text class="ax" x="'+(pl-6)+'" y="'+(gy+4)+'" text-anchor="end">'+short(gv)+'</text>'}
  var ticks=[0,Math.floor(data.length/2),data.length-1];
  ticks.forEach(function(i){s+='<text class="ax" x="'+x(i)+'" y="'+(H-6)+'" text-anchor="'+(i===0?"start":i===data.length-1?"end":"middle")+'">'+data[i].date.toLocaleDateString("en-GB",{day:"numeric",month:"short"})+'</text>'});
  s+='<polygon class="area" points="'+pl+","+y(0)+" "+pts.join(" ")+" "+x(data.length-1)+","+y(0)+'"/>';
  s+='<polyline class="line" points="'+pts.join(" ")+'"/>';
  s+='<circle class="dot" r="5" cx="-20" cy="-20"/></svg><div class="tip" role="status"></div>';
  box.innerHTML=s;
  var svg=$("svg",box),dot=$(".dot",box),tip=$(".tip",box);
  function show(clientX){
    var r=svg.getBoundingClientRect(),px=(clientX-r.left)/r.width*W;
    var i=Math.round((px-pl)/(W-pl-pr)*(data.length-1));i=Math.max(0,Math.min(data.length-1,i));
    var cx=x(i),cy=y(data[i].revenue);
    dot.setAttribute("cx",cx);dot.setAttribute("cy",cy);
    tip.textContent=data[i].date.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})+": "+naira(data[i].revenue);
    tip.style.left=(cx/W*100)+"%";tip.style.top=(cy/H*100)+"%";tip.style.opacity=1;
  }
  svg.addEventListener("pointermove",function(e){show(e.clientX)});
  svg.addEventListener("pointerleave",function(){tip.style.opacity=0;dot.setAttribute("cx",-20)});
}

/* range controls: any .seg[data-range] drives [data-chart], [data-kpi] */
function renderRange(n){
  var st=stats(n);
  var label="Daily revenue for the last "+n+" days";
  $$("[data-chart]").forEach(function(b){drawChart(b,st.cur,label)});
  var map={rev:[short(st.rev),st.dRev],ord:[st.ord.toLocaleString("en-NG"),st.dOrd],aov:[naira(st.aov),st.dAov]};
  $$("[data-kpi]").forEach(function(k){var m=map[k.dataset.kpi];if(!m)return;$(".v",k).textContent=m[0];$(".d",k).innerHTML=deltaHTML(m[1])});
  $$("[data-rangelabel]").forEach(function(e){e.textContent="Last "+n+" days"});
}
$$(".seg[data-range]").forEach(function(seg){
  var btns=$$("button",seg);
  btns.forEach(function(b){b.addEventListener("click",function(){
    $$(".seg[data-range] button").forEach(function(x){x.setAttribute("aria-pressed",String(x.dataset.n===b.dataset.n))});
    renderRange(+b.dataset.n);
  })});
});
if($("[data-chart]")){var first=$(".seg[data-range] button[aria-pressed=true]");renderRange(first?+first.dataset.n:30)}

/* toast */
var toastEl;
function toast(msg){
  if(!toastEl){toastEl=document.createElement("div");toastEl.className="toast";toastEl.setAttribute("role","status");document.body.appendChild(toastEl)}
  toastEl.textContent=msg;toastEl.classList.add("show");
  clearTimeout(toast.t);toast.t=setTimeout(function(){toastEl.classList.remove("show")},2600);
}

/* products table */
var PRODUCTS=[
  {n:"Ofada rice (5kg)",u:412,r:1648000,s:14,min:30},
  {n:"Palm oil (2L)",u:388,r:1358000,s:96,min:40},
  {n:"Indomie carton",u:301,r:1204000,s:210,min:60},
  {n:"Peak milk tin (400g)",u:520,r:1092000,s:22,min:50},
  {n:"Garri (paint bucket)",u:274,r:822000,s:120,min:40},
  {n:"Bottled water pack",u:610,r:732000,s:340,min:100},
  {n:"Tomato paste (70g x 20)",u:233,r:699000,s:8,min:25},
  {n:"Detergent (1kg)",u:190,r:475000,s:75,min:30}
];
var tbody=$("#products-body");
if(tbody){
  var sortKey="r",sortDir=-1,topRev=Math.max.apply(null,PRODUCTS.map(function(p){return p.r}));
  var render=function(){
    var rows=PRODUCTS.slice().sort(function(a,b){var x=a[sortKey],y=b[sortKey];return (typeof x==="string"?x.localeCompare(y):x-y)*sortDir});
    tbody.innerHTML=rows.map(function(p){return '<tr><td>'+p.n+'</td><td class="num">'+p.u+'</td><td class="num">'+naira(p.r)+'</td><td><div class="bar" aria-hidden="true"><i style="width:'+(p.r/topRev*100)+'%"></i></div></td></tr>'}).join("");
    $$("#products-head th").forEach(function(th){var b=$("button",th);if(!b)return;th.setAttribute("aria-sort",b.dataset.k===sortKey?(sortDir===1?"ascending":"descending"):"none")});
  };
  $$("#products-head button").forEach(function(b){b.addEventListener("click",function(){
    if(sortKey===b.dataset.k)sortDir*=-1;else{sortKey=b.dataset.k;sortDir=b.dataset.k==="n"?1:-1}
    render();
  })});
  render();
}

/* stock alerts */
var alertsEl=$("#alerts");
if(alertsEl){
  var ordered={};
  var draw=function(){
    var low=PRODUCTS.filter(function(p){return p.s<p.min&&!ordered[p.n]}).sort(function(a,b){return a.s/a.min-b.s/b.min});
    var placed=Object.keys(ordered);
    var h=low.map(function(p){return '<li class="low"><div><b>'+p.n+'</b><small>'+p.s+' left, reorder level is '+p.min+'</small></div><button class="btn sm" data-reorder="'+p.n+'">Reorder</button></li>'}).join("");
    h+=placed.map(function(n){return '<li><div><b>'+n+'</b><small>Reorder sent to supplier</small></div></li>'}).join("");
    alertsEl.innerHTML=h||'<li class="empty" style="display:block">All stock levels are healthy. Alerts appear here when an item drops below its reorder level.</li>';
    $("#alert-count").textContent=low.length;
  };
  alertsEl.addEventListener("click",function(e){
    var b=e.target.closest("[data-reorder]");if(!b)return;
    ordered[b.dataset.reorder]=true;draw();toast("Reorder sent for "+b.dataset.reorder);
  });
  draw();
}

/* pricing toggle */
var bill=$(".seg[data-billing]");
if(bill){
  var P={starter:[0,0],growth:[12000,9600],scale:[35000,28000]};
  $$("button",bill).forEach(function(b){b.addEventListener("click",function(){
    $$("button",bill).forEach(function(x){x.setAttribute("aria-pressed",String(x===b))});
    var idx=b.dataset.mode==="annual"?1:0;
    $$("[data-plan]").forEach(function(el){var v=P[el.dataset.plan][idx];el.textContent=v===0?"Free":naira(v)});
    $$("[data-per]").forEach(function(el){el.style.display=el.dataset.plan==="starter"?"none":""});
    $$("[data-billnote]").forEach(function(el){el.textContent=idx?"per month, billed yearly":"per month"});
  })});
}

/* signup form */
var form=$("#signup");
if(form){
  var rules={
    shop:function(v){return v.trim().length>=2?"":"Enter your shop name."},
    email:function(v){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)?"":"Enter an email like name@example.com."},
    phone:function(v){return /^(\+234|0)[789]\d{9}$/.test(v.replace(/\s/g,""))?"":"Use a Nigerian number, like 0803 123 4567."}
  };
  var check=function(inp){var m=rules[inp.name](inp.value);inp.setAttribute("aria-invalid",m?"true":"false");$("#"+inp.id+"-err").textContent=m;return !m};
  $$("input",form).forEach(function(i){i.addEventListener("blur",function(){check(i)});i.addEventListener("input",function(){if(i.getAttribute("aria-invalid")==="true")check(i)})});
  form.addEventListener("submit",function(e){
    e.preventDefault();
    var bad=$$("input",form).filter(function(i){return !check(i)});
    if(bad.length){bad[0].focus();return}
    form.hidden=true;
    var ok=$("#signup-ok");ok.hidden=false;
    $("#ok-name",ok).textContent=$("#shop").value.trim();
    ok.focus();
  });
}
})();
