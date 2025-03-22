/**
 * Beatport Downloader - Background Script
 * 
 * This script handles communication with the local service and manages downloads.
 */

// Service client configuration
const DEFAULT_PORT = 1337;
const DEFAULT_HOST = 'localhost';

// Service state
let serviceState = {
  status: 'disconnected', // 'connected', 'disconnected', 'connecting'
  url: `http://${DEFAULT_HOST}:${DEFAULT_PORT}`,
  port: DEFAULT_PORT,
  lastCheck: null,
  connectionAttempts: 0
};

// Download queue
let downloadQueue = new Map();

// Initialize
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Beatport Downloader extension installed');
  
  // Load settings
  await loadSettings();
  
  // Check service status
  checkServiceStatus();
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type);
  
  switch (message.type) {
    case 'downloadRequest':
      handleDownloadRequest(message.payload)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep the message channel open for async response
      
    case 'checkService':
      checkServiceStatus()
        .then(status => sendResponse({ success: true, status }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'getQueueStatus':
      const queueStatus = getQueueStatus();
      sendResponse({ success: true, status: queueStatus });
      break;
      
    case 'updateSettings':
      updateSettings(message.payload)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
  }
  
  return false;
});

/**
 * Load user settings
 */
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({
      // Default settings
      servicePort: DEFAULT_PORT,
      serviceHost: DEFAULT_HOST,
      downloadQuality: 'flac',
      notifications: true
    }, (items) => {
      // Update service state
      serviceState.port = items.servicePort;
      serviceState.url = `http://${items.serviceHost}:${items.servicePort}`;
      
      resolve(items);
    });
  });
}

/**
 * Update user settings
 */
async function updateSettings(settings) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.set(settings, () => {
        // Update service state if port or host changes
        if (settings.servicePort || settings.serviceHost) {
          const port = settings.servicePort || serviceState.port;
          const host = settings.serviceHost || DEFAULT_HOST;
          serviceState.port = port;
          serviceState.url = `http://${host}:${port}`;
          
          // Check connection with new settings
          checkServiceStatus();
        }
        
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Check if the service is available
 */
async function checkServiceStatus() {
  // Prevent multiple simultaneous checks
  if (serviceState.status === 'connecting') {
    return serviceState;
  }
  
  serviceState.status = 'connecting';
  serviceState.lastCheck = Date.now();
  
  try {
    console.log(`Checking service status at ${serviceState.url}/status`);
    
    // Add cache-busting parameter and more detailed fetch options
    const response = await fetch(`${serviceState.url}/status?_=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': chrome.runtime.getURL('/')
      },
      mode: 'cors',  // Use CORS mode explicitly
      cache: 'no-cache',  // Disable caching
      credentials: 'omit'  // Don't send credentials
    });
    
    if (response.ok) {
      const data = await response.json();
      serviceState.status = data.status === 'running' ? 'connected' : 'disconnected';
      serviceState.connectionAttempts = 0;
      serviceState.lastSuccessfulConnect = Date.now();
      serviceState.serviceData = data; // Store complete service data
      
      // Broadcast status to all tabs
      broadcastServiceStatus();
      
      return serviceState;
    } else {
      throw new Error(`Service responded with status ${response.status}`);
    }
  } catch (error) {
    console.warn('Error connecting to Beatport Downloader service:', error);
    
    // Try alternate ports if we haven't successfully connected before
    if (!serviceState.lastSuccessfulConnect) {
      const alternatePorts = [8337, 1338, 1339, 7777];
      
      // Try each alternate port
      for (const port of alternatePorts) {
        try {
          console.log(`Trying alternate port ${port}...`);
          const altUrl = `http://${serviceState.host}:${port}`;
          
          const response = await fetch(`${altUrl}/status?_=${Date.now()}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Origin': chrome.runtime.getURL('/')
            },
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'omit'
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.status === 'running') {
              console.log(`Service found on port ${port}`);
              serviceState.port = port;
              serviceState.url = altUrl;
              serviceState.status = 'connected';
              serviceState.connectionAttempts = 0;
              serviceState.lastSuccessfulConnect = Date.now();
              
              // Save new port to storage
              chrome.storage.sync.set({ servicePort: port });
              
              // Broadcast status to all tabs
              broadcastServiceStatus();
              
              return serviceState;
            }
          }
        } catch (altError) {
          console.log(`Port ${port} not available`);
        }
      }
    }
    
    // If we get here, all connection attempts failed
    serviceState.status = 'disconnected';
    serviceState.connectionAttempts++;
    
    // Broadcast status to all tabs
    broadcastServiceStatus();
    
    // Retry with exponential backoff
    if (serviceState.connectionAttempts < 5) {
      const delay = Math.min(1000 * Math.pow(2, serviceState.connectionAttempts), 30000);
      setTimeout(checkServiceStatus, delay);
    } else {
      // After 5 failed attempts, retry less frequently (every 2 minutes)
      setTimeout(checkServiceStatus, 120000);
    }
    
    return serviceState;
  }
}

/**
 * Broadcast service status to all tabs
 */
async function broadcastServiceStatus() {
  const tabs = await chrome.tabs.query({ url: 'https://*.beatport.com/*' });
  
  tabs.forEach(tab => {
    chrome.tabs.sendMessage(tab.id, {
      type: 'serviceStatus',
      payload: {
        connected: serviceState.status === 'connected',
        status: serviceState.status
      }
    }).catch(() => {
      // Ignore errors for tabs that might not have the content script loaded
    });
  });
}

/**
 * Handle download request from content script
 */
async function handleDownloadRequest(payload) {
  const { trackId, quality, metadata } = payload;
  
  if (!trackId) {
    throw new Error('Track ID is required');
  }
  
  // Check service status
  if (serviceState.status !== 'connected') {
    await checkServiceStatus();
    if (serviceState.status !== 'connected') {
      throw new Error('Service is not available');
    }
  }
  
  // Get quality setting
  const settings = await loadSettings();
  const downloadQuality = quality || settings.downloadQuality;
  
  // Send download request to service
  try {
    const response = await fetch(`${serviceState.url}/download/${trackId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quality: downloadQuality,
        metadata: metadata || {}
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Service error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    
    // Add to download queue
    downloadQueue.set(trackId, {
      queueId: data.queueId,
      status: data.status,
      position: data.position,
      progress: 0,
      metadata: metadata || {},
      added: Date.now()
    });
    
    // Start polling for updates
    startTrackStatusPolling(trackId, data.queueId);
    
    // Show notification if enabled
    if (settings.notifications) {
      chrome.notifications.create(`download-${trackId}`, {
        type: 'basic',
        iconUrl: '/icons/icon128.png',
        title: 'Download Queued',
        message: `Track queued for download: ${metadata?.title || trackId}`
      });
    }
    
    return { success: true, queueId: data.queueId };
  } catch (error) {
    console.error('Error requesting download:', error);
    throw error;
  }
}

/**
 * Start polling for track status updates
 */
function startTrackStatusPolling(trackId, queueId) {
  // Initial delay before first poll
  setTimeout(async () => {
    await pollTrackStatus(trackId, queueId);
  }, 1000);
}

/**
 * Poll for track status updates
 */
async function pollTrackStatus(trackId, queueId) {
  const queueItem = downloadQueue.get(trackId);
  if (!queueItem) return;
  
  try {
    const response = await fetch(`${serviceState.url}/queue`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Service error (${response.status})`);
    }
    
    const data = await response.json();
    const queueItems = data.items || [];
    const item = queueItems.find(i => i.id === queueId);
    
    if (item) {
      // Update queue item
      const prevStatus = queueItem.status;
      queueItem.status = item.status;
      queueItem.progress = item.progress || 0;
      queueItem.position = item.position || 0;
      queueItem.error = item.error || null;
      
      // Broadcast status update to content script if status changed
      if (prevStatus !== item.status || queueItem.progress % 10 === 0) {
        broadcastDownloadUpdate(trackId, queueItem);
      }
      
      // Continue polling if not completed or failed
      if (item.status !== 'completed' && item.status !== 'failed') {
        setTimeout(() => pollTrackStatus(trackId, queueId), 2000);
      } else {
        // Handle completion or failure
        handleDownloadCompletion(trackId, queueItem);
      }
    } else if (queueItem.status !== 'completed' && queueItem.status !== 'failed') {
      // Item not found in queue but not marked as completed/failed
      // Try a few more times before giving up
      if (!queueItem.pollAttempts) queueItem.pollAttempts = 0;
      queueItem.pollAttempts++;
      
      if (queueItem.pollAttempts < 5) {
        setTimeout(() => pollTrackStatus(trackId, queueId), 2000);
      } else {
        // Assume removed from queue = completed
        queueItem.status = 'completed';
        handleDownloadCompletion(trackId, queueItem);
      }
    }
  } catch (error) {
    console.error('Error polling track status:', error);
    
    // Continue polling on error, with backoff
    if (!queueItem.errorAttempts) queueItem.errorAttempts = 0;
    queueItem.errorAttempts++;
    
    if (queueItem.errorAttempts < 5) {
      const delay = Math.min(2000 * Math.pow(1.5, queueItem.errorAttempts), 30000);
      setTimeout(() => pollTrackStatus(trackId, queueId), delay);
    } else {
      // Give up after too many errors
      queueItem.status = 'failed';
      queueItem.error = 'Connection lost';
      handleDownloadCompletion(trackId, queueItem);
    }
  }
}

/**
 * Broadcast download status update to content script
 */
async function broadcastDownloadUpdate(trackId, queueItem) {
  const tabs = await chrome.tabs.query({ url: 'https://*.beatport.com/*' });
  
  tabs.forEach(tab => {
    if (queueItem.status === 'downloading') {
      chrome.tabs.sendMessage(tab.id, {
        type: 'downloadProgress',
        payload: {
          trackId,
          progress: queueItem.progress
        }
      }).catch(() => {});
    } else if (queueItem.status === 'completed') {
      chrome.tabs.sendMessage(tab.id, {
        type: 'downloadComplete',
        payload: { trackId }
      }).catch(() => {});
    } else if (queueItem.status === 'failed') {
      chrome.tabs.sendMessage(tab.id, {
        type: 'downloadError',
        payload: {
          trackId,
          error: queueItem.error || 'Unknown error'
        }
      }).catch(() => {});
    }
  });
}

/**
 * Handle download completion or failure
 */
async function handleDownloadCompletion(trackId, queueItem) {
  const settings = await loadSettings();
  
  if (settings.notifications) {
    // Show notification
    const title = queueItem.status === 'completed' ? 'Download Complete' : 'Download Failed';
    const message = queueItem.status === 'completed'
      ? `Successfully downloaded: ${queueItem.metadata?.title || trackId}`
      : `Failed to download: ${queueItem.metadata?.title || trackId}${queueItem.error ? ` - ${queueItem.error}` : ''}`;
    
    chrome.notifications.create(`download-${trackId}-${Date.now()}`, {
      type: 'basic',
      iconUrl: '/icons/icon128.png',
      title,
      message
    });
  }
  
  // Broadcast final status
  broadcastDownloadUpdate(trackId, queueItem);
  
  // Keep in queue for a while before removing
  setTimeout(() => {
    downloadQueue.delete(trackId);
  }, 60000); // Keep for 1 minute after completion
}

/**
 * Get status of all queued downloads
 */
function getQueueStatus() {
  const queue = [];
  
  downloadQueue.forEach((item, trackId) => {
    queue.push({
      trackId,
      queueId: item.queueId,
      status: item.status,
      progress: item.progress,
      position: item.position,
      added: item.added,
      metadata: item.metadata
    });
  });
  
  return {
    items: queue,
    serviceStatus: serviceState.status
  };
}

// Check service status periodically
setInterval(checkServiceStatus, 30000);