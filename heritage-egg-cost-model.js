(function(){
const STORE='ccems_product_costing_v1';
const ASSUMPTION_STORE='ccems_heritage_egg_operating_assumptions_v2';
const CAT='Heritage Eggs';
const COMPONENTS=['farmProduction','ingredients','labour','packaging','processing','utilities','coldChain','fulfilment','wastage','transactionFees','overhead'];
const money=v=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(v||0));
const pct=v=>`${(Number(v||0)*100).toFixed(1)}%`;
const safe=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const catalogue=()=> (window.CC_PRODUCT_CATALOGUE||[]).filter(p=>p.category===CAT);
function load(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch(e){return{}}}
function save(v){localStorage.setItem(STORE,JSON.stringify(v));}
const DEFAULTS={
  hens:500,feedPricePerTonne:518,husbandryHoursPerDay:3.5,loadedLabourRate:18.75,
  vetWelfareAnnual:1500,houseAssetValue:150000,houseLifeYears:15,pastureAcres:20,pastureCostPerAcre:175,
  utilitiesAnnual:1800,litterCleaningEnrichmentAnnual:2200,maintenanceInsuranceAnnual:3800,nonSaleableRate:0.08,
  breeds:{
    'Cream Legbar':{hens:80,eggsPerHen:240,feedGramsDay:122},
    'Olive Egger':{hens:95,eggsPerHen:225,feedGramsDay:126},
    'Buff Orpington':{hens:70,eggsPerHen:185,feedGramsDay:136},
    'Light Sussex':{hens:60,eggsPerHen:215,feedGramsDay:130},
    'Welsummer':{hens:75,eggsPerHen:205,feedGramsDay:128},
    'Marans':{hens:90,eggsPerHen:185,feedGramsDay:132},
    'Speckled Sussex':{hens:30,eggsPerHen:195,feedGramsDay:130}
  }
};
function assumptions(){try{return Object.assign({},DEFAULTS,JSON.parse(localStorage.getItem(ASSUMPTION_STORE)||'{}'))}catch(e){return DEFAULTS}}
function saveAssumptions(a){localStorage.setItem(ASSUMPTION_STORE,JSON.stringify(a));}
function packEggs(p){const m=String(p.size||'').match(/(\d+)\s*eggs?/i);return m?Number(m[1]):12;}
function economics(a=assumptions()){
  const breeds=a.breeds||DEFAULTS.breeds;
  const grossEggs=Object.values(breeds).reduce((n,b)=>n+Number(b.hens||0)*Number(b.eggsPerHen||0),0);
  const saleableEggs=grossEggs*(1-Number(a.nonSaleableRate||0));
  const annualFeedKg=Object.values(breeds).reduce((n,b)=>n+(Number(b.hens||0)*Number(b.feedGramsDay||0)*365/1000),0);
  const feed=annualFeedKg*(Number(a.feedPricePerTonne||0)/1000);
  const labour=Number(a.husbandryHoursPerDay||0)*365*Number(a.loadedLabourRate||0);
  const depreciation=Number(a.houseLifeYears||0)>0?Number(a.houseAssetValue||0)/Number(a.houseLifeYears):0;
  const pasture=Number(a.pastureAcres||0)*Number(a.pastureCostPerAcre||0);
  const baseAnnual=feed+labour+Number(a.vetWelfareAnnual||0)+depreciation+pasture+Number(a.utilitiesAnnual||0)+Number(a.litterCleaningEnrichmentAnnual||0)+Number(a.maintenanceInsuranceAnnual||0);
  const costPerSaleableEgg=saleableEggs>0?baseAnnual/saleableEggs:0;
  const avgFeedGrams=Object.values(breeds).reduce((n,b)=>n+Number(b.hens||0)*Number(b.feedGramsDay||0),0)/Math.max(1,Object.values(breeds).reduce((n,b)=>n+Number(b.hens||0),0));
  return {grossEggs,saleableEggs,annualFeedKg,feed,labour,depreciation,pasture,baseAnnual,costPerSaleableEgg,avgFeedGrams};
}
const PACK_PROFILES={
  'CC-EG-EST-006':{packaging:.48,processing:.12,coldChain:.05,fulfilment:.18,transactionFees:.12,overhead:.35},
  'CC-EG-SIG-012':{packaging:.66,processing:.20,coldChain:.08,fulfilment:.30,transactionFees:.22,overhead:.59},
  'CC-EG-RES-018':{packaging:.88,processing:.28,coldChain:.10,fulfilment:.38,transactionFees:.38,overhead:.95},
  'CC-EG-ROY-024':{packaging:2.25,processing:.40,coldChain:.16,fulfilment:.52,transactionFees:.70,overhead:1.64},
  'CC-EG-SPR-012':{packaging:1.20,processing:.22,coldChain:.08,fulfilment:.35,transactionFees:.30,overhead:.74},
  'CC-EG-SUM-012':{packaging:1.20,processing:.22,coldChain:.08,fulfilment:.35,transactionFees:.32,overhead:.72},
  'CC-EG-HAR-012':{packaging:1.28,processing:.24,coldChain:.08,fulfilment:.36,transactionFees:.34,overhead:.73},
  'CC-EG-HRR-006':{packaging:1.05,processing:.15,coldChain:.05,fulfilment:.24,transactionFees:.18,overhead:.46},
  'CC-EG-HRR-012':{packaging:1.42,processing:.24,coldChain:.08,fulfilment:.38,transactionFees:.32,overhead:.77},
  'CC-EG-SUB-W12':{packaging:.62,processing:.20,coldChain:.08,fulfilment:1.15,transactionFees:.24,overhead:.78},
  'CC-EG-SUB-F12':{packaging:.62,processing:.20,coldChain:.08,fulfilment:1.15,transactionFees:.24,overhead:.78},
  'CC-EG-SUB-W24':{packaging:1.05,processing:.34,coldChain:.14,fulfilment:1.55,transactionFees:.48,overhead:1.33},
  'CC-EG-GFT-012':{packaging:3.35,processing:.30,coldChain:.08,fulfilment:.70,transactionFees:.50,overhead:1.95},
  'CC-EG-TST-010':{packaging:2.30,processing:.34,coldChain:.07,fulfilment:.58,transactionFees:.40,overhead:1.63},
  'CC-EG-CHR-024':{packaging:2.45,processing:.42,coldChain:.16,fulfilment:.58,transactionFees:.60,overhead:1.91}
};
function marginClass(p){if(/GFT|TST|ROY/.test(p.sku))return {name:'Prestige / Gift',min:.48,max:.55};if(/SPR|SUM|HAR|CHR|RES|HRR/.test(p.sku))return {name:'Seasonal / Reserve',min:.40,max:.48};return {name:'Core / Accessibility',min:.28,max:.35};}
function standardFor(p,a=assumptions()){
  const e=economics(a), eggs=packEggs(p), prof=PACK_PROFILES[p.sku]||PACK_PROFILES['CC-EG-SIG-012'];
  const eggBase=e.costPerSaleableEgg*eggs;
  const farmShare=e.baseAnnual?eggBase*(e.feed+Number(a.vetWelfareAnnual||0)+e.depreciation+e.pasture+Number(a.maintenanceInsuranceAnnual||0))/e.baseAnnual:0;
  const labourShare=e.baseAnnual?eggBase*e.labour/e.baseAnnual:0;
  const utilityShare=e.baseAnnual?eggBase*(Number(a.utilitiesAnnual||0)+Number(a.litterCleaningEnrichmentAnnual||0))/e.baseAnnual:0;
  return {
    farmProduction:Number(farmShare.toFixed(2)),ingredients:0,labour:Number(labourShare.toFixed(2)),packaging:Number(prof.packaging||0),processing:Number(prof.processing||0),utilities:Number(utilityShare.toFixed(2)),coldChain:Number(prof.coldChain||0),fulfilment:Number(prof.fulfilment||0),wastage:0,transactionFees:Number(prof.transactionFees||0),overhead:Number(prof.overhead||0)
  };
}
function sum(o){return COMPONENTS.reduce((a,k)=>a+Number(o?.[k]||0),0)}
function seed(force=false){const all=load();let seeded=0;catalogue().forEach(p=>{const existing=all[p.sku];if(existing&&sum(existing.actual)>0&&!force)return;const standard=standardFor(p);all[p.sku]={sku:p.sku,standard,actual:existing?.actual||Object.fromEntries(COMPONENTS.map(k=>[k,0])),monthlyUnits:existing?.monthlyUnits||0,annualUnits:existing?.annualUnits||0,fixedMonthlyCosts:existing?.fixedMonthlyCosts||0,lastReviewed:new Date().toISOString(),reviewedBy:'CCEMS 500-Hen Heritage Egg Village Model',status:'STANDARD COST SET',costBasis:'500-hen estate operating model: breed laying rate + feed + husbandry labour + welfare + house depreciation + pasture + utilities + pack-specific presentation/fulfilment costs.'};seeded++});save(all);return seeded;}
function metrics(){const all=load();return catalogue().map(p=>{const r=all[p.sku]||{};const cost=sum(r.standard),profit=Number(p.retailPrice||0)-cost,margin=p.retailPrice?profit/Number(p.retailPrice):0,mc=marginClass(p);const status=margin>=mc.min?'COMFORTABLE':margin>=Math.max(0,mc.min-.08)?'MARGINAL':'REVIEW';return{p,r,cost,profit,margin,mc,status}})}
function style(){if(document.getElementById('cc-he-cost-style'))return;const st=document.createElement('style');st.id='cc-he-cost-style';st.textContent=`.hec-hero{background:linear-gradient(135deg,#0b3f34,#173d2d);color:#fff;border:1px solid #b08a3c;border-radius:18px;padding:22px;margin-bottom:14px}.hec-hero small{color:#ead8a9;letter-spacing:.12em}.hec-hero h3{margin:5px 0;font-size:25px}.hec-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:12px 0}.hec-kpi{background:#fff;border:1px solid #ddd2b5;border-radius:14px;padding:13px}.hec-kpi small{display:block;color:#65736d}.hec-kpi strong{display:block;color:#173d2d;font-size:22px;margin-top:4px}.hec-wrap{overflow:auto;border:1px solid #ddd2b5;border-radius:14px;background:#fff}.hec-table{width:100%;border-collapse:collapse;min-width:1100px}.hec-table th{background:#173d2d;color:#fff;text-align:left;padding:9px;font-size:11px}.hec-table td{padding:9px;border-bottom:1px solid #eee8d8;font-size:12px}.hec-note{background:#f7f2e6;border-left:4px solid #b08a3c;padding:12px;border-radius:8px;margin-top:12px}.hec-btn{border:1px solid #b08a3c;background:#173d2d;color:#fff;border-radius:10px;padding:9px 12px;font-weight:700;margin-right:7px}.hec-good{color:#173d2d;font-weight:700}.hec-mid{color:#8a6500;font-weight:700}.hec-warn{color:#9b2d24;font-weight:700}.hec-assumptions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.hec-assumptions label{font-size:11px;color:#53645e}.hec-assumptions input{width:100%;box-sizing:border-box;border:1px solid #cdbf9d;border-radius:8px;padding:8px;margin-top:3px}@media(max-width:760px){.hec-kpis{grid-template-columns:repeat(2,1fr)}.hec-assumptions{grid-template-columns:1fr}}`;document.head.appendChild(st)}
window.seedHeritageEggStandardCosts=function(force=false){const n=seed(force);try{if(typeof audit==='function')audit('HERITAGE_EGG_500_HEN_COST_MODEL',`${n} SKU(s) recalculated; force=${force}`)}catch(e){}return n};
window.showHeritageEggAssumptions=function(){style();const a=assumptions(),e=economics(a);modal('Heritage Egg Village — Operating Assumptions',`<section class="hec-hero"><small>CROWN & CROSS • 500-HEN MODEL</small><h3>Operating Assumptions</h3><p>Edit the estate planning assumptions. Saving recalculates every Heritage Egg SKU while preserving ACTUAL-cost entries.</p></section><div class="hec-assumptions"><label>Feed £ / tonne<input id="hea_feed" type="number" step="1" value="${a.feedPricePerTonne}"></label><label>Husbandry hours / day<input id="hea_hours" type="number" step="0.1" value="${a.husbandryHoursPerDay}"></label><label>Loaded labour £ / hour<input id="hea_rate" type="number" step="0.01" value="${a.loadedLabourRate}"></label><label>Vet & welfare £ / year<input id="hea_vet" type="number" step="1" value="${a.vetWelfareAnnual}"></label><label>House asset value £<input id="hea_asset" type="number" step="1000" value="${a.houseAssetValue}"></label><label>House life years<input id="hea_life" type="number" step="1" value="${a.houseLifeYears}"></label><label>Pasture acres<input id="hea_acres" type="number" step="1" value="${a.pastureAcres}"></label><label>Pasture £ / acre / year<input id="hea_pasture" type="number" step="1" value="${a.pastureCostPerAcre}"></label><label>Non-saleable %<input id="hea_loss" type="number" step="0.1" value="${(a.nonSaleableRate*100).toFixed(1)}"></label><label>Utilities £ / year<input id="hea_util" type="number" step="100" value="${a.utilitiesAnnual}"></label><label>Litter/cleaning/enrichment £ / year<input id="hea_litter" type="number" step="100" value="${a.litterCleaningEnrichmentAnnual}"></label><label>Maintenance & insurance £ / year<input id="hea_maint" type="number" step="100" value="${a.maintenanceInsuranceAnnual}"></label></div><div class="hec-note">Current model output: ${Math.round(e.saleableEggs).toLocaleString('en-GB')} saleable eggs/year • ${e.avgFeedGrams.toFixed(1)}g feed/hen/day • ${money(e.baseAnnual)} base annual village cost • ${money(e.costPerSaleableEgg)} base cost per saleable egg.</div><button class="hec-btn" onclick="saveHeritageEggAssumptions()">Save & Recalculate</button>`)};
window.saveHeritageEggAssumptions=function(){const a=assumptions();a.feedPricePerTonne=Number(document.getElementById('hea_feed')?.value||0);a.husbandryHoursPerDay=Number(document.getElementById('hea_hours')?.value||0);a.loadedLabourRate=Number(document.getElementById('hea_rate')?.value||0);a.vetWelfareAnnual=Number(document.getElementById('hea_vet')?.value||0);a.houseAssetValue=Number(document.getElementById('hea_asset')?.value||0);a.houseLifeYears=Number(document.getElementById('hea_life')?.value||1);a.pastureAcres=Number(document.getElementById('hea_acres')?.value||0);a.pastureCostPerAcre=Number(document.getElementById('hea_pasture')?.value||0);a.nonSaleableRate=Number(document.getElementById('hea_loss')?.value||0)/100;a.utilitiesAnnual=Number(document.getElementById('hea_util')?.value||0);a.litterCleaningEnrichmentAnnual=Number(document.getElementById('hea_litter')?.value||0);a.maintenanceInsuranceAnnual=Number(document.getElementById('hea_maint')?.value||0);saveAssumptions(a);seed(true);showHeritageEggCostModel();};
window.showHeritageEggCostModel=function(){style();seed(false);const a=assumptions(),e=economics(a),m=metrics(),comfortable=m.filter(x=>x.status==='COMFORTABLE').length,marginal=m.filter(x=>x.status==='MARGINAL').length,review=m.filter(x=>x.status==='REVIEW').length;modal('Heritage Egg Standard Cost Model',`<section class="hec-hero"><small>CCEMS FINANCE • HERITAGE EGGS</small><h3>500-Hen Heritage Egg Village Cost Model v2.0</h3><p>Estate-specific unit economics derived from flock production, feed, labour, welfare, houses, pasture and pack-specific presentation costs.</p></section><div class="hec-kpis"><div class="hec-kpi"><small>Saleable eggs / year</small><strong>${Math.round(e.saleableEggs).toLocaleString('en-GB')}</strong></div><div class="hec-kpi"><small>Cost / saleable egg</small><strong>${money(e.costPerSaleableEgg)}</strong></div><div class="hec-kpi"><small>Comfortable SKUs</small><strong>${comfortable}</strong></div><div class="hec-kpi"><small>Marginal SKUs</small><strong>${marginal}</strong></div><div class="hec-kpi"><small>Review SKUs</small><strong class="${review?'hec-warn':''}">${review}</strong></div></div><button class="hec-btn" onclick="showHeritageEggAssumptions()">Operating Assumptions</button><button class="hec-btn" onclick="showProductCosting()">Full Costing Engine</button><button class="hec-btn" onclick="seedHeritageEggStandardCosts(true);showHeritageEggCostModel()">Recalculate Standards</button><div class="hec-wrap" style="margin-top:12px"><table class="hec-table"><thead><tr><th>SKU</th><th>Product</th><th>Retail</th><th>True Standard Cost</th><th>Profit / Box</th><th>Margin</th><th>Margin Class</th><th>Target Band</th><th>Assessment</th></tr></thead><tbody>${m.map(x=>`<tr onclick="showProductCostDetail('${safe(x.p.sku)}')"><td><strong>${safe(x.p.sku)}</strong></td><td><strong>${safe(x.p.product)}</strong><br><small>${safe(x.p.size)}</small></td><td>${money(x.p.retailPrice)}</td><td>${money(x.cost)}</td><td><strong>${money(x.profit)}</strong></td><td>${pct(x.margin)}</td><td>${x.mc.name}</td><td>${pct(x.mc.min)}–${pct(x.mc.max)}</td><td class="${x.status==='COMFORTABLE'?'hec-good':x.status==='MARGINAL'?'hec-mid':'hec-warn'}">${x.status}</td></tr>`).join('')}</tbody></table></div><div class="hec-note"><b>Model basis:</b> ${a.hens} hens across five Heritage Egg houses; breed-specific annual laying and feed assumptions; ${(a.nonSaleableRate*100).toFixed(1)}% non-saleable allowance; ${money(a.feedPricePerTonne)}/tonne feed; ${a.husbandryHoursPerDay} husbandry hours/day at ${money(a.loadedLabourRate)}/hour; welfare, house depreciation, pasture, utilities, litter/cleaning/enrichment and maintenance/insurance. Pack-specific costs are fixed £ assumptions, not percentages of selling price.</div><div class="hec-note"><b>Margin governance:</b> Core / Accessibility 28–35%; Seasonal / Reserve 40–48%; Prestige / Gift 48–55%. Price changes remain Founder / Lead Steward controlled; this screen flags economics but does not automatically alter an approved customer price.</div>`)};
style();seed(true);
if(typeof window.fullNav==='function'&&!window.__hecNavWrapped){const old=window.fullNav;window.fullNav=function(){const html=old();const item=`<button onclick="closeDrawer();showHeritageEggCostModel()">${typeof icon==='function'?icon('egg'):''}<span>Heritage Egg Cost Model</span><b>›</b></button>`;return html.replace('</nav>',item+'</nav>')};window.__hecNavWrapped=true}
})();