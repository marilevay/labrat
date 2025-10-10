import boto3
from botocore.exceptions import ClientError
import json
import base64
import io
from flask import Flask, request, jsonify
from flask_cors import CORS
from PyPDF2 import PdfReader
from docx import Document
from PIL import Image

app = Flask(__name__)
CORS(app)  # Allow requests from your Chrome extension

# Import your educational model
from model import call_model, process_whiteboard_to_code, analyze_experiment_data, guide_simulation_building, extract_math_from_drawing, create_snowflake_notebook, analyze_with_landingai, analyze_drawing_with_reasoning, analyze_with_writer_vision, print_analysis_header, log_reasoning_step

@app.route('/api/labrat', methods=['POST'])
def labrat():
    """Main endpoint for educational assistance"""
    try:
        data = request.json
        user_input = data.get('input', '')
        request_type = data.get('type', 'general')
        image_data = data.get('image', None)
        vision_model = data.get('vision_model', 'claude')  # Default to Claude
        
        # Route to appropriate function based on type
        if request_type == 'whiteboard_conversion':
            result = process_whiteboard_to_code(user_input)
        elif request_type == 'experiment_analysis':
            result = analyze_experiment_data(user_input)
        elif request_type == 'simulation_guidance':
            student_context = data.get('context', '')
            result = guide_simulation_building(user_input, student_context)
        elif request_type == 'drawing_analysis':
            # Print analysis header
            print_analysis_header("Drawing Analysis with Reasoning")
            
            # Choose vision model based on request
            if vision_model == 'landingai':
                result = analyze_with_landingai(image_data)
            elif vision_model == 'writer':
                # Use WRITER's vision model
                include_reasoning = data.get('include_reasoning', True)
                verbose = data.get('verbose', True)
                result = analyze_with_writer_vision(image_data, include_reasoning, verbose)
            else:
                # Default to Claude Bedrock
                include_reasoning = data.get('include_reasoning', True)
                verbose = data.get('verbose', True)
                result = extract_math_from_drawing(image_data, include_reasoning, verbose)
            
            # Create notebook if analysis was successful
            if result.get('success') and result.get('notebook_cells'):
                log_reasoning_step("Notebook Creation", f"Creating notebook with {len(result['notebook_cells'])} code cells")
                notebook = create_snowflake_notebook(
                    result['notebook_cells'], 
                    f"Drawing_Analysis_{data.get('timestamp', 'latest')}"
                )
                result['notebook'] = notebook
        
        elif request_type == 'detailed_reasoning':
            # New endpoint for detailed reasoning analysis
            print_analysis_header("Detailed Reasoning Analysis")
            verbose = data.get('verbose', True)
            result = analyze_drawing_with_reasoning(image_data, verbose)
                
        else:
            result = call_model(user_input, image_data)
            
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def process_uploaded_file(file_data, file_type):
    """Process different types of uploaded files"""
    try:
        # Decode base64 file data
        if file_data.startswith('data:'):
            file_data = file_data.split(',')[1]
        
        decoded_data = base64.b64decode(file_data)
        
        if file_type.startswith('image/'):
            # Image processing - already handled by extract_math_from_drawing
            return extract_math_from_drawing(file_data)
            
        elif file_type == 'application/pdf':
            # PDF processing
            pdf_stream = io.BytesIO(decoded_data)
            reader = PdfReader(pdf_stream)
            
            text_content = ""
            for page in reader.pages:
                text_content += page.extract_text() + "\n"
            
            return analyze_experiment_data(f"PDF content: {text_content}")
            
        elif file_type in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']:
            # Word document processing
            doc_stream = io.BytesIO(decoded_data)
            doc = Document(doc_stream)
            
            text_content = ""
            for paragraph in doc.paragraphs:
                text_content += paragraph.text + "\n"
            
            return analyze_experiment_data(f"Document content: {text_content}")
            
        elif file_type.startswith('text/'):
            # Text file processing
            text_content = decoded_data.decode('utf-8')
            return analyze_experiment_data(f"Text file content: {text_content}")
            
        else:
            return {"error": f"Unsupported file type: {file_type}"}
            
    except Exception as e:
        return {"error": f"Error processing file: {str(e)}"}

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file uploads with multimodal processing"""
    try:
        data = request.json
        files = data.get('files', [])
        results = []
        
        for file_info in files:
            file_data = file_info.get('data')
            file_type = file_info.get('type')
            file_name = file_info.get('name', 'unknown')
            
            result = process_uploaded_file(file_data, file_type)
            result['filename'] = file_name
            results.append(result)
        
        return jsonify({"success": True, "results": results})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analyze-reasoning', methods=['POST'])
def analyze_reasoning():
    """Dedicated endpoint for detailed reasoning analysis of drawings"""
    try:
        data = request.json
        image_data = data.get('image', None)
        verbose = data.get('verbose', True)
        
        if not image_data:
            return jsonify({"error": "No image data provided"}), 400
        
        print_analysis_header("Dedicated Reasoning Analysis")
        log_reasoning_step("Request Received", "Starting detailed reasoning analysis")
        
        # Perform detailed reasoning analysis
        result = analyze_drawing_with_reasoning(image_data, verbose)
        
        if result.get('success'):
            log_reasoning_step("Analysis Complete", f"Feasibility: {result.get('feasibility_score', 'N/A')}/10, Confidence: {result.get('confidence_score', 'N/A')}/10")
        
        return jsonify(result)
        
    except Exception as e:
        log_reasoning_step("Error", str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/api/create-notebook', methods=['POST'])
def create_notebook():
    """Create a Jupyter notebook from analysis results"""
    try:
        data = request.json
        cells = data.get('cells', [])
        notebook_name = data.get('name', 'LabRat_Analysis')
        
        notebook = create_snowflake_notebook(cells, notebook_name)
        
        return jsonify({
            "success": True,
            "notebook": notebook,
            "message": f"Notebook '{notebook_name}' created successfully"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/test-injection', methods=['POST'])
def test_injection():
    """Test endpoint for Snowflake code injection functionality"""
    try:
        # Sample Python code to inject for testing
        test_code = """import math

        # --- Physics setup ---
        g = 9.8           # gravity (m/s^2)
        L = 1.0           # length of pendulum (m)
        theta = math.radians(20)  # initial angle (20 degrees)
        omega = 0.0       # angular velocity (rad/s)
        dt = 0.1          # time step (s)

        # --- Simulation loop ---
        for t in range(30):  # 30 steps
            # Equation of motion (small angle): θ'' = -(g/L) * θ
            alpha = -(g/L) * theta     # angular acceleration
            omega += alpha * dt        # update angular velocity
            theta += omega * dt        # update angle
            
            # Convert angle to degrees for easier understanding
            print(f"Time={t*dt:.1f}s | Angle={math.degrees(theta):.2f}° | Angular velocity={omega:.2f} rad/s")

        # --- TODOs for you ---
        # 1. Change L (length) and see how oscillation speed changes.
        # 2. Change the initial angle (theta) and observe motion.
        # 3. Try smaller dt (e.g. 0.01) for smoother results.
        # 4. Extend: add damping (like air resistance): alpha = -(g/L)*theta - b*omega
        """
        
        return jsonify({
            "success": True,
            "code": test_code,
            "message": "Test code ready for injection",
            "timestamp": "2025-09-26",
            "status": "ready"
        })
        
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "LabRat API"})

if __name__ == '__main__':
    print("API starting...")
    print("Available at: http://localhost:8000")
    app.run(debug=True, port=8000, host='0.0.0.0')