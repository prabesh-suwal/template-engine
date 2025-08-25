// test-unicode.ts - Test Unicode character handling

import { BuiltInFormatters } from './src/formatters';

console.log('🔍 UNICODE FORMATTER TESTS');
console.log('==========================\n');

// Test different character sets
const testCases = [
  {
    name: 'English only',
    value: 'bank',
    formatter: 'ifEqual(\'bank\', \'yes\', \'no\')'
  },
  {
    name: 'Simple Nepali',  
    value: 'bank',
    formatter: 'ifEqual(\'bank\', \'हो\', \'होइन\')'
  },
  {
    name: 'Full Nepali phrase',
    value: 'bank', 
    formatter: 'ifEqual(\'bank\', \'यो बैंक हो\', \'यो बैंक होइन\')'
  },
  {
    name: 'Mixed quotes',
    value: 'bank',
    formatter: 'ifEqual("bank", "यो बैंक हो", "यो बैंक होइन")'
  },
  {
    name: 'No quotes (raw)',
    value: 'bank',
    formatter: 'ifEqual(bank, यो_बैंक_हो, यो_बैंक_होइन)'
  }
];

testCases.forEach((test, index) => {
  console.log(`${index + 1}. Testing: ${test.name}`);
  console.log(`   Value: "${test.value}"`);
  console.log(`   Formatter: ${test.formatter}`);
  
  try {
    const result = BuiltInFormatters.formatValue(test.value, test.formatter);
    console.log(`   ✅ Result: "${result}"`);
  } catch (error) {

    
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  console.log('');
});

// Test the parsing specifically
console.log('🔍 PARSING TESTS');
console.log('================\n');

const parseTests = [
  'ifEqual(\'bank\', \'yes\', \'no\')',
  'ifEqual(\'bank\', \'यो बैंक हो\', \'यो बैंक होइन\')',
  'ifEqual("bank", "यो बैंक हो", "यो बैंक होइन")',
  'ifEqual(bank, यो_बैंक_हो, यो_बैंक_होइन)'
];

parseTests.forEach((formatterStr, index) => {
  console.log(`${index + 1}. Parsing: ${formatterStr}`);
  try {
    const parsed = BuiltInFormatters.parseFormatterArgs(formatterStr);
    console.log(`   ✅ Parsed:`, parsed);
  } catch (error) {
    console.log(`   ❌ Parse Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  console.log('');
});