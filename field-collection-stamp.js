const unstampedCollectV40=collectV40;
collectV40=function(){
 collectionStartedAt=collectionStartedAt||new Date();
 const date=new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(collectionStartedAt);
 const time=collectionStartedAt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
 const stamp=`<section class="collection-stamp"><span><small>COLLECTION DATE</small><strong>${date}</strong></span><span><small>START TIME</small><strong>${time}</strong></span><b>LIVE RECORD</b></section>`;
 return unstampedCollectV40().replace('<section class="heritage-house-current">',`${stamp}<section class="heritage-house-current">`);
};

const unstampedSubmitCollection=submitCollection;
submitCollection=function(){
 if(!total())return unstampedSubmitCollection();
 const startedAt=collectionStartedAt||new Date();
 unstampedSubmitCollection();
 const saved=state();
 if(saved.eggCollections?.[0]){
  saved.eggCollections[0].collectionStartedAt=startedAt.toISOString();
  save(saved);
 }
 collectionStartedAt=null;
};
