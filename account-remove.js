(function(){
  "use strict";
  var K="myWallet_v1";
  function s(){try{return JSON.parse(localStorage.getItem(K)||"{}")}catch(e){return {}}}
  function w(x){localStorage.setItem(K,JSON.stringify(x))}
  function c(t){return String(t||"").replace(/^📁\s*/,"").trim()}
  function btn(){var b=document.createElement("button");b.type="button";b.className="btn secondary";b.textContent="Remove";b.style.minHeight="32px";b.style.padding="0 10px";b.style.fontSize=".78rem";return b}
  function run(){
    Array.from(document.querySelectorAll("#main .account-card")).forEach(function(card){
      if(card.querySelector("[data-account-x]"))return;
      var h=card.querySelector("h2");
      var r=card.querySelector(".section-title");
      if(!h||!r)return;
      var name=c(h.textContent);
      var b=btn();
      b.dataset.accountX=name;
      b.onclick=function(ev){
        ev.preventDefault();ev.stopPropagation();
        if(!confirm("Remove "+name+" and its sinking funds?"))return;
        var data=s();
        var account=(data.accounts||[]).find(function(x){return x.name===name});
        data.accounts=(data.accounts||[]).filter(function(x){return x.name!==name});
        if(account){data.goals=(data.goals||[]).filter(function(g){return g.linkedAccountId!==account.id})}
        w(data);
        location.reload();
      };
      r.appendChild(b);
    });
  }
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();
})();
