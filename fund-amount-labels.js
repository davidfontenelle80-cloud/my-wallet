(function(){
  "use strict";
  var K="myWallet_v1";
  function data(){try{return JSON.parse(localStorage.getItem(K)||"{}")}catch(e){return {}}}
  function clean(t){return String(t||"").replace(/^↳\s*/,"").trim()}
  function money(n){return (Number(n)||0).toLocaleString("en-US",{style:"currency",currency:"USD"})}
  function accountName(card){var h=card.querySelector("h2");return h?String(h.textContent||"").replace(/^📁\s*/,"").trim():""}
  function run(){
    var store=data();
    Array.from(document.querySelectorAll("#main .account-card")).forEach(function(card){
      var acctName=accountName(card);
      var acct=(store.accounts||[]).find(function(a){return a.name===acctName});
      if(!acct)return;
      Array.from(card.querySelectorAll(".fund-pill")).forEach(function(pill){
        if(pill.dataset.amountLabelDone==="1")return;
        var nameEl=pill.querySelector("b");
        if(!nameEl)return;
        var fundName=clean(nameEl.textContent);
        var fund=(acct.funds||[]).find(function(f){return f.name===fundName});
        if(!fund)return;
        var detail=pill.querySelector("small");
        if(detail){
          detail.innerHTML="Amount in fund: <strong>"+money(fund.amount)+"</strong><br>Inside "+acct.name;
        }
        var amountEl=pill.querySelector(":scope > strong");
        if(amountEl){
          amountEl.textContent=money(fund.amount);
          amountEl.setAttribute("aria-label","Amount in fund "+money(fund.amount));
        }
        pill.dataset.amountLabelDone="1";
      });
    });
  }
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();
})();
