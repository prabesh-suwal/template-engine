// inspect-template-xml.ts - Deep inspection of template XML

import * as fs from 'fs';
import { ZipUtils } from './src/utils/zip';

async function inspectTemplateXML() {
  console.log('🔍 DEEP TEMPLATE XML INSPECTION');
  console.log('==============================\n');

  try {
    const templatePath = './template2.docx';
    
    if (!fs.existsSync(templatePath)) {
      console.log(`❌ Template file not found: ${templatePath}`);
      return;
    }

    const templateBuffer = fs.readFileSync(templatePath);
    console.log(`✅ Loaded template: ${templatePath}\n`);

    // Extract DOCX files
    const extractedFiles = await ZipUtils.extractDocx(templateBuffer);
    
    // Get the main document XML
    const documentXML = ZipUtils.getFileAsString(extractedFiles, 'word/document.xml');
    
    console.log('📄 SEARCHING FOR TEMPLATE TAGS IN XML:');
    console.log('=====================================\n');

    // Search for patterns that might be your template tags
    const patterns = [
      /\{[^}]*data\.lender\.type[^}]*\}/g,
      /\{[^}]*ifEqual[^}]*\}/g,
      /\{[^}]*switch[^}]*\}/g,
      /\{[^}]*ifBetween[^}]*\}/g,
      /\{#if[^}]*\}/g,
      /\{data\.[^}]*\}/g
    ];

    const patternNames = [
      'lender.type tags',
      'ifEqual tags', 
      'switch tags',
      'ifBetween tags',
      'conditional blocks',
      'all data tags'
    ];

    patterns.forEach((pattern, index) => {
      const matches = documentXML.match(pattern);
      console.log(`${index + 1}. ${patternNames[index]}: ${matches ? matches.length : 0} found`);
      if (matches && matches.length > 0) {
        matches.slice(0, 5).forEach((match, i) => {
          console.log(`   ${i + 1}. ${match}`);
        });
        if (matches.length > 5) {
          console.log(`   ... and ${matches.length - 5} more`);
        }
      }
      console.log('');
    });

    // Look for the specific problematic content
    console.log('🔍 SEARCHING FOR SPECIFIC CONTENT:');
    console.log('=================================\n');

    const searchTerms = [
      'Test ifEqual',
      'Bank Status', 
      'यो बैंक हो',
      'ifEqual(',
      'switch(',
      'ifBetween(',
      '#if data.lender.type'
    ];

    searchTerms.forEach((term) => {
      const found = documentXML.includes(term);
      console.log(`"${term}": ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
      
      if (found) {
        // Show context around the found term
        const index = documentXML.indexOf(term);
        const start = Math.max(0, index - 100);
        const end = Math.min(documentXML.length, index + term.length + 100);
        const context = documentXML.substring(start, end);
        console.log(`   Context: ...${context}...`);
      }
      console.log('');
    });

    // Check if tags are split across XML elements
    console.log('⚠️ CHECKING FOR SPLIT TAGS:');
    console.log('===========================\n');

    // Look for opening braces followed by XML tags
    const splitPatterns = [
      /\{[^}]*<w:[^>]*>[^}]*\}/g,
      /\{[^<]*<[^>]*>[^}]*\}/g
    ];

    splitPatterns.forEach((pattern, index) => {
      const matches = documentXML.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`Split pattern ${index + 1}: ${matches.length} matches found`);
        matches.slice(0, 3).forEach((match, i) => {
          console.log(`   ${i + 1}. ${match.substring(0, 150)}...`);
        });
        console.log('');
      }
    });

    // Save a snippet of the XML for manual inspection
    console.log('💾 SAVING XML SNIPPET FOR MANUAL INSPECTION:');
    console.log('============================================\n');
    
    const xmlSnippet = documentXML.substring(0, 5000);
    fs.writeFileSync('template-xml-snippet.txt', xmlSnippet);
    console.log('✅ Saved first 5000 characters to template-xml-snippet.txt');
    
    // Look for the specific section with your test content
    const testSectionStart = documentXML.indexOf('Test ifEqual');
    if (testSectionStart !== -1) {
      const testSection = documentXML.substring(testSectionStart, testSectionStart + 1000);
      fs.writeFileSync('test-section-xml.txt', testSection);
      console.log('✅ Saved test section XML to test-section-xml.txt');
    } else {
      console.log('❌ Could not find test section in XML');
    }

  } catch (error) {
    console.error('❌ Inspection failed:', error);
  }
}

inspectTemplateXML();