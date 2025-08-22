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
    processedData: ProcessedData
  ): Promise<string> {
    console.log('🔀 Processing conditional blocks...');
    
    // Process nested conditional blocks from innermost to outermost
    let processedContent = xmlContent;
    
    // Process IF blocks
    processedContent = await this.processIfBlocks(processedContent, processedData);
    
    // Process LOOP-IF blocks (conditional loops)
    processedContent = await this.processConditionalLoops(processedContent, processedData);
    
    // Process SWITCH blocks
    processedContent = await this.processSwitchBlocks(processedContent, processedData);
    
    return processedContent;
  }

  /**
   * Process IF/ELSEIF/ELSE blocks
   * Syntax: {#if condition}content{/if}
   *         {#if condition}content{#elseif condition2}content2{#else}content3{/if}
   */
  private async processIfBlocks(
    xmlContent: string,
    processedData: ProcessedData
  ): Promise<string> {
    const ifBlockRegex = /\{#if\s+([^}]+)\}([\s\S]*?)\{\/if\}/g;
    
    return xmlContent.replace(ifBlockRegex, (match, condition, content) => {
      try {
        // Parse the block content for elseif/else
        const blockParts = this.parseIfBlock(content);
        
        // Evaluate main condition
        if (this.evaluateCondition(condition, processedData)) {
          return blockParts.ifContent;
        }
        
        // Check elseif conditions
        for (const elseifPart of blockParts.elseifParts) {
          if (this.evaluateCondition(elseifPart.condition, processedData)) {
            return elseifPart.content;
          }
        }
        
        // Return else content if available
        return blockParts.elseContent || '';
        
      } catch (error : any) {
        console.error('Error processing IF block:', error);
        return `<!-- Error in conditional: ${error.message} -->`;
      }
    });
  }

  /**
   * Process conditional loops
   * Syntax: {#each items where condition}content{/each}
   */
  private async processConditionalLoops(
    xmlContent: string,
    processedData: ProcessedData
  ): Promise<string> {
    const conditionalLoopRegex = /\{#each\s+([^\s]+)\s+where\s+([^}]+)\}([\s\S]*?)\{\/each\}/g;
    
    return xmlContent.replace(conditionalLoopRegex, (match, arrayPath, condition, content) => {
      try {
        const arrayData = this.getDataValue(arrayPath, processedData);
        
        if (!Array.isArray(arrayData)) {
          return '';
        }
        
        const filteredItems = arrayData.filter((item, index) => {
          const itemContext = { ...item, _index: index, _item: item };
          return this.evaluateConditionWithContext(condition, itemContext, processedData);
        });
        
        return filteredItems.map((item, index) => {
          return this.replaceItemPlaceholders(content, item, index);
        }).join('');
        
      } catch (error : any) {
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
    processedData: ProcessedData
  ): Promise<string> {
    const switchBlockRegex = /\{#switch\s+([^}]+)\}([\s\S]*?)\{\/switch\}/g;
    
    return xmlContent.replace(switchBlockRegex, (match, switchExpression, content) => {
      try {
        const switchValue = this.evaluateExpression(switchExpression, processedData);
        const cases = this.parseSwitchBlock(content);
        
        // Find matching case
        for (const caseItem of cases.cases) {
          if (this.compareValues(switchValue, caseItem.value)) {
            return caseItem.content;
          }
        }
        
        // Return default case if no match
        return cases.defaultContent || '';
        
      } catch (error : any) {
        console.error('Error processing SWITCH block:', error);
        
        return `<!-- Error in switch: ${error.message} -->`;
      }
    });
  }

  /**
   * Evaluate complex conditions
   * Supports: ==, !=, >, <, >=, <=, &&, ||, !, contains, startsWith, endsWith
   */
  private evaluateCondition(condition: string, processedData: ProcessedData): boolean {
    try {
      // Handle complex expressions with AND/OR
      if (condition.includes('&&') || condition.includes('||')) {
        return this.evaluateComplexCondition(condition, processedData);
      }
      
      // Handle NOT operator
      if (condition.trim().startsWith('!')) {
        const innerCondition = condition.trim().substring(1).trim();
        return !this.evaluateCondition(innerCondition, processedData);
      }
      
      // Parse simple condition: "data.age > 18"
      const conditionParts = this.parseSimpleCondition(condition);
      if (!conditionParts) {
        // If no operator, treat as truthiness check
        const value = this.evaluateExpression(condition, processedData);
        return this.isTruthy(value);
      }
      
      const { left, operator, right } = conditionParts;
      const leftValue = this.evaluateExpression(left, processedData);
      const rightValue = this.evaluateExpression(right, processedData);
      
      return this.compareValues(leftValue, rightValue, operator);
      
    } catch (error) {
      console.error('Error evaluating condition:', condition, error);
      return false;
    }
  }

  /**
   * Evaluate complex conditions with AND/OR logic
   */
  private evaluateComplexCondition(condition: string, processedData: ProcessedData): boolean {
    // Split by OR first (lower precedence)
    const orParts = condition.split('||').map(part => part.trim());
    
    for (const orPart of orParts) {
      // Split by AND (higher precedence)
      const andParts = orPart.split('&&').map(part => part.trim());
      
      const andResult = andParts.every(andPart => 
        this.evaluateCondition(andPart, processedData)
      );
      
      if (andResult) {
        return true; // OR: if any part is true, result is true
      }
    }
    
    return false;
  }

  /**
   * Parse simple condition like "data.age > 18"
   */
  private parseSimpleCondition(condition: string): {
    left: string;
    operator: string;
    right: string;
  } | null {
    const operators = ['>=', '<=', '==', '!=', '>', '<', 'contains', 'startsWith', 'endsWith', 'in'];
    
    for (const op of operators) {
      const index = condition.indexOf(op);
      if (index > 0) {
        return {
          left: condition.substring(0, index).trim(),
          operator: op,
          right: condition.substring(index + op.length).trim()
        };
      }
    }
    
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
    
    let currentContent = content;
    const elseifParts: Array<{ condition: string; content: string }> = [];
    let match;
    
    // Extract elseif parts
    while ((match = elseifRegex.exec(content)) !== null) {
      const condition = match[1];
      const startIndex = match.index + match[0].length;
      
      // Find the end of this elseif block
      const nextElseif = content.indexOf('{#elseif', startIndex);
      const elseStart = content.indexOf('{#else}', startIndex);
      const endIndex = Math.min(
        nextElseif >= 0 ? nextElseif : Infinity,
        elseStart >= 0 ? elseStart : Infinity
      );
      
      if (endIndex === Infinity) {
        // This is the last elseif, goes to end or else
        elseifParts.push({
          condition,
          content: content.substring(startIndex, elseStart >= 0 ? elseStart : content.length)
        });
      } else {
        elseifParts.push({
          condition,
          content: content.substring(startIndex, endIndex)
        });
      }
    }
    
    // Extract main if content and else content
    const firstElseifIndex = content.indexOf('{#elseif');
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
   * Evaluate expression and get value from data
   */
  private evaluateExpression(expression: string, processedData: ProcessedData): any {
    expression = expression.trim();
    
    // Handle quoted strings
    if ((expression.startsWith('"') && expression.endsWith('"')) ||
        (expression.startsWith("'") && expression.endsWith("'"))) {
      return expression.slice(1, -1);
    }
    
    // Handle numbers
    if (/^-?\d+\.?\d*$/.test(expression)) {
      return parseFloat(expression);
    }
    
    // Handle booleans
    if (expression === 'true') return true;
    if (expression === 'false') return false;
    
    // Handle data paths
    return this.getDataValue(expression, processedData);
  }

  /**
   * Get value from processed data using path
   */
  private getDataValue(path: string, processedData: ProcessedData): any {
    // Check if it's a direct value from processed data
    const directValue = processedData.values.get(path);
    if (directValue !== undefined) {
      return directValue.value;
    }
    
    // Try to resolve path manually
    const pathParts = path.split('.');
    let current: any = { data: processedData };
    
    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Evaluate condition with item context (for loops)
   */
  /**
   * Evaluate condition with item context (for loops)
   */
  private evaluateConditionWithContext(
    condition: string,
    itemContext: any,
    processedData: ProcessedData
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
    
    return this.evaluateCondition(condition, contextData);
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