# /home/ubuntu/Manas_Android_Research/src/main.py
import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, request, jsonify, Response
from flask_cors import CORS

# Import question generation functions
from src.langchain_logic.question_generator import generate_mcq_questions, generate_coding_questions
# Import PDF generation function
from src.pdf_exporter import generate_pdf_from_data

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
CORS(app)  # Enable CORS for all routes
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'asdf#FGSgvasgf$5$WGT_mock_interview')

@app.route('/generate_mock_test', methods=['POST'])
def handle_generate_mock_test():
    data = request.get_json()
    if not data or 'topic' not in data:
        return jsonify({'error': 'Missing topic in request'}), 400
    
    topic = data['topic']
    if not topic.strip():
        return jsonify({'error': 'Topic cannot be empty'}), 400

    print(f"Received topic: {topic}")

    if not os.getenv("TOGETHER_API_KEY"):
        print("Warning: TOGETHER_API_KEY is not set. LLM calls will fail.")
    if not os.getenv("TAVILY_API_KEY"):
        print("Warning: TAVILY_API_KEY is not set. Web search for theory questions will be skipped.")

    try:
        # Get includeCoding parameter from request (matching frontend naming)
        include_coding = data.get('includeCoding', True)
        print(f"Include coding questions: {include_coding}")
        
        # Generate MCQ questions
        mcq_questions = generate_mcq_questions(topic)
        if not mcq_questions:
            print("Warning: No MCQ questions were generated")
            mcq_questions = []  # Ensure we return an empty list rather than None
        
        # Generate coding questions only if explicitly requested
        coding_questions = []
        if include_coding:
            coding_questions = generate_coding_questions(topic)
            if not coding_questions:
                print("Warning: No coding questions were generated")
        
        # Debug output
        print(f"Returning {len(mcq_questions)} MCQ questions and {len(coding_questions)} coding questions")
        
        return jsonify({
            'topic': topic,
            'mcq_questions': mcq_questions,
            'coding_questions': coding_questions,
            'include_coding': include_coding
        })
    except Exception as e:
        print(f"Error during question generation: {e}")
        return jsonify({'error': 'Failed to generate questions. Please check server logs.'}), 500

@app.route('/export_pdf', methods=['POST'])
def handle_export_pdf():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing data for PDF generation'}), 400
    
    # Data should contain 'topic', 'theory_questions', 'coding_questions'
    # This data will be sent by the frontend from the already generated test
    try:
        content_bytes = generate_pdf_from_data(data)
        topic_slug = data.get("topic", "mock_test").lower().replace(" ", "_")
        
        # Check if the content is PDF or HTML (based on the first few bytes)
        if content_bytes.startswith(b'%PDF'):
            # It's a PDF
            return Response(
                content_bytes, 
                mimetype='application/pdf',
                headers={'Content-Disposition': f'attachment;filename={topic_slug}_mock_test.pdf'}
            )
        else:
            # It's HTML
            return Response(
                content_bytes, 
                mimetype='text/html',
                headers={'Content-Disposition': f'attachment;filename={topic_slug}_mock_test.html'}
            )
    except Exception as e:
        print(f"Error generating document: {e}")
        return jsonify({'error': 'Failed to generate document. Please check server logs.'}), 500

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404

if __name__ == '__main__':
    print("Starting Flask app...")
    print("Please ensure TOGETHER_API_KEY and TAVILY_API_KEY are set in your environment.")
    app.run(host='0.0.0.0', port=5000, debug=True)

