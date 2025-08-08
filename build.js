#!/usr/bin/env node

/**
 * Build verification script
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 DOCX Template Engine - Build Verification');
console.log('=============================================\n');

// Check if all required files exist
const requiredFiles = [
  'src/types/index.ts',
  'src/core/TemplateEngine.ts',
  'src/core/TemplateParser.ts',
  'src/core/DataProcessor.ts',
  'src/core/DocumentGenerator.ts',
  'src/formatters/index.ts',
  'src/utils/xml.ts',
  'src/utils/zip.ts',
  'src/utils/common.ts',
  'src/index.ts',
  'package.json',
  'tsconfig.json'
];

console.log('📁 Checking required files...');
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    process.exit(1);
  }
}

console.log('\n📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

console.log('\n🔨 Building TypeScript...');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.error('❌ TypeScript compilation failed');
  process.exit(1);
}

console.log('\n🏗️ Building project...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Project built successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

console.log('\n🧪 Running basic tests...');
try {
  // Check if dist folder was created
  if (fs.existsSync('dist')) {
    console.log('✅ Dist folder created');
  } else {
    throw new Error('Dist folder not found');
  }

  // Check if main files exist in dist
  const distFiles = ['index.js', 'index.d.ts'];
  for (const file of distFiles) {
    const filePath = path.join('dist', file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${filePath}`);
    } else {
      throw new Error(`${filePath} not found`);
    }
  }

  console.log('✅ All build artifacts created successfully');
} catch (error) {
  console.error('❌ Build verification failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 Build verification completed successfully!');
console.log('\nNext steps:');
console.log('- Run "npm run example" to test the engine');
console.log('- Run "npm test" to run the test suite');
console.log('- Check the examples/ directory for usage examples');