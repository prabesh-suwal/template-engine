// word-xml-inspector.ts - Inspect how Word stores your template tags

import * as fs from 'fs';
import { ZipUtils } from './src/utils/zip';

async function inspectWordXML() {
  console.log('🔍 WORD DOCUMENT XML INSPECTOR');
  console.log('==============================\n');

  try {
    const templatePath = './template2.docx';
    
    if (!fs.existsSync(templatePath)) {
      console.log(`❌ Template file not found: ${templatePath}`);
      return;
    }

    const templateBuffer = fs.readFileSync(templatePath);
    const extractedFiles = await ZipUtils.extractDocx(templateBuffer);
    const documentXML = ZipUtils.getFileAsString(extractedFiles, 'word/document.xml');
    
    console.log(`✅ Loaded and extracted: ${templatePath}\n`);

    // Search for your specific test patterns
    const searchPatterns = [
      'ifEqual(\'bank\', \'yes\', \'not bank\')',      // Working
      'ifEqual(bank, sdsd, not bank)',               // Working  
      'ifEqual(bank, yaya, not blank)',              // Missing
      'ifEqual(\'bank\', \'यो बैंक हो\', \'यो बैंक होइन\')'  // Missing
    ];

    console.log('🔍 SEARCHING FOR EXACT FORMATTER PATTERNS:');
    console.log('==========================================\n');

    searchPatterns.forEach((pattern, index) => {
      const found = documentXML.includes(pattern);
      console.log(`${index + 1}. Pattern: ${pattern}`);
      console.log(`   Found: ${found ? '✅ YES' : '❌ NO'}`);
      
      if (found) {
        const startIndex = documentXML.indexOf(pattern);
        const context = documentXML.substring(startIndex - 200, startIndex + pattern.length + 200);
        console.log(`   Context: ...${context}...`);
      }
      console.log('');
    });

    // Look for fragments of the missing patterns
    console.log('🔍 SEARCHING FOR PATTERN FRAGMENTS:');
    console.log('===================================\n');

    const fragments = [
      'yaya',
      'not blank', 
      'यो बैंक हो',
      'यो बैंक होइन',
      'data.lender.type'
    ];

    fragments.forEach((fragment) => {
      const occurrences = (documentXML.match(new RegExp(fragment, 'g')) || []).length;
      console.log(`"${fragment}": ${occurrences} occurrences`);
      
      if (occurrences > 0) {
        // Show first occurrence with context
        const index = documentXML.indexOf(fragment);
        const start = Math.max(0, index - 150);
        const end = Math.min(documentXML.length, index + fragment.length + 150);
        const context = documentXML.substring(start, end);
        console.log(`   First occurrence context: ...${context}...`);
      }
      console.log('');
    });

    // Look for any curly braces with lender.type
    console.log('🔍 SEARCHING FOR ALL LENDER.TYPE TAGS:');
    console.log('=====================================\n');

    const lenderTypeRegex = /\{[^}]*data\.lender\.type[^}]*\}/g;
    const lenderTypeTags = documentXML.match(lenderTypeRegex) || [];
    
    console.log(`Found ${lenderTypeTags.length} complete lender.type tags:`);
    lenderTypeTags.forEach((tag, index) => {
      console.log(`${index + 1}. ${tag}`);
    });
    console.log('');

    // Look for broken/split tags
    console.log('🔍 SEARCHING FOR SPLIT/BROKEN TAGS:');
    console.log('===================================\n');

    const splitPatterns = [
      /\{[^}]*data\.lender\.type[^}]*<w:/g,  // Tag split by Word XML
      /data\.lender\.type[^}]*\|[^}]*<w:/g,   // Formatter split by Word XML
      /ifEqual[^}]*<w:/g,                      // ifEqual split by Word XML
      /यो\s*<w:/g,                             // Nepali text split
      /बैंक\s*<w:/g                             // Bank word split
    ];

    const splitNames = [
      'Tags split by Word XML',
      'Formatters split by Word XML', 
      'ifEqual split by Word XML',
      'Nepali "यो" split',
      'Nepali "बैंक" split'
    ];

    splitPatterns.forEach((pattern, index) => {
      const matches = documentXML.match(pattern) || [];
      console.log(`${index + 1}. ${splitNames[index]}: ${matches.length} matches`);
      
      if (matches.length > 0) {
        matches.slice(0, 3).forEach((match, i) => {
          const fullIndex = documentXML.indexOf(match);
          const context = documentXML.substring(fullIndex, fullIndex + 200);
          console.log(`   ${i + 1}. ${context}...`);
        });
      }
      console.log('');
    });

    // Save problematic sections for manual inspection
    console.log('💾 SAVING XML SECTIONS FOR MANUAL INSPECTION:');
    console.log('=============================================\n');

    // Find sections with data.lender.type and save surrounding context
    let savedSections = 0;
    let searchStart = 0;
    
    while (true) {
      const index = documentXML.indexOf('data.lender.type', searchStart);
      if (index === -1) break;
      
      const start = Math.max(0, index - 500);
      const end = Math.min(documentXML.length, index + 1000);
      const section = documentXML.substring(start, end);
      
      const fileName = `lender-type-section-${savedSections + 1}.xml`;
      fs.writeFileSync(fileName, section);
      console.log(`✅ Saved section ${savedSections + 1} to ${fileName}`);
      
      savedSections++;
      searchStart = index + 1;
      
      if (savedSections >= 5) break; // Limit to 5 sections
    }

    if (savedSections === 0) {
      console.log('❌ No sections with data.lender.type found to save');
    }

  } catch (error) {
    console.error('❌ Inspection failed:', error);
  }
}

inspectWordXML();