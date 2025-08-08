import * as fs from 'fs';
import * as path from 'path';
import { TemplateEngine, generateDocument, getTemplateInfo } from '../dist';

async function runBasicExample() {
  console.log('🚀 Starting Basic Template Engine Example');
  console.log('==========================================\n');

  try {
    // Create a simple template for demonstration
    const engine = new TemplateEngine();
    
    // Create a basic DOCX template with template tags
    const templateContent = `
      Hello {data.name|bold}!
      
      Your order total is {data.total|currency}.
      Order date: {data.date|date('YYYY-MM-DD')}.
      
      Items:
      {data.items[i].name} - {data.items[i].price|currency}
      
      Status: {data.status|upper|color('green')}
      
      Thank you for your business!
    `;

    console.log('📄 Creating sample template...');
    const templateBuffer = await TemplateEngine.createSimpleTemplate(templateContent);

    // Sample data
    const sampleData = {
      name: 'John Doe',
      total: 299.99,
      date: new Date('2024-01-15'),
      status: 'completed',
      items: [
        { name: 'Laptop', price: 199.99 },
        { name: 'Mouse', price: 50.00 },
        { name: 'Keyboard', price: 50.00 }
      ]
    };

    console.log('📊 Sample data:');
    console.log(JSON.stringify(sampleData, null, 2));
    console.log();

    // Get template information
    console.log('🔍 Analyzing template...');
    const templateInfo = await getTemplateInfo(templateBuffer);
    
    console.log('Template Statistics:');
    console.log(`- Total tags: ${templateInfo.stats.totalTags}`);
    console.log(`- Tags by type:`, templateInfo.stats.tagsByType);
    console.log(`- Required data paths:`, templateInfo.requiredData);
    console.log();

    // Generate document
    console.log('⚙️ Generating document...');
    const startTime = Date.now();
    
    const result = await generateDocument(templateBuffer, sampleData, {
      convertTo: 'docx',
      preserveOriginalFormatting: true
    });

    const endTime = Date.now();
    
    console.log('✅ Document generated successfully!');
    console.log(`⏱️ Generation time: ${endTime - startTime}ms`);
    console.log(`📊 Metadata:`, result.metadata);
    console.log();

    // Save the generated document
    const outputPath = path.join(__dirname, 'output', 'basic-example-output.docx');
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, result.buffer);
    console.log(`💾 Document saved to: ${outputPath}`);

    // Demonstrate advanced features
    await demonstrateAdvancedFeatures();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

async function demonstrateAdvancedFeatures() {
  console.log('\n🔧 Demonstrating Advanced Features');
  console.log('=====================================\n');

  const engine = new TemplateEngine();

  // Register custom formatter
  console.log('📝 Registering custom formatter...');
  engine.registerFormatter('reverse', (value: string) => {
    return typeof value === 'string' ? value.split('').reverse().join('') : value;
  });

  // Custom formatters example
  const customTemplate = await TemplateEngine.createSimpleTemplate(`
    Original: {data.text}
    Reversed: {data.text|reverse}
    Upper + Bold: {data.text|upper|bold}
    Number with custom format: {data.amount|number(3)|currency('€')}
  `);

  const customData = {
    text: 'Hello World',
    amount: 1234.567
  };

  console.log('🎨 Custom formatters data:');
  console.log(JSON.stringify(customData, null, 2));

  const customResult = await generateDocument(customTemplate, customData);
  
  const customOutputPath = path.join(__dirname, 'output', 'custom-formatters-output.docx');
  fs.writeFileSync(customOutputPath, customResult.buffer);
  console.log(`💾 Custom formatters document saved to: ${customOutputPath}`);

  // Batch processing example
  console.log('\n📦 Demonstrating batch processing...');
  
  const batchTemplate = await TemplateEngine.createSimpleTemplate(`
    Invoice #{data.invoiceNumber}
    Customer: {data.customer|bold}
    Amount: {data.amount|currency}
    Due Date: {data.dueDate|date('DD/MM/YYYY')}
  `);

  const batchData = [
    { invoiceNumber: 1001, customer: 'Alice Johnson', amount: 150.00, dueDate: new Date('2024-02-01') },
    { invoiceNumber: 1002, customer: 'Bob Smith', amount: 275.50, dueDate: new Date('2024-02-05') },
    { invoiceNumber: 1003, customer: 'Carol Williams', amount: 89.99, dueDate: new Date('2024-02-10') }
  ];

  const batchResults = await engine.generateBatch(batchTemplate, batchData);
  
  console.log(`✅ Generated ${batchResults.length} documents in batch`);
  
  batchResults.forEach((result, index) => {
    const batchOutputPath = path.join(__dirname, 'output', `batch-invoice-${index + 1}.docx`);
    fs.writeFileSync(batchOutputPath, result.buffer);
    console.log(`💾 Batch document ${index + 1} saved to: ${batchOutputPath}`);
  });

  // Engine statistics
  console.log('\n📈 Engine Statistics:');
  const stats = engine.getEngineStats();
  console.log(JSON.stringify(stats, null, 2));

  console.log('\n🎉 Advanced features demonstration completed!');
}

// Image and Chart example (requires external dependencies)
async function demonstrateMediaFeatures() {
  console.log('\n🖼️ Demonstrating Image and Chart Features');
  console.log('==========================================\n');

  try {
    const engine = new TemplateEngine();

    // Template with image and chart
    const mediaTemplate = await TemplateEngine.createSimpleTemplate(`
      Company Report
      
      Logo: {data.logo|image}
      
      Sales Chart: {data.salesData|chart('bar')}
      
      Profile Picture: {data.profilePicture|image}
      
      Performance over time: {data.performanceData|chart('line')}
    `);

    const mediaData = {
      logo: 'https://via.placeholder.com/200x100/0066cc/ffffff?text=LOGO',
      profilePicture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      salesData: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          label: 'Sales',
          data: [150, 200, 175, 300],
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
        }]
      },
      performanceData: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Performance',
          data: [65, 59, 80, 81, 56, 85],
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.2)'
        }]
      }
    };

    console.log('🖼️ Generating document with images and charts...');
    const mediaResult = await generateDocument(mediaTemplate, mediaData);

    const mediaOutputPath = path.join(__dirname, 'output', 'media-features-output.docx');
    fs.writeFileSync(mediaOutputPath, mediaResult.buffer);
    console.log(`💾 Media features document saved to: ${mediaOutputPath}`);

  } catch (error) {
    console.log('⚠️ Media features require additional dependencies (canvas, chart.js)');
    console.log('Install them with: npm install canvas chart.js');
    console.log('Error:', error.message);
  }
}

// Run the example
if (require.main === module) {
  runBasicExample()
    .then(() => {
      console.log('\n✨ Example completed successfully!');
      console.log('Check the output directory for generated documents.');
    })
    .catch((error) => {
      console.error('❌ Example failed:', error);
      process.exit(1);
    });
}

export { runBasicExample, demonstrateAdvancedFeatures, demonstrateMediaFeatures };