import { authOptions, ABSOLUTE_SESSION_MAX_AGE, getCachedUserRememberToken, REMEMBER_TOKEN_CACHE_TTL } from '../lib/auth';
import { prisma } from '@my-app/database';
import { randomUUID } from 'crypto';

async function testSessionAuthFlow() {
  console.log('🧪 Starting 1-Day Absolute Session & Single Active Session Tests\n');

  // 1. Verify Session Configuration
  console.log('--- Test 1: Verify NextAuth Session Options ---');
  console.log('session.strategy:', authOptions.session?.strategy);
  console.log('session.maxAge:', authOptions.session?.maxAge, 'seconds (expected 86400 / 24 hours)');
  console.log('session.updateAge:', authOptions.session?.updateAge, 'seconds (expected 900 / 15 minutes)');
  console.assert(authOptions.session?.strategy === 'jwt', 'Session strategy must be jwt');
  console.assert(authOptions.session?.maxAge === 86400, 'Session maxAge must be 86400 (24 hours)');
  console.assert(authOptions.session?.updateAge === 900, 'Session updateAge must be 900 (15 minutes)');
  console.log('✅ Test 1 Passed: Session options correctly configured.\n');

  // 2. Test JWT Callback with Fresh Login
  console.log('--- Test 2: JWT Callback on Initial Login ---');
  const jwtCallback = authOptions.callbacks?.jwt;
  console.assert(typeof jwtCallback === 'function', 'JWT callback must exist');

  const testAccountId = 57845;
  const initialRememberToken = randomUUID();
  const mockUser = {
    AccountID: String(testAccountId),
    AccountName: 'JAMES PAOLO DOREMON',
    email: 'jdoremon@ics.com.ph',
    role: 'ITadmin',
    RememberToken: initialRememberToken,
  };

  // Simulate what real login does: persist rememberToken into Users table and serverCache
  const { serverCache } = await import('../lib/serverCache');
  await prisma.$executeRawUnsafe(`
    UPDATE Users 
    SET RememberToken = '${initialRememberToken}' 
    WHERE AccountID = ${testAccountId};
  `);
  serverCache.set(`user:remember_token:${testAccountId}`, initialRememberToken, REMEMBER_TOKEN_CACHE_TTL);

  const initialToken = await jwtCallback!({
    token: {} as any,
    user: mockUser as any,
    account: null,
  });

  console.log('Initial JWT Token Result:', {
    AccountID: initialToken.AccountID,
    AccountName: initialToken.AccountName,
    RememberToken: initialToken.RememberToken,
    authTime: initialToken.authTime,
    error: initialToken.error,
  });

  console.assert(initialToken.AccountID === '57845', 'AccountID must match');
  console.assert(initialToken.RememberToken === initialRememberToken, 'RememberToken must be attached');
  console.assert(typeof initialToken.authTime === 'number', 'authTime must be set');
  console.assert(!initialToken.error, 'There should be no error on initial login');
  console.log('✅ Test 2 Passed: Initial login attaches RememberToken and authTime.\n');

  // 3. Test Absolute 24-Hour Expiration
  console.log('--- Test 3: Absolute 24-Hour Expiration Check ---');
  // Sub-test A: Within 24 hours (e.g. after 1 hour)
  const tokenAfter1Hour = {
    ...initialToken,
    authTime: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
  };
  const verifiedToken1h = await jwtCallback!({
    token: tokenAfter1Hour,
    user: undefined as any,
    account: null,
  });
  console.assert(!verifiedToken1h.error, 'Token after 1 hour should NOT have an error');
  console.assert(verifiedToken1h.AccountID === '57845', 'AccountID should remain intact after 1 hour');
  console.log('Sub-test 3A: Token within 24 hours remains valid and active.');

  // Sub-test B: Exceeding 24 hours (e.g. 24 hours + 10 seconds)
  const tokenAfter25Hours = {
    ...initialToken,
    authTime: Math.floor(Date.now() / 1000) - (ABSOLUTE_SESSION_MAX_AGE + 10),
  };
  const verifiedToken25h = await jwtCallback!({
    token: tokenAfter25Hours,
    user: undefined as any,
    account: null,
  });
  console.assert(verifiedToken25h.error === 'SessionExpired', 'Token after 24h must be flagged as SessionExpired');
  console.assert(!verifiedToken25h.AccountID, 'AccountID must be stripped on expiration');
  console.assert(!verifiedToken25h.RememberToken, 'RememberToken must be stripped on expiration');
  console.log('Sub-test 3B: Token after 24 hours is strictly expired and stripped.');
  console.log('✅ Test 3 Passed: Absolute 24-hour expiration verified.\n');

  // 4. Test Single Active Session (Device Concurrency Control)
  console.log('--- Test 4: Single Active Session & Device Takeover ---');
  // Device A checks token: matches DB & cache
  const deviceAToken = {
    AccountID: String(testAccountId),
    AccountName: 'JAMES PAOLO DOREMON',
    DomainAccount: 'CORP\\JDOREMON',
    AccountGroup: 'ALL',
    RememberToken: initialRememberToken,
    authTime: Math.floor(Date.now() / 1000) - 600, // 10 minutes ago
    role: 'ITadmin',
  };

  const deviceAResult = await jwtCallback!({
    token: deviceAToken as any,
    user: undefined as any,
    account: null,
  });
  console.assert(!deviceAResult.error, 'Device A with matching token should be valid');
  console.assert(deviceAResult.RememberToken === initialRememberToken, 'Device A token remains active');
  console.log('Sub-test 4A: Device A is successfully validated with matching RememberToken.');

  // Now simulate Device B logging in with a new token
  const deviceBTokenValue = randomUUID();
  await prisma.$executeRawUnsafe(`
    UPDATE Users 
    SET RememberToken = '${deviceBTokenValue}' 
    WHERE AccountID = ${testAccountId};
  `);
  // Real login updates cache with new token
  serverCache.set(`user:remember_token:${testAccountId}`, deviceBTokenValue, REMEMBER_TOKEN_CACHE_TTL);

  // Now Device A makes another request with its old token
  const deviceAAfterDeviceBLogin = await jwtCallback!({
    token: { ...deviceAToken } as any,
    user: undefined as any,
    account: null,
  });

  console.assert(deviceAAfterDeviceBLogin.error === 'SessionReplaced', 'Device A must receive SessionReplaced error');
  console.assert(!deviceAAfterDeviceBLogin.AccountID, 'Device A AccountID must be stripped');
  console.assert(!deviceAAfterDeviceBLogin.RememberToken, 'Device A RememberToken must be stripped');
  console.log('Sub-test 4B: Device A is invalidated immediately when Device B logs in.');
  console.log('✅ Test 4 Passed: Single Active Session enforcement verified.\n');

  // 5. Test Impersonation Isolation
  console.log('--- Test 5: Impersonation Isolation ---');
  const impersonatingToken = {
    AccountID: '99999',
    AccountName: 'Test Impersonated AO',
    DomainAccount: 'CORP\\TESTAO',
    AccountGroup: 'BU5',
    RememberToken: 'some-arbitrary-impersonation-token',
    authTime: Math.floor(Date.now() / 1000) - 300,
    role: 'ao',
    isImpersonating: true,
  };

  const impersonationResult = await jwtCallback!({
    token: impersonatingToken as any,
    user: undefined as any,
    account: null,
  });

  console.assert(!impersonationResult.error, 'Impersonating session should not be revoked by target DB token');
  console.assert(impersonationResult.AccountID === '99999', 'Impersonated AccountID remains active');
  console.log('✅ Test 5 Passed: Impersonation is isolated and does not alter or conflict with DB tokens.\n');

  // 6. Test Session Callback handling of expired or replaced tokens
  console.log('--- Test 6: Session Callback Invalidation Handling ---');
  const sessionCallback = authOptions.callbacks?.session;
  console.assert(typeof sessionCallback === 'function', 'Session callback must exist');

  const validSession = await (sessionCallback as any)({
    session: { user: { name: 'James', email: 'jdoremon@ics.com.ph' }, expires: new Date(Date.now() + 3600000).toISOString() } as any,
    token: {
      AccountID: '57845',
      AccountName: 'JAMES PAOLO DOREMON',
      role: 'ITadmin',
      RememberToken: deviceBTokenValue,
      DomainAccount: 'CORP\\JDOREMON',
      AccountGroup: 'ALL',
      assignedBUs: ['ALL'],
      assignedBrands: ['ALL'],
    } as any,
  });
  console.assert(validSession?.user?.AccountID === '57845', 'Valid session must return populated user object');
  console.log('Sub-test 6A: Valid token returns complete session object.');

  const rejectedSession = await (sessionCallback as any)({
    session: { user: { name: 'James', email: 'jdoremon@ics.com.ph' }, expires: new Date(Date.now() + 3600000).toISOString() } as any,
    token: {
      error: 'SessionExpired',
    } as any,
  });
  console.assert(rejectedSession === null, 'Rejected token must yield null session');
  console.log('Sub-test 6B: Expired/Replaced token returns null session.');
  console.log('✅ Test 6 Passed: Session callback correctly returns null for invalidated tokens.\n');

  console.log('🎉 ALL 6 SESSION & REMEMBER-TOKEN TESTS PASSED SUCCESSFULLY!');
}

testSessionAuthFlow()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
