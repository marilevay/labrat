import boto3
from botocore.exceptions import ClientError
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allow requests from your Chrome extension

# Import your educational model
from backend.model import call_model, process_whiteboard_to_code, analyze_experiment_data

@app.route('/api/labrat', methods=['POST'])
def labrat():
    """Main endpoint for educational assistance"""
    try:
        data = request.json
        user_input = data.get('input', '')
        request_type = data.get('type', 'general')
        image_data = data.get('image', None)
        
        # Route to appropriate function based on type
        if request_type == 'whiteboard_conversion':
            result = process_whiteboard_to_code(user_input)
        elif request_type == 'experiment_analysis':
            result = analyze_experiment_data(user_input)
        else:
            result = call_model(user_input, image_data)
            
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "LabRat API"})

if __name__ == '__main__':
    print("API starting...")
    print("Available at: http://localhost:8000")
    app.run(debug=True, port=8000, host='0.0.0.0')