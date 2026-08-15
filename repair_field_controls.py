from pathlib import Path

src = Path(r"C:\Users\kelly\.codex\.chatgpt-projects\g-p-6a74ed0881048191a7100211d3ec05a3\working\journal-app-live-v25.js")
dst = src.with_name("journal-app-live-v26.js")
s = src.read_text(encoding="utf-8")
s = s.replace('let view="standby",selectedHouse=0,menuOpen=false,counts=', 'let view="standby",selectedHouse=0,menuOpen=false,collectionPhoto=null,counts=')
s = s.replace('function state(){', 'function chooseCollectionPhoto(input){const file=input.files&&input.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{collectionPhoto={name:file.name,data:reader.result};render()};reader.readAsDataURL(file)}function state(){', 1)
s = s.replace('<aside class="field-drawer ">', '<aside class="field-drawer ${menuOpen?\'open\':\'\'}">')
s = s.replace('<button class="drawer-shade "', '<button class="drawer-shade ${menuOpen?\'show\':\'\'}"')
s = s.replace('</b></article></main><nav class="field-bottom-nav">', '</b></article><div class="field-landscape" aria-hidden="true"><img src="field-estate-sketch-v1.svg" alt=""></div></main><nav class="field-bottom-nav">', 1)
s = s.replace('["â§","Environment"]', '["ENV","Environment"]')
s = s.replace('<button class="journal-secondary">Add Photograph</button><button class="journal-primary" onclick="submitCollection()">', '<label class="photo-upload journal-secondary"><input type="file" accept="image/*" capture="environment" onchange="chooseCollectionPhoto(this)"><span>Add Photograph</span></label>${collectionPhoto?`<figure class="photo-preview"><img src="${collectionPhoto.data}" alt="Selected collection photograph"><figcaption>${collectionPhoto.name}</figcaption><button type="button" onclick="collectionPhoto=null;render()">Remove</button></figure>`:``}<button class="journal-primary" onclick="submitCollection()">', 1)
s = s.replace('createdAt:new Date().toISOString()}', 'createdAt:new Date().toISOString(),photo:collectionPhoto?{name:collectionPhoto.name,data:collectionPhoto.data}:null}', 1)
dst.write_text(s, encoding="utf-8")
