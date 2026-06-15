(function(){
  "use strict";
  function titleFromDomain(domain){
    var name=String(domain||"").toLowerCase().replace(/^www\./,"").split(".")[0]||"";
    name=name.replace(/[^a-z0-9]+/g," ").trim();
    if(!name)return "";
    var known={
      dinefine:"DINEFINE RESTAURANT",
      starbucks:"STARBUCKS",
      target:"TARGET",
      walmart:"WALMART",
      costco:"COSTCO",
      wholefoodsmarket:"WHOLE FOODS",
      wholefoods:"WHOLE FOODS",
      stopandshop:"STOP AND SHOP",
      shoprite:"SHOPRITE",
      shell:"SHELL",
      exxon:"EXXON",
      mobil:"MOBIL",
      bp:"BP"
    };
    if(known[name.replace(/\s+/g,"")])return known[name.replace(/\s+/g,"")];
    return name.split(/\s+/).map(function(w){return w.toUpperCase()}).join(" ");
  }
  function merchantFromText(text){
    var raw=String(text||"");
    var match=raw.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+\.(?:com|net|org|co|us))\b/i);
    if(!match)return "";
    return titleFromDomain(match[1]);
  }
  function hook(){
    if(!window.Tesseract||!window.Tesseract.recognize||window.__merchantFallbackHooked)return false;
    var original=window.Tesseract.recognize;
    window.__merchantFallbackHooked=true;
    window.Tesseract.recognize=function(){
      return original.apply(this,arguments).then(function(result){
        try{
          var data=result&&result.data;
          var text=data&&data.text||"";
          var merchant=merchantFromText(text);
          if(merchant&&data&&text.indexOf(merchant)===-1){
            data.text=merchant+"\n"+text;
          }
        }catch(e){}
        return result;
      });
    };
    return true;
  }
  var tries=0;
  var timer=setInterval(function(){tries++;if(hook()||tries>60)clearInterval(timer)},200);
})();
