// Core Types for the Document Generation Engine

export {}; // Make this file a module

export interface TemplateOptions {
  convertTo?: 'docx' | 'pdf';
  preserveOriginalFormatting?: boolean;
  enableCharts?: boolean;
  enableImages?: boolean;
  imageTimeout?: number;
  maxImageSize?: number;
}

export interface GenerateOptions extends TemplateOptions {
  data: any;
  template: Buffer;
}

export interface TemplateTag {
  id: string;
  fullTag: string;
  path: string;
  formatters: string[];
  xmlElement: any;
  formattingContext: FormattingContext;
  position: TagPosition;
  type: 'simple' | 'table' | 'image' | 'chart' | 'html';
}

export interface TagPosition {
  xmlPath: string;
  startIndex: number;
  endIndex: number;
  parentElement: string;
}

export interface FormattingContext {
  runProperties: RunProperties;
  paragraphProperties: ParagraphProperties;
  styleId?: string;
  parentFormatting?: FormattingContext;
}

export interface RunProperties {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  highlight?: string;
}

export interface ParagraphProperties {
  alignment?: 'left' | 'center' | 'right' | 'justify';
  spacing?: {
    before?: number;
    after?: number;
    line?: number;
  };
  indentation?: {
    left?: number;
    right?: number;
    firstLine?: number;
  };
}

export interface ParsedTemplate {
  xmlFiles: Map<string, any>;
  relationships: Relationship[];
  templateTags: TemplateTag[];
  formattingData: Map<string, FormattingContext>;
  mediaFiles: Map<string, Buffer>;
  contentTypes: any;
  appProperties: any;
  coreProperties: any;
}

export interface Relationship {
  id: string;
  type: string;
  target: string;
}

export interface ProcessedData {
  values: Map<string, any>;
  dynamicTables: Map<string, TableData[]>;
  images: Map<string, ImageData>;
  charts: Map<string, ChartData>;
  htmlContent: Map<string, string>;
}

export interface TableData {
  rows: any[];
  headers?: string[];
  template: any;
}

export interface ImageData {
  buffer: Buffer;
  extension: string;
  width?: number;
  height?: number;
  relationshipId: string;
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  data: any;
  options?: any;
  buffer: Buffer;
  relationshipId: string;
}

export interface ExtractedFiles {
  [path: string]: Buffer;
}

export interface XMLDocument {
  xml: string;
  parsed: any;
}

export interface GenerationResult {
  buffer: Buffer;
  metadata: {
    templateTags: number;
    processingTime: number;
    outputFormat: string;
    warnings?: string[];
  };
}

export interface FormatterFunction {
  (value: any, ...args: any[]): any;
}

export interface Formatters {
  [name: string]: FormatterFunction;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EngineError extends Error {
  code: string;
  details?: any;
}

// Formatter Types
export interface FormatterContext {
  currentValue: any;
  originalValue: any;
  formattingContext: FormattingContext;
  templateTag: TemplateTag;
}

// Chart specific types
export interface ChartConfiguration {
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  data: {
    labels: string[];
    datasets: ChartDataset[];
  };
  options?: any;
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

// Image specific types
export interface ImageConfiguration {
  url?: string;
  base64?: string;
  buffer?: Buffer;
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
}