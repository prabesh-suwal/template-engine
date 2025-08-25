// test-fixed-parser.ts - Test the fixed template parser

import { TemplateEngine } from './src/core/TemplateEngine';
import * as fs from 'fs';

async function testFixedParser() {
  console.log('🧪 TESTING FIXED TEMPLATE PARSER');
  console.log('================================\n');

  try {
    const templatePath = './template2.docx';
    const dataPath = './data2.json';

    if (!fs.existsSync(templatePath)) {
      console.log(`❌ Template file not found: ${templatePath}`);
      return;
    }

    if (!fs.existsSync(dataPath)) {
      console.log(`❌ Data file not found: ${dataPath}`);
      return;
    }

    const templateBuffer = fs.readFileSync(templatePath);
    const jsonData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    console.log(`✅ Loaded template: ${templatePath}`);
    console.log(`✅ Loaded data: ${dataPath}\n`);

    // Test the fixed template parser
    const engine = new TemplateEngine();
    
    console.log('🔧 ANALYZING TEMPLATE WITH FIXED PARSER:');
    console.log('========================================\n');
    
    const templateInfo = await engine.getTemplateInfo(templateBuffer);
    
    console.log(`📊 TEMPLATE ANALYSIS RESULTS:`);
    console.log(`Total tags found: ${templateInfo.tags.length}`);
    console.log(`Template stats:`, templateInfo.stats);
    console.log('');

    // Show all found tags
    console.log('🏷️ ALL FOUND TEMPLATE TAGS:');
    console.log('============================\n');
    
    templateInfo.tags.forEach((tag, index) => {
      const formattersDisplay = tag.formatters.length > 0 ? ` | Formatters: [${tag.formatters.join(', ')}]` : ' | No formatters';
      console.log(`${index + 1}. **${tag.path}** [${tag.type}]${formattersDisplay}`);
    });

    // Look specifically for lender.type tags
    const lenderTypeTags = templateInfo.tags.filter(tag => tag.path.includes('lender.type'));
    
    console.log(`\n🎯 LENDER.TYPE TAGS FOUND: ${lenderTypeTags.length}`);
    console.log('===============================\n');
    
    lenderTypeTags.forEach((tag, index) => {
      console.log(`${index + 1}. Path: ${tag.path}`);
      console.log(`   Type: ${tag.type}`);
      console.log(`   Formatters: [${tag.formatters.join(', ')}]`);
    //   console.log(`   Full tag: ${tag.fullTag || 'N/A'}`);
      console.log('');
    });

    // Test the specific formatters we expect
    const expectedFormatters = [
      "ifEqual('bank', 'yes', 'not bank')",
      "ifEqual(bank, yaya, not blank)", 
      "ifEqual(bank, sdsd, not bank)",
      "ifEqual(bank, यो बैंक हो, यो बैंक होइन)",
      "ifEqual('bank', 'यो बैंक हो', 'यो बैंक होइन')"
    ];

    console.log('✅ EXPECTED FORMATTERS CHECK:');
    console.log('=============================\n');

    expectedFormatters.forEach((expected, index) => {
      const found = lenderTypeTags.some(tag => 
        tag.formatters.some(formatter => formatter.includes(expected.split('(')[0]))
      );
      console.log(`${index + 1}. ${expected}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
    });

    // Test data values
    console.log('\n🧪 DATA VALUE TESTS:');
    console.log('===================\n');
    
    console.log(`data.lender.type = "${jsonData.lender?.type || 'undefined'}"`);
    console.log(`data.loan.principalAmount = ${jsonData.loan?.principalAmount || 'undefined'}`);

    // Test document generation
    console.log('\n📄 TESTING DOCUMENT GENERATION:');
    console.log('===============================\n');

    try {
      console.log('Generating document...');
      const result = await engine.generate({
        template: templateBuffer,
        data: jsonData
      });

      fs.writeFileSync('test-output-fixed.docx', result.buffer);
      console.log('✅ Document generated successfully: test-output-fixed.docx');
      console.log(`⏱️  Processing time: ${result.metadata.processingTime}ms`);
      
      if (result.metadata.warnings && result.metadata.warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        result.metadata.warnings.forEach(warning => {
          console.log(`   ${warning}`);
        });
      }

    } catch (genError) {
      console.error('❌ Document generation failed:', genError);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFixedParser();