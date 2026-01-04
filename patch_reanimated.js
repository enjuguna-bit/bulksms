const fs = require('fs');
const path = 'node_modules/react-native-reanimated/android/build.gradle';

try {
  let content = fs.readFileSync(path, 'utf8');
  if (!content.includes('buildToolsVersion rootProject.ext.buildToolsVersion')) {
    const newContent = content.replace(
      'android {',
      'android {\n    buildToolsVersion rootProject.ext.buildToolsVersion ?: "33.0.2"'
    );
    fs.writeFileSync(path, newContent);
    console.log('Successfully patched reanimated build.gradle');
  } else {
    console.log('File already patched');
  }
} catch (err) {
  console.error('Error patching file:', err);
  process.exit(1);
}
