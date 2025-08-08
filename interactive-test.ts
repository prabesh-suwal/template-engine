// #!/usr/bin/env node

// import * as fs from 'fs';
// import * as path from 'path';
// import * as readline from 'readline';
// import { TemplateEngine } from './src/core/TemplateEngine';

// /**
//  * Interactive testing interface for the DOCX Template Engine
//  * Provides a command-line interface to test templates and data
//  */

// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout
// });

// interface TestSession {
//   engine: TemplateEngine;
//   templatePath?: string;
//   dataPath?: string;
//   outputPath?: string;
//   template?: Buffer;
//   data?: any;
// }

// async function runInteractiveTest() {
//   console.log('🎮 DOCX Template Engine - Interactive Test Mode');
//   console.log('==============================================\n');
  
//   const session: TestSession = {
//     engine: new TemplateEngine()
//   };

//   console.log('Welcome to the interactive template testing environment!');
//   console.log('Type "help" for available commands.\n');

//   while (true) {
//     try {
//       const command = await askQuestion('> ');
//       const result = await processCommand(command.trim(), session);
      
//       if (result === 'exit') {
//         break;
//       }
//     } catch (error) {
//       console.error('❌ Error:', error.message);
//     }
//   }

//   rl.close();
//   console.log('\n👋 Thanks for using the DOCX Template Engine!');
// }

// async function processCommand(command: string, session: TestSession): Promise<string | void> {
//   const [cmd, ...args] = command.split(' ');

//   switch (cmd.toLowerCase()) {
//     case 'help':
//     case 'h':
//       showHelp();
//       break;

//     case 'load':
//     case 'l':
//       await loadFiles(args, session);
//       break;

//     case 'template':
//     case 't':
//       await loadTemplate(args[0], session);
//       break;

//     case 'data':
//     case 'd':
//       await loadData(args[0], session);
//       break;

//     case 'analyze':
//     case 'a':
//       await analyzeTemplate(session);
//       break;

//     case 'validate':
//     case 'v':
//       await validateData(session);
//       break;

//     case 'generate':
//     case 'g':
//       await generateDocument(args[0], session);
//       break;

//     case 'list':
//       await listFiles();
//       break;

//     case 'sample':
//     case 's':
//       await createSampleFiles(args[0]);
//       break;

//     case 'info':
//     case 'i':
//       showSessionInfo(session);
//       break;

//     case 'clear':
//     case 'c':
//       clearSession(session);
//       break;

//     case 'formatters':
//     case 'f':
//       showFormatters(session);
//       break;

//     case 'register':
//     case 'r':
//       await registerFormatter(args, session);
//       break;

//     case 'test':
//       await runQuickTest(session);
//       break;

//     case 'batch':
//     case 'b':
//       await runBatchTest(args, session);
//       break;

//     case 'performance':
//     case 'p':
//       await runPerformanceTest(session);
//       break;

//     case 'exit':
//     case 'quit':
//     case 'q':
//       return 'exit';

//     case '':
//       break;

//     default:
//       console.log(`❌ Unknown command: ${cmd}`);
//       console.log('Type "help" for available commands.');
//   }
// }

// function showHelp() {
//   console.log(`
// 📚 Available Commands:

// 📁 File Operations:
//   load <template> <data>     Load template and data files
//   template <file>            Load template file (.docx)
//   data <file>                Load data file (.json)
//   list                       List files in current directory
//   sample <type>              Create sample files (invoice/report/letter)

// 🔍 Analysis:
//   analyze                    Analyze loaded template
//   validate                   Validate data against template
//   info                       Show current session information

// ⚙️ Generation:
//   generate [output]          Generate document
//   test                       Quick test with current files
//   batch <dir>                Batch process multiple data files
//   performance                Run performance benchmark

// 🎨 Formatters:
//   formatters                 Show available formatters
//   register <name> <code>     Register custom formatter

// 🧹 Utilities:
//   clear                      Clear current session
//   help                       Show this help
//   exit                       Exit interactive mode

// 💡 Examples:
//   > load template.docx data.json
//   > analyze
//   > generate output.docx
//   > sample invoice
//   > register badge "value => '[' + value.toUpperCase() + ']'"
// `);
// }

// async function loadFiles(args: string[], session: TestSession) {
//   if (args.length < 2) {
//     console.log('❌ Usage: load <template.docx> <data.json>');
//     return;
//   }

//   await loadTemplate(args[0], session);
//   await loadData(args[1], session);
// }

// async function loadTemplate(filePath: string, session: TestSession) {
//   if (!filePath) {
//     console.log('❌ Please specify template file path');
//     return;
//   }

//   const fullPath = path.resolve(filePath);
  
//   if (!fs.existsSync(fullPath)) {
//     console.log(`❌ Template file not found: ${fullPath}`);
//     return;
//   }

//   try {
//     session.template = fs.readFileSync(fullPath);
//     session.templatePath = fullPath;
//     console.log(`✅ Template loaded: ${filePath} (${formatFileSize(session.template.length)})`);
//   } catch (error) {
//     console.log(`❌ Failed to load template: ${error.message}`);
//   }
// }

// async function loadData(filePath: string, session: TestSession) {
//   if (!filePath) {
//     console.log('❌ Please specify data file path');
//     return;
//   }

//   const fullPath = path.resolve(filePath);
  
//   if (!fs.existsSync(fullPath)) {
//     console.log(`❌ Data file not found: ${fullPath}`);
//     return;
//   }

//   try {
//     const jsonContent = fs.readFileSync(fullPath, 'utf8');
//     session.data = JSON.parse(jsonContent);
//     session.dataPath = fullPath;
//     console.log(`✅ Data loaded: ${filePath} (${Object.keys(session.data).length} root properties)`);
//   } catch (error) {
//     console.log(`❌ Failed to load data: ${error.message}`);
//   }
// }

// async function analyzeTemplate(session: TestSession) {
//   if (!session.template) {
//     console.log('❌ No template loaded. Use "template <file>" first.');
//     return;
//   }

//   try {
//     console.log('🔍 Analyzing template...');
//     const info = await session.engine.getTemplateInfo(session.template);
    
//     console.log('\n📊 Template Analysis:');
//     console.log(`   • Total tags: ${info.stats.totalTags}`);
//     console.log(`   • Tag types: ${JSON.stringify(info.stats.tagsByType)}`);
//     console.log(`   • Has tables: ${info.stats.hasTables ? '✅' : '❌'}`);
//     console.log(`   • Has images: ${info.stats.hasImages ? '✅' : '❌'}`);
//     console.log(`   • Has charts: ${info.stats.hasCharts ? '✅' : '❌'}`);
    
//     console.log('\n🏷️ Template Tags:');
//     info.tags.forEach((tag, i) => {
//       console.log(`   ${i + 1}. {${tag.path}} [${tag.type}]${tag.formatters.length ? ` - ${tag.formatters.join(', ')}` : ''}`);
//     });
    
//     console.log('\n📋 Required Data Paths:');
//     info.requiredData.forEach((path, i) => {
//       console.log(`   ${i + 1}. ${path}`);
//     });
    
//   } catch (error) {
//     console.log(`❌ Analysis failed: ${error.message}`);
//   }
// }

// async function validateData(session: TestSession) {
//   if (!session.template || !session.data) {
//     console.log('❌ Both template and data must be loaded first.');
//     return;
//   }

//   try {
//     console.log('🔍 Validating data...');
//     const validation = await session.engine.validateData(session.data, session.template);
    
//     if (validation.isValid) {
//       console.log('✅ Data validation passed!');
//     } else {
//       console.log('⚠️ Data validation completed with issues:');
//     }
    
//     if (validation.warnings.length > 0) {
//       console.log('\n⚠️ Warnings:');
//       validation.warnings.forEach(warning => console.log(`   • ${warning}`));
//     }
    
//     if (validation.errors.length > 0) {
//       console.log('\n❌ Errors:');
//       validation.errors.forEach(error => console.log(`   • ${error}`));
//     }
    
//   } catch (error) {
//     console.log(`❌ Validation failed: ${error.message}`);
//   }
// }

// async function generateDocument(outputPath: string, session: TestSession) {
//   if (!session.template || !session.data) {
//     console.log('❌ Both template and data must be loaded first.');
//     return;
//   }

//   const output = outputPath || './test-output.docx';
  
//   try {
//     console.log('⚙️ Generating document...');
//     const startTime = Date.now();
    
//     const result = await session.engine.generate({
//       template: session.template,
//       data: session.data,
//       preserveOriginalFormatting: true
//     });
    
//     const endTime = Date.now();
    
//     // Ensure output directory exists
//     const outputDir = path.dirname(output);
//     if (!fs.existsSync(outputDir)) {
//       fs.mkdirSync(outputDir, { recursive: true });
//     }
    
//     fs.writeFileSync(output, result.buffer);
    
//     console.log(`✅ Document generated successfully!`);
//     console.log(`   • Processing time: ${endTime - startTime}ms`);
//     console.log(`   • Output size: ${formatFileSize(result.buffer.length)}`);
//     console.log(`   • File saved: ${path.resolve(output)}`);
    
//     if (result.metadata.warnings) {
//       console.log(`   • Warnings: ${result.metadata.warnings.length}`);
//     }
    
//   } catch (error) {
//     console.log(`❌ Generation failed: ${error.message}`);
//   }
// }

// async function listFiles() {
//   const cwd = process.cwd();
//   const files = fs.readdirSync(cwd);
  
//   console.log(`\n📁 Files in ${cwd}:`);
  
//   const docxFiles = files.filter(f => f.endsWith('.docx'));
//   const jsonFiles = files.filter(f => f.endsWith('.json'));
//   const otherFiles = files.filter(f => !f.endsWith('.docx') && !f.endsWith('.json') && !f.startsWith('.'));
  
//   if (docxFiles.length > 0) {
//     console.log('\n📄 DOCX Templates:');
//     docxFiles.forEach(file => {
//       const stats = fs.statSync(file);
//       console.log(`   • ${file} (${formatFileSize(stats.size)})`);
//     });
//   }
  
//   if (jsonFiles.length > 0) {
//     console.log('\n📊 JSON Data Files:');
//     jsonFiles.forEach(file => {
//       const stats = fs.statSync(file);
//       console.log(`   • ${file} (${formatFileSize(stats.size)})`);
//     });
//   }
  
//   if (otherFiles.length > 0) {
//     console.log('\n📁 Other Files:');
//     otherFiles.slice(0, 10).forEach(file => {
//       console.log(`   • ${file}`);
//     });
//     if (otherFiles.length > 10) {
//       console.log(`   ... and ${otherFiles.length - 10} more`);
//     }
//   }
// }

// async function createSampleFiles(type: string) {
//   const sampleType = type || 'invoice';
  
//   console.log(`📝 Creating sample ${sampleType} files...`);
  
//   try {
//     let templateContent = '';
//     let sampleData = {};
    
//     switch (sampleType.toLowerCase()) {
//       case 'invoice':
//         templateContent = createInvoiceTemplate();
//         sampleData = JSON.parse(fs.readFileSync('./test-files/samples/invoice-data.json', 'utf8'));
//         break;
        
//       case 'report':
//         templateContent = createReportTemplate();
//         sampleData = JSON.parse(fs.readFileSync('./test-files/samples/report-data.json', 'utf8'));
//         break;
        
//       case 'letter':
//         templateContent = createLetterTemplate();
//         sampleData = createLetterData();
//         break;
        
//       default:
//         console.log('❌ Unknown sample type. Available: invoice, report, letter');
//         return;
//     }
    
//     // Create template
//     const templateBuffer = await TemplateEngine.createSimpleTemplate(templateContent);
//     fs.writeFileSync(`sample-${sampleType}-template.docx`, templateBuffer);
    
//     // Create data
//     fs.writeFileSync(`sample-${sampleType}-data.json`, JSON.stringify(sampleData, null, 2));
    
//     console.log(`✅ Sample ${sampleType} files created:`);
//     console.log(`   • sample-${sampleType}-template.docx`);
//     console.log(`   • sample-${sampleType}-data.json`);
//     console.log(`\nTo test: load sample-${sampleType}-template.docx sample-${sampleType}-data.json`);
    
//   } catch (error) {
//     console.log(`❌ Failed to create sample files: ${error.message}`);
//   }
// }

// function createInvoiceTemplate(): string {
//   return `
// INVOICE #{data.invoice.number}

// {data.company.name|bold}
// {data.company.address.street}
// {data.company.address.city}, {data.company.address.state} {data.company.address.zip}
// Phone: {data.company.contact.phone} | Email: {data.company.contact.email}

// BILL TO:
// {data.customer.name|bold}
// {data.customer.address.street}
// {data.customer.address.city}, {data.customer.address.state} {data.customer.address.zip}

// Invoice Date: {data.invoice.date|date('MM/DD/YYYY')}
// Due Date: {data.invoice.dueDate|date('MM/DD/YYYY')}
// Terms: {data.customer.paymentTerms}

// SERVICES:
// {data.items[i].description|bold} | Qty: {data.items[i].quantity} {data.items[i].unit} | Rate: {data.items[i].rate|currency} | Amount: {data.items[i].amount|currency}

// SUMMARY:
// Subtotal: {data.calculations.subtotal|currency}
// Discount ({data.calculations.discountRate|percent}): -{data.calculations.discountAmount|currency}
// Subtotal after discount: {data.calculations.subtotalAfterDiscount|currency}
// Tax ({data.calculations.taxRate|percent}): {data.calculations.taxAmount|currency}
// TOTAL: {data.calculations.total|currency|bold}

// Payment Status: {data.payment.status|upper}
// Payment Method: {data.payment.method|title}

// {data.notes.public|html}

// Thank you for your business!
//   `;
// }

// function createReportTemplate(): string {
//   return `
// {data.report.title|bold|size(16)}
// {data.report.type|title} Report for {data.report.period.quarter} {data.report.period.year}

// Generated: {data.report.generatedDate|date('MM/DD/YYYY')}
// Confidentiality: {data.report.confidentiality|upper}

// COMPANY OVERVIEW
// {data.company.name|bold}
// CEO: {data.company.ceo}
// Employees: {data.company.employees|number(0)}
// Founded: {data.company.founded}

// FINANCIAL PERFORMANCE
// Revenue: {data.financial.revenue.current|currency('$', 0)}
// Growth: {data.financial.revenue.growth|percent|color('green')}
// Net Profit: {data.financial.profit.net|currency('$', 0)}
// Profit Margin: {data.financial.profit.margin|percent}

// QUARTERLY BREAKDOWN
// {data.financial.quarterly[i].quarter}: Revenue {data.financial.quarterly[i].revenue|currency('$', 0)} | Growth {data.financial.quarterly[i].growth|percent}

// DEPARTMENT PERFORMANCE
// {data.departments[i].name|title|bold}: {data.departments[i].headCount} employees | Budget: {data.departments[i].budget|currency('$', 0)} | Performance: {data.departments[i].performance|percent}

// KEY ACHIEVEMENTS
// {data.achievements[i].title|bold}
// Date: {data.achievements[i].date|date('MM/DD/YYYY')}
// Impact: {data.achievements[i].impact}
// Value: {data.achievements[i].value|currency('$', 0)}

// GOALS PROGRESS
// {data.goals[i].target}: {data.goals[i].progress|percent} complete
// Owner: {data.goals[i].owner}
// Deadline: {data.goals[i].deadline|date('MM/DD/YYYY')}

// Report generated by {data.report.generatedBy}
//   `;
// }

// function createLetterTemplate(): string {
//   return `
// {data.date|date('MMMM DD, YYYY')}

// {data.recipient.name}
// {data.recipient.title}
// {data.recipient.company}
// {data.recipient.address.street}
// {data.recipient.address.city}, {data.recipient.address.state} {data.recipient.address.zip}

// Dear {data.recipient.salutation} {data.recipient.lastName},

// {data.body.opening}

// {data.body.content|html}

// {data.body.closing}

// Sincerely,

// {data.sender.name|bold}
// {data.sender.title}
// {data.sender.company}
// {data.sender.contact.email}
// {data.sender.contact.phone}
//   `;
// }

// function createLetterData() {
//   return {
//     date: new Date().toISOString(),
//     recipient: {
//       name: "John Smith",
//       title: "Director of Operations",
//       company: "ABC Corporation",
//       salutation: "Mr.",
//       lastName: "Smith",
//       address: {
//         street: "123 Business St",
//         city: "Anytown",
//         state: "ST",
//         zip: "12345"
//       }
//     },
//     sender: {
//       name: "Jane Doe",
//       title: "Account Manager",
//       company: "XYZ Services",
//       contact: {
//         email: "jane.doe@xyz.com",
//         phone: "(555) 123-4567"
//       }
//     },
//     body: {
//       opening: "I hope this letter finds you well.",
//       content: "<p>I am writing to <strong>follow up</strong> on our recent discussion regarding the <em>upcoming project collaboration</em>. We are excited about the opportunity to work together.</p><p>Key points from our discussion:</p><ul><li>Project timeline: 6 months</li><li>Budget range: $50,000 - $75,000</li><li>Deliverables: Complete system integration</li></ul>",
//       closing: "Please let me know if you have any questions or need additional information."
//     }
//   };
// }

// function showSessionInfo(session: TestSession) {
//   console.log('\n📋 Current Session Information:');
//   console.log(`   • Template: ${session.templatePath ? '✅ ' + path.basename(session.templatePath) : '❌ Not loaded'}`);
//   console.log(`   • Data: ${session.dataPath ? '✅ ' + path.basename(session.dataPath) : '❌ Not loaded'}`);
  
//   if (session.template) {
//     console.log(`   • Template size: ${formatFileSize(session.template.length)}`);
//   }
  
//   if (session.data) {
//     console.log(`   • Data properties: ${Object.keys(session.data).length}`);
//   }
  
//   const stats = session.engine.getEngineStats();
//   console.log(`   • Engine version: ${stats.version}`);
//   console.log(`   • Cached templates: ${stats.cacheStats.cachedTemplates}`);
//   console.log(`   • Available formatters: ${stats.availableFormatters.length}`);
// }

// function clearSession(session: TestSession) {
//   session.template = undefined;
//   session.data = undefined;
//   session.templatePath = undefined;
//   session.dataPath = undefined;
//   session.outputPath = undefined;
//   session.engine.clearCache();
  
//   console.log('🧹 Session cleared. Cache emptied.');
// }

// function showFormatters(session: TestSession) {
//   const formatters = session.engine.getAvailableFormatters();
  
//   console.log(`\n🎨 Available Formatters (${formatters.length}):`);
  
//   const categories = {
//     'Text': ['bolda', 'italic', 'underline', 'upper', 'lower', 'capitalize', 'title', 'trim'],
//     'Numbers': ['currency', 'number', 'percent', 'comma'],