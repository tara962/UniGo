const fs = require('fs');
const data = JSON.parse(fs.readFileSync('c:/UniGo/test-result2.json', 'utf8'));
for (const suite of data.testResults) {
  for (const t of suite.assertionResults) {
    if (t.status === 'failed') {
      console.log('FAILED:', t.fullName);
      console.log(t.failureMessages[0]?.substring(0, 800));
    }
  }
}
