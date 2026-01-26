/**
 * Generate Privy Authorization Key Pair (PKCS8 format)
 * Creates EC (Elliptic Curve) private/public key pair for Privy server-side authorization
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔑 Generating Privy Authorization Key Pair (PKCS8 format)...\n');

// Generate EC key pair (prime256v1 curve)
// Using PKCS8 format which is the standard format for Privy SDK
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',  // PKCS8 format (standard for most SDKs)
        format: 'pem'
    }
});

// Save keys to files
const outputDir = path.join(__dirname, '..');
fs.writeFileSync(path.join(outputDir, 'private.pem'), privateKey);
fs.writeFileSync(path.join(outputDir, 'public.pem'), publicKey);

console.log('✅ Keys generated successfully!\n');
console.log('📁 Files created:');
console.log('   - private.pem (PKCS8 format)');
console.log('   - public.pem\n');

console.log('🔐 Private Key:');
console.log('─────────────────────────────────────────────────────────');
console.log(privateKey);
console.log('─────────────────────────────────────────────────────────\n');

console.log('✨ Backend akan otomatis restart dan gunakan key ini.');
console.log('   Test gasless transaction dari frontend!\n');
