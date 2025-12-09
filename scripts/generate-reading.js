#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const generator = require('./generator');

const [, , inputPath, outputPathArg] = process.argv;

const usage = `
Usage: node scripts/generate-reading.js <input.json> [output.html]

- input.json : reading test data following schema in data/sample-reading.json
- output.html: optional path (defaults to dist/<test_id>.html)
`;

if (!inputPath) {
  console.error(usage.trim());
  process.exit(1);
}

const resolvePath = (p) => path.isAbsolute(p) ? p : path.join(process.cwd(), p);

try {
  const jsonPath = resolvePath(inputPath);
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const testData = JSON.parse(raw);

  const templatePath = path.join(__dirname, '..', 'template', 'base-reading.html');
  const templateHtml = fs.readFileSync(templatePath, 'utf8');

  const { html, meta } = generator.renderFromJson(testData, templateHtml);
  const outputPath = resolvePath(outputPathArg || path.join(__dirname, '..', 'dist', `${testData.test_id || 'reading-output'}.html`));

  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`Generated ${outputPath}`);
  console.log(`Total questions: ${meta.totalQuestions}`);
} catch (err) {
  console.error('Failed to generate HTML:', err.message);
  process.exit(1);
}
