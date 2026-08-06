const { execSync } = require('child_process');
const fs = require('fs');

try {
  const result = execSync('npx vitest run js/validators/timeBlockValidator.test.js', {
    cwd: 'c:\\UniGo',
    encoding: 'utf8',
    timeout: 60000
  });
  fs.writeFileSync('c:\\UniGo\\test-tbv-result.txt', result);
} catch (e) {
  const output = (e.stdout || '') + '\n---STDERR---\n' + (e.stderr || '') + '\n---EXIT: ' + e.status;
  fs.writeFileSync('c:\\UniGo\\test-tbv-result.txt', output);
}
