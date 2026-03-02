import sharp from 'sharp';
import fs from 'fs';

async function processImages() {
    const input = 'expendX_logo_4x.jpg';

    // Ensure assets dir exists
    if (!fs.existsSync('assets')) {
        fs.mkdirSync('assets');
    }

    // Capacitor requires assets/logo.png for auto-generation (doesn't hurt to add it)
    // But wait, the documentation says high res logo should be in assets/logo.png
    console.log('Generating assets/logo.png (1024x1024)');
    await sharp(input)
        .resize(1024, 1024, { fit: 'contain', background: { r: 10, g: 10, b: 11, alpha: 1 } })
        .toFile('assets/logo.png');

    console.log('Generating assets/icon.png (1024x1024)');
    await sharp(input)
        .resize(1024, 1024, { fit: 'contain', background: { r: 10, g: 10, b: 11, alpha: 1 } })
        .toFile('assets/icon.png');

    // Generate splash screen base 
    console.log('Generating assets/splash.png (2732x2732)');
    await sharp(input)
        .resize(2732, 2732, { fit: 'contain', background: { r: 10, g: 10, b: 11, alpha: 1 } })
        .toFile('assets/splash.png');

    // Generate public PWA and Web icons
    console.log('Generating public/app-icon.png (512x512)');
    await sharp(input)
        .resize(512, 512, { fit: 'cover' })
        .toFile('public/app-icon.png');

    console.log('Generating public/favicon.png (192x192)');
    await sharp(input)
        .resize(192, 192, { fit: 'cover' })
        .toFile('public/favicon.png');

    console.log('Finished image processing successfully.');
}

processImages().catch(err => {
    console.error(err);
    process.exit(1);
});
