// Enable side panel on extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Open side panel for the current tab
    await chrome.sidePanel.open({ tabId: tab.id });
    console.log('LabRat side panel opened');
  } catch (error) {
    console.error('Error opening side panel:', error);
  }
});

// Optional: Auto-enable side panel on Snowflake pages
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if we're on a Snowflake page
    if (tab.url.includes('snowflake.com') || tab.url.includes('snowflakecomputing.com')) {
      try {
        // Enable side panel for this tab
        await chrome.sidePanel.setOptions({
          tabId: tabId,
          path: 'main.html',
          enabled: true
        });
        console.log('LabRat side panel enabled for Snowflake page');
      } catch (error) {
        console.error('Error enabling side panel:', error);
      }
    }
  }
});

// Optional: Set up context menu for easy access
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'openLabRat',
    title: 'Open LabRat Assistant',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'openLabRat') {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (error) {
      console.error('Error opening side panel from context menu:', error);
    }
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openSidePanel') {
    chrome.sidePanel.open({ tabId: sender.tab.id });
  }
});