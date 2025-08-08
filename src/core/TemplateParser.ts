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
   * Parse DOCX template and extract all template tags
   */
  async parseTemplate(docxBuffer: Buffer): Promise<ParsedTemplate> {
    try {
      // Extract DOCX files
      const extractedFiles = await ZipUtils.extractDocx(docxBuffer);
      
      // Validate DOCX structure
      const validation = ZipUtils.validateDocxStructure(extractedFiles);
      if (!validation.isValid) {
        throw new Error(`Invalid DOCX structure: ${validation.errors.join(', ')}`);
      }

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

      // Find all template tags
      const templateTags = await this.findAllTemplateTags(xmlFiles);

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
      throw new Error(`Failed to parse template: ${error instanceof Error ? error.message : error}`);
    }
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
   * Find all template tags in XML files
   */
  private async findAllTemplateTags(xmlFiles: Map<string, any>): Promise<TemplateTag[]> {
    const templateTags: TemplateTag[] = [];

    for (const [fileName, xmlDoc] of xmlFiles) {
      if (fileName.includes('document.xml') || 
          fileName.includes('header') || 
          fileName.includes('footer')) {
        
        const tags = this.findTemplateTagsInDocument(xmlDoc.parsed, fileName);
        templateTags.push(...tags);
      }
    }

    return templateTags;
  }

  /**
   * Find template tags in a specific document
   */
  private findTemplateTagsInDocument(xmlObj: any, fileName: string): TemplateTag[] {
    const tags: TemplateTag[] = [];
    const foundTags = XMLUtils.findTemplateTagsInXML(xmlObj);

    for (const foundTag of foundTags) {
      const extractedTags = XMLUtils.extractTemplateTags(foundTag.value);
      
      for (const extractedTag of extractedTags) {
        const tag: TemplateTag = {
          id: generateId(),
          fullTag: extractedTag.fullTag,
          path: extractedTag.path,
          formatters: extractedTag.formatters,
          xmlElement: foundTag.parent,
          formattingContext: this.createDefaultFormattingContext(),
          position: {
            xmlPath: foundTag.path,
            startIndex: extractedTag.startIndex,
            endIndex: extractedTag.endIndex,
            parentElement: fileName
          },
          type: this.determineTagType(extractedTag.path, extractedTag.formatters)
        };

        tags.push(tag);
      }
    }

    return tags;
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
      // Check for malformed paths
      if (!tag.path || tag.path.trim() === '') {
        errors.push(`Template tag ${tag.fullTag} has empty path`);
      }

      // Check for unknown formatters
      for (const formatter of tag.formatters) {
        const formatterName = formatter.split('(')[0];
        // This would check against available formatters
        // if (!BuiltInFormatters.hasFormatter(formatterName)) {
        //   warnings.push(`Unknown formatter: ${formatterName} in tag ${tag.fullTag}`);
        // }
      }

      // Check for complex table tags
      if (tag.type === 'table' && !tag.path.includes('[')) {
        warnings.push(`Table tag ${tag.fullTag} may need array syntax like 'items[i].field'`);
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
  getTemplateStats(parsedTemplate: ParsedTemplate): {
    totalTags: number;
    tagsByType: { [type: string]: number };
    filesWithTags: string[];
    hasImages: boolean;
    hasCharts: boolean;
    hasTables: boolean;
  } {
    const stats = {
      totalTags: parsedTemplate.templateTags.length,
      tagsByType: {} as { [type: string]: number },
      filesWithTags: [] as string[],
      hasImages: false,
      hasCharts: false,
      hasTables: false
    };

    // Count tags by type
    for (const tag of parsedTemplate.templateTags) {
      stats.tagsByType[tag.type] = (stats.tagsByType[tag.type] || 0) + 1;
      
      if (tag.type === 'image') stats.hasImages = true;
      if (tag.type === 'chart') stats.hasCharts = true;
      if (tag.type === 'table') stats.hasTables = true;
    }

    // Get unique files with tags
    const filesSet = new Set(parsedTemplate.templateTags.map((tag: TemplateTag) => tag.position.parentElement));
    stats.filesWithTags = Array.from(filesSet) as string[];

    return stats;
  }
}