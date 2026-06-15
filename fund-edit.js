(function(){
  "use strict";
  var K="myWallet_v1";
  function state(){try{return JSON.parse(localStorage.getItem(K)||"{}")}catch(e){return {}}}
  function save(x){localStorage.setItem(K,JSON.stringify(x))}
  function clean(t){return String(t||"").replace(/^↳\s*/,"").trim()}
  function moneyText(t){return Number(String(t||"").replace(/[^0-9.-]/g,""))||0}
  function small(label){var b=document.createElement("button");b.type="button";b.className="btn secondary";b.textContent=label;b.style.minHeight="32px";b.style.padding="0 10px";b.style.fontSize=".78rem";return b}
  function findAccountName(card){var h=card.querySelector("h2");return h?String(h.textContent||"").replace(/^📁\s*/,"").trim():""}
  function editFund(accountName,fundName){
    var data=state();
    var account=(data.accounts||[]).find(function(a){return a.name===accountName});
    if(!account)return alert("Account not found");
    var fund=(account.funds||[]).find(function(f){return f.name===fundName});
    if(!fund)return alert("Sinking fund not found");
    var newName=prompt("Sinking fund name",fund.name);
    if(newName===null)return;
    newName=newName.trim();
    if(!newName)return;
    var newAmount=prompt("Sinking fund amount",String(fund.amount||0));
    if(newAmount===null)return;
    fund.name=newName;
    fund.amount=moneyText(newAmount);
    (data.goals||[]).forEach(function(g){if(g.linkedFundId===fund.id)g.name=newName});
    save(data);
    location.reload();
  }
  function run(){
    Array.from(document.querySelectorAll("#main .account-card")).forEach(function(card){
      var accountName=findAccountName(card);
      Array.from(card.querySelectorAll(".fund-pill")).forEach(function(pill){
        if(pill.querySelector("[data-fund-edit]"))return;
        var nameEl=pill.querySelector("b");
        if(!nameEl)return;
        var b=small("Edit");
        b.dataset.fundEdit="1";
        b.onclick=function(e){e.preventDefault();e.stopPropagation();editFund(accountName,clean(nameEl.textContent))};
        pill.appendChild(b);
      });
    });
  }
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();
})();
