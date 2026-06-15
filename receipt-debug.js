(function(){
  "use strict";
  var lastText="";
  function esc(s){return String(s||"").replace(/[&<>\"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]})}
  function addDebugBox(modal,text){
    lastText=String(text||"");
    var status=modal&&modal.querySelector("#ocr-status");
    if(!status||modal.querySelector("#ocr-debug-box"))return;
    var wrap=document.createElement("div");
    wrap.id="ocr-debug-box";
    wrap.className="help-text";
    wrap.innerHTML='<button class="btn secondary" type="button" data-show-ocr style="margin-top:8px">Show OCR Text</button><pre data-ocr-text style="display:none;white-space:pre-wrap;max-height:220px;overflow:auto;margin-top:8px;border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:10px;font-size:.78rem"></pre>';
    status.insertAdjacentElement("afterend",wrap);
    wrap.querySelector("[data-show-ocr]").onclick=function(){
      var pre=wrap.querySelector("[data-ocr-text]");
      pre.style.display=pre.style.display==="none"?"block":"none";
      pre.textContent=lastText||"No OCR text captured yet.";
    };
  }
  var originalRecognize=null;
  function hook(){
    if(!window.Tesseract||!window.Tesseract.recognize||originalRecognize)return;
    originalRecognize=window.Tesseract.recognize;
    window.Tesseract.recognize=function(){
      return originalRecognize.apply(this,arguments).then(function(result){
        try{
          var modal=document.getElementById("modal");
          var text=result&&result.data&&result.data.text||"";
          addDebugBox(modal,text);
        }catch(e){}
        return result;
      });
    };
  }
  var tries=0;
  var timer=setInterval(function(){tries++;hook();if(originalRecognize||tries>40)clearInterval(timer)},250);
})();
