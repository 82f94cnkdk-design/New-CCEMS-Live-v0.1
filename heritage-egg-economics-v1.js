(function(){
const STORE='ccems_product_costing_v1';
const ASSUMP='ccems_heritage_egg_assumptions_v1';
const money=v=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(v||0));
const safe=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const DEFAULT={
 hens:500,
 feedPricePerTonne:518,
 saleableYield:0.92,
 loadedLabourRate:18.75,
 husbandryHoursPerDay:3.5,
 vetWelfareAnnual:1500,
 houseCapital:150000,
 houseLifeYears:15,
 pastureAcres:20,
 pastureCostPerAcre:175,
 utilitiesAnnual:2500,
 litterAnnual:1500,
 cleaningAnnual:1000,
 enrichmentAnnual:800,
 transactionRate:0.015,
 breeds:[
  {name:'Cream Legbar',hens:80,eggsPerHen:210,feedG:125},
  {name:'Olive Egger',hens:95,eggsPerHen:250,feedG:125},
  {name:'Buff Orpington',hens:70,eggsPerHen:180,feedG:140},
  {name:'Light Sussex',hens:60,eggsPerHen:220,feedG:130},
  {name:'Welsummer',hens:75,eggsPerHen:190,feedG:125},
  {name:'Marans',hens:90,eggsPerHen:180,feedG:130},
  {name:'Speckled Sussex',hens:30,eggsPerHen:210,feedG:130}
 ]
};
const PACK={
 'CC-EG-EST-006':{eggs:6,packaging:.75,packMins:1.6,processing:.10,cold:.05,fulfilment:.15,overhead:.20},
 'CC-EG-SIG-012':{eggs:12,packaging:1.15,packMins:2.2,processing:.14,cold:.07,fulfilment:.20,overhead:.30},
 'CC-EG-RES-018':{eggs:18,packaging:1.55,packMins:2.8,processing:.18,cold:.09,fulfilment:.25,overhead:.40},
 'CC-EG-ROY-024':{eggs:24,packaging:2.40,packMins:4.0,processing:.25,cold:.12,fulfilment:.30,overhead:.55},
 'CC-EG-SPR-012':{eggs:12,packaging:1.75,packMins:3.0,processing:.16,cold:.07,fulfilment:.22,overhead:.35},
 'CC-EG-SUM-012':{eggs:12,packaging:1.75,packMins:3.0,processing:.16,cold:.07,fulfilment:.22,overhead:.35},
 'CC-EG-HAR-012':{eggs:12,packaging:1.85,packMins:3.1,processing:.16,cold:.07,fulfilment:.22,overhead:.35},
 'CC-EG-HRR-006':{eggs:6,packaging:1.10,packMins:2.0,processing:.11,cold:.05,fulfilment:.18,overhead:.25},
 'CC-EG-HRR-012':{eggs:12,packaging:1.90,packMins:3.2,processing:.16,cold:.07,fulfilment:.22,overhead:.35},
 'CC-EG-SUB-W12':{eggs:12,packaging:1.05,packMins:2.0,processing:.14,cold:.07,fulfilment:.65,overhead:.25},
 'CC-EG-SUB-F12':{eggs:12,packaging:1.05,packMins:2.0,processing:.14,cold:.07,fulfilment:.50,overhead:.25},
 'CC-EG-SUB-W24':{eggs:24,packaging:1.85,packMins:3.2,processing:.22,cold:.12,fulfilment:.85,overhead:.40},
 'CC-EG-GFT-012':{eggs:12,packaging:4.50,packMins:5.0,processing:.18,cold:.07,fulfilment:.35,overhead:.60},
 'CC-EG-TST-010':{eggs:10,packaging:3.00,packMins:5.5,processing:.20,cold:.06,fulfilment:.30,overhead:.55},
 'CC-EG-CHR-024':{eggs:24,packaging:3.25,packMins:5.0,processing:.28,cold:.12,fulfilment:.35,overhead:.65}
};
function loadA(){try{return {...DEFAULT,...JSON.parse(localStorage.getItem(ASSUMP)||'{}')}}catch(e){return structuredClone(DEFAULT)}}
function saveA(a){localStorage.setItem(ASSUMP,JSON.stringify(a))}
function loadCost(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch(e){return{}}}
function saveCost(v){localStorage.setItem(STORE,JSON.stringify(v))}
function catalogue(){return (window.CC_PRODUCT_CATALOGUE||[]).filter(p=>p.category==='Heritage Eggs')}
function economics(a=loadA()){
 const grossEggs=a.breeds.reduce((s,b)=>s+Number(b.hens)*Number(b.eggsPerHen),0);
 const weightedFeedG=a.breeds.reduce((s,b)=>s+Number(b.hens)*Number(b.feedG),0)/Number(a.hens||1);
 const feedTonnes=Number(a.hens)*weightedFeedG*365/1000000;
 const feedAnnual=feedTonnes*Number(a.feedPricePerTonne);
 const labourAnnual=Number(a.husbandryHoursPerDay)*365*Number(a.loadedLabourRate);
 const depreciationAnnual=Number(a.houseCapital)/Number(a.houseLifeYears||1);
 const pastureAnnual=Number(a.pastureAcres)*Number(a.pastureCostPerAcre);
 const otherAnnual=Number(a.vetWelfareAnnual)+Number(a.utilitiesAnnual)+Number(a.litterAnnual)+Number(a.cleaningAnnual)+Number(a.enrichmentAnnual);
 const saleableEggs=grossEggs*Number(a.saleableYield);
 const baseAnnual=feedAnnual+labourAnnual+depreciationAnnual+pastureAnnual+otherAnnual;
 const eggCost=baseAnnual/Math.max(1,saleableEggs);
 return {grossEggs,weightedFeedG,feedTonnes,feedAnnual,labourAnnual,depreciationAnnual,pastureAnnual,otherAnnual,saleableEggs,baseAnnual,eggCost};
}
function skuCost(p,a=loadA()){
 const e=economics(a),pk=PACK[p.sku]||{eggs:12,packaging:1.2,packMins:2,processing:.15,cold:.07,fulfilment:.2,overhead:.3};
 const eggs=pk.eggs, farm=e.eggCost*eggs;
 const packLabour=(pk.packMins/60)*Number(a.loadedLabourRate);
 const transaction=Number(p.retailPrice||0)*Number(a.transactionRate);
 const standard={farmProduction:farm,ingredients:0,labour:packLabour,packaging:pk.packaging,processing:pk.processing,utilities:0,coldChain:pk.cold,fulfilment:pk.fulfilment,wastage:0,transactionFees:transaction,overhead:pk.overhead};
 const total=Object.values(standard).reduce((s,v)=>s+Number(v||0),0);
 const profit=Number(p.retailPrice||0)-total,margin=Number(p.retailPrice||0)?profit/Number(p.retailPrice):0;
 return {standard,total,profit,margin,eggs,pk};
}
function seed(){const all=loadCost(),a=loadA();catalogue().forEach(p=>{const c=skuCost(p,a);const prev=all[p.sku]||{};all[p.sku]={...prev,sku:p.sku,standard:c.standard,actual:prev.actual||{farmProduction:0,ingredients:0,labour:0,packaging:0,processing:0,utilities:0,coldChain:0,fulfilment:0,wastage:0,transactionFees:0,overhead:0},monthlyUnits:prev.monthlyUnits||0,annualUnits:prev.annualUnits||0,fixedMonthlyCosts:prev.fixedMonthlyCosts||0,lastReviewed:prev.lastReviewed||'',reviewedBy:prev.reviewedBy||'',status:'STANDARD COSTED — C&C MODEL'};});saveCost(all)}
function style(){if(document.getElementById('cc-hecon-style'))return;const st=document.createElement('style');st.id='cc-hecon-style';st.textContent=`.hec-hero{background:linear-gradient(135deg,#0b3f34,#173d2d);color:#fff;border:1px solid #b08a3c;border-radius:18px;padding:22px;margin-bottom:14px}.hec-hero small{color:#e7d5a6;letter-spacing:.12em}.hec-hero h3{margin:5px 0}.hec-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin:12px 0}.hec-card{background:#fff;border:1px solid #ddd2b5;border-radius:14px;padding:12px}.hec-card small{display:block;color:#65736d}.hec-card strong{display:block;color:#173d2d;font-size:20px;margin-top:4px}.hec-wrap{overflow:auto;border:1px solid #ddd2b5;border-radius:14px;background:#fff}.hec-table{width:100%;border-collapse:collapse;min-width:1050px}.hec-table th{background:#173d2d;color:#fff;padding:9px;text-align:left;font-size:11px}.hec-table td{padding:9px;border-bottom:1px solid #eee8d8;font-size:12px}.hec-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.hec-panel{background:#fff;border:1px solid #ddd2b5;border-radius:14px;padding:14px}.hec-row{display:grid;grid-template-columns:1.4fr .7fr .7fr .7fr;gap:7px;align-items:center;margin:7px 0}.hec-row input{width:100%;padding:7px;border:1px solid #d2c59f;border-radius:8px}.hec-bad{color:#9b2d24!important}.hec-good{color:#173d2d!important}.hec-note{background:#f7f2e6;border-left:4px solid #b08a3c;padding:12px;border-radius:8px;margin-top:12px}.hec-btn{border:1px solid #b08a3c;background:#173d2d;color:#fff;border-radius:10px;padding:9px 12px;font-weight:700;margin-right:6px}@media(max-width:760px){.hec-kpis{grid-template-columns:repeat(2,1fr)}.hec-grid{grid-template-columns:1fr}.hec-row{grid-template-columns:1fr 1fr}}`;document.head.appendChild(st)}
window.showHeritageEggEconomics=function(){style();const a=loadA(),e=economics(a),products=catalogue().map(p=>({p,c:skuCost(p,a)}));modal('Heritage Egg Standard Cost Model',`<section class="hec-hero"><small>CROWN & CROSS • 500-HEN HERITAGE EGG VILLAGE</small><h3>Estate-Specific Egg Economics</h3><p>Breed-weighted production, organic feed, Crown & Cross labour, welfare, five-house depreciation, pasture and pack-specific costs.</p></section><div class="hec-kpis"><div class="hec-card"><small>Hens</small><strong>${a.hens}</strong></div><div class="hec-card"><small>Gross eggs / year</small><strong>${Math.round(e.grossEggs).toLocaleString('en-GB')}</strong></div><div class="hec-card"><small>Saleable eggs / year</small><strong>${Math.round(e.saleableEggs).toLocaleString('en-GB')}</strong></div><div class="hec-card"><small>Base true cost / egg</small><strong>${money(e.eggCost)}</strong></div><div class="hec-card"><small>Feed tonnes / year</small><strong>${e.feedTonnes.toFixed(1)} t</strong></div></div><div class="hec-grid"><div class="hec-panel"><h4>Flock assumptions by breed</h4><div class="hec-row"><small>Breed</small><small>Hens</small><small>Eggs / hen / yr</small><small>Feed g / day</small></div>${a.breeds.map((b,i)=>`<div class="hec-row"><strong>${safe(b.name)}</strong><input id="bh${i}" type="number" value="${b.hens}"><input id="be${i}" type="number" value="${b.eggsPerHen}"><input id="bf${i}" type="number" value="${b.feedG}"></div>`).join('')}</div><div class="hec-panel"><h4>Estate operating assumptions</h4>${[['feedPricePerTonne','Organic feed £ / tonne'],['saleableYield','Saleable yield (decimal)'],['loadedLabourRate','Loaded labour £ / hour'],['husbandryHoursPerDay','Dedicated husbandry hours / day'],['vetWelfareAnnual','Vet & welfare £ / year'],['houseCapital','Five houses capital £'],['houseLifeYears','House life / years'],['pastureAcres','Pasture acres'],['pastureCostPerAcre','Pasture £ / acre / year'],['utilitiesAnnual','Utilities £ / year'],['litterAnnual','Litter £ / year'],['cleaningAnnual','Cleaning £ / year'],['enrichmentAnnual','Enrichment £ / year'],['transactionRate','Weighted transaction rate']].map(([k,l])=>`<label style="display:block;margin:7px 0"><small>${l}</small><input id="ha_${k}" type="number" step="0.01" value="${a[k]}" style="width:100%;padding:8px;border:1px solid #d2c59f;border-radius:8px"></label>`).join('')}</div></div><div class="hec-note"><b>Annual base cost:</b> Feed ${money(e.feedAnnual)} • Husbandry labour ${money(e.labourAnnual)} • Five-house depreciation ${money(e.depreciationAnnual)} • Pasture ${money(e.pastureAnnual)} • Welfare/utilities/litter/cleaning/enrichment ${money(e.otherAnnual)}. Wastage/seconds are captured through the ${Math.round((1-a.saleableYield)*100)}% non-saleable yield assumption.</div><div style="margin:12px 0"><button class="hec-btn" onclick="saveHeritageEggAssumptions()">Save & Recalculate</button><button class="hec-btn" onclick="showProductCosting()">Open Full Costing Engine</button></div><div class="hec-wrap"><table class="hec-table"><thead><tr><th>Product</th><th>Retail</th><th>Eggs</th><th>Base Egg Cost</th><th>Pack & Handling</th><th>Total Standard Cost</th><th>Profit / Pack</th><th>Margin</th><th>Target</th></tr></thead><tbody>${products.map(({p,c})=>{const pack=c.total-(e.eggCost*c.eggs);const alert=c.margin<Number(p.targetGrossMargin||0);return `<tr><td><strong>${safe(p.product)}</strong><br><small>${safe(p.sku)}</small></td><td>${money(p.retailPrice)}</td><td>${c.eggs}</td><td>${money(e.eggCost*c.eggs)}</td><td>${money(pack)}</td><td><strong>${money(c.total)}</strong></td><td>${money(c.profit)}</td><td><strong class="${alert?'hec-bad':'hec-good'}">${(c.margin*100).toFixed(1)}%</strong></td><td>${(Number(p.targetGrossMargin||0)*100).toFixed(0)}%</td></tr>`}).join('')}</tbody></table></div><div class="hec-note"><b>Planning status:</b> These are Crown & Cross-specific management assumptions, not audited actuals. Feed price is a live benchmark input; breed production rates, labour hours, depreciation life, pasture allocation and packaging costs should be replaced by estate actuals as contracts and operating data become available.</div>`)};
window.saveHeritageEggAssumptions=function(){const a=loadA();a.breeds.forEach((b,i)=>{b.hens=Number(document.getElementById('bh'+i)?.value||b.hens);b.eggsPerHen=Number(document.getElementById('be'+i)?.value||b.eggsPerHen);b.feedG=Number(document.getElementById('bf'+i)?.value||b.feedG)});['feedPricePerTonne','saleableYield','loadedLabourRate','husbandryHoursPerDay','vetWelfareAnnual','houseCapital','houseLifeYears','pastureAcres','pastureCostPerAcre','utilitiesAnnual','litterAnnual','cleaningAnnual','enrichmentAnnual','transactionRate'].forEach(k=>a[k]=Number(document.getElementById('ha_'+k)?.value||0));a.hens=a.breeds.reduce((s,b)=>s+Number(b.hens),0);saveA(a);seed();try{if(typeof audit==='function')audit('HERITAGE_EGG_COST_MODEL_UPDATED',`500-hen economics recalculated; base egg cost ${money(economics(a).eggCost)}`)}catch(e){}showHeritageEggEconomics()};
window.resetHeritageEggEconomics=function(){saveA(structuredClone(DEFAULT));seed();showHeritageEggEconomics()};
seed();style();
if(typeof window.fullNav==='function'&&!window.__heconNavWrapped){const old=window.fullNav;window.fullNav=function(){const html=old();const item=`<button onclick="closeDrawer();showHeritageEggEconomics()">${typeof icon==='function'?icon('egg'):''}<span>Heritage Egg Economics</span><b>›</b></button>`;return html.replace('</nav>',item+'</nav>')};window.__heconNavWrapped=true}
})();