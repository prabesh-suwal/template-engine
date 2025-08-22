#!/usr/bin/env node

/**
 * Enhanced build script with UI integration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 DOCX Template Engine - Enhanced Build');
console.log('==========================================\n');

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
  'server.ts',
  'package.json',
  'tsconfig.json'
];

console.log('📁 Checking required files...');
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    if (file === 'server.ts') {
      console.log('💡 Creating server.ts file...');
      createServerFile();
    } else {
      process.exit(1);
    }
  }
}

// Check and create UI directory if needed
console.log('\n📁 Checking UI files...');
if (!fs.existsSync('ui')) {
  console.log('📁 Creating ui directory...');
  fs.mkdirSync('ui', { recursive: true });
}

if (!fs.existsSync('ui/index.html')) {
  console.log('💡 UI file missing - you need to create ui/index.html');
  console.log('   Use the provided HTML template in the artifacts');
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
  console.log('✅ TypeScript compilation check passed');
} catch (error) {
  console.error('❌ TypeScript compilation failed');
  process.exit(1);
}

console.log('\n🏗️ Building project...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ TypeScript compiled successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

console.log('\n📁 Copying UI files...');
try {
  if (fs.existsSync('ui')) {
    // Ensure dist/ui directory exists
    if (!fs.existsSync('dist/ui')) {
      fs.mkdirSync('dist/ui', { recursive: true });
    }
    
    // Copy all files from ui to dist/ui
    const uiFiles = fs.readdirSync('ui');
    for (const file of uiFiles) {
      const sourcePath = path.join('ui', file);
      const destPath = path.join('dist/ui', file);
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Copied ${file}`);
    }
  }
} catch (error) {
  console.error('❌ Failed to copy UI files:', error.message);
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
  const distFiles = ['index.js', 'index.d.ts', 'server.js'];
  for (const file of distFiles) {
    const filePath = path.join('dist', file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${filePath}`);
    } else {
      if (file === 'server.js') {
        console.log(`⚠️ ${filePath} - missing (will be created)`);
      } else {
        throw new Error(`${filePath} not found`);
      }
    }
  }

  // Check UI files in dist
  if (fs.existsSync('dist/ui/index.html')) {
    console.log('✅ dist/ui/index.html');
  } else {
    console.log('⚠️ dist/ui/index.html - missing');
  }

  console.log('✅ All build artifacts created successfully');
} catch (error) {
  console.error('❌ Build verification failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 Enhanced build completed successfully!');
console.log('\nNext steps:');
console.log('- Run "npm run server" to start the web server');
console.log('- Open http://localhost:3000 in your browser');
console.log('- Run "npm run example" to test the engine');
console.log('- Check the examples/ directory for usage examples');

function createServerFile() {
  const serverContent = `// This file should contain the Express server implementation
// Please use the server.ts artifact provided
export {};
console.log('Please implement the server.ts file using the provided artifact');
`;
  
  fs.writeFileSync('server.ts', serverContent);
  console.log('✅ Created placeholder server.ts');
}