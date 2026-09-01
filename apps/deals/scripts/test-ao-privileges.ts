import {
  buildAOScopingConditions,
  buildBUScopingConditions,
  isDealAccessibleByUser,
} from '../lib/roles';

function runTests() {
  console.log('--- Starting AO Role Privileges & Scoping Tests ---\n');

  let passed = 0;
  let failed = 0;

  function assert(description: string, condition: boolean) {
    if (condition) {
      console.log(`[PASS] ${description}`);
      passed++;
    } else {
      console.error(`[FAIL] ${description}`);
      failed++;
    }
  }

  // 1. AO matching tests
  const aoUser = {
    role: 'ao',
    accountName: 'Abegail Cebujano',
    domainAccount: 'CORP\\ACEBUJANO',
    email: 'acebujano@ics.com.ph',
  };

  const ownDealAssigned = {
    dealID: 101,
    AssignedAO: 'ABEGAIL CEBUJANO',
    createdBy: 'CORP\\JECK DUHAYLUNGSOD',
    BU: 'BU5',
  };

  const ownDealCreated = {
    dealID: 102,
    AssignedAO: '',
    createdBy: 'CORP\\ACEBUJANO',
    BU: 'BU5',
  };

  const otherDeal = {
    dealID: 103,
    AssignedAO: 'Dan Lemuel Ramos',
    createdBy: 'CORP\\DRAMOS',
    BU: 'BU5',
  };

  assert(
    'AO can access deal where AssignedAO matches their name (case-insensitive)',
    isDealAccessibleByUser(ownDealAssigned, aoUser) === true
  );

  assert(
    'AO can access deal where createdBy matches their domain account',
    isDealAccessibleByUser(ownDealCreated, aoUser) === true
  );

  assert(
    'AO CANNOT access deal assigned to another AO',
    isDealAccessibleByUser(otherDeal, aoUser) === false
  );

  // 2. BU Head tests
  const buHeadUser = {
    role: 'bu',
    accountName: 'FLORDELIZA RICAFLANCA',
    assignedBUs: ['BU5'],
  };

  const bu8Deal = {
    dealID: 201,
    AssignedAO: 'CELINA ORNUM',
    createdBy: 'CORP\\CORNUM',
    BU: 'BU8',
  };

  assert(
    'BU5 Head can access deal in BU5',
    isDealAccessibleByUser(ownDealAssigned, buHeadUser) === true
  );

  assert(
    'BU5 Head CANNOT access deal in BU8',
    isDealAccessibleByUser(bu8Deal, buHeadUser) === false
  );

  // 3. Multi-BU Head tests
  const multiBuUser = {
    role: 'bu',
    accountName: 'SHIELA MARIE PEÑALOSA-MARCELO',
    assignedBUs: ['BU8', 'BU12', 'CE01'],
  };

  const ce01Deal = {
    dealID: 301,
    AssignedAO: 'CELINA ORNUM',
    createdBy: 'CORP\\CORNUM',
    BU: 'CE01',
  };

  const bu12Deal = {
    dealID: 302,
    AssignedAO: 'CELINA ORNUM',
    createdBy: 'CORP\\CORNUM',
    BU: 'BU12',
  };

  assert('Multi-BU Head can access BU8 deal', isDealAccessibleByUser(bu8Deal, multiBuUser) === true);
  assert('Multi-BU Head can access CE01 deal', isDealAccessibleByUser(ce01Deal, multiBuUser) === true);
  assert('Multi-BU Head can access BU12 deal', isDealAccessibleByUser(bu12Deal, multiBuUser) === true);
  assert('Multi-BU Head CANNOT access BU5 deal', isDealAccessibleByUser(ownDealAssigned, multiBuUser) === false);

  // 4. Admin & Sales AA tests
  const adminUser = {
    role: 'admin',
    accountName: 'ADELIANA SY-LU',
  };

  const aaUser = {
    role: 'aa',
    accountName: 'ATHENA BEATRICE FRANCISCO',
  };

  assert('Admin can access any deal', isDealAccessibleByUser(otherDeal, adminUser) === true);
  assert('Sales AA can access any deal', isDealAccessibleByUser(otherDeal, aaUser) === true);

  // 5. Product Manager (PM) Brand Scoping tests
  const pmUser = {
    role: 'pm',
    accountName: 'JOSE LEONARDO MEDINA',
    assignedBrands: ['DELL', 'HPI', 'HPE'],
  };

  const dellDeal = {
    dealID: 401,
    brand: 'DELL Technologies PowerEdge',
    BU: 'BU2',
  };

  const hpeDeal = {
    dealID: 6537,
    brand: 'HPeHCL ARUBA Project',
    BU: 'BU2',
  };

  const ciscoDeal = {
    dealID: 402,
    brand: 'CISCO Meraki Switch',
    BU: 'BU2',
  };

  assert('PM can access assigned DELL deal', isDealAccessibleByUser(dellDeal, pmUser) === true);
  assert('PM can access assigned HPE deal (deal #6537)', isDealAccessibleByUser(hpeDeal, pmUser) === true);
  assert('PM CANNOT access unassigned CISCO deal', isDealAccessibleByUser(ciscoDeal, pmUser) === false);

  // 6. Prisma scoping conditions builder tests
  const aoScoping = buildAOScopingConditions('Dan Lemuel Ramos', 'CORP\\DRAMOS', 'dramos@ics.com.ph');
  assert('AO Scoping conditions array is non-empty', Array.isArray(aoScoping) && aoScoping.length > 0);
  assert(
    'AO Scoping conditions contain AssignedAO and createdBy checks',
    aoScoping.some((c) => c.AssignedAO !== undefined) &&
    aoScoping.some((c) => c.createdBy !== undefined)
  );

  const buScoping = buildBUScopingConditions(['BU8', 'BU12', 'CE01']);
  assert('BU Scoping conditions array is non-empty', Array.isArray(buScoping) && buScoping.length > 0);
  assert(
    'BU Scoping conditions contain all assigned BUs',
    buScoping.some((c) => c.BU === 'BU8') &&
    buScoping.some((c) => c.BU === 'BU12') &&
    buScoping.some((c) => c.BU === 'CE01')
  );

  console.log(`\n--- Test Summary: ${passed} Passed, ${failed} Failed ---`);
  if (failed > 0) process.exit(1);
}

runTests();
