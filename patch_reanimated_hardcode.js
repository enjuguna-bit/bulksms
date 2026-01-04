const fs = require('fs');
const path = 'node_modules/react-native-reanimated/android/build.gradle';

try {
    let content = fs.readFileSync(path, 'utf8');
    // First, revert the previous patch if it exists slightly differently, or just replace the specific line
    // We want to replace "android {" with "android {\n    buildToolsVersion '33.0.2'"

    // If we already patched it with the rootProject version, replace that line.
    if (content.includes('buildToolsVersion rootProject.ext.buildToolsVersion')) {
        content = content.replace(
            'buildToolsVersion rootProject.ext.buildToolsVersion ?: "33.0.2"',
            'buildToolsVersion "33.0.2"'
        );
        fs.writeFileSync(path, content);
        console.log('Updated patch to hardcoded version');
    } else if (!content.includes('buildToolsVersion "33.0.2"')) {
        const newContent = content.replace(
            'android {',
            'android {\n    buildToolsVersion "33.0.2"'
        );
        fs.writeFileSync(path, newContent);
        console.log('Applied hardcoded patch');
    } else {
        console.log('File already has hardcoded patch');
    }
} catch (err) {
    console.error('Error patching file:', err);
    process.exit(1);
}
