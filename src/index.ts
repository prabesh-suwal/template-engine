/**
 * DOCX Template Engine
 * A powerful document generation engine that converts DOCX templates with JSON data
 */

// Core exports
export { TemplateEngine } from './core/TemplateEngine';
export { TemplateParser } from './core/TemplateParser';
export { DataProcessor } from './core/DataProcessor';
export { DocumentGenerator } from './core/DocumentGenerator';

// Formatters
export { BuiltInFormatters } from './formatters';

// Utilities
export { XMLUtils } from './utils/xml';
export { ZipUtils } from './utils/zip';

// Types
export * from './types/index';

// Default export - the main engine
export { TemplateEngine as default } from './core/TemplateEngine';

/**
 * Quick start function for simple document generation
 */
import { TemplateEngine } from './core/TemplateEngine';
import { GenerateOptions, GenerationResult } from './types/index';

/**
 * Generate a document with minimal setup
 * @param templateBuffer DOCX template as Buffer
 * @param data JSON data object
 * @param options Optional generation options
 */
export async function generateDocument(
  templateBuffer: Buffer,
  data: any,
  options: Partial<GenerateOptions> = {}
): Promise<GenerationResult> {
  const engine = new TemplateEngine();
  return engine.generate({
    template: templateBuffer,
    data,
    ...options
  });
}

/**
 * Validate template structure
 * @param templateBuffer DOCX template as Buffer
 */
export async function validateTemplate(templateBuffer: Buffer) {
  const engine = new TemplateEngine();
  return engine.parseTemplate(templateBuffer);
}

/**
 * Get template information
 * @param templateBuffer DOCX template as Buffer
 */
export async function getTemplateInfo(templateBuffer: Buffer) {
  const engine = new TemplateEngine();
  return engine.getTemplateInfo(templateBuffer);
}

/**
 * Create engine instance with custom configuration
 */
export function createEngine(): TemplateEngine {
  return new TemplateEngine();
}

/**
 * Version information
 */
export const VERSION = '1.0.0';

/**
 * Library information
 */
export const LIBRARY_INFO = {
  name: 'docx-template-engine',
  version: VERSION,
  description: 'A powerful DOCX template engine with JSON data injection',
  author: 'Your Name',
  license: 'MIT'
};

/**
 * Supported features
 */
export const FEATURES = {
  formats: {
    input: ['docx'],
    output: ['docx', 'pdf']
  },
  templateFeatures: [
    'Simple variable injection',
    'Dynamic tables',
    'Image insertion',
    'Chart generation',
    'HTML content blocks',
    'Nested object support',
    'Format preservation',
    'Custom formatters'
  ],
  formatters: [
    'Text formatting (bold, italic, underline)',
    'Text transformations (upper, lower, capitalize)',
    'Number formatting (currency, percentage, comma)',
    'Date formatting',
    'Conditional formatting',
    'Array operations',
    'Color and font styling'
  ]
};

/**
 * Error types for better error handling
 */
export class TemplateEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TemplateEngineError';
  }
}

export class TemplateParseError extends TemplateEngineError {
  constructor(message: string, details?: any) {
    super(message, 'TEMPLATE_PARSE_ERROR', details);
    this.name = 'TemplateParseError';
  }
}

export class DataProcessingError extends TemplateEngineError {
  constructor(message: string, details?: any) {
    super(message, 'DATA_PROCESSING_ERROR', details);
    this.name = 'DataProcessingError';
  }
}

export class DocumentGenerationError extends TemplateEngineError {
  constructor(message: string, details?: any) {
    super(message, 'DOCUMENT_GENERATION_ERROR', details);
    this.name = 'DocumentGenerationError';
  }
}

/**
 * Utility functions
 */
export const utils = {
  /**
   * Check if buffer is a valid DOCX file
   */
  isValidDocx: async (buffer: Buffer): Promise<boolean> => {
    try {
      const { ZipUtils } = await import('./utils/zip');
      const files = await ZipUtils.extractDocx(buffer);
      const validation = ZipUtils.validateDocxStructure(files);
      return validation.isValid;
    } catch {
      return false;
    }
  },

  /**
   * Get file size in human readable format
   */
  formatFileSize: (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Generate sample data based on template
   */
  generateSampleData: async (templateBuffer: Buffer): Promise<any> => {
    const engine = new TemplateEngine();
    const info = await engine.getTemplateInfo(templateBuffer);
    
    const sampleData: any = {};
    
    for (const tag of info.tags) {
      const path = tag.path;
      const pathParts = path.split('.');
      
      let current = sampleData;
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (part.includes('[')) {
          const [prop] = part.split('[');
          if (!current[prop]) current[prop] = [{}];
          current = current[prop][0];
        } else {
          if (!current[part]) current[part] = {};
          current = current[part];
        }
      }
      
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart.includes('[')) {
        const [prop] = lastPart.split('[');
        if (!current[prop]) current[prop] = [];
      } else {
        // Generate sample value based on tag type
        switch (tag.type) {
          case 'image':
            current[lastPart] = 'https://via.placeholder.com/300x200';
            break;
          case 'chart':
            current[lastPart] = {
              labels: ['Jan', 'Feb', 'Mar'],
              datasets: [{
                label: 'Sample Data',
                data: [10, 20, 30]
              }]
            };
            break;
          case 'table':
            current[lastPart] = [
              { name: 'Item 1', value: 100 },
              { name: 'Item 2', value: 200 }
            ];
            break;
          default:
            current[lastPart] = `Sample ${lastPart}`;
        }
      }
    }
    
    return sampleData;
  }
};

/**
 * Configuration options
 */
export interface EngineConfig {
  cacheTemplates?: boolean;
  maxCacheSize?: number;
  imageTimeout?: number;
  maxImageSize?: number;
  enableLogging?: boolean;
}

/**
 * Configure the engine globally
 */
let globalConfig: EngineConfig = {
  cacheTemplates: true,
  maxCacheSize: 100,
  imageTimeout: 10000,
  maxImageSize: 10 * 1024 * 1024, // 10MB
  enableLogging: true
};

export function configure(config: Partial<EngineConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

export function getConfig(): EngineConfig {
  return { ...globalConfig };
}