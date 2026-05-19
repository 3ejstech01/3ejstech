/**
 * test-crud.mjs — Comprehensive CRUD test for 3EJS Tech Supabase database
 *
 * Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... node test-crud.mjs
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hgolghirpzvapgaiwogy.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhnb2xnaGlycHp2YXBnYWl3b2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxOTI1NTQsImV4cCI6MjA5Mzc2ODU1NH0.3uDbO-B3H0M8EZ3YiLjR3pI5PpD42Y4PAmm2jnwcLUU';

const HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    console.log(`✅ PASS: ${testName}`);
  } else {
    failed++;
    console.error(`❌ FAIL: ${testName} — ${details}`);
  }
}

async function fetchGET(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: HEADERS });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

async function fetchPOST(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST', headers: HEADERS, body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

async function fetchPATCH(path, filters, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}?${filters}`, {
    method: 'PATCH', headers: HEADERS, body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

async function fetchDELETE(path, filters) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}?${filters}`, {
    method: 'DELETE', headers: HEADERS,
  });
  return { ok: res.ok, status: res.status };
}

let testNum = 0;

// =====================================================================
// INSTALLATIONS CRUD
// =====================================================================
console.log('\n═══════════════════════════════════════════════════');
console.log('  INSTALLATIONS (SUBSCRIBERS) CRUD TESTS');
console.log('═══════════════════════════════════════════════════\n');

async function testInstallations() {
  const instId = `INST-TEST-${Date.now()}`;
  const newInst = {
    id: instId,
    no: 'CRUD-001',
    dateinstalled: '2026-05-09',
    agentname: '3EJS Test Agent',
    jonumber: `JO-CRUD-${Date.now()}`,
    accountnumber: 'CRUD-1001',
    subsname: 'CRUD Test Subscriber',
    contact1: '09123456789',
    contact2: '09123456788',
    address: '123 Test St, Test City',
    technician: 'Test Technician',
    status: 'pending',
    createdat: new Date().toISOString(),
    updatedat: new Date().toISOString(),
  };

  // CREATE
  testNum++;
  const c1 = await fetchPOST('installations', newInst);
  assert(c1.ok, `Test ${testNum}: CREATE Installation`,
    `HTTP ${c1.status}: ${JSON.stringify(c1.data || c1).substring(0, 200)}`);

  // READ
  testNum++;
  const r1 = await fetchGET(`installations?id=eq.${encodeURIComponent(instId)}&select=id,subsname,status`);
  assert(r1.ok && r1.data.length === 1 && r1.data[0].subsname === 'CRUD Test Subscriber',
    `Test ${testNum}: READ Installation`,
    r1.data ? `${r1.data.length} records` : r1.status);

  // UPDATE
  testNum++;
  const u1 = await fetchPATCH('installations', `id=eq.${encodeURIComponent(instId)}`,
    { subsname: 'CRUD Updated Subscriber', status: 'completed' });
  assert(u1.ok && Array.isArray(u1.data) && u1.data.length > 0,
    `Test ${testNum}: UPDATE Installation`,
    `HTTP ${u1.status}: ${JSON.stringify(u1.data).substring(0, 200)}`);

  // VERIFY UPDATE
  testNum++;
  const r2 = await fetchGET(`installations?id=eq.${encodeURIComponent(instId)}&select=id,subsname,status`);
  assert(r2.ok && r2.data.length === 1 && r2.data[0].subsname === 'CRUD Updated Subscriber' && r2.data[0].status === 'completed',
    `Test ${testNum}: VERIFY UPDATE`,
    r2.data ? JSON.stringify(r2.data[0]) : r2.status);

  // DELETE
  testNum++;
  const d1 = await fetchDELETE('installations', `id=eq.${encodeURIComponent(instId)}`);
  assert(d1.ok, `Test ${testNum}: DELETE Installation`, `HTTP ${d1.status}`);

  // VERIFY DELETE
  testNum++;
  const r3 = await fetchGET(`installations?id=eq.${encodeURIComponent(instId)}`);
  assert(r3.ok && r3.data.length === 0,
    `Test ${testNum}: VERIFY DELETE (GONE)`,
    `${r3.data?.length || '?'} records remain`);
}

// =====================================================================
// E-LOAD CRUD
// =====================================================================
console.log('\n═══════════════════════════════════════════════════');
console.log('  E-LOAD TRANSACTIONS CRUD TESTS');
console.log('═══════════════════════════════════════════════════\n');

async function testEload() {
  const elId = `EL-TEST-${Date.now()}`;
  const newEload = {
    id: elId,
    gcashhandler: '09123456789',
    dateloaded: '2026-05-09',
    timeloaded: '10:30:00',
    gcashreference: `GC-TEST-${Date.now()}`,
    amount: 500,
    accountnumber: 'EL-CRUD-1001',
    markup: 19,
    incentive: 14,
    retailer: 8,
    dealer: 6,
    remarks: 'CRUD test',
    createdat: new Date().toISOString(),
    updatedat: new Date().toISOString(),
  };

  // CREATE
  testNum++;
  const c1 = await fetchPOST('eload', newEload);
  assert(c1.ok, `Test ${testNum}: CREATE E-Load`,
    `HTTP ${c1.status}: ${JSON.stringify(c1.data || c1).substring(0, 200)}`);

  // READ
  testNum++;
  const r1 = await fetchGET(`eload?id=eq.${encodeURIComponent(elId)}&select=id,amount,gcashhandler`);
  assert(r1.ok && r1.data.length === 1 && r1.data[0].amount === 500,
    `Test ${testNum}: READ E-Load`,
    r1.data ? `${r1.data.length} records` : r1.status);

  // UPDATE
  testNum++;
  const u1 = await fetchPATCH('eload', `id=eq.${encodeURIComponent(elId)}`,
    { amount: 700, remarks: 'Updated CRUD test' });
  assert(u1.ok && Array.isArray(u1.data) && u1.data.length > 0,
    `Test ${testNum}: UPDATE E-Load`,
    `HTTP ${u1.status}: ${JSON.stringify(u1.data).substring(0, 200)}`);

  // VERIFY UPDATE
  testNum++;
  const r2 = await fetchGET(`eload?id=eq.${encodeURIComponent(elId)}&select=id,amount,remarks`);
  assert(r2.ok && r2.data[0]?.amount === 700,
    `Test ${testNum}: VERIFY E-Load UPDATE`,
    r2.data ? JSON.stringify(r2.data[0]) : r2.status);

  // DELETE
  testNum++;
  const d1 = await fetchDELETE('eload', `id=eq.${encodeURIComponent(elId)}`);
  assert(d1.ok, `Test ${testNum}: DELETE E-Load`, `HTTP ${d1.status}`);

  // VERIFY DELETE
  testNum++;
  const r3 = await fetchGET(`eload?id=eq.${encodeURIComponent(elId)}`);
  assert(r3.ok && r3.data.length === 0,
    `Test ${testNum}: VERIFY E-Load DELETE`,
    `${r3.data?.length || '?'} records remain`);
}

// =====================================================================
// USERS CRUD (non-admin user)
// =====================================================================
console.log('\n═══════════════════════════════════════════════════');
console.log('  USERS CRUD TESTS');
console.log('═══════════════════════════════════════════════════\n');

async function testUsers() {
  const testUname = `crudtest_${Date.now()}`;
  const hashedPw = '$2b$12$QijDQOe.Qw9FMhlVWtJNnu7m.uSSYt6JX0uACayU3F/gye0OKEhr.';
  const newUser = {
    id: testUname,
    username: testUname,
    password: hashedPw,
    role: 'view_only',
    createdat: new Date().toISOString(),
  };

  // CREATE
  testNum++;
  const c1 = await fetchPOST('users', newUser);
  assert(c1.ok, `Test ${testNum}: CREATE User`,
    `HTTP ${c1.status}: ${JSON.stringify(c1.data || c1).substring(0, 200)}`);

  // READ
  testNum++;
  const r1 = await fetchGET(`users?username=eq.${encodeURIComponent(testUname)}&select=id,username,role`);
  assert(r1.ok && r1.data.length === 1 && r1.data[0].role === 'view_only',
    `Test ${testNum}: READ User`,
    r1.data ? `${r1.data.length} records` : r1.status);

  // UPDATE
  testNum++;
  const u1 = await fetchPATCH('users', `username=eq.${encodeURIComponent(testUname)}`,
    { role: 'technician' });
  assert(u1.ok && Array.isArray(u1.data) && u1.data.length > 0,
    `Test ${testNum}: UPDATE User Role`,
    `HTTP ${u1.status}: ${JSON.stringify(u1.data).substring(0, 200)}`);

  // VERIFY UPDATE
  testNum++;
  const r2 = await fetchGET(`users?username=eq.${encodeURIComponent(testUname)}&select=username,role`);
  assert(r2.ok && r2.data[0]?.role === 'technician',
    `Test ${testNum}: VERIFY User UPDATE`,
    r2.data ? JSON.stringify(r2.data[0]) : r2.status);

  // DELETE
  testNum++;
  const d1 = await fetchDELETE('users', `id=eq.${encodeURIComponent(testUname)}`);
  assert(d1.ok, `Test ${testNum}: DELETE User`, `HTTP ${d1.status}`);

  // VERIFY DELETE
  testNum++;
  const r3 = await fetchGET(`users?username=eq.${encodeURIComponent(testUname)}`);
  assert(r3.ok && r3.data.length === 0,
    `Test ${testNum}: VERIFY User DELETE`,
    `${r3.data?.length || '?'} records remain`);
}

// =====================================================================
// FILTERING TESTS
// =====================================================================
console.log('\n═══════════════════════════════════════════════════');
console.log('  ADVANCED QUERY TESTS');
console.log('═══════════════════════════════════════════════════\n');

async function testFilters() {
  const id1 = `INST-F1-${Date.now()}`;
  const id2 = `INST-F2-${Date.now()}`;

  await fetchPOST('installations', {
    id: id1, no: 'F1', subsname: 'Alpha Customer', accountnumber: 'FLT-1001',
    status: 'pending', agentname: 'Test', createdat: new Date().toISOString(), updatedat: new Date().toISOString(),
  });
  await fetchPOST('installations', {
    id: id2, no: 'F2', subsname: 'Beta Customer', accountnumber: 'FLT-1002',
    status: 'completed', agentname: 'Test', createdat: new Date().toISOString(), updatedat: new Date().toISOString(),
  });

  testNum++;
  const f1 = await fetchGET(`installations?status=eq.pending&select=id,subsname`);
  const hasPending = f1.data.some(r => r.id === id1);
  assert(hasPending, `Test ${testNum}: FILTER by status=pending`,
    `Found ${f1.data?.length || 0} pending records`);

  testNum++;
  const f2 = await fetchGET(`installations?accountnumber=eq.FLT-1002&select=id,subsname`);
  assert(f2.data.length === 1 && f2.data[0].subsname === 'Beta Customer',
    `Test ${testNum}: FILTER by accountnumber`,
    `${f2.data.length} records`);

  await fetchDELETE('installations', `id=eq.${encodeURIComponent(id1)}`);
  await fetchDELETE('installations', `id=eq.${encodeURIComponent(id2)}`);
}

// =====================================================================
// ORDER & LIMIT TESTS
// =====================================================================
console.log('\n═══════════════════════════════════════════════════');
console.log('  ORDER & LIMIT TESTS');
console.log('═══════════════════════════════════════════════════\n');

async function testOrderLimit() {
  const ids = [];
  for (let i = 0; i < 3; i++) {
    const id = `INST-OL-${Date.now()}-${i}`;
    ids.push(id);
    await fetchPOST('installations', {
      id, no: `OL-${i}`, subsname: `User ${String.fromCharCode(65 + i)}`,
      accountnumber: `OL-${1000 + i}`, status: 'pending', agentname: 'Test',
      createdat: new Date().toISOString(), updatedat: new Date().toISOString(),
    });
  }

  testNum++;
  const ordered = await fetchGET(`installations?select=id,subsname&order=subsname.asc`);
  assert(ordered.ok && ordered.data.length >= 3,
    `Test ${testNum}: ORDER BY subsname ASC`,
    `Got ${ordered.data?.length || 0} records`);

  testNum++;
  const limited = await fetchGET(`installations?select=id&limit=1`);
  assert(limited.ok && limited.data.length === 1,
    `Test ${testNum}: LIMIT 1`,
    `Got ${limited.data?.length || 0} records`);

  for (const id of ids) {
    await fetchDELETE('installations', `id=eq.${encodeURIComponent(id)}`);
  }
}

// =====================================================================
// RUN ALL
// =====================================================================
async function runAll() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   3EJS Tech — Supabase CRUD Test Suite               ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  try {
    await testInstallations();
    await testEload();
    await testUsers();
    await testFilters();
    await testOrderLimit();
  } catch (err) {
    console.error('\n⛔ FATAL ERROR:', err.message);
    console.error(err.stack);
    failed++;
  }

  const total = passed + failed;
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed}/${total} tests passed`);
  if (failed > 0) {
    console.log(`  ❌ ${failed} FAILED`);
    process.exit(1);
  } else {
    console.log('  🎉 ALL TESTS PASSED');
  }
  console.log('═══════════════════════════════════════════════════\n');
}

runAll();