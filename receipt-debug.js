(function(){
  "use strict";
  function titleFromDomain(domain){
    var name=String(domain||"").toLowerCase().replace(/^www\./,"").split(".")[0]||"";
    name=name.replace(/[^a-z0-9]+/g," ").trim();
    var key=name.replace(/\s+/g,"");
    var known={dinefine:"DINEFINE RESTAURANT",starbucks:"STARBUCKS",target:"TARGET",walmart:"WALMART",costco:"COSTCO",wholefoods:"WHOLE FOODS",wholefoodsmarket:"WHOLE FOODS",stopandshop:"STOP AND SHOP",shoprite:"SHOPRITE",shell:"SHELL",exxon:"EXXON",mobil:"MOBIL",bp:"BP"};
    if(known[key])return known[key];
    return name?name.split(/\s+/).map(function(w){return w.toUpperCase()}).join(" "):"";
  }
  function merchantFromText(text){
    var raw=String(text||"");
    var m=raw.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+\.(?:com|net|org|co|us))\b/i);
    return m?titleFromDomain(m[1]):"";
  }
  function turnOffReceiptImageSaving(){
    var modal=document.getElementById("modal");
    if(!modal)return;
    var input=modal.querySelector('input[name="saveImage"]');
    if(input)input.checked=false;
    var label=input&&input.closest("label");
    if(label)label.style.display="none";
    Array.from(modal.querySelectorAll(".help-text")).forEach(function(el){
      if(/uncheck log transaction to save only the image/i.test(el.textContent||""))el.textContent="Verify the details before saving. Receipt photos are used only for OCR and are not stored.";
    });
  }
  new MutationObserver(turnOffReceiptImageSaving).observe(document.body,{childList:true,subtree:true});
  setInterval(turnOffReceiptImageSaving,700);
  var originalRecognize=null;
  function hook(){
    if(!window.Tesseract||!window.Tesseract.recognize||originalRecognize)return;
    originalRecognize=window.Tesseract.recognize;
    window.Tesseract.recognize=function(){
      return originalRecognize.apply(this,arguments).then(function(result){
        try{
          turnOffReceiptImageSaving();
          var modal=document.getElementById("modal");
          var data=result&&result.data;
          var text=data&&data.text||"";
          var merchant=merchantFromText(text);
          if(merchant&&data&&text.indexOf(merchant)===-1){
            data.text=merchant+"\n"+text;
            var input=modal&&modal.querySelector('[name="merchant"]');
            if(input&&!input.value)input.value=merchant;
          }
        }catch(e){}
        return result;
      });
    };
  }
  var tries=0;
  var timer=setInterval(function(){tries++;hook();if(originalRecognize||tries>40)clearInterval(timer)},250);
})();
