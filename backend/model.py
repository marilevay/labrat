import boto3
from botocore.exceptions import ClientError
import json

# Create a Bedrock Runtime client in the AWS Region you want to use.
client = boto3.client("bedrock-runtime", region_name="us-west-2")

# Set the model ID, e.g., Claude 3 Haiku.
model_id = "us.anthropic.claude-opus-4-20250514-v1:0"

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
    
    # Start a conversation with the educational prompt
    conversation = [
        {
            "role": "user",
            "content": [{"text": educational_prompt}]
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

# Test the educational model
if __name__ == "__main__":
    # Test cases for your lab scenarios
    test_cases = [
        "Convert this equation to Python: y = mx + b",
        "I have a linear relationship in my data, what should I look for?",
        "How do I analyze the results from my experiment with these data points: [1,2], [2,4], [3,6]?"
    ]
    
    for i, test_input in enumerate(test_cases, 1):
        print(f"\n Test {i}: {test_input}")
        print("-" * 30)

        result = call_model(test_input)

        if result.get("success"):
            print(f"Response: {result['text']}")
        else:
            print(f"Error: {result['error']}")
            