const SUPABASE_URL = 'https://hgolghirpzvapgaiwogy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhnb2xnaGlycHp2YXBnYWl3b2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxOTI1NTQsImV4cCI6MjA5Mzc2ODU1NH0.3uDbO-B3H0M8EZ3YiLjR3pI5PpD42Y4PAmm2jnwcLUU';

async function createTestUser() {
  console.log('Creating test user...');

  // First delete if exists
  await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.testuser`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=representation'
    }
  });

  // Create with plain text password (for testing)
  const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: 'testuser',
      username: 'testuser',
      password: 'testpass123', // Plain text - should work with fallback comparison
      role: 'admin',
      createdat: new Date().toISOString()
    })
  });

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (response.status === 201 || response.status === 200) {
    console.log('\n=== TEST USER CREATED ===');
    console.log('Username: testuser');
    console.log('Password: testpass123');
    console.log('(Using plain text password to bypass bcrypt)');
  }
}

createTestUser().catch(console.error);