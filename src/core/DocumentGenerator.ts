import { 
  ParsedTemplate, 
  ProcessedData, 
  TemplateTag, 
  ExtractedFiles, 
  ImageData, 
  ChartData, 
  TableData,
  GenerationResult,
  TemplateOptions 
} from '../types/index';
import { ZipUtils } from '../utils/zip';
import { XMLUtils } from '../utils/xml';
import { BuiltInFormatters } from '../formatters';

/**
 * Document Generator handles the final document generation
 * by replacing template tags with processed data
 */
export class DocumentGenerator {
  
  /**
   * Generate the final document from parsed template and processed data
   */
  async generateDocument(
    parsedTemplate: ParsedTemplate,
    processedData: ProcessedData,
    options: TemplateOptions = {}
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      // Create a copy of the template files to modify
      const modifiedFiles = this.cloneExtractedFiles(parsedTemplate);

      // Process template tags in each file
      await this.processAllTemplateTags(parsedTemplate.templateTags, processedData, modifiedFiles);

      // Handle media files (images, charts)
      await this.processMediaFiles(processedData, modifiedFiles, parsedTemplate);

      // Generate the final DOCX buffer
      const buffer = await ZipUtils.createDocx(modifiedFiles);

      const processingTime = Date.now() - startTime;

      return {
        buffer,
        metadata: {
          templateTags: parsedTemplate.templateTags.length,
          processingTime,
          outputFormat: options.convertTo || 'docx',
          warnings: []
        }
      };

    } catch (error) {
      throw new Error(`Document generation failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Validate the generated document
   */
  async validateGeneratedDocument(buffer: Buffer): Promise<{
    isValid: boolean;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    let isValid = true;

    try {
      // Basic DOCX structure validation
      const extractedFiles = await ZipUtils.extractDocx(buffer);
      const validation = ZipUtils.validateDocxStructure(extractedFiles);
      
      if (!validation.isValid) {
        isValid = false;
        warnings.push(...validation.errors);
      }

      // Check for remaining template tags
      const xmlFiles = ZipUtils.getXMLFiles(extractedFiles);
      for (const fileName of xmlFiles) {
        const content = ZipUtils.getFileAsString(extractedFiles, fileName);
        const remainingTags = content.match(/\{data\.[^}]+\}/g);
        if (remainingTags) {
          warnings.push(`Unprocessed template tags found in ${fileName}: ${remainingTags.join(', ')}`);
        }
      }

    } catch (error) {
      isValid = false;
      warnings.push(`Validation error: ${error instanceof Error ? error.message : error}`);
    }

    return { isValid, warnings };
  }

  /**
   * Clone extracted files for modification
   */
  private cloneExtractedFiles(parsedTemplate: ParsedTemplate): ExtractedFiles {
    // Create a deep copy of the extracted files
    const clonedFiles: ExtractedFiles = {};
    
    // Convert XML files back to Buffers for the extracted files structure
    for (const [fileName, fileData] of parsedTemplate.xmlFiles) {
      clonedFiles[fileName] = Buffer.from(fileData.xml, 'utf8');
    }
    
    // Add media files
    for (const [fileName, buffer] of parsedTemplate.mediaFiles) {
      clonedFiles[fileName] = buffer;
    }

    return clonedFiles;
  }

  /**
   * Process all template tags across all files
   */
  private async processAllTemplateTags(
    templateTags: TemplateTag[],
    processedData: ProcessedData,
    modifiedFiles: ExtractedFiles
  ): Promise<void> {
    // Group tags by file
    const tagsByFile = new Map<string, TemplateTag[]>();
    
    for (const tag of templateTags) {
      const fileName = tag.position.parentElement;
      if (!tagsByFile.has(fileName)) {
        tagsByFile.set(fileName, []);
      }
      tagsByFile.get(fileName)!.push(tag);
    }

    // Process each file
    for (const [fileName, tags] of tagsByFile) {
      try {
        await this.processFileTemplateTags(fileName, tags, processedData, modifiedFiles);
      } catch (error) {
        console.error(`Error processing tags in file ${fileName}:`, error);
        throw error;
      }
    }
  }

  /**
   * Process template tags in a specific file - FIXED APPROACH
   */
  private async processFileTemplateTags(
    fileName: string,
    tags: TemplateTag[],
    processedData: ProcessedData,
    modifiedFiles: ExtractedFiles
  ): Promise<void> {
    let xmlContent = ZipUtils.getFileAsString(modifiedFiles, fileName);

    console.log(`\n=== Processing ${tags.length} tags in ${fileName} ===`);

    // Separate table iteration tags from regular tags
    const tableIterationTags = tags.filter(tag => tag.path.includes('[i]'));
    const nonTableTags = tags.filter(tag => !tag.path.includes('[i]'));
    
    console.log(`Found ${tableIterationTags.length} table iteration tags`);
    console.log(`Found ${nonTableTags.length} non-table tags`);

    // Process table tags using proper table row detection
    if (tableIterationTags.length > 0) {
      xmlContent = await this.processTableTagsWithProperRows(xmlContent, tableIterationTags, processedData);
    }

    // Process non-table tags
    console.log(`\n--- Processing ${nonTableTags.length} non-table tags ---`);
    
    // Sort tags by position (last to first to avoid index shifting)
    const sortedTags = [...nonTableTags].sort((a, b) => 
      b.position.startIndex - a.position.startIndex
    );

    for (const tag of sortedTags) {
      try {
        console.log(`Processing non-table tag: ${tag.fullTag}`);
        const replacement = await this.generateTagReplacement(tag, processedData);
        xmlContent = this.replaceTagInXML(xmlContent, tag, replacement);
      } catch (error) {
        console.error(`Error processing tag ${tag.fullTag}:`, error);
        const errorMsg = `[Error: ${error instanceof Error ? error.message : 'Unknown error'}]`;
        xmlContent = xmlContent.replace(tag.fullTag, errorMsg);
      }
    }

    // Update the file
    ZipUtils.setFileFromString(modifiedFiles, fileName, xmlContent);
    console.log(`=== Completed processing ${fileName} ===\n`);
  }

  /**
   * FIXED: Process table tags with proper Word table row structure
   */
  private async processTableTagsWithProperRows(
    xmlContent: string,
    tableIterationTags: TemplateTag[],
    processedData: ProcessedData
  ): Promise<string> {
    console.log(`\n>>> Processing ${tableIterationTags.length} table iteration tags with proper rows`);

    // Group tags by their base array path
    const tagsByArray = new Map<string, TemplateTag[]>();
    
    for (const tag of tableIterationTags) {
      const baseArray = tag.path.split('[i]')[0];
      if (!tagsByArray.has(baseArray)) {
        tagsByArray.set(baseArray, []);
      }
      tagsByArray.get(baseArray)!.push(tag);
    }

    console.log(`Found ${tagsByArray.size} different arrays:`, Array.from(tagsByArray.keys()));

    // Process each array type
    for (const [baseArrayPath, arrayTags] of tagsByArray) {
      console.log(`\n--- Processing array: ${baseArrayPath} with ${arrayTags.length} tags ---`);
      
      try {
        xmlContent = await this.processArrayWithTableRows(xmlContent, arrayTags, processedData, baseArrayPath);
      } catch (error) {
        console.error(`Error processing array ${baseArrayPath}:`, error);
        // Continue with other arrays
      }
    }

    return xmlContent;
  }

  /**
   * Process array tags with proper table row detection
   */
  private async processArrayWithTableRows(
    xmlContent: string,
    arrayTags: TemplateTag[],
    processedData: ProcessedData,
    baseArrayPath: string
  ): Promise<string> {
    console.log(`Processing ${arrayTags.length} tags for array: ${baseArrayPath}`);

    // Get the array data
    const firstTag = arrayTags[0];
    let tableData = processedData.dynamicTables.get(firstTag.id);
    
    // Try to find data with any tag from this array
    if (!tableData) {
      for (const tag of arrayTags) {
        tableData = processedData.dynamicTables.get(tag.id);
        if (tableData) {
          console.log(`Found data using tag: ${tag.id}`);
          break;
        }
      }
    }

    if (!tableData || tableData.length === 0) {
      console.log(`❌ No data found for array ${baseArrayPath}, removing tags`);
      let result = xmlContent;
      for (const tag of arrayTags) {
        result = result.replace(tag.fullTag, '');
      }
      return result;
    }

    const rows = tableData[0].rows;
    console.log(`✅ Found ${rows.length} rows of data for ${baseArrayPath}`);

    // Find table row templates that contain these tags
    const tableRowTemplates = this.findTableRowTemplates(xmlContent, arrayTags);
    
    console.log(`Found ${tableRowTemplates.length} table row templates for ${baseArrayPath}`);

    // Process each table row template from last to first (to avoid position shifting)
    let result = xmlContent;
    for (let i = tableRowTemplates.length - 1; i >= 0; i--) {
      const template = tableRowTemplates[i];
      console.log(`Processing table row template ${i + 1}: positions ${template.start}-${template.end}`);
      
      result = this.expandTableRowTemplate(result, template, rows, arrayTags);
    }

    return result;
  }

  /**
   * Find proper Word table row templates (<w:tr> elements) containing the tags
   */
  private findTableRowTemplates(xmlContent: string, arrayTags: TemplateTag[]): Array<{
    start: number;
    end: number;
    content: string;
    tags: TemplateTag[];
  }> {
    const templates: Array<{start: number; end: number; content: string; tags: TemplateTag[]}> = [];

    // Find unique tag positions (deduplicate)
    const uniqueTagPositions = new Map<string, number>();
    for (const tag of arrayTags) {
      let searchPos = 0;
      while (true) {
        const pos = xmlContent.indexOf(tag.fullTag, searchPos);
        if (pos === -1) break;
        
        const key = `${tag.fullTag}@${pos}`;
        if (!uniqueTagPositions.has(key)) {
          uniqueTagPositions.set(key, pos);
        }
        searchPos = pos + tag.fullTag.length;
      }
    }

    console.log(`Found ${uniqueTagPositions.size} unique tag positions`);

    // For each unique tag position, find the containing table row
    const processedRows = new Set<string>();
    
    for (const [tagKey, position] of uniqueTagPositions) {
      const rowInfo = this.findContainingTableRow(xmlContent, position);
      
      if (rowInfo) {
        const rowKey = `${rowInfo.start}-${rowInfo.end}`;
        if (!processedRows.has(rowKey)) {
          processedRows.add(rowKey);
          
          // Find all tags within this row
          const tagsInRow = arrayTags.filter(tag => {
            const tagPos = xmlContent.indexOf(tag.fullTag, rowInfo.start);
            return tagPos >= rowInfo.start && tagPos < rowInfo.end;
          });

          if (tagsInRow.length > 0) {
            templates.push({
              start: rowInfo.start,
              end: rowInfo.end,
              content: rowInfo.content,
              tags: tagsInRow
            });
            console.log(`Found table row template with ${tagsInRow.length} tags at ${rowInfo.start}-${rowInfo.end}`);
          }
        }
      }
    }

    return templates.sort((a, b) => a.start - b.start);
  }

  /**
   * Find the Word table row (<w:tr>) that contains a position
   */
  private findContainingTableRow(xmlContent: string, position: number): {
    start: number;
    end: number;
    content: string;
  } | null {
    // Look backwards for <w:tr> - be more careful about matching
    let rowStart = -1;
    let searchPos = position;
    
    while (searchPos >= 0) {
      const trPos = xmlContent.lastIndexOf('<w:tr', searchPos);
      if (trPos === -1) break;
      
      // Make sure this is a complete tag start (not part of another tag)
      const nextChar = xmlContent[trPos + 5];
      if (nextChar === '>' || nextChar === ' ') {
        rowStart = trPos;
        break;
      }
      
      searchPos = trPos - 1;
    }

    if (rowStart === -1) {
      console.log(`No <w:tr> found before position ${position}`);
      return null;
    }

    // Look forwards for the matching </w:tr> - count nested tr tags
    let rowEnd = -1;
    let trDepth = 0;
    let i = rowStart;
    
    while (i < xmlContent.length) {
      if (xmlContent.substring(i, i + 5) === '<w:tr') {
        // Check if this is a complete tag start
        const nextChar = xmlContent[i + 5];
        if (nextChar === '>' || nextChar === ' ') {
          trDepth++;
        }
      } else if (xmlContent.substring(i, i + 7) === '</w:tr>') {
        trDepth--;
        if (trDepth === 0) {
          rowEnd = i + 7;
          break;
        }
      }
      i++;
    }

    if (rowEnd === -1) {
      console.log(`No matching </w:tr> found after position ${position}`);
      return null;
    }

    // Validate that we have a complete, well-formed row
    const content = xmlContent.substring(rowStart, rowEnd);
    
    // Basic validation - check that we have proper table cell structure
    if (!content.includes('<w:tc') || !content.includes('</w:tc>')) {
      console.log(`Table row doesn't contain proper table cells`);
      return null;
    }

    console.log(`Found well-formed table row: ${rowStart} to ${rowEnd}, length: ${content.length}`);

    return {
      start: rowStart,
      end: rowEnd,
      content
    };
  }

  /**
   * Expand a table row template with all data rows - with XML validation
   */
  private expandTableRowTemplate(
    xmlContent: string,
    template: {start: number; end: number; content: string; tags: TemplateTag[]},
    rows: any[],
    arrayTags: TemplateTag[]
  ): string {
    console.log(`Expanding table row template with ${rows.length} rows`);
    console.log(`Template content preview: ${template.content.substring(0, 100)}...`);

    // Validate template content before processing
    if (!this.validateTableRowXML(template.content)) {
      console.error(`Invalid table row XML structure, skipping expansion`);
      return xmlContent;
    }

    // Generate content for each row
    const expandedRows: string[] = [];

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const rowData = rows[rowIndex];
      let rowContent = template.content;

      console.log(`Processing row ${rowIndex + 1}:`, JSON.stringify(rowData));

      // Replace each tag in this template with the row data
      for (const tag of template.tags) {
        const propertyMatch = tag.path.match(/\[i\]\.(.+)$/);
        const propertyName = propertyMatch ? propertyMatch[1] : '';

        let value = rowData;
        if (propertyName) {
          const propertyParts = propertyName.split('.');
          for (const part of propertyParts) {
            value = value && value[part];
          }
        }

        // Apply formatters
        const formattedResult = BuiltInFormatters.applyFormatters(value, tag.formatters, tag.formattingContext);
        const finalValue = String(formattedResult.value || '');

        console.log(`  ${tag.fullTag} -> "${finalValue}"`);
        
        // Replace ALL occurrences of this tag in the row content
        // Using global regex replace for compatibility with older TypeScript versions
        const tagRegex = new RegExp(this.escapeRegex(tag.fullTag), 'g');
        rowContent = rowContent.replace(tagRegex, finalValue);
      }

      // Validate the generated row content
      if (this.validateTableRowXML(rowContent)) {
        expandedRows.push(rowContent);
      } else {
        console.error(`Generated invalid XML for row ${rowIndex + 1}, skipping`);
        // Use original template with safe fallback to avoid corruption
        let fallbackContent = template.content;
        if (template.tags.length > 0) {
          const firstTag = template.tags[0];
          const propertyMatch = firstTag.path.match(/\[i\]\.(.+)$/);
          if (propertyMatch && propertyMatch[1]) {
            const propertyName = propertyMatch[1];
            const value = rows[rowIndex]?.[propertyName] || '';
            fallbackContent = template.content.replace(firstTag.fullTag, String(value));
          }
        }
        expandedRows.push(fallbackContent);
      }
    }

    // Validate total content before replacement
    const allRowsContent = expandedRows.join('');
    
    if (!this.validateMultipleTableRowsXML(allRowsContent)) {
      console.error(`Generated content would create invalid XML structure`);
      // Fallback: just replace with first row to avoid corruption
      return xmlContent.substring(0, template.start) + 
             expandedRows[0] + 
             xmlContent.substring(template.end);
    }

    console.log(`Replacing ${template.content.length} chars with ${allRowsContent.length} chars`);

    return xmlContent.substring(0, template.start) + 
           allRowsContent + 
           xmlContent.substring(template.end);
  }

  /**
   * Validate that table row XML is well-formed
   */
  private validateTableRowXML(content: string): boolean {
    // Basic validation - check for balanced tags
    const openTr = (content.match(/<w:tr[\s>]/g) || []).length;
    const closeTr = (content.match(/<\/w:tr>/g) || []).length;
    
    if (openTr !== closeTr) {
      console.log(`Unbalanced <w:tr> tags: ${openTr} open, ${closeTr} close`);
      return false;
    }

    // Check for table cells
    if (!content.includes('<w:tc') || !content.includes('</w:tc>')) {
      console.log(`Missing table cell structure`);
      return false;
    }

    // Check for critical table structure tags
    const requiredTags = ['<w:tr', '</w:tr>', '<w:tc', '</w:tc>'];
    for (const tag of requiredTags) {
      if (!content.includes(tag)) {
        console.log(`Missing required tag: ${tag}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Validate multiple table rows XML structure
   */
  private validateMultipleTableRowsXML(content: string): boolean {
    // Count table rows
    const openTr = (content.match(/<w:tr[\s>]/g) || []).length;
    const closeTr = (content.match(/<\/w:tr>/g) || []).length;
    
    if (openTr !== closeTr || openTr === 0) {
      console.log(`Invalid multiple rows structure: ${openTr} open, ${closeTr} close`);
      return false;
    }

    return true;
  }

  /**
   * Generate replacement content for a template tag
   */
  private async generateTagReplacement(
    tag: TemplateTag,
    processedData: ProcessedData
  ): Promise<string> {
    switch (tag.type) {
      case 'simple':
        return this.generateSimpleReplacement(tag, processedData);
        
      case 'table':
        return this.generateTableReplacement(tag, processedData);
        
      case 'image':
        return this.generateImageReplacement(tag, processedData);
        
      case 'chart':
        return this.generateChartReplacement(tag, processedData);
        
      case 'html':
        return this.generateHtmlReplacement(tag, processedData);
        
      default:
        return this.generateSimpleReplacement(tag, processedData);
    }
  }

  /**
   * Generate replacement for simple text tags
   */
  private generateSimpleReplacement(
    tag: TemplateTag,
    processedData: ProcessedData
  ): string {
    const data = processedData.values.get(tag.id);
    if (!data) {
      return '';
    }

    // If formatting is applied, we need to wrap in proper Word XML
    if (data.formatting) {
      return this.wrapInWordFormatting(String(data.value), data.formatting, tag.formattingContext);
    }

    return String(data.value || '');
  }

  /**
   * Generate replacement for table tags
   */
  private generateTableReplacement(
    tag: TemplateTag,
    processedData: ProcessedData
  ): string {
    // Table iteration tags are handled separately
    if (tag.path.includes('[i]')) {
      return tag.fullTag; // Leave unchanged, will be processed by table logic
    }

    // Direct table/array access
    const data = processedData.values.get(tag.id);
    return data ? String(data.value || '') : '';
  }

  /**
   * Generate replacement for image tags
   */
  private generateImageReplacement(
    tag: TemplateTag,
    processedData: ProcessedData
  ): string {
    const imageData = processedData.images.get(tag.id);
    if (!imageData) {
      return '[Image not found]';
    }

    // Generate Word XML for image
    return this.generateImageXML(imageData);
  }

  /**
   * Generate replacement for chart tags
   */
  private generateChartReplacement(
    tag: TemplateTag,
    processedData: ProcessedData
  ): string {
    const chartData = processedData.charts.get(tag.id);
    if (!chartData) {
      return '[Chart not found]';
    }

    // Charts are treated as images in Word
    const imageData: ImageData = {
      buffer: chartData.buffer,
      extension: 'png',
      relationshipId: chartData.relationshipId
    };

    return this.generateImageXML(imageData);
  }

  /**
   * Generate replacement for HTML tags
   */
  private generateHtmlReplacement(
    tag: TemplateTag,
    processedData: ProcessedData
  ): string {
    const htmlContent = processedData.htmlContent.get(tag.id);
    if (!htmlContent) {
      return '';
    }

    // Convert HTML to Word XML (simplified)
    return this.convertHtmlToWordXML(htmlContent);
  }

  /**
   * Replace tag in XML content
   */
  private replaceTagInXML(
    xmlContent: string,
    tag: TemplateTag,
    replacement: string
  ): string {
    // Simple replacement - a full implementation would need to handle XML structure
    return xmlContent.replace(tag.fullTag, replacement);
  }

  /**
   * Wrap text in Word formatting XML
   */
  private wrapInWordFormatting(
    text: string,
    formatting: any,
    originalContext: any
  ): string {
    let runProps = '';

    if (formatting.bold) {
      runProps += '<w:b/>';
    }
    if (formatting.italic) {
      runProps += '<w:i/>';
    }
    if (formatting.underline) {
      runProps += '<w:u w:val="single"/>';
    }
    if (formatting.color) {
      runProps += `<w:color w:val="${formatting.color}"/>`;
    }

    if (runProps) {
      return `<w:r><w:rPr>${runProps}</w:rPr><w:t>${this.escapeXML(text)}</w:t></w:r>`;
    }

    return `<w:r><w:t>${this.escapeXML(text)}</w:t></w:r>`;
  }

  /**
   * Generate Word XML for images
   */
  private generateImageXML(imageData: ImageData): string {
    // Simplified implementation
    return `<w:r>
      <w:drawing>
        <wp:inline>
          <wp:extent cx="3000000" cy="2000000"/>
          <wp:docPr id="1" name="Image"/>
          <a:graphic>
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic>
                <pic:nvPicPr>
                  <pic:cNvPr id="1" name="Image"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="${imageData.relationshipId}"/>
                  <a:stretch>
                    <a:fillRect/>
                  </a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm>
                    <a:off x="0" y="0"/>
                    <a:ext cx="3000000" cy="2000000"/>
                  </a:xfrm>
                  <a:prstGeom prst="rect">
                    <a:avLst/>
                  </a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>`;
  }

  /**
   * Convert HTML to Word XML (simplified)
   */
  private convertHtmlToWordXML(htmlContent: string): string {
    let wordXML = htmlContent;
    
    // Basic tag conversions
    wordXML = wordXML.replace(/<strong>/g, '<w:r><w:rPr><w:b/></w:rPr><w:t>');
    wordXML = wordXML.replace(/<\/strong>/g, '</w:t></w:r>');
    wordXML = wordXML.replace(/<em>/g, '<w:r><w:rPr><w:i/></w:rPr><w:t>');
    wordXML = wordXML.replace(/<\/em>/g, '</w:t></w:r>');
    wordXML = wordXML.replace(/<br\s*\/?>/g, '<w:br/>');
    wordXML = wordXML.replace(/<p>/g, '<w:p><w:r><w:t>');
    wordXML = wordXML.replace(/<\/p>/g, '</w:t></w:r></w:p>');
    
    // Remove remaining HTML tags
    wordXML = wordXML.replace(/<[^>]*>/g, '');
    
    // Escape XML characters
    wordXML = this.escapeXML(wordXML);
    
    return wordXML;
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Process media files (images, charts)
   */
  private async processMediaFiles(
    processedData: ProcessedData,
    modifiedFiles: ExtractedFiles,
    parsedTemplate: ParsedTemplate
  ): Promise<void> {
    // Process images
    for (const [tagId, imageData] of processedData.images) {
      await this.addImageToDocument(imageData, modifiedFiles, parsedTemplate);
    }

    // Process charts (treated as images)
    for (const [tagId, chartData] of processedData.charts) {
      const imageData: ImageData = {
        buffer: chartData.buffer,
        extension: 'png',
        relationshipId: chartData.relationshipId
      };
      await this.addImageToDocument(imageData, modifiedFiles, parsedTemplate);
    }
  }

  /**
   * Add image to document structure
   */
  private async addImageToDocument(
    imageData: ImageData,
    modifiedFiles: ExtractedFiles,
    parsedTemplate: ParsedTemplate
  ): Promise<void> {
    // Add image file to media folder
    const mediaFileName = `word/media/image${Date.now()}.${imageData.extension}`;
    modifiedFiles[mediaFileName] = imageData.buffer;

    // Add relationship and update content types would be implemented here
  }

/**
 * Escape special regex characters
 */
private escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate a unique relationship ID
 */
private generateRelationshipId(): string {
  return `rId${Date.now()}${Math.floor(Math.random() * 1000)}`;
}
}