(function(){
  "use strict";
  var K="myWallet_v1";
  function get(){try{return JSON.parse(localStorage.getItem(K)||"{}")}catch(e){return {}}}
  function put(x){localStorage.setItem(K,JSON.stringify(x))}
  function clean(t){return String(t||"").replace(/^↳\s*/,"").trim()}
  function small(label){var b=document.createElement("button");b.type="button";b.className="btn secondary";b.textContent=label;b.style.minHeight="32px";b.style.padding="0 10px";b.style.fontSize=".78rem";return b}
  function accountName(card){var h=card.querySelector("h2");return h?String(h.textContent||"").replace(/^📁\s*/,"").trim():""}
  function removeFund(account,fund){
    if(!confirm("Remove "+fund+"?"))return;
    var data=get();
    var acct=(data.accounts||[]).find(function(a){return a.name===account});
    if(!acct)return alert("Account not found");
    var item=(acct.funds||[]).find(function(f){return f.name===fund});
    if(!item)return alert("Sinking fund not found");
    acct.funds=(acct.funds||[]).filter(function(f){return f.id!==item.id});
    data.goals=(data.goals||[]).filter(function(g){return g.linkedFundId!==item.id});
    put(data);
    location.reload();
  }
  function run(){
    Array.from(document.querySelectorAll("#main .account-card")).forEach(function(card){
      var acct=accountName(card);
      Array.from(card.querySelectorAll(".fund-pill")).forEach(function(pill){
        if(pill.querySelector("[data-fund-remove]"))return;
        var nameEl=pill.querySelector("b");
        if(!nameEl)return;
        var b=small("Remove");
        b.dataset.fundRemove="1";
        b.onclick=function(e){e.preventDefault();e.stopPropagation();removeFund(acct,clean(nameEl.textContent))};
        pill.appendChild(b);
      });
    });
  }
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();
})();
