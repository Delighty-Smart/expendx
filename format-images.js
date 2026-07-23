import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function processImages() {
    const iconInput = 'Lucent App Icon.png';
    const splashInput = fs.existsSync('Lucent_Splash screen logo.png') ? 'Lucent_Splash screen logo.png' : iconInput;

    console.log(`Using ${iconInput} for app icons...`);

    // Ensure directories exist
    if (!fs.existsSync('assets')) fs.mkdirSync('assets');
    if (!fs.existsSync('public')) fs.mkdirSync('public');

    // 1. Generate Capacitor Assets base images
    console.log('Generating assets/logo.png & assets/icon.png (1024x1024)');
    await sharp(iconInput)
        .resize(1024, 1024, { fit: 'contain', background: { r: 9, g: 9, b: 11, alpha: 1 } })
        .toFile('assets/logo.png');

    await sharp(iconInput)
        .resize(1024, 1024, { fit: 'contain', background: { r: 9, g: 9, b: 11, alpha: 1 } })
        .toFile('assets/icon.png');

    await sharp(iconInput)
        .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toFile('assets/icon-only.png');

    await sharp(iconInput)
        .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toFile('assets/icon-foreground.png');

    await sharp({
        create: { width: 1024, height: 1024, channels: 4, background: { r: 9, g: 9, b: 11, alpha: 1 } }
    }).toFile('assets/icon-background.png');

    // 2. Generate Splash Screen base
    console.log('Generating assets/splash.png (2732x2732)');
    await sharp(splashInput)
        .resize(1200, 1200, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .extend({
            top: 766,
            bottom: 766,
            left: 766,
            right: 766,
            background: { r: 9, g: 9, b: 11, alpha: 1 }
        })
        .resize(2732, 2732)
        .toFile('assets/splash.png');

    // 3. Public icons
    console.log('Generating public app icons...');
    await sharp(iconInput).resize(512, 512, { fit: 'cover' }).toFile('public/app-icon.png');
    await sharp(iconInput).resize(512, 512, { fit: 'cover' }).toFile('public/app-icon.jpg');
    await sharp(iconInput).resize(192, 192, { fit: 'cover' }).toFile('public/favicon.png');
    await sharp(iconInput).resize(512, 512, { fit: 'cover' }).toFile('public/lucent-app-icon.png');

    // 4. Android Mipmap icons
    const mipmaps = [
        { dir: 'mipmap-mdpi', size: 48 },
        { dir: 'mipmap-hdpi', size: 72 },
        { dir: 'mipmap-xhdpi', size: 96 },
        { dir: 'mipmap-xxhdpi', size: 144 },
        { dir: 'mipmap-xxxhdpi', size: 192 },
    ];

    for (const { dir, size } of mipmaps) {
        const targetDir = path.join('android', 'app', 'src', 'main', 'res', dir);
        if (!fs.existsSync(targetDir)) continue;

        console.log(`Generating icons for ${dir} (${size}x${size})...`);
        await sharp(iconInput).resize(size, size, { fit: 'cover' }).toFile(path.join(targetDir, 'ic_launcher.png'));
        await sharp(iconInput).resize(size, size, { fit: 'cover' }).toFile(path.join(targetDir, 'ic_launcher_round.png'));
        await sharp(iconInput).resize(size, size, { fit: 'cover' }).toFile(path.join(targetDir, 'ic_launcher_foreground.png'));
    }

    console.log('Finished image processing successfully.');
}

processImages().catch(err => {
    console.error('Error processing images:', err);
    process.exit(1);
});
