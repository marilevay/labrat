class LabRatAssistant {
  constructor() {
    this.apiUrl = 'http://localhost:8000';
  }

  async sendToMultimodalAPI(data) {
    try {
      // Call your local Bedrock backend
      const response = await fetch(`${this.apiUrl}/api/educate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: data.type,
          input: data.context || data.prompt,
          image: data.image
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error status: ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('API Error:', error);
      return { error: 'Processing failed: ' + error.message };
    }
  }

  async processDrawing() {
    // Convert canvas to image
    const imageData = this.canvas.toDataURL('image/png');
    
    // Send to your Bedrock backend
    const result = await this.sendToMultimodalAPI({
      type: 'whiteboard_conversion',
      image: imageData,
      context: await this.getSnowflakeContext()
    });

    this.displayResults(result);
  }

  async processUpload() {
    const files = document.getElementById('file-input').files;
    const results = [];

    for (let file of files) {
      const base64 = await this.fileToBase64(file);
      const result = await this.sendToMultimodalAPI({
        type: 'experiment_analysis',
        image: base64,
        context: await this.getSnowflakeContext()
      });
      results.push(result);
    }

    this.displayResults(results);
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
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'getContext'}, (response) => {
          resolve(response || 'No Snowflake context available');
        });
      });
    });
  }

  async insertToSnowflake(code) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'insertCode',
        code: code
      });
    });
  }
}

async function testBackendConnection() {
  try {
    const response = await fetch('http://localhost:8000/api/health');
    const result = await response.json();
    console.log('Backend connected:', result);
    
    // Test educational model
    const eduResponse = await fetch('http://localhost:8000/api/educate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'general',
        input: 'Help me understand y = mx + b'
      })
    });
    
    const eduResult = await eduResponse.json();
    console.log('Educational model response:', eduResult);
    
  } catch (error) {
    console.error('Backend connection failed:', error);
  }
}

testBackendConnection();