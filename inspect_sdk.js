const { Lipana } = require('@lipana/sdk');

try {
    console.log('Trying string ctor...');
    const l1 = new Lipana('test_key');
    console.log('String ctor success');
    console.log('Props:', Object.keys(l1));
} catch (e) {
    console.log('String ctor failed:', e.message);
}

try {
    console.log('Trying object ctor...');
    const l2 = new Lipana({ apiKey: 'test_key' });
    console.log('Object ctor success');
    console.log('Props:', Object.keys(l2));

    // Check if props are objects with methods
    for (const key of Object.keys(l2)) {
        if (l2[key] && typeof l2[key] === 'object') {
            console.log(`Methods of ${key}:`, Object.getOwnPropertyNames(Object.getPrototypeOf(l2[key])));
        }
    }
} catch (e) {
    console.log('Object ctor failed:', e.message);
}
