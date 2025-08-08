// Test setup file
import { TemplateEngine } from '../src';

// Global test configuration
beforeAll(() => {
  // Configure console for tests
  if (process.env.NODE_ENV === 'test') {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

// Helper function to create test template
export async function createTestTemplate(content: string): Promise<Buffer> {
  return await TemplateEngine.createSimpleTemplate(content);
}

// Sample test data
export const sampleData = {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  company: {
    name: 'Test Corp',
    address: {
      street: '123 Test St',
      city: 'Test City',
      zip: '12345'
    }
  },
  orders: [
    { id: 1, item: 'Laptop', price: 999.99, date: new Date('2024-01-01') },
    { id: 2, item: 'Mouse', price: 29.99, date: new Date('2024-01-02') }
  ],
  active: true,
  score: 85.5
};

// Test utilities
export const testUtils = {
  /**
   * Check if buffer is valid DOCX
   */
  isValidDocx: (buffer: Buffer): boolean => {
    // Check ZIP signature
    return buffer.length > 4 && 
           buffer[0] === 0x50 && 
           buffer[1] === 0x4B;
  },

  /**
   * Create minimal DOCX for testing
   */
  createMinimalDocx: (): Buffer => {
    const JSZip = require('jszip');
    const zip = new JSZip();
    
    zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');
    zip.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Test</w:t></w:r></w:p></w:body></w:document>');
    
    return zip.generateSync({ type: 'nodebuffer' });
  }
};