(function(){
  "use strict";
  var K="myWallet_v1";
  function state(){try{return JSON.parse(localStorage.getItem(K)||"{}")}catch(e){return {}}}
  function save(x){localStorage.setItem(K,JSON.stringify(x))}
  function amt(t){return Number(String(t||"").replace(/[^0-9.-]/g,""))||0}
  function money(n){return (Number(n)||0).toLocaleString("en-US",{style:"currency",currency:"USD"})}
  function small(label){var b=document.createElement("button");b.type="button";b.className="btn secondary";b.textContent=label;b.style.minHeight="32px";b.style.padding="0 12px";b.style.fontSize=".82rem";return b}
  function cleanName(t){return String(t||"").replace(/^📁\s*/,"").trim()}
  function closeModal(){var m=document.getElementById("modal");if(m){m.classList.add("hidden");m.innerHTML=""}}
  function findAccount(name,data){return (data.accounts||[]).find(function(a){return a.name===name})}
  function reserved(account){return (account.funds||[]).reduce(function(sum,f){return sum+amt(f.amount)},0)}
  function openAccountMenu(accountName){
    var data=state();
    var account=findAccount(accountName,data);
    if(!account)return;
    var modal=document.getElementById("modal");
    if(!modal)return;
    var res=reserved(account);
    modal.classList.remove("hidden");
    modal.innerHTML='<div class="modal-card"><div class="section-title"><div><h2>'+account.name+'</h2><p class="muted">'+account.type+' account</p></div><button class="icon-btn" data-close>×</button></div><div class="row"><span>Balance</span><strong>'+money(account.balance)+'</strong></div><div class="row"><span>Reserved</span><strong>'+money(res)+'</strong></div><div class="row"><span>Available</span><strong>'+money((account.balance||0)-res)+'</strong></div><div class="button-row"><button class="btn gold" data-edit>Edit Account</button><button class="btn danger" data-remove>Remove Account</button><button class="btn secondary" data-cancel>Cancel</button></div></div>';
    modal.querySelector("[data-close]").onclick=closeModal;
    modal.querySelector("[data-cancel]").onclick=closeModal;
    modal.querySelector("[data-edit]").onclick=function(){openEditForm(account.name)};
    modal.querySelector("[data-remove]").onclick=function(){openRemoveConfirm(account.name)};
  }
  function openEditForm(accountName){
    var data=state();
    var account=findAccount(accountName,data);
    if(!account)return;
    var modal=document.getElementById("modal");
    modal.innerHTML='<div class="modal-card"><div class="section-title"><h2>Edit Account</h2><button class="icon-btn" data-close>×</button></div><form class="form-grid"><div class="field"><label>Account name</label><input name="name" value="'+String(account.name).replace(/"/g,"&quot;")+'"></div><div class="field"><label>Type</label><select name="type"><option value="checking">checking</option><option value="savings">savings</option><option value="cash">cash</option><option value="brokerage">brokerage</option><option value="crypto">crypto</option></select></div><div class="field"><label>Balance</label><input name="balance" type="number" step="0.01" value="'+(account.balance||0)+'"></div><button class="btn gold" type="submit">Save Changes</button><button class="btn secondary" type="button" data-cancel>Cancel</button></form></div>';
    modal.querySelector('select[name="type"]').value=account.type||"checking";
    modal.querySelector("[data-close]").onclick=closeModal;
    modal.querySelector("[data-cancel]").onclick=closeModal;
    modal.querySelector("form").onsubmit=function(e){
      e.preventDefault();
      var name=modal.querySelector('input[name="name"]').value.trim();
      if(!name)return;
      account.name=name;
      account.type=modal.querySelector('select[name="type"]').value;
      account.balance=amt(modal.querySelector('input[name="balance"]').value);
      save(data);
      location.reload();
    };
  }
  function openRemoveConfirm(accountName){
    var data=state();
    var account=findAccount(accountName,data);
    if(!account)return;
    var modal=document.getElementById("modal");
    var fundCount=(account.funds||[]).length;
    modal.innerHTML='<div class="modal-card"><div class="section-title"><h2>Remove Account?</h2><button class="icon-btn" data-close>×</button></div><p class="help-text">'+account.name+' and '+fundCount+' sinking fund(s) will be removed.</p><div class="button-row"><button class="btn danger" data-confirm>Remove Account</button><button class="btn secondary" data-cancel>Cancel</button></div></div>';
    modal.querySelector("[data-close]").onclick=closeModal;
    modal.querySelector("[data-cancel]").onclick=closeModal;
    modal.querySelector("[data-confirm]").onclick=function(){
      var fundIds=(account.funds||[]).map(function(f){return f.id});
      data.accounts=(data.accounts||[]).filter(function(a){return a.id!==account.id});
      data.goals=(data.goals||[]).filter(function(g){
        return g.linkedAccountId!==account.id && fundIds.indexOf(g.linkedFundId)===-1;
      });
      save(data);
      location.reload();
    };
  }
  function run(){
    Array.from(document.querySelectorAll("#main .account-card")).forEach(function(card){
      if(card.querySelector("[data-account-edit]"))return;
      var title=card.querySelector("h2");
      var row=title&&title.closest(".section-title");
      if(!title||!row)return;
      var b=small("Edit");
      b.dataset.accountEdit="1";
      b.onclick=function(e){e.preventDefault();e.stopPropagation();openAccountMenu(cleanName(title.textContent))};
      row.appendChild(b);
    });
  }
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();
})();
