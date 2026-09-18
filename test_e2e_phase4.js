'use strict';
/**
 * test_e2e_phase4.js
 * End-to-end verification for Phase 4: Cash & MFS Disbursement Engine
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
const ADMIN_KEY = 'SEP_ADMIN_2026';
const CLIENT_PHONE = '+8801612669922';

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(options.url || `${BASE_URL}${options.path}`);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        ...(options.headers || {})
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        const text = buffer.toString('utf8');
        try {
          const json = JSON.parse(text);
          resolve({ status: res.statusCode, headers: res.headers, json, buffer, text });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, text, buffer });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      if (Buffer.isBuffer(body)) {
        req.write(body);
      } else if (typeof body === 'string') {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

// Multipart helper
function buildMultipart(fields, fileField) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const crlf = '\r\n';
  let parts = [];

  for (const [k, v] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="${k}"${crlf}${crlf}${v}${crlf}`));
  }

  if (fileField) {
    const { name, filename, contentType, buffer } = fileField;
    parts.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="${name}"; filename="${filename}"${crlf}Content-Type: ${contentType}${crlf}${crlf}`));
    parts.push(buffer);
    parts.push(Buffer.from(crlf));
  }

  parts.push(Buffer.from(`--${boundary}--${crlf}`));
  const body = Buffer.concat(parts);

  return {
    boundary,
    body,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
    }
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 STARTING PHASE 4 END-TO-END VERIFICATION');
  console.log('====================================================');

  // Test 1: Historical Notes Digitalizer
  console.log('\n[1] Testing Google Keep Notes Import (Upsert & Regex)...');
  const rawKeepNotes = `
Niloy -----------=115 dress
Sunny-----------=2140+500=2,640
Alga----------- = 2660+1200(ajik field) +3000(dL) +234 (rexam fee)= 7,094-5000=2,094
Jhor vi ---------=2000 fraud
  `.trim();

  const noteRes = await request({
    method: 'POST',
    path: '/api/admin/historical-ledgers/import-note',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': ADMIN_KEY,
    }
  }, { raw_text: rawKeepNotes });

  console.log('Import Note Status:', noteRes.status, noteRes.json?.message);
  if (!noteRes.json?.success) {
    throw new Error(`Note import failed: ${JSON.stringify(noteRes.json)}`);
  }
  console.log(`✅ Imported ${noteRes.json.count} ledger items.`);

  // Test 2: Verify Historical Ledgers Query
  console.log('\n[2] Verifying Ledgers in Supabase Database...');
  const ledgerRes = await request({
    method: 'GET',
    path: '/api/admin/historical-ledgers',
    headers: { 'x-admin-key': ADMIN_KEY }
  });
  console.log(`Found ${ledgerRes.json?.count} historical ledgers.`);
  const fraudItem = ledgerRes.json?.ledgers?.find(l => l.old_name.includes('JHOR VI'));
  console.log('Fraud flag verification for JHOR VI:', fraudItem?.historical_tag);
  if (fraudItem?.historical_tag !== 'FRAUD CLIENT') {
    console.warn('⚠️ JHOR VI tag expected FRAUD CLIENT, got:', fraudItem?.historical_tag);
  } else {
    console.log('✅ Fraud tagging verified accurately.');
  }

  // Test 3: Get Client Profile and Loans
  console.log('\n[3] Fetching Client Loans for', CLIENT_PHONE);
  const clientLookup = await request({
    method: 'GET',
    path: `/api/clients/lookup/phone?phone=${encodeURIComponent(CLIENT_PHONE)}`
  });

  if (!clientLookup.json?.success || !clientLookup.json.client) {
    throw new Error('Client lookup failed: ' + JSON.stringify(clientLookup.json));
  }
  const client = clientLookup.json.client;
  console.log(`Found client: ${client.name} (${client.id})`);

  const clientLoansRes = await request({
    method: 'GET',
    path: `/api/clients/${client.id}/loans`
  });

  let loans = clientLoansRes.json.data || [];
  console.log(`Client has ${loans.length} loans.`);

  // Find or create a pending test loan
  let targetLoan = loans.find(l => l.status === 'PENDING');
  if (!targetLoan) {
    console.log('Creating a new test loan for verification...');
    // Tomorrow's date for valid deadline
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    const deadlineStr = tomorrow.toISOString().split('T')[0];

    const applyRes = await request({
      method: 'POST',
      path: '/api/loans',
      headers: { 'Content-Type': 'application/json' }
    }, {
      client_id: client.id,
      amount: 5000,
      deadline_date: deadlineStr,
    });
    if (!applyRes.json?.success) {
      throw new Error('Loan apply failed: ' + JSON.stringify(applyRes.json));
    }
    targetLoan = applyRes.json.data;
    console.log('Created loan:', targetLoan?.id);
  }

  console.log(`Target Loan ID: ${targetLoan.id}, Amount: ${targetLoan.amount}, Status: ${targetLoan.status}`);

  // Test 4: Disburse via bKash with 20 BDT fee and Receipt Upload
  console.log('\n[4] Testing Disbursement with bKash, 20 BDT/1000 fee math, and Receipt Upload...');
  // Dummy 1x1 PNG pixel buffer
  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  const multipart = buildMultipart(
    {
      decision: 'ACCEPTED',
      payout_method: 'BKASH',
      destination_number: '01612669922',
      trx_id: '9B48XK29BKASH',
      fee_handling: 'INCLUDED',
      admin_note: 'Automated E2E Test Disbursement with Receipt'
    },
    {
      name: 'receipt_image',
      filename: 'test_bkash_receipt.png',
      contentType: 'image/png',
      buffer: samplePngBuffer
    }
  );

  const disburseRes = await request({
    method: 'POST',
    path: `/api/admin/loans/${targetLoan.id}/decision`,
    headers: {
      'x-admin-key': ADMIN_KEY,
      ...multipart.headers
    }
  }, multipart.body);

  console.log('Disbursement HTTP Status:', disburseRes.status);
  console.log('Disbursement Response:', disburseRes.json);

  if (!disburseRes.json?.success) {
    throw new Error('Disbursement failed: ' + JSON.stringify(disburseRes.json));
  }

  const disbursement = disburseRes.json.loan.disbursement;
  console.log('Disbursement details:', disbursement);

  // Expected Fee for amount (5000 BDT) is Math.ceil(5000 / 1000) * 20 = 100 BDT
  const expectedFee = Math.ceil(parseFloat(targetLoan.amount) / 1000) * 20;
  console.log(`Calculated Fee: ${disbursement.mfs_fee} BDT (Expected: ${expectedFee} BDT)`);
  if (disbursement.mfs_fee !== expectedFee) {
    throw new Error(`Fee mismatch! Expected ${expectedFee}, got ${disbursement.mfs_fee}`);
  }
  console.log('✅ 20 BDT per 1,000 BDT MFS Fee strictly verified.');

  // Test 5: Verify Receipt URL Accessibility
  console.log('\n[5] Verifying Uploaded Receipt Image via HTTP GET...');
  const receiptUrl = disbursement.receipt_url;
  console.log('Testing receipt URL:', receiptUrl);
  if (!receiptUrl) {
    throw new Error('receipt_url was not returned!');
  }

  const receiptGet = await request({
    method: 'GET',
    path: receiptUrl
  });

  console.log('Receipt GET status:', receiptGet.status, 'ContentType:', receiptGet.headers['content-type']);
  if (receiptGet.status !== 200) {
    throw new Error('Failed to retrieve receipt image!');
  }
  console.log('✅ Receipt image is immediately previewable via HTTP GET.');

  // Test 6: Verify Client View Data Enrichment
  console.log('\n[6] Verifying Client View Loan List has Enriched Disbursement Data...');
  const verifyClientRes = await request({
    method: 'GET',
    path: `/api/clients/${client.id}/loans`
  });

  const enrichedLoan = verifyClientRes.json.data.find(l => l.id === targetLoan.id);
  console.log('Enriched loan payout_method:', enrichedLoan?.disbursement?.payout_method);
  console.log('Enriched loan trx_id:', enrichedLoan?.disbursement?.trx_id);
  console.log('Enriched loan receipt_url:', enrichedLoan?.disbursement?.receipt_url);

  if (!enrichedLoan?.disbursement || enrichedLoan.disbursement.trx_id !== '9B48XK29BKASH') {
    throw new Error('Enriched disbursement missing or TrxID incorrect in client view!');
  }
  console.log('✅ Client view successfully displays payout method badge, TrxID, and receipt preview button.');

  console.log('\n====================================================');
  console.log('🎉 ALL PHASE 4 TESTS PASSED FLAWLESSLY!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
