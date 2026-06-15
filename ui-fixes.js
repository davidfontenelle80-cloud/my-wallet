(function () {
  "use strict";

  function all(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function fixButtons(root) {
    all("button", root).forEach(function (button) {
      var text = button.textContent.trim();
      if (text === "+ Fund") button.textContent = "+ Sinking Fund";
      if (text === "+ Fondo") button.textContent = "+ Fondo";
    });
  }

  function fixNumberInputs(root) {
    all('input[type="number"]', root).forEach(function (input) {
      if (input.dataset.myWalletZeroFix === "1") return;
      input.dataset.myWalletZeroFix = "1";
      if (input.value === "0" || input.value === "0.00") input.value = "";
      if (!input.placeholder) input.placeholder = input.name === "apr" ? "APR if known" : "0.00";
      input.addEventListener("focus", function () {
        if (input.value === "0" || input.value === "0.00") input.value = "";
      });
    });
  }

  function polishBanking(root) {
    all(".account-card", root).forEach(function (card) {
      if (card.dataset.myWalletFolderFix === "1") return;
      card.dataset.myWalletFolderFix = "1";
      var title = card.querySelector("h2");
      if (title && title.textContent.indexOf("📁") === -1) {
        title.textContent = "📁 " + title.textContent.trim();
      }
      all(".fund-pill b", card).forEach(function (fund) {
        var current = fund.textContent.trim();
        if (current.indexOf("↳") !== 0) fund.textContent = "↳ " + current;
      });
    });
  }

  function patch() {
    fixButtons(document);
    fixNumberInputs(document);
    polishBanking(document);
  }

  new MutationObserver(patch).observe(document.body, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", patch);
  else patch();
})();
