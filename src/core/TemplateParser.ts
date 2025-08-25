import { 
  ParsedTemplate, 
  TemplateTag, 
  ExtractedFiles, 
  FormattingContext, 
  Relationship,
  TagPosition
} from '../types/index';
import { XMLUtils } from '../utils/xml';
import { ZipUtils } from '../utils/zip';
import { generateId } from '../utils/common';

export class TemplateParser {
  /**
   * Parse DOCX template and extract all template tags - FIXED VERSION
   */
  async parseTemplate(docxBuffer: Buffer): Promise<ParsedTemplate> {
    try {
      console.log('🔧 Parsing DOCX template with split tag preprocessing...');
      
      // Extract DOCX files
      const extractedFiles = await ZipUtils.extractDocx(docxBuffer);
      
      // Validate DOCX structure
      const validation = ZipUtils.validateDocxStructure(extractedFiles);
      if (!validation.isValid) {
        throw new Error(`Invalid DOCX structure: ${validation.errors.join(', ')}`);
      }

      // CRITICAL: Preprocess the main document to fix split template tags
      await this.preprocessSplitTemplateTags(extractedFiles);

      // Parse XML files
      const xmlFiles = new Map();
      const xmlFileNames = ZipUtils.getXMLFiles(extractedFiles);
      
      for (const fileName of xmlFileNames) {
        const xmlContent = ZipUtils.getFileAsString(extractedFiles, fileName);
        const parsedXML = await XMLUtils.parseXML(xmlContent);
        xmlFiles.set(fileName, {
          xml: xmlContent,
          parsed: parsedXML
        });
      }

      // Extract relationships
      const relationships = await this.extractRelationships(extractedFiles);

      // Find all template tags (now they should be properly merged)
      const templateTags = await this.findAllTemplateTags(xmlFiles);

      console.log(`✅ Found ${templateTags.length} template tags after preprocessing`);

      // Extract formatting data
      const formattingData = await this.extractFormattingData(xmlFiles, templateTags);

      // Extract media files
      const mediaFiles = new Map();
      const mediaFileNames = ZipUtils.getMediaFiles(extractedFiles);
      
      for (const fileName of mediaFileNames) {
        const buffer = ZipUtils.getFileAsBuffer(extractedFiles, fileName);
        mediaFiles.set(fileName, buffer);
      }

      // Parse content types and properties
      const contentTypes = await this.parseContentTypes(extractedFiles);
      const appProperties = await this.parseAppProperties(extractedFiles);
      const coreProperties = await this.parseCoreProperties(extractedFiles);

      return {
        xmlFiles,
        relationships,
        templateTags,
        formattingData,
        mediaFiles,
        contentTypes,
        appProperties,
        coreProperties
      };

    } catch (error) {
      throw new Error(`Failed to parse template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * FIXED: Find all template tags in XML files
   */
  private async findAllTemplateTags(xmlFiles: Map<string, any>): Promise<TemplateTag[]> {
    console.log('🔍 Finding all template tags...');
    const allTags: TemplateTag[] = [];

    for (const [fileName, xmlDocument] of xmlFiles) {
      if (fileName.includes('document.xml') || fileName.includes('header') || fileName.includes('footer')) {
        console.log(`  Searching in ${fileName}...`);
        
        // Use XMLUtils to find text nodes containing template tags
        const foundTextNodes = XMLUtils.findTemplateTagsInXML(xmlDocument.parsed, fileName);
        
        for (const textNode of foundTextNodes) {
          console.log(`    🔍 Found text node: "${textNode.value}"`);
          
          // CRITICAL FIX: Extract individual template tags from the text
          const extractedTags = XMLUtils.extractTemplateTags(textNode.value);
          
          for (const extractedTag of extractedTags) {
            console.log(`      ✅ Extracted tag: "${extractedTag.fullTag}" -> path: "${extractedTag.path}"`);
            
            const templateTag: TemplateTag = {
              id: generateId(),
              fullTag: extractedTag.fullTag,
              path: extractedTag.path,
              formatters: extractedTag.formatters,
              xmlElement: textNode.parent,
              formattingContext: this.createDefaultFormattingContext(),
              position: {
                xmlPath: textNode.path,
                startIndex: extractedTag.startIndex,
                endIndex: extractedTag.endIndex,
                parentElement: fileName
              },
              type: this.determineTagType(extractedTag.path, extractedTag.formatters)
            };

            allTags.push(templateTag);
            console.log(`    ✅ Found: ${templateTag.path} [${templateTag.type}] formatters: [${templateTag.formatters.join(', ')}]`);
          }
        }
      }
    }

    console.log(`🎯 Total template tags found: ${allTags.length}`);
    return allTags;
  }

  /**
   * Preprocess XML content to fix split template tags
   */
  private async preprocessSplitTemplateTags(extractedFiles: ExtractedFiles): Promise<void> {
    console.log('🔧 Preprocessing split template tags...');
    console.log('  🔍 Searching for split template tags...');

    let totalFixed = 0;

    // Process main document
    if (ZipUtils.fileExists(extractedFiles, 'word/document.xml')) {
      const documentXml = ZipUtils.getFileAsString(extractedFiles, 'word/document.xml');
      const fixedXml = this.fixSplitTemplateTags(documentXml);
      
      if (fixedXml !== documentXml) {
        const fixCount = (fixedXml.match(/\{[^}]+\}/g) || []).length - (documentXml.match(/\{[^}]+\}/g) || []).length;
        totalFixed += Math.abs(fixCount);
        ZipUtils.setFileFromString(extractedFiles, 'word/document.xml', fixedXml);
      }
    }

    // Process headers and footers
    const headerFooterFiles = Object.keys(extractedFiles).filter(name => 
      name.includes('header') || name.includes('footer')
    );

    for (const fileName of headerFooterFiles) {
      const content = ZipUtils.getFileAsString(extractedFiles, fileName);
      const fixedContent = this.fixSplitTemplateTags(content);
      
      if (fixedContent !== content) {
        const fixCount = (fixedContent.match(/\{[^}]+\}/g) || []).length - (content.match(/\{[^}]+\}/g) || []).length;
        totalFixed += Math.abs(fixCount);
        ZipUtils.setFileFromString(extractedFiles, fileName, fixedContent);
      }
    }

    console.log(`  ✅ Preprocessing complete: ${totalFixed} template tags fixed`);
  }

  /**
   * Fix split template tags in XML content
   */
  private fixSplitTemplateTags(xmlContent: string): string {
    let fixedXML = xmlContent;
    let fixCount = 0;

    // Pattern 1: Basic split across runs
    // {something</w:t></w:r><w:r><w:rPr></w:rPr><w:t>else}
    const basicSplitPattern = /(\{[^}]*)<\/w:t><\/w:r><w:r[^>]*><w:rPr[^>]*><\/w:rPr><w:t[^>]*>([^}]*\})/g;
    
    let previousLength = 0;
    while (fixedXML.length !== previousLength) {
      previousLength = fixedXML.length;
      
      fixedXML = fixedXML.replace(basicSplitPattern, (match, start, end) => {
        fixCount++;
        console.log(`    Fixed split tag ${fixCount}: ${start}...${end}`);
        return start + end;
      });
    }

    // Pattern 2: Complex splits with multiple fragments
    // Handle cases where template tags are split across multiple w:t elements
    const complexSplitPattern = /(\{[^{}]*?)(<\/w:t><\/w:r><w:r[^>]*><w:rPr[^>]*><\/w:rPr><w:t[^>]*>)([^{}]*?\})/g;
    
    fixedXML = fixedXML.replace(complexSplitPattern, (match, start, middle, end) => {
      fixCount++;
      console.log(`    Fixed complex split tag ${fixCount}: ${start}...${end}`);
      return start + end;
    });

    // Pattern 3: Remove XML attributes from within template tags
    const xmlAttributePattern = /(\{[^}]*)\s+xml:space="preserve"([^}]*\})/g;
    fixedXML = fixedXML.replace(xmlAttributePattern, (match, start, end) => {
      console.log('    Removed xml:space attribute from template tag');
      return start + end;
    });

    return fixedXML;
  }

  /**
   * Determine the type of template tag
   */
  private determineTagType(path: string, formatters: string[]): 'simple' | 'table' | 'image' | 'chart' | 'html' {
    // Check formatters for special types
    if (formatters.includes('image')) return 'image';
    if (formatters.some(f => f.startsWith('chart'))) return 'chart';
    if (formatters.includes('html')) return 'html';
    if (formatters.includes('table') || path.includes('[') || path.includes('items') || path.includes('rows')) {
      return 'table';
    }
    
    return 'simple';
  }

  /**
   * Extract relationships from _rels files
   */
  private async extractRelationships(files: ExtractedFiles): Promise<Relationship[]> {
    const relationships: Relationship[] = [];
    
    try {
      // Main document relationships
      if (ZipUtils.fileExists(files, 'word/_rels/document.xml.rels')) {
        const relsXml = ZipUtils.getFileAsString(files, 'word/_rels/document.xml.rels');
        const parsedRels = await XMLUtils.parseXML(relsXml);
        
        if (parsedRels.Relationships && parsedRels.Relationships.Relationship) {
          const rels = Array.isArray(parsedRels.Relationships.Relationship) 
            ? parsedRels.Relationships.Relationship 
            : [parsedRels.Relationships.Relationship];
            
          for (const rel of rels) {
            relationships.push({
              id: rel.$.Id,
              type: rel.$.Type,
              target: rel.$.Target
            });
          }
        }
      }

      // Package relationships
      if (ZipUtils.fileExists(files, '_rels/.rels')) {
        const relsXml = ZipUtils.getFileAsString(files, '_rels/.rels');
        const parsedRels = await XMLUtils.parseXML(relsXml);
        
        if (parsedRels.Relationships && parsedRels.Relationships.Relationship) {
          const rels = Array.isArray(parsedRels.Relationships.Relationship) 
            ? parsedRels.Relationships.Relationship 
            : [parsedRels.Relationships.Relationship];
            
          for (const rel of rels) {
            relationships.push({
              id: rel.$.Id,
              type: rel.$.Type,
              target: rel.$.Target
            });
          }
        }
      }

    } catch (error) {
      console.warn('Failed to parse relationships:', error);
    }

    return relationships;
  }

  /**
   * Extract formatting data for template tags
   */
  private async extractFormattingData(
    xmlFiles: Map<string, any>, 
    templateTags: TemplateTag[]
  ): Promise<Map<string, FormattingContext>> {
    const formattingData = new Map<string, FormattingContext>();

    for (const tag of templateTags) {
      try {
        // Extract formatting from the XML element containing the tag
        const formatting = this.extractFormattingFromElement(tag.xmlElement);
        formattingData.set(tag.id, formatting);
        
        // Update the tag with the formatting context
        tag.formattingContext = formatting;
      } catch (error) {
        console.warn(`Failed to extract formatting for tag ${tag.id}:`, error);
        formattingData.set(tag.id, this.createDefaultFormattingContext());
      }
    }

    return formattingData;
  }

  /**
   * Extract formatting from XML element
   */
  private extractFormattingFromElement(element: any): FormattingContext {
    try {
      // Try to find run properties in the element or its parents
      return XMLUtils.extractFormattingContext(element);
    } catch (error) {
      return this.createDefaultFormattingContext();
    }
  }

  /**
   * Create default formatting context
   */
  private createDefaultFormattingContext(): FormattingContext {
    return {
      runProperties: {},
      paragraphProperties: {}
    };
  }

  /**
   * Parse content types from [Content_Types].xml
   */
  private async parseContentTypes(files: ExtractedFiles): Promise<any> {
    try {
      if (ZipUtils.fileExists(files, '[Content_Types].xml')) {
        const contentTypesXml = ZipUtils.getFileAsString(files, '[Content_Types].xml');
        return await XMLUtils.parseXML(contentTypesXml);
      }
    } catch (error) {
      console.warn('Failed to parse content types:', error);
    }
    return null;
  }

  /**
   * Parse app properties
   */
  private async parseAppProperties(files: ExtractedFiles): Promise<any> {
    try {
      if (ZipUtils.fileExists(files, 'docProps/app.xml')) {
        const appXml = ZipUtils.getFileAsString(files, 'docProps/app.xml');
        return await XMLUtils.parseXML(appXml);
      }
    } catch (error) {
      console.warn('Failed to parse app properties:', error);
    }
    return null;
  }

  /**
   * Parse core properties
   */
  private async parseCoreProperties(files: ExtractedFiles): Promise<any> {
    try {
      if (ZipUtils.fileExists(files, 'docProps/core.xml')) {
        const coreXml = ZipUtils.getFileAsString(files, 'docProps/core.xml');
        return await XMLUtils.parseXML(coreXml);
      }
    } catch (error) {
      console.warn('Failed to parse core properties:', error);
    }
    return null;
  }

  /**
   * Validate template structure
   */
  async validateTemplate(parsedTemplate: ParsedTemplate): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required XML files
    const requiredFiles = ['word/document.xml'];
    for (const file of requiredFiles) {
      if (!parsedTemplate.xmlFiles.has(file)) {
        errors.push(`Required XML file missing: ${file}`);
      }
    }

    // Validate template tags
    for (const tag of parsedTemplate.templateTags) {
      // Check for valid data paths
      if (!tag.path || !tag.path.trim()) {
        errors.push(`Template tag has empty path: ${tag.fullTag}`);
      }

      // Check for potentially problematic formatters
      for (const formatter of tag.formatters) {
        if (formatter.includes('<') || formatter.includes('>')) {
          warnings.push(`Template tag contains XML-like content in formatter: ${tag.fullTag}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get template statistics
   */
  getTemplateStats(parsedTemplate: ParsedTemplate): any {
    const tagTypes = new Map<string, number>();
    const formatterUsage = new Map<string, number>();
    
    for (const tag of parsedTemplate.templateTags) {
      // Count tag types
      tagTypes.set(tag.type, (tagTypes.get(tag.type) || 0) + 1);
      
      // Count formatter usage
      for (const formatter of tag.formatters) {
        const formatterName = formatter.split('(')[0];
        formatterUsage.set(formatterName, (formatterUsage.get(formatterName) || 0) + 1);
      }
    }

    return {
      totalTags: parsedTemplate.templateTags.length,
      tagTypeBreakdown: Object.fromEntries(tagTypes),
      formatterUsage: Object.fromEntries(formatterUsage),
      xmlFiles: parsedTemplate.xmlFiles.size,
      mediaFiles: parsedTemplate.mediaFiles.size,
      relationships: parsedTemplate.relationships.length
    };
  }
}