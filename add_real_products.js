import fs from 'fs';
const f='data/products.json';
const p=JSON.parse(fs.readFileSync(f,'utf8'));
const names=new Set(p.map(x=>x.name));

const scraped=[
  {name:'كشاف طاقة شمسية وباور بانك 2 في 1',price:425,old:550,cat:'الإلكترونيات والشواحن',
   imgs:['https://media.taager.com/7172dddd-972a-4db0-9294-f53a6f48feb0.jpg','https://media.taager.com/78d1b785-3e5d-46de-a4c3-cbeb9c538cf7.jpg'],
   desc:'كشاف قوي بيشحن بالطاقة الشمسية + باور بانك في نفس الوقت، مش هيكلفك كهرباء والكمية محدودة.',sku:'EG-10600'},
  {name:'واقي الأسنان الطبي',price:355,old:450,cat:'الاكسسوارات',
   imgs:['https://media.taager.com/ee2d6208-8a68-4497-abf0-c36132b6ba86.png'],
   desc:'واقي أسنان طبي بيحمي أسنانك من الاحتكاك أثناء النوم والرياضة، مريح وآمن 100%.',sku:'EG-19661'},
  {name:'عرض 2 شورت كارجو أسود وبيج M',price:290,old:400,cat:'الملابس',
   imgs:['https://media.taager.com/44c5d335-f0ac-4b4e-9f6d-45f5a5827c75.png','https://media.taager.com/9472258d-95c0-4c15-b123-26b6bffc0bf5.png'],
   desc:'عرض قطعتين شورت كارجو أسود وبيج خامة قطن ممتازة ومريحة جداً للصيف.',sku:'EG-10604'},
  {name:'عرض 2 شورت كارجو أسود وبيج L',price:290,old:400,cat:'الملابس',
   imgs:['https://media.taager.com/43fe43e8-71a6-427c-aa0e-436267e2d629.png','https://media.taager.com/a682a873-099c-4d27-935d-8b1b71aef552.png'],
   desc:'عرض قطعتين شورت كارجو أسود وبيج مقاس L خامة قطن عالية الجودة.',sku:'EG-10605'},
  {name:'عرض 2 شورت كارجو أسود وبيج XXL',price:290,old:400,cat:'الملابس',
   imgs:['https://media.taager.com/cb60bc47-ef57-4cce-8ecc-2a4c585d616a.png','https://media.taager.com/57a4240c-22e1-4a91-85ae-60e95e704886.jpg','https://media.taager.com/fce1c999-3363-46cc-aed1-52ea46c5e9ad.jpg'],
   desc:'عرض قطعتين شورت كارجو أسود وبيج مقاس XXL مريح وأنيق للخروجات.',sku:'EG-10610'},
  {name:'عرض 2 شورت كارجو زيتي وبيج M',price:290,old:400,cat:'الملابس',
   imgs:['https://media.taager.com/716b6761-a4b8-46ef-b71a-07e208de1742.jpg','https://media.taager.com/1964a78b-68e1-48b7-80dd-cce075e56538.png','https://media.taager.com/be9b83d4-2dba-4dad-ac11-13a564e5ed99.jpg'],
   desc:'عرض قطعتين شورت كارجو زيتي وبيج خامة قطن ممتازة لكل يوم.',sku:'EG-10615'},
  {name:'ماكينة لحام 130 امبير ميني TOTAL',price:2650,old:3200,cat:'الأدوات',
   imgs:['https://media.taager.com/58f1ca9c-55ab-46b5-94a0-74fa7b62374d.png','https://media.taager.com/0c8e251b-a880-43c6-bf67-c07ae3f60fe5.png'],
   desc:'ماكينة لحام ميني من TOTAL 130 أمبير، خفيفة وقوية تشتغل بيها في أي مكان.',sku:'EG-11200'},
  {name:'Haino Teko Smart Watch HW9 Mini',price:1022,old:1300,cat:'الإلكترونيات والشواحن',
   imgs:['https://media.taager.com/eb885427-fde2-4b14-a83f-048f600c94d6.JPG','https://media.taager.com/b867804c-c8c9-48d9-9262-48b638f097de.JPG','https://media.taager.com/54e32a11-ac2b-41c1-8624-aedf1e8b8904.JPG','https://media.taager.com/3a4b571d-ca7d-435e-88ea-6034c91ffd03.JPG'],
   desc:'ساعة ذكية Haino Teko HW9 Mini صغيرة وشيك، بتقيس النبض والأكسجين وبتتصل بالموبايل.',sku:'EG-11300'},
  {name:'كفر ركنة شكل L',price:800,old:1100,cat:'الديكور',
   imgs:['https://media.taager.com/0a9f2878-be41-4a71-ba82-f7e8ba2c8c33.png'],
   desc:'كفر ركنة بيحافظ على لون ركنتك وشكلها، خامة عالية الجودة وسهل التركيب.',sku:'EG-11500'},
  // Updated images for existing products
];

// Also update images for existing products with better versions from category scrape
const imgUpdates={
  'T004':['https://media.taager.com/5f80f1d6-880c-4740-9a8c-f09c64391295.jpg','https://media.taager.com/d69e46a9-83bc-467a-8fbc-8409e663a890.jpg','https://media.taager.com/49258288-b789-498c-8519-d754e0c33a2a.jpg'],
  'T005':['https://media.taager.com/5431871f-0e44-4860-9118-8686d06a92cb.jpg','https://media.taager.com/8394e823-ef86-45ef-b141-86df33418579.jpg'],
};

// Update existing product images
p.forEach(prod=>{
  if(imgUpdates[prod.id]) prod.images=imgUpdates[prod.id];
});

let id=p.length+1;
let added=0;
for(const s of scraped){
  if(!names.has(s.name)){
    p.push({
      id:`T${String(id).padStart(3,'0')}`,
      name:s.name,slug:s.name.replace(/\s+/g,'-').slice(0,50),
      description:s.desc,price:s.price,oldPrice:s.old,
      category:s.cat,inStock:true,featured:id%4===0,
      images:s.imgs,specs:[],
      seoTitle:`${s.name} | اشتري بأفضل سعر في مصر - Talba Store`,
      seoDescription:`${s.desc} ✅ توصيل لكل المحافظات ✅ الدفع عند الاستلام ✅ استبدال واسترجاع مجاني`,
      taagerData:{sku:s.sku}
    });
    id++; added++;
  }
}

fs.writeFileSync(f,JSON.stringify(p,null,2));
console.log(`Added ${added} new products. Total: ${p.length}`);
