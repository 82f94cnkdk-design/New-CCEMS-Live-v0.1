const HERITAGE_HOUSES=[
 {id:"HE-H01",number:1,name:"Spring Heritage",collection:"Spring Heritage Egg Collection",artwork:window.CCEMSArtwork.houses[0]},
 {id:"HE-H02",number:2,name:"Summer Heritage",collection:"Summer Heritage Egg Collection",artwork:window.CCEMSArtwork.houses[1]},
 {id:"HE-H03",number:3,name:"Harvest Heritage",collection:"Harvest Heritage Egg Collection",artwork:window.CCEMSArtwork.houses[2]},
 {id:"HE-H04",number:4,name:"Christmas Estate Heritage",collection:"Christmas Estate Heritage Egg Collection",artwork:window.CCEMSArtwork.houses[3]},
 {id:"HE-H05",number:5,name:"Royal Estate / Heritage Reserve",collection:"Royal Estate / Heritage Reserve Collection",artwork:window.CCEMSArtwork.houses[4]}
];

function heritageHouse(){return HERITAGE_HOUSES[selectedHouse]||HERITAGE_HOUSES[0]}
function heritageHouseForRecord(raw={}){return HERITAGE_HOUSES.find(h=>h.id===raw.houseId)||HERITAGE_HOUSES.find(h=>h.collection===raw.collection)||HERITAGE_HOUSES[collectionArtworkIndex(raw.collection||"")]||HERITAGE_HOUSES[0]}
function chooseHeritageHouse(i){const y=scrollY;selectedHouse=i;houseMenuOpen=false;render();requestAnimationFrame(()=>scrollTo(0,y))}

collectV40=function(){const house=heritageHouse();return `<section class="journal-page">${journalHead("Egg Collection","task")}<main class="paper-workflow collection heritage-house-collection"><div class="collection-intro"><small>HERITAGE EGGS</small><h2>Ten-Colour Entry</h2><div class="collection-faith-divider" aria-hidden="true"><span>†</span></div><p>Select the operational Heritage House, then record every egg colour collected.</p></div><section class="heritage-house-current"><img src="${house.artwork}" alt="${house.name} approved house artwork"><div><small>HOUSE ${house.number} · ${house.id}</small><h3>${house.name}</h3><p>${house.collection}</p><b>Operational record</b></div></section><div class="house-picker heritage-house-picker"><button class="house-select ${houseMenuOpen?'open':''}" aria-expanded="${houseMenuOpen}" onclick="toggleHouseMenu()"><span>House ${house.number} — ${house.name}</span><b>⌄</b></button>${houseMenuOpen?`<div class="house-options heritage-house-options">${HERITAGE_HOUSES.map((x,i)=>`<button class="${i===selectedHouse?'selected':''}" onclick="chooseHeritageHouse(${i})"><img src="${x.artwork}" alt=""><span><small>${x.id}</small><strong>House ${x.number} — ${x.name}</strong><em>${x.collection}</em></span></button>`).join('')}</div>`:''}</div><section class="egg-rows">${colours.map((c,i)=>`<div><i class="egg ${c==='Speckled'?'speckled-egg':''}" style="--egg:${eggColours[i]}"></i><strong>${c}</strong><button aria-label="Remove one ${c} egg" onclick="change('${c}',-1)">−</button><input aria-label="${c} egg count" inputmode="numeric" value="${counts[c]}" onchange="counts['${c}']=Math.max(0,+this.value||0);render()"><button aria-label="Add one ${c} egg" onclick="change('${c}',1)">+</button></div>`).join("")}</section><div class="collection-total"><span>Total Eggs · House ${house.number}</span><strong>${total()}</strong></div><label class="journal-field collection-notes"><strong>Notes</strong><textarea id="heritage-collection-notes" placeholder="Optional collection notes"></textarea></label><label class="photo-upload journal-secondary collection-photo"><input type="file" accept="image/*" onchange="chooseCollectionPhoto(this)"><span>Add Photograph</span><small>Take a new photo or choose from Photos</small></label>${collectionPhoto?`<figure class="photo-preview"><img src="${collectionPhoto.data}" alt="Selected collection photograph"><figcaption>${collectionPhoto.name}</figcaption><button type="button" onclick="collectionPhoto=null;render()">Remove</button></figure>`:``}<div class="collection-actions"><button class="journal-secondary collection-back" onclick="go('task')">Back</button><button class="journal-primary" onclick="submitCollection()">Review & Submit <span>→</span></button></div></main></section>`}

submitCollection=function(){if(!total())return alert("Enter at least one collected egg.");const s=state(),house=heritageHouse(),now=new Date(),id="HEG-"+Date.now(),notes=document.querySelector('#heritage-collection-notes')?.value.trim()||"";s.eggCollections=s.eggCollections||[];s.eggCollections.unshift({id,houseId:house.id,houseNumber:house.number,houseName:house.name,houseArtwork:house.artwork,collection:house.collection,quantity:total(),colours:{...counts},notes,date:now.toISOString().slice(0,10),source:"CCEMS Field App",worker:"Dean",createdAt:now.toISOString(),photo:collectionPhoto?{name:collectionPhoto.name,data:collectionPhoto.data}:null});s.audit=s.audit||[];s.audit.unshift({ts:now.toISOString(),action:"FIELD_EGG_COLLECTION",detail:`${house.id} · House ${house.number} · ${house.name} · ${house.collection} · ${total()} eggs · Dean`});save(s);window.lastBatch=id;go("confirm")}

const recoveredJournalRecords=journalRecords;
journalRecords=function(){return recoveredJournalRecords().map(r=>{if(r.kind!=="eggs")return r;const house=heritageHouseForRecord(r.raw||{}),qty=Number(r.raw?.quantity||0);return {...r,title:`House ${house.number} — ${house.name}`,amount:`${qty} eggs · ${house.collection}`,houseId:house.id,houseName:house.name,houseNumber:house.number,houseArtwork:house.artwork,collectionName:house.collection}})};

function applyHeritageJournalArtwork(){
 if(view==="journal"){
  const all=journalRecords(),visible=journalFilter==="all"?all:all.filter(r=>r.kind===journalFilter),eggRows=visible.filter(r=>r.kind==="eggs");
  document.querySelectorAll(".record-card.record-eggs").forEach((card,i)=>{const r=eggRows[i];if(!r)return;const old=card.querySelector(".collection-artwork");if(old&&!old.querySelector("img")){const img=document.createElement("img");img.className="record-house-artwork";img.src=r.houseArtwork;img.alt=`${r.houseName} approved house artwork`;old.replaceWith(img)}});
 }
 if(view==="journal-detail"&&selectedJournalRecord?.kind==="eggs"){
  const house=heritageHouseForRecord(selectedJournalRecord.raw||{}),art=document.querySelector(".collection-detail-art");
  if(art){art.classList.add("operational-house-artwork");art.style.backgroundImage=`url('${house.artwork}')`;art.setAttribute("aria-label",`${house.name} approved house artwork`)}
 }
}

const recoveredRender=render;
render=function(){recoveredRender();applyHeritageJournalArtwork()};
applyHeritageJournalArtwork();
