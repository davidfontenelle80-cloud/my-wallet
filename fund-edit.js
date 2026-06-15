(function(){
  "use strict";
  var K="myWallet_v1";
  function state(){try{return JSON.parse(localStorage.getItem(K)||"{}")}catch(e){return {}}}
  function save(x){localStorage.setItem(K,JSON.stringify(x))}
  function clean(t){return String(t||"").replace(/^↳\s*/,"").trim()}
  function amt(t){return Number(String(t||"").replace(/[^0-9.-]/g,""))||0}
  function money(n){return (Number(n)||0).toLocaleString("en-US",{style:"currency",currency:"USD"})}
  function small(label){var b=document.createElement("button");b.type="button";b.className="btn secondary";b.textContent=label;b.style.minHeight="32px";b.style.padding="0 12px";b.style.fontSize=".82rem";return b}
  function acctName(card){var h=card.querySelector("h2");return h?String(h.textContent||"").replace(/^📁\s*/,"").trim():""}
  function closeModal(){var m=document.getElementById("modal");if(m){m.classList.add("hidden");m.innerHTML=""}}
  function openFundMenu(accountName,fundName){
    var data=state();
    var account=(data.accounts||[]).find(function(a){return a.name===accountName});
    if(!account)return;
    var fund=(account.funds||[]).find(function(f){return f.name===fundName});
    if(!fund)return;
    var modal=document.getElementById("modal");
    if(!modal)return;
    modal.classList.remove("hidden");
    modal.innerHTML='<div class="modal-card"><div class="section-title"><div><h2>'+fund.name+'</h2><p class="muted">Inside '+account.name+'</p></div><button class="icon-btn" data-close>×</button></div><div class="row"><span>Current amount</span><strong>'+money(fund.amount)+'</strong></div><div class="button-row"><button class="btn gold" data-edit> Edit Fund </button><button class="btn danger" data-remove> Remove Fund </button><button class="btn secondary" data-cancel> Cancel </button></div></div>';
    modal.querySelector("[data-close]").onclick=closeModal;
    modal.querySelector("[data-cancel]").onclick=closeModal;
    modal.querySelector("[data-edit]").onclick=function(){openEditForm(accountName,fund.name)};
    modal.querySelector("[data-remove]").onclick=function(){openRemoveConfirm(accountName,fund.name)};
  }
  function openEditForm(accountName,fundName){
    var data=state();
    var account=(data.accounts||[]).find(function(a){return a.name===accountName});
    var fund=account&&(account.funds||[]).find(function(f){return f.name===fundName});
    if(!fund)return;
    var modal=document.getElementById("modal");
    modal.innerHTML='<div class="modal-card"><div class="section-title"><h2>Edit Sinking Fund</h2><button class="icon-btn" data-close>×</button></div><form class="form-grid"><div class="field"><label>Fund name</label><input name="name" value="'+fund.name.replace(/"/g,"&quot;")+'"></div><div class="field"><label>Amount</label><input name="amount" type="number" step="0.01" value="'+(fund.amount||0)+'"></div><button class="btn gold" type="submit">Save Changes</button><button class="btn secondary" type="button" data-cancel>Cancel</button></form></div>';
    modal.querySelector("[data-close]").onclick=closeModal;
    modal.querySelector("[data-cancel]").onclick=closeModal;
    modal.querySelector("form").onsubmit=function(e){
      e.preventDefault();
      var name=modal.querySelector('input[name="name"]').value.trim();
      var amount=modal.querySelector('input[name="amount"]').value;
      if(!name)return;
      fund.name=name;
      fund.amount=amt(amount);
      (data.goals||[]).forEach(function(g){if(g.linkedFundId===fund.id)g.name=name});
      save(data);
      location.reload();
    };
  }
  function openRemoveConfirm(accountName,fundName){
    var data=state();
    var account=(data.accounts||[]).find(function(a){return a.name===accountName});
    var fund=account&&(account.funds||[]).find(function(f){return f.name===fundName});
    if(!fund)return;
    var modal=document.getElementById("modal");
    modal.innerHTML='<div class="modal-card"><div class="section-title"><h2>Remove Sinking Fund?</h2><button class="icon-btn" data-close>×</button></div><p class="help-text">'+fund.name+' will be removed from '+account.name+'.</p><div class="button-row"><button class="btn danger" data-confirm>Remove Fund</button><button class="btn secondary" data-cancel>Cancel</button></div></div>';
    modal.querySelector("[data-close]").onclick=closeModal;
    modal.querySelector("[data-cancel]").onclick=closeModal;
    modal.querySelector("[data-confirm]").onclick=function(){
      account.funds=(account.funds||[]).filter(function(f){return f.id!==fund.id});
      data.goals=(data.goals||[]).filter(function(g){return g.linkedFundId!==fund.id});
      save(data);
      location.reload();
    };
  }
  function run(){
    Array.from(document.querySelectorAll("#main .account-card")).forEach(function(card){
      var accountName=acctName(card);
      Array.from(card.querySelectorAll(".fund-pill")).forEach(function(pill){
        if(pill.querySelector("[data-fund-edit]"))return;
        var nameEl=pill.querySelector("b");
        if(!nameEl)return;
        var b=small("Edit");
        b.dataset.fundEdit="1";
        b.onclick=function(e){e.preventDefault();e.stopPropagation();openFundMenu(accountName,clean(nameEl.textContent))};
        pill.appendChild(b);
      });
    });
  }
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();
})();
