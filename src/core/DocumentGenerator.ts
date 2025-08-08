import { BuiltInFormatters } from '../formatters';
import { 
  ParsedTemplate, 
  ProcessedData, 
  GenerationResult, 
  ExtractedFiles,
  TemplateOptions,
  ImageData,
  ChartData,
  TemplateTag
} from '../types/index';
import { XMLUtils } from '../utils/xml';
import { ZipUtils } from '../utils/zip';

export class DocumentGenerator {
  /**
   * Generate final document from template and processed data
   */
  async generateDocument(
    parsedTemplate: ParsedTemplate,
    processedData: ProcessedData,
    options: TemplateOptions = {}
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Clone the original files to avoid modifying the template
      const modifiedFiles = await this.prepareModifiedFiles(parsedTemplate);

      // Process each template tag
      await this.processTemplateTags(
        parsedTemplate,
        processedData,
        modifiedFiles,
        warnings
      );

      // Add media files (images, charts)
      await this.addMediaFiles(
        processedData,
        modifiedFiles,
        parsedTemplate
      );

      // Update relationships and content types
      await this.updateDocumentStructure(
        modifiedFiles,
        processedData,
        parsedTemplate
      );

      // Generate final DOCX
      const finalBuffer = await ZipUtils.createDocx(modifiedFiles);

      const processingTime = Date.now() - startTime;

      return {
        buffer: finalBuffer,
        metadata: {
          templateTags: parsedTemplate.templateTags.length,
          processingTime,
          outputFormat: options.convertTo || 'docx',
          warnings: warnings.length > 0 ? warnings : undefined
        }
      };

    } catch (error) {
      throw new Error(`Document generation failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Prepare modified files from template
   */
  private async prepareModifiedFiles(parsedTemplate: ParsedTemplate): Promise<ExtractedFiles> {
    const modifiedFiles: ExtractedFiles = {};

    // Convert XML files back to strings and prepare for modification
    for (const [fileName, xmlDoc] of parsedTemplate.xmlFiles) {
      modifiedFiles[fileName] = Buffer.from(xmlDoc.xml, 'utf8');
    }

    // Copy media files
    for (const [fileName, buffer] of parsedTemplate.mediaFiles) {
      modifiedFiles[fileName] = Buffer.from(buffer);
    }

    return modifiedFiles;
  }

  /**
   * Process all template tags in the document
   */
  private async processTemplateTags(
    parsedTemplate: ParsedTemplate,
    processedData: ProcessedData,
    modifiedFiles: ExtractedFiles,
    warnings: string[]
  ): Promise<void> {
    // Group tags by file for efficient processing
    const tagsByFile = new Map<string, typeof parsedTemplate.templateTags>();
    
    for (const tag of parsedTemplate.templateTags) {
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
        warnings.push(`Error processing ${fileName}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  /**
   * Process template tags in a specific file
   */
  private async processFileTemplateTags(
    fileName: string,
    tags: TemplateTag[],
    processedData: ProcessedData,
    modifiedFiles: ExtractedFiles
  ): Promise<void> {
    let xmlContent = ZipUtils.getFileAsString(modifiedFiles, fileName);

    // Group table iteration tags that belong to the same table
    const tableGroups = this.groupTableIterationTags(tags);
    
    // Process table groups first (they need special handling)
    for (const tableGroup of tableGroups) {
      xmlContent = await this.processTableGroup(xmlContent, tableGroup, processedData);
    }

    // Process remaining non-table tags
    const nonTableTags = tags.filter(tag => !tag.path.includes('[i]'));
    
    // Sort tags by position (last to first to avoid index shifting)
    const sortedTags = [...nonTableTags].sort((a, b) => 
      b.position.startIndex - a.position.startIndex
    );

    for (const tag of sortedTags) {
      try {
        const replacement = await this.generateTagReplacement(tag, processedData);
        
        // Replace the tag in the XML content
        xmlContent = this.replaceTagInXML(xmlContent, tag, replacement);
        
      } catch (error) {
        console.error(`Error processing tag ${tag.fullTag}:`, error);
        // Replace with error message to avoid corrupting document
        const errorMsg = `[Error: ${error instanceof Error ? error.message : 'Unknown error'}]`;
        xmlContent = xmlContent.replace(tag.fullTag, errorMsg);
      }
    }

    // Update the file
    ZipUtils.setFileFromString(modifiedFiles, fileName, xmlContent);
  }

  /**
   * Group table iteration tags that belong to the same table
   */
  private groupTableIterationTags(tags: TemplateTag[]): TemplateTag[][] {
    const tableIterationTags = tags.filter(tag => tag.path.includes('[i]'));
    const groups: TemplateTag[][] = [];
    const processed = new Set<string>();

    for (const tag of tableIterationTags) {
      if (processed.has(tag.id)) continue;

      // Find all tags that belong to the same table row
      const baseArray = tag.path.split('[i]')[0]; // e.g., "data.items"
      const sameTableTags = tableIterationTags.filter(t => 
        t.path.startsWith(baseArray + '[i]') && !processed.has(t.id)
      );

      if (sameTableTags.length > 0) {
        groups.push(sameTableTags);
        sameTableTags.forEach(t => processed.add(t.id));
      }
    }

    return groups;
  }

  /**
   * Find the table row template that contains the iteration tags
   */
  private findTableRowTemplate(xmlContent: string, tableGroup: TemplateTag[]): { content: string; start: number; end: number } | null {
    const firstTag = tableGroup[0];
    const tagPosition = xmlContent.indexOf(firstTag.fullTag);
    
    if (tagPosition === -1) {
      console.log('Tag not found in XML content');
      return null;
    }

    console.log(`Found first tag at position ${tagPosition}`);

    // Try to find Word table row structure first
    let result = this.findWordTableRow(xmlContent, tableGroup, tagPosition);
    if (result) {
      console.log('Found Word table row structure');
      return result;
    }

    // Fallback to simpler patterns
    result = this.findSimpleTableRowTemplate(xmlContent, tableGroup);
    if (result) {
      console.log('Found simple table row pattern');
      return result;
    }

    console.log('No table row pattern found');
    return null;
  }

  /**
   * Find Word XML table row structure
   */
  private findWordTableRow(xmlContent: string, tableGroup: TemplateTag[], tagPosition: number): { content: string; start: number; end: number } | null {
    // Look for <w:tr> that contains our tags
    let searchStart = Math.max(0, tagPosition - 5000); // Search backwards up to 5000 chars
    let searchEnd = Math.min(xmlContent.length, tagPosition + 5000); // Search forwards up to 5000 chars

    // Find all <w:tr> elements in the search area
    let pos = searchStart;
    while (pos < searchEnd) {
      const trStartPos = xmlContent.indexOf('<w:tr', pos);
      if (trStartPos === -1 || trStartPos > searchEnd) break;

      const trEndPos = xmlContent.indexOf('</w:tr>', trStartPos);
      if (trEndPos === -1) break;

      const rowContent = xmlContent.substring(trStartPos, trEndPos + 7);
      
      // Check if this row contains ALL our tags
      let containsAllTags = true;
      for (const tag of tableGroup) {
        if (!rowContent.includes(tag.fullTag)) {
          containsAllTags = false;
          break;
        }
      }

      if (containsAllTags) {
        console.log(`Found Word table row: ${trStartPos} to ${trEndPos + 7}`);
        return {
          content: rowContent,
          start: trStartPos,
          end: trEndPos + 7
        };
      }

      pos = trEndPos + 7;
    }

    return null;
  }

  /**
   * Fallback method to find table rows in simpler formats  
   */
  private findSimpleTableRowTemplate(xmlContent: string, tableGroup: TemplateTag[]): { content: string; start: number; end: number } | null {
    const firstTag = tableGroup[0];
    const lastTag = tableGroup[tableGroup.length - 1];
    
    const firstPos = xmlContent.indexOf(firstTag.fullTag);
    const lastPos = xmlContent.indexOf(lastTag.fullTag);
    
    if (firstPos === -1 || lastPos === -1) return null;

    const startPos = Math.min(firstPos, lastPos);
    const endPos = Math.max(firstPos + firstTag.fullTag.length, lastPos + lastTag.fullTag.length);

    // Expand to include paragraph boundaries
    let lineStart = startPos;
    let lineEnd = endPos;

    // Look backwards for paragraph start
    for (let i = startPos; i >= 0; i--) {
      if (xmlContent.substring(i, i + 5) === '<w:p>' || 
          xmlContent.substring(i, i + 4) === '<w:p ') {
        lineStart = i;
        break;
      }
      // Stop if we hit another paragraph end
      if (xmlContent.substring(i, i + 6) === '</w:p>') {
        lineStart = i + 6;
        break;
      }
    }

    // Look forwards for paragraph end
    for (let i = endPos; i < xmlContent.length; i++) {
      if (xmlContent.substring(i, i + 6) === '</w:p>') {
        lineEnd = i + 6;
        break;
      }
      // Stop if we hit another paragraph start
      if (xmlContent.substring(i, i + 5) === '<w:p>' || 
          xmlContent.substring(i, i + 4) === '<w:p ') {
        break;
      }
    }

    const content = xmlContent.substring(lineStart, lineEnd);
    console.log(`Simple table row template: ${lineStart} to ${lineEnd}, content length: ${content.length}`);

    return {
      content,
      start: lineStart,
      end: lineEnd
    };
  }

  /**
   * Process a group of table iteration tags with proper row duplication
   */
  private async processTableGroup(
    xmlContent: string,
    tableGroup: TemplateTag[],
    processedData: ProcessedData
  ): Promise<string> {
    if (tableGroup.length === 0) return xmlContent;

    console.log(`Processing table group with ${tableGroup.length} tags`);

    // Get the table data from the first tag in the group
    const firstTag = tableGroup[0];
    const tableData = processedData.dynamicTables.get(firstTag.id);
    
    if (!tableData || tableData.length === 0) {
      console.log('No table data found, removing tags');
      // Simply remove the tags if no data
      let result = xmlContent;
      for (const tag of tableGroup) {
        result = result.replace(tag.fullTag, '');
      }
      return result;
    }

    const rows = tableData[0].rows;
    console.log(`Found ${rows.length} rows of data`);

    // Find the table row template that contains these tags
    const rowTemplate = this.findTableRowTemplate(xmlContent, tableGroup);
    if (!rowTemplate) {
      console.warn('Could not find table row template, using simple replacement');
      // Fallback to simple replacement with first item
      return this.simpleTableReplacement(xmlContent, tableGroup, rows[0]);
    }

    console.log(`Found table row template: ${rowTemplate.content.length} characters`);

    // Generate new rows for each data item
    const generatedRows: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowData = rows[i];
      let currentRow = rowTemplate.content;
      
      console.log(`Processing row ${i + 1} with data:`, JSON.stringify(rowData));
      
      // Replace each tag in this row with the current row's data
      for (const tag of tableGroup) {
        const propertyMatch = tag.path.match(/\[i\]\.(.+)$/);
        const propertyName = propertyMatch ? propertyMatch[1] : '';
        
        let value = rowData;
        if (propertyName) {
          const propertyParts = propertyName.split('.');
          for (const part of propertyParts) {
            value = value && value[part];
          }
        }

        console.log(`  Replacing ${tag.fullTag} with: ${value}`);

        // Apply formatters
        const formattedResult = BuiltInFormatters.applyFormatters(value, tag.formatters, tag.formattingContext);
        currentRow = currentRow.replace(tag.fullTag, String(formattedResult.value || ''));
      }
      
      generatedRows.push(currentRow);
    }

    console.log(`Generated ${generatedRows.length} table rows`);

    // Replace the original row with all generated rows
    const allRows = generatedRows.join('');
    const result = xmlContent.replace(rowTemplate.content, allRows);
    
    console.log(`Replaced original row (${rowTemplate.content.length} chars) with ${allRows.length} chars`);
    
    return result;
  }

  /**
   * Fallback method for simple table replacement
   */
  private simpleTableReplacement(xmlContent: string, tableGroup: TemplateTag[], firstRowData: any): string {
    let result = xmlContent;
    
    for (const tag of tableGroup) {
      const propertyMatch = tag.path.match(/\[i\]\.(.+)$/);
      const propertyName = propertyMatch ? propertyMatch[1] : '';
      
      let value = firstRowData;
      if (propertyName) {
        const propertyParts = propertyName.split('.');
        for (const part of propertyParts) {
          value = value && value[part];
        }
      }

      // Apply formatters
      const formattedResult = BuiltInFormatters.applyFormatters(value, tag.formatters, tag.formattingContext);
      result = result.replace(tag.fullTag, String(formattedResult.value || ''));
    }

    return result;
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
    // Table iteration tags are handled separately in processTableGroup
    if (tag.path.includes('[i]')) {
      return tag.fullTag; // Leave unchanged, will be processed by table group logic
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
    if (formatting.fontSize) {
      runProps += `<w:sz w:val="${formatting.fontSize * 2}"/>`;
    }
    if (formatting.fontFamily) {
      runProps += `<w:rFonts w:ascii="${formatting.fontFamily}"/>`;
    }

    if (runProps) {
      return `<w:r><w:rPr>${runProps}</w:rPr><w:t>${this.escapeXML(text)}</w:t></w:r>`;
    }

    return this.escapeXML(text);
  }

  /**
   * Generate Word XML for images
   */
  private generateImageXML(imageData: ImageData): string {
    // This is a simplified image XML
    // A full implementation would need proper Word drawing XML
    const imageId = imageData.relationshipId;
    const width = imageData.width || 200;
    const height = imageData.height || 150;

    return `
      <w:r>
        <w:drawing>
          <wp:inline>
            <wp:extent cx="${width * 9525}" cy="${height * 9525}"/>
            <wp:docPr id="1" name="Picture"/>
            <a:graphic>
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic>
                  <pic:nvPicPr>
                    <pic:cNvPr id="1" name="Picture"/>
                    <pic:cNvPicPr/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="${imageId}"/>
                    <a:stretch>
                      <a:fillRect/>
                    </a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm>
                      <a:off x="0" y="0"/>
                      <a:ext cx="${width * 9525}" cy="${height * 9525}"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect"/>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    `;
  }

  /**
   * Convert HTML to Word XML (simplified)
   */
  private convertHtmlToWordXML(html: string): string {
    // This is a very basic conversion
    // A full implementation would use a proper HTML to WordML converter
    
    // Remove HTML tags and decode entities
    let text = html.replace(/<[^>]*>/g, '');
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');

    return this.escapeXML(text);
  }

  /**
   * Add media files to the document
   */
  private async addMediaFiles(
    processedData: ProcessedData,
    modifiedFiles: ExtractedFiles,
    parsedTemplate: ParsedTemplate
  ): Promise<void> {
    // Add images
    for (const [tagId, imageData] of processedData.images) {
      const fileName = ZipUtils.generateMediaFileName(modifiedFiles, imageData.extension);
      const fullPath = ZipUtils.addMediaFile(modifiedFiles, fileName, imageData.buffer);
      
      // Update the relationship ID to point to the correct file
      imageData.relationshipId = `rId${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
    }

    // Add charts (as images)
    for (const [tagId, chartData] of processedData.charts) {
      const fileName = ZipUtils.generateMediaFileName(modifiedFiles, 'png');
      const fullPath = ZipUtils.addMediaFile(modifiedFiles, fileName, chartData.buffer);
      
      // Update the relationship ID
      chartData.relationshipId = `rId${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
    }
  }

  /**
   * Update document structure (relationships, content types)
   */
  private async updateDocumentStructure(
    modifiedFiles: ExtractedFiles,
    processedData: ProcessedData,
    parsedTemplate: ParsedTemplate
  ): Promise<void> {
    try {
      // Update relationships
      await this.updateRelationships(modifiedFiles, processedData);
      
      // Update content types
      await this.updateContentTypes(modifiedFiles, processedData);
      
    } catch (error) {
      console.warn('Failed to update document structure:', error);
    }
  }

  /**
   * Update document relationships
   */
  private async updateRelationships(
    modifiedFiles: ExtractedFiles,
    processedData: ProcessedData
  ): Promise<void> {
    if (!ZipUtils.fileExists(modifiedFiles, 'word/_rels/document.xml.rels')) {
      return;
    }

    let relsXml = ZipUtils.getFileAsString(modifiedFiles, 'word/_rels/document.xml.rels');
    
    // Add relationships for images and charts
    // const allMedia = new Map([...processedData.images, ...processedData.charts]);
    
    // for (const [tagId, mediaData] of allMedia) {
    //   const typedMediaData = mediaData as ImageData | ChartData;
    //   const relationshipXml = `
    //     <Relationship Id="${typedMediaData.relationshipId}" 
    //                  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" 
    //                  Target="media/image${Date.now()}.${(typedMediaData as ImageData).extension || 'png'}"/>
    //   `;
      
    //   // Insert before closing tag
    //   relsXml = relsXml.replace('</Relationships>', relationshipXml + '</Relationships>');
    // }

    ZipUtils.setFileFromString(modifiedFiles, 'word/_rels/document.xml.rels', relsXml);
  }

  /**
   * Update content types
   */
  private async updateContentTypes(
    modifiedFiles: ExtractedFiles,
    processedData: ProcessedData
  ): Promise<void> {
    if (!ZipUtils.fileExists(modifiedFiles, '[Content_Types].xml')) {
      return;
    }

    let contentTypesXml = ZipUtils.getFileAsString(modifiedFiles, '[Content_Types].xml');
    
    // Add content types for new media
    const extensions = new Set<string>();
    
    for (const imageData of processedData.images.values()) {
      extensions.add(imageData.extension);
    }
    
    for (const chartData of processedData.charts.values()) {
      extensions.add('png'); // Charts are saved as PNG
    }

    for (const extension of extensions) {
      const mimeType = this.getMimeType(extension);
      const defaultXml = `
        <Default Extension="${extension}" ContentType="${mimeType}"/>
      `;
      
      // Insert before closing tag
      contentTypesXml = contentTypesXml.replace('</Types>', defaultXml + '</Types>');
    }

    ZipUtils.setFileFromString(modifiedFiles, '[Content_Types].xml', contentTypesXml);
  }

  /**
   * Get MIME type for file extension
   */
  private getMimeType(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp'
    };

    return mimeTypes[extension.toLowerCase()] || 'image/png';
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
   * Validate generated document
   */
  async validateGeneratedDocument(buffer: Buffer): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Try to extract and validate the generated DOCX
      const extractedFiles = await ZipUtils.extractDocx(buffer);
      const validation = ZipUtils.validateDocxStructure(extractedFiles);
      
      errors.push(...validation.errors);
      
      // Additional validation checks
      if (ZipUtils.getTotalSize(extractedFiles) === 0) {
        errors.push('Generated document is empty');
      }

      if (!ZipUtils.fileExists(extractedFiles, 'word/document.xml')) {
        errors.push('Main document file is missing');
      }

    } catch (error) {
      errors.push(`Document validation failed: ${error instanceof Error ? error.message : error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}