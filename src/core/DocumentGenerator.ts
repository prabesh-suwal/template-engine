import {
  ParsedTemplate,
  ProcessedData,
  GenerationResult,
  TemplateOptions,
  ExtractedFiles,
  TemplateTag
} from '../types/index';
import { ZipUtils } from '../utils/zip';
import { XMLUtils } from '../utils/xml';
import { ConditionalProcessor } from './ConditionalProcessor'; // Import the ConditionalProcessor

export class DocumentGenerator {
  private conditionalProcessor: ConditionalProcessor;

  constructor() {
    this.conditionalProcessor = new ConditionalProcessor();
  }

  /**
   * Generate document from parsed template and processed data
   */
  async generateDocument(
    parsedTemplate: ParsedTemplate,
    processedData: ProcessedData,
    options: TemplateOptions = {},
    rawData?: any  // Add raw data parameter
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    console.log('🏗️ DocumentGenerator.generateDocument() - Starting document generation...');

    try {
      // Clone the extracted files for modification
      const modifiedFiles = this.cloneExtractedFiles(parsedTemplate);

      // STEP 1: Process conditional blocks FIRST (before template tags)
      console.log('🔀 Processing conditional blocks...');
      await this.processConditionalBlocks(modifiedFiles, processedData, rawData);

      // STEP 2: Process regular template tags (after conditionals)
      console.log('🏷️ Processing template tags...');
      await this.processAllTemplateTags(parsedTemplate.templateTags, processedData, modifiedFiles);

      // Generate final DOCX
      const resultBuffer = await ZipUtils.createDocx(modifiedFiles);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      console.log(`✅ Document generation completed in ${processingTime}ms`);

      return {
        buffer: resultBuffer,
        metadata: {
          templateTags: parsedTemplate.templateTags.length,
          processingTime,
          outputFormat: options.convertTo || 'docx',
          warnings: []
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ Document generation failed:', error);
      
      throw new Error(`Document generation failed after ${processingTime}ms: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * STEP 1: Process conditional blocks in all XML files
   */
  private async processConditionalBlocks(
    modifiedFiles: ExtractedFiles,
    processedData: ProcessedData,
    rawData?: any
  ): Promise<void> {
    const xmlFiles = ['word/document.xml', 'word/header1.xml', 'word/footer1.xml'];
    
    for (const fileName of xmlFiles) {
      if (ZipUtils.fileExists(modifiedFiles, fileName)) {
        try {
          console.log(`  Processing conditionals in ${fileName}...`);
          
          let xmlContent = ZipUtils.getFileAsString(modifiedFiles, fileName);
          
          // Process conditional blocks using ConditionalProcessor with raw data
          const processedXmlContent = await this.conditionalProcessor.processConditionalBlocks(
            xmlContent, 
            processedData,
            rawData  // Pass raw data to conditional processor
          );
          
          // Update the file with processed content
          ZipUtils.setFileFromString(modifiedFiles, fileName, processedXmlContent);
          
          console.log(`  ✅ Conditional processing complete for ${fileName}`);
          
        } catch (error) {
          console.error(`❌ Error processing conditionals in ${fileName}:`, error);
          // Continue with other files
        }
      }
    }
  }

  /**
   * STEP 2: Process regular template tags (after conditionals are resolved)
   */
  private async processAllTemplateTags(
    templateTags: TemplateTag[],
    processedData: ProcessedData,
    modifiedFiles: ExtractedFiles
  ): Promise<void> {
    // Group tags by file
    const tagsByFile = new Map<string, TemplateTag[]>();
    
    for (const tag of templateTags) {
      const fileName = tag.position.parentElement;
      if (!tagsByFile.has(fileName)) {
        tagsByFile.set(fileName, []);
      }
      tagsByFile.get(fileName)!.push(tag);
    }

    // Process each file
    for (const [fileName, tags] of tagsByFile) {
      try {
        await this.processFileTemplateTags(fileName, tags, processedData, modifiedFiles);
      } catch (error) {
        console.error(`Error processing tags in file ${fileName}:`, error);
        throw error;
      }
    }
  }

  /**
   * Process template tags in a specific file
   */
  private async processFileTemplateTags(
    fileName: string,
    tags: TemplateTag[],
    processedData: ProcessedData,
    modifiedFiles: ExtractedFiles
  ): Promise<void> {
    let xmlContent = ZipUtils.getFileAsString(modifiedFiles, fileName);

    console.log(`\n=== Processing ${tags.length} tags in ${fileName} ===`);

    // Separate table iteration tags from regular tags
    const tableIterationTags = tags.filter(tag => tag.path.includes('[i]'));
    const nonTableTags = tags.filter(tag => !tag.path.includes('[i]'));
    
    console.log(`Found ${tableIterationTags.length} table iteration tags`);
    console.log(`Found ${nonTableTags.length} non-table tags`);

    // Process table iteration tags first
    if (tableIterationTags.length > 0) {
      console.log('--- Processing table iteration tags ---');
      for (const tag of tableIterationTags) {
        try {
          xmlContent = await this.processTableIterationTag(tag, processedData, xmlContent);
        } catch (error) {
          console.error(`Error processing table tag ${tag.fullTag}:`, error);
        }
      }
    }

    // Then process regular tags
    if (nonTableTags.length > 0) {
      console.log(`--- Processing ${nonTableTags.length} non-table tags ---`);
      for (const tag of nonTableTags) {
        try {
          console.log(`Processing non-table tag: ${tag.fullTag}`);
          const replacementContent = await this.generateTagReplacement(tag, processedData);
          
          // Replace the tag in XML
          const escapedTag = tag.fullTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedTag, 'g');
          xmlContent = xmlContent.replace(regex, replacementContent);
        } catch (error) {
          console.error(`Error processing non-table tag ${tag.fullTag}:`, error);
        }
      }
    }

    console.log(`=== Completed processing ${fileName} ===`);

    // Update the file with processed content
    ZipUtils.setFileFromString(modifiedFiles, fileName, xmlContent);
  }

  /**
   * Process table iteration tags
   */
  private async processTableIterationTag(
    tag: TemplateTag,
    processedData: ProcessedData,
    xmlContent: string
  ): Promise<string> {
    console.log(`Processing table iteration tag: ${tag.fullTag}`);

    // Get table data
    const tableData = processedData.dynamicTables.get(tag.id);
    if (!tableData || tableData.length === 0) {
      console.warn(`No table data found for ${tag.fullTag}`);
      return xmlContent.replace(tag.fullTag, '');
    }

    // Find the table row containing this tag
    const tableRowMatch = this.findTableRowContainingTag(xmlContent, tag.fullTag);
    if (!tableRowMatch) {
      console.warn(`Could not find table row for ${tag.fullTag}`);
      return xmlContent;
    }

    const { rowXml, startIndex, endIndex } = tableRowMatch;

    // Generate rows for each data item
    const generatedRows: string[] = [];
    
    for (const tableDataSet of tableData) {
      for (const rowData of tableDataSet.rows) {
        let generatedRow = rowXml;
        
        // Replace all template tags in this row with actual data
        generatedRow = generatedRow.replace(/\{([^}]+)\}/g, (match, tagContent) => {
          try {
            const pathParts = tagContent.split('|')[0].trim();
            
            // Handle array iteration paths like data.items[i].name
            if (pathParts.includes('[i]')) {
              const basePath = pathParts.replace(/\[i\]/g, '').replace(/^data\./, '');
              const value = this.getNestedValue(rowData, basePath);
              return String(value || '');
            }
            
            return match; // Keep original if not an iteration tag
          } catch (error) {
            console.error(`Error replacing tag in table row: ${match}`, error);
            return match;
          }
        });
        
        generatedRows.push(generatedRow);
      }
    }

    // Replace the original row with generated rows
    const before = xmlContent.substring(0, startIndex);
    const after = xmlContent.substring(endIndex);
    
    return before + generatedRows.join('') + after;
  }

  /**
   * Find table row containing a specific tag
   */
  private findTableRowContainingTag(xmlContent: string, fullTag: string): {
    rowXml: string;
    startIndex: number;
    endIndex: number;
  } | null {
    const tagIndex = xmlContent.indexOf(fullTag);
    if (tagIndex === -1) return null;

    // Find the table row (<w:tr>) that contains this tag
    let searchStart = tagIndex;
    let rowStart = -1;
    let rowEnd = -1;

    // Search backwards for <w:tr>
    while (searchStart >= 0) {
      const trIndex = xmlContent.lastIndexOf('<w:tr', searchStart);
      if (trIndex !== -1) {
        rowStart = trIndex;
        break;
      }
      searchStart--;
    }

    if (rowStart === -1) return null;

    // Search forwards for </w:tr>
    const trEndIndex = xmlContent.indexOf('</w:tr>', tagIndex);
    if (trEndIndex === -1) return null;
    
    rowEnd = trEndIndex + '</w:tr>'.length;

    const rowXml = xmlContent.substring(rowStart, rowEnd);
    
    return {
      rowXml,
      startIndex: rowStart,
      endIndex: rowEnd
    };
  }

  /**
   * Generate replacement content for a template tag
   */
  private async generateTagReplacement(
    tag: TemplateTag,
    processedData: ProcessedData
  ): Promise<string> {
    switch (tag.type) {
      case 'simple':
        return this.generateSimpleReplacement(tag, processedData);
        
      case 'table':
        return this.generateTableReplacement(tag, processedData);
        
      case 'image':
        return this.generateImageReplacement(tag, processedData);
        
      case 'chart':
        return this.generateChartReplacement(tag, processedData);
        
      case 'html':
        return this.generateHtmlReplacement(tag, processedData);
        
      default:
        return this.generateSimpleReplacement(tag, processedData);
    }
  }

  /**
   * Generate replacement for simple text tags
   */
  private generateSimpleReplacement(
    tag: TemplateTag,
    processedData: ProcessedData
  ): string {
    const data = processedData.values.get(tag.id);
    if (!data) {
      return '';
    }

    // If formatting is applied, we need to wrap in proper Word XML
    if (data.formatting) {
      return this.wrapInWordFormatting(String(data.value), data.formatting, tag.formattingContext);
    }

    return String(data.value || '');
  }

  /**
   * Generate replacement for table tags
   */
  private generateTableReplacement(
    tag: TemplateTag,
    processedData: ProcessedData
  ): string {
    // Table iteration tags are handled separately
    if (tag.path.includes('[i]')) {
      return tag.fullTag; // Leave unchanged, will be processed by table logic
    }

    // Direct table/array access
    const data = processedData.values.get(tag.id);
    return data ? String(data.value || '') : '';
  }

  /**
   * Generate replacement for image tags
   */
  private generateImageReplacement(
    tag: TemplateTag,
    processedData: ProcessedData
  ): string {
    // Implementation for image tags
    return '[IMAGE]'; // Placeholder
  }

  /**
   * Generate replacement for chart tags
   */
  private generateChartReplacement(
    tag: TemplateTag,
    processedData: ProcessedData
  ): string {
    // Implementation for chart tags
    return '[CHART]'; // Placeholder
  }

  /**
   * Generate replacement for HTML tags
   */
  private generateHtmlReplacement(
    tag: TemplateTag,
    processedData: ProcessedData
  ): string {
    // Implementation for HTML tags
    return '[HTML]'; // Placeholder
  }

  /**
   * Wrap text in Word formatting XML
   */
  private wrapInWordFormatting(text: string, formatting: any, context: any): string {
    // Implementation for Word XML formatting
    return text; // Simplified for now
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Validate generated document
   */
  async validateGeneratedDocument(buffer: Buffer): Promise<{
    isValid: boolean;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    let isValid = true;

    try {
      // Basic validation - check if it's a valid ZIP
      if (buffer.length === 0) {
        isValid = false;
        warnings.push('Generated document is empty');
        return { isValid, warnings };
      }

      // Try to extract and validate structure
      const extractedFiles = await ZipUtils.extractDocx(buffer);
      const validation = ZipUtils.validateDocxStructure(extractedFiles);
      
      if (!validation.isValid) {
        isValid = false;
        warnings.push(...validation.errors);
      }

      // Check for unprocessed template tags
      const xmlFiles = ['word/document.xml'];
      for (const fileName of xmlFiles) {
        if (ZipUtils.fileExists(extractedFiles, fileName)) {
          const content = ZipUtils.getFileAsString(extractedFiles, fileName);
          const remainingTags = content.match(/\{[^}]+\}/g);
          if (remainingTags) {
            warnings.push(`Unprocessed template tags found in ${fileName}: ${remainingTags.join(', ')}`);
          }
        }
      }

    } catch (error) {
      isValid = false;
      warnings.push(`Validation error: ${error instanceof Error ? error.message : error}`);
    }

    return { isValid, warnings };
  }

  /**
   * Clone extracted files for modification
   */
  private cloneExtractedFiles(parsedTemplate: ParsedTemplate): ExtractedFiles {
    // Create a deep copy of the extracted files
    const clonedFiles: ExtractedFiles = {};
    
    // Convert XML files back to Buffers for the extracted files structure
    for (const [fileName, fileData] of parsedTemplate.xmlFiles) {
      clonedFiles[fileName] = Buffer.from(fileData.xml, 'utf8');
    }
    
    // Add media files
    for (const [fileName, buffer] of parsedTemplate.mediaFiles) {
      clonedFiles[fileName] = buffer;
    }

    return clonedFiles;
  }
}