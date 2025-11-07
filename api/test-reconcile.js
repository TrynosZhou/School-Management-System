// Quick test script to reconcile invoices for student TXS9743842
// Run with: node test-reconcile.js

const http = require('http');

const data = JSON.stringify({
  term: 'Term 1'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/accounts/reconcile/TXS9743842',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    // You'll need to add your admin auth token here
    // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
  }
};

console.log('🔄 Attempting to reconcile invoices for student TXS9743842...');
console.log('Endpoint:', `http://${options.hostname}:${options.port}${options.path}`);
console.log('Body:', data);
console.log('');

const req = http.request(options, (res) => {
  let responseData = '';

  console.log(`Status Code: ${res.statusCode}`);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  console.log('');

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('Response Body:');
    try {
      const parsed = JSON.parse(responseData);
      console.log(JSON.stringify(parsed, null, 2));
      
      if (parsed.success) {
        console.log('\n✅ SUCCESS! Invoices reconciled.');
        console.log(`Settled ${parsed.settled} invoice(s)`);
      } else {
        console.log('\n❌ Reconciliation failed or reported issues.');
      }
    } catch (e) {
      console.log(responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.error('');
  console.error('Make sure:');
  console.error('1. Backend server is running (npm run start:dev)');
  console.error('2. Server is accessible at http://localhost:3000');
  console.error('3. You are logged in as admin');
});

req.write(data);
req.end();
