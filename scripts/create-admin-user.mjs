/**
 * create-admin-user.mjs
 *
 * Run this script to create an initial admin user in Supabase.
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... node create-admin-user.mjs <username> <password> [role]
 */

import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hgolghirpzvapgaiwogy.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhnb2xnaGlycHp2YXBnYWl3b2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxOTI1NTQsImV4cCI6MjA5Mzc2ODU1NH0.3uDbO-B3H0M8EZ3YiLjR3pI5PpD42Y4PAmm2jnwcLUU';

async function main() {
  const username = process.argv[2] || 'ryan';
  const password = process.argv[3] || 'ryan123';
  const role = process.argv[4] || 'admin';

  if (!username || !password) {
    console.error('Usage: node create-admin-user.mjs <username> <password> [role]');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const userRecord = {
    id: username,
    username: username,
    password: hashedPassword,
    role: role,
  };

  console.log(`Creating admin user: ${username} with role: ${role}`);

  const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(userRecord),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error(`Failed: ${response.status} ${response.statusText}`);
    console.error(JSON.stringify(error, null, 2));
    process.exit(1);
  }

  const data = await response.json();
  console.log('User created successfully!');
  console.log(JSON.stringify(data, null, 2));
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});