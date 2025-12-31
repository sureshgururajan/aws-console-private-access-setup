import fs from 'fs';
import { ConsolePrivateAccessValidator } from './validator.js';

// Read the CloudFormation template
const templatePath = process.argv[2] || '/tmp/template.json';
const templateContent = fs.readFileSync(templatePath, 'utf-8');
const template = JSON.parse(templateContent);

// Run validation
const validator = new ConsolePrivateAccessValidator(template, 'us-east-1');
const result = validator.validate();

// Print results
console.log('\n=== AWS Console Private Access Validation Results ===\n');
console.log(`Valid: ${result.valid ? '✓ YES' : '✗ NO'}\n`);

console.log('Checks:');
result.checks.forEach((check) => {
  const icon = check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '⚠';
  console.log(`  ${icon} ${check.name}`);
  console.log(`    Status: ${check.status}`);
  console.log(`    Message: ${check.message}`);
  if (check.details) {
    console.log(`    Details: ${check.details}`);
  }
});

console.log(`\nSummary: ${result.summary}\n`);

// Exit with appropriate code
process.exit(result.valid ? 0 : 1);
