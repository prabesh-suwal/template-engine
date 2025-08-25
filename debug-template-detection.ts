// debug-template-detection.ts - Debug which template tags are found

import { TemplateEngine } from './src/core/TemplateEngine';
import * as fs from 'fs';

async function debugTemplateDetection() {
  console.log('🔍 DEBUG: Template Tag Detection');
  console.log('===============================\n');

  try {
    // Load your actual template and data
    const templatePath = './template2.docx'; // Update path if needed
    const dataPath = './data2.json';         // Update path if needed

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

    // Initialize engine and get template info
    const engine = new TemplateEngine();
    const templateInfo = await engine.getTemplateInfo(templateBuffer);

    console.log('📋 TEMPLATE ANALYSIS:');
    console.log(`Total tags found: ${templateInfo.tags.length}`);
    console.log(`Template stats:`, templateInfo.stats);
    console.log('');

    // Look for the problematic tags
    const problematicTags = templateInfo.tags.filter(tag => 
      tag.path.includes('lender.type') && tag.formatters.some(f => f.includes('ifEqual'))
    );

    console.log('🔍 PROBLEMATIC TAGS (lender.type with ifEqual):');
    if (problematicTags.length === 0) {
      console.log('❌ NO ifEqual tags found! This explains why they show as literal text.');
      console.log('   The template parser is not detecting these tags properly.\n');
    } else {
      problematicTags.forEach((tag, index) => {
        console.log(`${index + 1}. Path: ${tag.path}`);
        console.log(`   Type: ${tag.type}`);
        console.log(`   Formatters: [${tag.formatters.join(', ')}]`);
        // console.log(`   Full tag: ${tag.fullTag}\n`);
      });
    }

    // Check all tags with formatters
    const tagsWithFormatters = templateInfo.tags.filter(tag => tag.formatters.length > 0);
    console.log(`📊 Tags with formatters: ${tagsWithFormatters.length}/${templateInfo.tags.length}`);
    
    console.log('\n🎯 ALL TAGS WITH FORMATTERS:');
    tagsWithFormatters.forEach((tag, index) => {
      console.log(`${index + 1}. ${tag.path} | [${tag.formatters.join(', ')}]`);
    });

    // Check for conditional blocks that aren't supported
    console.log('\n⚠️ UNSUPPORTED CONDITIONAL BLOCKS:');
    const conditionalTags = templateInfo.tags.filter(tag => 
      tag.path.includes('#if') || tag.path.includes('#elseif') || tag.path.includes('#else')
    );
    
    if (conditionalTags.length > 0) {
      console.log('❌ Found unsupported conditional blocks:');
      conditionalTags.forEach((tag, index) => {
        console.log(`${index + 1}. ${tag.path}`);
      });
      console.log('\n💡 Solution: Replace {#if} blocks with formatter-based logic');
    } else {
      console.log('✅ No conditional blocks found');
    }

    // Test the specific data values
    console.log('\n🧪 DATA VALUE TESTS:');
    console.log(`data.lender.type = "${jsonData.data.lender?.type}"`);
    console.log(`data.loan.principalAmount = ${jsonData.data.loan?.amount}`);

    // Test formatters directly
    const { BuiltInFormatters } = require('./src/formatters');
    console.log('\n🔧 DIRECT FORMATTER TESTS:');
    
    const ifEqualTest = BuiltInFormatters.formatValue(jsonData.data.lender?.type, 'ifEqual(\'bank\', \'यो बैंक हो\', \'यो बैंक होइन\')');
    console.log(`ifEqual result: "${ifEqualTest}"`);
    
    const switchTest = BuiltInFormatters.formatValue(jsonData.data.lender?.type, 'switch(\'bank\', \'🏦 बैंक\', \'microfinance\', \'🏪 माइक्रो\', \'❓ अन्य\')');
    console.log(`switch result: "${switchTest}"`);

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugTemplateDetection();