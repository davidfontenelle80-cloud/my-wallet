(function(){
  "use strict";
  function text(el,value){if(el&&el.textContent.trim()!==value)el.textContent=value}
  function patchButtons(){
    Array.from(document.querySelectorAll("button")).forEach(function(b){
      var t=b.textContent.trim();
      if(t==="+ Account")b.textContent="+ Add Account";
      if(t==="+ Sinking Fund")b.textContent="+ Add Fund";
    });
  }
  function patchHero(){
    var main=document.getElementById("main");
    if(!main||!main.textContent.includes("Banking"))return;
    Array.from(main.querySelectorAll("p")).forEach(function(p){
      if(p.textContent.includes("Each account holds real money")){
        p.textContent="Accounts hold your money. Sinking funds set aside portions of an account for specific purposes.";
      }
    });
  }
  function patchKpis(){
    Array.from(document.querySelectorAll("#main .account-card .kpi span")).forEach(function(span){
      var t=span.textContent.trim();
      if(t==="Reserved")span.textContent="Total Sinking Funds";
      if(t==="Free")span.textContent="Available";
      if(t==="Reserved %")span.textContent="Sinking Fund %";
    });
    Array.from(document.querySelectorAll("#main .account-card .muted")).forEach(function(el){
      el.textContent=el.textContent.replace("available","active");
    });
  }
  function run(){patchButtons();patchHero();patchKpis()}
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();
})();
