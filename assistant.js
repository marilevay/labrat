class LabRatAssistant {
  constructor() {
    this.apiUrl = 'http://localhost:8000';
    this.canvas = null;
    this.ctx = null;
    this.isDrawing = false;
    this.currentNotebook = null;
    this.init();
  }

  init() {
    console.log('Initializing LabRat Assistant, document ready state:', document.readyState);
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupEventListeners();
      });
    } else {
      // Add a small delay to ensure everything is rendered
      setTimeout(() => this.setupEventListeners(), 100);
    }
  }

  setupEventListeners() {
    
    const drawModeBtn = document.getElementById('draw-mode');
    const uploadModeBtn = document.getElementById('upload-mode');
    const chatModeBtn = document.getElementById('chat-mode');
    
    const drawSection = document.getElementById('drawing-section');
    const uploadSection = document.getElementById('upload-section');
    const chatSection = document.getElementById('chat-section');

    if (drawModeBtn) {
      drawModeBtn.addEventListener('click', () => {
        this.switchMode('draw');
      });
    }
    if (uploadModeBtn) {
      uploadModeBtn.addEventListener('click', () => {
        this.switchMode('upload');
      });
    }
    if (chatModeBtn) {
      chatModeBtn.addEventListener('click', () => {
        this.switchMode('chat');
      });
    }

    // Drawing functionality
    this.setupDrawing();

    // Upload functionality
    this.setupUpload();

    // Chat functionality
    this.setupChat();

    // Other buttons
    const processDrawingBtn = document.getElementById('process-drawing');
    const processUploadBtn = document.getElementById('process-upload');
    const insertToSnowflakeBtn = document.getElementById('insert-to-snowflake');
    const testInjectionBtn = document.getElementById('test-injection');
    const clearCanvasBtn = document.getElementById('clear-canvas');

    if (processDrawingBtn) processDrawingBtn.addEventListener('click', () => this.processDrawing());
    if (processUploadBtn) processUploadBtn.addEventListener('click', () => {
      console.log('Process Upload button clicked');
      this.processUpload();
    });
    if (insertToSnowflakeBtn) insertToSnowflakeBtn.addEventListener('click', () => this.insertToSnowflake());
    if (testInjectionBtn) testInjectionBtn.addEventListener('click', () => this.testInjection());
    if (clearCanvasBtn) clearCanvasBtn.addEventListener('click', () => this.clearCanvas());

    // Header injection controls
    const headerInsertBtn = document.getElementById('header-insert-snowflake');
    const headerTestBtn = document.getElementById('header-test-injection');

    if (headerInsertBtn) headerInsertBtn.addEventListener('click', () => this.insertToSnowflake());
    if (headerTestBtn) headerTestBtn.addEventListener('click', () => this.testInjectionFromHeader());
  }

  switchMode(mode) {
    
    // Clean up any pending resize operations
    this.cleanupResizeHandlers();
    
    // Remove active class from all buttons
    document.querySelectorAll('.mode-toggle button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));

    // Add active class to selected mode
    const modeBtn = document.getElementById(`${mode}-mode`);
    const modeSection = document.getElementById(`${mode}-section`);

    console.log('Found elements for mode:', mode, { modeBtn, modeSection });

    if (modeBtn) {
      modeBtn.classList.add('active');
      console.log('Added active to button:', modeBtn);
    }
    
    if (modeSection) {
      modeSection.classList.add('active');
      console.log('Added active to section:', modeSection);
    } else {
      console.log('Section not found, trying fallback...');
      // Fallback: try querySelector
      const fallbackSection = document.querySelector(`#${mode}-section`);
      console.log('Fallback querySelector result:', fallbackSection);
      if (fallbackSection) {
        fallbackSection.classList.add('active');
        console.log('Fallback successful!');
      }
    }
    
    if (mode === 'draw') {
      setTimeout(() => this.setupDrawing(), 100);
    }
    
    console.log('Mode switch completed');
  }

  cleanupResizeHandlers() {
    // Cancel any pending animation frames
    if (this.resizeAnimationFrame) {
      cancelAnimationFrame(this.resizeAnimationFrame);
      this.resizeAnimationFrame = null;
    }
    
    // Clear any pending timeouts
    if (this.windowResizeTimeout) {
      clearTimeout(this.windowResizeTimeout);
      this.windowResizeTimeout = null;
    }
  }

  setupDrawing() {
    this.canvas = document.getElementById('drawing-canvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    
    // Initial canvas setup
    this.resizeCanvas();
    
    // Set up resize observer to handle width changes
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver((entries) => {
        // Use requestAnimationFrame to avoid ResizeObserver loop
        if (this.resizeAnimationFrame) {
          cancelAnimationFrame(this.resizeAnimationFrame);
        }
        this.resizeAnimationFrame = requestAnimationFrame(() => {
          this.resizeCanvas();
        });
      });
      this.resizeObserver.observe(this.canvas.parentElement);
    }

    // Also handle window resize with debouncing
    this.windowResizeTimeout = null;
    window.addEventListener('resize', () => {
      if (this.windowResizeTimeout) {
        clearTimeout(this.windowResizeTimeout);
      }
      this.windowResizeTimeout = setTimeout(() => {
        this.resizeCanvas();
      }, 100);
    });

    // Drawing event listeners
    this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    this.canvas.addEventListener('mouseup', () => this.stopDrawing());
    this.canvas.addEventListener('mouseout', () => this.stopDrawing());

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', (e) => this.startDrawing(e.touches[0]));
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.draw(e.touches[0]);
    });
    this.canvas.addEventListener('touchend', () => this.stopDrawing());
  }

  resizeCanvas() {
    if (!this.canvas || !this.ctx) return;

    // Get container dimensions
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    const newWidth = Math.floor(rect.width);
    const newHeight = Math.floor(rect.height || 300);
    
    // Ensure valid dimensions
    if (newWidth <= 0 || newHeight <= 0) {
      console.log('Canvas resize: invalid dimensions', { newWidth, newHeight });
      return;
    }
    
    // Only resize if dimensions actually changed
    if (this.canvas.width === newWidth && this.canvas.height === newHeight) {
      return;
    }

    // Save current drawing before resize (only if canvas has valid dimensions)
    let imageData = null;
    if (this.canvas.width > 0 && this.canvas.height > 0) {
      try {
        imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      } catch (e) {
        console.log('Canvas resize: could not save image data:', e.message);
      }
    }
    
    // Set new canvas size
    this.canvas.width = newWidth;
    this.canvas.height = newHeight;
    
    // Handle background and content restoration
    if (imageData) {
      try {
        // First set white background for new canvas size
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Then restore the drawing on top
        this.ctx.putImageData(imageData, 0, 0);
        console.log('🔄 Canvas resized and drawing restored');
      } catch (e) {
        // If putImageData fails, just set white background
        console.log('Canvas resize: could not restore image data:', e.message);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
    } else {
      // No existing image data, so this is initial setup - set white background
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      console.log('Canvas initialized with white background');
    }
    
    // Set drawing properties (without erasing)
    this.initializeCanvas();
  }

  initializeCanvas() {
    if (!this.canvas || !this.ctx) return;
    
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#2c3e50'; // Dark blue-gray
    this.ctx.fillStyle = '#2c3e50';   // Same color for fills
    this.ctx.globalCompositeOperation = 'source-over'; // Ensure normal drawing mode
    
    console.log('Canvas drawing properties set (content preserved)');
  }

  resetCanvasWithBackground() {
    if (!this.canvas || !this.ctx) return;
    
    // Set white background (this erases the canvas)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Set drawing properties
    this.initializeCanvas();
    
    console.log('Canvas reset with white background');
  }

  setupUpload() {
    console.log('Setting up upload functionality');
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');

    if (uploadZone && fileInput) {
      uploadZone.addEventListener('click', () => {
        console.log('Upload zone clicked, opening file picker');
        fileInput.click();
      });
      
      fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        console.log(`Files selected via file picker: ${files.length} files`);
        Array.from(files).forEach((file, index) => {
          console.log(`Selected file ${index + 1}: ${file.name} (${file.type})`);
        });
      });
      
      uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        console.log('Files dragged over upload zone');
        uploadZone.style.borderColor = '#007acc';
      });
      
      uploadZone.addEventListener('dragleave', () => {
        console.log('Files dragged away from upload zone');
        uploadZone.style.borderColor = '';
      });
      
      uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        console.log(`Files dropped on upload zone: ${files.length} files`);
        Array.from(files).forEach((file, index) => {
          console.log(`Dropped file ${index + 1}: ${file.name} (${file.type})`);
        });
        fileInput.files = e.dataTransfer.files;
        uploadZone.style.borderColor = '';
      });
    } else {
      console.error('Upload zone or file input not found in DOM');
    }
  }

  setupChat() {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-message');

    if (chatInput && sendButton) {
      sendButton.addEventListener('click', () => this.sendChatMessage());
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendChatMessage();
        }
      });
    }
  }

  startDrawing(e) {
    console.log('🖊️  Starting to draw');
    this.isDrawing = true;
    
    // Get coordinates and start new path
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX || e.pageX) - rect.left;
    const y = (e.clientY || e.pageY) - rect.top;
    
    console.log('Start coordinates:', x, y);
    console.log('Canvas rect:', rect);
    console.log('Raw event coords:', e.clientX, e.clientY);
    
    // Draw a small circle at start point for debugging
    this.ctx.fillStyle = '#ff0000'; // Red dot
    this.ctx.beginPath();
    this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Start the line
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  draw(e) {
    if (!this.isDrawing || !this.canvas || !this.ctx) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX || e.pageX) - rect.left;
    const y = (e.clientY || e.pageY) - rect.top;

    console.log('Drawing to:', x, y);

    // Set drawing properties every time (in case they get reset)
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#2c3e50'; // Dark blue-gray color for visibility
    this.ctx.globalCompositeOperation = 'source-over'; // Ensure normal drawing mode

    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  stopDrawing() {
    if (!this.isDrawing) return;
    console.log('Stopping drawing');
    this.isDrawing = false;
    // Don't start a new path here - let startDrawing handle it
  }

  clearCanvas() {
    if (this.canvas && this.ctx) {
      // Reset canvas with white background (intentional clearing)
      this.resetCanvasWithBackground();
    }
  }

  isCanvasBlank() {
    if (!this.canvas || !this.ctx) return true;
    
    // Get image data for the entire canvas
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    
    let nonWhitePixels = 0;
    let totalPixels = data.length / 4;
    
    // Check for pixels that are not pure white (255,255,255,255)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];     // Red
      const g = data[i + 1]; // Green  
      const b = data[i + 2]; // Blue
      const a = data[i + 3]; // Alpha
      
      // If pixel is not pure white with full opacity, count it as drawing
      if (!(r === 255 && g === 255 && b === 255 && a === 255)) {
        nonWhitePixels++;
      }
    }
    
    console.log(`Canvas analysis: ${nonWhitePixels} non-white pixels out of ${totalPixels} total pixels`);
    
    // Canvas is blank if less than 10 non-white pixels (accounting for anti-aliasing)
    return nonWhitePixels < 10;
  }

  // Debug method to test canvas capture
  testCanvasCapture() {
    if (!this.canvas || !this.ctx) {
      console.log('Canvas not available');
      return;
    }
    
    console.log('Testing canvas capture...');
    
    // Draw a test line
    this.ctx.strokeStyle = '#ff0000'; // Red for testing
    this.ctx.lineWidth = 5;
    this.ctx.beginPath();
    this.ctx.moveTo(50, 50);
    this.ctx.lineTo(200, 200);
    this.ctx.stroke();
    
    console.log('Test line drawn');
    
    // Capture and log
    const imageData = this.canvas.toDataURL('image/png');
    console.log('📷 Captured image data length:', imageData.length);
    console.log('📷 Image data preview:', imageData.substring(0, 100) + '...');
    
    // Check if blank
    const isBlank = this.isCanvasBlank();
    console.log('Canvas is blank after test:', isBlank);
  }

  async sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    
    if (!chatInput || !chatMessages) return;

    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message to chat
    this.addMessageToChat(message, 'user');
    chatInput.value = '';

    // Send to backend
    try {
      const result = await this.sendToMultimodalAPI({
        type: 'chat',
        context: message,
        prompt: message
      });

      // Add bot response to chat
      const botMessage = result.success ? result.text : `Error: ${result.error}`;
      this.addMessageToChat(botMessage, 'bot');
    } catch (error) {
      this.addMessageToChat(`Error: ${error.message}`, 'bot');
    }
  }

  addMessageToChat(message, sender) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = message;
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async fileToBase64(file) {
    console.log(`Converting file to base64: ${file.name} (${file.type})`);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        console.log(`Successfully converted ${file.name} to base64`);
        resolve(reader.result);
      };
      reader.onerror = (error) => {
        console.error(`Error converting ${file.name} to base64:`, error);
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  }

  // Simulation building methods
  async startSimulationBuilder() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      // Switch to chat mode for interactive simulation building
      this.switchMode('chat');
      
      // Add an initial message to guide the simulation building process
      this.addMessageToChat("Great! Let's build your simulation step by step. What specific aspect of your drawing would you like to simulate first? Think about what changes over time or what you'd like to predict.", 'bot');
    }
  }

  async askFollowUpQuestion() {
    const question = prompt("What specific question do you have about your drawing or the simulation?");
    if (question) {
      try {
        const result = await this.sendToMultimodalAPI({
          type: 'simulation_guidance',
          input: `Student question: ${question}`,
          context: await this.getSnowflakeContext()
        });
        
        // Show result in chat
        this.switchMode('chat');
        this.addMessageToChat(question, 'user');
        this.addMessageToChat(result.success ? result.text : `Error: ${result.error}`, 'bot');
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    }
  }

  async tryInjectToSnowflake(result) {
    // Check if we're running as a browser extension
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.tabs) {
      try {
        // Get the active tab
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        console.log('Active tab URL:', activeTab.url);
        
        // Check if it's a Snowflake page with expanded patterns
        if (activeTab.url && this.isSnowflakeUrl(activeTab.url)) {
          console.log('Snowflake page detected, attempting to connect to content script...');
          
          // Try to connect with retry mechanism
          const response = await this.connectToContentScript(activeTab.id, { type: 'GET_ACTIVE_CELL' });
          
          if (response && response.hasActiveCell) {
            console.log('Active cell found, showing injection options');
            this.showSnowflakeInjectionOptions(result, activeTab.id);
          } else if (response === null) {
            this.addMessageToChat("Warning: Snowflake page detected but content script not loaded. Please:", 'bot');
            this.addMessageToChat("1. Refresh the Snowflake page", 'bot');
            this.addMessageToChat("2. Make sure the extension is enabled", 'bot');
            this.addMessageToChat("3. Try again", 'bot');
          } else {
            this.addMessageToChat("Snowflake detected! Please select a Python cell in your notebook to inject code.", 'bot');
          }
        } else {
          console.log('Not a Snowflake page:', activeTab.url);
        }
      } catch (error) {
        console.log('Error in Snowflake injection:', error);
      }
    }
  }

  isSnowflakeUrl(url) {
    const snowflakePatterns = [
      'snowflakecomputing.com',
      'snowflake.com',
      'privatelink.snowflakecomputing.com'
    ];
    return snowflakePatterns.some(pattern => url.includes(pattern));
  }

  async connectToContentScript(tabId, message, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting to connect to content script (attempt ${attempt}/${maxRetries})`);
        
        const response = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Connection timeout'));
          }, 2000); // 2 second timeout
          
          chrome.tabs.sendMessage(tabId, message, (response) => {
            clearTimeout(timeoutId);
            if (chrome.runtime.lastError) {
              console.log('Chrome runtime error:', chrome.runtime.lastError.message);
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
        
        console.log('Content script connected successfully:', response);
        return response;
        
      } catch (error) {
        console.log(`Connection attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          console.log('All connection attempts failed');
          return null;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return null;
  }

  showSnowflakeInjectionOptions(result, tabId) {
    // Show injection options in the results section
    const resultsSection = document.getElementById('results-section');
    
    const injectionOptions = document.createElement('div');
    injectionOptions.className = 'snowflake-injection-options';
    injectionOptions.innerHTML = `
      <div style="background: #e8f4fd; border: 1px solid #007acc; padding: 15px; border-radius: 8px; margin-top: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #007acc;">Snowflake Integration Detected</h4>
        <p style="margin: 0 0 15px 0;">Ready to inject generated code into your active Snowflake notebook cell.</p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          ${result.notebook_cells.map((cell, index) => `
            <button class="inject-cell-btn" data-cell-index="${index}" style="
              background: #007acc;
              color: white;
              border: none;
              padding: 8px 12px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            ">
              Inject Cell ${index + 1}: ${cell.description}
            </button>
          `).join('')}
          <button id="inject-all-btn" style="
            background: #28a745;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">
            Inject All Cells
          </button>
        </div>
      </div>
    `;
    
    resultsSection.appendChild(injectionOptions);
    
    // Add event listeners for injection buttons
    injectionOptions.querySelectorAll('.inject-cell-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cellIndex = parseInt(btn.dataset.cellIndex);
        await this.injectCellToSnowflake(result.notebook_cells[cellIndex], result.text, tabId);
      });
    });
    
    document.getElementById('inject-all-btn').addEventListener('click', async () => {
      await this.injectAllCellsToSnowflake(result.notebook_cells, result.text, tabId);
    });
  }

  async injectCellToSnowflake(cell, reasoning, tabId) {
    try {
      const response = await this.connectToContentScript(tabId, {
        type: 'INJECT_CODE',
        code: cell.code,
        reasoning: reasoning
      });
      
      if (response && response.success) {
        this.addMessageToChat(`Code injected into Snowflake: ${cell.description}`, 'bot');
      } else {
        throw new Error(response?.error || 'Injection failed');
      }
      
    } catch (error) {
      console.error('Injection failed:', error);
      this.addMessageToChat(`Failed to inject code: ${error.message}`, 'bot');
      this.addMessageToChat(`Try refreshing the Snowflake page and ensure a Python cell is selected.`, 'bot');
    }
  }

  async injectAllCellsToSnowflake(cells, reasoning, tabId) {
    // Combine all cells into one code block
    const combinedCode = cells.map((cell, index) => 
      `# Cell ${index + 1}: ${cell.description}\n${cell.code}\n`
    ).join('\n');
    
    try {
      const response = await this.connectToContentScript(tabId, {
        type: 'INJECT_CODE',
        code: combinedCode,
        reasoning: reasoning
      });
      
      if (response && response.success) {
        this.addMessageToChat(`All ${cells.length} cells injected into Snowflake successfully!`, 'bot');
      } else {
        throw new Error(response?.error || 'Injection failed');
      }
      
    } catch (error) {
      console.error('Injection failed:', error);
      this.addMessageToChat(`Failed to inject code: ${error.message}`, 'bot');
      this.addMessageToChat(`Try refreshing the Snowflake page and ensure a Python cell is selected.`, 'bot');
    }
  }

  async generateCodeTemplate() {
    try {
      const result = await this.sendToMultimodalAPI({
        type: 'simulation_guidance',
        input: 'Please provide a Python code template structure for building a simulation based on the mathematical relationships we identified.',
        context: await this.getSnowflakeContext()
      });
      
      const generatedCode = document.getElementById('generated-code');
      if (generatedCode) {
        generatedCode.innerHTML = `
          <h4>Simulation Code Template</h4>
          <pre>${result.success ? result.text : `Error: ${result.error}`}</pre>
          <button onclick="labRatAssistant.copyToClipboard('${result.text}')" class="copy-btn">
            Copy Template
          </button>
        `;
      }
    } catch (error) {
      alert(`Error generating template: ${error.message}`);
    }
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Code template copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }

  async sendToMultimodalAPI(data) {
    try {
      console.log('Sending request to API:', {
        type: data.type,
        vision_model: data.vision_model,
        hasImage: !!data.image,
        imagePreview: data.image ? data.image.substring(0, 50) + '...' : 'none'
      });
      
      // Call your local Bedrock backend
      const response = await fetch(`${this.apiUrl}/api/labrat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: data.type,
          input: data.context || data.prompt,
          image: data.image,
          vision_model: data.vision_model,
          include_reasoning: data.include_reasoning !== false,
          verbose: data.verbose !== false
        })
      });

      if (!response.ok) {
        console.error('API Response not OK:', response.status, response.statusText);
        throw new Error(`HTTP error status: ${response.status}`);
      }

      const result = await response.json();
      console.log('API Response received:', {
        success: result.success,
        hasText: !!result.text,
        hasError: !!result.error,
        textPreview: result.text ? result.text.substring(0, 100) + '...' : 'none'
      });
      return result;

    } catch (error) {
      console.error('API Error:', error);
      return { error: 'Processing failed: ' + error.message };
    }
  }

  async processDrawing() {
    
    if (!this.canvas) {
      console.error('Canvas not found');
      return;
    }

    // Show processing indicator
    this.showProcessingIndicator("Analyzing drawing with vision model...");

    const imageData = this.canvas.toDataURL('image/png');
    console.log('Canvas image data captured:', imageData.substring(0, 100) + '...');
    console.log('Canvas dimensions:', this.canvas.width, 'x', this.canvas.height);
    
    // Check if canvas is blank
    const isBlank = this.isCanvasBlank();
    console.log('Canvas is blank:', isBlank);
    
    if (isBlank) {
      this.hideProcessingIndicator();
      this.showMessage('Please draw something on the canvas first!', 'error');
      return;
    }
    
    try {
      const visionModel = 'claude';
      
      const result = await this.sendToMultimodalAPI({
        type: 'drawing_analysis',
        image: imageData,
        timestamp: Date.now(),
        vision_model: visionModel,
        context: await this.getSnowflakeContext()
      });

      this.hideProcessingIndicator();
      
      if (result.success) {
        // Display the detailed analysis
        this.displayAnalysisResults(result);
        
        // Show notebook creation option if cells were generated
        if (result.notebook_cells && result.notebook_cells.length > 0) {
          this.showNotebookCreationOptions(result);
          
          // Try to inject into Snowflake if we're in the extension context
          this.tryInjectToSnowflake(result);
        }
        
        // Add to chat for further interaction
        this.addMessageToChat("Drawing Analysis Complete!", 'bot');
        this.addMessageToChat(result.text, 'bot');
        
      } else {
        this.displayResults([{error: result.error}]);
      }
      
    } catch (error) {
      this.hideProcessingIndicator();
      console.error('Drawing analysis error:', error);
      this.displayResults([{error: error.message}]);
    }
  }

  showProcessingIndicator(message) {
    const resultsSection = document.getElementById('results-section');
    resultsSection.innerHTML = `
      <div class="processing-indicator" style="text-align: center; padding: 20px;">
        <div style="margin-bottom: 10px; font-size: 24px;">Processing...</div>
        <p>${message}</p>
      </div>
    `;
    resultsSection.style.display = 'block';
  }

  hideProcessingIndicator() {
    const processingIndicator = document.querySelector('.processing-indicator');
    if (processingIndicator) {
      processingIndicator.remove();
    }
  }

  displayAnalysisResults(result) {
    const resultsSection = document.getElementById('results-section');
    const generatedCode = document.getElementById('generated-code');
    
    // Format the analysis with proper structure
    const formattedAnalysis = this.formatAnalysisResponse(result.text);
    
    generatedCode.innerHTML = formattedAnalysis;
    resultsSection.style.display = 'block';
  }

  formatAnalysisResponse(text) {
    // Convert markdown-like formatting to HTML
    return text
      .replace(/## (.*?)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/```python\n([\s\S]*?)\n```/g, '<pre class="code-block"><code>$1</code></pre>')
      .replace(/```sql\n([\s\S]*?)\n```/g, '<pre class="code-block"><code>$1</code></pre>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.*)$/gm, '<p>$1</p>')
      .replace(/<p><h3>/g, '<h3>')
      .replace(/<\/h3><\/p>/g, '</h3>');
  }

  showNotebookCreationOptions(result) {
    const resultsSection = document.getElementById('results-section');
    
    const notebookOptions = document.createElement('div');
    notebookOptions.className = 'notebook-options';
    notebookOptions.innerHTML = `
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px;">
        <h4>Notebook Creation</h4>
        <p>Generated ${result.notebook_cells.length} code cells for Snowflake analysis</p>
        <div style="margin-top: 10px;">
          <button id="create-notebook-btn" style="background: #007acc; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">
            Create Notebook
          </button>
          <button id="preview-cells-btn" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
            Preview Cells
          </button>
        </div>
      </div>
    `;
    
    resultsSection.appendChild(notebookOptions);
    
    // Add event listeners
    document.getElementById('create-notebook-btn').addEventListener('click', () => {
      this.createNotebook(result);
    });
    
    document.getElementById('preview-cells-btn').addEventListener('click', () => {
      this.previewNotebookCells(result.notebook_cells);
    });
  }

  async createNotebook(result) {
    try {
      const notebookName = `Drawing_Analysis_${new Date().toISOString().slice(0, 10)}`;
      
      const response = await fetch(`${this.apiUrl}/api/create-notebook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cells: result.notebook_cells,
          name: notebookName
        })
      });

      const notebookResult = await response.json();
      
      if (notebookResult.success) {
        this.displayNotebook(notebookResult.notebook);
        this.addMessageToChat(`Notebook "${notebookName}" created successfully!`, 'bot');
      } else {
        this.addMessageToChat(`Error creating notebook: ${notebookResult.error}`, 'bot');
      }
      
    } catch (error) {
      console.error('Notebook creation error:', error);
      this.addMessageToChat(`Error creating notebook: ${error.message}`, 'bot');
    }
  }

  previewNotebookCells(cells) {
    const preview = cells.map((cell, i) => 
      `**Cell ${i + 1}:** ${cell.description}\n\`\`\`python\n${cell.code}\n\`\`\``
    ).join('\n\n');
    
    this.addMessageToChat("**Notebook Cell Preview:**", 'bot');
    this.addMessageToChat(preview, 'bot');
  }

  displayNotebook(notebook) {
    // Create a new section to show the notebook structure
    const resultsSection = document.getElementById('results-section');
    
    const notebookDisplay = document.createElement('div');
    notebookDisplay.className = 'notebook-display';
    notebookDisplay.innerHTML = `
      <div style="background: #ffffff; border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-top: 20px;">
        <h3>${notebook.name}</h3>
        <p>${notebook.description}</p>
        <div class="notebook-cells">
          ${notebook.cells.map((cell, i) => this.renderNotebookCell(cell, i)).join('')}
        </div>
        <div style="margin-top: 20px;">
          <button onclick="this.downloadNotebook('${notebook.name}')" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
            Download Notebook
          </button>
        </div>
      </div>
    `;
    
    resultsSection.appendChild(notebookDisplay);
  }

  renderNotebookCell(cell, index) {
    if (cell.cell_type === 'markdown') {
      return `
        <div class="notebook-cell markdown-cell" style="border-left: 4px solid #007acc; padding: 10px; margin: 10px 0; background: #f8f9fa;">
          <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Cell ${index + 1} (Markdown)</div>
          <div>${cell.content.replace(/\n/g, '<br>')}</div>
        </div>
      `;
    } else {
      return `
        <div class="notebook-cell code-cell" style="border-left: 4px solid #28a745; padding: 10px; margin: 10px 0; background: #f8f9fa;">
          <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Cell ${index + 1} (Code) - ${cell.description}</div>
          <pre style="background: #ffffff; padding: 10px; border-radius: 4px; overflow-x: auto;"><code>${cell.code}</code></pre>
        </div>
      `;
    }
  }

  displaySimulationGuidance(analysisResult, simulationResult) {
    const generatedCode = document.getElementById('generated-code');
    const equations = document.getElementById('equations');
    
    if (generatedCode && equations) {
      // Display the mathematical analysis
      equations.innerHTML = `
        <h4>Drawing Analysis</h4>
        <p>${analysisResult.text}</p>
        <hr style="border-color: var(--border); margin: 16px 0;">
        <h4>Simulation Guidance</h4>
        <p>${simulationResult.success ? simulationResult.text : simulationResult.error}</p>
      `;
      
      // Display suggested next steps
      generatedCode.innerHTML = `
<div class="simulation-steps">
  <h4>Next Steps for Building Your Simulation:</h4>
  <div class="step-buttons">
    <button onclick="labRatAssistant.startSimulationBuilder()" class="step-btn">
      Start Building Simulation
    </button>
    <button onclick="labRatAssistant.askFollowUpQuestion()" class="step-btn">
      Ask Follow-up Questions
    </button>
    <button onclick="labRatAssistant.generateCodeTemplate()" class="step-btn">
      Generate Code Template
    </button>
  </div>
</div>`;
    }
    
    const resultsSection = document.getElementById('results-section');
    if (resultsSection) {
      resultsSection.classList.add('show');
    }
  }

  async processUpload() {
    console.log('Starting upload process...');
    const fileInput = document.getElementById('file-input');
    const files = fileInput.files;
    
    console.log(`Found ${files.length} files selected for upload`);
    
    if (files.length === 0) {
      console.log('No files selected, showing alert');
      alert('Please select files to upload');
      return;
    }

    // Log details about each file
    Array.from(files).forEach((file, index) => {
      console.log(`File ${index + 1}: ${file.name} (${file.type}, ${file.size} bytes)`);
    });

    console.log('Converting files to base64...');
    const filePromises = Array.from(files).map(async (file, index) => {
      console.log(`Converting file ${index + 1}: ${file.name}`);
      const base64 = await this.fileToBase64(file);
      console.log(`File ${index + 1} converted, base64 length: ${base64.length}`);
      return {
        data: base64,
        type: file.type,
        name: file.name
      };
    });

    const fileData = await Promise.all(filePromises);
    console.log('All files converted to base64, preparing upload request');

    try {
      console.log(`Sending upload request to ${this.apiUrl}/api/upload`);
      const response = await fetch(`${this.apiUrl}/api/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: fileData })
      });

      console.log(`Upload response status: ${response.status}`);
      const result = await response.json();
      console.log('Upload response received:', result);

      if (result.success) {
        console.log(`Upload successful! Processing ${result.results.length} results`);
        this.displayResults(result.results);
        
        result.results.forEach((fileResult, index) => {
          const fileName = fileResult.filename || `File ${index + 1}`;
          console.log(`Processing result ${index + 1}: ${fileName}`);
          console.log(`File result has notebook_cells:`, !!fileResult.notebook_cells);
          if (fileResult.notebook_cells) {
            console.log(`Number of notebook cells: ${fileResult.notebook_cells.length}`);
          }
          
          this.addMessageToChat(`Processed ${fileName}:`, 'bot');
          this.addMessageToChat(fileResult.text || fileResult.error, 'bot');
          
          // For image files, try to inject into Snowflake if notebook cells were generated
          if (fileResult.notebook_cells && fileResult.notebook_cells.length > 0) {
            console.log(`Showing notebook creation options for ${fileName}`);
            this.showNotebookCreationOptions(fileResult);
            console.log(`Attempting Snowflake injection for ${fileName}`);
            this.tryInjectToSnowflake(fileResult);
          } else {
            console.log(`No notebook cells generated for ${fileName}, skipping Snowflake injection`);
          }
        });
      } else {
        console.log('Upload failed:', result.error);
        this.displayResults([{error: result.error}]);
      }
    } catch (error) {
      console.error('Upload error:', error);
      this.displayResults([{error: error.message}]);
    }
  }

  displayResults(result) {
    const resultsSection = document.getElementById('results-section');
    const generatedCode = document.getElementById('generated-code');
    const equations = document.getElementById('equations');

    if (result.success) {
      generatedCode.textContent = result.text;
      equations.innerHTML = `<p>${result.text}</p>`;
      resultsSection.style.display = 'block';
    } else {
      generatedCode.textContent = `Error: ${result.error}`;
      resultsSection.style.display = 'block';
    }
  }

  async getSnowflakeContext() {
    // Get current Snowflake notebook context
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        resolve('No extension context available');
        return;
      }
      
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (!tabs || !tabs[0]) {
          resolve('No active tab available');
          return;
        }
        
        chrome.tabs.sendMessage(tabs[0].id, {action: 'getContext'}, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Context request failed:', chrome.runtime.lastError.message);
            resolve('No Snowflake context available');
          } else {
            resolve(response || 'No Snowflake context available');
          }
        });
      });
    });
  }

  async insertToSnowflake(code) {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      console.log('No extension context available');
      return;
    }
    
    // Get the code to inject - either from parameter or from the generated code display
    let codeToInject = code;
    if (!codeToInject) {
      const generatedCodeElement = document.getElementById('generated-code');
      if (generatedCodeElement && generatedCodeElement.textContent.trim()) {
        codeToInject = generatedCodeElement.textContent.trim();
      } else {
        console.log('No code available to inject');
        this.showMessage('No code available to inject. Please generate code first.', 'error');
        return;
      }
    }
    
    console.log('LabRat: Injecting code to Snowflake:', codeToInject);
    
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (!tabs || !tabs[0]) {
        console.log('No active tab available');
        this.showMessage('No active Snowflake tab found', 'error');
        return;
      }
      
      // Check if it's a Snowflake tab
      if (!tabs[0].url.includes('snowflake')) {
        this.showMessage('Please switch to a Snowflake tab first', 'error');
        return;
      }
      
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'insertCode',
        code: codeToInject
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Insert failed:', chrome.runtime.lastError.message);
          this.showMessage('Failed to inject code: ' + chrome.runtime.lastError.message, 'error');
        } else if (response) {
          if (response.success) {
            this.showMessage('✅ Code successfully injected into Snowflake!', 'success');
          } else {
            this.showMessage('❌ Injection failed: ' + response.message, 'error');
          }
        }
      });
    });
  }

  async testInjection() {
    console.log('Testing Snowflake code injection...');
    const statusElement = document.getElementById('injection-status');
    
    // Show loading status
    if (statusElement) {
      statusElement.textContent = 'Preparing test code...';
      statusElement.className = 'status-message info';
    }
    
    try {
      // Get test code from backend
      const response = await fetch(`${this.apiUrl}/api/test-injection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const result = await response.json();
      
      if (result.success && result.code) {
        if (statusElement) {
          statusElement.textContent = 'Test code ready! Attempting injection...';
          statusElement.className = 'status-message info';
        }
        
        // Use the existing insertToSnowflake method with the test code
        await this.insertToSnowflake(result.code);
        
        if (statusElement) {
          statusElement.textContent = '✅ Test injection completed! Check your Snowflake notebook.';
          statusElement.className = 'status-message success';
        }
      } else {
        throw new Error(result.error || 'Failed to get test code');
      }
    } catch (error) {
      console.error('Test injection failed:', error);
      if (statusElement) {
        statusElement.textContent = `❌ Test injection failed: ${error.message}`;
        statusElement.className = 'status-message error';
      }
    }
  }

  async testInjectionFromHeader() {
    console.log('Testing Snowflake code injection from header...');
    const statusElement = document.getElementById('header-injection-status');
    
    // Show loading status
    if (statusElement) {
      statusElement.textContent = 'Preparing test code...';
      statusElement.className = 'status-message info';
    }
    
    try {
      // Get test code from backend
      const response = await fetch(`${this.apiUrl}/api/test-injection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const result = await response.json();
      
      if (result.success && result.code) {
        if (statusElement) {
          statusElement.textContent = 'Test code ready! Attempting injection...';
          statusElement.className = 'status-message info';
        }
        
        // Use the existing insertToSnowflake method with the test code
        await this.insertToSnowflake(result.code);
        
        if (statusElement) {
          statusElement.textContent = '✅ Test injection completed!';
          statusElement.className = 'status-message success';
        }
      } else {
        throw new Error(result.error || 'Failed to get test code');
      }
    } catch (error) {
      console.error('Test injection failed:', error);
      if (statusElement) {
        statusElement.textContent = `❌ Test injection failed: ${error.message}`;
        statusElement.className = 'status-message error';
      }
    }
  }

  // Helper method to show messages in the side panel
  showMessage(message, type = 'info') {
    // Create a temporary message element
    const messageDiv = document.createElement('div');
    messageDiv.innerHTML = message;
    messageDiv.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      right: 10px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      padding: 10px;
      border-radius: 4px;
      z-index: 1000;
      font-size: 12px;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      messageDiv.remove();
    }, 4000);
  }


}

// Initialize the LabRat Assistant
console.log('Starting LabRat Assistant initialization...');
const labRatAssistant = new LabRatAssistant();

// Make it globally accessible for debugging
window.labRatAssistant = labRatAssistant;

console.log('LabRat Assistant loaded successfully.');
