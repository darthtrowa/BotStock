import crypto from 'crypto';
import https from 'https';

const appId = 'X9QmjT4Gtvh3SMEy';
const appSecretBase64 = 'AP2Q9p///kRY6FaMOSnbfFWnDP8/JmogKze0bXQad8zT';
const brokerId = '000';
const appCode = 'ALGO';

// Derive the PEM format from the 32-byte raw base64 secret.
// Actually, is it 32 bytes? 
const rawKey = Buffer.from(appSecretBase64, 'base64');
console.log('Raw key length:', rawKey.length); // Should be 32

// A raw 32-byte secp256r1 private key needs ASN.1 DER wrapping to be used by Node's crypto
// SEC 1 / PKCS#8 wrapper for secp256r1 (prime256v1)
const pkcs8Header = Buffer.from('3041020100301306072a8648ce3d020106082a8648ce3d030107042730250201010420', 'hex');
const derKey = Buffer.concat([pkcs8Header, rawKey]);
const pem = `-----BEGIN PRIVATE KEY-----\n${derKey.toString('base64')}\n-----END PRIVATE KEY-----`;

const timestamp = Date.now().toString();
const params = '';
const content = `${appId}.${params}.${timestamp}`;

const signer = crypto.createSign('SHA256');
signer.update(content);
const signature = signer.sign(pem, 'hex');

console.log('Signature:', signature);

const url = `https://open-api-test.settrade.com/api/oam/v1/SANDBOX/broker-apps/${appCode}/login`;
console.log('URL:', url);

const payload = JSON.stringify({
  apiKey: appId,
  params: params,
  timestamp: timestamp,
  signature: signature
});

const req = https.request(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', data));
});

req.on('error', e => console.error('Error:', e));
req.write(payload);
req.end();
