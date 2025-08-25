// inspect-data-structure.ts - Check your current data2.json structure

import * as fs from 'fs';

function inspectDataStructure() {
  console.log('🔍 INSPECTING DATA STRUCTURE');
  console.log('============================\n');

  try {
    const dataPath = './data2.json';
    
    if (!fs.existsSync(dataPath)) {
      console.log(`❌ Data file not found: ${dataPath}`);
      return;
    }

    const jsonData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`✅ Loaded: ${dataPath}\n`);

    // Test the specific paths that your template is looking for
    const testPaths = [
      'data.lender.type',
      'data.lender.name', 
      'data.loan.principalAmount',
      'data.bank.nameNepali',
      'lender.type',        // Alternative structure
      'lender.name',        // Alternative structure
      'loan.principalAmount' // Alternative structure
    ];

    console.log('🧪 TESTING TEMPLATE PATHS:');
    console.log('==========================\n');

    testPaths.forEach((path, index) => {
      const value = getNestedValue(jsonData, path);
      const exists = value !== undefined;
      console.log(`${index + 1}. ${path}: ${exists ? '✅' : '❌'} ${exists ? `"${value}"` : 'NOT FOUND'}`);
    });

    console.log('\n📊 CURRENT DATA STRUCTURE:');
    console.log('==========================\n');
    
    // Show the top-level structure
    console.log('Top-level keys:', Object.keys(jsonData));
    
    // Show structure tree
    console.log('\nStructure tree:');
    printObjectStructure(jsonData, '', 0, 3);

    console.log('\n🔧 SUGGESTED FIXES:');
    console.log('==================\n');

    // Check if data is already nested under "data"
    if (jsonData.data) {
      console.log('✅ Data is already nested under "data" key');
      
      // Check for missing lender properties
      if (jsonData.data.lender) {
        const lenderKeys = Object.keys(jsonData.data.lender);
        console.log(`   Lender properties: ${lenderKeys.join(', ')}`);
        
        if (!lenderKeys.includes('type')) {
          console.log('   ❌ Missing: data.lender.type');
          console.log('   💡 Add: "type": "bank" to data.lender');
        }
      } else {
        console.log('   ❌ Missing: data.lender object');
        console.log('   💡 Add entire lender object to data');
      }
    } else {
      console.log('❌ Data is not nested under "data" key');
      console.log('💡 Wrap your entire JSON in a "data" object:');
      console.log('   { "data": { /* your current JSON */ } }');
    }

  } catch (error) {
    console.error('❌ Failed to inspect data:', error);
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

function printObjectStructure(obj: any, prefix: string = '', depth: number = 0, maxDepth: number = 3): void {
  if (depth >= maxDepth) {
    console.log(`${prefix}... (truncated)`);
    return;
  }

  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const keys = Object.keys(obj);
    keys.slice(0, 10).forEach((key, index) => {
      const isLast = index === Math.min(keys.length - 1, 9);
      const connector = isLast ? '└── ' : '├── ';
      const value = obj[key];
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        console.log(`${prefix}${connector}${key}/`);
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        printObjectStructure(value, newPrefix, depth + 1, maxDepth);
      } else if (Array.isArray(value)) {
        console.log(`${prefix}${connector}${key}[] (${value.length} items)`);
      } else {
        const displayValue = typeof value === 'string' && value.length > 30 
          ? value.substring(0, 30) + '...' 
          : value;
        console.log(`${prefix}${connector}${key}: ${JSON.stringify(displayValue)}`);
      }
    });
    
    if (keys.length > 10) {
      console.log(`${prefix}... and ${keys.length - 10} more properties`);
    }
  }
}

inspectDataStructure();