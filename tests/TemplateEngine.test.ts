import { TemplateEngine, generateDocument } from '../src';
import { createTestTemplate, sampleData, testUtils } from './setup';

describe('TemplateEngine', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  afterEach(() => {
    engine.clearCache();
  });

  describe('Basic Functionality', () => {
    test('should create engine instance', () => {
      expect(engine).toBeInstanceOf(TemplateEngine);
    });

    test('should generate simple document', async () => {
      const template = await createTestTemplate('Hello {data.name}!');
      const data = { name: 'World' };

      const result = await engine.generate({ template, data });

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.metadata.templateTags).toBeGreaterThan(0);
      expect(result.metadata.processingTime).toBeGreaterThan(0);
    });

    test('should handle missing data gracefully', async () => {
      const template = await createTestTemplate('Hello {data.missingField}!');
      const data = {};

      const result = await engine.generate({ template, data });

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    test('should preserve original formatting', async () => {
      const template = await createTestTemplate('Name: {data.name}');
      
      const result = await engine.generate({ 
        template, 
        data: sampleData,
        preserveOriginalFormatting: true 
      });

      expect(result.metadata.warnings).toBeUndefined();
    });
  });

  describe('Template Parsing', () => {
    test('should parse template and extract tags', async () => {
      const template = await createTestTemplate(`
        Name: {data.name}
        Email: {data.email}
        Age: {data.age|number}
      `);

      const parseResult = await engine.parseTemplate(template);

      expect(parseResult.parsedTemplate.templateTags.length).toBe(3);
      expect(parseResult.validation.isValid).toBe(true);
      expect(parseResult.stats.totalTags).toBe(3);
    });

    test('should get template info', async () => {
      const template = await createTestTemplate(`
        {data.name|bold}
        {data.orders[i].item}
        {data.company.name}
      `);

      const info = await engine.getTemplateInfo(template);

      expect(info.tags.length).toBeGreaterThan(0);
      expect(info.requiredData).toContain('data.name');
      expect(info.requiredData).toContain('data.orders[i].item');
      expect(info.requiredData).toContain('data.company.name');
    });

    test('should validate template structure', async () => {
      const invalidTemplate = Buffer.from('invalid docx content');

      await expect(engine.parseTemplate(invalidTemplate))
        .rejects.toThrow();
    });
  });

  describe('Data Processing', () => {
    test('should validate data against template', async () => {
      const template = await createTestTemplate('{data.required}');
      
      const validationResult = await engine.validateData({ required: 'value' }, template);
      expect(validationResult.isValid).toBe(true);

      const validationResultMissing = await engine.validateData({}, template);
      expect(validationResultMissing.warnings.length).toBeGreaterThan(0);
    });

    test('should extract data paths', () => {
      const paths = engine.extractDataPaths(sampleData);
      
      expect(paths).toContain('name');
      expect(paths).toContain('company.name');
      expect(paths).toContain('orders[i].item');
    });

    test('should get data statistics', () => {
      const stats = engine.getDataStats(sampleData);
      
      expect(stats.totalProperties).toBeGreaterThan(0);
      expect(stats.arrays).toBeGreaterThan(0);
      expect(stats.nestedObjects).toBeGreaterThan(0);
    });
  });

  describe('Formatters', () => {
    test('should apply built-in formatters', async () => {
      const template = await createTestTemplate(`
        {data.name|upper}
        {data.age|number(0)}
        {data.score|currency}
      `);

      const result = await engine.generate({ template, data: sampleData });
      expect(result).toBeDefined();
    });

    test('should register custom formatter', async () => {
      engine.registerFormatter('reverse', (value: string) => {
        return typeof value === 'string' ? value.split('').reverse().join('') : value;
      });

      const formatters = engine.getAvailableFormatters();
      expect(formatters).toContain('reverse');

      const template = await createTestTemplate('{data.name|reverse}');
      const result = await engine.generate({ template, data: { name: 'hello' } });
      
      expect(result).toBeDefined();
    });

    test('should handle unknown formatters gracefully', async () => {
      const template = await createTestTemplate('{data.name|unknownFormatter}');
      
      const result = await engine.generate({ 
        template, 
        data: { name: 'test' }
      });

      expect(result).toBeDefined();
      // Should not throw error, just warn
    });
  });

  describe('Advanced Features', () => {
    test('should handle nested objects', async () => {
      const template = await createTestTemplate(`
        Company: {data.company.name}
        Address: {data.company.address.street}, {data.company.address.city}
      `);

      const result = await engine.generate({ template, data: sampleData });
      expect(result).toBeDefined();
    });

    test('should handle arrays/tables', async () => {
      const template = await createTestTemplate(`
        Orders:
        {data.orders[i].item} - {data.orders[i].price|currency}
      `);

      const result = await engine.generate({ template, data: sampleData });
      expect(result).toBeDefined();
    });

    test('should process batch documents', async () => {
      const template = await createTestTemplate('Hello {data.name}!');
      const batchData = [
        { name: 'Alice' },
        { name: 'Bob' },
        { name: 'Charlie' }
      ];

      const results = await engine.generateBatch(template, batchData);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.buffer).toBeInstanceOf(Buffer);
        expect(result.buffer.length).toBeGreaterThan(0);
      });
    });

    test('should handle stream processing', async () => {
      const template = await createTestTemplate('Hello {data.name}!');
      
      async function* dataStream() {
        yield { name: 'Alice' };
        yield { name: 'Bob' };
        yield { name: 'Charlie' };
      }

      const results = [];
      for await (const result of engine.generateStream(template, dataStream())) {
        results.push(result);
      }

      expect(results).toHaveLength(3);
    });
  });

  describe('Caching', () => {
    test('should cache parsed templates', async () => {
      const template = await createTestTemplate('Hello {data.name}!');
      
      // First generation
      const start1 = Date.now();
      await engine.generate({ template, data: { name: 'First' } });
      const time1 = Date.now() - start1;

      // Second generation (should use cache)
      const start2 = Date.now();
      await engine.generate({ template, data: { name: 'Second' } });
      const time2 = Date.now() - start2;

      // Second call should be faster (cached template)
      expect(time2).toBeLessThanOrEqual(time1);

      const cacheStats = engine.getCacheStats();
      expect(cacheStats.cachedTemplates).toBe(1);
    });

    test('should clear cache', async () => {
      const template = await createTestTemplate('Hello {data.name}!');
      await engine.generate({ template, data: { name: 'Test' } });

      expect(engine.getCacheStats().cachedTemplates).toBe(1);

      engine.clearCache();
      expect(engine.getCacheStats().cachedTemplates).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid template', async () => {
      const invalidTemplate = Buffer.from('not a valid docx');

      await expect(engine.generate({ 
        template: invalidTemplate, 
        data: {} 
      })).rejects.toThrow();
    });

    test('should handle invalid options', async () => {
      const template = await createTestTemplate('Hello');

      await expect(engine.generate({ 
        template, 
        data: {},
        convertTo: 'invalid' as any
      })).rejects.toThrow();
    });

    test('should handle missing template', async () => {
      await expect(engine.generate({ 
        template: null as any, 
        data: {} 
      })).rejects.toThrow('Template buffer is required');
    });

    test('should handle missing data', async () => {
      const template = await createTestTemplate('Hello');

      await expect(engine.generate({ 
        template, 
        data: null as any 
      })).rejects.toThrow('Data is required');
    });
  });

  describe('Statistics and Info', () => {
    test('should get engine statistics', () => {
      const stats = engine.getEngineStats();

      expect(stats.version).toBeDefined();
      expect(stats.uptime).toBeGreaterThan(0);
      expect(stats.supportedFormats).toContain('docx');
      expect(stats.availableFormatters.length).toBeGreaterThan(0);
    });

    test('should provide library info', () => {
      const { LIBRARY_INFO, FEATURES, VERSION } = require('../src');

      expect(LIBRARY_INFO.name).toBe('docx-template-engine');
      expect(LIBRARY_INFO.version).toBe(VERSION);
      expect(FEATURES.formats.input).toContain('docx');
      expect(FEATURES.templateFeatures.length).toBeGreaterThan(0);
    });
  });
});

describe('Utility Functions', () => {
  test('generateDocument should work as standalone function', async () => {
    const template = await createTestTemplate('Hello {data.name}!');
    const data = { name: 'World' };

    const result = await generateDocument(template, data);

    expect(result).toBeDefined();
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  test('should validate DOCX buffer', async () => {
    const { utils } = require('../src');
    
    const validTemplate = await createTestTemplate('Test');
    const isValid = await utils.isValidDocx(validTemplate);
    expect(isValid).toBe(true);

    const invalidBuffer = Buffer.from('invalid');
    const isInvalid = await utils.isValidDocx(invalidBuffer);
    expect(isInvalid).toBe(false);
  });

  test('should format file size', () => {
    const { utils } = require('../src');
    
    expect(utils.formatFileSize(0)).toBe('0 Bytes');
    expect(utils.formatFileSize(1024)).toBe('1 KB');
    expect(utils.formatFileSize(1024 * 1024)).toBe('1 MB');
  });

  test('should generate sample data', async () => {
    const { utils } = require('../src');
    
    const template = await createTestTemplate(`
      {data.name}
      {data.company.address}
      {data.items[i].name}
    `);

    const sampleData = await utils.generateSampleData(template);
    
    expect(sampleData.name).toBeDefined();
    expect(sampleData.company.address).toBeDefined();
    expect(Array.isArray(sampleData.items)).toBe(true);
  });
});