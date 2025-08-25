import { 
  GenerateOptions, 
  GenerationResult, 
  TemplateOptions, 
  ValidationResult,
  ParsedTemplate,
  ProcessedData,
  TemplateTag
} from '../types/index';
import { TemplateParser } from './TemplateParser';
import { DataProcessor } from './DataProcessor';
import { DocumentGenerator } from './DocumentGenerator';
import { BuiltInFormatters } from '../formatters';

/**
 * Main Template Engine class
 * This is the primary interface for the document generation system
 */
export class TemplateEngine {
  private templateParser: TemplateParser;
  private dataProcessor: DataProcessor;
  private documentGenerator: DocumentGenerator;
  private cachedTemplates: Map<string, ParsedTemplate>;

  constructor() {
    this.templateParser = new TemplateParser();
    this.dataProcessor = new DataProcessor();
    this.documentGenerator = new DocumentGenerator();
    this.cachedTemplates = new Map();
  }

  /**
   * Generate document from template and data
   */
  async generate(options: GenerateOptions): Promise<GenerationResult> {
    try {
      // Validate input
      this.validateGenerateOptions(options);

      console.log('🔧 TemplateEngine.generate() - Starting generation process...');
      console.log('📊 Input data received:', JSON.stringify(options.data, null, 2));

      // Parse template (with caching)
      const templateHash = this.getTemplateHash(options.template);
      let parsedTemplate = this.cachedTemplates.get(templateHash);
      
      if (!parsedTemplate) {
        console.log('Parsing template...');
        parsedTemplate = await this.templateParser.parseTemplate(options.template);
        this.cachedTemplates.set(templateHash, parsedTemplate);
      } else {
        console.log('Using cached template...');
      }

      // Validate template
      const templateValidation = await this.templateParser.validateTemplate(parsedTemplate);
      if (!templateValidation.isValid) {
        throw new Error(`Template validation failed: ${templateValidation.errors.join(', ')}`);
      }

      // Process data
      console.log('Processing data...');
      console.log('📋 Passing data to DataProcessor.processData():', JSON.stringify(options.data, null, 2));
      
      const processedData = await this.dataProcessor.processData(options.data, parsedTemplate.templateTags);

      // Validate data
      const dataValidation = this.dataProcessor.validateData(options.data, parsedTemplate.templateTags);
      if (!dataValidation.isValid) {
        console.warn('Data validation warnings:', dataValidation.warnings);
        // Continue with warnings, but log them
      }

      // Generate document
      console.log('Generating document...');
      const result = await this.documentGenerator.generateDocument(
        parsedTemplate,
        processedData,
        options,
        options.data  // Pass the raw data for conditional processing
      );

      // Validate generated document
      const documentValidation = await this.documentGenerator.validateGeneratedDocument(result.buffer);
      if (!documentValidation.isValid) {
        console.warn('Generated document validation warnings:', documentValidation.warnings);
      }

      console.log(`Document generated successfully in ${result.metadata.processingTime}ms`);
      return result;

    } catch (error) {
      console.error('❌ TemplateEngine.generate() failed:', error);
      throw new Error(`Document generation failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Parse template without generating document (useful for validation)
   */
  async parseTemplate(templateBuffer: Buffer): Promise<{
    parsedTemplate: ParsedTemplate;
    validation: ValidationResult;
    stats: any;
  }> {
    const parsedTemplate = await this.templateParser.parseTemplate(templateBuffer);
    const validation = await this.templateParser.validateTemplate(parsedTemplate);
    const stats = this.templateParser.getTemplateStats(parsedTemplate);

    return {
      parsedTemplate,
      validation,
      stats
    };
  }

  /**
   * Validate data against template
   */
  async validateData(data: any, templateBuffer: Buffer): Promise<ValidationResult> {
    const parsedTemplate = await this.templateParser.parseTemplate(templateBuffer);
    return this.dataProcessor.validateData(data, parsedTemplate.templateTags);
  }

  /**
   * Get template information without processing
   */
  async getTemplateInfo(templateBuffer: Buffer): Promise<{
    tags: Array<{
      path: string;
      type: string;
      formatters: string[];
    }>;
    stats: any;
    requiredData: string[];
  }> {
    const parsedTemplate = await this.templateParser.parseTemplate(templateBuffer);
    const stats = this.templateParser.getTemplateStats(parsedTemplate);

    const tags = parsedTemplate.templateTags.map((tag: TemplateTag) => ({
      path: tag.path,
      type: tag.type,
      formatters: tag.formatters
    }));

    const requiredData = [...new Set(parsedTemplate.templateTags.map((tag: TemplateTag) => tag.path))] as string[];

    return {
      tags,
      stats,
      requiredData
    };
  }

  /**
   * Register custom formatter
   */
  registerFormatter(name: string, formatter: (value: any, ...args: any[]) => any): void {
    BuiltInFormatters.registerFormatter(name, formatter);
  }

  /**
   * Get available formatters
   */
  getAvailableFormatters(): string[] {
    return BuiltInFormatters.getAvailableFormatters();
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.cachedTemplates.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    cachedTemplates: number;
    memoryUsage: string;
  } {
    const memoryUsage = process.memoryUsage();
    return {
      cachedTemplates: this.cachedTemplates.size,
      memoryUsage: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
    };
  }

  /**
   * Extract data paths from object (utility method)
   */
  extractDataPaths(data: any): string[] {
    return this.dataProcessor.extractDataPaths(data);
  }

  /**
   * Get data statistics
   */
  getDataStats(data: any): any {
    return this.dataProcessor.getDataStats(data);
  }

  /**
   * Validate generate options
   */
  private validateGenerateOptions(options: GenerateOptions): void {
    if (!options.template) {
      throw new Error('Template buffer is required');
    }

    if (!Buffer.isBuffer(options.template)) {
      throw new Error('Template must be a Buffer');
    }

    if (!options.data) {
      throw new Error('Data is required');
    }

    if (typeof options.data !== 'object') {
      throw new Error('Data must be an object');
    }

    // Validate options
    if (options.convertTo && !['docx', 'pdf'].includes(options.convertTo)) {
      throw new Error('convertTo must be "docx" or "pdf"');
    }
  }

  /**
   * Generate hash for template caching
   */
  private getTemplateHash(template: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(template).digest('hex');
  }

  /**
   * Create a simple template generator (utility)
   */
  static createSimpleTemplate(content: string): Buffer {
    // This is a utility method to create a basic DOCX template for testing
    // In a real implementation, users would provide their own DOCX templates
    
    const JSZip = require('jszip');
    const zip = new JSZip();

    // Minimal DOCX structure
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

    const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>${content}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

    // Add files to ZIP
    zip.file('[Content_Types].xml', contentTypes);
    zip.file('_rels/.rels', rels);
    zip.file('word/_rels/document.xml.rels', documentRels);
    zip.file('word/document.xml', document);

    return zip.generateAsync({ type: 'nodebuffer' });
  }

  /**
   * Batch processing for multiple documents
   */
  async generateBatch(
    templateBuffer: Buffer,
    dataArray: any[],
    options: TemplateOptions = {}
  ): Promise<GenerationResult[]> {
    const results: GenerationResult[] = [];
    
    // Parse template once for all documents
    const parsedTemplate = await this.templateParser.parseTemplate(templateBuffer);

    for (let i = 0; i < dataArray.length; i++) {
      try {
        console.log(`Processing document ${i + 1}/${dataArray.length}...`);
        
        const processedData = await this.dataProcessor.processData(dataArray[i], parsedTemplate.templateTags);
        const result = await this.documentGenerator.generateDocument(parsedTemplate, processedData, options);
        
        results.push(result);
      } catch (error) {
        console.error(`Error processing document ${i + 1}:`, error);
        // Add error result
        results.push({
          buffer: Buffer.alloc(0),
          metadata: {
            templateTags: 0,
            processingTime: 0,
            outputFormat: options.convertTo || 'docx',
            warnings: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`]
          }
        });
      }
    }

    return results;
  }

  /**
   * Stream processing for large datasets
   */
  async *generateStream(
    templateBuffer: Buffer,
    dataStream: AsyncIterable<any>,
    options: TemplateOptions = {}
  ): AsyncGenerator<GenerationResult, void, unknown> {
    // Parse template once
    const parsedTemplate = await this.templateParser.parseTemplate(templateBuffer);

    for await (const data of dataStream) {
      try {
        const processedData = await this.dataProcessor.processData(data, parsedTemplate.templateTags);
        const result = await this.documentGenerator.generateDocument(parsedTemplate, processedData, options);
        yield result;
      } catch (error) {
        console.error('Error in stream processing:', error);
        yield {
          buffer: Buffer.alloc(0),
          metadata: {
            templateTags: 0,
            processingTime: 0,
            outputFormat: options.convertTo || 'docx',
            warnings: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`]
          }
        };
      }
    }
  }

  /**
   * Get engine statistics
   */
  getEngineStats(): {
    version: string;
    uptime: number;
    cacheStats: any;
    memoryUsage: any;
    supportedFormats: string[];
    availableFormatters: string[];
  } {
    return {
      version: '1.0.0',
      uptime: process.uptime(),
      cacheStats: this.getCacheStats(),
      memoryUsage: process.memoryUsage(),
      supportedFormats: ['docx'],
      availableFormatters: this.getAvailableFormatters()
    };
  }
}