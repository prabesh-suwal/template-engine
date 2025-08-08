# Test Files Directory

This directory is used for real-world testing of the DOCX Template Engine.

## 📁 File Structure

- `template.docx` - Your DOCX template file with template tags
- `data.json` - JSON data to inject into the template
- `output.docx` - Generated document (created after running test)
- `samples/` - Sample templates and data files

## 🚀 Quick Start

### Option 1: Auto-generate Sample Files
```bash
npm run test:real
```
This will automatically create sample `template.docx` and `data.json` files if they don't exist.

### Option 2: Use Your Own Files
1. Place your DOCX template as `template.docx`
2. Place your JSON data as `data.json`
3. Run: `npm run test:real`

### Option 3: Custom Paths
```bash
ts-node test-real.ts --template=./my-template.docx --data=./my-data.json --output=./result.docx
```

## 📝 Template Syntax Guide

Your DOCX template can use these tags:

### Basic Variables
```
{data.fieldName}
{data.user.name}
{data.company.address.street}
```

### Formatters
```
{data.name|bold}
{data.amount|currency}
{data.date|date('DD/MM/YYYY')}
{data.status|upper|color('green')}
```

### Dynamic Tables
```
{data.items[i].name} | {data.items[i].price|currency}
```

### Conditional Formatting
```
{data.status|ifEqual('paid', 'PAID', 'PENDING')|badge}
{data.amount|ifGreater(1000, 'HIGH', 'NORMAL')}
```

## 📊 Sample Data Structure

The auto-generated `data.json` includes:

```json
{
  "invoice": {
    "number": "INV-2024-001",
    "date": "2024-01-15"
  },
  "company": {
    "name": "TechCorp Solutions",
    "email": "billing@techcorp.com"
  },
  "customer": {
    "name": "Acme Corporation",
    "address": {
      "street": "456 Client Street",
      "city": "Business Town"
    }
  },
  "items": [
    {
      "description": "Web Development",
      "quantity": 40,
      "price": 150.00,
      "total": 6000.00
    }
  ],
  "totals": {
    "subtotal": 9400.00,
    "tax": 752.00,
    "total": 10152.00
  }
}
```

## 🎨 Advanced Features

### Images
```
{data.logo|image}
{data.signature|image}
```

### Charts
```
{data.salesData|chart('bar')}
{data.performance|chart('line')}
```

### HTML Content
```
{data.description|html}
{data.terms|html}
```

## 🔍 Testing Different Scenarios

### 1. Invoice Template
- Use the auto-generated sample
- Perfect for testing tables, formatting, calculations

### 2. Report Template
- Complex data structures
- Charts and images
- Multiple formatters

### 3. Letter Template
- Simple text replacement
- Conditional content
- Address formatting

## 🐛 Troubleshooting

### Template Not Found
- Make sure `template.docx` exists in this directory
- Or use `--template=path` to specify custom path

### Data Validation Errors
- Check that your JSON is valid
- Ensure data paths match template tags
- Use the analysis output to see missing data

### Generated Document Issues
- Open `output.docx` in Microsoft Word
- Check for formatting preservation
- Verify all template tags were replaced

## 📈 Performance Testing

For large datasets:
```bash
# Test with 1000 items
ts-node test-real.ts --data=./test-files/large-dataset.json

# Measure performance
time ts-node test-real.ts
```

## 🔧 Custom Testing

Create your own test scenarios:

1. **Multi-page Documents**: Templates with headers, footers, page breaks
2. **Complex Tables**: Nested data, calculations, formatting
3. **Image-heavy**: Multiple images, charts, logos
4. **International**: Different date formats, currencies, languages

## 📋 Test Checklist

- [ ] Template loads successfully
- [ ] Data validation passes
- [ ] All template tags found
- [ ] Document generates without errors
- [ ] Output file opens in Word
- [ ] Formatting is preserved
- [ ] All data is correctly injected
- [ ] Tables are properly generated
- [ ] Images display correctly (if used)
- [ ] Performance is acceptable

## 💡 Tips

1. **Start Simple**: Begin with basic text replacement
2. **Add Complexity**: Gradually add tables, formatters, images
3. **Test Edge Cases**: Empty data, missing fields, special characters
4. **Performance**: Test with large datasets
5. **Validation**: Always check the analysis output first

Happy testing! 🚀