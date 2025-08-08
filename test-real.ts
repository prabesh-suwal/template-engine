#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { TemplateEngine } from './src/core/TemplateEngine';

/**
 * Real-world testing script for DOCX Template Engine
 * 
 * Usage:
 * 1. Place your .docx template in ./test-files/template.docx
 * 2. Place your JSON data in ./test-files/data.json
 * 3. Run: npm run test:real
 * 
 * Or use command line arguments:
 * ts-node test-real.ts --template=./path/to/template.docx --data=./path/to/data.json
 */

interface TestConfig {
  templatePath: string;
  dataPath: string;
  outputPath: string;
  enableLogging: boolean;
}

async function runRealTest() {
  console.log('🔥 DOCX Template Engine - Real World Test');
  console.log('==========================================\n');

  try {
    // Parse command line arguments or use defaults
    const config = parseConfig();
    
    // Ensure test files directory exists
    const testDir = path.dirname(config.templatePath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Check for template and data files
    await validateFiles(config);

    // Load files
    console.log('📂 Loading files...');
    const templateBuffer = fs.readFileSync(config.templatePath);
    const jsonData = JSON.parse(fs.readFileSync(config.dataPath, 'utf8'));

    console.log(`✅ Template loaded: ${config.templatePath} (${formatFileSize(templateBuffer.length)})`);
    console.log(`✅ Data loaded: ${config.dataPath} (${Object.keys(jsonData).length} root properties)`);
    console.log();

    // Initialize engine
    const engine = new TemplateEngine();

    // Analyze template
    console.log('🔍 Analyzing template...');
    const templateInfo = await engine.getTemplateInfo(templateBuffer);
    
    console.log('📊 Template Analysis:');
    console.log(`   • Total tags: ${templateInfo.stats.totalTags}`);
    console.log(`   • Tag types: ${JSON.stringify(templateInfo.stats.tagsByType)}`);
    console.log(`   • Has tables: ${templateInfo.stats.hasTables ? '✅' : '❌'}`);
    console.log(`   • Has images: ${templateInfo.stats.hasImages ? '✅' : '❌'}`);
    console.log(`   • Has charts: ${templateInfo.stats.hasCharts ? '✅' : '❌'}`);
    console.log();

    console.log('🔍 Found template tags:');
    templateInfo.tags.forEach((tag, index) => {
      console.log(`   ${index + 1}. {${tag.path}} [${tag.type}] ${tag.formatters.length ? `- formatters: ${tag.formatters.join(', ')}` : ''}`);
    });
    console.log();

    console.log('📋 Required data paths:');
    templateInfo.requiredData.forEach((path, index) => {
      const hasData = getNestedValue(jsonData, path) !== undefined;
      console.log(`   ${index + 1}. ${path} ${hasData ? '✅' : '❌ MISSING'}`);
    });
    console.log();

    // Validate data
    console.log('🔍 Validating data...');
    const dataValidation = await engine.validateData(jsonData, templateBuffer);
    
    if (dataValidation.isValid) {
      console.log('✅ Data validation passed');
    } else {
      console.log('⚠️ Data validation warnings:');
      dataValidation.warnings.forEach(warning => console.log(`   • ${warning}`));
      console.log('❌ Data validation errors:');
      dataValidation.errors.forEach(error => console.log(`   • ${error}`));
    }
    console.log();

    // Generate document
    console.log('⚙️ Generating document...');
    const startTime = Date.now();
    
    const result = await engine.generate({
      template: templateBuffer,
      data: jsonData,
      preserveOriginalFormatting: true,
      enableCharts: true,
      enableImages: true
    });

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    console.log('✅ Document generated successfully!');
    console.log(`⏱️ Processing time: ${processingTime}ms`);
    console.log(`📊 Result size: ${formatFileSize(result.buffer.length)}`);
    console.log();

    // Save result
    const outputDir = path.dirname(config.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(config.outputPath, result.buffer);
    console.log(`💾 Document saved to: ${config.outputPath}`);

    // Display metadata
    console.log('\n📈 Generation Metadata:');
    console.log(`   • Template tags processed: ${result.metadata.templateTags}`);
    console.log(`   • Processing time: ${result.metadata.processingTime}ms`);
    console.log(`   • Output format: ${result.metadata.outputFormat}`);
    if (result.metadata.warnings) {
      console.log(`   • Warnings: ${result.metadata.warnings.length}`);
      result.metadata.warnings.forEach(warning => console.log(`     - ${warning}`));
    }

    // Engine statistics
    console.log('\n📊 Engine Statistics:');
    const stats = engine.getEngineStats();
    console.log(`   • Version: ${stats.version}`);
    console.log(`   • Cache hits: ${stats.cacheStats.cachedTemplates}`);
    console.log(`   • Memory usage: ${stats.cacheStats.memoryUsage}`);
    console.log(`   • Available formatters: ${stats.availableFormatters.length}`);

    console.log('\n🎉 Real-world test completed successfully!');
    console.log('\nNext steps:');
    console.log(`- Open ${config.outputPath} in Microsoft Word to review the result`);
    console.log('- Modify the template or data and run the test again');
    console.log('- Try different formatters and features');

  } catch (error) {
    console.error('\n❌ Test failed:', error);

  if (error instanceof Error && error.message.includes('ENOENT')) {
    console.log('\n💡 Tip: Make sure your template and data files exist:');
    console.log('   • Template: ./test-files/template.docx');
    console.log('   • Data: ./test-files/data.json');
    console.log('\n   Or use: ts-node test-real.ts --template=path --data=path');
  }
    
    process.exit(1);
  }
}

function parseConfig(): TestConfig {
  const args = process.argv.slice(2);
  
  // Default paths
  let templatePath = './test-files/template.docx';
  let dataPath = './test-files/data.json';
  let outputPath = './test-files/output.docx';
  let enableLogging = true;

  // Parse command line arguments
  for (const arg of args) {
    if (arg.startsWith('--template=')) {
      templatePath = arg.split('=')[1];
    } else if (arg.startsWith('--data=')) {
      dataPath = arg.split('=')[1];
    } else if (arg.startsWith('--output=')) {
      outputPath = arg.split('=')[1];
    } else if (arg === '--quiet') {
      enableLogging = false;
    }
  }

  return {
    templatePath: path.resolve(templatePath),
    dataPath: path.resolve(dataPath),
    outputPath: path.resolve(outputPath),
    enableLogging
  };
}

async function validateFiles(config: TestConfig): Promise<void> {
  // Check template file
  if (!fs.existsSync(config.templatePath)) {
    console.log('❌ Template file not found:', config.templatePath);
    console.log('\n📝 Creating sample template and data files...');
    await createSampleFiles(config);
    return;
  }

  // Check data file
  if (!fs.existsSync(config.dataPath)) {
    console.log('❌ Data file not found:', config.dataPath);
    console.log('\n📝 Creating sample data file...');
    await createSampleDataFile(config.dataPath);
    return;
  }

  // Validate file formats
  const templateBuffer = fs.readFileSync(config.templatePath);
  if (!isValidDocx(templateBuffer)) {
    throw new Error('Template file is not a valid DOCX file');
  }

  try {
    JSON.parse(fs.readFileSync(config.dataPath, 'utf8'));
  } catch (error) {
    throw new Error('Data file is not valid JSON');
  }
}

async function createSampleFiles(config: TestConfig): Promise<void> {
  console.log('📄 Creating sample template with comprehensive features...');
  
  // Create a sample template with various features
  const sampleTemplateContent = `
INVOICE #{data.invoice.number}
Company: {data.company.name|bold}
Date: {data.invoice.date|date('DD/MM/YYYY')}

BILL TO:
{data.customer.name|bold}
{data.customer.address.street}
{data.customer.address.city}, {data.customer.address.zip}
Email: {data.customer.email}
Phone: {data.customer.phone}

ITEMS:
Item: {data.items[i].description|bold} | Qty: {data.items[i].quantity} | Price: {data.items[i].price|currency} | Total: {data.items[i].total|currency}

SUMMARY:
Subtotal: {data.totals.subtotal|currency}
Tax ({data.totals.taxRate|percent}): {data.totals.tax|currency}
Total: {data.totals.total|currency|bold|color('blue')}

Payment Status: {data.payment.status|upper|badge}
Due Date: {data.payment.dueDate|date('DD/MM/YYYY')}

Notes:
{data.notes|html}

Thank you for your business!
Contact: {data.company.email} | {data.company.phone}
  `;

  // Create sample template using the engine
  const { TemplateEngine } = require('./src/core/TemplateEngine');
  const templateBuffer = await TemplateEngine.createSimpleTemplate(sampleTemplateContent);
  
  fs.writeFileSync(config.templatePath, templateBuffer);
  console.log(`✅ Sample template created: ${config.templatePath}`);

  // Create corresponding sample data
  await createSampleDataFile(config.dataPath);
}

async function createSampleDataFile(dataPath: string): Promise<void> {
  const sampleData = {
    invoice: {
      number: "INV-2024-001",
      date: new Date().toISOString()
    },
    company: {
      name: "TechCorp Solutions",
      email: "billing@techcorp.com",
      phone: "+1 (555) 123-4567",
      address: {
        street: "123 Business Ave",
        city: "Tech City",
        zip: "12345"
      }
    },
    customer: {
      name: "Acme Corporation",
      email: "accounts@acme.com", 
      phone: "+1 (555) 987-6543",
      address: {
        street: "456 Client Street",
        city: "Business Town",
        zip: "67890"
      }
    },
    items: [
      {
        description: "Web Development Services",
        quantity: 40,
        price: 150.00,
        total: 6000.00
      },
      {
        description: "UI/UX Design",
        quantity: 20,
        price: 120.00,
        total: 2400.00
      },
      {
        description: "Project Management",
        quantity: 10,
        price: 100.00,
        total: 1000.00
      }
    ],
    totals: {
      subtotal: 9400.00,
      taxRate: 0.08,
      tax: 752.00,
      total: 10152.00
    },
    payment: {
      status: "pending",
      dueDate: "2024-02-15",
      method: "bank_transfer"
    },
    notes: `
      <p><strong>Payment Terms:</strong> Net 30 days</p>
      <p><strong>Late Fee:</strong> 1.5% per month on overdue amounts</p>
      <ul>
        <li>All work completed to satisfaction</li>
        <li>Project delivered on time</li>
        <li>Includes 30 days free support</li>
      </ul>
      <p><em>Thank you for choosing TechCorp Solutions!</em></p>
    `
  };

  fs.writeFileSync(dataPath, JSON.stringify(sampleData, null, 2));
  console.log(`✅ Sample data created: ${dataPath}`);
  console.log('\n🎯 You can now edit these files and run the test again!');
}

function isValidDocx(buffer: Buffer): boolean {
  // Check for ZIP signature (DOCX files are ZIP archives)
  return buffer.length > 4 && 
         buffer[0] === 0x50 && 
         buffer[1] === 0x4B &&
         (buffer[2] === 0x03 || buffer[2] === 0x05);
}

function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    if (key.includes('[') && key.includes(']')) {
      const [prop] = key.split('[');
      return current && current[prop] ? current[prop] : undefined;
    }
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

// Register custom formatters for the test
function registerTestFormatters(engine: any) {
  engine.registerFormatter('badge', (value: string, type: string = 'info') => {
    const colors: any = {
      success: 'green',
      warning: 'orange',
      error: 'red', 
      info: 'blue',
      pending: 'orange'
    };
    return {
      value: `[${value.toUpperCase()}]`,
      formatting: { 
        bold: true,
        color: colors[type] || colors[value] || 'blue'
      }
    };
  });
}

// Run the test
if (require.main === module) {
  runRealTest().catch(console.error);
}

export { runRealTest };