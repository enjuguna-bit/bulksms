// Quick test script for phone normalization
const { normalizePhone } = require('../dataParsers');

console.log('Testing phone normalization:');
console.log('0712345678 ->', normalizePhone('0712345678'));
console.log('712345678 ->', normalizePhone('712345678'));
console.log('+254712345678 ->', normalizePhone('+254712345678'));
console.log('254712345678 ->', normalizePhone('254712345678'));
console.log('07123456 ->', normalizePhone('07123456'));
console.log('Invalid ->', normalizePhone('invalid'));
