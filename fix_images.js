import fs from 'fs';
const f='data/products.json';
const p=JSON.parse(fs.readFileSync(f,'utf8'));

// Restore REAL Taager images for original products
const originals={
  'T001':['https://media.taager.com/f08ee941-07f6-476b-aae3-f51699c6adbe.png','https://media.taager.com/9d0d180a-e426-498a-ad6f-8f1c41bebafb.jpg','https://media.taager.com/933b9b1b-d3c8-4103-bd6c-3500206199bb.jpg'],
  'T002':['https://media.taager.com/3e9709ef-d084-4b4b-8b2e-3c3a3ddc3163.jpg','https://media.taager.com/ddd06c79-9ffc-46a1-89bc-4092fdad1f88.jpg'],
  'T003':['https://media.taager.com/4a8e8c1c-b7d9-4249-8100-c833fbecb24e.jpg','https://media.taager.com/494cb74f-6858-4a4f-8a4d-a6775fb9a8f1.jpg'],
  'T004':['https://media.taager.com/10acfc02-3370-4d59-aded-4d9294bc051c.jpg','https://media.taager.com/39d09c02-240f-4aed-80e9-817b5b1b272e.png'],
  'T005':['https://media.taager.com/df97034c-d048-43bf-8b3e-a8504fe045c9.jpg'],
  'T006':['https://media.taager.com/8f5e6c11-a126-477a-9765-39ebe916aecf.jpg','https://media.taager.com/773011c8-d80d-47fc-ada0-74b088c709cd.jpg'],
  'T008':['https://media.taager.com/558c9f9a-37cc-41b2-b45a-0da237237c92.jpg','https://media.taager.com/3e1a3325-3e26-4629-bf6f-3f435d3a5f35.jpg'],
  'T009':['https://media.taager.com/dfba34e9-8344-4798-8337-61e3d138ba68.jpg','https://media.taager.com/6a6e06a7-4d56-4420-8fda-f1e63f3c26e6.jpg'],
  'T010':['https://media.taager.com/8143a43b-89ef-463c-931b-fd2da9389e8a.png','https://media.taager.com/555030ba-6581-48cb-844a-84ef5f07c9cb.png'],
};

let fixed=0;
p.forEach(prod=>{
  if(originals[prod.id]){
    prod.images=originals[prod.id];
    fixed++;
  }
});

// Remove products with fake images (T011-T025)
const cleaned=p.filter(x=>originals[x.id]);
fs.writeFileSync(f,JSON.stringify(cleaned,null,2));
console.log(`Restored ${fixed} products with REAL Taager images. Removed fake ones. Total: ${cleaned.length}`);
