// quick-test.ts - Quick test for your specific issue

import { BuiltInFormatters } from './src/formatters';

console.log('🔥 QUICK FORMATTER TEST');
console.log('=====================\n');

// Test data matching your issue
const testData = {
  lender: {
    name: 'नेपाल बैंक लिमिटेड',
    type: 'bank'
  },
  loan: {
    principalAmount: 1500000
  }
};

// Test the exact formatters from your issue
console.log('📋 Testing your exact problematic formatters:\n');

// 1. Test ifEqual
console.log('1️⃣ Testing ifEqual:');
console.log(`   Input: "${testData.lender.type}"`);
console.log(`   Formatter: ifEqual('bank', 'यो बैंक हो', 'यो बैंक होइन')`);
try {
  const result1 = BuiltInFormatters.formatValue(testData.lender.type, 'ifEqual(\'bank\', \'यो बैंक हो\', \'यो बैंक होइन\')');
  console.log(`   ✅ Result: "${result1}"`);
} catch (error) {
  console.log(`   ❌ Error:`, error);
}
console.log('');

// 2. Test switch
console.log('2️⃣ Testing switch:');
console.log(`   Input: "${testData.lender.type}"`);
console.log(`   Formatter: switch('bank', '🏦 बैंक', 'microfinance', '🏪 माइक्रो', '❓ अन्य')`);
try {
  const result2 = BuiltInFormatters.formatValue(testData.lender.type, 'switch(\'bank\', \'🏦 बैंक\', \'microfinance\', \'🏪 माइक्रो\', \'❓ अन्य\')');
  console.log(`   ✅ Result: "${result2}"`);
} catch (error) {
  console.log(`   ❌ Error:`, error);
}
console.log('');

// 3. Test ifBetween
console.log('3️⃣ Testing ifBetween:');
console.log(`   Input: ${testData.loan.principalAmount}`);
console.log(`   Formatter: ifBetween(1000000, 2000000, 'मध्यम ऋण', 'अन्य')`);
try {
  const result3 = BuiltInFormatters.formatValue(testData.loan.principalAmount, 'ifBetween(1000000, 2000000, \'मध्यम ऋण\', \'अन्य\')');
  console.log(`   ✅ Result: "${result3}"`);
} catch (error) {
  console.log(`   ❌ Error:`, error);
}
console.log('');

// 4. Test using applyFormatters method (this is what the engine actually uses)
console.log('4️⃣ Testing applyFormatters method (engine method):');
try {
  const engineResult1 = BuiltInFormatters.applyFormatters(testData.lender.type, ['ifEqual(\'bank\', \'यो बैंक हो\', \'यो बैंक होइन\')']);
  console.log(`   ifEqual engine result:`, engineResult1);
  
  const engineResult2 = BuiltInFormatters.applyFormatters(testData.lender.type, ['switch(\'bank\', \'🏦 बैंक\', \'microfinance\', \'🏪 माइक्रो\', \'❓ अन्य\')']);
  console.log(`   switch engine result:`, engineResult2);
  
  const engineResult3 = BuiltInFormatters.applyFormatters(testData.loan.principalAmount, ['ifBetween(1000000, 2000000, \'मध्यम ऋण\', \'अन्य\')']);
  console.log(`   ifBetween engine result:`, engineResult3);
} catch (error) {
  console.log(`   ❌ Engine method error:`, error);
}

console.log('\n🎯 Expected vs Actual:');
console.log('Expected output for your template:');
console.log(`Basic: नेपाल बैंक लिमिटेड`);
console.log(`Test ifEqual: यो बैंक हो`);
console.log(`Test switch: 🏦 बैंक`);
console.log(`Test ifBetween: मध्यम ऋण`);

console.log('\n💡 If these tests pass but your template still shows literal tags,');
console.log('   the issue might be in template parsing or tag replacement.');
console.log('   Run the debug-formatters.ts script for full engine testing.');