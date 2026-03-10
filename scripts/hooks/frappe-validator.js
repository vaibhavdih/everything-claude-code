#!/usr/bin/env node
/**
 * Frappe Code Validator
 *
 * Validates Frappe-specific patterns and conventions.
 * Checks for common security issues and anti-patterns.
 */

const fs = require('fs');
const path = require('path');

function main() {
  try {
    const input = readStdinSync();
    const toolUse = JSON.parse(input);

    // Only process Python files
    const filePath = toolUse.file_path || toolUse.path;
    if (!filePath || !filePath.endsWith('.py')) {
      process.stdout.write(input);
      return;
    }

    // Check if Frappe project
    if (!isFrappeProject()) {
      process.stdout.write(input);
      return;
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      process.stdout.write(input);
      return;
    }

    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');

    // Run validation checks
    const warnings = [];

    // Check for SQL injection risks
    if (content.includes('frappe.db.sql(f"') || content.includes("frappe.db.sql(f'")) {
      warnings.push('⚠️  SQL Injection Risk: Using f-string in frappe.db.sql(). Use parameterized queries instead.');
    }

    if (content.match(/frappe\.db\.sql\([^)]*\+[^)]*\)/)) {
      warnings.push('⚠️  SQL Injection Risk: String concatenation in frappe.db.sql(). Use parameterized queries.');
    }

    // Check for missing @frappe.whitelist() decorator
    const functionPattern = /^def\s+(\w+)\s*\(/gm;
    const whitelistPattern = /@frappe\.whitelist\(\)/;

    let match;
    while ((match = functionPattern.exec(content)) !== null) {
      const funcName = match[1];
      const linesBefore = content.substring(Math.max(0, match.index - 200), match.index);

      // If function looks like API but no @frappe.whitelist()
      if (!linesBefore.includes('@frappe.whitelist()') &&
          !funcName.startsWith('_') &&
          funcName !== 'execute' &&
          !funcName.startsWith('test_')) {
        // Check if file is an API file
        if (filePath.includes('/api/') || filePath.includes('\\api\\')) {
          warnings.push(`⚠️  API Function '${funcName}' may need @frappe.whitelist() decorator`);
        }
      }
    }

    // Check for missing permission checks in whitelisted functions
    if (content.includes('@frappe.whitelist()')) {
      const hasPermissionCheck =
        content.includes('frappe.has_permission') ||
        content.includes('frappe.throw') ||
        content.includes('PermissionError');

      if (!hasPermissionCheck && !content.includes('allow_guest=True')) {
        warnings.push('⚠️  Whitelisted function may need explicit permission check');
      }
    }

    // Check for direct frappe.db.set_value on documents
    if (content.match(/frappe\.db\.set_value\([^)]*DocType[^)]*\)/)) {
      warnings.push('ℹ️  Consider using doc.save() instead of frappe.db.set_value() to trigger validation hooks');
    }

    // Check for missing translations
    if (content.match(/frappe\.throw\("([^"]+)"\)/) || content.match(/frappe\.throw\('([^']+)'\)/)) {
      warnings.push('ℹ️  Consider using _() for translatable error messages: frappe.throw(_("message"))');
    }

    // Check DocType naming convention (if it's a DocType controller)
    if (filePath.includes('/doctype/') && content.includes('class ') && content.includes('(Document)')) {
      const className = content.match(/class\s+(\w+)\s*\(Document\)/);
      if (className) {
        const expectedFileName = toSnakeCase(className[1]) + '.py';
        const actualFileName = path.basename(filePath);
        if (actualFileName !== expectedFileName) {
          warnings.push(`⚠️  File name '${actualFileName}' should match class name: '${expectedFileName}'`);
        }
      }
    }

    // Display warnings
    if (warnings.length > 0) {
      console.error('\n[Frappe Validator] Validation warnings:');
      warnings.forEach(warning => console.error(`  ${warning}`));
      console.error('');
    }

    // Return original input (warnings are non-blocking)
    process.stdout.write(input);

  } catch (err) {
    console.error(`[Frappe Validator] Error: ${err.message}`);
    // Always pass through input on error
    process.stdout.write(process.stdin.read() || '');
    process.exit(0);
  }
}

function readStdinSync() {
  const chunks = [];
  const buffer = Buffer.alloc(1024);
  let bytesRead;

  try {
    while ((bytesRead = fs.readSync(process.stdin.fd, buffer, 0, buffer.length)) > 0) {
      chunks.push(buffer.slice(0, bytesRead));
    }
  } catch (e) {
    if (e.code !== 'EAGAIN') throw e;
  }

  return Buffer.concat(chunks).toString('utf8');
}

function isFrappeProject() {
  const cwd = process.cwd();

  // Check for hooks.py
  if (fs.existsSync(path.join(cwd, 'hooks.py'))) {
    return true;
  }

  // Check for sites directory
  if (fs.existsSync(path.join(cwd, 'sites'))) {
    return true;
  }

  // Check parent directories (up to 3 levels)
  let currentDir = cwd;
  for (let i = 0; i < 3; i++) {
    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;

    if (fs.existsSync(path.join(parent, 'hooks.py')) ||
        fs.existsSync(path.join(parent, 'sites'))) {
      return true;
    }

    currentDir = parent;
  }

  return false;
}

function toSnakeCase(str) {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

main();
