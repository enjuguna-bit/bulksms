const fs = require('fs');
const path = require('path');
const os = require('os');

const localAppData = process.env.LOCALAPPDATA;
const androidSdkPath = path.join(localAppData, 'Android', 'Sdk', 'build-tools');
const sourcePath = path.join(androidSdkPath, '33.0.2', 'aapt.exe');
const destDir = path.join(androidSdkPath, '34.0.0');
const destPath = path.join(destDir, 'aapt.exe');

try {
    if (!fs.existsSync(sourcePath)) {
        console.error(`Source aapt.exe not found at ${sourcePath}`);
        process.exit(1);
    }

    if (!fs.existsSync(destDir)) {
        // If 34.0.0 doesn't exist yet, we can't patch it. Gradle needs to install it first.
        // But we know Gradle installs it. 
        // We might need to run this script PARALLEL to the build? 
        // Or just run the build once to let it install, fail, then run this, then build again.
        console.error(`Destination directory ${destDir} does not exist. Run build once to install it.`);
        process.exit(1);
    }

    fs.copyFileSync(sourcePath, destPath);
    console.log(`Successfully copied aapt.exe to ${destPath}`);
} catch (err) {
    console.error('Error copying file:', err);
    process.exit(1);
}
