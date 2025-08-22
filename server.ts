

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { TemplateEngine } from './src/index';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from ui directory
app.use(express.static(path.join(__dirname, 'ui')));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'template') {
      // Only allow .docx files for template
      if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
          file.originalname.toLowerCase().endsWith('.docx')) {
        cb(null, true);
      } else {
        cb(new Error('Template must be a .docx file'));
      }
    } else if (file.fieldname === 'data') {
      // Only allow .json files for data
      if (file.mimetype === 'application/json' || 
          file.originalname.toLowerCase().endsWith('.json')) {
        cb(null, true);
      } else {
        cb(new Error('Data must be a .json file'));
      }
    } else {
      cb(new Error('Unexpected field'));
    }
  }
});

// Routes

// Serve the main UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'ui', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get engine info
app.get('/api/info', async (req, res) => {
  try {
    const engine = new TemplateEngine();
    const stats = engine.getEngineStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Analyze template endpoint
app.post('/api/analyze-template', upload.single('template'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No template file provided'
      });
    }

    const engine = new TemplateEngine();
    const templateInfo = await engine.getTemplateInfo(req.file.buffer);
    
    res.json({
      success: true,
      data: {
        stats: templateInfo.stats,
        tags: templateInfo.tags,
        requiredData: templateInfo.requiredData,
        filename: req.file.originalname,
        size: req.file.size
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze template'
    });
  }
});

// Generate document endpoint
app.post('/api/generate', upload.fields([
  { name: 'template', maxCount: 1 },
  { name: 'data', maxCount: 1 }
]), async (req, res) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files.template || !files.template[0]) {
      return res.status(400).json({
        success: false,
        error: 'Template file is required'
      });
    }

    let jsonData: any;
    
    if (files.data && files.data[0]) {
      // Data provided as file
      try {
        const dataContent = files.data[0].buffer.toString('utf8');
        jsonData = JSON.parse(dataContent);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid JSON in data file'
        });
      }
    } else if (req.body.jsonData) {
      // Data provided as JSON in request body
      try {
        jsonData = typeof req.body.jsonData === 'string' 
          ? JSON.parse(req.body.jsonData) 
          : req.body.jsonData;
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid JSON data'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'No data provided'
      });
    }

    const templateBuffer = files.template[0].buffer;
    const engine = new TemplateEngine();

    // Generate the document
    const result = await engine.generate({
      template: templateBuffer,
      data: jsonData,
      preserveOriginalFormatting: true,
      enableCharts: true,
      enableImages: true
    });

    // Set response headers for file download
    const filename = `generated-${Date.now()}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Generation-Metadata', JSON.stringify(result.metadata));

    // Send the generated document
    res.send(result.buffer);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate document'
    });
  }
});

// Validate data against template
app.post('/api/validate', upload.fields([
  { name: 'template', maxCount: 1 },
  { name: 'data', maxCount: 1 }
]), async (req, res) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files.template || !files.template[0]) {
      return res.status(400).json({
        success: false,
        error: 'Template file is required'
      });
    }

    let jsonData: any;
    
    if (files.data && files.data[0]) {
      const dataContent = files.data[0].buffer.toString('utf8');
      jsonData = JSON.parse(dataContent);
    } else if (req.body.jsonData) {
      jsonData = typeof req.body.jsonData === 'string' 
        ? JSON.parse(req.body.jsonData) 
        : req.body.jsonData;
    } else {
      return res.status(400).json({
        success: false,
        error: 'No data provided'
      });
    }

    const templateBuffer = files.template[0].buffer;
    const engine = new TemplateEngine();

    // Validate data against template
    const validation = await engine.validateData(jsonData, templateBuffer);
    
    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
  }

  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DOCX Template Engine Server`);
  console.log(`=====================================`);
  console.log(`📍 Server running at: http://localhost:${PORT}`);
  console.log(`🌐 Web UI available at: http://localhost:${PORT}`);
  console.log(`📋 API endpoints:`);
  console.log(`   GET  /health              - Health check`);
  console.log(`   GET  /api/info            - Engine info`);
  console.log(`   POST /api/analyze-template - Analyze template`);
  console.log(`   POST /api/generate        - Generate document`);
  console.log(`   POST /api/validate        - Validate data`);
  console.log(`=====================================`);
});

export default app;


// import express from 'express';
// import multer from 'multer';
// import cors from 'cors';
// import helmet from 'helmet';
// import rateLimit from 'express-rate-limit';
// import { body, validationResult } from 'express-validator';
// import compression from 'compression';
// import morgan from 'morgan';
// import winston from 'winston';
// import path from 'path';
// import fs from 'fs';

// import { 
//   TemplateEngine, 
//   generateDocument, 
//   validateTemplate, 
//   getTemplateInfo,
//   VERSION,
//   FEATURES 
// } from './src';

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Setup logging
// const logger = winston.createLogger({
//   level: process.env.LOG_LEVEL || 'info',
//   format: winston.format.combine(
//     winston.format.timestamp(),
//     winston.format.errors({ stack: true }),
//     winston.format.json()
//   ),
//   defaultMeta: { service: 'docx-template-api' },
//   transports: [
//     new winston.transports.File({ filename: './logs/error.log', level: 'error' }),
//     new winston.transports.File({ filename: './logs/combined.log' }),
//     ...(process.env.NODE_ENV !== 'production' ? [
//       new winston.transports.Console({
//         format: winston.format.combine(
//           winston.format.colorize(),
//           winston.format.simple()
//         )
//       })
//     ] : [])
//   ]
// });

// // Ensure logs directory exists
// if (!fs.existsSync('./logs')) {
//   fs.mkdirSync('./logs', { recursive: true });
// }

// // Security middleware
// // app.use(helmet());
// // app.use(cors({
// //   origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
// //   credentials: true
// // }));

// app.use(helmet({
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       styleSrc: ["'self'", "'unsafe-inline'"],
//       scriptSrc: ["'self'", "'unsafe-inline'"],
//       imgSrc: ["'self'", "data:", "https:"],
//       connectSrc: ["'self'"],
//       fontSrc: ["'self'"],
//       objectSrc: ["'none'"],
//       mediaSrc: ["'self'"],
//       frameSrc: ["'none'"]
//     }
//   }
// }));

// app.use(cors({
//   origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
//   credentials: true
// }));


// // Compression and logging
// app.use(compression());
// app.use(morgan('combined', {
//   stream: { write: (message) => logger.info(message.trim()) }
// }));


// // IMPORTANT: Serve static files (your web UI)
// // Serve static files (Web UI)
// app.use(express.static(path.join(__dirname, '../ui'), {
//   index: 'index.html'
// }));

// // Serve UI at root path
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, '../ui/index.html'));
// });



// // Rate limiting
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
//   message: {
//     error: 'Too many requests from this IP, please try again later.'
//   }
// });
// app.use(limiter);

// // Body parsing middleware
// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// // Configure multer for file uploads
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '50') * 1024 * 1024,
//     files: 1
//   },
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
//       cb(null, true);
//     } else {
//       cb(new Error('Only .docx files are allowed'));
//     }
//   }
// });

// // Validation middleware
// const validateJsonData = [
//   body('data').notEmpty().withMessage('Data field is required'),
//   body('data').custom((value) => {
//     try {
//       if (typeof value === 'string') {
//         JSON.parse(value);
//       }
//       return true;
//     } catch {
//       throw new Error('Data must be valid JSON');
//     }
//   })
// ];

// const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({
//       success: false,
//       error: 'Validation failed',
//       details: errors.array()
//     });
//   }
//   next();
// };

// // Request logging middleware
// app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
//   const start = Date.now();
  
//   res.on('finish', () => {
//     const duration = Date.now() - start;
//     logger.info('Request completed', {
//       method: req.method,
//       url: req.url,
//       statusCode: res.statusCode,
//       duration: `${duration}ms`,
//       userAgent: req.get('User-Agent'),
//       ip: req.ip
//     });
//   });
  
//   next();
// });

// // Web UI route - serve the main page
// app.get('/', (req: express.Request, res: express.Response) => {
//   const indexPath = path.join(__dirname, '../public/index.html');
//   if (fs.existsSync(indexPath)) {
//     res.sendFile(indexPath);
//   } else {
//     // Fallback if index.html doesn't exist
//     res.status(404).json({
//       error: 'Web UI not found',
//       message: 'Please ensure the web UI files are built and placed in the public directory'
//     });
//   }
// });

// // Health check endpoint
// app.get('/health', (req: express.Request, res: express.Response) => {
//   res.json({
//     success: true,
//     service: 'DOCX Template Engine API',
//     version: VERSION || '1.0.0',
//     timestamp: new Date().toISOString(),
//     uptime: Math.floor(process.uptime()),
//     features: FEATURES,
//     webUI: fs.existsSync(path.join(__dirname, '../public/index.html'))
//   });
// });

// // API Documentation endpoint
// app.get('/api/docs', (req: express.Request, res: express.Response) => {
//   res.json({
//     service: 'DOCX Template Engine API',
//     version: VERSION || '1.0.0',
//     description: 'Generate DOCX documents from templates and JSON data',
//     webUI: {
//       available: fs.existsSync(path.join(__dirname, '../public/index.html')),
//       url: req.protocol + '://' + req.get('host') + '/'
//     },
//     endpoints: {
//       'GET /': {
//         description: 'Web UI for document generation',
//         response: 'HTML interface'
//       },
//       'GET /health': {
//         description: 'API health check',
//         response: 'Health status and service information'
//       },
//       'GET /api/docs': {
//         description: 'API documentation',
//         response: 'This documentation'
//       },
//       'POST /api/generate': {
//         description: 'Generate document from template and data',
//         parameters: {
//           template: 'DOCX file (multipart/form-data)',
//           data: 'JSON object with template data',
//           options: 'Optional generation options',
//           filename: 'Optional output filename'
//         },
//         response: 'Generated DOCX file (binary)',
//         example: 'curl -X POST /api/generate -F "template=@template.docx" -F \'data={"name":"John"}\' --output result.docx'
//       },
//       'POST /api/generate-base64': {
//         description: 'Generate document using base64 template',
//         parameters: {
//           template: 'Base64 encoded DOCX content',
//           data: 'JSON object with template data',
//           options: 'Optional generation options'
//         },
//         response: 'JSON with base64 encoded generated DOCX',
//         example: '{"template": "base64-content", "data": {"name": "John"}}'
//       },
//       'POST /api/validate': {
//         description: 'Validate template structure',
//         parameters: {
//           template: 'DOCX file (multipart/form-data)'
//         },
//         response: 'Validation results and template analysis'
//       },
//       'POST /api/template-info': {
//         description: 'Get template information and tags',
//         parameters: {
//           template: 'DOCX file (multipart/form-data)'
//         },
//         response: 'Template tags, statistics, and requirements'
//       },
//       'POST /api/generate-batch': {
//         description: 'Generate multiple documents',
//         parameters: {
//           template: 'DOCX file (multipart/form-data)',
//           dataArray: 'Array of JSON objects',
//           options: 'Optional generation options'
//         },
//         response: 'Array of generated documents (base64 encoded)'
//       },
//       'GET /api/stats': {
//         description: 'Engine statistics and performance metrics',
//         response: 'Engine stats, cache info, memory usage'
//       }
//     },
//     templateSyntax: {
//       basicVariables: '{data.name}, {data.company.address}',
//       formatters: '{data.amount|currency}, {data.date|date("DD/MM/YYYY")}',
//       conditionals: '{data.status|ifEqual("paid", "PAID", "PENDING")}',
//       tables: '{data.items[i].name} | {data.items[i].price|currency}',
//       special: '{data.logo|image}, {data.chart|chart("bar")}'
//     },
//     availableFormatters: FEATURES?.formatters || [
//       'Text: bold, italic, underline, upper, lower, capitalize',
//       'Numbers: currency, percent, comma, number',
//       'Dates: date formatting with custom patterns',
//       'Conditionals: ifEqual, ifGreater, ifEmpty',
//       'Arrays: sum, average, length, sort',
//       'Visual: color, highlight, font, size'
//     ]
//   });
// });

// // Main generation endpoint with file upload
// // app.post('/api/generate', 
// //   upload.single('template'),
// //   validateJsonData,
// //   handleValidationErrors,
// //   async (req: express.Request, res: express.Response) => {
// //     const startTime = Date.now();
    
// //     try {
// //       // Validate template file
// //       if (!req.file) {
// //         return res.status(400).json({
// //           success: false,
// //           error: 'Template file is required'
// //         });
// //       }

// //       const templateBuffer = req.file.buffer;
// //       const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
// //       const options = req.body.options ? 
// //         (typeof req.body.options === 'string' ? JSON.parse(req.body.options) : req.body.options) 
// //         : {};

// //       logger.info('Processing document generation', {
// //         templateSize: templateBuffer.length,
// //         dataKeys: Object.keys(data).join(', '),
// //         options
// //       });

// //       // Generate document using your existing engine
// //       const result = await generateDocument(templateBuffer, data, options);
// //       const processingTime = Date.now() - startTime;

// //       logger.info('Document generated successfully', {
// //         processingTime: `${processingTime}ms`,
// //         outputSize: result.buffer.length,
// //         templateTags: result.metadata.templateTags
// //       });

// //       // Set response headers
// //       const filename = req.body.filename || `generated-document-${Date.now()}.docx`;
// //       res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
// //       res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
// //       res.setHeader('Content-Length', result.buffer.length);
// //       res.setHeader('X-Processing-Time', processingTime.toString());
// //       res.setHeader('X-Template-Tags', result.metadata.templateTags.toString());

// //       // Send the generated document
// //       res.send(result.buffer);

// //     } catch (error) {
// //       const processingTime = Date.now() - startTime;
// //       logger.error('Document generation failed', {
// //         error: error instanceof Error ? error.message : error,
// //         processingTime: `${processingTime}ms`,
// //         stack: error instanceof Error ? error.stack : undefined
// //       });

// //       res.status(500).json({
// //         success: false,
// //         error: 'Document generation failed',
// //         message: error instanceof Error ? error.message : 'Unknown error'
// //       });
// //     }
// //   }
// // );

// app.post('/api/generate', 
//   upload.single('template'),
//   validateJsonData,
//   handleValidationErrors,
//   async (req: express.Request, res: express.Response) => {
//     const startTime = Date.now();
    
//     try {
//       if (!req.file) {
//         return res.status(400).json({
//           success: false,
//           error: 'Template file is required'
//         });
//       }

//       const templateBuffer = req.file.buffer;
//       const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
//       const options = req.body.options ? 
//         (typeof req.body.options === 'string' ? JSON.parse(req.body.options) : req.body.options) 
//         : {};

//       logger.info('Processing document generation', {
//         templateSize: templateBuffer.length,
//         dataKeys: Object.keys(data).join(', '),
//         options
//       });

//       const result = await generateDocument(templateBuffer, data, options);
//       const processingTime = Date.now() - startTime;

//       logger.info('Document generated successfully', {
//         processingTime: `${processingTime}ms`,
//         outputSize: result.buffer.length,
//         templateTags: result.metadata.templateTags
//       });

//       const filename = req.body.filename || `generated-document-${Date.now()}.docx`;
//       res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
//       res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
//       res.setHeader('Content-Length', result.buffer.length);
//       res.setHeader('X-Processing-Time', processingTime.toString());
//       res.setHeader('X-Template-Tags', result.metadata.templateTags.toString());

//       res.send(result.buffer);

//     } catch (error) {
//       const processingTime = Date.now() - startTime;
//       logger.error('Document generation failed', {
//         error: error instanceof Error ? error.message : error,
//         processingTime: `${processingTime}ms`,
//         stack: error instanceof Error ? error.stack : undefined
//       });

//       res.status(500).json({
//         success: false,
//         error: 'Document generation failed',
//         message: error instanceof Error ? error.message : 'Unknown error'
//       });
//     }
//   }
// );

// // Base64 generation endpoint
// app.post('/api/generate-base64',
//   validateJsonData,
//   handleValidationErrors,
//   async (req: express.Request, res: express.Response) => {
//     const startTime = Date.now();
    
//     try {
//       const { template, data, options = {} } = req.body;

//       if (!template) {
//         return res.status(400).json({
//           success: false,
//           error: 'Template (base64) is required'
//         });
//       }

//       // Decode base64 template
//       const templateBuffer = Buffer.from(template, 'base64');
      
//       logger.info('Processing base64 document generation', {
//         templateSize: templateBuffer.length,
//         dataKeys: Object.keys(data).join(', ')
//       });

//       // Generate document
//       const result = await generateDocument(templateBuffer, data, options);
//       const processingTime = Date.now() - startTime;

//       logger.info('Base64 document generated successfully', {
//         processingTime: `${processingTime}ms`,
//         outputSize: result.buffer.length
//       });

//       // Return base64 encoded result
//       res.json({
//         success: true,
//         document: result.buffer.toString('base64'),
//         metadata: {
//           ...result.metadata,
//           processingTime,
//           size: result.buffer.length,
//           encoding: 'base64'
//         }
//       });

//     } catch (error) {
//       const processingTime = Date.now() - startTime;
//       logger.error('Base64 document generation failed', {
//         error: error instanceof Error ? error.message : error,
//         processingTime: `${processingTime}ms`
//       });

//       res.status(500).json({
//         success: false,
//         error: 'Document generation failed',
//         message: error instanceof Error ? error.message : 'Unknown error'
//       });
//     }
//   }
// );

// // Template validation endpoint
// app.post('/api/validate',
//   upload.single('template'),
//   async (req: express.Request, res: express.Response) => {
//     try {
//       if (!req.file) {
//         return res.status(400).json({
//           success: false,
//           error: 'Template file is required'
//         });
//       }

//       const templateBuffer = req.file.buffer;
      
//       logger.info('Validating template', {
//         filename: req.file.originalname,
//         size: templateBuffer.length
//       });

//       // Validate template using your existing engine
//       const validation = await validateTemplate(templateBuffer);

//       res.json({
//         success: true,
//         validation: validation.validation,
//         stats: validation.stats,
//         templateInfo: {
//           filename: req.file.originalname,
//           size: templateBuffer.length,
//           tags: validation.parsedTemplate.templateTags.length,
//           xmlFiles: validation.parsedTemplate.xmlFiles.size,
//           mediaFiles: validation.parsedTemplate.mediaFiles.size
//         }
//       });

//     } catch (error) {
//       logger.error('Template validation failed', {
//         error: error instanceof Error ? error.message : error
//       });

//       res.status(500).json({
//         success: false,
//         error: 'Template validation failed',
//         message: error instanceof Error ? error.message : 'Unknown error'
//       });
//     }
//   }
// );

// // Template info endpoint
// app.post('/api/template-info',
//   upload.single('template'),
//   async (req: express.Request, res: express.Response) => {
//     try {
//       if (!req.file) {
//         return res.status(400).json({
//           success: false,
//           error: 'Template file is required'
//         });
//       }

//       const templateBuffer = req.file.buffer;
      
//       logger.info('Getting template info', {
//         filename: req.file.originalname,
//         size: templateBuffer.length
//       });

//       // Get template information using your existing engine
//       const info = await getTemplateInfo(templateBuffer);

//       res.json({
//         success: true,
//         templateInfo: info,
//         filename: req.file.originalname,
//         size: templateBuffer.length
//       });

//     } catch (error) {
//       logger.error('Template info extraction failed', {
//         error: error instanceof Error ? error.message : error
//       });

//       res.status(500).json({
//         success: false,
//         error: 'Template info extraction failed',
//         message: error instanceof Error ? error.message : 'Unknown error'
//       });
//     }
//   }
// );

// // Batch generation endpoint
// app.post('/api/generate-batch',
//   upload.single('template'),
//   async (req: express.Request, res: express.Response) => {
//     const startTime = Date.now();
    
//     try {
//       if (!req.file) {
//         return res.status(400).json({
//           success: false,
//           error: 'Template file is required'
//         });
//       }

//       const templateBuffer = req.file.buffer;
//       const dataArray = typeof req.body.dataArray === 'string' ? 
//         JSON.parse(req.body.dataArray) : req.body.dataArray;
//       const options = req.body.options ? 
//         (typeof req.body.options === 'string' ? JSON.parse(req.body.options) : req.body.options) 
//         : {};

//       if (!Array.isArray(dataArray)) {
//         return res.status(400).json({
//           success: false,
//           error: 'dataArray must be an array of data objects'
//         });
//       }

//       logger.info('Processing batch generation', {
//         templateSize: templateBuffer.length,
//         batchSize: dataArray.length
//       });

//       // Create engine and process batch
//       const engine = new TemplateEngine();
//       const results = await engine.generateBatch(templateBuffer, dataArray, options);
//       const processingTime = Date.now() - startTime;

//       logger.info('Batch processing completed', {
//         processingTime: `${processingTime}ms`,
//         totalDocuments: dataArray.length,
//         successfulDocuments: results.filter(r => r.buffer.length > 0).length
//       });

//       // Return results as base64 encoded documents
//       const documents = results.map((result, index) => ({
//         index,
//         document: result.buffer.toString('base64'),
//         metadata: result.metadata,
//         success: result.buffer.length > 0
//       }));

//       res.json({
//         success: true,
//         documents,
//         batchMetadata: {
//           totalDocuments: dataArray.length,
//           successfulDocuments: documents.filter(d => d.success).length,
//           processingTime,
//           averageTime: processingTime / dataArray.length
//         }
//       });

//     } catch (error) {
//       const processingTime = Date.now() - startTime;
//       logger.error('Batch generation failed', {
//         error: error instanceof Error ? error.message : error,
//         processingTime: `${processingTime}ms`
//       });

//       res.status(500).json({
//         success: false,
//         error: 'Batch generation failed',
//         message: error instanceof Error ? error.message : 'Unknown error'
//       });
//     }
//   }
// );


// // Engine stats endpoint
// app.get('/api/stats', async (req: express.Request, res: express.Response) => {
//   try {
//     const engine = new TemplateEngine();
//     const stats = engine.getEngineStats();
    
//     res.json({
//       success: true,
//       stats: {
//         ...stats,
//         api: {
//           uptime: Math.floor(process.uptime()),
//           memory: process.memoryUsage(),
//           environment: process.env.NODE_ENV || 'development'
//         }
//       }
//     });
//   } catch (error) {
//     logger.error('Failed to get engine stats', {
//       error: error instanceof Error ? error.message : error
//     });

//     res.status(500).json({
//       success: false,
//       error: 'Failed to get engine stats',
//       message: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// // Global error handler
// app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
//   logger.error('Unhandled error', {
//     error: error.message,
//     stack: error.stack,
//     url: req.url,
//     method: req.method,
//     userAgent: req.get('User-Agent'),
//     ip: req.ip
//   });
  
//   if (error instanceof multer.MulterError) {
//     if (error.code === 'LIMIT_FILE_SIZE') {
//       return res.status(400).json({
//         success: false,
//         error: 'File too large',
//         message: `Maximum file size is ${process.env.MAX_FILE_SIZE_MB || 50}MB`
//       });
//     }
//   }

//   res.status(500).json({
//     success: false,
//     error: 'Internal server error',
//     message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
//   });
// });

// // 404 handler for API routes

// app.use('/api/*', (req: express.Request, res: express.Response) => {
//   res.status(404).json({
//     success: false,
//     error: 'API endpoint not found',
//     message: `${req.method} ${req.originalUrl} is not a valid API endpoint`,
//     availableEndpoints: [
//       'GET /',
//       'GET /health',
//       'GET /api/docs', 
//       'POST /api/generate',
//       'POST /api/generate-base64',
//       'POST /api/validate',
//       'POST /api/template-info',
//       'POST /api/generate-batch',
//       'GET /api/stats'
//     ]
//   });
// });


// const server = app.listen(PORT, () => {
//   logger.info('DOCX Template Engine API Server started', {
//     port: PORT,
//     environment: process.env.NODE_ENV || 'development',
//     version: VERSION || '1.0.0',
//     webUI: fs.existsSync(path.join(__dirname, '../public/index.html'))
//   });
  
//   console.log('🚀 DOCX Template Engine API Server');
//   console.log('=====================================');
//   console.log(`🌍 Server running on port ${PORT}`);
//   console.log(`🌐 Web UI: http://localhost:${PORT}/`);
//   console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
//   console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
//   console.log('');
//   console.log('Available Endpoints:');
//   console.log('  GET  /                       - Web UI');
//   console.log('  POST /api/generate           - Generate document (file upload)');
//   console.log('  POST /api/generate-base64    - Generate document (base64)');
//   console.log('  POST /api/generate-batch     - Batch generation');
//   console.log('  POST /api/validate           - Validate template');
//   console.log('  POST /api/template-info      - Get template info');
//   console.log('  GET  /api/stats              - Engine statistics');
//   console.log('=====================================');
// });

// process.on('SIGTERM', () => {
//   logger.info('SIGTERM received, shutting down gracefully');
//   server.close(() => {
//     logger.info('HTTP server closed');
//     process.exit(0);
//   });
// });

// process.on('SIGINT', () => {
//   logger.info('SIGINT received, shutting down gracefully');
//   server.close(() => {
//     logger.info('HTTP server closed'); 
//     process.exit(0);
//   });
// });

// export default app;
