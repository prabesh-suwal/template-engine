import { ParsedTemplate, ProcessedData, TemplateTag } from '../types/index';

/**
 * Advanced Conditional Processing System
 * Handles complex conditional logic in templates including:
 * - Block-level conditionals
 * - Complex expressions
 * - Nested conditions
 * - Loop filtering
 */
export class ConditionalProcessor {
  
  /**
   * Process conditional blocks in template content
   */
  async processConditionalBlocks(
    xmlContent: string,
    processedData: ProcessedData,
    rawData?: any  // Add access to raw JSON data
  ): Promise<string> {
    console.log('🔀 ConditionalProcessor - Processing conditional blocks...');
    
    // Process nested conditional blocks from innermost to outermost
    let processedContent = xmlContent;
    
    // Process IF blocks
    processedContent = await this.processIfBlocks(processedContent, processedData, rawData);
    
    // Process LOOP-IF blocks (conditional loops)
    processedContent = await this.processConditionalLoops(processedContent, processedData, rawData);
    
    // Process SWITCH blocks
    processedContent = await this.processSwitchBlocks(processedContent, processedData, rawData);
    
    return processedContent;
  }

  /**
   * Process IF/ELSEIF/ELSE blocks - FIXED with XML entity decoding
   */
  private async processIfBlocks(
    xmlContent: string,
    processedData: ProcessedData,
    rawData?: any
  ): Promise<string> {
    const ifBlockRegex = /\{#if\s+([^}]+)\}([\s\S]*?)\{\/if\}/g;
    
    return xmlContent.replace(ifBlockRegex, (match, condition, content) => {
      try {
        // CRITICAL: Decode XML entities in the condition
        const decodedCondition = this.decodeXMLEntities(condition);
        console.log(`  🔍 Processing IF block with condition: "${condition}"`);
        console.log(`  🔧 Decoded condition: "${decodedCondition}"`);
        
        // Parse the block content for elseif/else
        const blockParts = this.parseIfBlock(content);
        console.log(`    Found ${blockParts.elseifParts.length} elseif parts and ${blockParts.elseContent ? 1 : 0} else part`);
        
        // Evaluate main condition with decoded condition
        const mainResult = this.evaluateCondition(decodedCondition, processedData, rawData);
        console.log(`    Main condition result: ${mainResult}`);
        
        if (mainResult) {
          console.log(`    ✅ Using IF content`);
          return blockParts.ifContent;
        }
        
        // Check elseif conditions
        for (let i = 0; i < blockParts.elseifParts.length; i++) {
          const elseifPart = blockParts.elseifParts[i];
          const decodedElseifCondition = this.decodeXMLEntities(elseifPart.condition);
          console.log(`    🔧 Decoded ELSEIF condition: "${decodedElseifCondition}"`);
          
          const elseifResult = this.evaluateCondition(decodedElseifCondition, processedData, rawData);
          console.log(`    ELSEIF ${i + 1} condition "${decodedElseifCondition}": ${elseifResult}`);
          
          if (elseifResult) {
            console.log(`    ✅ Using ELSEIF ${i + 1} content`);
            return elseifPart.content;
          }
        }
        
        // Return else content if available
        if (blockParts.elseContent) {
          console.log(`    ✅ Using ELSE content`);
          return blockParts.elseContent;
        }
        
        console.log(`    ✅ No conditions matched, returning empty`);
        return '';
        
      } catch (error: any) {
        console.error('❌ Error processing IF block:', error);
        return `<!-- Error in conditional: ${error.message} -->`;
      }
    });
  }

  /**
   * Decode XML entities - NEW METHOD
   */
  private decodeXMLEntities(text: string): string {
    return text
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&'); // Do this last to avoid double-decoding
  }

  /**
   * Process conditional loops
   * Syntax: {#each items where condition}content{/each}
   */
  private async processConditionalLoops(
    xmlContent: string,
    processedData: ProcessedData,
    rawData?: any
  ): Promise<string> {
    const conditionalLoopRegex = /\{#each\s+([^\s]+)\s+where\s+([^}]+)\}([\s\S]*?)\{\/each\}/g;
    
    return xmlContent.replace(conditionalLoopRegex, (match, arrayPath, condition, content) => {
      try {
        const arrayData = this.getDataValue(arrayPath, processedData, rawData);
        
        if (!Array.isArray(arrayData)) {
          return '';
        }
        
        const filteredItems = arrayData.filter((item, index) => {
          const itemContext = { ...item, _index: index, _item: item };
          return this.evaluateConditionWithContext(condition, itemContext, processedData, rawData);
        });
        
        return filteredItems.map((item, index) => {
          return this.replaceItemPlaceholders(content, item, index);
        }).join('');
        
      } catch (error: any) {
        console.error('Error processing conditional loop:', error);
        return `<!-- Error in conditional loop: ${error.message} -->`;
      }
    });
  }

  /**
   * Process SWITCH blocks
   * Syntax: {#switch data.status}
   *         {#case "pending"}Pending content{/case}
   *         {#case "approved"}Approved content{/case}
   *         {#default}Default content{/default}
   *         {/switch}
   */
  private async processSwitchBlocks(
    xmlContent: string,
    processedData: ProcessedData,
    rawData?: any
  ): Promise<string> {
    const switchBlockRegex = /\{#switch\s+([^}]+)\}([\s\S]*?)\{\/switch\}/g;
    
    return xmlContent.replace(switchBlockRegex, (match, switchExpression, content) => {
      try {
        const switchValue = this.evaluateExpression(switchExpression, processedData, rawData);
        const cases = this.parseSwitchBlock(content);
        
        // Find matching case
        for (const caseItem of cases.cases) {
          if (this.compareValues(switchValue, caseItem.value)) {
            return caseItem.content;
          }
        }
        
        // Return default case if no match
        return cases.defaultContent || '';
        
      } catch (error: any) {
        console.error('Error processing SWITCH block:', error);
        return `<!-- Error in switch: ${error.message} -->`;
      }
    });
  }

  /**
   * Evaluate complex conditions
   * Supports: ==, !=, >, <, >=, <=, &&, ||, !, contains, startsWith, endsWith
   */
  private evaluateCondition(condition: string, processedData: ProcessedData, rawData?: any): boolean {
    try {
      console.log(`      🔍 Evaluating condition: "${condition}"`);
      
      // Handle complex expressions with AND/OR
      if (condition.includes('&&') || condition.includes('||')) {
        return this.evaluateComplexCondition(condition, processedData, rawData);
      }
      
      // Handle NOT operator
      if (condition.trim().startsWith('!')) {
        const innerCondition = condition.trim().substring(1).trim();
        const result = !this.evaluateCondition(innerCondition, processedData, rawData);
        console.log(`      NOT result: ${result}`);
        return result;
      }
      
      // Parse simple condition: "data.age > 18"
      const conditionParts = this.parseSimpleCondition(condition);
      if (!conditionParts) {
        // If no operator, treat as truthiness check
        const value = this.evaluateExpression(condition, processedData, rawData);
        const result = this.isTruthy(value);
        console.log(`      Truthiness check for "${value}": ${result}`);
        return result;
      }
      
      const { left, operator, right } = conditionParts;
      const leftValue = this.evaluateExpression(left, processedData, rawData);
      const rightValue = this.evaluateExpression(right, processedData, rawData);
      
      console.log(`      Comparing: "${leftValue}" ${operator} "${rightValue}"`);
      const result = this.compareValues(leftValue, rightValue, operator);
      console.log(`      Comparison result: ${result}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error evaluating condition:', condition, error);
      return false;
    }
  }

  /**
   * Evaluate complex conditions with AND/OR logic
   */
  private evaluateComplexCondition(condition: string, processedData: ProcessedData, rawData?: any): boolean {
    // Split by OR first (lower precedence)
    const orParts = condition.split('||').map(part => part.trim());
    
    for (const orPart of orParts) {
      // Split by AND (higher precedence)
      const andParts = orPart.split('&&').map(part => part.trim());
      
      const andResult = andParts.every(andPart => 
        this.evaluateCondition(andPart, processedData, rawData)
      );
      
      if (andResult) {
        return true; // OR: if any part is true, result is true
      }
    }
    
    return false;
  }

  /**
   * Parse simple condition like "data.age > 18" - FIXED VERSION
   */
  private parseSimpleCondition(condition: string): {
    left: string;
    operator: string;
    right: string;
  } | null {
    console.log(`        📋 Parsing simple condition: "${condition}"`);
    
    const operators = ['==', '!=', '>=', '<=', '>', '<', 'contains', 'startsWith', 'endsWith', 'in'];
    
    for (const op of operators) {
      // More careful parsing - handle quotes properly
      let inQuotes = false;
      let quoteChar = '';
      let opIndex = -1;
      
      for (let i = 0; i <= condition.length - op.length; i++) {
        const char = condition[i];
        
        // Track quote state
        if (!inQuotes && (char === '"' || char === "'")) {
          inQuotes = true;
          quoteChar = char;
        } else if (inQuotes && char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
        
        // Check for operator only when not in quotes
        if (!inQuotes && condition.substring(i, i + op.length) === op) {
          opIndex = i;
          break;
        }
      }
      
      if (opIndex > 0) {
        const left = condition.substring(0, opIndex).trim();
        const right = condition.substring(opIndex + op.length).trim();
        
        console.log(`        ✅ Parsed: "${left}" ${op} "${right}"`);
        
        return {
          left,
          operator: op,
          right
        };
      }
    }
    
    console.log(`        ❌ No operator found in condition`);
    return null;
  }

  /**
   * Compare two values using an operator
   */
  private compareValues(left: any, right: any, operator: string = '=='): boolean {
    switch (operator) {
      case '==':
        return left == right;
      case '!=':
        return left != right;
      case '>':
        return parseFloat(left) > parseFloat(right);
      case '<':
        return parseFloat(left) < parseFloat(right);
      case '>=':
        return parseFloat(left) >= parseFloat(right);
      case '<=':
        return parseFloat(left) <= parseFloat(right);
      case 'contains':
        return String(left).toLowerCase().includes(String(right).toLowerCase());
      case 'startsWith':
        return String(left).toLowerCase().startsWith(String(right).toLowerCase());
      case 'endsWith':
        return String(left).toLowerCase().endsWith(String(right).toLowerCase());
      case 'in':
        return Array.isArray(right) ? right.includes(left) : false;
      default:
        return left == right;
    }
  }

  /**
   * Check if value is truthy
   */
  private isTruthy(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0 && value.toLowerCase() !== 'false';
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return Boolean(value);
  }

  /**
   * Parse IF block content
   */
  private parseIfBlock(content: string): {
    ifContent: string;
    elseifParts: Array<{ condition: string; content: string }>;
    elseContent: string | null;
  } {
    const elseifRegex = /\{#elseif\s+([^}]+)\}/g;
    const elseIndex = content.indexOf('{#else}');
    
    const elseifParts: Array<{ condition: string; content: string }> = [];
    let match;
    const matches = [];
    
    // Find all elseif matches first
    while ((match = elseifRegex.exec(content)) !== null) {
      matches.push({
        condition: match[1],
        index: match.index,
        fullMatch: match[0]
      });
    }
    
    // Extract elseif parts
    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const nextMatch = matches[i + 1];
      
      const startIndex = currentMatch.index + currentMatch.fullMatch.length;
      let endIndex: number;
      
      if (nextMatch) {
        endIndex = nextMatch.index;
      } else if (elseIndex >= 0 && elseIndex > startIndex) {
        endIndex = elseIndex;
      } else {
        endIndex = content.length;
      }
      
      elseifParts.push({
        condition: currentMatch.condition,
        content: content.substring(startIndex, endIndex)
      });
    }
    
    // Extract main if content and else content
    const firstElseifIndex = matches.length > 0 ? matches[0].index : -1;
    const ifEndIndex = firstElseifIndex >= 0 ? firstElseifIndex : 
                      (elseIndex >= 0 ? elseIndex : content.length);
    
    const ifContent = content.substring(0, ifEndIndex);
    const elseContent = elseIndex >= 0 ? content.substring(elseIndex + 7) : null; // 7 = length of '{#else}'
    
    return { ifContent, elseifParts, elseContent };
  }

  /**
   * Parse SWITCH block content
   */
  private parseSwitchBlock(content: string): {
    cases: Array<{ value: any; content: string }>;
    defaultContent: string | null;
  } {
    const caseRegex = /\{#case\s+([^}]+)\}([\s\S]*?)(?=\{#case|\{#default|\{\/switch|$)/g;
    const defaultMatch = content.match(/\{#default\}([\s\S]*?)(?=\{\/switch|$)/);
    
    const cases: Array<{ value: any; content: string }> = [];
    let match;
    
    while ((match = caseRegex.exec(content)) !== null) {
      const value = this.parseValue(match[1].trim());
      const caseContent = match[2];
      cases.push({ value, content: caseContent });
    }
    
    const defaultContent = defaultMatch ? defaultMatch[1] : null;
    
    return { cases, defaultContent };
  }

  /**
   * Parse a value (string, number, boolean)
   */
  private parseValue(valueStr: string): any {
    // Remove quotes for strings
    if ((valueStr.startsWith('"') && valueStr.endsWith('"')) ||
        (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
      return valueStr.slice(1, -1);
    }
    
    // Parse numbers
    if (/^-?\d+\.?\d*$/.test(valueStr)) {
      return parseFloat(valueStr);
    }
    
    // Parse booleans
    if (valueStr === 'true') return true;
    if (valueStr === 'false') return false;
    
    // Return as string
    return valueStr;
  }

  /**
   * Evaluate expression and get value from data - FIXED VERSION
   */
  private evaluateExpression(expression: string, processedData: ProcessedData, rawData?: any): any {
    expression = expression.trim();
    
    console.log(`        🔍 Evaluating expression: "${expression}"`);
    
    // Handle quoted strings - be more careful with quote detection
    if (expression.length >= 2) {
      const firstChar = expression[0];
      const lastChar = expression[expression.length - 1];
      
      if ((firstChar === '"' && lastChar === '"') || (firstChar === "'" && lastChar === "'")) {
        const result = expression.slice(1, -1);
        console.log(`        String literal: "${result}"`);
        return result;
      }
      
      // Handle double-quoted strings that might have been escaped
      if (expression.startsWith('""') && expression.endsWith('""') && expression.length >= 4) {
        const result = expression.slice(2, -2);
        console.log(`        Double-quoted string literal: "${result}"`);
        return result;
      }
    }
    
    // Handle numbers
    if (/^-?\d+\.?\d*$/.test(expression)) {
      const result = parseFloat(expression);
      console.log(`        Number literal: ${result}`);
      return result;
    }
    
    // Handle booleans
    if (expression === 'true') {
      console.log(`        Boolean: true`);
      return true;
    }
    if (expression === 'false') {
      console.log(`        Boolean: false`);
      return false;
    }
    
    // Handle data paths
    const result = this.getDataValue(expression, processedData, rawData);
    console.log(`        Data path "${expression}": ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * Get value from processed data using path - ENHANCED VERSION
   */
  private getDataValue(path: string, processedData: ProcessedData, rawData?: any): any {
    console.log(`          🔍 Getting data value for path: "${path}"`);
    
    // First try to get from processedData
    const directValue = processedData.values.get(path);
    if (directValue !== undefined) {
      console.log(`          Found in processedData: ${JSON.stringify(directValue.value)}`);
      return directValue.value;
    }
    
    // If we have raw data, try to resolve the path manually
    if (rawData) {
      try {
        const pathParts = path.split('.');
        let current = rawData;
        
        console.log(`          Resolving path parts: [${pathParts.join(', ')}]`);
        
        for (const part of pathParts) {
          if (current && typeof current === 'object' && part in current) {
            current = current[part];
            console.log(`            "${part}" -> ${JSON.stringify(current)}`);
          } else {
            console.log(`            "${part}" -> NOT FOUND`);
            return undefined;
          }
        }
        
        console.log(`          Final resolved value: ${JSON.stringify(current)}`);
        return current;
      } catch (error) {
        console.error(`          Error resolving path: ${error}`);
      }
    }
    
    console.log(`          Path not found: "${path}"`);
    return undefined;
  }

  /**
   * Evaluate condition with item context (for loops)
   */
  private evaluateConditionWithContext(
    condition: string,
    itemContext: any,
    processedData: ProcessedData,
    rawData?: any
  ): boolean {
    // Create a temporary context that includes the item
    const newValues = new Map(processedData.values);
    
    // Add item context values to the map
    Object.entries(itemContext).forEach(([key, value]) => {
      newValues.set(key, { value });
    });
    
    const contextData = {
      ...processedData,
      values: newValues
    };
    
    return this.evaluateCondition(condition, contextData, rawData);
  }

  /**
   * Replace item placeholders in content
   */
  private replaceItemPlaceholders(content: string, item: any, index: number): string {
    return content.replace(/\{([^}]+)\}/g, (match, path) => {
      if (path.startsWith('item.')) {
        const itemPath = path.substring(5); // Remove 'item.'
        return this.getNestedValue(item, itemPath) || '';
      }
      if (path === 'index') {
        return index.toString();
      }
      return match; // Keep original if not an item reference
    });
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}