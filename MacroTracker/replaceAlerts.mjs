import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Use global matching in case there are multiple React Native imports
  // But usually Alert is imported along with standard components in one line.
  
  // A regex to match lines like: import { View, Alert } from 'react-native';
  // or multiline: import {\n  View,\n  Alert\n} from 'react-native';
  const importNativeRegex = /import\s+\{([^}]+)\}\s+from\s+['"]react-native['"]\s*;/;
  let match = content.match(importNativeRegex);
  
  let changed = false;
  while(match) {
    const imports = match[1].split(',').map(s => s.trim()).filter(s => s !== '');
    if (imports.includes('Alert')) {
      const newImports = imports.filter(i => i !== 'Alert');
      
      let relativePath = path.relative(path.dirname(file), path.resolve('./src/components/CustomAlert')).replace(/\\/g, '/');
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      
      const newCustomAlertImport = `import { Alert } from '${relativePath}';`;
      
      let replacement = '';
      if (newImports.length === 0) {
        replacement = newCustomAlertImport;
      } else {
        replacement = `import { ${newImports.join(', ')} } from 'react-native';\n${newCustomAlertImport}`;
      }
      
      content = content.replace(importNativeRegex, replacement);
      changed = true;
      // Search again in case there's another react-native import (unlikely, but safe to avoid infinite loops if we don't 'g' match)
      // Actually, since we replaced it, the next match won't have 'Alert'.
    }
    
    // Break loop manually as regex doesn't advance unless we use global /g which changes match format
    break; 
  }
  
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
