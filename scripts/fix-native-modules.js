#!/usr/bin/env node

/**
 * Fix Native Modules for React Native 0.76+ / AGP 8+
 * Automatically patches common issues in node_modules
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const fixes = [
  {
    name: '@react-native-picker/picker',
    file: 'android/build.gradle',
    search: /defaultConfig\s*\{[\s\S]*?\}/m,
    replace: (match) => {
      if (match.includes('buildFeatures')) return match;
      return match + '\n\n    buildFeatures {\n        buildConfig true\n    }';
    }
  },
  {
    name: '@react-native-async-storage/async-storage',
    file: 'android/build.gradle',
    search: /defaultConfig\s*\{[\s\S]*?\}/m,
    replace: (match) => {
      if (match.includes('buildFeatures')) return match;
      return match + '\n\n    buildFeatures {\n        buildConfig true\n    }';
    }
  },
  {
    name: 'react-native-contacts',
    file: 'android/build.gradle',
    search: /android\s*\{/,
    replace: (match) => {
      return match + '\n    namespace "com.rt2zz.reactnativecontacts"';
    },
    condition: (content) => !content.includes('namespace')
  }
];

console.log('🔧 Fixing native modules for React Native 0.76+ compatibility...\n');

fixes.forEach(fix => {
  const modulePath = path.join(__dirname, '..', 'node_modules', fix.name, fix.file);
  
  if (!fs.existsSync(modulePath)) {
    console.log(`⏭️  Skipping ${fix.name} (not found)`);
    return;
  }

  try {
    let content = fs.readFileSync(modulePath, 'utf8');
    
    if (fix.condition && !fix.condition(content)) {
      console.log(`✅ ${fix.name} already fixed`);
      return;
    }

    const newContent = content.replace(fix.search, fix.replace);
    
    if (newContent === content) {
      console.log(`✅ ${fix.name} already fixed`);
      return;
    }

    fs.writeFileSync(modulePath, newContent, 'utf8');
    console.log(`✅ Fixed ${fix.name}`);
    
    // Create patch
    try {
      execSync(`npx patch-package ${fix.name}`, { 
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      console.log(`   📦 Created patch for ${fix.name}`);
    } catch (e) {
      console.log(`   ⚠️  Could not create patch for ${fix.name}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${fix.name}:`, error.message);
  }
});

console.log('\n✨ Native module fixes complete!');
