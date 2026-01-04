const fs = require('fs');
const path = 'node_modules/react-native-calendar-events/android/build.gradle';

let content = fs.readFileSync(path, 'utf8');

if (!content.includes('namespace "com.calendarevents"')) {
    content = content.replace(
        /android\s*{/,
        'android {\n    namespace "com.calendarevents"'
    );
    fs.writeFileSync(path, content);
    console.log('Patched react-native-calendar-events build.gradle');
} else {
    console.log('Already patched');
}
