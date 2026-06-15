(function(){
  "use strict";
  var K="myWallet_v1";
  function s(){try{return JSON.parse(localStorage.getItem(K)||"{}")}catch(e){return {}}}
  function w(x){localStorage.setItem(K,JSON.stringify(x))}
  function c(t){return String(t||"").trim()}
  function btn(){var b=document.createElement("button");b.type="button";b.className="btn secondary";b.textContent="Remove";b.style.minHeight="32px";b.style.padding="0 10px";b.style.fontSize=".78rem";return b}
  function run(){
    Array.from(document.querySelectorAll("#main .card")).forEach(function(card){
      if(card.querySelector("[data-card-x]"))return;
      if(!/APR|Utilization/.test(card.textContent))return;
      var h=card.querySelector("h2");
      var r=card.querySelector(".section-title");
      if(!h||!r)return;
      var name=c(h.textContent);
      var b=btn();
      b.dataset.cardX=name;
      b.onclick=function(ev){
        ev.preventDefault();ev.stopPropagation();
        if(!confirm("Remove "+name+"?"))return;
        var data=s();
        data.cards=(data.cards||[]).filter(function(x){return x.name!==name});
        w(data);
        location.reload();
      };
      r.appendChild(b);
    });
  }
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();
})();
