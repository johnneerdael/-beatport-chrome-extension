/**
 * Beatport Downloader - Popup Script
 */

// DOM Elements
const serviceStatusEl = document.getElementById('serviceStatus');
const queueEmptyEl = document.getElementById('queueEmpty');
const queueItemsEl = document.getElementById('queueItems');
const serviceHostEl = document.getElementById('serviceHost');
const servicePortEl = document.getElementById('servicePort');
const downloadQualityEl = document.getElementById('downloadQuality');
const notificationsEl = document.getElementById('notifications');
const refreshBtn = document.getElementById('refreshBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

// Service status texts
const statusTexts = {
  connected: 'Connected',
  connecting: 'Connecting...',
  disconnected: 'Disconnected'
};

// Fetch queue and service status when popup opens
document.addEventListener('DOMContentLoaded', () => {
  // Load settings
  loadSettings();
  
  // Check service status
  checkServiceStatus();
  
  // Get queue status
  refreshQueueStatus();
  
  // Set up event listeners
  setupEventListeners();
});

/**
 * Load saved settings
 */
function loadSettings() {
  chrome.storage.sync.get({
    // Default settings
    servicePort: 1337,
    serviceHost: 'localhost',
    downloadQuality: 'flac',
    notifications: true
  }, (items) => {
    // Update UI
    serviceHostEl.value = items.serviceHost;
    servicePortEl.value = items.servicePort;
    downloadQualityEl.value = items.downloadQuality;
    notificationsEl.checked = items.notifications;
  });
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Refresh button
  refreshBtn.addEventListener('click', () => {
    refreshBtn.disabled = true;
    checkServiceStatus().then(() => {
      refreshQueueStatus().then(() => {
        refreshBtn.disabled = false;
      });
    });
  });
  
  // Save settings button
  saveSettingsBtn.addEventListener('click', () => {
    saveSettings();
  });
}

/**
 * Save settings
 */
function saveSettings() {
  saveSettingsBtn.disabled = true;
  
  const settings = {
    serviceHost: serviceHostEl.value,
    servicePort: parseInt(servicePortEl.value, 10),
    downloadQuality: downloadQualityEl.value,
    notifications: notificationsEl.checked
  };
  
  chrome.storage.sync.set(settings, () => {
    // Check connection with new settings
    chrome.runtime.sendMessage({
      type: 'updateSettings',
      payload: settings
    }, (response) => {
      if (response && response.success) {
        // Show success indicator
        showSettingsSaved();
      }
      
      // Re-enable button
      saveSettingsBtn.disabled = false;
      
      // Check service status and refresh queue
      setTimeout(() => {
        checkServiceStatus().then(refreshQueueStatus);
      }, 500);
    });
  });
}

/**
 * Show settings saved indicator
 */
function showSettingsSaved() {
  const originalText = saveSettingsBtn.textContent;
  saveSettingsBtn.textContent = 'Saved!';
  saveSettingsBtn.style.backgroundColor = '#28a745';
  
  setTimeout(() => {
    saveSettingsBtn.textContent = originalText;
    saveSettingsBtn.style.backgroundColor = '';
  }, 1500);
}

/**
 * Check service status
 */
async function checkServiceStatus() {
  updateServiceStatus('connecting');
  
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'checkService'
    }, (response) => {
      if (response && response.success) {
        updateServiceStatus(response.status.status);
      } else {
        updateServiceStatus('disconnected');
      }
      resolve();
    });
  });
}

/**
 * Update service status UI
 */
function updateServiceStatus(status) {
  // Remove all status classes
  serviceStatusEl.classList.remove('status-connected', 'status-connecting', 'status-disconnected');
  
  // Add current status class
  serviceStatusEl.classList.add(`status-${status}`);
  
  // Update text
  const statusTextEl = serviceStatusEl.querySelector('.status-text');
  statusTextEl.textContent = statusTexts[status] || 'Unknown';
}

/**
 * Refresh queue status
 */
async function refreshQueueStatus() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'getQueueStatus'
    }, (response) => {
      if (response && response.success) {
        updateQueueUI(response.status);
      }
      resolve();
    });
  });
}

/**
 * Update queue UI
 */
function updateQueueUI(queueStatus) {
  const items = queueStatus.items || [];
  
  // Show/hide empty message
  if (items.length === 0) {
    queueEmptyEl.style.display = 'block';
    queueItemsEl.innerHTML = '';
    return;
  }
  
  queueEmptyEl.style.display = 'none';
  
  // Sort items by added time (newest first)
  items.sort((a, b) => b.added - a.added);
  
  // Clear and rebuild queue items
  queueItemsEl.innerHTML = '';
  
  items.forEach(item => {
    const queueItem = createQueueItemElement(item);
    queueItemsEl.appendChild(queueItem);
  });
}

/**
 * Create a queue item element
 */
function createQueueItemElement(item) {
  const { trackId, status, progress, metadata } = item;
  
  const queueItem = document.createElement('div');
  queueItem.className = 'queue-item';
  queueItem.dataset.trackId = trackId;
  
  const title = metadata?.title || `Track ${trackId}`;
  const artist = metadata?.artist || 'Unknown Artist';
  
  queueItem.innerHTML = `
    <div class="queue-item-header">
      <div class="queue-item-title">${escapeHTML(title)}</div>
      <div class="queue-item-status status-${status}">${status}</div>
    </div>
    <div class="queue-item-artist">${escapeHTML(artist)}</div>
    ${status === 'downloading' ? `
    <div class="queue-item-progress">
      <div class="queue-item-progress-bar" style="width: ${progress}%"></div>
    </div>
    ` : ''}
    ${status === 'failed' && item.error ? `
    <div class="queue-item-error">${escapeHTML(item.error)}</div>
    ` : ''}
  `;
  
  return queueItem;
}

/**
 * Helper to escape HTML
 */
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\'/g, '&#039;');
}

// Refresh queue status periodically
let refreshInterval;

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // When popup becomes visible, refresh immediately and start interval
    refreshQueueStatus();
    refreshInterval = setInterval(refreshQueueStatus, 2000);
  } else {
    // When popup is hidden, clear interval
    clearInterval(refreshInterval);
  }
});

// Start refresh interval when popup opens
refreshInterval = setInterval(refreshQueueStatus, 2000);