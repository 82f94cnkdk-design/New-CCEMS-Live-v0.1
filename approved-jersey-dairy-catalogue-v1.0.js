(function(){
const TARGETS={Core:0.30,'Value Added':0.40,'Matured Cheese':0.45,Prestige:0.50};
const effectiveDate='2026-08-18';
const rows=[
['CC-DA-MILK-001','Estate Jersey Whole Milk','1 litre',3.95,'Core'],
['CC-DA-CRM-075','Morning Cream Top','750 ml',4.50,'Core'],
['CC-DA-CRM-100','Morning Cream Top','1 litre',5.25,'Core'],
['CC-DA-CHOC-050','Estate Chocolate Milk','500 ml',3.50,'Value Added'],
['CC-DA-JG-075','Jersey Gold','750 ml',6.95,'Prestige'],
['CC-DA-CR-025','Jersey Pouring Cream','250 ml',5.25,'Value Added'],
['CC-DA-DBL-025','Jersey Double Cream','250 ml',6.25,'Value Added'],
['CC-DA-CLT-020','Jersey Clotted Cream','200 g',8.95,'Prestige'],
['CC-DA-BUT-S20','Estate Salted Butter','200 g',8.25,'Value Added'],
['CC-DA-BUT-U20','Estate Unsalted Butter','200 g',8.25,'Value Added'],
['CC-DA-YOG-045','Natural Jersey Yoghurt','450 g',4.95,'Value Added'],
['CC-DA-GRY-045','Greek-Style Jersey Yoghurt','450 g',5.75,'Value Added'],
['CC-DA-KEF-050','Estate Jersey Kefir','500 ml',5.50,'Value Added'],
['CC-DA-CHED-020','Jersey Cheddar','200 g',7.95,'Matured Cheese'],
['CC-DA-BRIE-020','Jersey Brie-Style Cheese','200 g',8.50,'Matured Cheese'],
['CC-DA-GOU-020','Jersey Gouda-Style Cheese','200 g',7.95,'Matured Cheese'],
['CC-DA-BLU-020','Jersey Blue','200 g',8.95,'Matured Cheese'],
['CC-DA-SEL-001','Estate Dairy Selection','1 gift box',24.95,'Prestige']
];
const dairy=rows.map(([sku,product,size,retailPrice,marginClass])=>({
 category:'Jersey Dairy',sku,product,collection:marginClass,size,retailPrice,
 wholesalePrice:null,subscriptionEligible:false,subscriptionPrice:null,
 targetGrossMargin:TARGETS[marginClass],maxCostTarget:Number((retailPrice*(1-TARGETS[marginClass])).toFixed(2)),
 vat:'Food VAT treatment to be verified by finance before launch',status:'APPROVED — LOCKED',
 notes:'Founder/Lead Steward approved commercial baseline following Jersey Dairy true-cost review. Price changes require controlled approval and price-history entry.',
 publishStatus:'PUBLISH',effectiveDate,marginClass
}));
window.CC_JERSEY_DAIRY_CATALOGUE_VERSION='1.0';
window.CC_JERSEY_DAIRY_CATALOGUE=dairy;
const current=Array.isArray(window.CC_PRODUCT_CATALOGUE)?window.CC_PRODUCT_CATALOGUE:[];
const jerseySkus=new Set(dairy.map(x=>x.sku));
window.CC_PRODUCT_CATALOGUE=current.filter(x=>!jerseySkus.has(x.sku)).concat(dairy);
window.CC_WEBSITE_CATALOGUE=(Array.isArray(window.CC_WEBSITE_CATALOGUE)?window.CC_WEBSITE_CATALOGUE:current).filter(x=>!jerseySkus.has(x.sku)).concat(dairy.filter(x=>x.publishStatus==='PUBLISH'));
})();
