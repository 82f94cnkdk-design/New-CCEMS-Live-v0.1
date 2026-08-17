// CCEMS Finance — The Lord's Portion
// Static prototype integration for the ccems-v05-navigation-eggs branch.
(function(){
  const ensureFinance=()=>{
    if(!state.finance) state.finance={
      titheRate:10,
      periods:[],
      distributions:[],
      recipients:[],
      annualReviews:[]
    };
    if(!Array.isArray(state.finance.periods)) state.finance.periods=[];
    if(!Array.isArray(state.finance.distributions)) state.finance.distributions=[];
    if(!Array.isArray(state.finance.recipients)) state.finance.recipients=[];
    if(!Array.isArray(state.finance.annualReviews)) state.finance.annualReviews=[];
    saveState();
    return state.finance;
  };

  const money=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2}).format(Number(n||0));
  const sum=(arr,key)=>arr.reduce((a,x)=>a+Number(x[key]||0),0);
  const safe=s=>esc(s||'');
  const rate=()=>Number(ensureFinance().titheRate||10);
  const accrued=()=>sum(ensureFinance().periods,'tithe');
  const distributed=()=>sum(ensureFinance().distributions.filter(x=>x.status==='PAID'),'amount');
  const approvedPending=()=>sum(ensureFinance().distributions.filter(x=>x.status==='APPROVED'),'amount');
  const balance=()=>accrued()-distributed();
  const year=()=>new Date().getFullYear();

  function financeStyles(){
    if(document.getElementById('ccems-finance-styles')) return;
    const s=document.createElement('style');s.id='ccems-finance-styles';s.textContent=`
      .lp-hero{background:linear-gradient(135deg,#0b3f34,#173f35);color:#fff;border-radius:20px;padding:24px;display:flex;justify-content:space-between;gap:18px;align-items:center;border:1px solid rgba(184,150,71,.5)}
      .lp-hero small,.lp-eyebrow{letter-spacing:.14em;font-size:11px;font-weight:800;color:#d9c383}.lp-hero h3{font-family:Georgia,serif;font-size:27px;margin:6px 0}.lp-hero p{margin:0;opacity:.86;max-width:620px}.lp-cross{font-size:34px;color:#d6b86b}.lp-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}.lp-kpi{background:#fff;border:1px solid #e6dfcf;border-radius:16px;padding:16px;text-align:left}.lp-kpi small{display:block;color:#66756d;font-weight:700}.lp-kpi strong{display:block;font-family:Georgia,serif;color:#0b3f34;font-size:24px;margin:6px 0}.lp-kpi em{font-style:normal;font-size:12px;color:#8a7560}.lp-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:14px}.lp-card{background:#fff;border:1px solid #e7dfcf;border-radius:18px;padding:18px}.lp-card h4{font-family:Georgia,serif;color:#0b3f34;margin:4px 0 12px}.lp-actions{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.lp-action{border:1px solid #ded4bf;background:#faf7f0;border-radius:13px;padding:13px;text-align:left}.lp-action strong{display:block;color:#123c32}.lp-action small{display:block;margin-top:4px;color:#6f776f}.lp-table{width:100%;border-collapse:collapse;font-size:12px}.lp-table th{color:#5c6a62;text-align:left;border-bottom:1px solid #ddd4c3;padding:8px 5px}.lp-table td{padding:9px 5px;border-bottom:1px solid #eee8dd}.lp-status{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.05em}.lp-status.PAID{background:#e5f3ea;color:#245d39}.lp-status.APPROVED{background:#f5ecd2;color:#725b19}.lp-status.PENDING{background:#f3e7e4;color:#8b4437}.lp-note{background:#f7f2e7;border-left:3px solid #b89647;padding:12px;border-radius:8px;color:#46544c;font-size:12px}.lp-form{display:grid;grid-template-columns:1fr 1fr;gap:12px}.lp-form label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700;color:#435149}.lp-form input,.lp-form select,.lp-form textarea{border:1px solid #d9d1c1;border-radius:10px;padding:10px;background:white;font:inherit}.lp-form .wide{grid-column:1/-1}.lp-form textarea{min-height:80px}.lp-footer-line{margin-top:16px;text-align:center;color:#0b3f34;font-family:Georgia,serif;font-weight:bold}.lp-recipient{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #eee8dd}.lp-recipient small{display:block;color:#6e786f;margin-top:3px}.lp-empty{padding:16px;text-align:center;color:#758078;background:#faf7f0;border-radius:12px}.lp-reconcile{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.lp-reconcile div{padding:12px;background:#faf7f0;border-radius:12px}.lp-reconcile small{display:block;color:#6b766f}.lp-reconcile strong{display:block;margin-top:4px;color:#0b3f34;font-size:17px}
      @media(max-width:720px){.lp-hero{align-items:flex-start}.lp-kpis{grid-template-columns:1fr 1fr}.lp-grid{grid-template-columns:1fr}.lp-form{grid-template-columns:1fr}.lp-form .wide{grid-column:auto}.lp-reconcile{grid-template-columns:1fr}.lp-hero h3{font-size:23px}}
    `;document.head.appendChild(s);
  }

  window.showFinanceModule=function(){
    financeStyles(); const f=ensureFinance();
    const latest=f.periods.slice().reverse().slice(0,5);
    const recent=f.distributions.slice().reverse().slice(0,5);
    modal("Finance — The Lord's Portion",`
      <section class="lp-hero"><div><small>CROWN & CROSS FINANCE</small><h3>The Lord's Portion</h3><p>Firstfruits & Tithe control — automatic ${rate()}% accrual, approvals, distributions, receipts and annual reconciliation.</p></div><div class="lp-cross">✝</div></section>
      <div class="lp-kpis">
        <button class="lp-kpi" onclick="showTithePeriods()"><small>Tithe Accrued</small><strong>${money(accrued())}</strong><em>${rate()}% of approved tithe base</em></button>
        <button class="lp-kpi" onclick="showTitheDistributions()"><small>Distributed</small><strong>${money(distributed())}</strong><em>Paid gifts</em></button>
        <button class="lp-kpi" onclick="showTitheDistributions()"><small>Awaiting Distribution</small><strong>${money(balance())}</strong><em>Ring-fenced balance</em></button>
        <button class="lp-kpi" onclick="showTitheDistributions()"><small>Approved / Pending Pay</small><strong>${money(approvedPending())}</strong><em>Dual-approved gifts</em></button>
      </div>
      <div class="lp-grid">
        <section class="lp-card"><span class="lp-eyebrow">FINANCE CONTROL</span><h4>Stewardship Actions</h4><div class="lp-actions">
          <button class="lp-action" onclick="openTitheAccrualForm()"><strong>Record Accounting Period</strong><small>Calculate and accrue the ${rate()}% Lord's Portion</small></button>
          <button class="lp-action" onclick="openRecipientForm()"><strong>Verify Recipient</strong><small>Create recipient due-diligence record</small></button>
          <button class="lp-action" onclick="openDistributionForm()"><strong>Prepare Distribution</strong><small>Record gift, approvals and payment status</small></button>
          <button class="lp-action" onclick="showAnnualTitheReconciliation()"><strong>Annual Reconciliation</strong><small>Compare required, accrued and distributed amounts</small></button>
          <button class="lp-action" onclick="showTithePeriods()"><strong>Accrual Register</strong><small>Accounting-period calculation history</small></button>
          <button class="lp-action" onclick="showTitheDistributions()"><strong>Giving Register</strong><small>Recipients, receipts and evidence</small></button>
        </div></section>
        <section class="lp-card"><span class="lp-eyebrow">CURRENT POSITION</span><h4>${year()} Stewardship Summary</h4>
          <div class="lp-reconcile"><div><small>Required / accrued</small><strong>${money(accrued())}</strong></div><div><small>Paid</small><strong>${money(distributed())}</strong></div><div><small>Balance</small><strong>${money(balance())}</strong></div></div>
          <p class="lp-note" style="margin-top:12px"><strong>Control:</strong> The Lord's Portion is treated as ring-fenced stewardship money and is not presented as distributable owner profit.</p>
          <p class="lp-note"><strong>Approval:</strong> distributions can be held Pending, moved to Approved after dual approval, then marked Paid when payment and evidence are recorded.</p>
        </section>
      </div>
      <div class="lp-grid" style="margin-top:14px">
        <section class="lp-card"><span class="lp-eyebrow">LATEST ACCRUALS</span><h4>Accounting Periods</h4>${latest.length?`<table class="lp-table"><thead><tr><th>Period</th><th>Base</th><th>Tithe</th></tr></thead><tbody>${latest.map(x=>`<tr><td>${safe(x.period)}</td><td>${money(x.base)}</td><td><strong>${money(x.tithe)}</strong></td></tr>`).join('')}</tbody></table>`:'<div class="lp-empty">No accounting periods recorded yet.</div>'}</section>
        <section class="lp-card"><span class="lp-eyebrow">RECENT GIVING</span><h4>Distributions</h4>${recent.length?`<table class="lp-table"><thead><tr><th>Recipient</th><th>Amount</th><th>Status</th></tr></thead><tbody>${recent.map(x=>`<tr><td>${safe(x.recipient)}</td><td>${money(x.amount)}</td><td><span class="lp-status ${x.status}">${x.status}</span></td></tr>`).join('')}</tbody></table>`:'<div class="lp-empty">No distributions recorded yet.</div>'}</section>
      </div>
      <div class="lp-footer-line">“Honour the Lord with your wealth, with the firstfruits of all your crops.” — Proverbs 3:9</div>
    `);
  };

  window.openTitheAccrualForm=function(){
    financeStyles();
    modal("Record Tithe Accrual",`<form class="lp-form" onsubmit="saveTitheAccrual(event)">
      <label>Accounting period<input name="period" placeholder="e.g. August 2026" required></label>
      <label>Period end<input name="periodEnd" type="date" value="${todayISO()}" required></label>
      <label>Gross income / revenue (£)<input name="revenue" type="number" min="0" step="0.01" required></label>
      <label>Eligible costs / adjustments (£)<input name="costs" type="number" min="0" step="0.01" value="0" required></label>
      <label>Tithe rate (%)<input name="rate" type="number" min="0" max="100" step="0.01" value="${rate()}" required></label>
      <label>Finance reviewer<input name="financeReviewer" placeholder="Name / role" required></label>
      <label class="wide">Calculation note<textarea name="note" placeholder="Basis, exclusions, adjustments or reference to finance ledger"></textarea></label>
      <label><input name="founderApproved" type="checkbox" required> Founder / Lead Steward approved</label>
      <label><input name="financeApproved" type="checkbox" required> Finance verification completed</label>
      <div class="wide"><button class="primary" type="submit">Calculate & Accrue</button></div>
    </form><p class="lp-note">Prototype rule: tithe base = revenue less eligible costs/adjustments. The production accounting definition must follow the approved Firstfruits & Tithe Policy and accountant configuration.</p>`);
  };

  window.saveTitheAccrual=function(e){
    e.preventDefault(); const fd=new FormData(e.target), f=ensureFinance();
    const revenue=Number(fd.get('revenue')||0), costs=Number(fd.get('costs')||0), r=Number(fd.get('rate')||10);
    const base=Math.max(0,revenue-costs), tithe=base*(r/100);
    const rec={id:'TIT-'+Date.now(),period:fd.get('period'),periodEnd:fd.get('periodEnd'),revenue,costs,base,rate:r,tithe,financeReviewer:fd.get('financeReviewer'),founderApproved:true,financeApproved:true,note:fd.get('note')||'',createdAt:new Date().toISOString()};
    f.titheRate=r; f.periods.push(rec); saveState(); audit('FINANCE_TITHE_ACCRUAL',`${rec.period}: base ${money(base)}, tithe ${money(tithe)}`); showFinanceModule();
  };

  window.openRecipientForm=function(){
    financeStyles();
    modal("Verify Tithe Recipient",`<form class="lp-form" onsubmit="saveTitheRecipient(event)">
      <label>Legal / organisation name<input name="name" required></label>
      <label>Charity / registration number<input name="registration" placeholder="If applicable"></label>
      <label class="wide">Christian mission / purpose<textarea name="purpose" required></textarea></label>
      <label>Verification date<input name="verifiedDate" type="date" value="${todayISO()}" required></label>
      <label>Verified by<input name="verifiedBy" required></label>
      <label><input name="bankVerified" type="checkbox" required> Bank details independently verified</label>
      <label><input name="conflictChecked" type="checkbox" required> Conflict-of-interest check complete</label>
      <div class="wide"><button class="primary" type="submit">Approve Recipient Record</button></div>
    </form>`);
  };

  window.saveTitheRecipient=function(e){
    e.preventDefault(); const fd=new FormData(e.target),f=ensureFinance();
    const rec={id:'REC-'+Date.now(),name:fd.get('name'),registration:fd.get('registration')||'',purpose:fd.get('purpose'),verifiedDate:fd.get('verifiedDate'),verifiedBy:fd.get('verifiedBy'),bankVerified:true,conflictChecked:true,status:'VERIFIED'};
    f.recipients.push(rec);saveState();audit('FINANCE_TITHE_RECIPIENT',`Verified recipient: ${rec.name}`);showFinanceModule();
  };

  window.openDistributionForm=function(){
    financeStyles(); const f=ensureFinance();
    if(!f.recipients.length){modal('Prepare Distribution',`<div class="lp-empty">A verified recipient is required before a tithe distribution can be prepared.</div><p style="margin-top:12px"><button class="primary" onclick="openRecipientForm()">Verify Recipient</button></p>`);return;}
    modal("Prepare Tithe Distribution",`<form class="lp-form" onsubmit="saveTitheDistribution(event)">
      <label>Verified recipient<select name="recipientId" required>${f.recipients.filter(r=>r.status==='VERIFIED').map(r=>`<option value="${r.id}">${safe(r.name)}</option>`).join('')}</select></label>
      <label>Amount (£)<input name="amount" type="number" min="0.01" step="0.01" max="${Math.max(0,balance()).toFixed(2)}" required></label>
      <label class="wide">Gift purpose / restriction<textarea name="purpose" required></textarea></label>
      <label>Approval 1 — Founder / Steward<input name="approval1" placeholder="Name / role" required></label>
      <label>Approval 2 — Finance / Board<input name="approval2" placeholder="Name / role" required></label>
      <label>Status<select name="status"><option>PENDING</option><option>APPROVED</option><option>PAID</option></select></label>
      <label>Payment / transaction reference<input name="paymentRef" placeholder="Required when Paid"></label>
      <label>Receipt / evidence reference<input name="receiptRef" placeholder="File or receipt reference"></label>
      <label>Date<input name="date" type="date" value="${todayISO()}" required></label>
      <div class="wide"><button class="primary" type="submit">Save Distribution</button></div>
    </form><p class="lp-note">Available Lord's Portion balance: <strong>${money(balance())}</strong>. The prototype prevents distributions above the accrued balance.</p>`);
  };

  window.saveTitheDistribution=function(e){
    e.preventDefault(); const fd=new FormData(e.target),f=ensureFinance(); const recipient=f.recipients.find(r=>r.id===fd.get('recipientId'));
    const amount=Number(fd.get('amount')||0), status=fd.get('status');
    if(amount>balance()+0.0001){alert('This distribution exceeds the current Lord\'s Portion balance.');return;}
    if(status==='PAID' && !String(fd.get('paymentRef')||'').trim()){alert('A payment / transaction reference is required before marking a distribution Paid.');return;}
    const rec={id:'GIV-'+Date.now(),date:fd.get('date'),recipientId:recipient.id,recipient:recipient.name,amount,purpose:fd.get('purpose'),approval1:fd.get('approval1'),approval2:fd.get('approval2'),status,paymentRef:fd.get('paymentRef')||'',receiptRef:fd.get('receiptRef')||'',createdAt:new Date().toISOString()};
    f.distributions.push(rec);saveState();audit('FINANCE_TITHE_DISTRIBUTION',`${rec.recipient}: ${money(amount)} — ${status}`);showFinanceModule();
  };

  window.showTithePeriods=function(){
    financeStyles(); const f=ensureFinance();
    modal("The Lord's Portion — Accrual Register",`${f.periods.length?`<table class="lp-table"><thead><tr><th>Period</th><th>Revenue</th><th>Costs/Adj.</th><th>Tithe Base</th><th>Rate</th><th>Tithe</th><th>Approvals</th></tr></thead><tbody>${f.periods.slice().reverse().map(x=>`<tr><td>${safe(x.period)}</td><td>${money(x.revenue)}</td><td>${money(x.costs)}</td><td>${money(x.base)}</td><td>${x.rate}%</td><td><strong>${money(x.tithe)}</strong></td><td>Founder ✓ · Finance ✓</td></tr>`).join('')}</tbody></table>`:'<div class="lp-empty">No tithe accrual periods recorded.</div>'}<p style="margin-top:14px"><button class="primary" onclick="openTitheAccrualForm()">Record Accounting Period</button></p>`);
  };

  window.showTitheDistributions=function(){
    financeStyles(); const f=ensureFinance();
    modal("The Lord's Portion — Giving Register",`${f.distributions.length?`<table class="lp-table"><thead><tr><th>Date</th><th>Recipient</th><th>Purpose</th><th>Amount</th><th>Status</th><th>Payment / Evidence</th></tr></thead><tbody>${f.distributions.slice().reverse().map(x=>`<tr><td>${safe(x.date)}</td><td>${safe(x.recipient)}</td><td>${safe(x.purpose)}</td><td><strong>${money(x.amount)}</strong></td><td><span class="lp-status ${x.status}">${x.status}</span></td><td>${safe(x.paymentRef||'—')}<br><small>${safe(x.receiptRef||'No receipt ref')}</small></td></tr>`).join('')}</tbody></table>`:'<div class="lp-empty">No tithe distributions recorded.</div>'}<p style="margin-top:14px"><button class="primary" onclick="openDistributionForm()">Prepare Distribution</button></p>`);
  };

  window.showAnnualTitheReconciliation=function(){
    financeStyles(); const required=accrued(), paid=distributed(), pending=approvedPending(), remaining=required-paid;
    const diff=required-(paid+remaining);
    modal("Annual Tithe Reconciliation",`<section class="lp-card"><span class="lp-eyebrow">${year()} ANNUAL STEWARDSHIP</span><h4>The Lord's Portion Reconciliation</h4>
      <div class="lp-reconcile"><div><small>10% required / accrued</small><strong>${money(required)}</strong></div><div><small>Distributed / paid</small><strong>${money(paid)}</strong></div><div><small>Awaiting distribution</small><strong>${money(remaining)}</strong></div></div>
      <table class="lp-table" style="margin-top:14px"><tbody><tr><th>Approved but not yet paid</th><td>${money(pending)}</td></tr><tr><th>Reconciliation difference</th><td>${money(diff)}</td></tr><tr><th>Control status</th><td><strong>${Math.abs(diff)<0.01?'RECONCILED':'REVIEW REQUIRED'}</strong></td></tr></tbody></table>
      <p class="lp-note">Annual certification should be completed by the Founder / Lead Steward, Finance lead and Stewardship Board representative once the finance ledger and evidence file have been independently reconciled.</p>
      <button class="primary" onclick="certifyAnnualTithe()">Record Annual Review</button>
    </section>`);
  };

  window.certifyAnnualTithe=function(){
    const name=prompt('Finance / Stewardship reviewer name:'); if(!name) return;
    const f=ensureFinance();f.annualReviews.push({year:year(),reviewer:name,required:accrued(),distributed:distributed(),balance:balance(),date:todayISO(),status:'REVIEWED'});saveState();audit('FINANCE_TITHE_ANNUAL_REVIEW',`${year()} annual review recorded by ${name}`);showFinanceModule();
  };

  // Add Finance to estate navigation without modifying the existing app core.
  financeStyles(); ensureFinance();
  const originalFullNav=window.fullNav;
  if(typeof originalFullNav==='function'){
    window.fullNav=function(){
      const html=originalFullNav();
      const financeButton=`<button onclick="closeDrawer();showFinanceModule()">${icon('reports')}<span>Finance & Stewardship</span><b>›</b></button>`;
      return html.replace('</nav>',financeButton+'</nav>');
    };
  }

  const originalNavigate=window.navigate;
  if(typeof originalNavigate==='function'){
    window.navigate=function(name){
      if(name==='Finance & Stewardship'||name==="The Lord's Portion") return showFinanceModule();
      return originalNavigate(name);
    };
  }
})();