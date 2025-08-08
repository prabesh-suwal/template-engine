import { FormatterFunction, Formatters, FormattingContext, RunProperties } from '../types/index';

/**
 * Built-in formatters for the template engine
 */
export class BuiltInFormatters {
  static formatters: Formatters = {
    // Text formatting
    bold: (value: any): { value: any; formatting: Partial<RunProperties> } => ({
      value,
      formatting: { bold: true }
    }),

    italic: (value: any): { value: any; formatting: Partial<RunProperties> } => ({
      value,
      formatting: { italic: true }
    }),

    underline: (value: any): { value: any; formatting: Partial<RunProperties> } => ({
      value,
      formatting: { underline: true }
    }),

    // Text transformations
    upper: (value: any): any => {
      return typeof value === 'string' ? value.toUpperCase() : value;
    },

    lower: (value: any): any => {
      return typeof value === 'string' ? value.toLowerCase() : value;
    },

    capitalize: (value: any): any => {
      if (typeof value !== 'string') return value;
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    },

    title: (value: any): any => {
      if (typeof value !== 'string') return value;
      return value.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    },

    trim: (value: any): any => {
      return typeof value === 'string' ? value.trim() : value;
    },

    // Number formatting
    currency: (value: any, symbol: string = '$', decimals: number = 2): string => {
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      return `${symbol}${num.toFixed(decimals)}`;
    },

    number: (value: any, decimals: number = 2): string => {
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      return num.toFixed(decimals);
    },

    percent: (value: any, decimals: number = 1): string => {
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      return `${(num * 100).toFixed(decimals)}%`;
    },

    comma: (value: any): string => {
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      return num.toLocaleString();
    },

    // Date formatting
    date: (value: any, format: string = 'YYYY-MM-DD'): string => {
      let date: Date;
      
      if (value instanceof Date) {
        date = value;
      } else if (typeof value === 'string' || typeof value === 'number') {
        date = new Date(value);
      } else {
        return value;
      }
      
      if (isNaN(date.getTime())) return String(value);
      
      // Simple date formatting
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return format
        .replace('YYYY', year.toString())
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
    },

    // Conditional formatting
    ifEmpty: (value: any, defaultValue: any = ''): any => {
      return (value === null || value === undefined || value === '') ? defaultValue : value;
    },

    ifEqual: (value: any, compareValue: any, trueValue: any, falseValue: any = value): any => {
      return value === compareValue ? trueValue : falseValue;
    },

    ifGreater: (value: any, compareValue: any, trueValue: any, falseValue: any = value): any => {
      const num1 = parseFloat(value);
      const num2 = parseFloat(compareValue);
      if (isNaN(num1) || isNaN(num2)) return value;
      return num1 > num2 ? trueValue : falseValue;
    },

    // Array formatting
    join: (value: any, separator: string = ', '): string => {
      if (Array.isArray(value)) {
        return value.join(separator);
      }
      return value;
    },

    first: (value: any): any => {
      if (Array.isArray(value) && value.length > 0) {
        return value[0];
      }
      return value;
    },

    last: (value: any): any => {
      if (Array.isArray(value) && value.length > 0) {
        return value[value.length - 1];
      }
      return value;
    },

    // Array field extraction formatters
    field: (value: any, fieldName: string, separator: string = ', '): string => {
      if (Array.isArray(value)) {
        return value.map(item => {
          if (typeof item === 'object' && item !== null) {
            return item[fieldName] || '';
          }
          return '';
        }).filter(v => v !== '').join(separator);
      }
      return value;
    },

    pluck: (value: any, fieldName: string): string => {
      if (Array.isArray(value)) {
        return value.map(item => {
          if (typeof item === 'object' && item !== null) {
            return item[fieldName] || '';
          }
          return '';
        }).filter(v => v !== '').join(', ');
      }
      return value;
    },

    descriptions: (value: any): string => {
      if (Array.isArray(value)) {
        return value.map(item => {
          if (typeof item === 'object' && item !== null) {
            return item.description || item.name || item.title || '';
          }
          return String(item);
        }).filter(v => v !== '').join(', ');
      }
      return value;
    },

    prices: (value: any): string => {
      if (Array.isArray(value)) {
        return value.map(item => {
          if (typeof item === 'object' && item !== null) {
            return item.price || '';
          }
          return '';
        }).filter(v => v !== '').join(', ');
      }
      return value;
    },

    quantities: (value: any): string => {
      if (Array.isArray(value)) {
        return value.map(item => {
          if (typeof item === 'object' && item !== null) {
            return item.quantity || '';
          }
          return '';
        }).filter(v => v !== '').join(', ');
      }
      return value;
    },

    length: (value: any): number => {
      if (Array.isArray(value)) {
        return value.length;
      }
      if (typeof value === 'string') {
        return value.length;
      }
      if (value && typeof value === 'object') {
        return Object.keys(value).length;
      }
      console.log(`Length formatter - value type: ${typeof value}, value:`, value);
      return 0;
    },

    // Color formatting
    color: (value: any, colorValue: string): { value: any; formatting: Partial<RunProperties> } => ({
      value,
      formatting: { color: colorValue.replace('#', '') }
    }),

    highlight: (value: any, highlightColor: string): { value: any; formatting: Partial<RunProperties> } => ({
      value,
      formatting: { highlight: highlightColor }
    }),

    // Font formatting
    font: (value: any, fontFamily: string): { value: any; formatting: Partial<RunProperties> } => ({
      value,
      formatting: { fontFamily }
    }),

    size: (value: any, fontSize: number): { value: any; formatting: Partial<RunProperties> } => ({
      value,
      formatting: { fontSize }
    }),

    // Special formatters
    image: (value: any): { type: 'image'; value: any } => ({
      type: 'image',
      value
    }),

    chart: (value: any, chartType: string = 'bar'): { type: 'chart'; value: any; chartType: string } => ({
      type: 'chart',
      value,
      chartType
    }),

    html: (value: any): { type: 'html'; value: any } => ({
      type: 'html',
      value
    }),

    table: (value: any): { type: 'table'; value: any } => ({
      type: 'table',
      value
    })
  };

  /**
   * Apply formatters to a value
   */
  static applyFormatters(
    value: any,
    formatters: string[],
    context?: FormattingContext
  ): any {
    let result = value;
    let accumulatedFormatting: Partial<RunProperties> = {};
    let specialType: string | null = null;
    let additionalData: any = {};

    // Apply each formatter in sequence
    for (const formatterStr of formatters) {
      const [formatterName, ...args] = this.parseFormatterArgs(formatterStr);
      const formatter = this.formatters[formatterName];

      if (!formatter) {
        console.warn(`Unknown formatter: ${formatterName}`);
        continue;
      }

      try {
        const formatterResult = formatter(result, ...args);

        // Handle different types of formatter results
        if (formatterResult && typeof formatterResult === 'object') {
          if (formatterResult.formatting) {
            // Accumulate formatting properties
            accumulatedFormatting = { ...accumulatedFormatting, ...formatterResult.formatting };
            result = formatterResult.value;
          } else if (formatterResult.type) {
            // Special type formatter (image, chart, html, etc.)
            specialType = formatterResult.type;
            result = formatterResult.value;
            additionalData = { ...additionalData, ...formatterResult };
          } else {
            result = formatterResult;
          }
        } else {
          result = formatterResult;
        }
      } catch (error) {
        console.error(`Error applying formatter ${formatterName}:`, error);
      }
    }

    // If no formatters were applied to an array, provide a sensible default
    if (Array.isArray(result) && formatters.length === 0) {
      result = result.map((item, index) => {
        if (typeof item === 'object' && item !== null) {
          // Show a brief object representation
          const keys = Object.keys(item).slice(0, 3); // First 3 properties
          const preview = keys.map(key => `${key}: ${item[key]}`).join(', ');
          return `{${preview}}`;
        }
        return String(item);
      }).join(', ');
    }

    // Return formatted result with metadata
    return {
      value: result,
      formatting: Object.keys(accumulatedFormatting).length > 0 ? accumulatedFormatting : null,
      type: specialType,
      ...additionalData
    };
  }

  /**
   * Parse formatter arguments from string
   */
  static parseFormatterArgs(formatterStr: string): any[] {
    const match = formatterStr.match(/^(\w+)(?:\(([^)]*)\))?$/);
    if (!match) return [formatterStr];

    const [, name, argsStr] = match;
    if (!argsStr) return [name];

    // Simple argument parsing - handles strings, numbers, booleans
    const args = argsStr.split(',').map(arg => {
      const trimmed = arg.trim();
      
      // String literals
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
          (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
      }
      
      // Numbers
      if (/^-?\d+\.?\d*$/.test(trimmed)) {
        return parseFloat(trimmed);
      }
      
      // Booleans
      if (trimmed === 'true') return true;
      if (trimmed === 'false') return false;
      
      // Default to string
      return trimmed;
    });

    console.log(`Parsed formatter: ${formatterStr} -> name: ${name}, args:`, args);
    return [name, ...args];
  }

  /**
   * Register custom formatter
   */
  static registerFormatter(name: string, formatter: FormatterFunction): void {
    this.formatters[name] = formatter;
  }

  /**
   * Get all available formatters
   */
  static getAvailableFormatters(): string[] {
    return Object.keys(this.formatters);
  }

  /**
   * Check if formatter exists
   */
  static hasFormatter(name: string): boolean {
    return name in this.formatters;
  }
}