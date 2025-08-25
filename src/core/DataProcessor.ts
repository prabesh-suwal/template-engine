import { 
  ProcessedData, 
  TemplateTag, 
  TableData, 
  ImageData, 
  ChartData 
} from '../types/index';
import { BuiltInFormatters } from '../formatters';

export class DataProcessor {
  /**
   * Process JSON data according to template tags
   */
  async processData(jsonData: any, templateTags: TemplateTag[]): Promise<ProcessedData> {
    const processedData: ProcessedData = {
      values: new Map(),
      dynamicTables: new Map(),
      images: new Map(),
      charts: new Map(),
      htmlContent: new Map()
    };

    console.log('🔧 Processing data with template tags...');
    console.log('📊 Input data structure:', JSON.stringify(jsonData, null, 2));

    for (const tag of templateTags) {
      try {
        console.log(`\n🏷️ Processing tag: ${tag.fullTag}`);
        console.log(`   Path: ${tag.path}`);
        console.log(`   Type: ${tag.type}`);
        console.log(`   Formatters: [${tag.formatters.join(', ')}]`);

        const value = this.resolveDataPath(jsonData, tag.path);
        console.log(`   Resolved value: ${JSON.stringify(value)} (type: ${typeof value})`);
        
        // Debug logging for array issues
        if (tag.path.includes('[') && tag.path.includes(']')) {
          console.log(`   Array path detected: ${tag.path}, resolved value:`, value);
        }

        const formattedResult = BuiltInFormatters.applyFormatters(value, tag.formatters, tag.formattingContext);
        console.log(`   Formatted result:`, formattedResult);

        switch (tag.type) {
          case 'simple':
            processedData.values.set(tag.id, formattedResult);
            break;

          case 'table':
            if (tag.path.includes('[i]')) {
              // This is a table iteration tag
              const tableData = await this.processTableData(value, tag);
              processedData.dynamicTables.set(tag.id, tableData);
            } else {
              // For direct array access or any other table type, let formatters handle it
              processedData.values.set(tag.id, formattedResult);
            }
            break;

          case 'image':
            const imageData = await this.processImageData(formattedResult.value, tag);
            processedData.images.set(tag.id, imageData);
            break;

          case 'chart':
            const chartData = await this.processChartData(formattedResult.value, tag, formattedResult.chartType);
            processedData.charts.set(tag.id, chartData);
            break;

          case 'html':
            const htmlContent = this.processHtmlContent(formattedResult.value);
            processedData.htmlContent.set(tag.id, htmlContent);
            break;

          default:
            processedData.values.set(tag.id, formattedResult);
        }

      } catch (error) {
        console.error(`❌ Error processing data for tag ${tag.fullTag}:`, error);
        // Set error value to avoid template corruption
        processedData.values.set(tag.id, { 
          value: `[Error: ${error instanceof Error ? error.message : 'Unknown error'}]`,
          formatting: null 
        });
      }
    }

    console.log('\n✅ Data processing completed');
    return processedData;
  }

  /**
   * FIXED: Resolve data path from JSON object
   */
  private resolveDataPath(data: any, path: string): any {
    console.log(`🔍 Resolving path: "${path}" in data:`, typeof data === 'object' ? Object.keys(data) : data);
    
    try {
      // Handle array syntax like items[i] or items[0]
      if (path.includes('[') && path.includes(']')) {
        return this.resolveArrayPath(data, path);
      }

      // Handle nested object paths like user.profile.name
      const parts = path.split('.');
      let current = data;

      console.log(`   Path parts: [${parts.join(', ')}]`);

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        console.log(`   Step ${i + 1}: Looking for "${part}" in:`, typeof current === 'object' && current !== null ? Object.keys(current) : current);
        
        if (current === null || current === undefined) {
          console.log(`   ❌ Current is null/undefined at step ${i + 1}`);
          return null;
        }
        
        if (typeof current !== 'object' || current === null) {
          console.log(`   ❌ Current is not an object at step ${i + 1}, got:`, typeof current);
          return null;
        }

        if (!(part in current)) {
          console.log(`   ❌ Property "${part}" not found. Available keys:`, Object.keys(current));
          return null;
        }

        current = current[part];
        console.log(`   ✅ Step ${i + 1} success: "${part}" = ${JSON.stringify(current)} (type: ${typeof current})`);
      }

      console.log(`   🎯 Final resolved value: ${JSON.stringify(current)} (type: ${typeof current})`);
      return current;
      
    } catch (error) {
      console.warn(`❌ Failed to resolve path ${path}:`, error);
      return null;
    }
  }

  /**
   * Resolve array paths with index notation
   */
  private resolveArrayPath(data: any, path: string): any {
    console.log(`🔍 Resolving array path: "${path}"`);
    
    // Split path into segments, handling array notation
    const segments = this.parseArrayPath(path);
    let current = data;

    console.log(`   Array segments:`, segments);

    for (const segment of segments) {
      console.log(`   Processing segment:`, segment);
      
      if (current === null || current === undefined) {
        console.log(`   ❌ Current is null/undefined`);
        return null;
      }

      if (segment.isArray) {
        // First get the property
        if (!(segment.property in current)) {
          console.log(`   ❌ Array property "${segment.property}" not found`);
          return null;
        }
        
        current = current[segment.property];
        console.log(`   Got array property "${segment.property}":`, Array.isArray(current) ? `Array[${current.length}]` : typeof current);
        
        if (Array.isArray(current)) {
          if (segment.index === 'i') {
            // Return the whole array for table processing
            console.log(`   ✅ Returning whole array for iteration`);
            return current;
          } else if (typeof segment.index === 'number') {
            // Return specific array element
            if (segment.index >= 0 && segment.index < current.length) {
              current = current[segment.index];
              console.log(`   ✅ Array element [${segment.index}]:`, current);
            } else {
              console.log(`   ❌ Array index ${segment.index} out of bounds (array length: ${current.length})`);
              return null; // Index out of bounds
            }
          }
        } else {
          console.log(`   ❌ Expected array but got:`, typeof current);
          return null; // Not an array
        }
      } else {
        if (!(segment.property in current)) {
          console.log(`   ❌ Property "${segment.property}" not found`);
          return null;
        }
        current = current[segment.property];
        console.log(`   ✅ Property "${segment.property}":`, current);
      }
    }

    console.log(`   🎯 Final array resolution result:`, current);
    return current;
  }

  /**
   * Parse array path into segments
   */
  private parseArrayPath(path: string): Array<{
    property: string;
    isArray: boolean;
    index?: string | number;
  }> {
    const segments: Array<{
      property: string;
      isArray: boolean;
      index?: string | number;
    }> = [];

    const parts = path.split('.');

    for (const part of parts) {
      if (part.includes('[') && part.includes(']')) {
        const [property, indexPart] = part.split('[');
        const index = indexPart.replace(']', '');
        
        segments.push({
          property,
          isArray: true,
          index: isNaN(Number(index)) ? index : Number(index)
        });
      } else {
        segments.push({
          property: part,
          isArray: false
        });
      }
    }

    return segments;
  }

  /**
   * Process table data for dynamic table generation
   */
  private async processTableData(data: any, tag: TemplateTag): Promise<TableData[]> {
    if (!Array.isArray(data)) {
      console.warn(`Table data for ${tag.fullTag} is not an array, got:`, typeof data, data);
      return [];
    }

    // Extract the base path (everything before [i])
    const basePath = tag.path.split('[')[0];
    
    // Process each row
    const processedRows = data.map((item, index) => {
      // Create a context for this row
      const rowContext = {
        ...item,
        _index: index,
        _isFirst: index === 0,
        _isLast: index === data.length - 1,
        _count: data.length
      };

      return rowContext;
    });

    return [{
      rows: processedRows,
      template: tag.xmlElement
    }];
  }

  /**
   * Process image data
   */
  private async processImageData(imageValue: any, tag: TemplateTag): Promise<ImageData> {
    try {
      let buffer: Buffer;
      let extension = 'png';

      if (typeof imageValue === 'string') {
        if (imageValue.startsWith('data:')) {
          // Base64 data URL
          const matches = imageValue.match(/^data:image\/([^;]+);base64,(.+)$/);
          if (matches) {
            extension = matches[1];
            buffer = Buffer.from(matches[2], 'base64');
          } else {
            throw new Error('Invalid base64 image data');
          }
        } else if (imageValue.startsWith('http')) {
          // URL - fetch the image
          buffer = await this.fetchImageFromUrl(imageValue);
          extension = this.getExtensionFromUrl(imageValue);
        } else {
          throw new Error('Unsupported image format');
        }
      } else if (Buffer.isBuffer(imageValue)) {
        buffer = imageValue;
      } else {
        throw new Error('Image value must be string (URL/base64) or Buffer');
      }

      return {
        buffer,
        extension,
        relationshipId: this.generateRelationshipId()
      };

    } catch (error) {
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process chart data
   */
  private async processChartData(chartValue: any, tag: TemplateTag, chartType: string): Promise<ChartData> {
    // Implementation for chart processing
    // This is a placeholder - implement based on your chart requirements
    throw new Error('Chart processing not implemented');
  }

  /**
   * Process HTML content
   */
  private processHtmlContent(htmlValue: any): string {
    // Convert HTML to Word XML format
    // This is a placeholder - implement based on your HTML requirements
    return String(htmlValue || '');
  }

  /**
   * Fetch image from URL
   */
  private async fetchImageFromUrl(url: string): Promise<Buffer> {
    // Implementation for fetching images
    throw new Error('Image fetching not implemented');
  }

  /**
   * Get file extension from URL
   */
  private getExtensionFromUrl(url: string): string {
    const match = url.match(/\.([^.?#]+)(\?|#|$)/);
    return match ? match[1] : 'png';
  }

  /**
   * Generate relationship ID
   */
  private generateRelationshipId(): string {
    return `rId${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate data against template tags
   */
  validateData(data: any, templateTags: TemplateTag[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const tag of templateTags) {
      try {
        const value = this.resolveDataPath(data, tag.path);

        // Check if required data is missing
        if (value === null || value === undefined) {
          // Check if this is an array iteration that should be skipped
          if (tag.path.includes('[i]')) {
            // For array iteration, check if the base array exists
            const basePath = tag.path.split('[')[0];
            const baseValue = this.resolveDataPath(data, basePath);
            if (!Array.isArray(baseValue)) {
              warnings.push(`Array not found for path: ${basePath} (tag: ${tag.fullTag})`);
            }
          } else {
            warnings.push(`No data found for path: ${tag.path} (tag: ${tag.fullTag})`);
          }
        }

        // Type-specific validation
        switch (tag.type) {
          case 'table':
            if (tag.path.includes('[i]')) {
              // Check base array for iteration tags
              const basePath = tag.path.split('[')[0];
              const baseValue = this.resolveDataPath(data, basePath);
              if (baseValue !== null && !Array.isArray(baseValue)) {
                errors.push(`Table tag ${tag.fullTag} expects array data at ${basePath}, got ${typeof baseValue}`);
              }
            } else if (tag.path.includes('[') && tag.path.includes(']')) {
              // Direct array access
              if (value === null) {
                warnings.push(`Array element not found: ${tag.path} (tag: ${tag.fullTag})`);
              }
            }
            break;

          case 'image':
            if (value !== null && typeof value !== 'string' && !Buffer.isBuffer(value)) {
              errors.push(`Image tag ${tag.fullTag} expects string URL/base64 or Buffer, got ${typeof value}`);
            }
            break;

          case 'chart':
            if (value !== null && typeof value !== 'object') {
              errors.push(`Chart tag ${tag.fullTag} expects object data, got ${typeof value}`);
            }
            break;
        }

      } catch (error) {
        errors.push(`Error validating data for ${tag.fullTag}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Extract data paths from an object (utility method used by TemplateEngine)
   */
  extractDataPaths(data: any, prefix: string = '', paths: string[] = []): string[] {
    if (data === null || data === undefined) {
      return paths;
    }

    if (typeof data === 'object' && !Array.isArray(data)) {
      // Handle objects
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          const newPrefix = prefix ? `${prefix}.${key}` : key;
          this.extractDataPaths(data[key], newPrefix, paths);
        }
      }
    } else if (Array.isArray(data)) {
      // Handle arrays
      const arrayPath = prefix ? `${prefix}[i]` : '[i]';
      paths.push(arrayPath);
      
      // Also extract paths from array elements if they're objects
      if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
        this.extractDataPaths(data[0], `${prefix ? prefix + '[i]' : '[i]'}`, paths);
      }
    } else {
      // Handle primitive values
      if (prefix) {
        paths.push(prefix);
      }
    }

    return [...new Set(paths)]; // Remove duplicates
  }

  /**
   * Get data statistics (utility method used by TemplateEngine)
   */
  getDataStats(data: any): {
    totalProperties: number;
    arrays: number;
    nestedObjects: number;
    maxDepth: number;
    dataTypes: { [type: string]: number };
  } {
    const stats = {
      totalProperties: 0,
      arrays: 0,
      nestedObjects: 0,
      maxDepth: 0,
      dataTypes: {} as { [type: string]: number }
    };

    const analyzeData = (obj: any, depth: number = 0): void => {
      if (depth > stats.maxDepth) {
        stats.maxDepth = depth;
      }

      if (obj === null || obj === undefined) {
        stats.dataTypes['null'] = (stats.dataTypes['null'] || 0) + 1;
        return;
      }

      const type = Array.isArray(obj) ? 'array' : typeof obj;
      stats.dataTypes[type] = (stats.dataTypes[type] || 0) + 1;

      if (Array.isArray(obj)) {
        stats.arrays++;
        obj.forEach(item => analyzeData(item, depth + 1));
      } else if (typeof obj === 'object') {
        if (depth > 0) stats.nestedObjects++;
        
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            stats.totalProperties++;
            analyzeData(obj[key], depth + 1);
          }
        }
      }
    };

    analyzeData(data);
    return stats;
  }
}