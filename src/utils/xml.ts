import { parseString, Builder } from 'xml2js';
import { XMLDocument, FormattingContext, RunProperties, ParagraphProperties } from '../types/index';

export class XMLUtils {
  /**
   * Parse XML string to JavaScript object
   */
  static async parseXML(xmlString: string): Promise<any> {
    return new Promise((resolve, reject) => {
      parseString(xmlString, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Convert JavaScript object back to XML string
   */
  static buildXML(obj: any): string {
    const builder = new Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8', standalone: true },
      renderOpts: { pretty: false }
    });
    return builder.buildObject(obj);
  }

  /**
   * Find all text nodes in XML that contain template tags
   */
  static findTemplateTagsInXML(xmlObj: any, currentPath: string = ''): Array<{
    path: string;
    value: string;
    parent: any;
    key: string;
  }> {
    const results: Array<{ path: string; value: string; parent: any; key: string }> = [];
    
    const traverse = (obj: any, path: string, parent: any = null, key: string = '') => {
      if (typeof obj === 'string') {
        // Check if string contains template tags
        if (this.containsTemplateTags(obj)) {
          results.push({ path, value: obj, parent, key });
        }
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          traverse(item, `${path}[${index}]`, obj, index.toString());
        });
      } else if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(k => {
          traverse(obj[k], path ? `${path}.${k}` : k, obj, k);
        });
      }
    };

    traverse(xmlObj, currentPath);
    return results;
  }

  /**
   * Check if string contains template tags
   */
  static containsTemplateTags(text: string): boolean {
    return /{[^}]+}/.test(text);
  }

  /**
   * Extract template tags from text
   */


static extractTemplateTags(text: string): Array<{
    fullTag: string;
    path: string;
    formatters: string[];
    startIndex: number;
    endIndex: number;
  }> {
    console.log(`🔍 XMLUtils.extractTemplateTags() - Input text: "${text}"`);
    
    const tags: Array<{
      fullTag: string;
      path: string;
      formatters: string[];
      startIndex: number;
      endIndex: number;
    }> = [];
    
    // REGEX to find template tags: {anything}
    const tagRegex = /\{([^{}]+)\}/g;
    let match;
    
    while ((match = tagRegex.exec(text)) !== null) {
      const fullTag = match[0];
      const content = match[1].trim();
      
      console.log(`  🏷️ Found template tag: "${fullTag}" with content: "${content}"`);
      
      // Skip malformed tags
      if (content.includes('{') || content.includes('}') || content.includes('<w:')) {
        console.log(`    ❌ Skipping malformed tag`);
        continue;
      }
      
      // Split on pipe for formatters, handling quotes properly
      const parts = this.smartSplitFormatters(content);
      const path = parts[0].trim();
      const formatters = parts.slice(1).map(f => f.trim()).filter(f => f.length > 0);
      
      console.log(`    📍 Path: "${path}"`);
      console.log(`    🔧 Formatters: [${formatters.join(', ')}]`);
      
      // Validate path - must start with 'data.' or be a direct reference
      if (!path || (!path.startsWith('data.') && !path.includes('.'))) {
        console.log(`    ❌ Invalid path: "${path}" - must start with 'data.' or contain dots`);
        continue;
      }
      
      tags.push({
        fullTag,
        path,
        formatters,
        startIndex: match.index,
        endIndex: match.index + fullTag.length
      });
      
      console.log(`    ✅ Valid template tag extracted`);
    }
    
    console.log(`🎯 XMLUtils.extractTemplateTags() - Found ${tags.length} valid template tags`);
    return tags;
  }


//   static extractTemplateTags(text: string): Array<{
//   fullTag: string;
//   path: string;
//   formatters: string[];
//   startIndex: number;
//   endIndex: number;
// }> {
//   // FIRST: Preprocess the text to merge any split template tags
//   const preprocessedText = this.preprocessXMLForTemplateTags(text);
  
//   const tags: Array<{
//     fullTag: string;
//     path: string;
//     formatters: string[];
//     startIndex: number;
//     endIndex: number;
//   }> = [];
  
//   // IMPROVED REGEX: Better Unicode support
//   const tagRegex = /\{([^{}]+)\}/gu;  // Unicode flag for proper character support
//   let match;
  
//   console.log('🔍 Extracting template tags from preprocessed text...');
  
//   while ((match = tagRegex.exec(preprocessedText)) !== null) {
//     const fullTag = match[0];
//     const content = match[1].trim();
    
//     console.log(`  Found template tag: "${fullTag}"`);
    
//     // Skip malformed tags
//     if (content.includes('{') || content.includes('}') || content.includes('<w:')) {
//       console.log(`    ❌ Skipping malformed tag`);
//       continue;
//     }
    
//     // Split on pipe, handling quotes properly
//     const parts = this.smartSplitFormatters(content);
//     const path = parts[0].trim();
//     const formatters = parts.slice(1).map(f => f.trim());
    
//     console.log(`    📍 Path: "${path}"`);
//     console.log(`    🔧 Formatters: [${formatters.join(', ')}]`);
    
//     // Validate path
//     if (!path || (!path.startsWith('data.') && !path.startsWith('#'))) {
//       console.log(`    ❌ Invalid path, skipping`);
//       continue;
//     }
    
//     tags.push({
//       fullTag,
//       path,
//       formatters,
//       startIndex: match.index,
//       endIndex: match.index + fullTag.length
//     });
    
//     console.log(`    ✅ Added template tag`);
//   }
  
//   console.log(`🎯 Total extracted: ${tags.length} valid template tags`);
//   return tags;
// }

private static smartSplitFormatters(content: string): string[] {
  const parts: string[] = [];
  let currentPart = '';
  let inQuotes = false;
  let quoteChar = '';
  let parenDepth = 0;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      currentPart += char;
    } else if (inQuotes && char === quoteChar && content[i-1] !== '\\') {
      inQuotes = false;
      quoteChar = '';
      currentPart += char;
    } else if (!inQuotes && char === '(') {
      parenDepth++;
      currentPart += char;
    } else if (!inQuotes && char === ')') {
      parenDepth--;
      currentPart += char;
    } else if (!inQuotes && char === '|' && parenDepth === 0) {
      // This is a formatter separator
      parts.push(currentPart.trim());
      currentPart = '';
    } else {
      currentPart += char;
    }
  }
  
  // Add the last part
  if (currentPart.trim()) {
    parts.push(currentPart.trim());
  }
  
  return parts;
}

  /**
   * Extract formatting context from Word XML run element
   */
  static extractFormattingContext(runElement: any): FormattingContext {
    const runProps: RunProperties = {};
    const paraProps: ParagraphProperties = {};

    // Extract run properties
    if (runElement['w:rPr']) {
      const rPr = runElement['w:rPr'][0];
      
      if (rPr['w:b']) runProps.bold = true;
      if (rPr['w:i']) runProps.italic = true;
      if (rPr['w:u']) runProps.underline = true;
      
      if (rPr['w:sz']) {
        runProps.fontSize = parseInt(rPr['w:sz'][0]['$']['w:val']) / 2; // Word uses half-points
      }
      
      if (rPr['w:rFonts']) {
        runProps.fontFamily = rPr['w:rFonts'][0]['$']['w:ascii'];
      }
      
      if (rPr['w:color']) {
        runProps.color = rPr['w:color'][0]['$']['w:val'];
      }
      
      if (rPr['w:highlight']) {
        runProps.highlight = rPr['w:highlight'][0]['$']['w:val'];
      }
    }

    return {
      runProperties: runProps,
      paragraphProperties: paraProps
    };
  }

  /**
   * Create Word XML run with formatting
   */
  static createWordRun(text: string, formatting: FormattingContext): any {
    const run: any = {
      'w:r': [{
        'w:t': [text]
      }]
    };

    // Add run properties if formatting exists
    if (Object.keys(formatting.runProperties).length > 0) {
      const rPr: any = {};
      
      if (formatting.runProperties.bold) rPr['w:b'] = [{}];
      if (formatting.runProperties.italic) rPr['w:i'] = [{}];
      if (formatting.runProperties.underline) rPr['w:u'] = [{ '$': { 'w:val': 'single' } }];
      
      if (formatting.runProperties.fontSize) {
        rPr['w:sz'] = [{ '$': { 'w:val': (formatting.runProperties.fontSize * 2).toString() } }];
      }
      
      if (formatting.runProperties.fontFamily) {
        rPr['w:rFonts'] = [{ '$': { 'w:ascii': formatting.runProperties.fontFamily } }];
      }
      
      if (formatting.runProperties.color) {
        rPr['w:color'] = [{ '$': { 'w:val': formatting.runProperties.color } }];
      }
      
      if (formatting.runProperties.highlight) {
        rPr['w:highlight'] = [{ '$': { 'w:val': formatting.runProperties.highlight } }];
      }

      if (Object.keys(rPr).length > 0) {
        run['w:r'][0]['w:rPr'] = [rPr];
      }
    }

    return run;
  }

  /**
   * Create paragraph with runs
   */
  static createWordParagraph(runs: any[], formatting?: FormattingContext): any {
    const paragraph: any = {
      'w:p': [{
        'w:r': runs
      }]
    };

    // Add paragraph properties if formatting exists
    if (formatting?.paragraphProperties && Object.keys(formatting.paragraphProperties).length > 0) {
      const pPr: any = {};
      
      if (formatting.paragraphProperties.alignment) {
        pPr['w:jc'] = [{ '$': { 'w:val': formatting.paragraphProperties.alignment } }];
      }
      
      if (formatting.paragraphProperties.spacing) {
        const spacing: any = {};
        if (formatting.paragraphProperties.spacing.before) {
          spacing['w:before'] = formatting.paragraphProperties.spacing.before.toString();
        }
        if (formatting.paragraphProperties.spacing.after) {
          spacing['w:after'] = formatting.paragraphProperties.spacing.after.toString();
        }
        if (formatting.paragraphProperties.spacing.line) {
          spacing['w:line'] = formatting.paragraphProperties.spacing.line.toString();
        }
        
        if (Object.keys(spacing).length > 0) {
          pPr['w:spacing'] = [{ '$': spacing }];
        }
      }

      if (Object.keys(pPr).length > 0) {
        paragraph['w:p'][0]['w:pPr'] = [pPr];
      }
    }

    return paragraph;
  }

  /**
   * Deep clone XML object
   */
  static deepCloneXML(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepCloneXML(item));
    }
    
    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepCloneXML(obj[key]);
      }
    }
    
    return cloned;
  }

  /**
   * Replace text in XML while preserving structure
   */
  static replaceTextInXML(xmlObj: any, oldText: string, newText: string): any {
    const cloned = this.deepCloneXML(xmlObj);
    
    const replace = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.replace(oldText, newText);
      } else if (Array.isArray(obj)) {
        return obj.map((item: any) => replace(item));
      } else if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            result[key] = replace(obj[key]);
          }
        }
        return result;
      }
      return obj;
    };
    
    return replace(cloned);
  }

  /**
   * Find element by path in XML object
   */
  static findElementByPath(xmlObj: any, path: string): any {
    const parts = path.split('.');
    let current = xmlObj;
    
    for (const part of parts) {
      if (part.includes('[') && part.includes(']')) {
        const [prop, indexStr] = part.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        current = current[prop] && current[prop][index];
      } else {
        current = current[part];
      }
      
      if (!current) return null;
    }
    
    return current;
  }

  /**
   * Set element at path in XML object
   */
  static setElementByPath(xmlObj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = xmlObj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      if (part.includes('[') && part.includes(']')) {
        const [prop, indexStr] = part.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        
        if (!current[prop]) current[prop] = [];
        if (!current[prop][index]) current[prop][index] = {};
        current = current[prop][index];
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    }
    
    const lastPart = parts[parts.length - 1];
    if (lastPart.includes('[') && lastPart.includes(']')) {
      const [prop, indexStr] = lastPart.split('[');
      const index = parseInt(indexStr.replace(']', ''));
      
      if (!current[prop]) current[prop] = [];
      current[prop][index] = value;
    } else {
      current[lastPart] = value;
    }
  }


  /**
 * Pre-process XML to merge split template tags before parsing
 * This fixes the issue where Word splits template tags across multiple XML elements
 */
static preprocessXMLForTemplateTags(xmlContent: string): string {
  console.log('🔧 Preprocessing XML to merge split template tags...');
  
  let processedXML = xmlContent;
  let mergeCount = 0;
  
  // Pattern to match split template tags
  // This finds patterns like: {data.something...}</w:t></w:r><w:r><w:rPr></w:rPr><w:t>...more content...}
  const splitTagPattern = /(\{[^}]*)<\/w:t><\/w:r><w:r[^>]*><w:rPr[^>]*><\/w:rPr><w:t[^>]*>([^}]*\})/g;
  
  // Keep merging until no more splits found
  let previousXML = '';
  while (previousXML !== processedXML) {
    previousXML = processedXML;
    
    // Merge simple splits (most common case)
    processedXML = processedXML.replace(splitTagPattern, (match, start, end) => {
      mergeCount++;
      console.log(`  Merged split ${mergeCount}: ${start}...${end}`);
      return start + end;
    });
    
    // Handle more complex splits with multiple </w:t></w:r><w:r><w:rPr></w:rPr><w:t> patterns
    const complexSplitPattern = /(\{[^}]*(?:<\/w:t><\/w:r><w:r[^>]*><w:rPr[^>]*><\/w:rPr><w:t[^>]*>[^}]*)*\})/g;
    processedXML = processedXML.replace(complexSplitPattern, (match) => {
      // Remove all Word XML tags from within the template tag
      const cleaned = match.replace(/<\/w:t><\/w:r><w:r[^>]*><w:rPr[^>]*><\/w:rPr><w:t[^>]*>/g, '');
      if (cleaned !== match) {
        mergeCount++;
        console.log(`  Complex merge ${mergeCount}: ${match.substring(0, 50)}... → ${cleaned.substring(0, 50)}...`);
      }
      return cleaned;
    });
  }
  
  // Also handle encoded quotes (&apos; → ')
  const quoteFixes = processedXML.replace(/&apos;/g, "'");
  if (quoteFixes !== processedXML) {
    console.log('  Fixed encoded quotes (&apos; → \')');
    processedXML = quoteFixes;
  }
  
  console.log(`✅ Preprocessed XML: ${mergeCount} splits merged`);
  return processedXML;
}

}