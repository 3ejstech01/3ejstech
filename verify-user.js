const bcrypt = require('bcryptjs');

const SUPABASE_URL = 'https://hgolghirpzvapgaiwogy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhnb2xnaGlycHp2YXBnYWl3b2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxOTI1NTQsImV4cCI6MjA5Mzc2ODU1NH0.3uDbO-B3H0M8EZ3YiLjR3pI5PpD42Y4PAmm2jnwcLUU';

async function verifyUser() {
  console.log('=== VERIFICATION TEST ===\n');

  const response = await fetch(`${SUPABASE_URL}/rest/v1/users?username=eq.ryan&select=id,username,password,role,createdat&limit=1`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  const data = await response.json();
  console.log('1. Query status:', response.status);
  console.log('2. User found:', data?.length > 0 ? 'YES' : 'NO');

  if (data && data.length > 0) {
    const user = data[0];
    console.log('3. Username:', user.username);
    console.log('4. Role:', user.role);
    console.log('5. Password hash length:', user.password?.length);
    console.log('6. Password hash starts with $2:', user.password?.startsWith('$2'));
    console.log('7. Password hash preview:', user.password?.substring(0, 20) + '...');

    console.log('\n=== PASSWORD VERIFICATION TEST ===');
    const testPassword = 'admin123';
    console.log('Testing password:', testPassword);

    const isValid = await bcrypt.compare(testPassword, user.password);
    console.log('8. bcrypt.compare result:', isValid);

    // Also try hashing and comparing
    const hash = await bcrypt.hash(testPassword, 12);
    console.log('9. New hash for comparison:', hash.substring(0, 20) + '...');
    console.log('10. New hash equals stored?', hash === user.password);

    if (!isValid) {
      console.log('\n!!! PASSWORD MISMATCH DETECTED !!!');
      console.log('The stored hash may be corrupted or the password was not updated correctly.');
    }
  } else {
    console.log('\n!!! USER NOT FOUND !!!');
    console.log('The ryan user does not exist in the database.');
  }
}

verifyUser().catch(console.error);