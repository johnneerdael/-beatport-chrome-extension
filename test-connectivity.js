/**
 * Chrome Extension Connectivity Test Script
 * 
 * This script tests connectivity between the Chrome extension and the local service.
 * It can be run in the Chrome extension's background page console.
 */

// Configuration
const DEFAULT_PORT = 1337;
const DEFAULT_HOST = 'localhost';
const serviceUrl = `http://${DEFAULT_HOST}:${DEFAULT_PORT}`;

// Test functions
const tests = {
  // Test basic connectivity with status endpoint
  async testStatus() {
    console.log('🧪 Testing connectivity to service status endpoint...');
    try {
      const response = await fetch(`${serviceUrl}/status?_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': chrome.runtime.getURL('/')
        },
        mode: 'cors',  // Explicit CORS mode
        cache: 'no-cache',  // Disable caching
        credentials: 'omit'  // Don't send credentials
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Status endpoint response:', data);
      
      // Check CORS headers in response
      this._checkCorsHeaders(response);
      
      return true;
    } catch (error) {
      console.error('❌ Status endpoint error:', error);
      return false;
    }
  },
  
  // Test echo endpoint to verify headers
  async testEcho() {
    console.log('🧪 Testing echo endpoint to verify headers...');
    try {
      const response = await fetch(`${serviceUrl}/echo?_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': chrome.runtime.getURL('/'),
          'X-Test-Header': 'TestValue'  // Custom header to verify echo
        },
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Echo endpoint response:', data);
      
      // Check if our custom header was echoed back
      if (data.headers && data.headers['X-Test-Header'] === 'TestValue') {
        console.log('✅ Custom header correctly echoed back');
      } else {
        console.warn('⚠️ Custom header not correctly echoed back');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Echo endpoint error:', error);
      return false;
    }
  },
  
  // Test POST request with JSON body
  async testPostRequest() {
    console.log('🧪 Testing POST request with JSON body...');
    try {
      const testData = {
        test: true,
        message: 'Test message',
        timestamp: new Date().toISOString()
      };
      
      const response = await fetch(`${serviceUrl}/test?_=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': chrome.runtime.getURL('/')
        },
        body: JSON.stringify(testData),
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ POST request response:', data);
      
      // Check if our data was correctly received and parsed
      if (data.request_json && data.request_json.test === true) {
        console.log('✅ JSON body correctly processed by the server');
      } else {
        console.warn('⚠️ JSON body not correctly processed by the server');
      }
      
      return true;
    } catch (error) {
      console.error('❌ POST request error:', error);
      return false;
    }
  },
  
  // Helper: Check CORS headers in response
  _checkCorsHeaders(response) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': chrome.runtime.getURL('/'),
      'Access-Control-Allow-Methods': null,
      'Access-Control-Allow-Headers': null,
      'Access-Control-Allow-Credentials': null
    };
    
    console.log('📝 Checking CORS headers:');
    let allHeadersPresent = true;
    
    for (const header in corsHeaders) {
      const value = response.headers.get(header);
      if (value) {
        console.log(`✅ ${header}: ${value}`);
        
        // Check if origin matches exactly
        if (header === 'Access-Control-Allow-Origin' && 
            value !== chrome.runtime.getURL('/') && 
            value !== '*') {
          console.warn(`⚠️ Origin mismatch: expected "${chrome.runtime.getURL('/')}" or "*", got "${value}"`);
        }
      } else {
        // Skip checking specific values for headers where we don't know the expected value
        if (corsHeaders[header] === null) {
          console.log(`ℹ️ ${header}: Not present, but may not be required`);
        } else {
          console.warn(`❌ ${header}: Missing required header`);
          allHeadersPresent = false;
        }
      }
    }
    
    return allHeadersPresent;
  }
};

// Run all tests in sequence
async function runAllTests() {
  console.log('🔍 Starting service connectivity tests...');
  console.log(`🌐 Testing service URL: ${serviceUrl}`);
  console.log(`🆔 Extension ID: ${chrome.runtime.id}`);
  console.log(`📝 Extension Origin: ${chrome.runtime.getURL('/')}`);
  
  let successCount = 0;
  const totalTests = Object.keys(tests).filter(k => k.startsWith('test') && typeof tests[k] === 'function').length;
  
  try {
    // Run status test
    if (await tests.testStatus()) {
      successCount++;
    }
    
    console.log('-----------------------------------');
    
    // Run echo test
    if (await tests.testEcho()) {
      successCount++;
    }
    
    console.log('-----------------------------------');
    
    // Run POST test
    if (await tests.testPostRequest()) {
      successCount++;
    }
    
    console.log('===================================');
    console.log(`🏁 Test completed: ${successCount}/${totalTests} tests passed`);
    
    if (successCount === totalTests) {
      console.log('✅ All tests passed! The service is correctly configured for Chrome extension connectivity.');
    } else {
      console.warn('⚠️ Some tests failed. Check the logs above for details.');
    }
  } catch (error) {
    console.error('💥 Fatal error running tests:', error);
  }
}

// Execute all tests when this script is executed in the console
runAllTests();

// Export test functions for individual use
window.connectivityTests = tests;
window.runAllConnectivityTests = runAllTests;

console.log(`
📋 Test script loaded. You can run individual tests:
  - connectivityTests.testStatus()
  - connectivityTests.testEcho()
  - connectivityTests.testPostRequest()
  
🔄 Or run all tests again:
  - runAllConnectivityTests()
`);