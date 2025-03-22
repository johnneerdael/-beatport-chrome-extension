/**
 * Beatport Downloader Chrome Extension
 * Content script that injects download buttons into Beatport pages
 */

// Configuration
const API_ENDPOINT = 'http://localhost:1337';
const DEBUG = true;

// Track IDs that we've already processed
const processedTrackIds = new Set();

/**
 * Log messages to console if debug is enabled
 */
function logDebug(message, data = null) {
    if (DEBUG) {
        if (data) {
            console.log(`[Beatport Downloader] ${message}`, data);
        } else {
            console.log(`[Beatport Downloader] ${message}`);
        }
    }
}

/**
 * Extract track ID from Beatport URL
 */
function extractTrackId(url) {
    const match = url.match(/\/track\/[^\/]+\/(\d+)/);
    return match ? match[1] : null;
}

/**
 * Create a download button for a specific track
 */
function createDownloadButton(trackId) {
    const button = document.createElement('button');
    button.className = 'bp-download-button';
    button.setAttribute('data-track-id', trackId);
    button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>';
    button.title = 'Download with Beatport Downloader';
    button.style.backgroundColor = '#1a1a1a';
    button.style.border = '1px solid #333';
    button.style.borderRadius = '4px';
    button.style.padding = '4px';
    button.style.margin = '0 4px';
    button.style.cursor = 'pointer';
    button.style.color = '#0097ff';
    button.style.transition = 'background-color 0.2s, transform 0.1s';

    // Add hover and active effects
    button.addEventListener('mouseover', () => {
        button.style.backgroundColor = '#252525';
    });

    button.addEventListener('mouseout', () => {
        button.style.backgroundColor = '#1a1a1a';
    });

    button.addEventListener('mousedown', () => {
        button.style.transform = 'scale(0.95)';
    });

    button.addEventListener('mouseup', () => {
        button.style.transform = 'scale(1)';
    });

    // Add click handler
    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        downloadTrack(trackId);
    });

    return button;
}

/**
 * Inject download button into track table row view (Layout 1: Lists-shared-style__Item) - REPLACING MORE BUTTON
 */
function injectDownloadButtonIntoTableRow(row) {
    logDebug('injectDownloadButtonIntoTableRow called', row); // Log 1

    // Find the track link inside the row, using more specific selector
    const trackLinkElement = row.querySelector('.Lists-shared-style__ItemMeta-sc-d366b33c-9 .Lists-shared-style__MetaRow-sc-d366b33c-4 a[href^="/track/"]');

    if (!trackLinkElement) {
        logDebug('trackLinkElement not found in row'); // Log 2
        return;
    }
    logDebug('trackLinkElement found', trackLinkElement); // Log 3

    const trackUrl = trackLinkElement.getAttribute('href');
    const trackId = extractTrackId(trackUrl);

    if (!trackId) {
        logDebug('trackId not extracted from URL'); // Log 4
        return;
    }
    logDebug('trackId extracted', trackId); // Log 5

    if (processedTrackIds.has(trackId + '-table')) return;

    // Mark this track as processed
    processedTrackIds.add(trackId + '-table');

    // Create the download button
    let downloadButton;
    try {
        downloadButton = createDownloadButton(trackId);
        logDebug('downloadButton created', downloadButton); // Log 6
    } catch (error) {
        logDebug('Error creating downloadButton', error); // Catch and log errors in createDownloadButton
        return; // Stop further processing if button creation fails
    }

    // Find the "Add to cart" button in the row
    const addToCartButton = row.querySelector('.add-to-cart');
    if (addToCartButton) {
        // Replace the "Add to cart" button with the download button
        const parentElement = addToCartButton.parentNode;
        if (parentElement) {
            parentElement.innerHTML = '';
            parentElement.appendChild(downloadButton);
            logDebug(`Replaced "Add to cart" button with download button for track ${trackId} in table row`);
            return;
        }
    }

    // Fallback: Find the "More" button in Layout 1
    const moreButtonContainer = row.querySelector('.Lists-shared-style__MoreButton-sc-d366b33c-5.gFIjwC[data-testid="trackslist-item-more-button"]')?.parentNode;
    if (moreButtonContainer) {
         // Replace the content of the "More" button container with the download button
         moreButtonContainer.innerHTML = ''; // Clear existing content (More button)
         moreButtonContainer.appendChild(downloadButton); // Append download button
         logDebug(`Replaced "More" button with download button for track ${trackId} in table row (Layout 1)`); // Log 7
         return;
    }

    // Second fallback: Insert download button after the track link if neither button is found
    logDebug('Neither "Add to cart" nor "More" button container found in row'); // Log 8
    trackLinkElement.parentNode.insertBefore(downloadButton, trackLinkElement.nextSibling);
    logDebug(`Fallback to insert after track link for track ${trackId} in table row`); // Log 9
}

/**
 * Inject download button into track table row view (Layout 2: Table-style__TableRow) - REPLACING ADD TO CART BUTTON
 */
function injectDownloadButtonIntoTableRowLayout2(row) {
    logDebug('injectDownloadButtonIntoTableRowLayout2 called', row); // Log 10

    // Find the track link inside the row, using selector for Layout 2
    const trackLinkElement = row.querySelector('.Table-style__TableCell-sc-fdd08fbd-0.cell.title a[href^="/track/"]');

    if (!trackLinkElement) {
        logDebug('trackLinkElement not found in row (Layout 2)'); // Log 11
        return;
    }
    logDebug('trackLinkElement found', trackLinkElement); // Log 12

    const trackUrl = trackLinkElement.getAttribute('href');
    const trackId = extractTrackId(trackUrl);

    if (!trackId) {
        logDebug('trackId not extracted from URL (Layout 2)'); // Log 13
        return;
    }
    logDebug('trackId extracted', trackId); // Log 14

    if (processedTrackIds.has(trackId + '-table-layout2')) return;

    // Mark this track as processed
    processedTrackIds.add(trackId + '-table-layout2');

    // Create the download button
    let downloadButton;
    try {
        downloadButton = createDownloadButton(trackId);
        logDebug('downloadButton created', downloadButton); // Log 15
    } catch (error) {
        logDebug('Error creating downloadButton (Layout 2)', error); // Catch and log errors
        return; // Stop processing if button creation fails
    }

    // Find the "Add to cart" button in the row, using a more generic selector
    const addToCartButton = row.querySelector('.AddToCart-style__Control-sc-96146fcc-0.add-to-cart');
    if (addToCartButton) {
        // Replace the "Add to cart" button with the download button
        const parentElement = addToCartButton.parentNode;
        if (parentElement) {
            parentElement.innerHTML = '';
            parentElement.appendChild(downloadButton);
            logDebug(`Replaced "Add to cart" button with download button for track ${trackId} in table row (Layout 2) - using AddToCart-style__Control-sc-96146fcc-0.add-to-cart selector`);
            return;
        }
    }

    // Fallback: Find the "Add to cart" cell in Layout 2 - using more generic selector
    const cartButtonCell = row.querySelector('.Table-style__TableCell-sc-fdd08fbd-0.djUlce.cell.card');
    if (cartButtonCell) {
        // Replace the content of the "Add to cart" cell with the download button
        cartButtonCell.innerHTML = ''; // Clear existing content (Add to cart button)
        cartButtonCell.appendChild(downloadButton); // Append download button
        logDebug(`Replaced "Add to cart" button with download button for track ${trackId} in table row (Layout 2) - using Table-style__TableCell-sc-fdd08fbd-0.djUlce.cell.card selector`); // Log 16
        return;
    }

    // Second fallback: Insert download button after the track link if neither button nor cell is found
    logDebug('Neither "Add to cart" button nor cell found in row (Layout 2)'); // Log 17
    trackLinkElement.parentNode.insertBefore(downloadButton, trackLinkElement.nextSibling);
    logDebug(`Fallback to insert after track link for track ${trackId} in table row (Layout 2)`); // Log 18
}

/**
 * Process release cards to replace "Add to cart" buttons
 */
function processReleaseCards() {
    logDebug('Processing release cards');
    
    // Find all release cards
    const releaseCards = document.querySelectorAll('.ReleaseCard-style__Wrapper-sc-1bef577d-11');
    logDebug(`Found ${releaseCards.length} release cards`);
    
    releaseCards.forEach(card => {
        // Find the link to the track
        const trackLink = card.querySelector('a[href^="/release/"]');
        if (!trackLink) return;
        
        // Get the release ID from the URL
        const releaseUrl = trackLink.getAttribute('href');
        const releaseId = releaseUrl.match(/\/release\/[^\/]+\/(\d+)/)?.[1];
        if (!releaseId) return;
        
        // Check if we've already processed this card
        if (processedTrackIds.has(`release-${releaseId}`)) return;
        
        // Mark as processed
        processedTrackIds.add(`release-${releaseId}`);
        
        // Find the "Add to cart" button
        const addToCartButton = card.querySelector('.add-to-cart');
        if (!addToCartButton) return;
        
        // Create a download button for the release
        const downloadButton = createDownloadButton(releaseId);
        downloadButton.style.width = addToCartButton.offsetWidth + 'px';
        downloadButton.style.height = addToCartButton.offsetHeight + 'px';
        
        // Replace the "Add to cart" button
        const parentElement = addToCartButton.parentNode;
        if (parentElement) {
            parentElement.innerHTML = '';
            parentElement.appendChild(downloadButton);
            logDebug(`Replaced "Add to cart" button with download button for release ${releaseId}`);
        }
    });
}

/**
 * Inject download button into track details view (track page)
 */
function injectDownloadButtonIntoTrackDetails() {
    logDebug('injectDownloadButtonIntoTrackDetails called');

    // Find track page elements
    const titleControls = document.querySelector('.TitleControls-style__Container-sc-4de27a86-4.kZtkiz');
    if (!titleControls) {
        logDebug('Track details action bar not found.');
        return;
    }

    // Extract track ID from URL
    const pathname = window.location.pathname;
    const trackId = extractTrackId(pathname);
    if (!trackId || processedTrackIds.has(trackId + '-details')) return;

    // Mark this track as processed
    processedTrackIds.add(trackId + '-details');

    // Create download button
    const downloadButton = createDownloadButton(trackId);
    downloadButton.style.height = '38px';
    downloadButton.style.marginLeft = '4px'; // Add some left margin for spacing

    // Find the "Add to cart" button in track details view
    const addToCartButton = titleControls.querySelector('.AddToCart-style__Control-sc-96146fcc-0.hiFNcq.add-to-cart');
    if (addToCartButton) {
        // Replace the "Add to cart" button with the download button
        const controlsContainer = addToCartButton.closest('.TitleControls-style__Controls-sc-4de27a86-3');
        if (controlsContainer) {
            controlsContainer.appendChild(downloadButton);
            addToCartButton.remove(); // Remove "Add to cart" button
            logDebug(`Replaced "Add to cart" button with download button for track ${trackId} in track details`);
        } else {
            logDebug('Could not find controls container to inject download button in track details.');
        }
    } else {
        logDebug('"Add to cart" button not found in track details action bar.');
        // If "Add to cart" button is not found, try to append to the action bar directly
        titleControls.querySelector('.TitleControls-style__Controls-sc-4de27a86-3.bXqRVD.with-pre').appendChild(downloadButton);
    }
}


/**
 * Download a track via the local API
 */
function downloadTrack(trackId) {
    logDebug(`Initiating download for track ${trackId}`);

    // Show loading status
    const buttons = document.querySelectorAll(`.bp-download-button[data-track-id="${trackId}"]`);
    buttons.forEach(button => {
        if (button) {
            button.style.backgroundColor = '#252525';
            button.innerHTML = '<div class="bp-spinner"></div>';
            button.disabled = true;
        }
    });

    // Create a direct download link
    const downloadUrl = `${API_ENDPOINT}/download/${trackId}`;
    logDebug(`Creating download for URL: ${downloadUrl}`);

    // Use chrome.downloads API to trigger the download
    chrome.downloads.download({
        url: downloadUrl,
        filename: `beatport-track-${trackId}.flac`, // Default filename
        saveAs: false // Don't prompt for save location
    }, (downloadId) => {
        if (chrome.runtime.lastError) {
            logDebug('Download failed:', chrome.runtime.lastError);
            
            // Update button state to error
            buttons.forEach(button => {
                if (button) {
                    button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>';
                    button.style.backgroundColor = '#800000';
                    button.style.color = '#fff';

                    // Reset button after 2 seconds
                    setTimeout(() => {
                        if (button) {
                            button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>';
                            button.style.backgroundColor = '#1a1a1a';
                            button.style.color = '#0097ff';
                            button.disabled = false;
                        }
                    }, 2000);
                }
            });

            // Show notification
            try {
                chrome.runtime.sendMessage({
                    action: 'showNotification',
                    title: 'Download Failed',
                    message: `Error: ${chrome.runtime.lastError.message}`
                });
            } catch (error) {
                logDebug("Error sending notification:", error);
            }
        } else {
            logDebug('Download started with ID:', downloadId);
            
            // Update button state to success
            buttons.forEach(button => {
                if (button) {
                    button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>';
                    button.style.backgroundColor = '#004d80';
                    button.style.color = '#fff';

                    // Reset button after 2 seconds
                    setTimeout(() => {
                        if (button) {
                            button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>';
                            button.style.backgroundColor = '#1a1a1a';
                            button.style.color = '#0097ff';
                            button.disabled = false;
                        }
                    }, 2000);
                }
            });

            // Show notification
            try {
                chrome.runtime.sendMessage({
                    action: 'showNotification',
                    title: 'Download Started',
                    message: `Track download started`
                });
            } catch (error) {
                logDebug("Error sending notification:", error);
            }
        }
    });
}

/**
 * Check if service is running and show status
 */
function checkServiceStatus() {
    if (chrome.runtime && chrome.runtime.sendMessage) {
        fetch(`${API_ENDPOINT}/status`)
            .then(response => response.json())
            .then(data => {
                logDebug('Service status', data);

                // Send status to popup
                try {
                    chrome.runtime.sendMessage({
                        action: 'serviceStatus',
                        status: 'connected',
                        data: data
                    }, function(response) {
                        if (chrome.runtime.lastError) {
                            logDebug("Error sending serviceStatus message:", chrome.runtime.lastError.message);
                        }
                    });
                } catch (error) {
                    logDebug("Error sending serviceStatus message:", error.message);
                }
            })
            .catch(error => {
                logDebug('Service status check failed', error);

                // Send status to popup
                chrome.runtime.sendMessage({
                    action: 'serviceStatus',
                    status: 'disconnected',
                    error: error.message
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        logDebug("Error sending serviceStatus message:", chrome.runtime.lastError.message);
                        ask_followup_question
                    }
                });
            });
    } else {
        logDebug("chrome.runtime or chrome.runtime.sendMessage is not defined");
    }
}


/**
 * Process all track rows on page
 */
function processTrackRows() {
    logDebug('processTrackRows called');

    // Process tracks table rows (Layout 1)
    const tableRowsLayout1 = document.querySelectorAll('[data-testid="tracks-list-item"]');
    logDebug('Found tableRows (Layout 1)', tableRowsLayout1);
    tableRowsLayout1.forEach(row => {
        injectDownloadButtonIntoTableRow(row);
    });

    // Process tracks table rows (Layout 2)
    const tableRowsLayout2 = document.querySelectorAll('[data-testid="tracks-table-row"]');
    logDebug('Found tableRows (Layout 2)', tableRowsLayout2);
    tableRowsLayout2.forEach(row => {
        injectDownloadButtonIntoTableRowLayout2(row);
    });

    // Process release cards
    processReleaseCards();

    // Process track details view (if on track page)
    injectDownloadButtonIntoTrackDetails();

    // Process standalone "Add to cart" buttons
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    addToCartButtons.forEach(button => {
        // Skip buttons that are already processed (inside already processed containers)
        if (button.closest('[data-testid="tracks-list-item"]') || 
            button.closest('[data-testid="tracks-table-row"]') ||
            button.closest('.ReleaseCard-style__Wrapper-sc-1bef577d-11')) {
            return;
        }

        // Try to find a nearby track link to get the track ID
        let trackLink = null;
        let currentElement = button;
        
        // Look up the DOM tree for a container that might have a track link
        for (let i = 0; i < 5; i++) { // Limit the search depth
            currentElement = currentElement.parentElement;
            if (!currentElement) break;
            
            // Try to find a track link in this container
            trackLink = currentElement.querySelector('a[href^="/track/"]');
            if (trackLink) break;
        }

        if (!trackLink) return;
        
        const trackUrl = trackLink.getAttribute('href');
        const trackId = extractTrackId(trackUrl);
        if (!trackId) return;
        
        // Check if we've already processed this button
        const buttonId = `standalone-${trackId}-${Math.random().toString(36).substring(2, 9)}`;
        if (processedTrackIds.has(buttonId)) return;
        
        // Mark as processed
        processedTrackIds.add(buttonId);
        
        // Create a download button
        const downloadButton = createDownloadButton(trackId);
        
        // Replace the "Add to cart" button
        const parentElement = button.parentNode;
        if (parentElement) {
            parentElement.innerHTML = '';
            parentElement.appendChild(downloadButton);
            logDebug(`Replaced standalone "Add to cart" button with download button for track ${trackId}`);
        }
    });
}

/**
 * Add CSS styles
 */
function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .bp-download-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .bp-spinner {
            border: 2px solid #f3f3f3;
            border-top: 2px solid #0097ff;
            border-radius: 50%;
            width: 10px;
            height: 10px;
            animation: bp-spin 1s linear infinite;
        }

        @keyframes bp-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Initialize the extension
 */
function initialize() {
    logDebug('Initializing Beatport Downloader extension');

    // Add styles
    addStyles();

    // Process existing tracks - delayed to allow page to load
    setTimeout(processTrackRows, 2000); // Delayed initial call

    // Set up mutation observer to handle dynamically loaded content
    const observer = new MutationObserver((mutations) => {
        let shouldProcess = false;

        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                shouldProcess = true;
                break;
            }
        }

        if (shouldProcess) {
            processTrackRows();
        }
    });

    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Check service status regularly
    checkServiceStatus();
    setInterval(checkServiceStatus, 30000);

    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'checkServiceStatus') {
            checkServiceStatus();
            sendResponse({received: true});
        }
    });

    logDebug('Initialization complete');
}

// Start the extension
initialize();
