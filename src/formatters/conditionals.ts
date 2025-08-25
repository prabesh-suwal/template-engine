import { FormatterFunction } from '../types/index';

/**
 * Enhanced conditional formatters with advanced logic
 */
export const ConditionalFormatters: { [name: string]: FormatterFunction } = {

  ifEqual: (value: any, compareValue: any, trueValue: any, falseValue: any = value): any => {
    console.log('ifEqual called with:', { value, compareValue, trueValue, falseValue });
    return value === compareValue ? trueValue : falseValue;
  },
  ifNotEqual: (value: any, compareValue: any, trueValue: any, falseValue: any = value): any => {
    return value !== compareValue ? trueValue : falseValue;
  },
   ifGreater: (value: any, compareValue: any, trueValue: any, falseValue: any = value): any => {
    const num1 = parseFloat(value);
    const num2 = parseFloat(compareValue);
    if (isNaN(num1) || isNaN(num2)) return value;
    return num1 > num2 ? trueValue : falseValue;
  },
  // Enhanced comparison formatters
  ifLess: (value: any, compareValue: any, trueValue: any, falseValue: any = value): any => {
    const num1 = parseFloat(value);
    const num2 = parseFloat(compareValue);
    if (isNaN(num1) || isNaN(num2)) return value;
    return num1 < compareValue ? trueValue : falseValue;
  },

  ifLessEqual: (value: any, compareValue: any, trueValue: any, falseValue: any = value): any => {
    const num1 = parseFloat(value);
    const num2 = parseFloat(compareValue);
    if (isNaN(num1) || isNaN(num2)) return value;
    return num1 <= compareValue ? trueValue : falseValue;
  },

  ifGreaterEqual: (value: any, compareValue: any, trueValue: any, falseValue: any = value): any => {
    const num1 = parseFloat(value);
    const num2 = parseFloat(compareValue);
    if (isNaN(num1) || isNaN(num2)) return value;
    return num1 >= compareValue ? trueValue : falseValue;
  },

  ifBetween: (value: any, min: any, max: any, trueValue: any, falseValue: any = value): any => {
    const num = parseFloat(value);
    const minNum = parseFloat(min);
    const maxNum = parseFloat(max);
    if (isNaN(num) || isNaN(minNum) || isNaN(maxNum)) return value;
    return (num >= minNum && num <= maxNum) ? trueValue : falseValue;
  },

  // String-based conditionals
  ifContains: (value: any, searchValue: any, trueValue: any, falseValue: any = value): any => {
    const str = String(value).toLowerCase();
    const search = String(searchValue).toLowerCase();
    return str.includes(search) ? trueValue : falseValue;
  },

  ifStartsWith: (value: any, prefix: any, trueValue: any, falseValue: any = value): any => {
    const str = String(value).toLowerCase();
    const prefixStr = String(prefix).toLowerCase();
    return str.startsWith(prefixStr) ? trueValue : falseValue;
  },

  ifEndsWith: (value: any, suffix: any, trueValue: any, falseValue: any = value): any => {
    const str = String(value).toLowerCase();
    const suffixStr = String(suffix).toLowerCase();
    return str.endsWith(suffixStr) ? trueValue : falseValue;
  },

  ifMatches: (value: any, pattern: string, trueValue: any, falseValue: any = value): any => {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(String(value)) ? trueValue : falseValue;
    } catch (error) {
      console.warn('Invalid regex pattern:', pattern);
      return falseValue;
    }
  },

  // Array/Object conditionals
  ifIn: (value: any, array: any[], trueValue: any, falseValue: any = value): any => {
    if (!Array.isArray(array)) return falseValue;
    return array.includes(value) ? trueValue : falseValue;
  },

  ifHasProperty: (value: any, propertyName: string, trueValue: any, falseValue: any = value): any => {
    if (typeof value !== 'object' || value === null) return falseValue;
    return propertyName in value ? trueValue : falseValue;
  },

  ifLength: (value: any, length: number, trueValue: any, falseValue: any = value): any => {
    let actualLength = 0;
    
    if (Array.isArray(value) || typeof value === 'string') {
      actualLength = value.length;
    } else if (typeof value === 'object' && value !== null) {
      actualLength = Object.keys(value).length;
    }
    
    return actualLength === length ? trueValue : falseValue;
  },

  ifMinLength: (value: any, minLength: number, trueValue: any, falseValue: any = value): any => {
    let actualLength = 0;
    
    if (Array.isArray(value) || typeof value === 'string') {
      actualLength = value.length;
    } else if (typeof value === 'object' && value !== null) {
      actualLength = Object.keys(value).length;
    }
    
    return actualLength >= minLength ? trueValue : falseValue;
  },

  // Date conditionals
  ifDateAfter: (value: any, compareDate: any, trueValue: any, falseValue: any = value): any => {
    try {
      const date1 = new Date(value);
      const date2 = new Date(compareDate);
      if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return falseValue;
      return date1 > date2 ? trueValue : falseValue;
    } catch (error) {
      return falseValue;
    }
  },

  ifDateBefore: (value: any, compareDate: any, trueValue: any, falseValue: any = value): any => {
    try {
      const date1 = new Date(value);
      const date2 = new Date(compareDate);
      if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return falseValue;
      return date1 < date2 ? trueValue : falseValue;
    } catch (error) {
      return falseValue;
    }
  },

  ifToday: (value: any, trueValue: any, falseValue: any = value): any => {
    try {
      const inputDate = new Date(value);
      const today = new Date();
      
      // Compare only the date part (ignore time)
      const inputDateOnly = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      return inputDateOnly.getTime() === todayOnly.getTime() ? trueValue : falseValue;
    } catch (error) {
      return falseValue;
    }
  },

  // Multiple condition formatters
  ifAny: (value: any, ...conditions: any[]): any => {
    // Usage: {data.status|ifAny('pending', 'review', 'processing', 'IN_PROGRESS', 'INACTIVE')}
    const trueValue = conditions[conditions.length - 2];
    const falseValue = conditions[conditions.length - 1];
    const checkValues = conditions.slice(0, -2);
    
    return checkValues.includes(value) ? trueValue : falseValue;
  },

  ifNone: (value: any, ...conditions: any[]): any => {
    // Usage: {data.status|ifNone('cancelled', 'rejected', 'failed', 'ACTIVE', 'INACTIVE')}
    const trueValue = conditions[conditions.length - 2];
    const falseValue = conditions[conditions.length - 1];
    const checkValues = conditions.slice(0, -2);
    
    return !checkValues.includes(value) ? trueValue : falseValue;
  },

  // Type-based conditionals
  ifString: (value: any, trueValue: any, falseValue: any = value): any => {
    return typeof value === 'string' ? trueValue : falseValue;
  },

  ifNumber: (value: any, trueValue: any, falseValue: any = value): any => {
    return typeof value === 'number' && !isNaN(value) ? trueValue : falseValue;
  },

  ifBoolean: (value: any, trueValue: any, falseValue: any = value): any => {
    return typeof value === 'boolean' ? trueValue : falseValue;
  },

  ifArray: (value: any, trueValue: any, falseValue: any = value): any => {
    return Array.isArray(value) ? trueValue : falseValue;
  },

  ifObject: (value: any, trueValue: any, falseValue: any = value): any => {
    return (typeof value === 'object' && value !== null && !Array.isArray(value)) ? trueValue : falseValue;
  },

  // Advanced logical formatters
  ifNull: (value: any, trueValue: any, falseValue: any = value): any => {
    return (value === null || value === undefined) ? trueValue : falseValue;
  },

  ifNotNull: (value: any, trueValue: any, falseValue: any = value): any => {
    return (value !== null && value !== undefined) ? trueValue : falseValue;
  },

  ifTruthy: (value: any, trueValue: any, falseValue: any = value): any => {
    const isTruthy = value && 
                     value !== '' && 
                     value !== 0 && 
                     value !== false && 
                     value !== null && 
                     value !== undefined &&
                     (Array.isArray(value) ? value.length > 0 : true) &&
                     (typeof value === 'object' ? Object.keys(value).length > 0 : true);
    return isTruthy ? trueValue : falseValue;
  },

  ifFalsy: (value: any, trueValue: any, falseValue: any = value): any => {
    const isFalsy = !value || 
                    value === '' || 
                    value === 0 || 
                    value === false || 
                    value === null || 
                    value === undefined ||
                    (Array.isArray(value) && value.length === 0) ||
                    (typeof value === 'object' && Object.keys(value).length === 0);
    return isFalsy ? trueValue : falseValue;
  },

  // Range-based formatters
  ifRange: (value: any, ranges: string, mapping: string): any => {
    // Usage: {data.score|ifRange('0-59,60-79,80-100', 'F,C,A')}
    const rangeArray = ranges.split(',');
    const mappingArray = mapping.split(',');
    const num = parseFloat(value);
    
    if (isNaN(num)) return value;
    
    for (let i = 0; i < rangeArray.length; i++) {
      const [min, max] = rangeArray[i].split('-').map(n => parseFloat(n));
      if (num >= min && num <= max) {
        return mappingArray[i] || value;
      }
    }
    
    return value;
  },

  // Switch-like formatter
  switch: (value: any, ...cases: any[]): any => {
    // Usage: {data.status|switch('pending', 'Pending Review', 'approved', 'Approved', 'Default')}
    for (let i = 0; i < cases.length - 1; i += 2) {
      if (value === cases[i]) {
        return cases[i + 1];
      }
    }
    // Return default value (last parameter)
    return cases[cases.length - 1] || value;
  },

  // Complex condition formatter
  when: (value: any, condition: string, trueValue: any, falseValue: any = value): any => {
    // Usage: {data.age|when('> 18', 'Adult', 'Minor')}
    try {
      // Parse the condition
      const operators = ['>=', '<=', '==', '!=', '>', '<', 'contains', 'startsWith', 'endsWith'];
      
      for (const op of operators) {
        if (condition.includes(op)) {
          const [, rightSide] = condition.split(op).map(s => s.trim());
          let compareValue: any = rightSide;
          
          // Parse the compare value
          if (rightSide.startsWith('"') && rightSide.endsWith('"')) {
            compareValue = rightSide.slice(1, -1);
          } else if (/^\d+\.?\d*$/.test(rightSide)) {
            compareValue = parseFloat(rightSide);
          }
          
          // Evaluate the condition
          switch (op) {
            case '>':
              return parseFloat(value) > parseFloat(compareValue) ? trueValue : falseValue;
            case '<':
              return parseFloat(value) < parseFloat(compareValue) ? trueValue : falseValue;
            case '>=':
              return parseFloat(value) >= parseFloat(compareValue) ? trueValue : falseValue;
            case '<=':
              return parseFloat(value) <= parseFloat(compareValue) ? trueValue : falseValue;
            case '==':
              return value == compareValue ? trueValue : falseValue;
            case '!=':
              return value != compareValue ? trueValue : falseValue;
            case 'contains':
              return String(value).toLowerCase().includes(String(compareValue).toLowerCase()) ? trueValue : falseValue;
            case 'startsWith':
              return String(value).toLowerCase().startsWith(String(compareValue).toLowerCase()) ? trueValue : falseValue;
            case 'endsWith':
              return String(value).toLowerCase().endsWith(String(compareValue).toLowerCase()) ? trueValue : falseValue;
          }
        }
      }
      
      // If no operator found, check truthiness
      return value ? trueValue : falseValue;
      
    } catch (error) {
      console.warn('Error in when formatter:', error);
      return falseValue;
    }
  }
};