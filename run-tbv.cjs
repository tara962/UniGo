const { spawn } = require('child_process');
const fs = require('fs');

const proc = spawn('npx', ['vitest', 'run', 'js/validators/timeBlockValidator.test.js'], {
  cwd: 'c:\\UniGo',
  shell: true,
  env: { ...process.env, FORCE_COLOR: '0' }
});

let stdout = '';
let stderr = '';

proc.stdout.on('data', d => { stdout += d.toString(); });
proc.stderr.on('data', d => { stderr += d.toString(); });

proc.on('close', code => {
  fs.writeFileSync('c:\\UniGo\\test-tbv-result.txt', 
    `EXIT: ${code}\n---STDOUT---\n${stdout}\n---STDERR---\n${stderr}`);
  process.exit(0);
});
