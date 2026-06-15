(function(){
  "use strict";
  var K="myWallet_v1";
  function get(){try{return JSON.parse(localStorage.getItem(K)||"{}")}catch(e){return {}}}
  function put(x){localStorage.setItem(K,JSON.stringify(x))}
  function today(){return new Date().toISOString().slice(0,10)}
  function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
  function amt(v){return Math.round((Number(v)||0)*100)/100}
  function esc(s){return String(s||"").replace(/[&<>\"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]})}
  function close(){var m=document.getElementById("modal");if(m){m.classList.add("hidden");m.innerHTML=""}}
  function accountOptions(data){return (data.accounts||[]).map(function(a){return '<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>'}).join("")}
  function categoryOptions(data){return (data.categories||["Other"]).map(function(c){return '<option>'+esc(c)+'</option>'}).join("")}
  function fileToDataUrl(file,cb){
    if(!file){cb("");return}
    var r=new FileReader();
    r.onload=function(){cb(String(r.result||""))};
    r.readAsDataURL(file);
  }
  function openReceipt(){
    var data=get();
    var modal=document.getElementById("modal");
    if(!modal)return;
    modal.classList.remove("hidden");
    modal.innerHTML='<div class="modal-card"><div class="section-title"><h2>Receipt Transaction</h2><button class="icon-btn" data-close>×</button></div><form class="form-grid"><div class="button-row"><label class="btn gold" style="text-align:center">Take Photo<input name="camera" type="file" accept="image/*" capture="environment" hidden></label><label class="btn secondary" style="text-align:center">Import Photo<input name="photo" type="file" accept="image/*" hidden></label></div><div id="receipt-preview" class="help-text">Add a receipt photo, then verify before saving.</div><div class="field"><label>Merchant</label><input name="merchant" placeholder="Store or restaurant"></div><div class="field"><label>Date</label><input name="date" type="date" value="'+today()+'"></div><div class="field"><label>Amount</label><input name="amount" type="number" step="0.01" placeholder="0.00" required></div><div class="field"><label>Category</label><select name="category">'+categoryOptions(data)+'</select></div><div class="field"><label>Account</label><select name="accountId">'+accountOptions(data)+'</select></div><p class="help-text">Verify before saving. By default, this will log an expense and update the selected account balance.</p><label class="fund-pill" style="justify-content:flex-start;gap:10px"><input name="logTransaction" type="checkbox" checked style="width:auto"> Log transaction and update account balance</label><label class="fund-pill" style="justify-content:flex-start;gap:10px"><input name="saveImage" type="checkbox" checked style="width:auto"> Save receipt image</label><button class="btn gold" type="submit">Save Transaction</button><button class="btn secondary" type="button" data-cancel>Cancel</button></form></div>';
    var imageData="";
    function handleFile(input){fileToDataUrl(input.files&&input.files[0],function(url){imageData=url;var prev=modal.querySelector("#receipt-preview");if(prev&&url){prev.innerHTML='<img src="'+url+'" alt="Receipt preview" style="max-width:100%;border-radius:16px;margin-top:8px"><p class="help-text">Verify the details before saving. Uncheck log transaction to save only the image.</p>'}})}
    modal.querySelector('[name="camera"]').onchange=function(){handleFile(this)};
    modal.querySelector('[name="photo"]').onchange=function(){handleFile(this)};
    modal.querySelector("[data-close]").onclick=close;
    modal.querySelector("[data-cancel]").onclick=close;
    modal.querySelector("form").onsubmit=function(e){
      e.preventDefault();
      var f=new FormData(e.target);
      var amount=amt(f.get("amount"));
      var accountId=String(f.get("accountId")||"");
      var shouldLog=!!f.get("logTransaction");
      var shouldSaveImage=!!f.get("saveImage");
      var data=get();
      var acct=(data.accounts||[]).find(function(a){return a.id===accountId});
      if(shouldLog&&!acct)return;
      if(shouldLog){acct.balance=amt((acct.balance||0)-amount)}
      data.transactions=data.transactions||[];
      data.transactions.unshift({id:id(),type:shouldLog?"expense":"receipt",date:String(f.get("date")||today()),merchant:String(f.get("merchant")||"Receipt"),category:String(f.get("category")||"Other"),amount:shouldLog?-Math.abs(amount):0,accountId:shouldLog?accountId:"",note:shouldLog?"Receipt transaction":"Receipt image only",receiptImage:shouldSaveImage&&imageData?imageData:""});
      put(data);
      location.reload();
    };
  }
  function addButton(){
    var main=document.getElementById("main");
    if(!main||!/Transactions/.test(main.textContent))return;
    if(main.querySelector("[data-receipt-entry]"))return;
    var hero=main.querySelector(".hero .button-row");
    if(!hero)return;
    var b=document.createElement("button");
    b.type="button";
    b.className="btn secondary";
    b.dataset.receiptEntry="1";
    b.textContent="📷 Receipt";
    b.onclick=openReceipt;
    hero.appendChild(b);
  }
  new MutationObserver(addButton).observe(document.body,{childList:true,subtree:true});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",addButton);else addButton();
})();
