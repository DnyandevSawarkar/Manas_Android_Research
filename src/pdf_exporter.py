# /home/ubuntu/mock_interview_app/src/pdf_exporter.py
import os
import tempfile

# Try importing WeasyPrint, but provide a fallback if it's not available
try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except OSError as e:
    print(f"WeasyPrint not fully installed: {e}")
    WEASYPRINT_AVAILABLE = False

def generate_pdf_from_data(data):
    """Generates a PDF from mock test data using WeasyPrint or saves as HTML if WeasyPrint is not available."""
    topic = data.get("topic", "Mock Test")
    theory_questions = data.get("theory_questions", [])
    coding_questions = data.get("coding_questions", [])

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Mock Test: {topic}</title>
        <style>
            body {{ font-family: sans-serif; margin: 20px; color: #333; }}
            h1 {{ text-align: center; color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; }}
            h2 {{ color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 30px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 10px; page-break-inside: auto; }}
            thead {{ background-color: #f9f9f9; display: table-header-group; }}
            tr {{ page-break-inside: avoid; page-break-after: auto; }}
            th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; word-wrap: break-word; }}
            th {{ font-weight: bold; }}
            .question-number {{ width: 5%; }}
            .problem-statement {{ white-space: pre-wrap; }}
            .input-output {{ white-space: pre-wrap; background-color: #f5f5f5; font-family: monospace; padding: 5px; margin-top: 5px; display: block; }}
        </style>
    </head>
    <body>
        <h1>Interview Mock Test: {topic.capitalize()}</h1>

        <h2>Theory Questions</h2>
    """
    if theory_questions:
        html_content += "<table><thead><tr><th class=\"question-number\">#</th><th>Question</th></tr></thead><tbody>"
        for i, tq in enumerate(theory_questions):
            html_content += f"<tr><td>{i+1}</td><td>{tq.get('question', 'N/A')}</td></tr>" # Corrected quotes and ensured line break
        html_content += "</tbody></table>"
    else:
        html_content += "<p>No theory questions generated.</p>"

    html_content += "<h2>Coding Questions</h2>"
    if coding_questions:
        html_content += "<table><thead><tr><th class=\"question-number\">#</th><th>Problem Statement</th><th>Difficulty</th><th>Input/Output</th></tr></thead><tbody>"
        for i, cq in enumerate(coding_questions):
            problem_statement = cq.get('problem_statement', 'N/A').replace("\n", "<br>") # Corrected quotes
            constraints = cq.get('constraints', 'N/A').replace("\n", "<br>") # Corrected quotes
            input_output = cq.get('input_output', 'N/A').replace("\n", "<br>") # Corrected quotes
            difficulty = cq.get('difficulty', 'N/A') # Corrected quotes
            html_content += f"""
            <tr>
                <td>{i+1}</td>
                <td>
                    <div class="problem-statement">{problem_statement}</div>
                    <div><strong>Constraints:</strong> {constraints}</div>
                </td>
                <td>{difficulty}</td>
                <td><div class="input-output">{input_output}</div></td>
            </tr>
            """
        html_content += "</tbody></table>"
    else:
        html_content += "<p>No coding questions generated.</p>"
    
    html_content += "</body></html>"

    # Using default CJK font for broader character support as per knowledge base
    if WEASYPRINT_AVAILABLE:
        try:
            # Use a more cross-platform font configuration
            font_config = CSS(string=
                "body { font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; }"
            )
            
            pdf_bytes = HTML(string=html_content).write_pdf(stylesheets=[font_config])
            return pdf_bytes
        except Exception as e:
            print(f"Error generating PDF: {e}")
            return fallback_to_html(html_content, topic)
    else:
        print("WeasyPrint not available. Saving as HTML instead.")
        return fallback_to_html(html_content, topic)

def fallback_to_html(html_content, topic):
    """Save the content as HTML file when PDF generation is not possible"""
    # Clean topic name for filename
    clean_topic = ''.join(c if c.isalnum() or c in ' _-' else '_' for c in topic)
    filename = f"mock_test_{clean_topic.replace(' ', '_')}.html"
    
    # Create user-friendly download location
    downloads_folder = os.path.join(os.path.expanduser("~"), "Downloads")
    if os.path.exists(downloads_folder):
        save_dir = downloads_folder
    else:
        save_dir = tempfile.gettempdir()
    
    file_path = os.path.join(save_dir, filename)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"HTML report saved at: {file_path}")
    
    # Add a note to the HTML content to inform the user where the file was saved
    note_html = f"""
    <div style="background-color: #f8f9fa; padding: 10px; margin-top: 20px; border-radius: 5px;">
        <p style="font-weight: bold; color: #333;">Note: PDF generation is not available. 
        This HTML report has been saved to: {file_path}</p>
        <p>To enable PDF generation, please install GTK3 by following these steps:</p>
        <ol>
            <li>Visit <a href="https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases">GTK3 for Windows</a></li>
            <li>Download and install the latest gtk3-runtime-x.x.x-x-win64.exe</li>
            <li>Restart your application</li>
        </ol>
    </div>
    """ + html_content
    
    return note_html.encode('utf-8')  # Return bytes for API consistency

