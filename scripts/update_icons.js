const fs = require('fs');
const path = require('path');

const SOURCE_ICON = path.join(__dirname, '../assets/icon.png');
const ANDROID_RES_DIR = path.join(__dirname, '../android/app/src/main/res');

const MIPMAP_DIRS = [
    'mipmap-mdpi',
    'mipmap-hdpi',
    'mipmap-xhdpi',
    'mipmap-xxhdpi',
    'mipmap-xxxhdpi',
];

const TARGET_FILES = ['ic_launcher.png', 'ic_launcher_round.png'];

function copyIcons() {
    if (!fs.existsSync(SOURCE_ICON)) {
        console.error('❌ Source icon not found:', SOURCE_ICON);
        process.exit(1);
    }

    console.log('🚀 Updating Android icons...');

    MIPMAP_DIRS.forEach((dir) => {
        const dirPath = path.join(ANDROID_RES_DIR, dir);
        if (!fs.existsSync(dirPath)) {
            console.warn(`⚠️ Directory not found, skipping: ${dir}`);
            return;
        }

        TARGET_FILES.forEach((file) => {
            const destPath = path.join(dirPath, file);
            try {
                fs.copyFileSync(SOURCE_ICON, destPath);
                console.log(`✅ Updated: ${dir}/${file}`);
            } catch (err) {
                console.error(`❌ Failed to copy to ${dir}/${file}:`, err);
            }
        });
    });

    console.log('🎉 Icon update complete!');
}

copyIcons();
