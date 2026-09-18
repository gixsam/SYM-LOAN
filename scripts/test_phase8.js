/**
 * scripts/test_phase8.js
 * Automated Verification Suite for Phase 8:
 * - Daily Expense Tracking & Ledger Cost Split Engine
 * - Upcoming Repayments Analytics
 * - S.E.P. Executive Operations Suite (Keep Notes, Google Calendar, Alarms)
 */

'use strict';
require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 5000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'SEP_ADMIN_2026';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'x-admin-key': ADMIN_KEY,
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(resData);
          resolve({ status: res.statusCode, json });
        } catch (e) {
          resolve({ status: res.statusCode, text: resData });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 [PHASE 8 TESTS] Starting Automated Verification...');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  try {
    // Test 1: Expenses - Initial GET
    console.log('\n--- 1. Testing Daily Expenses Engine ---');
    const expGet1 = await request('GET', '/api/admin/expenses');
    assert(expGet1.status === 200 && expGet1.json.success, 'GET /api/admin/expenses returns 200 and success');

    // Test 2: Expenses - POST create expense
    const expPost = await request('POST', '/api/admin/expenses', {
      category: 'TEA_FOOD',
      amount: 450,
      description: 'Client consultation refreshments',
      date: new Date().toISOString().slice(0, 10),
      payer: 'Admin',
      split_with: 'SYM LOAN Office',
    });
    assert(expPost.status === 201 && expPost.json.success, 'POST /api/admin/expenses creates expense');
    const createdExpenseId = expPost.json.expense?.id;
    assert(createdExpenseId, `Created expense ID received: ${createdExpenseId}`);

    // Test 3: Expenses - DELETE expense
    if (createdExpenseId) {
      const expDel = await request('DELETE', `/api/admin/expenses/${createdExpenseId}`);
      assert(expDel.status === 200 && expDel.json.success, 'DELETE /api/admin/expenses/:id deletes expense');
    }

    // Test 4: Upcoming Repayments Analytics
    console.log('\n--- 2. Testing Upcoming Repayments Analytics ---');
    const repayGet = await request('GET', '/api/admin/analytics/upcoming-repayments');
    assert(repayGet.status === 200 && repayGet.json.success, 'GET /api/admin/analytics/upcoming-repayments returns 200 and success');
    assert(repayGet.json.summary !== undefined, 'Repayments analytics contains summary metrics object');
    assert(typeof repayGet.json.summary.total_upcoming_repayments === 'number', 'Summary contains total_upcoming_repayments numeric figure');

    // Test 5: Executive Suite - Keep Notes
    console.log('\n--- 3. Testing Executive Suite Keep Notes ---');
    const notePost = await request('POST', '/api/admin/executive-suite/notes', {
      title: 'Board Meeting Q4',
      category: 'MEETING',
      content: '1. Review interest rates\n2. Field recovery in Uttara sector 7',
    });
    assert(notePost.status === 201 && notePost.json.success, 'POST /api/admin/executive-suite/notes creates note');
    const createdNoteId = notePost.json.note?.id;
    assert(createdNoteId, `Created note ID: ${createdNoteId}`);

    const noteGet = await request('GET', '/api/admin/executive-suite/notes');
    assert(noteGet.status === 200 && noteGet.json.success, 'GET /api/admin/executive-suite/notes returns 200');

    if (createdNoteId) {
      const noteDel = await request('DELETE', `/api/admin/executive-suite/notes/${createdNoteId}`);
      assert(noteDel.status === 200 && noteDel.json.success, 'DELETE /api/admin/executive-suite/notes/:id deletes note');
    }

    // Test 6: Executive Suite - Google Calendar Events
    console.log('\n--- 4. Testing Google Calendar Event Scheduler ---');
    const eventPost = await request('POST', '/api/admin/executive-suite/events', {
      title: 'Loan Disbursal Verification',
      event_date: '2026-09-25',
      event_time: '11:00',
      client_name: 'Tanvir Hossain',
      description: 'Review Smart NID documents in person',
    });
    assert(eventPost.status === 201 && eventPost.json.success, 'POST /api/admin/executive-suite/events creates calendar event');
    const createdEventId = eventPost.json.event?.id;
    assert(createdEventId, `Created event ID: ${createdEventId}`);

    const eventGet = await request('GET', '/api/admin/executive-suite/events');
    assert(eventGet.status === 200 && eventGet.json.success, 'GET /api/admin/executive-suite/events returns 200');

    if (createdEventId) {
      const eventDel = await request('DELETE', `/api/admin/executive-suite/events/${createdEventId}`);
      assert(eventDel.status === 200 && eventDel.json.success, 'DELETE /api/admin/executive-suite/events/:id deletes event');
    }

    // Test 7: Executive Suite - Alarms & Reminders
    console.log('\n--- 5. Testing Alarm Clock & Reminders ---');
    const alarmPost = await request('POST', '/api/admin/executive-suite/alarms', {
      time: '17:30',
      label: 'Evening loan collection tally',
    });
    assert(alarmPost.status === 201 && alarmPost.json.success, 'POST /api/admin/executive-suite/alarms creates alarm');
    const createdAlarmId = alarmPost.json.alarm?.id;
    assert(createdAlarmId, `Created alarm ID: ${createdAlarmId}`);

    const alarmGet = await request('GET', '/api/admin/executive-suite/alarms');
    assert(alarmGet.status === 200 && alarmGet.json.success, 'GET /api/admin/executive-suite/alarms returns 200');

    if (createdAlarmId) {
      const alarmDel = await request('DELETE', `/api/admin/executive-suite/alarms/${createdAlarmId}`);
      assert(alarmDel.status === 200 && alarmDel.json.success, 'DELETE /api/admin/executive-suite/alarms/:id deletes alarm');
    }

    console.log(`\n🎉 [PHASE 8 TESTS COMPLETED] Passed: ${passed}/${total}`);
    if (passed === total) {
      process.exit(0);
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error('💥 Test Suite Exception:', err);
    process.exit(1);
  }
}

runTests();
