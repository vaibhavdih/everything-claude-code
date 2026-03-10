#!/usr/bin/env node
/**
 * Frappe Python File Formatter
 *
 * Auto-formats Python files in Frappe projects using Black or Ruff.
 * Only runs when a Frappe project is detected.
 */

const { execSync } = require('child_process');
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

    console.error(`[Frappe Format] Formatting ${filePath}`);

    // Try Ruff first, then Black
    if (commandExists('ruff')) {
      try {
        execSync(`ruff format "${filePath}"`, { stdio: 'pipe' });
        console.error(`[Frappe Format] Formatted with Ruff`);
      } catch (e) {
        console.error(`[Frappe Format] Ruff format failed: ${e.message}`);
      }
    } else if (commandExists('black')) {
      try {
        execSync(`black --quiet "${filePath}"`, { stdio: 'pipe' });
        console.error(`[Frappe Format] Formatted with Black`);
      } catch (e) {
        console.error(`[Frappe Format] Black format failed: ${e.message}`);
      }
    } else {
      console.error('[Frappe Format] Neither Ruff nor Black found, skipping format');
    }

    // Return original input
    process.stdout.write(input);

  } catch (err) {
    console.error(`[Frappe Format] Error: ${err.message}`);
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

function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

main();
