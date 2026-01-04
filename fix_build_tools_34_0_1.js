const fs = require('fs');
const path = require('path');
const os = require('os');
const child_process = require('child_process');

const localAppData = process.env.LOCALAPPDATA;
const androidSdkPath = path.join(localAppData, 'Android', 'Sdk', 'build-tools');
const customPath = path.join(androidSdkPath, '34.0.0-custom');
const targetPath = path.join(androidSdkPath, '34.0.1');

try {
    if (fs.existsSync(customPath)) {
        console.log(`Renaming ${customPath} to ${targetPath}`);
        if (fs.existsSync(targetPath)) {
            // clean up previous attempts
            child_process.execSync(`rmdir /s /q "${targetPath}"`);
        }
        fs.renameSync(customPath, targetPath);
    } else {
        console.error('34.0.0-custom not found, cannot rename');
        process.exit(1);
    }

    // Update source.properties
    const sourcePropsPath = path.join(targetPath, 'source.properties');
    if (fs.existsSync(sourcePropsPath)) {
        let props = fs.readFileSync(sourcePropsPath, 'utf8');
        props = props.replace(/Pkg\.Revision=.*/, 'Pkg.Revision=34.0.1');
        fs.writeFileSync(sourcePropsPath, props);
        console.log('Updated source.properties to 34.0.1');
    }

} catch (err) {
    console.error('Error:', err);
    process.exit(1);
}
