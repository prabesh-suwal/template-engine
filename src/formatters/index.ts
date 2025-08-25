// src/formatters/index.ts - COMPLETE FIXED VERSION

import { FormatterFunction, Formatters, FormattingContext, RunProperties } from '../types/index';
import { ConditionalFormatters } from './conditionals';

/**
 * Built-in formatters for the template engine
 */
export class BuiltInFormatters {
  static formatters: Formatters = {
    // CRITICAL: Import conditional formatters FIRST
    ...ConditionalFormatters,

    // Basic text formatters
    upper: (value: any): string => String(value || '').toUpperCase(),
    lower: (value: any): string => String(value || '').toLowerCase(),
    title: (value: any): string => {
      return String(value || '').replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    },
    capitalize: (value: any): string => {
      const str = String(value || '');
      return str.charAt(0).toUpperCase() + str.slice(1);
    },

    // Number formatters  
    currency: (value: any, symbol: string = '$', decimals: number = 2): string => {
      const num = parseFloat(value) || 0;
      return `${symbol}${num.toFixed(decimals)}`;
    },
    number: (value: any, decimals: number = 0): string => {
      const num = parseFloat(value) || 0;
      return num.toFixed(decimals);
    },
    percent: (value: any, decimals: number = 1): string => {
      const num = parseFloat(value) || 0;
      return `${(num * 100).toFixed(decimals)}%`;
    },

    // Date formatters
    date: (value: any, format: string = 'YYYY-MM-DD'): string => {
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return format
          .replace('YYYY', String(year))
          .replace('MM', month)
          .replace('DD', day);
      } catch {
        return String(value);
      }
    },

    // Utility formatters
    defaultValue: (value: any, defaultValue: any): any => {
      return (value === null || value === undefined || value === '') ? defaultValue : value;
    },

    // Mathematical aggregation formatters
    sum: (value: any, fieldName?: string): string => {
      if (!Array.isArray(value)) return String(value);
      
      let total = 0;
      for (const item of value) {
        let num: number;
        
        if (fieldName && typeof item === 'object' && item !== null) {
          num = parseFloat(item[fieldName]) || 0;
        } else {
          num = parseFloat(item) || 0;
        }
        
        total += num;
      }
      
      return total.toFixed(2);
    },

    average: (value: any, fieldName?: string): string => {
      if (!Array.isArray(value) || value.length === 0) return '0.00';
      
      let total = 0;
      let count = 0;
      
      for (const item of value) {
        let num: number;
        
        if (fieldName && typeof item === 'object' && item !== null) {
          num = parseFloat(item[fieldName]);
        } else {
          num = parseFloat(item);
        }
        
        if (!isNaN(num)) {
          total += num;
          count++;
        }
      }
      
      return count > 0 ? (total / count).toFixed(2) : '0.00';
    },

    avg: (value: any, fieldName?: string): string => {
      return BuiltInFormatters.formatters.average(value, fieldName);
    },

    min: (value: any, fieldName?: string): string => {
      if (!Array.isArray(value) || value.length === 0) return '';
      
      let minimum = Infinity;
      
      for (const item of value) {
        let num: number;
        
        if (fieldName && typeof item === 'object' && item !== null) {
          num = parseFloat(item[fieldName]);
        } else {
          num = parseFloat(item);
        }
        
        if (!isNaN(num) && num < minimum) {
          minimum = num;
        }
      }
      
      return minimum === Infinity ? '' : minimum.toString();
    },

    max: (value: any, fieldName?: string): string => {
      if (!Array.isArray(value) || value.length === 0) return '';
      
      let maximum = -Infinity;
      
      for (const item of value) {
        let num: number;
        
        if (fieldName && typeof item === 'object' && item !== null) {
          num = parseFloat(item[fieldName]);
        } else {
          num = parseFloat(item);
        }
        
        if (!isNaN(num) && num > maximum) {
          maximum = num;
        }
      }
      
      return maximum === -Infinity ? '' : maximum.toString();
    },

    count: (value: any, condition?: string): string => {
      if (!Array.isArray(value)) return '0';
      
      if (!condition) {
        return value.length.toString();
      }
      
      let count = 0;
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          if (condition.includes('=') && item[condition.split('=')[0]] === condition.split('=')[1]) {
            count++;
          }
        }
      }
      
      return count.toString();
    },
    size: (value: any, fontSize: number): { value: any; formatting: Partial<RunProperties> } => ({
  value,
  formatting: { fontSize }
}),

font: (value: any, fontFamily: string): { value: any; formatting: Partial<RunProperties> } => ({
  value,
  formatting: { fontFamily }
}),

// Color formatter (improved)
// color: (value: any, colorValue: string = 'red'): { value: any; formatting: Partial<RunProperties> } => ({
//   value,
//   formatting: { color: colorValue.replace('#', '') }
// }),
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
      return 0;
    },

    // Visual formatting (for Word documents)
    bold: (value: any): string => {
      return `<w:r><w:rPr><w:b/></w:rPr><w:t>${value}</w:t></w:r>`;
    },

    italic: (value: any): string => {
      return `<w:r><w:rPr><w:i/></w:rPr><w:t>${value}</w:t></w:r>`;
    },

    underline: (value: any): string => {
      return `<w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>${value}</w:t></w:r>`;
    },

    color: (value: any, colorValue: string = 'red'): string => {
      return `<w:r><w:rPr><w:color w:val="${colorValue}"/></w:rPr><w:t>${value}</w:t></w:r>`;
    },

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
   * Apply formatters to a value - FIXED VERSION
   */
  static applyFormatters(
    value: any,
    formatters: string[],
    context?: FormattingContext
  ): any {
    console.log(`🔧 Applying formatters to value "${value}":`, formatters);
    
    let result = value;
    let accumulatedFormatting: Partial<RunProperties> = {};
    let specialType: string | null = null;
    let additionalData: any = {};

    // If no formatters, return simple result
    if (!formatters || formatters.length === 0) {
      return {
        value: result,
        formatting: null,
        type: null
      };
    }

    // Apply each formatter in sequence
    for (const formatterStr of formatters) {
      console.log(`  Applying formatter: ${formatterStr}`);
      
      const [formatterName, ...args] = this.parseFormatterArgs(formatterStr);
      const formatter = this.formatters[formatterName];

      if (!formatter) {
        console.warn(`❌ Unknown formatter: ${formatterName}`);
        console.log(`Available formatters:`, Object.keys(this.formatters));
        continue;
      }

      try {
        console.log(`  ✅ Found formatter ${formatterName}, applying with args:`, args);
        const formatterResult = formatter(result, ...args);
        console.log(`  📤 Formatter result:`, formatterResult);

        // Handle different types of formatter results
        if (formatterResult && typeof formatterResult === 'object' && formatterResult.value !== undefined) {
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
            result = formatterResult.value || formatterResult;
          }
        } else {
          result = formatterResult;
        }

        console.log(`  ➡️ Result after ${formatterName}: "${result}"`);
      } catch (error) {
        console.error(`❌ Error applying formatter ${formatterName}:`, error);
        // Continue with original value instead of breaking
      }
    }

    // Return formatted result with metadata
    const finalResult = {
      value: result,
      formatting: Object.keys(accumulatedFormatting).length > 0 ? accumulatedFormatting : null,
      type: specialType,
      ...additionalData
    };

    console.log(`🎯 Final formatted result:`, finalResult);
    return finalResult;
  }

  /**
   * Parse formatter arguments from string - IMPROVED VERSION
   */
  static parseFormatterArgs(formatterStr: string): any[] {
    console.log(`🔍 Parsing formatter string: "${formatterStr}"`);
    
    // Handle formatters with parentheses and arguments
    const match = formatterStr.match(/^([^(]+)(?:\(([^)]*)\))?$/);
    if (!match) {
      console.log(`  No match found, returning as single arg: [${formatterStr}]`);
      return [formatterStr];
    }

    const [, name, argsStr] = match;
    console.log(`  Parsed name: "${name}", args string: "${argsStr}"`);
    
    if (!argsStr) {
      console.log(`  No arguments, returning: [${name}]`);
      return [name];
    }

    // Enhanced argument parsing - handles nested quotes and complex args
    const args: any[] = [];
    let currentArg = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      
      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
      } else if (!inQuotes && char === ',') {
        args.push(this.parseArgValue(currentArg.trim()));
        currentArg = '';
        continue;
      }
      
      currentArg += char;
    }
    
    // Add the last argument
    if (currentArg.trim()) {
      args.push(this.parseArgValue(currentArg.trim()));
    }

    const result = [name, ...args];
    console.log(`  Final parsed result:`, result);
    return result;
  }

  /**
   * Parse individual argument value
   */
  static parseArgValue(arg: string): any {
    const trimmed = arg.trim();
    
    // String literals (remove quotes)
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
    
    // Default to string (without quotes)
    return trimmed;
  }

  /**
   * Format a value using a single formatter function with arguments
   */
  static formatValue(value: any, formatterStr: string): any {
    console.log(`🔧 Direct format value "${value}" with "${formatterStr}"`);
    
    const [name, ...args] = this.parseFormatterArgs(formatterStr);
    
    if (!this.hasFormatter(name)) {
      console.warn(`❌ Unknown formatter: ${name}`);
      return value;
    }

    try {
      const formatter = this.formatters[name];
      const result = formatter(value, ...args);
      console.log(`✅ Direct format result:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Error applying formatter ${name}:`, error);
      return value;
    }
  }

  /**
   * Register custom formatter
   */
  static registerFormatter(name: string, formatter: FormatterFunction): void {
    console.log(`📝 Registering custom formatter: ${name}`);
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

  /**
   * Debug method to list all formatters
   */
  static debugFormatters(): void {
    console.log('🔧 All Available Formatters:');
    const formatterNames = this.getAvailableFormatters();
    formatterNames.forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
    });
    
    // Test critical formatters
    const criticalFormatters = ['ifEqual', 'ifBetween', 'switch'];
    console.log('\n🔍 Critical Formatter Check:');
    criticalFormatters.forEach(name => {
      const exists = this.hasFormatter(name);
      console.log(`  ${name}: ${exists ? '✅' : '❌'}`);
      if (exists) {
        console.log(`    Function:`, typeof this.formatters[name]);
      }
    });
  }
}

// Debug: Log all available formatters at startup
console.log('🚀 DOCX Template Engine - Formatter System Initialized');
BuiltInFormatters.debugFormatters();

// Test the problematic formatters immediately
console.log('\n🧪 Testing Problematic Formatters:');
try {
  const testIfEqual = BuiltInFormatters.formatValue('bank', 'ifEqual(\'bank\', \'यो बैंक हो\', \'यो बैंक होइन\')');
  console.log('ifEqual test result:', testIfEqual);
  
  const testSwitch = BuiltInFormatters.formatValue('bank', 'switch(\'bank\', \'🏦 बैंक\', \'microfinance\', \'🏪 माइक्रो\', \'❓ अन्य\')');
  console.log('switch test result:', testSwitch);
  
  const testIfBetween = BuiltInFormatters.formatValue(1500000, 'ifBetween(1000000, 2000000, \'मध्यम ऋण\', \'अन्य\')');
  console.log('ifBetween test result:', testIfBetween);
} catch (error) {
  console.error('❌ Error testing formatters:', error);
}