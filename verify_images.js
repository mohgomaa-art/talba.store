import fs from 'fs';

const f = 'data/products.json';
const products = JSON.parse(fs.readFileSync(f, 'utf8'));

async function verifyImages() {
    console.log(`Checking ${products.length} products...`);
    let modified = false;
    let validProducts = [];

    for (let p of products) {
        let validImages = [];
        for (let img of p.images) {
            try {
                const res = await fetch(img, { method: 'HEAD' });
                if (res.ok) {
                    validImages.push(img);
                } else {
                    console.log(`[404] ${img}`);
                    modified = true;
                }
            } catch (e) {
                console.log(`[ERR] ${img}`);
                modified = true;
            }
        }
        
        if (validImages.length > 0) {
            p.images = validImages;
            validProducts.push(p);
        } else {
            console.log(`[REMOVED] Product ${p.name} has no valid images.`);
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(f, JSON.stringify(validProducts, null, 2));
        console.log(`Done! Removed broken images. Total products now: ${validProducts.length}`);
    } else {
        console.log('All images are working perfectly!');
    }
}

verifyImages();
