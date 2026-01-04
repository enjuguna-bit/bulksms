const fs = require('fs');
const libCoverage = require('istanbul-lib-coverage');

// Minimum coverage thresholds (60%)
const MIN_COVERAGE = {
  branches: 60,
  functions: 60,
  lines: 60,
  statements: 60
};

function checkCoverage() {
  const coverageMap = libCoverage.createCoverageMap(JSON.parse(fs.readFileSync('./coverage/coverage-final.json')));
  const summary = coverageMap.getCoverageSummary();
  
  let failed = false;
  
  Object.entries(MIN_COVERAGE).forEach(([key, min]) => {
    const actual = summary[key].pct;
    if (actual < min) {
      console.error(`❌ Coverage for ${key} (${actual}%) is below minimum (${min}%)`);
      failed = true;
    } else {
      console.log(`✅ Coverage for ${key} (${actual}%) meets minimum (${min}%)`);
    }
  });
  
  if (failed) {
    console.error('\nCoverage check failed. Please add more tests.');
    process.exit(1);
  }
  
  console.log('\nAll coverage checks passed!');
}

checkCoverage();
