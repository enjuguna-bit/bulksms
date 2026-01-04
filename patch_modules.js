const fs = require('fs');
const path = require('path');

const patches = [
    {
        name: 'react-native-calendar-events',
        path: 'node_modules/react-native-calendar-events/android/build.gradle',
        namespace: 'com.calendarevents'
    },
    {
        name: 'react-native-geolocation-service',
        path: 'node_modules/react-native-geolocation-service/android/build.gradle',
        namespace: 'com.agontuk.RNFusedLocation'
    },
    {
        name: 'react-native-linear-gradient',
        path: 'node_modules/react-native-linear-gradient/android/build.gradle',
        namespace: 'com.BV.LinearGradient'
    },
    {
        name: 'react-native-webview',
        path: 'node_modules/react-native-webview/android/build.gradle',
        namespace: 'com.reactnativecommunity.webview'
    }
];

patches.forEach(patch => {
    if (!fs.existsSync(patch.path)) {
        console.warn(`File not found: ${patch.path}`);
        return;
    }

    let content = fs.readFileSync(patch.path, 'utf8');
    const namespaceStr = `namespace "${patch.namespace}"`;

    if (!content.includes(namespaceStr)) {
        if (content.includes('android {')) {
            content = content.replace(
                /android\s*{/,
                `android {\n    namespace "${patch.namespace}"`
            );
            fs.writeFileSync(patch.path, content);
            console.log(`Patched ${patch.name}`);
        } else {
            console.warn(`Could not find android block in ${patch.name}`);
        }
    } else {
        console.log(`${patch.name} already patched`);
    }
});
