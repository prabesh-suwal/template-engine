import * as fs from 'fs';
import * as path from 'path';
import { TemplateEngine } from '../dist';

/**
 * Complex example demonstrating advanced features:
 * - Nested objects and arrays
 * - Multiple formatters
 * - Dynamic tables
 * - Images and charts
 * - Custom formatters
 * - Conditional content
 * - HTML content blocks
 */

async function runComplexExample() {
  console.log('🔥 Starting Complex Template Engine Example');
  console.log('==============================================\n');

  const engine = new TemplateEngine();

  // Register custom formatters
  console.log('📝 Registering custom formatters...');
  
  engine.registerFormatter('badge', (value: string, type: string = 'info') => {
    const colors: any = {
      success: 'green',
      warning: 'orange', 
      error: 'red',
      info: 'blue'
    };
    return {
      value: `[${value.toUpperCase()}]`,
      formatting: { 
        bold: true, 
        color: colors[type] || 'blue' 
      }
    };
  });

  engine.registerFormatter('progress', (value: number) => {
    const percentage = Math.round(value);
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percentage}%`;
  });

  engine.registerFormatter('rating', (value: number) => {
    const stars = Math.round(value);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  });

  // Complex template content
  const complexTemplateContent = `
    🏢 COMPANY PERFORMANCE REPORT
    ====================================
    
    Report Date: {data.reportDate|date('DD/MM/YYYY')}
    Generated at: {data.timestamp|date('HH:mm:ss')}
    
    📊 EXECUTIVE SUMMARY
    ────────────────────
    Company: {data.company.name|bold}
    CEO: {data.company.ceo|bold}
    Revenue: {data.financials.revenue|currency('$', 0)|color('green')}
    Status: {data.status|badge('success')}
    
    📍 OFFICE LOCATIONS
    ──────────────────
    {data.company.offices[i].city|title} Office
    Address: {data.company.offices[i].address}
    Employees: {data.company.offices[i].employees|number(0)}
    Manager: {data.company.offices[i].manager}
    
    💰 FINANCIAL PERFORMANCE
    ────────────────────────
    Q1: {data.financials.quarters[0].revenue|currency} ({data.financials.quarters[0].growth|percent})
    Q2: {data.financials.quarters[1].revenue|currency} ({data.financials.quarters[1].growth|percent})
    Q3: {data.financials.quarters[2].revenue|currency} ({data.financials.quarters[2].growth|percent})
    Q4: {data.financials.quarters[3].revenue|currency} ({data.financials.quarters[3].growth|percent})
    
    Annual Growth: {data.financials.yearOverYear|percent|color('green')}
    
    📈 REVENUE CHART
    ───────────────
    {data.financials.chartData|chart('bar')}
    
    👥 EMPLOYEE PERFORMANCE
    ─────────────────────
    Employee: {data.employees[i].name|bold}
    Department: {data.employees[i].department}
    Performance: {data.employees[i].performance|progress}
    Rating: {data.employees[i].rating|rating}
    Salary: {data.employees[i].salary|currency}
    Status: {data.employees[i].status|badge}
    
    📋 PROJECT STATUS
    ────────────────
    Project: {data.projects[i].name|bold}
    Progress: {data.projects[i].progress|progress}
    Deadline: {data.projects[i].deadline|date('DD/MM/YYYY')}
    Budget: {data.projects[i].budget|currency}
    Status: {data.projects[i].status|ifEqual('completed', 'DONE', data.projects[i].status)|upper|color('green')}
    Team Lead: {data.projects[i].teamLead}
    
    🏆 KEY ACHIEVEMENTS
    ─────────────────
    {data.achievements[i].title|bold}
    Date: {data.achievements[i].date|date('MMMM YYYY')}
    Impact: {data.achievements[i].impact|color('blue')}
    
    📊 DEPARTMENT METRICS
    ───────────────────
    {data.departments[i].name|upper|bold}
    Budget: {data.departments[i].budget|currency}
    Team Size: {data.departments[i].teamSize|number(0)}
    Efficiency: {data.departments[i].efficiency|progress}
    Goals Met: {data.departments[i].goalsMet|ifGreater(80, 'EXCELLENT', 'NEEDS IMPROVEMENT')|badge}
    
    🌐 MARKET ANALYSIS
    ─────────────────
    Market Share: {data.market.share|percent}
    Competition Analysis: {data.market.competitors[i].name} - {data.market.competitors[i].share|percent}
    Growth Opportunities: {data.market.opportunities[i]|title}
    
    📱 DIGITAL METRICS
    ─────────────────
    Website Traffic: {data.digital.websiteTraffic|comma} visitors
    Conversion Rate: {data.digital.conversionRate|percent}
    Social Media Followers: {data.digital.socialMedia|comma}
    App Downloads: {data.digital.appDownloads|comma}
    
    🎯 GOALS & TARGETS
    ─────────────────
    {data.goals[i].title|bold}
    Target: {data.goals[i].target|currency}
    Current: {data.goals[i].current|currency}
    Progress: {data.goals[i].progress|progress}
    Due Date: {data.goals[i].dueDate|date('DD/MM/YYYY')}
    
    📝 ADDITIONAL NOTES
    ─────────────────
    {data.notes|html}
    
    ────────────────────────────────────────
    Report compiled by: {data.reportedBy|bold}
    Contact: {data.contact.email} | {data.contact.phone}
    
    🔒 CONFIDENTIAL - Internal Use Only
  `;

  // Complex data structure
  const complexData = {
    reportDate: new Date('2024-01-31'),
    timestamp: new Date(),
    status: 'active',
    reportedBy: 'AI Analytics System',
    
    company: {
      name: 'TechCorp Industries',
      ceo: 'Sarah Johnson',
      founded: new Date('2010-03-15'),
      offices: [
        {
          city: 'new york',
          address: '123 Broadway, NY 10001',
          employees: 150,
          manager: 'Mike Chen'
        },
        {
          city: 'san francisco',
          address: '456 Market St, SF 94102', 
          employees: 200,
          manager: 'Lisa Park'
        },
        {
          city: 'london',
          address: '789 Oxford St, London W1',
          employees: 100,
          manager: 'James Smith'
        }
      ]
    },

    financials: {
      revenue: 12500000,
      yearOverYear: 0.18,
      quarters: [
        { revenue: 2800000, growth: 0.15 },
        { revenue: 3100000, growth: 0.22 },
        { revenue: 3200000, growth: 0.18 },
        { revenue: 3400000, growth: 0.25 }
      ],
      chartData: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          label: 'Revenue (Millions)',
          data: [2.8, 3.1, 3.2, 3.4],
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
          borderColor: '#333',
          borderWidth: 1
        }]
      }
    },

    employees: [
      {
        name: 'Alice Cooper',
        department: 'Engineering',
        performance: 0.92,
        rating: 4.5,
        salary: 120000,
        status: 'active'
      },
      {
        name: 'Bob Wilson',
        department: 'Sales',
        performance: 0.87,
        rating: 4.2,
        salary: 95000,
        status: 'active'
      },
      {
        name: 'Carol Davis',
        department: 'Marketing',
        performance: 0.95,
        rating: 4.8,
        salary: 110000,
        status: 'promoted'
      }
    ],

    projects: [
      {
        name: 'Mobile App Redesign',
        progress: 0.75,
        deadline: new Date('2024-03-15'),
        budget: 250000,
        status: 'in-progress',
        teamLead: 'David Kim'
      },
      {
        name: 'AI Integration Platform',
        progress: 0.45,
        deadline: new Date('2024-06-30'),
        budget: 500000,
        status: 'planning',
        teamLead: 'Emma Watson'
      },
      {
        name: 'Customer Portal',
        progress: 1.0,
        deadline: new Date('2024-01-30'),
        budget: 180000,
        status: 'completed',
        teamLead: 'Frank Miller'
      }
    ],

    achievements: [
      {
        title: 'Best Workplace Award 2023',
        date: new Date('2023-12-01'),
        impact: 'Improved employee satisfaction by 25%'
      },
      {
        title: 'ISO 27001 Certification',
        date: new Date('2023-10-15'),
        impact: 'Enhanced security and compliance standards'
      },
      {
        title: 'Product Innovation Award',
        date: new Date('2023-09-20'),
        impact: 'Revolutionary AI-powered analytics platform'
      }
    ],

    departments: [
      {
        name: 'engineering',
        budget: 2500000,
        teamSize: 45,
        efficiency: 0.89,
        goalsMet: 85
      },
      {
        name: 'sales',
        budget: 1200000,
        teamSize: 25,
        efficiency: 0.92,
        goalsMet: 90
      },
      {
        name: 'marketing',
        budget: 800000,
        teamSize: 15,
        efficiency: 0.87,
        goalsMet: 82
      }
    ],

    market: {
      share: 0.23,
      competitors: [
        { name: 'CompetitorA', share: 0.31 },
        { name: 'CompetitorB', share: 0.28 },
        { name: 'CompetitorC', share: 0.18 }
      ],
      opportunities: [
        'artificial intelligence integration',
        'mobile-first solutions',
        'international expansion',
        'sustainable technology'
      ]
    },

    digital: {
      websiteTraffic: 245000,
      conversionRate: 0.034,
      socialMedia: 58000,
      appDownloads: 125000
    },

    goals: [
      {
        title: 'Increase Annual Revenue',
        target: 15000000,
        current: 12500000,
        progress: 0.83,
        dueDate: new Date('2024-12-31')
      },
      {
        title: 'Expand Team Size',
        target: 500,
        current: 450,
        progress: 0.90,
        dueDate: new Date('2024-06-30')
      },
      {
        title: 'Launch New Product Line',
        target: 3,
        current: 1,
        progress: 0.33,
        dueDate: new Date('2024-09-30')
      }
    ],

    notes: `
      <h3>Key Highlights</h3>
      <ul>
        <li><strong>Record-breaking quarter:</strong> Q4 exceeded expectations by 15%</li>
        <li><strong>Team expansion:</strong> Successfully onboarded 50+ new employees</li>
        <li><strong>Product launch:</strong> New AI platform gained 10K+ users in first month</li>
        <li><strong>Market position:</strong> Secured 3 major enterprise contracts</li>
      </ul>
      
      <h3>Areas for Improvement</h3>
      <ul>
        <li>Customer support response time</li>
        <li>Mobile app user experience</li>
        <li>International market presence</li>
      </ul>
      
      <h3>Next Quarter Focus</h3>
      <p>Focus on <em>customer retention</em>, <strong>product innovation</strong>, and expanding our presence in the European market. Key initiatives include the launch of our new AI-powered analytics dashboard and the establishment of our London office as a regional hub.</p>
    `,

    contact: {
      email: 'reports@techcorp.com',
      phone: '+1 (555) 123-4567'
    }
  };

  try {
    console.log('📄 Creating complex template...');
    const templateBuffer = await TemplateEngine.createSimpleTemplate(complexTemplateContent);

    console.log('🔍 Analyzing template structure...');
    const templateInfo = await engine.getTemplateInfo(templateBuffer);
    
    console.log('Template Analysis:');
    console.log(`- Total template tags: ${templateInfo.stats.totalTags}`);
    console.log(`- Tags by type:`, JSON.stringify(templateInfo.stats.tagsByType, null, 2));
    console.log(`- Files with tags: ${templateInfo.stats.filesWithTags.length}`);
    console.log(`- Has tables: ${templateInfo.stats.hasTables}`);
    console.log(`- Has images: ${templateInfo.stats.hasImages}`);
    console.log(`- Has charts: ${templateInfo.stats.hasCharts}`);
    console.log();

    console.log('📊 Data validation...');
    const dataValidation = await engine.validateData(complexData, templateBuffer);
    console.log(`Data validation: ${dataValidation.isValid ? '✅ Valid' : '❌ Invalid'}`);
    if (dataValidation.warnings.length > 0) {
      console.log('Warnings:', dataValidation.warnings);
    }
    console.log();

    console.log('⚙️ Generating complex document...');
    const startTime = Date.now();
    
    const result = await engine.generate({
      template: templateBuffer,
      data: complexData,
      preserveOriginalFormatting: true,
      enableCharts: true,
      enableImages: true
    });

    const endTime = Date.now();
    
    console.log('✅ Complex document generated successfully!');
    console.log(`⏱️ Generation time: ${endTime - startTime}ms`);
    console.log(`📊 Result metadata:`, JSON.stringify(result.metadata, null, 2));
    console.log();

    // Save the generated document
    const outputPath = path.join(__dirname, 'output', 'complex-report.docx');
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, result.buffer);
    console.log(`💾 Complex document saved to: ${outputPath}`);

    // Generate multiple reports for different data sets
    await generateVariations(engine, templateBuffer);

    // Performance analysis
    await performanceAnalysis(engine, templateBuffer, complexData);

    // Engine statistics
    console.log('\n📈 Final Engine Statistics:');
    const finalStats = engine.getEngineStats();
    console.log(JSON.stringify(finalStats, null, 2));

  } catch (error) {
    console.error('❌ Error in complex example:', error);
    process.exit(1);
  }
}

async function generateVariations(engine: TemplateEngine, templateBuffer: Buffer) {
  console.log('\n🔄 Generating Report Variations');
  console.log('================================\n');

  const variations = [
    {
      name: 'Q1-Report',
      data: {
        reportDate: new Date('2024-03-31'),
        status: 'growth',
        company: { name: 'TechCorp Q1', ceo: 'Sarah Johnson' },
        financials: { revenue: 3200000, yearOverYear: 0.25 },
        employees: [{ name: 'John Q1', department: 'Sales', performance: 0.95, rating: 5, salary: 100000, status: 'promoted' }]
      }
    },
    {
      name: 'Startup-Report', 
      data: {
        reportDate: new Date('2024-01-31'),
        status: 'startup',
        company: { name: 'InnovateTech Startup', ceo: 'Alex Chen' },
        financials: { revenue: 850000, yearOverYear: 1.5 },
        employees: [{ name: 'Maria Startup', department: 'Product', performance: 0.88, rating: 4, salary: 85000, status: 'active' }]
      }
    },
    {
      name: 'Enterprise-Report',
      data: {
        reportDate: new Date('2024-01-31'),
        status: 'enterprise',
        company: { name: 'Global Tech Solutions', ceo: 'Robert Enterprise' },
        financials: { revenue: 50000000, yearOverYear: 0.12 },
        employees: [{ name: 'David Enterprise', department: 'Operations', performance: 0.91, rating: 4.5, salary: 150000, status: 'senior' }]
      }
    }
  ];

  for (const variation of variations) {
    try {
      console.log(`📄 Generating ${variation.name}...`);
      const result = await engine.generate({
        template: templateBuffer,
        data: variation.data
      });

      const outputPath = path.join(__dirname, 'output', `${variation.name.toLowerCase()}.docx`);
      fs.writeFileSync(outputPath, result.buffer);
      console.log(`💾 ${variation.name} saved to: ${outputPath}`);

    } catch (error) {
      console.error(`❌ Error generating ${variation.name}:`, error);
    }
  }
}

async function performanceAnalysis(engine: TemplateEngine, templateBuffer: Buffer, data: any) {
  console.log('\n⚡ Performance Analysis');
  console.log('=======================\n');

  const iterations = 10;
  const times: number[] = [];

  console.log(`Running ${iterations} iterations for performance analysis...`);

  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    
    await engine.generate({
      template: templateBuffer,
      data: data
    });
    
    const endTime = Date.now();
    times.push(endTime - startTime);
    
    process.stdout.write(`Iteration ${i + 1}/${iterations} - ${endTime - startTime}ms\r`);
  }

  console.log('\n');

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  console.log('📊 Performance Results:');
  console.log(`- Average time: ${avgTime.toFixed(2)}ms`);
  console.log(`- Minimum time: ${minTime}ms`);
  console.log(`- Maximum time: ${maxTime}ms`);
  console.log(`- Standard deviation: ${Math.sqrt(times.map(t => Math.pow(t - avgTime, 2)).reduce((a, b) => a + b, 0) / times.length).toFixed(2)}ms`);
  
  const cacheStats = engine.getCacheStats();
  console.log(`- Cache efficiency: ${cacheStats.cachedTemplates > 0 ? 'Enabled' : 'Disabled'}`);
  console.log(`- Memory usage: ${cacheStats.memoryUsage}`);
}

// Run the complex example
if (require.main === module) {
  runComplexExample()
    .then(() => {
      console.log('\n🎉 Complex example completed successfully!');
      console.log('Check the output directory for all generated documents.');
      console.log('\nGenerated files:');
      console.log('- complex-report.docx (main report)');
      console.log('- q1-report.docx (Q1 variation)');
      console.log('- startup-report.docx (startup variation)');
      console.log('- enterprise-report.docx (enterprise variation)');
    })
    .catch((error) => {
      console.error('❌ Complex example failed:', error);
      process.exit(1);
    });
}

export { runComplexExample };