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

    for (const tag of templateTags) {
      try {
        const value = this.resolveDataPath(jsonData, tag.path);
        
        // Debug logging for array issues
        if (tag.path.includes('[') && tag.path.includes(']')) {
          console.log(`Processing array path: ${tag.path}, resolved value:`, value);
        }

        const formattedResult = BuiltInFormatters.applyFormatters(value, tag.formatters, tag.formattingContext);

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
        console.error(`Error processing data for tag ${tag.fullTag}:`, error);
        // Set error value to avoid template corruption
        processedData.values.set(tag.id, { 
          value: `[Error: ${error instanceof Error ? error.message : 'Unknown error'}]`,
          formatting: null 
        });
      }
    }

    return processedData;
  }

  /**
   * Resolve data path from JSON object
   */
  private resolveDataPath(data: any, path: string): any {
    try {
      // Handle array syntax like items[i] or items[0]
      if (path.includes('[') && path.includes(']')) {
        return this.resolveArrayPath(data, path);
      }

      // Handle nested object paths like user.profile.name
      const parts = path.split('.');
      let current = data;

      for (const part of parts) {
        if (current === null || current === undefined) {
          return null;
        }
        current = current[part];
      }

      return current;
    } catch (error) {
      console.warn(`Failed to resolve path ${path}:`, error);
      return null;
    }
  }

  /**
   * Resolve array paths with index notation
   */
  private resolveArrayPath(data: any, path: string): any {
    // Split path into segments, handling array notation
    const segments = this.parseArrayPath(path);
    let current = data;

    for (const segment of segments) {
      if (current === null || current === undefined) {
        return null;
      }

      if (segment.isArray) {
        current = current[segment.property];
        if (Array.isArray(current)) {
          if (segment.index === 'i') {
            // Return the whole array for table processing
            return current;
          } else if (typeof segment.index === 'number') {
            // Return specific array element
            if (segment.index >= 0 && segment.index < current.length) {
              current = current[segment.index];
            } else {
              return null; // Index out of bounds
            }
          }
        } else {
          return null; // Not an array
        }
      } else {
        current = current[segment.property];
      }
    }

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
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Process chart data
   */
  private async processChartData(
    chartValue: any, 
    tag: TemplateTag, 
    chartType: string = 'bar'
  ): Promise<ChartData> {
    try {
      // Validate chart data structure
      if (!chartValue || typeof chartValue !== 'object') {
        throw new Error('Chart data must be an object');
      }

      // Ensure data has required structure
      let chartConfig = chartValue;
      if (!chartConfig.labels || !chartConfig.datasets) {
        // Try to auto-format simple data
        chartConfig = this.autoFormatChartData(chartValue, chartType);
      }

      // Generate chart image using Canvas
      const chartBuffer = await this.generateChartImage(chartConfig, chartType);

      return {
        type: chartType as any,
        data: chartConfig,
        buffer: chartBuffer,
        relationshipId: this.generateRelationshipId()
      };

    } catch (error) {
      throw new Error(`Failed to process chart: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Process HTML content
   */
  private processHtmlContent(htmlValue: any): string {
    if (typeof htmlValue !== 'string') {
      return String(htmlValue);
    }

    // Basic HTML to Word conversion
    // This is a simplified version - a full implementation would need more comprehensive HTML parsing
    let converted = htmlValue;

    // Convert basic HTML tags to Word markup concepts
    converted = converted.replace(/<strong>(.*?)<\/strong>/g, '$1'); // Bold will be handled by formatting
    converted = converted.replace(/<b>(.*?)<\/b>/g, '$1');
    converted = converted.replace(/<em>(.*?)<\/em>/g, '$1'); // Italic will be handled by formatting
    converted = converted.replace(/<i>(.*?)<\/i>/g, '$1');
    converted = converted.replace(/<u>(.*?)<\/u>/g, '$1'); // Underline will be handled by formatting
    
    // Remove other HTML tags for now (advanced HTML conversion would go here)
    converted = converted.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    converted = converted.replace(/&nbsp;/g, ' ');
    converted = converted.replace(/&amp;/g, '&');
    converted = converted.replace(/&lt;/g, '<');
    converted = converted.replace(/&gt;/g, '>');
    converted = converted.replace(/&quot;/g, '"');

    return converted;
  }

  /**
   * Fetch image from URL
   */
  private async fetchImageFromUrl(url: string): Promise<Buffer> {
    try {
      const axios = require('axios');
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000, // 10 second timeout
        maxContentLength: 10 * 1024 * 1024 // 10MB max
      });

      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Failed to fetch image from URL: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Get file extension from URL
   */
  private getExtensionFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const extension = pathname.split('.').pop()?.toLowerCase();
      
      // Validate image extensions
      const validExtensions = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'];
      if (extension && validExtensions.includes(extension)) {
        return extension === 'jpg' ? 'jpeg' : extension;
      }
      
      return 'png'; // Default fallback
    } catch (error) {
      return 'png';
    }
  }

  /**
   * Auto-format simple data into chart configuration
   */
  private autoFormatChartData(data: any, chartType: string): any {
    // Handle different input formats
    if (Array.isArray(data)) {
      // Array of numbers
      if (data.every(item => typeof item === 'number')) {
        return {
          labels: data.map((_, index) => `Item ${index + 1}`),
          datasets: [{
            label: 'Data',
            data: data,
            backgroundColor: this.generateColors(data.length)
          }]
        };
      }
      
      // Array of objects with label/value pairs
      if (data.every(item => item && typeof item === 'object' && 'label' in item && 'value' in item)) {
        return {
          labels: data.map(item => item.label),
          datasets: [{
            label: 'Values',
            data: data.map(item => item.value),
            backgroundColor: this.generateColors(data.length)
          }]
        };
      }
    }

    // Object with key-value pairs
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const labels = Object.keys(data);
      const values = Object.values(data);
      
      if (values.every(value => typeof value === 'number')) {
        return {
          labels,
          datasets: [{
            label: 'Values',
            data: values,
            backgroundColor: this.generateColors(labels.length)
          }]
        };
      }
    }

    throw new Error('Unable to auto-format chart data. Please provide data in format: {labels: [], datasets: []}');
  }

  /**
   * Generate chart image using Canvas
   */
  private async generateChartImage(chartConfig: any, chartType: string): Promise<Buffer> {
    try {
      const { createCanvas } = require('canvas');
      const Chart = require('chart.js');
      
      // Create canvas
      const width = 800;
      const height = 600;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Configure Chart.js to work with node-canvas
      Chart.defaults.font.family = 'Arial';
      Chart.defaults.color = '#333';

      // Create chart
      const chart = new Chart(ctx, {
        type: chartType,
        data: chartConfig,
        options: {
          responsive: false,
          animation: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            }
          },
          scales: chartType === 'pie' || chartType === 'doughnut' ? {} : {
            y: {
              beginAtZero: true
            }
          }
        }
      });

      // Render chart
      chart.update();

      // Get image buffer
      return canvas.toBuffer('image/png');

    } catch (error) {
      throw new Error(`Failed to generate chart image: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Generate colors for chart
   */
  private generateColors(count: number): string[] {
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
      '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
      '#4BC0C0', '#36A2EB'
    ];

    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }

    return result;
  }

  /**
   * Generate unique relationship ID
   */
  private generateRelationshipId(): string {
    return `rId${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate data against template requirements
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
        errors.push(`Error validating data for ${tag.fullTag}: ${error instanceof Error ? error.message : error}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get data statistics
   */
  getDataStats(data: any): {
    totalProperties: number;
    nestedObjects: number;
    arrays: number;
    primitives: number;
    nullValues: number;
  } {
    const stats = {
      totalProperties: 0,
      nestedObjects: 0,
      arrays: 0,
      primitives: 0,
      nullValues: 0
    };

    const analyze = (obj: any) => {
      if (obj === null || obj === undefined) {
        stats.nullValues++;
        return;
      }

      if (Array.isArray(obj)) {
        stats.arrays++;
        stats.totalProperties++;
        obj.forEach(item => analyze(item));
      } else if (typeof obj === 'object') {
        stats.nestedObjects++;
        stats.totalProperties++;
        Object.values(obj).forEach(value => analyze(value));
      } else {
        stats.primitives++;
        stats.totalProperties++;
      }
    };

    analyze(data);
    return stats;
  }

  /**
   * Extract all unique paths from data
   */
  extractDataPaths(data: any, prefix: string = ''): string[] {
    const paths: string[] = [];

    const extract = (obj: any, currentPath: string) => {
      if (obj === null || obj === undefined) {
        return;
      }

      if (Array.isArray(obj)) {
        paths.push(currentPath);
        if (obj.length > 0) {
          // Add array item path
          extract(obj[0], `${currentPath}[i]`);
        }
      } else if (typeof obj === 'object') {
        if (currentPath) {
          paths.push(currentPath);
        }
        
        Object.keys(obj).forEach(key => {
          const newPath = currentPath ? `${currentPath}.${key}` : key;
          extract(obj[key], newPath);
        });
      } else {
        paths.push(currentPath);
      }
    };

    extract(data, prefix);
    return [...new Set(paths)].sort();
  }
}