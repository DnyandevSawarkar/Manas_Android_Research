# Interview Mock Test Generator Web Application

This application allows users to generate interview mock tests based on a specified topic. It generates theory questions and coding problems.

## Project Structure

```
mock_interview_app/
├── src/
│   ├── langchain_logic/
│   │   ├── __init__.py
│   │   ├── coding_prompt_template.txt
│   │   ├── question_generator.py
│   │   └── theory_prompt_template.txt
│   ├── static/
│   │   ├── index.html
│   │   ├── script.js
│   │   └── style.css
│   ├── main.py
│   └── pdf_exporter.py
├── requirements.txt
└── README.md 
```

## Setup and Run Instructions

Follow these steps to run the application locally:

1.  **Prerequisites:**
    *   Python 3.8 or higher.
    *   `pip` (Python package installer).

2.  **Clone or Download the Code:**
    *   Ensure you have all the files from the `mock_interview_app` directory.

3.  **Navigate to the Project Directory:**
    ```bash
    cd path/to/mock_interview_app
    ```

4.  **Create and Activate a Python Virtual Environment:**
    *   It is highly recommended to use a virtual environment to manage dependencies.
    ```bash
    # For Linux/macOS
    python3 -m venv venv
    source venv/bin/activate

    # For Windows
    python -m venv venv
    .\venv\Scripts\activate
    ```

5.  **Install Dependencies:**
    *   Install all required Python packages using the `requirements.txt` file.
    ```bash
    pip install -r requirements.txt
    ```

6.  **Set Environment Variables:**
    *   This application requires API keys for Together AI (LLM provider) and Tavily (web search). You need to obtain these keys from their respective websites.
    *   Set the following environment variables in your terminal session before running the app:
    ```bash
    # For Linux/macOS
    export TOGETHER_API_KEY="your_together_api_key_here"
    export TAVILY_API_KEY="your_tavily_api_key_here"

    # For Windows (PowerShell)
    $env:TOGETHER_API_KEY="your_together_api_key_here"
    $env:TAVILY_API_KEY="your_tavily_api_key_here"

    # For Windows (Command Prompt)
    set TOGETHER_API_KEY=your_together_api_key_here
    set TAVILY_API_KEY=your_tavily_api_key_here
    ```
    *   Replace `"your_together_api_key_here"` and `"your_tavily_api_key_here"` with your actual API keys.
    *   **Note:** Without these keys, the question generation will fail or produce limited results.

7.  **Run the Flask Application:**
    *   Execute the main Python script to start the Flask development server.
    ```bash
    python src/main.py
    ```
    *   The application will typically be available at `http://127.0.0.1:5000` or `http://localhost:5000` in your web browser.

8.  **Access the Application:**
    *   Open your web browser and navigate to the URL provided in the terminal output (usually `http://127.0.0.1:5000`).

## Features

*   **Topic Input:** Enter any technical topic for which you want a mock test.
*   **Theory Questions:** Generates 30 theory-based questions (basic to advanced, Bloom's taxonomy variety).
*   **Coding Questions:** Generates 2 coding questions with problem statements, constraints, sample I/O, and difficulty tags.
*   **Web Search Augmentation:** Uses Tavily search to augment LLM knowledge for more relevant theory questions.
*   **PDF Export:** Export the generated mock test as a PDF document.
*   **Copy to Clipboard:** Copy the generated mock test content to your clipboard.

## Technologies Used

*   **Backend:** Python, Flask, Langchain, Together AI (LLM), Tavily Search API.
*   **Frontend:** HTML, CSS, JavaScript.
*   **PDF Generation:** WeasyPrint.

## Prompt Templates

*   `src/langchain_logic/theory_prompt_template.txt`: Template for generating theory questions.
*   `src/langchain_logic/coding_prompt_template.txt`: Template for generating coding questions.

