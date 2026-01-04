const fs = require('fs');
const path = require('path');
const os = require('os');
const child_process = require('child_process');

const localAppData = process.env.LOCALAPPDATA;
const androidSdkPath = path.join(localAppData, 'Android', 'Sdk', 'build-tools');
const source33Path = path.join(androidSdkPath, '33.0.2');
const source34Path = path.join(androidSdkPath, '34.0.0');
const customPath = path.join(androidSdkPath, '34.0.0-custom');

try {
    if (!fs.existsSync(source34Path)) {
        console.error(`Source 34.0.0 not found - build once to install it`);
        process.exit(1);
    }

    // Create custom dir
    if (!fs.existsSync(customPath)) {
        fs.mkdirSync(customPath);
    }

    // Copy all files from 34.0.0 to custom (using OS command for recursion)
    console.log(`Copying ${source34Path} to ${customPath}...`);
    child_process.execSync(`xcopy "${source34Path}" "${customPath}" /E /I /Y`);

    // Copy aapt.exe from 33.0.2
    const sourceAapt = path.join(source33Path, 'aapt.exe');
    const destAapt = path.join(customPath, 'aapt.exe');

    if (fs.existsSync(sourceAapt)) {
        fs.copyFileSync(sourceAapt, destAapt);
        console.log(`Copied aapt.exe to ${destAapt}`);
    } else {
        console.error('Source aapt.exe not found!');
    }

    // Create package.xml or source.properties modifications if needed? 
    // Maybe change Revision property in source.properties?
    const sourcePropsPath = path.join(customPath, 'source.properties');
    if (fs.existsSync(sourcePropsPath)) {
        let props = fs.readFileSync(sourcePropsPath, 'utf8');
        props = props.replace('Pkg.Revision=34.0.0', 'Pkg.Revision=34.0.0-custom');
        fs.writeFileSync(sourcePropsPath, props);
        console.log('Updated source.properties');
    }

} catch (err) {
    console.error('Error:', err);
    process.exit(1);
}
