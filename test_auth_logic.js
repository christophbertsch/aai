



const { mockLogin, mockGetTaxCases } = require('./buhl-client/src/services/mockApi');

async function testAuthFlow() {
  console.log('Testing authentication flow...');

  // Test login
  try {
    const user = await mockLogin('test', 'password');
    console.log('✓ Login successful:', user);

    // Test getTaxCases
    const taxCases = await mockGetTaxCases();
    console.log('✓ Tax cases loaded:', taxCases);

    console.log('All tests passed!');
  } catch (error) {
    console.error('✗ Test failed:', error);
  }
}

testAuthFlow();



