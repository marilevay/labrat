// LabRat Snowflake Code Injector
console.log('LabRat Snowflake code injector loaded');

// Function to inject code into Snowflake notebook cells
function injectCodeToSnowflake(code) {
    console.log('Attempting to inject code:', code);
    
    // Look for the specific cell with the placeholder text
    const targetCell = document.querySelector('.cm-activeLine.cm-line .cm-placeholder[aria-hidden="true"]');
    
    if (targetCell && targetCell.textContent.includes('Start writing in Python...')) {
        console.log('Found target cell with placeholder text');
        
        // Get the parent editable element
        const editableParent = targetCell.closest('.cm-activeLine.cm-line');
        
        if (editableParent) {
            try {
                // Inject the provided code
                editableParent.innerHTML = `<span class="cm-text">${code}</span>`;
                console.log('✅ Successfully injected code from LabRat');
                
                // Trigger events to notify the editor
                editableParent.dispatchEvent(new Event('input', { bubbles: true }));
                editableParent.dispatchEvent(new Event('change', { bubbles: true }));
                
                return { success: true, message: 'Code injected successfully' };
            } catch (error) {
                console.error('❌ Failed to inject code:', error);
                return { success: false, message: error.message };
            }
        }
    } else {
        console.log('Target cell not found - looking for alternatives...');
        return tryAlternativeInjection(code);
    }
}

// Alternative injection methods for different cell states
function tryAlternativeInjection(code) {
    // Try to find any active/focused cell
    const activeCells = document.querySelectorAll('.cm-activeLine, .cm-focused, .cm-editor.cm-focused');
    
    for (let cell of activeCells) {
        try {
            // Try different approaches
            const contentArea = cell.querySelector('.cm-content') || cell;
            contentArea.innerHTML = `<div class="cm-line"><span class="cm-text">${code}</span></div>`;
            
            contentArea.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('✅ Injected via alternative method');
            return { success: true, message: 'Code injected via alternative method' };
        } catch (error) {
            continue;
        }
    }
    
    return { success: false, message: 'No suitable injection target found' };
}

// Test function for manual testing
function runInjectionTest() {
    console.log('Running manual injection test...');
    const testCode = 'print("Hello from LabRat test!")';
    return injectCodeToSnowflake(testCode);
}

// Function to run the test
function runInjectionTest() {
    console.log('Running injection test...');
    
    // Wait a moment for the page to load
    setTimeout(() => {
        const success = injectTestCode();
        if (success) {
            console.log('Test successful: Code injected into Snowflake cell');
        } else {
            console.log('Test failed: Could not inject code');
            
            // Debug: Log available cells
            const allCells = document.querySelectorAll('.cm-line');
            console.log(`Found ${allCells.length} cells in total`);
            
            const placeholderCells = document.querySelectorAll('.cm-placeholder');
            console.log(`Found ${placeholderCells.length} placeholder cells`);
            
            placeholderCells.forEach((cell, index) => {
                console.log(`Placeholder ${index}:`, cell.textContent);
            });
        }
    }, 2000);
}

// Listen for messages from the LabRat extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('LabRat injector received message:', request);
    
    if (request.action === 'insertCode' && request.code) {
        const result = injectCodeToSnowflake(request.code);
        sendResponse(result);
        
        // Show a brief success notification
        if (result.success) {
            showNotification('Code injected from LabRat', 'success');
        } else {
            showNotification('Injection failed: ' + result.message, 'error');
        }
    }
    
    return true; // Keep the message channel open for async response
});

// Show notification to user
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.innerHTML = message;
    notification.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        z-index: 10000;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 12px 16px;
        border-radius: 4px;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation keyframes
    if (!document.getElementById('labrat-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'labrat-notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}



// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('LabRat Snowflake injector ready');
    });
} else {
    console.log('LabRat Snowflake injector ready');
}

// Expose functions globally for debugging
window.labRatInjector = {
    injectCode: injectCodeToSnowflake,
    runTest: runInjectionTest
};
