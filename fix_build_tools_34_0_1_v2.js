const fs = require('fs');
const path = require('path');
const os = require('os');
const child_process = require('child_process');

const localAppData = process.env.LOCALAPPDATA;
const androidSdkPath = path.join(localAppData, 'Android', 'Sdk', 'build-tools');
const customPath = path.join(androidSdkPath, '34.0.0-custom');
const targetPath = path.join(androidSdkPath, '34.0.1');

try {
    // If target exists, remove it first to be clean
    if (fs.existsSync(targetPath)) {
        console.log(`Removing existing ${targetPath}...`);
        try {
            child_process.execSync(`rmdir /s /q "${targetPath}"`);
        } catch (e) {
            console.log("Could not remove (might be locked), skipping cleanup");
        }
    }

    if (fs.existsSync(customPath)) {
        console.log(`Renaming ${customPath} to ${targetPath}`);
        fs.renameSync(customPath, targetPath);
    } else {
        console.error('34.0.0-custom not found to rename!');
        // Assuming target already exists from previous steps if rename failed?
        // But we just deleted target. so if custom missing, we fail.
        if (!fs.existsSync(targetPath)) {
            process.exit(1);
        }
    }

    // Update source.properties
    const sourcePropsPath = path.join(targetPath, 'source.properties');
    if (fs.existsSync(sourcePropsPath)) {
        let props = fs.readFileSync(sourcePropsPath, 'utf8');
        props = props.replace(/Pkg\.Revision=.*/, 'Pkg.Revision=34.0.1');
        // Ensure Pkg.Path is updated or added
        if (props.includes('Pkg.Path=')) {
            props = props.replace(/Pkg\.Path=.*/, 'Pkg.Path=build-tools;34.0.1');
        } else {
            props += '\nPkg.Path=build-tools;34.0.1';
        }
        fs.writeFileSync(sourcePropsPath, props);
        console.log('Updated source.properties to 34.0.1 (Revision + Path)');
    }

} catch (err) {
    console.error('Error:', err);
    process.exit(1);
}
