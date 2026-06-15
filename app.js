(function () {
  "use strict";

  const KEY = "myWallet_v1";
  const $ = (id) => document.getElementById(id);
  const money = (n) => (Number(n) || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
  const today = () => new Date().toISOString().slice(0, 10);
  const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const clean = (s) => String(s || "").trim();
  const num = (n) => Math.round((Number(n) || 0) * 100) / 100;

  let activeView = "dashboard";
  let state = load();

  function starterState() {
    return {
      version: "my-wallet-1.0",
      setupComplete: false,
      settings: { firstName: "", theme: "dark", lastBackup: "" },
      accounts: [
        { id: id(), name: "SoFi Checking", type: "checking", balance: 0, funds: [] },
        { id: id(), name: "SoFi Savings", type: "savings", balance: 0, funds: [
          { id: id(), name: "Emergency Fund", amount: 0 },
          { id: id(), name: "Car Maintenance", amount: 0 },
        ] },
      ],
      cards: [],
      categories: ["Dining", "Groceries", "Gas", "Bills", "Shopping", "Health", "Travel", "Income", "Other"],
      transactions: [],
      goals: [],
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (err) { console.warn(err); }
    return starterState();
  }

  function normalize(raw) {
    const base = starterState();
    return {
      ...base,
      ...raw,
      settings: { ...base.settings, ...(raw.settings || {}) },
      accounts: Array.isArray(raw.accounts) ? raw.accounts : base.accounts,
      cards: Array.isArray(raw.cards) ? raw.cards : [],
      categories: Array.isArray(raw.categories) ? raw.categories : base.categories,
      transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
      goals: Array.isArray(raw.goals) ? raw.goals : [],
    };
  }

  function save(next) {
    state = normalize(next);
    localStorage.setItem(KEY, JSON.stringify(state));
    applyTheme();
    render();
  }

  function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.settings.theme || "dark";
  }

  function greeting() {
    const h = new Date().getHours();
    const part = h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
    return state.settings.firstName ? `${part}, ${state.settings.firstName}` : "My Wallet";
  }

  function totals() {
    const bank = state.accounts.reduce((s, a) => s + num(a.balance), 0);
    const reserved = state.accounts.reduce((s, a) => s + (a.funds || []).reduce((x, f) => x + num(f.amount), 0), 0);
    const cardDebt = state.cards.reduce((s, c) => s + num(c.balance), 0);
    const cardLimit = state.cards.reduce((s, c) => s + num(c.limit), 0);
    const transfer = state.accounts.flatMap((a) => (a.funds || []).map((f) => ({ ...f, accountId: a.id }))).find((f) => /transfer/i.test(f.name));
    const transferBalance = transfer ? num(transfer.amount) : 0;
    return { bank, reserved, free: bank - reserved, cardDebt, cardLimit, netWorth: bank - cardDebt, transferBalance, cardCoverage: cardDebt ? transferBalance / cardDebt : 1, cardOverUnder: transferBalance - cardDebt };
  }

  function accountReserved(account) { return (account.funds || []).reduce((s, f) => s + num(f.amount), 0); }
  function accountAvailable(account) { return num(account.balance) - accountReserved(account); }
  function cardAvailable(card) { return Math.max(0, num(card.limit) - num(card.balance)); }

  function render() {
    $("greeting").textContent = greeting();
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.view === activeView));
    const view = $("main");
    view.innerHTML = screens[activeView] ? screens[activeView]() : screens.dashboard();
    wire(view);
    if (!state.setupComplete) renderOnboarding();
  }

  const screens = {
    dashboard() {
      const t = totals();
      const coverageTone = t.cardOverUnder >= 0 ? "good" : "bad";
      const recent = state.transactions.slice(0, 6);
      return `
        <section class="hero wide"><div class="eyebrow">Wallet overview</div><h2>${greeting()}</h2><p>Track every dollar, reserve money into sinking funds, and keep credit cards covered.</p></section>
        <section class="kpi-grid wide">
          ${kpi("Net Worth", money(t.netWorth), t.netWorth >= 0 ? "good" : "bad")}
          ${kpi("Free Cash", money(t.free), t.free >= 0 ? "good" : "bad")}
          ${kpi("Reserved", money(t.reserved), "gold")}
          ${kpi("Card Debt", money(t.cardDebt), t.cardDebt ? "bad" : "good")}
        </section>
        <section class="card wide"><div class="section-title"><h2>Credit Card Coverage</h2><button class="btn secondary" data-help="coverage">?</button></div>
          <div class="row"><span>Transfer Fund</span><strong>${money(t.transferBalance)}</strong></div>
          <div class="row"><span>Total Card Debt</span><strong>${money(t.cardDebt)}</strong></div>
          <div class="row"><span>${t.cardOverUnder >= 0 ? "Covered by" : "Short by"}</span><strong class="${coverageTone}">${money(Math.abs(t.cardOverUnder))}</strong></div>
          <div class="meter"><span style="width:${Math.min(100, t.cardCoverage * 100)}%"></span></div>
        </section>
        <section class="card"><div class="section-title"><h2>Recent Transactions</h2><button class="btn secondary" data-view-go="transactions">Add</button></div>${recent.length ? recent.map(transactionRow).join("") : empty("No transactions yet.")}</section>
        <section class="card"><div class="section-title"><h2>Command Center</h2></div><p class="help-text">Free cash is your bank balance minus money reserved in sinking funds. That is the number to watch before spending.</p></section>`;
    },
    banking() {
      return `<section class="hero wide"><div class="eyebrow">Account-centric sinking funds</div><h2>Banking</h2><p>Each account holds real money. Sinking funds reserve pieces of that balance.</p><div class="button-row"><button class="btn gold" data-modal="account">+ Account</button><button class="btn secondary" data-modal="fund">+ Fund</button></div></section>${state.accounts.length ? state.accounts.map(accountCard).join("") : empty("Add your first account.")}`;
    },
    cards() {
      const t = totals();
      return `<section class="hero wide"><div class="eyebrow">Debt monitor</div><h2>Credit Cards</h2><p>Total debt ${money(t.cardDebt)} · Available credit ${money(t.cardLimit - t.cardDebt)}</p><div class="button-row"><button class="btn gold" data-modal="card">+ Credit Card</button></div></section>${state.cards.length ? state.cards.map(cardCard).join("") : empty("Add your first credit card.")}`;
    },
    transactions() {
      return `<section class="hero wide"><div class="eyebrow">Manual ledger</div><h2>Transactions</h2><p>Expenses, income, and adjustments update balances automatically.</p><div class="button-row"><button class="btn gold" data-modal="expense">+ Expense</button><button class="btn secondary" data-modal="income">+ Income</button><button class="btn secondary" data-modal="adjustment">Adjustment</button></div></section><section class="card wide">${state.transactions.length ? state.transactions.map(transactionRow).join("") : empty("No transactions yet.")}</section>`;
    },
    transfers() {
      return `<section class="hero wide"><div class="eyebrow">Move money</div><h2>Transfers</h2><p>Move money account-to-account, into sinking funds, fund-to-fund, or pay a credit card.</p><div class="button-row"><button class="btn gold" data-modal="transfer">+ Transfer</button><button class="btn secondary" data-modal="payment">Card Payment</button></div></section><section class="card wide"><h2>Transfer Rules</h2><div class="row"><span>Account → Account</span><strong>Moves cash</strong></div><div class="row"><span>Account → Sinking Fund</span><strong>Reserves cash</strong></div><div class="row"><span>Fund → Fund</span><strong>Reassigns reserved cash</strong></div><div class="row"><span>Account/Fund → Credit Card</span><strong>Pays debt</strong></div></section>`;
    },
    goals() {
      return `<section class="hero wide"><div class="eyebrow">Progress from balances</div><h2>Goals</h2><p>Link goals to accounts or sinking funds so progress updates with your ledger.</p><div class="button-row"><button class="btn gold" data-modal="goal">+ Goal</button></div></section>${state.goals.length ? state.goals.map(goalCard).join("") : empty("Add your first goal.")}`;
    },
    settings() {
      return `<section class="hero wide"><div class="eyebrow">Personalize</div><h2>Settings</h2><p>Change your name, theme, categories, or export a backup.</p></section><section class="card wide"><div class="form-grid"><div class="field"><label>First name</label><input id="setting-name" value="${escapeAttr(state.settings.firstName)}"></div><div class="field"><label>Theme</label><select id="setting-theme"><option value="dark" ${state.settings.theme !== "light" ? "selected" : ""}>Dark</option><option value="light" ${state.settings.theme === "light" ? "selected" : ""}>Light</option></select></div><button class="btn gold" data-action="save-settings">Save Settings</button><button class="btn secondary" data-action="export">Export Backup</button><button class="btn danger" data-action="reset">Reset App</button></div></section><section class="card wide"><div class="section-title"><h2>Categories</h2><button class="btn secondary" data-modal="category">+ Add</button></div>${state.categories.map((c) => `<span class="fund-pill"><b>${esc(c)}</b></span>`).join("")}</section>`;
    },
  };

  function kpi(label, value, tone) { return `<div class="kpi ${tone || ""}"><span>${label}</span><strong>${value}</strong></div>`; }
  function empty(text) { return `<div class="empty">${text}</div>`; }
  function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function escapeAttr(s) { return esc(s).replace(/"/g, "&quot;"); }

  function accountCard(a) {
    const reserved = accountReserved(a), available = accountAvailable(a), pct = num(a.balance) ? Math.min(100, (reserved / num(a.balance)) * 100) : 0;
    return `<section class="card account-card"><div class="section-title"><div><h2>${esc(a.name)}</h2><p class="muted">${esc(a.type)} · available ${money(available)}</p></div><button class="btn secondary" data-modal="fund" data-account="${a.id}">+ Fund</button></div><div class="kpi-grid"><div class="kpi"><span>Balance</span><strong>${money(a.balance)}</strong></div><div class="kpi gold"><span>Reserved</span><strong>${money(reserved)}</strong></div><div class="kpi ${available >= 0 ? "good" : "bad"}"><span>Free</span><strong>${money(available)}</strong></div><div class="kpi"><span>Reserved %</span><strong>${pct.toFixed(0)}%</strong></div></div><div class="meter"><span style="width:${pct}%"></span></div>${(a.funds || []).map((f) => `<div class="fund-pill"><div><b>${esc(f.name)}</b><small>Inside ${esc(a.name)}</small></div><strong>${money(f.amount)}</strong></div>`).join("") || `<p class="help-text">No sinking funds yet.</p>`}</section>`;
  }
  function cardCard(c) { const used = num(c.limit) ? (num(c.balance) / num(c.limit)) * 100 : 0; return `<section class="card"><div class="section-title"><h2>${esc(c.name)}</h2><strong>${used.toFixed(0)}%</strong></div><div class="row"><span>Balance</span><strong>${money(c.balance)}</strong></div><div class="row"><span>Limit</span><strong>${money(c.limit)}</strong></div><div class="row"><span>Available</span><strong class="good">${money(cardAvailable(c))}</strong></div><div class="meter"><span style="width:${Math.min(100, used)}%"></span></div></section>`; }
  function transactionRow(tx) { return `<div class="row"><span><b>${esc(tx.merchant || tx.note || tx.type)}</b><br><small>${esc(tx.date)} · ${esc(tx.category || tx.type)}</small></span><strong class="amount ${tx.amount < 0 ? "bad" : ""}">${money(Math.abs(tx.amount))}</strong></div>`; }
  function goalCard(g) { const current = goalCurrent(g), pct = num(g.target) ? Math.min(100, (current / num(g.target)) * 100) : 0; return `<section class="card"><div class="section-title"><h2>${esc(g.name)}</h2><strong>${pct.toFixed(0)}%</strong></div><div class="row"><span>Current</span><strong>${money(current)}</strong></div><div class="row"><span>Target</span><strong>${money(g.target)}</strong></div><div class="row"><span>Remaining</span><strong>${money(Math.max(0, num(g.target) - current))}</strong></div><div class="meter"><span style="width:${pct}%"></span></div></section>`; }
  function goalCurrent(goal) { const allFunds = state.accounts.flatMap((a) => (a.funds || []).map((f) => ({ ...f, accountId: a.id }))); const fund = allFunds.find((f) => f.id === goal.linkedFundId); if (fund) return num(fund.amount); const acc = state.accounts.find((a) => a.id === goal.linkedAccountId); return acc ? num(acc.balance) : 0; }

  function wire(root) {
    root.querySelectorAll("[data-view-go]").forEach((b) => b.onclick = () => switchView(b.dataset.viewGo));
    root.querySelectorAll("[data-modal]").forEach((b) => b.onclick = () => openModal(b.dataset.modal, b.dataset.account));
    root.querySelectorAll("[data-help]").forEach((b) => b.onclick = () => help(b.dataset.help));
    root.querySelectorAll("[data-action]").forEach((b) => b.onclick = () => actions[b.dataset.action] && actions[b.dataset.action]());
  }

  function switchView(view) { activeView = view; render(); $("main").focus(); }
  document.querySelectorAll(".tab").forEach((b) => b.onclick = () => switchView(b.dataset.view));
  $("help-btn").onclick = () => help(activeView);

  const actions = {
    "save-settings"() { const next = clone(); next.settings.firstName = clean($("setting-name").value); next.settings.theme = $("setting-theme").value; save(next); toast("Settings saved"); },
    export() { const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `my-wallet-backup-${today()}.json`; a.click(); },
    reset() { if (confirm("Reset My Wallet data on this device?")) { localStorage.removeItem(KEY); state = starterState(); render(); } },
  };

  function clone() { return JSON.parse(JSON.stringify(state)); }
  function accountOptions() { return state.accounts.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join(""); }
  function cardOptions() { return state.cards.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join(""); }
  function fundOptions() { return state.accounts.flatMap((a) => (a.funds || []).map((f) => `<option value="${a.id}:${f.id}">${esc(a.name)} · ${esc(f.name)}</option>`)).join(""); }
  function categoryOptions() { return state.categories.map((c) => `<option>${esc(c)}</option>`).join(""); }

  function openModal(type, presetAccountId) {
    const modal = $("modal");
    modal.innerHTML = `<div class="modal-card"><div class="section-title"><h2>${modalTitle(type)}</h2><button class="icon-btn" data-close>×</button></div>${modalBody(type, presetAccountId)}</div>`;
    modal.classList.remove("hidden"); modal.setAttribute("aria-hidden", "false");
    modal.querySelector("[data-close]").onclick = closeModal;
    const form = modal.querySelector("form"); if (form) form.onsubmit = (e) => { e.preventDefault(); handleForm(type, new FormData(form)); };
  }
  function closeModal(){ const m=$("modal"); m.classList.add("hidden"); m.innerHTML=""; }
  function modalTitle(t){ return ({ account:"Add Account", fund:"Add Sinking Fund", card:"Add Credit Card", expense:"Add Expense", income:"Add Income", adjustment:"Balance Adjustment", transfer:"Transfer", payment:"Credit Card Payment", goal:"Add Goal", category:"Add Category" })[t] || "Add"; }
  function modalBody(type, presetAccountId) {
    if (type === "account") return form(`<div class="field"><label>Name</label><input name="name" required placeholder="SoFi Savings"></div><div class="field"><label>Type</label><select name="type"><option>checking</option><option>savings</option><option>cash</option><option>brokerage</option><option>crypto</option></select></div><div class="field"><label>Opening balance</label><input name="balance" type="number" step="0.01" value="0"></div>`);
    if (type === "fund") return form(`<div class="field"><label>Account</label><select name="accountId">${accountOptions()}</select></div><div class="field"><label>Fund name</label><input name="name" required placeholder="Car Maintenance"></div><div class="field"><label>Reserved amount</label><input name="amount" type="number" step="0.01" value="0"></div>`).replace(`value="${presetAccountId || ""}"`, "");
    if (type === "card") return form(`<div class="field"><label>Card name</label><input name="name" required placeholder="Citi Custom Cash"></div><div class="field"><label>Balance</label><input name="balance" type="number" step="0.01" value="0"></div><div class="field"><label>Limit</label><input name="limit" type="number" step="0.01" value="0"></div>`);
    if (type === "expense") return form(`<div class="field"><label>Pay from</label><select name="accountType"><option value="account">Bank account</option><option value="card">Credit card</option></select></div><div class="field"><label>Account/Card</label><select name="accountId">${accountOptions()}${cardOptions()}</select></div><div class="field"><label>Merchant</label><input name="merchant" required placeholder="Restaurant"></div><div class="field"><label>Category</label><select name="category">${categoryOptions()}</select></div><div class="field"><label>Amount</label><input name="amount" type="number" step="0.01" required></div>`);
    if (type === "income") return form(`<div class="field"><label>Deposit to</label><select name="accountId">${accountOptions()}</select></div><div class="field"><label>Source</label><input name="merchant" required placeholder="Paycheck"></div><div class="field"><label>Amount</label><input name="amount" type="number" step="0.01" required></div>`);
    if (type === "adjustment") return form(`<div class="field"><label>Account</label><select name="accountId">${accountOptions()}</select></div><div class="field"><label>New balance</label><input name="amount" type="number" step="0.01" required></div><div class="field"><label>Note</label><input name="merchant" placeholder="Reconcile balance"></div>`);
    if (type === "transfer") return form(`<div class="field"><label>From</label><select name="from">${accountOptions()}${fundOptions()}</select></div><div class="field"><label>To</label><select name="to">${accountOptions()}${fundOptions()}</select></div><div class="field"><label>Amount</label><input name="amount" type="number" step="0.01" required></div>`);
    if (type === "payment") return form(`<div class="field"><label>From</label><select name="from">${accountOptions()}${fundOptions()}</select></div><div class="field"><label>Credit card</label><select name="cardId">${cardOptions()}</select></div><div class="field"><label>Amount</label><input name="amount" type="number" step="0.01" required></div>`);
    if (type === "goal") return form(`<div class="field"><label>Goal name</label><input name="name" required placeholder="Emergency Fund"></div><div class="field"><label>Target</label><input name="target" type="number" step="0.01" required></div><div class="field"><label>Link to fund</label><select name="linkedFundId"><option value="">None</option>${fundOptions()}</select></div>`);
    if (type === "category") return form(`<div class="field"><label>Category name</label><input name="name" required placeholder="Pets"></div>`);
    return "";
  }
  function form(body){ return `<form class="form-grid">${body}<button class="btn gold" type="submit">Save</button></form>`; }

  function handleForm(type, fd) {
    const next = clone(); const amount = num(fd.get("amount"));
    if (type === "account") next.accounts.push({ id:id(), name:clean(fd.get("name")), type:fd.get("type"), balance:amount, funds:[] });
    if (type === "fund") next.accounts.find((a)=>a.id===fd.get("accountId"))?.funds.push({ id:id(), name:clean(fd.get("name")), amount });
    if (type === "card") next.cards.push({ id:id(), name:clean(fd.get("name")), balance:amount, limit:num(fd.get("limit")) });
    if (type === "expense") applyExpense(next, fd, amount);
    if (type === "income") applyIncome(next, fd, amount);
    if (type === "adjustment") applyAdjustment(next, fd, amount);
    if (type === "transfer") applyMove(next, fd.get("from"), fd.get("to"), amount, "transfer");
    if (type === "payment") { applyMove(next, fd.get("from"), null, amount, "card payment"); const card = next.cards.find((c)=>c.id===fd.get("cardId")); if(card) card.balance=num(card.balance)-amount; addTx(next,{type:"card payment",amount,merchant:"Credit card payment",category:"Transfer"}); }
    if (type === "goal") { const parts=String(fd.get("linkedFundId")||"").split(":"); next.goals.push({ id:id(), name:clean(fd.get("name")), target:amount, linkedAccountId:parts.length===1?parts[0]:"", linkedFundId:parts[1]||"" }); }
    if (type === "category") next.categories.push(clean(fd.get("name")));
    save(next); closeModal(); toast("Saved");
  }
  function addTx(next, tx){ next.transactions.unshift({ id:id(), date:today(), ...tx }); }
  function parseRef(next, ref){ if(!ref) return null; if(String(ref).includes(":")){ const [accountId,fundId]=String(ref).split(":"); const account=next.accounts.find(a=>a.id===accountId); const fund=account?.funds.find(f=>f.id===fundId); return {kind:"fund",account,fund}; } const account=next.accounts.find(a=>a.id===ref); if(account) return {kind:"account",account}; return null; }
  function addToRef(next, ref, amount){ const r=parseRef(next,ref); if(!r)return; if(r.kind==="account") r.account.balance=num(r.account.balance)+amount; if(r.kind==="fund") r.fund.amount=num(r.fund.amount)+amount; }
  function applyMove(next, from, to, amount, label){ addToRef(next, from, -amount); if(to) addToRef(next, to, amount); addTx(next,{type:label,amount,merchant:label,category:"Transfer"}); }
  function applyExpense(next, fd, amount){ const ref=fd.get("accountId"); const card=next.cards.find(c=>c.id===ref); if(card) card.balance=num(card.balance)+amount; else addToRef(next, ref, -amount); addTx(next,{type:"expense",amount:-amount,merchant:clean(fd.get("merchant")),category:fd.get("category")}); }
  function applyIncome(next, fd, amount){ addToRef(next, fd.get("accountId"), amount); addTx(next,{type:"income",amount,merchant:clean(fd.get("merchant")),category:"Income"}); }
  function applyAdjustment(next, fd, amount){ const a=next.accounts.find(x=>x.id===fd.get("accountId")); if(a){ const diff=amount-num(a.balance); a.balance=amount; addTx(next,{type:"adjustment",amount:diff,merchant:clean(fd.get("merchant"))||"Balance adjustment",category:"Adjustment"}); } }

  function renderOnboarding(){ const el=$("onboarding"); el.classList.remove("hidden"); el.innerHTML=`<div class="modal-card"><div class="eyebrow">First-time setup</div><h2>Welcome to My Wallet</h2><p class="help-text" style="margin:8px 0 16px">Let’s personalize your command center. You can change this later in Settings.</p><form id="setup-form" class="form-grid"><div class="field"><label>First name</label><input name="name" required placeholder="David"></div><button class="btn gold">Start My Wallet</button><button type="button" class="btn secondary" id="setup-skip">Skip for now</button></form></div>`; $("setup-form").onsubmit=(e)=>{e.preventDefault(); const next=clone(); next.settings.firstName=clean(new FormData(e.target).get("name")); next.setupComplete=true; save(next); el.classList.add("hidden");}; $("setup-skip").onclick=()=>{const next=clone(); next.setupComplete=true; save(next); el.classList.add("hidden");}; }
  function help(topic){ const copy={ dashboard:"Dashboard shows net worth, free cash, reserved sinking funds, and credit card coverage.", banking:"Banking is account-centric. Each account has a balance, sinking funds, and available cash after reserved funds.", cards:"Credit card balances increase with card expenses and decrease with card payments.", transactions:"Transactions are the trail. Use expenses, income, and adjustments instead of random balance edits.", transfers:"Transfers move money between accounts, funds, and credit cards without counting as spending.", goals:"Goals can link to sinking funds so progress updates automatically.", coverage:"Coverage compares your Transfer Fund against total credit card debt."}; const modal=$("modal"); modal.innerHTML=`<div class="modal-card"><div class="section-title"><h2>How this works</h2><button class="icon-btn" data-close>×</button></div><p class="help-text">${copy[topic]||copy.dashboard}</p></div>`; modal.classList.remove("hidden"); modal.querySelector("[data-close]").onclick=closeModal; }

  applyTheme(); render(); if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
})();
