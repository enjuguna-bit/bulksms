const fs = require('fs');
const path = 'node_modules/@op-engineering/op-sqlite/android/build.gradle';

if (!fs.existsSync(path)) {
    console.error('File not found:', path);
    process.exit(1);
}

let content = fs.readFileSync(path, 'utf8');

// 1. Comment out classpath (if not already)
const classpathSearch = 'classpath "com.facebook.react:react-native-gradle-plugin"';
if (content.includes(classpathSearch) && !content.includes('// ' + classpathSearch)) {
    content = content.replace(classpathSearch, '// ' + classpathSearch);
}

// 2. Comment out apply plugin
const pluginSearch = 'apply plugin: "com.facebook.react"';
if (content.includes(pluginSearch) && !content.includes('// ' + pluginSearch)) {
    content = content.replace(pluginSearch, '// ' + pluginSearch);
}

// 3. Hardcode SDK versions to avoid resolution issues
// Replace compileSdkVersion getExtOrIntegerDefault("compileSdkVersion") with compileSdkVersion 34
const compileSdkSearch = 'compileSdkVersion getExtOrIntegerDefault("compileSdkVersion")';
if (content.includes(compileSdkSearch)) {
    content = content.replace(compileSdkSearch, 'compileSdkVersion 34');
}

// Replace minSdkVersion
const minSdkSearch = 'minSdkVersion getExtOrIntegerDefault("minSdkVersion")';
if (content.includes(minSdkSearch)) {
    content = content.replace(minSdkSearch, 'minSdkVersion 24');
}

// Replace targetSdkVersion
const targetSdkSearch = 'targetSdkVersion getExtOrIntegerDefault("targetSdkVersion")';
if (content.includes(targetSdkSearch)) {
    content = content.replace(targetSdkSearch, 'targetSdkVersion 34');
}

fs.writeFileSync(path, content);
console.log('Aggressively patched op-sqlite build.gradle');
