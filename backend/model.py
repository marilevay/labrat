import boto3
from botocore.exceptions import ClientError
import json
import logging
from datetime import datetime
import base64
import io
from PIL import Image

# Create a Bedrock Runtime client in the AWS Region you want to use.
client = boto3.client("bedrock-runtime", region_name="us-west-2")

# Set the model ID, e.g., Claude 3 Haiku.
model_id = "us.anthropic.claude-opus-4-20250514-v1:0"

# Configure logging for reasoning output
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def log_reasoning_step(step_name, content, verbose=True):
    """Log reasoning steps with timestamps"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    message = f"[{timestamp}] Reasoning - {step_name}: {content}"
    
    if verbose:
        print(message)

    logger.info(message)

def print_analysis_header(analysis_type="Drawing Analysis"):
    """Print a formatted header for analysis output"""
    print(f"   LabRat Research Assistant - {analysis_type.upper()}")
    print(f"   Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

def call_model(user_input, image_data=None):
    """Call Bedrock model with educational prompting for students"""
    
    # Educational system prompt for math tutoring
    educational_prompt = f"""You are an educational math tutor for a university mathematical modeling lab. 
    Your role is to guide students through problems without giving direct answers.
    
    Always:
    - Ask leading questions to help students discover solutions
    - Break complex problems into smaller steps
    - Encourage critical thinking and exploration
    - Provide hints rather than complete solutions
    - Help students understand the 'why' behind mathematical concepts
    - When converting equations to code, explain the reasoning process
    
    Student input: {user_input}
    
    Guide them through this step-by-step without giving the final answer directly."""
    
    # Prepare content array
    content = [{"text": educational_prompt}]
    
    # Add image if provided
    if image_data:
        # Handle image format and base64 conversion
        image_format = "png"  # default
        try:
            # Remove data URL prefix if present and detect format
            if image_data.startswith('data:image'):
                header, image_data = image_data.split(',', 1)
                # Extract format from data URL (e.g., data:image/png;base64)
                if '/jpeg' in header or '/jpg' in header:
                    image_format = "jpeg"
                elif '/png' in header:
                    image_format = "png"
                elif '/webp' in header:
                    image_format = "webp"
            
            # Validate and process the image
            
            # Decode and re-encode to ensure proper format
            image_bytes = base64.b64decode(image_data)
            
            # Open with PIL to validate and potentially convert
            with Image.open(io.BytesIO(image_bytes)) as img:
                # Check image size and resize if too large
                max_dimension = 1568
                if img.width > max_dimension or img.height > max_dimension:
                    ratio = min(max_dimension / img.width, max_dimension / img.height)
                    new_width = int(img.width * ratio)
                    new_height = int(img.height * ratio)
                    img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Convert to RGB (remove alpha channel, ensure compatibility)
                if img.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    if img.mode in ('RGBA', 'LA'):
                        background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                elif img.mode not in ('RGB',):
                    img = img.convert('RGB')
                
                # Convert to JPEG for Claude (more efficient)
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=95, optimize=True)
                image_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
                image_format = "jpeg"
                
        except Exception as e:
            print(f"Image processing error: {e}")
            return {"error": f"Failed to process image: {str(e)}"}
        
        content.append({
            "image": {
                "format": image_format,
                "source": {
                    "bytes": image_data
                }
            }
        })
    
    # Start a conversation with the educational prompt
    conversation = [
        {
            "role": "user",
            "content": content
        }
    ]
    
    try:
        # Send the message to the model with educational configuration
        response = client.converse(
            modelId=model_id,
            messages=conversation,
            inferenceConfig={
                "maxTokens": 500,  # Longer responses for step-by-step guidance
                "temperature": 0.1,  # Lower temperature for more consistent educational responses
                "topP": 0.9
            }
        )
        
        # Extract and return the response text
        response_text = response["output"]["message"]["content"][0]["text"]
        return {"success": True, "text": response_text, "model": model_id}
        
    except (ClientError, Exception) as e:
        return {"error": f"Can't invoke '{model_id}'. Reason: {e}"}

def process_whiteboard_to_code(equation_description):
    """Specific function for converting whiteboard equations to code"""
    prompt = f"""I see this mathematical equation on the whiteboard: {equation_description}
    
    Help me understand how to convert this to Python code for data analysis."""

    return call_model(prompt)

def analyze_experiment_data(experiment_description):
    """Specific function for analyzing experimental results"""
    prompt = f"""I have this experimental observation: {experiment_description}
    
    Help me think through what this data might be telling us and how to analyze it mathematically."""

    return call_model(prompt)

'''# Test the educational model
if __name__ == "__main__":
    # Test cases for your lab scenarios
    test_cases = [
        "Convert this equation to Python: y = mx + b",
        "I have a linear relationship in my data, what should I look for?",
        "How do I analyze the results from my experiment with these data points: [1,2], [2,4], [3,6]?"
    ]
    
    for i, test_input in enumerate(test_cases, 1):
        print(f"Test {i}: {test_input}")
        print("-" * 30)

        result = call_model(test_input)

        if result.get("success"):
            print(f"Response: {result['text']}")
        else:
            print(f"Error: {result['error']}")'''

def guide_simulation_building(drawing_description, student_context=""):
    """Guide students through building simulations from their whiteboard drawings"""
    
    simulation_prompt = f"""You are an educational simulation mentor for mathematical modeling students.
    
    A student has drawn: {drawing_description}
    Student context: {student_context}
    
    Your role is to guide them through building a mathematical simulation step-by-step:
    
    1. ANALYSIS PHASE:
       - Help them identify the key mathematical relationships in their drawing
       - Ask what variables they see and what they think each represents
       - Guide them to recognize patterns, trends, or behaviors
    
    2. MODELING PHASE:
       - Help them translate visual elements into mathematical equations
       - Ask leading questions about initial conditions, parameters, and constraints
       - Guide them to think about what changes over time vs. what stays constant
    
    3. SIMULATION DESIGN:
       - Help them break down the problem into computational steps
       - Guide them to think about inputs, outputs, and the simulation loop
       - Ask about what they want to observe or predict
    
    4. IMPLEMENTATION GUIDANCE:
       - Suggest appropriate tools (Python, MATLAB, Snowflake SQL for data)
       - Help them structure their code logically
       - Guide them through debugging and validation
    
    Remember:
    - Ask leading questions rather than giving direct answers
    - Encourage experimentation and hypothesis testing
    - Help them connect mathematical theory to practical implementation
    - Guide them to validate their simulation against real-world expectations
    
    Start by analyzing their drawing and asking what they think it represents mathematically."""
    
    return call_model(simulation_prompt)

def extract_math_from_drawing(image_base64, include_reasoning=True, verbose=True):
    """Extract mathematical content from a drawing and provide detailed analysis with Snowflake code recommendations"""
    
    if not image_base64:
        return {"error": "No image data provided"}
    
    # Handle image format and base64 conversion
    image_format = "png"  # default
    try:
        # Remove data URL prefix if present and detect format
        if image_base64.startswith('data:image'):
            header, image_base64 = image_base64.split(',', 1)
            # Extract format from data URL (e.g., data:image/png;base64)
            if '/jpeg' in header or '/jpg' in header:
                image_format = "jpeg"
            elif '/png' in header:
                image_format = "png"
            elif '/webp' in header:
                image_format = "webp"
        
        # Validate base64 and convert if needed
        
        # Decode and validate base64
        try:
            image_bytes = base64.b64decode(image_base64)
            if verbose:
                print(f"Decoded image bytes: {len(image_bytes)} bytes")
        except Exception as e:
            if verbose:
                print(f"Base64 decode error: {e}")
            return {"error": f"Invalid base64 image data: {str(e)}"}
        
        # Open with PIL to validate and potentially convert
        with Image.open(io.BytesIO(image_bytes)) as img:
            if verbose:
                print(f"Original image: {img.width}x{img.height}, mode: {img.mode}, format: {img.format}")
            
            # Check for minimum size (too small images can cause issues)
            if img.width < 10 or img.height < 10:
                return {"error": "Image too small to process"}
            
            # Check image size and resize if too large (Claude has limits)
            max_dimension = 1024  # More conservative limit
            if img.width > max_dimension or img.height > max_dimension:
                if verbose:
                    print(f"Resizing image from {img.width}x{img.height} to fit {max_dimension}px max dimension")
                ratio = min(max_dimension / img.width, max_dimension / img.height)
                new_width = int(img.width * ratio)
                new_height = int(img.height * ratio)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                if verbose:
                    print(f"Resized to: {img.width}x{img.height}")
            
            # Convert to RGB (remove alpha channel, ensure compatibility)
            if img.mode in ('RGBA', 'LA', 'P'):
                if verbose:
                    print(f"Converting from {img.mode} to RGB")
                # Create white background for transparent images
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                if img.mode in ('RGBA', 'LA'):
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            elif img.mode not in ('RGB',):
                if verbose:
                    print(f"Converting from {img.mode} to RGB")
                img = img.convert('RGB')
            
            # Use PNG for better quality and compatibility
            buffer = io.BytesIO()
            img.save(buffer, format='PNG', optimize=True)
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            image_format = "png"
            
            if verbose:
                print(f"Final image format: {image_format}, dimensions: {img.width}x{img.height}")
            
        # Check final image size (Claude has a 5MB limit)
        max_size_mb = 3.0  # More conservative limit
        image_size_mb = len(image_base64) * 3 / 4 / (1024 * 1024)  # Approximate size in MB
        if image_size_mb > max_size_mb:
            if verbose:
                print(f"Image too large ({image_size_mb:.1f}MB), compressing with JPEG...")
            # Re-compress with JPEG and lower quality
            with Image.open(io.BytesIO(base64.b64decode(image_base64))) as img:
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=85, optimize=True)
                image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
                image_format = "jpeg"
                image_size_mb = len(image_base64) * 3 / 4 / (1024 * 1024)
        
        # Final validation - check if base64 is valid
        try:
            test_decode = base64.b64decode(image_base64)
            if len(test_decode) == 0:
                return {"error": "Processed image resulted in empty data"}
        except Exception as e:
            return {"error": f"Final base64 validation failed: {str(e)}"}
        
        if verbose:
            print(f"Image processed successfully as {image_format}, size: {image_size_mb:.1f}MB")
            print(f"Base64 length: {len(image_base64)} characters")
            
    except Exception as e:
        if verbose:
            print(f"Image processing error: {e}")
        return {"error": f"Failed to process image: {str(e)}"}
    
    if verbose:
        print("Analyzing drawing for mathematical content and code potential...")
    
    extraction_prompt = """You are an expert data scientist analyzing a mathematical drawing to create Snowflake/SQL solutions.

    Please provide a structured analysis following this format:

    ## VISUAL ANALYSIS
    Describe what you observe in the drawing:
    - Mathematical equations, formulas, or expressions
    - Graphs, charts, or data visualizations
    - Variables, parameters, and their relationships
    - Any data patterns or trends shown

    ## DETAILED REASONING PROCESS
    Step-by-step breakdown of your analytical thinking:
    1. **Initial Interpretation**: What mathematical concept is being illustrated?
    2. **Variable Identification**: What are the key variables and relationships?
    3. **Computational Requirements**: What type of analysis or computation is needed?
    4. **Data Flow Analysis**: What would be the expected inputs and outputs?
    5. **Implementation Feasibility**: How confident are you this can be converted to code? (1-10)
    6. **Complexity Assessment**: What challenges might arise in implementation?

    ## CODE CONVERSION ASSESSMENT
    Evaluate the feasibility of turning this into executable code:
    - **Feasibility Score (1-10)**: How easily can this be converted to code?
    - **Primary Challenges**: What obstacles exist for code conversion?
    - **Required Dependencies**: What libraries/tools would be needed?
    - **Expected Complexity**: Simple/Moderate/Complex implementation?

    ## SNOWFLAKE RECOMMENDATIONS
    Based on your analysis, provide specific recommendations for:
    - SQL queries needed to analyze similar data
    - Data transformations or calculations
    - Visualization approaches in Snowflake
    - Sample table structures if applicable

    ## NOTEBOOK CODE CELLS
    Provide 2-3 Python code cells that could be used in a Snowflake notebook:
    1. Data connection and query setup
    2. Main analysis/calculation code
    3. Visualization or results formatting

    Format the code cells like this:
    ```python
    # Cell 1: Description
    [actual Python/SQL code]
    ```

    Be specific and practical - focus on actionable Snowflake/Python code that addresses the mathematical concepts in the drawing.
    
    ## REASONING SUMMARY
    Conclude with:
    - Overall assessment of code conversion potential
    - Key insights from your analysis
    - Recommendations for next steps"""
    
    conversation = [
        {
            "role": "user",
            "content": [
                {"text": extraction_prompt},
                {
                    "image": {
                        "format": image_format,
                        "source": {
                            "bytes": image_base64
                        }
                    }
                }
            ]
        }
    ]
    
    try:
        if verbose:
            print(f"Sending enhanced analysis request to Claude using model: {model_id}")
            print(f"Image format: {image_format}, Image size: {len(image_base64)} characters")
            print(f"Conversation structure: {len(conversation)} messages")
            print(f"Content elements: {len(conversation[0]['content'])} items")
            
        # Additional validation before API call
        if not image_base64 or len(image_base64) < 100:
            raise ValueError("Image base64 data is too short or empty")
        
        if image_format not in ['png', 'jpeg', 'webp']:
            raise ValueError(f"Unsupported image format: {image_format}")
        
        response = client.converse(
            modelId=model_id,
            messages=conversation,
            inferenceConfig={
                "maxTokens": 2500,  # Increased for detailed reasoning analysis
                "temperature": 0.1,
                "topP": 0.9
            }
        )
        
        response_text = response["output"]["message"]["content"][0]["text"]
        
        if verbose:
            print("Analysis complete!")
            if include_reasoning:
                print("\n" + "="*80)
                print("MODEL'S REASONING FOR CODE CONVERSION:")
                print("="*80)
                # Extract and highlight the reasoning section
                reasoning_section = extract_reasoning_section(response_text)
                if reasoning_section:
                    print(reasoning_section)
                else:
                    print("Full response (reasoning embedded):")
                    print(response_text)
                print("="*80 + "\n")
        
        # Extract code cells from the response
        notebook_cells = extract_code_cells_from_response(response_text)
        
        # Extract feasibility score from reasoning
        feasibility_score = extract_score_from_text(response_text, "feasibility score")
        
        return {
            "success": True, 
            "text": response_text, 
            "model": model_id,
            "notebook_cells": notebook_cells,
            "reasoning_included": include_reasoning,
            "feasibility_score": feasibility_score,
            "analysis_type": "enhanced_with_reasoning"
        }
        
    except (ClientError, Exception) as e:
        error_msg = f"Can't analyze image with '{model_id}'. Reason: {e}"
        if verbose:
            print(f"Error: {error_msg}")
            print(f"Error type: {type(e)}")
            if hasattr(e, 'response'):
                print(f"Error response: {e.response}")
        
        # Additional debugging information
        if verbose:
            print(f"Image processing details:")
            print(f"- Image format: {image_format}")
            print(f"- Base64 length: {len(image_base64)}")
            print(f"- Model attempted: {model_id}")
        
        return {"error": error_msg}

def extract_code_cells_from_response(response_text):
    """Extract code cells from the AI response for notebook creation"""
    import re
    
    cells = []
    
    # Find all code blocks marked with ```python or ```sql
    code_blocks = re.findall(r'```(?:python|sql)\n(.*?)\n```', response_text, re.DOTALL)
    
    for i, code in enumerate(code_blocks):
        # Extract any comment at the start as cell description
        lines = code.strip().split('\n')
        description = ""
        actual_code = code.strip()
        
        if lines and lines[0].strip().startswith('#'):
            description = lines[0].strip()[1:].strip()
        
        cells.append({
            "cell_type": "code",
            "language": "python",
            "description": description,
            "code": actual_code,
            "cell_number": i + 1
        })
    
    return cells

def create_snowflake_notebook(cells, notebook_name="LabRat_Analysis"):
    """Create a structured notebook with the analyzed cells"""
    
    notebook_structure = {
        "name": notebook_name,
        "description": "Generated from LabRat drawing analysis",
        "cells": []
    }
    
    # Add introduction cell
    intro_cell = {
        "cell_type": "markdown",
        "content": f"# {notebook_name}\n\nThis notebook was generated from mathematical drawing analysis using LabRat.\n\n## Analysis Summary\nThe following cells contain code for analyzing the mathematical concepts identified in the drawing."
    }
    notebook_structure["cells"].append(intro_cell)
    
    # Add the code cells
    for cell in cells:
        notebook_structure["cells"].append(cell)
    
    # Add conclusion cell
    conclusion_cell = {
        "cell_type": "markdown", 
        "content": "## Next Steps\n\n- Review and modify the code above as needed\n- Connect to your Snowflake data warehouse\n- Execute the cells in sequence\n- Analyze the results and iterate as needed"
    }
    notebook_structure["cells"].append(conclusion_cell)
    
    return notebook_structure

def analyze_drawing_with_reasoning(image_base64, verbose=True):
    """Analyze a drawing with detailed step-by-step reasoning about code conversion potential"""
    
    if not image_base64:
        return {"error": "No image data provided"}
    
    # Remove data URL prefix if present
    if image_base64.startswith('data:image'):
        image_base64 = image_base64.split(',')[1]
    
    reasoning_prompt = """You are an expert AI analyst examining a mathematical drawing to determine if and how it can be converted to code.

    Please provide a comprehensive step-by-step reasoning analysis following this exact format:

    ## INITIAL VISUAL ASSESSMENT
    Describe what you see in the drawing:
    - List all mathematical elements (equations, graphs, symbols, diagrams)
    - Identify any text, labels, or annotations
    - Note the overall structure and layout
    - Assess image quality and clarity

    ## DETAILED REASONING PROCESS
    Walk through your analysis step-by-step:

    ### Step 1: Mathematical Content Identification
    - What mathematical concepts are present?
    - Are there variables, constants, functions, or relationships?
    - Can you identify the mathematical domain (algebra, calculus, statistics, etc.)?

    ### Step 2: Code Conversion Feasibility Analysis
    - Can the mathematical content be translated to code? (YES/NO and why)
    - What programming concepts would be needed?
    - Are there any ambiguities or missing information?
    - What assumptions would need to be made?

    ### Step 3: Implementation Strategy Assessment
    - What type of code would this become? (calculation, visualization, simulation, data analysis)
    - What libraries or tools would be most appropriate?
    - What would be the input/output structure?
    - How complex would the implementation be? (1-5 scale)

    ### Step 4: Practical Considerations
    - Are there edge cases to consider?
    - What additional context might be needed from the user?
    - What validation or testing would be important?

    ## REASONING CONCLUSION
    Final assessment:
    - Overall feasibility score (1-10)
    - Primary recommendation for implementation approach
    - Key challenges or limitations identified
    - Confidence level in the analysis (1-10)

    ## RECOMMENDED CODE STRUCTURE
    If conversion is feasible, provide a high-level code outline:

    ```python
    # Suggested implementation approach
    # [Include actual code structure based on your analysis]
    ```

    Be thorough and explicit in your reasoning. Show your thought process clearly."""
    
    conversation = [
        {
            "role": "user",
            "content": [
                {"text": reasoning_prompt},
                {
                    "image": {
                        "format": "png",
                        "source": {
                            "bytes": image_base64
                        }
                    }
                }
            ]
        }
    ]
    
    try:
        if verbose:
            print("Starting detailed reasoning analysis of drawing...")
            print("Sending image to Claude for comprehensive analysis...")
        
        response = client.converse(
            modelId=model_id,
            messages=conversation,
            inferenceConfig={
                "maxTokens": 3000,  # Increased for detailed reasoning
                "temperature": 0.1,  # Low temperature for consistent reasoning
                "topP": 0.9
            }
        )
        
        response_text = response["output"]["message"]["content"][0]["text"]
        
        if verbose:
            print("Analysis complete! Detailed reasoning received.")
            print("=" * 80)
            print("MODEL'S REASONING PROCESS:")
            print("=" * 80)
            print(response_text)
            print("=" * 80)
        
        # Extract feasibility score and confidence from the response
        feasibility_score = extract_score_from_text(response_text, "feasibility score")
        confidence_score = extract_score_from_text(response_text, "confidence level")
        
        # Determine if code conversion is recommended
        code_feasible = "YES" in response_text.upper() and feasibility_score >= 6
        
        return {
            "success": True,
            "detailed_reasoning": response_text,
            "feasibility_score": feasibility_score,
            "confidence_score": confidence_score,
            "code_conversion_feasible": code_feasible,
            "model": model_id,
            "analysis_type": "detailed_reasoning"
        }
        
    except (ClientError, Exception) as e:
        error_msg = f"Can't analyze image with '{model_id}'. Reason: {e}"
        if verbose:
            print(f"Error during analysis: {error_msg}")
        return {"error": error_msg}

def extract_score_from_text(text, score_type):
    """Extract numerical scores from the reasoning text"""
    import re
    
    # Look for patterns like "feasibility score (1-10): 8" or "confidence level: 7/10"
    patterns = [
        rf"{score_type}.*?(\d+)",
        rf"{score_type}.*?(\d+)/10",
        rf"{score_type}.*?\(1-10\).*?(\d+)"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return int(match.group(1))
    
    return 5  # Default middle score if not found

def extract_reasoning_section(response_text):
    """Extract the reasoning process section from the AI response"""
    import re
    
    # Look for reasoning sections in the response
    reasoning_patterns = [
        r"## DETAILED REASONING PROCESS(.*?)(?=##|$)",
        r"## REASONING PROCESS(.*?)(?=##|$)",
        r"## CODE CONVERSION ASSESSMENT(.*?)(?=##|$)",
        r"### Step \d+:(.*?)(?=###|##|$)"
    ]
    
    reasoning_content = []
    
    for pattern in reasoning_patterns:
        matches = re.findall(pattern, response_text, re.DOTALL | re.IGNORECASE)
        for match in matches:
            reasoning_content.append(match.strip())
    
    if reasoning_content:
        return "\n\n".join(reasoning_content)
    
    # If no specific reasoning section found, return sections that contain reasoning keywords
    reasoning_keywords = ["step-by-step", "analysis", "feasibility", "assessment", "reasoning"]
    lines = response_text.split('\n')
    reasoning_lines = []
    
    for line in lines:
        if any(keyword in line.lower() for keyword in reasoning_keywords):
            reasoning_lines.append(line)
    
    if reasoning_lines:
        return "\n".join(reasoning_lines)
    
    return None

def analyze_with_landingai(image_base64):
    """Alternative vision analysis using WRITER LandingAI"""
    
    if not image_base64:
        return {"error": "No image data provided"}
    
    try:
        # This is a placeholder for LandingAI integration
        # You would need to install: pip install landingai
        # and get API credentials from WRITER LandingAI
        
        # For now, return a structured response indicating LandingAI would be used
        return {
            "success": True,
            "text": """## LANDINGAI VISION ANALYSIS
            
            **LandingAI Integration Ready**

            This drawing would be analyzed using WRITER's LandingAI vision model for enhanced mathematical understanding.

            ## SETUP REQUIRED
            To enable LandingAI:
            1. Install: `pip install landingai`
            2. Get API key from WRITER LandingAI
            3. Configure credentials in environment

            ## EXPECTED CAPABILITIES
            - Advanced mathematical symbol recognition
            - Complex equation parsing
            - Better handling of handwritten formulas
            - Enhanced diagram interpretation

            ## NOTEBOOK RECOMMENDATIONS
            Based on typical mathematical analysis patterns:

            ```python
            # Cell 1: Data Connection
            import snowflake.connector
            import pandas as pd
            import numpy as np

            # Connect to Snowflake
            conn = snowflake.connector.connect(
                user='your_user',
                password='your_password',
                account='your_account',
                warehouse='your_warehouse',
                database='your_database',
                schema='your_schema'
            )
            ```

            ```python
            # Cell 2: Mathematical Analysis
            # This would contain specific code based on the drawing analysis
            # Example: Linear regression, statistical analysis, etc.
            cursor = conn.cursor()
            query = "SELECT * FROM your_table WHERE condition"
            df = pd.read_sql(query, conn)

            # Perform mathematical operations identified in the drawing
            results = df.describe()
            print(results)
            ```

            ```python
            # Cell 3: Visualization
            import matplotlib.pyplot as plt
            import seaborn as sns

            # Create visualizations based on mathematical relationships
            plt.figure(figsize=(10, 6))
            plt.plot(df['x'], df['y'])
            plt.title('Mathematical Relationship from Drawing')
            plt.show()
            ```
            """,
            "model": "landingai-placeholder",
            "notebook_cells": [
                {
                    "cell_type": "code",
                    "language": "python",
                    "description": "Snowflake Connection Setup",
                    "code": "import snowflake.connector\nimport pandas as pd\nimport numpy as np\n\n# Connect to Snowflake\nconn = snowflake.connector.connect(\n    user='your_user',\n    password='your_password',\n    account='your_account',\n    warehouse='your_warehouse',\n    database='your_database',\n    schema='your_schema'\n)",
                    "cell_number": 1
                },
                {
                    "cell_type": "code", 
                    "language": "python",
                    "description": "Mathematical Analysis",
                    "code": "# Mathematical analysis based on drawing\ncursor = conn.cursor()\nquery = \"SELECT * FROM your_table WHERE condition\"\ndf = pd.read_sql(query, conn)\n\n# Perform operations identified in drawing\nresults = df.describe()\nprint(results)",
                    "cell_number": 2
                },
                {
                    "cell_type": "code",
                    "language": "python", 
                    "description": "Data Visualization",
                    "code": "import matplotlib.pyplot as plt\nimport seaborn as sns\n\n# Create visualizations\nplt.figure(figsize=(10, 6))\nplt.plot(df['x'], df['y'])\nplt.title('Mathematical Relationship from Drawing')\nplt.show()",
                    "cell_number": 3
                }
            ]
        }
        
    except Exception as e:
        return {"error": f"LandingAI analysis failed: {str(e)}"}
            