import JSZip from 'jszip';
import { ExtractedFiles } from '../types/index';

export class ZipUtils {
  /**
   * Extract DOCX file (which is a ZIP) and return all files
   */
  static async extractDocx(docxBuffer: Buffer): Promise<ExtractedFiles> {
    try {
      const zip = await JSZip.loadAsync(docxBuffer);
      const files: ExtractedFiles = {};

      // Extract all files
      for (const fileName in zip.files) {
        const file = zip.files[fileName];
        if (!file.dir) {
          files[fileName] = await file.async('nodebuffer');
        }
      }

      return files;
    } catch (error) {
      throw new Error(`Failed to extract DOCX file: ${error}`);
    }
  }

  /**
   * Create DOCX file (ZIP) from extracted files
   */
  static async createDocx(files: ExtractedFiles): Promise<Buffer> {
    try {
      const zip = new JSZip();

      // Add all files to ZIP
      for (const fileName in files) {
        zip.file(fileName, files[fileName]);
      }

      // Generate the ZIP buffer
      return await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6
        }
      });
    } catch (error) {
      throw new Error(`Failed to create DOCX file: ${error}`);
    }
  }

  /**
   * Check if file exists in extracted files
   */
  static fileExists(files: ExtractedFiles, fileName: string): boolean {
    return fileName in files;
  }

  /**
   * Get file content as string
   */
  static getFileAsString(files: ExtractedFiles, fileName: string): string {
    if (!this.fileExists(files, fileName)) {
      throw new Error(`File ${fileName} not found`);
    }
    return files[fileName].toString('utf8');
  }

  /**
   * Set file content from string
   */
  static setFileFromString(files: ExtractedFiles, fileName: string, content: string): void {
    files[fileName] = Buffer.from(content, 'utf8');
  }

  /**
   * Get file content as buffer
   */
  static getFileAsBuffer(files: ExtractedFiles, fileName: string): Buffer {
    if (!this.fileExists(files, fileName)) {
      throw new Error(`File ${fileName} not found`);
    }
    return files[fileName];
  }

  /**
   * Set file content from buffer
   */
  static setFileFromBuffer(files: ExtractedFiles, fileName: string, buffer: Buffer): void {
    files[fileName] = buffer;
  }

  /**
   * List all XML files in the DOCX
   */
  static getXMLFiles(files: ExtractedFiles): string[] {
    return Object.keys(files).filter(fileName => 
      fileName.endsWith('.xml') || fileName.endsWith('.rels')
    );
  }

  /**
   * List all media files in the DOCX
   */
  static getMediaFiles(files: ExtractedFiles): string[] {
    return Object.keys(files).filter(fileName => 
      fileName.startsWith('word/media/') || 
      fileName.startsWith('media/')
    );
  }

  /**
   * Add a new media file to the DOCX
   */
  static addMediaFile(
    files: ExtractedFiles, 
    fileName: string, 
    buffer: Buffer
  ): string {
    const mediaPath = `word/media/${fileName}`;
    files[mediaPath] = buffer;
    return mediaPath;
  }

  /**
   * Get the next available media file number
   */
  static getNextMediaFileNumber(files: ExtractedFiles, extension: string): number {
    const mediaFiles = this.getMediaFiles(files);
    const pattern = new RegExp(`image(\\d+)\\.${extension}$`, 'i');
    let maxNumber = 0;

    mediaFiles.forEach(fileName => {
      const match = fileName.match(pattern);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    return maxNumber + 1;
  }

  /**
   * Generate unique media file name
   */
  static generateMediaFileName(files: ExtractedFiles, extension: string): string {
    const number = this.getNextMediaFileNumber(files, extension);
    return `image${number}.${extension}`;
  }

  /**
   * Validate DOCX structure
   */
  static validateDocxStructure(files: ExtractedFiles): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for required files
    const requiredFiles = [
      '[Content_Types].xml',
      '_rels/.rels',
      'word/document.xml',
      'word/_rels/document.xml.rels'
    ];

    requiredFiles.forEach(fileName => {
      if (!this.fileExists(files, fileName)) {
        errors.push(`Required file missing: ${fileName}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get content types from [Content_Types].xml
   */
  static getContentTypes(files: ExtractedFiles): any {
    try {
      const contentTypesXml = this.getFileAsString(files, '[Content_Types].xml');
      // This would need XML parsing - simplified for now
      return contentTypesXml;
    } catch (error) {
      throw new Error(`Failed to read content types: ${error}`);
    }
  }

  /**
   * Update content types
   */
  static updateContentTypes(files: ExtractedFiles, contentTypes: string): void {
    this.setFileFromString(files, '[Content_Types].xml', contentTypes);
  }

  /**
   * Get relationships from document.xml.rels
   */
  static getDocumentRelationships(files: ExtractedFiles): any {
    try {
      const relsXml = this.getFileAsString(files, 'word/_rels/document.xml.rels');
      // This would need XML parsing - simplified for now
      return relsXml;
    } catch (error) {
      throw new Error(`Failed to read document relationships: ${error}`);
    }
  }

  /**
   * Update document relationships
   */
  static updateDocumentRelationships(files: ExtractedFiles, relationships: string): void {
    this.setFileFromString(files, 'word/_rels/document.xml.rels', relationships);
  }

  /**
   * Clone extracted files (deep copy)
   */
  static cloneExtractedFiles(files: ExtractedFiles): ExtractedFiles {
    const cloned: ExtractedFiles = {};
    
    for (const fileName in files) {
      cloned[fileName] = Buffer.from(files[fileName]);
    }
    
    return cloned;
  }

  /**
   * Merge two sets of extracted files
   */
  static mergeExtractedFiles(files1: ExtractedFiles, files2: ExtractedFiles): ExtractedFiles {
    return { ...files1, ...files2 };
  }

  /**
   * Get file size information
   */
  static getFileSizeInfo(files: ExtractedFiles): { [fileName: string]: number } {
    const sizeInfo: { [fileName: string]: number } = {};
    
    for (const fileName in files) {
      sizeInfo[fileName] = files[fileName].length;
    }
    
    return sizeInfo;
  }

  /**
   * Get total size of all files
   */
  static getTotalSize(files: ExtractedFiles): number {
    let totalSize = 0;
    
    for (const fileName in files) {
      totalSize += files[fileName].length;
    }
    
    return totalSize;
  }
}