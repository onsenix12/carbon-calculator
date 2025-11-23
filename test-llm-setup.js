/**
 * Test Script: Verify LLM Setup
 * 
 * This script checks if your LLM setup is configured correctly.
 * Run: node test-llm-setup.js
 */

require('dotenv').config();

console.log('🔍 Testing LLM Setup...\n');

// Check 1: Environment variables
console.log('1. Checking Environment Variables:');
const hasClaudeKey = process.env.CLAUDE_API_KEY || process.env.REACT_APP_CLAUDE_API_KEY;
const useProxy = process.env.REACT_APP_USE_PROXY === 'true';

if (hasClaudeKey) {
  const keyPreview = hasClaudeKey.substring(0, 20) + '...';
  console.log('   ✅ API Key found:', keyPreview);
} else {
  console.log('   ❌ API Key NOT found');
  console.log('   → Add CLAUDE_API_KEY or REACT_APP_CLAUDE_API_KEY to .env');
}

if (useProxy) {
  console.log('   ✅ Proxy mode enabled (REACT_APP_USE_PROXY=true)');
} else {
  console.log('   ⚠️  Proxy mode NOT enabled');
  console.log('   → Add REACT_APP_USE_PROXY=true to .env for local development');
}

// Check 2: Dependencies
console.log('\n2. Checking Dependencies:');
try {
  require('express');
  console.log('   ✅ express installed');
} catch (e) {
  console.log('   ❌ express NOT installed - run: npm install express');
}

try {
  require('cors');
  console.log('   ✅ cors installed');
} catch (e) {
  console.log('   ❌ cors NOT installed - run: npm install cors');
}

try {
  require('dotenv');
  console.log('   ✅ dotenv installed');
} catch (e) {
  console.log('   ❌ dotenv NOT installed - run: npm install dotenv');
}

// Check 3: Proxy server file
console.log('\n3. Checking Files:');
const fs = require('fs');
if (fs.existsSync('proxy-server.js')) {
  console.log('   ✅ proxy-server.js exists');
} else {
  console.log('   ❌ proxy-server.js NOT found');
}

// Check 4: Test proxy server connection (if running)
console.log('\n4. Testing Proxy Server Connection:');
const http = require('http');

const testProxy = () => {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3001/health', (res) => {
      if (res.statusCode === 200) {
        console.log('   ✅ Proxy server is RUNNING on port 3001');
        resolve(true);
      } else {
        console.log('   ⚠️  Proxy server responded with status:', res.statusCode);
        resolve(false);
      }
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        console.log('   ❌ Proxy server is NOT running');
        console.log('   → Start it with: npm run proxy');
      } else {
        console.log('   ⚠️  Error connecting:', err.message);
      }
      resolve(false);
    });

    req.setTimeout(2000, () => {
      req.destroy();
      console.log('   ❌ Proxy server connection timeout');
      console.log('   → Start it with: npm run proxy');
      resolve(false);
    });
  });
};

testProxy().then((proxyRunning) => {
  console.log('\n📊 Summary:');
  console.log('─'.repeat(50));
  
  if (hasClaudeKey && useProxy && proxyRunning) {
    console.log('✅ Everything looks good! LLM should work.');
    console.log('\nNext steps:');
    console.log('1. Keep proxy server running: npm run proxy');
    console.log('2. Start React app: npm start');
    console.log('3. Upload a PDF and check browser console for "LLM successes"');
  } else {
    console.log('⚠️  Some issues detected:');
    if (!hasClaudeKey) {
      console.log('   - Missing API key in .env');
    }
    if (!useProxy) {
      console.log('   - REACT_APP_USE_PROXY not set to true');
    }
    if (!proxyRunning) {
      console.log('   - Proxy server not running');
    }
    console.log('\nSee QUICK_START_LLM.md for setup instructions');
  }
  
  console.log('─'.repeat(50));
});

