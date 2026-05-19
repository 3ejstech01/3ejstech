/**
 * verify-hash.mjs — Verify that a bcrypt hash matches the expected password
 */
import bcrypt from 'bcryptjs';

const PASSWORD = 'admin123';
const STORED_HASH = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lh4p.tVFybqN0P4K2';

console.log('Testing password:', PASSWORD);
console.log('Stored hash:', STORED_HASH);
console.log('Hash prefix:', STORED_HASH.substring(0, 4));

const match = await bcrypt.compare(PASSWORD, STORED_HASH);
console.log('bcrypt.compare result:', match);

// Generate a fresh hash for the same password
const freshHash = await bcrypt.hash(PASSWORD, 12);
console.log('\nFreshly generated hash:', freshHash);

const freshMatch = await bcrypt.compare(PASSWORD, freshHash);
console.log('Fresh hash verification:', freshMatch);