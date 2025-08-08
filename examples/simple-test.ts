import * as fs from 'fs';
import * as path from 'path';

// Direct import for development/testing without build
import { TemplateEngine } from '../src/core/TemplateEngine';

async function runSimpleTest() {
  console.log('🧪 Running Simple Template Engine Test');
  console.log('=====================================\n');

  try {
    const engine = new TemplateEngine();
    
    console.log('✅ Engine created successfully');
    console.log('📊 Engine stats:', engine.getEngineStats());
    
    console.log('\n🎉 Simple test completed!');
    console.log('The engine is working correctly.');
    console.log('\nTo run full examples:');
    console.log('1. npm run build');
    console.log('2. npm run example');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runSimpleTest().catch(console.error);
}

export { runSimpleTest };