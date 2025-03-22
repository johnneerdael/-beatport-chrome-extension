/**
 * Chrome Extension Connectivity Test Script
 * 
 * This script can be pasted into the Chrome extension background page console
 * to test connectivity with the PowerShell service.
 */

// Configuration - try multiple ports
const TEST_PORTS = [1337, 8337, 1338];
const HOST = 'localhost';
const ENDPOINTS = ['status', 'echo', 'test'];

// Terminal colors for console
const COLOR = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

// Test headers
const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Origin': chrome.runtime.getURL('/'),
  'X-Test-Header': 'Beatport-Downloader-Test'
};

/**
 * Log with color
 */
function log(message, type = 'info') {
  const styles = {
    info: `${COLOR.white}`,
    success: `${COLOR.green}`,
    error: `${COLOR.red}`,
    warning: `${COLOR.yellow}`,
    highlight: `${COLOR.cyan}${COLOR.bright}`,
    header: `${COLOR.magenta}${COLOR.bright}${COLOR.underscore}`
  };
  
  console.log(`${styles[type] || styles.info}${message}${COLOR.reset}`);
}

/**
 * Test connectivity to a specific port and endpoint
 */
async function testEndpoint(port, endpoint) {
  const url = `http://${HOST}:${port}/${endpoint}?_=${Date.now()}`;
  log(`Testing endpoint: ${url}`, 'info');
  
  try {
    const startTime = performance.now();
    const response = await fetch(url, {
      method: endpoint === 'test' ? 'POST' : 'GET',
      headers,
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'omit',
      body: endpoint === 'test' ? JSON.stringify({
        test: true,
        timestamp: new Date().toISOString(),
        extension_id: chrome.runtime.id
      }) : undefined
    });
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    log(`✅ Endpoint ${endpoint} successful (${responseTime}ms)`, 'success');
    
    // Check CORS headers
    log('📋 Checking CORS headers:', 'info');
    const corsHeaders = [
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Methods',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Credentials'
    ];
    
    let corsSuccess = true;
    corsHeaders.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        log(`  ${header}: ${value}`, 'success');
        
        // Check if origin matches
        if (header === 'Access-Control-Allow-Origin' && 
            value !== chrome.runtime.getURL('/') && 
            value !== '*') {
          log(`  ⚠️ Origin mismatch: should be "${chrome.runtime.getURL('/')}" or "*"`, 'warning');
          corsSuccess = false;
        }
      } else {
        log(`  ❌ Missing ${header}`, 'error');
        corsSuccess = false;
      }
    });
    
    if (corsSuccess) {
      log('✅ CORS headers are correctly configured', 'success');
    } else {
      log('⚠️ CORS headers have issues that may cause connectivity problems', 'warning');
    }
    
    // Return success with data
    return {
      success: true,
      endpoint,
      port,
      responseTime,
      data
    };
  } catch (error) {
    log(`❌ Endpoint ${endpoint} failed: ${error.message}`, 'error');
    return {
      success: false,
      endpoint,
      port,
      error: error.message
    };
  }
}

/**
 * Test all ports and find the first working one
 */
async function findWorkingPort() {
  log('🔍 Scanning for PowerShell service on multiple ports...', 'header');
  
  for (const port of TEST_PORTS) {
    try {
      log(`Testing port ${port}...`, 'info');
      const result = await testEndpoint(port, 'status');
      
      if (result.success) {
        log(`✅ PowerShell service found on port ${port}!`, 'highlight');
        return port;
      }
    } catch (error) {
      log(`Port ${port} is not available`, 'info');
    }
  }
  
  log('❌ Could not find PowerShell service on any tested port', 'error');
  return null;
}

/**
 * Run complete connectivity test
 */
async function runConnectivityTest() {
  // Header
  log('\n🔌 BEATPORT DOWNLOADER CONNECTIVITY TEST 🔌\n', 'header');
  log(`Extension ID: ${chrome.runtime.id}`, 'info');
  log(`Extension Origin: ${chrome.runtime.getURL('/')}`, 'info');
  log(`Testing connection to PowerShell service...`, 'info');
  
  // Step 1: Find working port
  const workingPort = await findWorkingPort();
  if (!workingPort) {
    log('\n❌ Connectivity test failed - service not found', 'error');
    log('\nTroubleshooting steps:', 'highlight');
    log('1. Make sure the PowerShell service is running');
    log('2. Check if the service is using a different port');
    log('3. Verify Windows Firewall isn\'t blocking connections');
    log('4. Try running the service as Administrator');
    return;
  }
  
  // Step 2: Test all endpoints on working port
  log('\n🧪 Testing all endpoints on port ' + workingPort, 'header');
  const results = [];
  
  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(workingPort, endpoint);
    results.push(result);
  }
  
  // Summary
  const successCount = results.filter(r => r.success).length;
  log(`\n📊 Test complete: ${successCount}/${results.length} endpoints working`, 
    successCount === results.length ? 'success' : 'warning');
  
  if (successCount === results.length) {
    log('✅ PowerShell service is correctly configured for Chrome extension connectivity!', 'highlight');
    
    // Suggest updating extension settings
    log('\n⚙️ Suggestion: Update your extension settings to use:', 'highlight');
    log(`  Host: ${HOST}`, 'info');
    log(`  Port: ${workingPort}`, 'info');
    
    // Return working configuration for easy application
    return {
      host: HOST,
      port: workingPort,
      connectionVerified: true
    };
  } else {
    log('⚠️ Some endpoints failed. Check the service logs for details.', 'warning');
  }
}

// Run the test when this script is loaded
runConnectivityTest().then(config => {
  // Make config available for manual application
  window.workingConfig = config;
  
  if (config && config.connectionVerified) {
    log('\n💡 To apply this configuration in your code:', 'highlight');
    log(`
// Update service settings
chrome.storage.sync.set({
  serviceHost: '${config.host}',
  servicePort: ${config.port}
}, () => {
  console.log('Settings updated');
  
  // Force reconnection to service
  checkServiceStatus();
});
`, 'info');
  }
});

// Export test functions for reuse
window.connectivityTest = {
  testEndpoint,
  findWorkingPort,
  runConnectivityTest
};