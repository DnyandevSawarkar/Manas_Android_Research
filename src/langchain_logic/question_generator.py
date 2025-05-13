# /home/ubuntu/Manas_Android_Research/src/langchain_logic/question_generator.py

import os
import re
from langchain_core.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_together import Together
from langchain_community.tools.tavily_search import TavilySearchResults
import os

# API Keys: User needs to set these environment variables
# os.environ["TOGETHER_API_KEY"] = "YOUR_TOGETHER_API_KEY"
# os.environ["TAVILY_API_KEY"] = "YOUR_TAVILY_API_KEY"

# Initialize LLM (TogetherAI)
llm = Together(
    model="meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
    temperature=0.5,  # Lower temperature for more structured responses
    max_tokens=3000   # Increased max_tokens for comprehensive responses
)

# Initialize Tavily Search Tool
# User needs to set TAVILY_API_KEY environment variable
tavily_search = TavilySearchResults(max_results=3) # Get top 3 results for context

def load_prompt_template(file_path):
    with open(file_path, "r") as f:
        return f.read()

import os
current_dir = os.path.dirname(os.path.abspath(__file__))
theory_prompt_template_str = load_prompt_template(os.path.join(current_dir, "theory_prompt_template.txt"))
coding_prompt_template_str = load_prompt_template(os.path.join(current_dir, "coding_prompt_template.txt"))
mcq_prompt_template_str = load_prompt_template(os.path.join(current_dir, "mcq_prompt_template.txt"))

# Updated prompts to include search_context
theory_prompt = PromptTemplate(template=theory_prompt_template_str, input_variables=["topic", "search_context"])
coding_prompt = PromptTemplate(template=coding_prompt_template_str, input_variables=["topic"])
mcq_prompt = PromptTemplate(template=mcq_prompt_template_str, input_variables=["topic", "search_context"])

theory_chain = LLMChain(llm=llm, prompt=theory_prompt)
coding_chain = LLMChain(llm=llm, prompt=coding_prompt)
mcq_chain = LLMChain(llm=llm, prompt=mcq_prompt)

def parse_mcq_questions(text_response):
    """Parses the LLM response for MCQ questions into a structured format."""
    questions = []
    current_question = None
    lines = text_response.strip().split("\n")
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        if line.startswith("Q") and "." in line[:10]:
            if current_question:
                questions.append(current_question)
            current_question = {
                "question": line.split(".", 1)[1].strip(),
                "options": [],
                "correct_answer": None,
                "explanation": None
            }
        elif current_question and line.startswith(("a)", "b)", "c)", "d)")):
            option_letter = line[0]
            option_text = line[2:].strip()
            current_question["options"].append({"letter": option_letter, "text": option_text})
        elif current_question and line.startswith("Answer:"):
            current_question["correct_answer"] = line.split(":", 1)[1].strip()
        elif current_question and line.startswith("Explanation:"):
            current_question["explanation"] = line.split(":", 1)[1].strip()
            
    if current_question:
        questions.append(current_question)
        
    return questions

def generate_theory_questions(topic):
    """Generates MCQ questions for a given topic using Langchain and Tavily search."""
    try:
        print(f"Generating theory questions for topic: {topic}")
        # Perform a web search for the topic
        search_results = tavily_search.invoke(topic)
        
        # Format search results for the prompt
        search_context = "\n".join([f"Source: {res.get('url', 'N/A')}\nContent: {res.get('content', 'N/A')}" for res in search_results])
        if not search_context:
            search_context = "No specific context found from web search."

        response = theory_chain.invoke({"topic": topic, "search_context": search_context})
        questions_text = response.get("text", "").strip()
        mcq_questions = parse_mcq_questions(questions_text)
        print(f"Generated MCQ questions: {len(mcq_questions)}")
        return mcq_questions
    except Exception as e:
        print(f"Error generating theory questions: {e}")
        # Fallback to generation without search if Tavily fails (e.g. API key issue)
        try:
            print("Falling back to theory question generation without web search.")
            # Corrected fallback prompt loading to avoid issues if search_context placeholders are still there
            base_theory_prompt_str = load_prompt_template("/home/ubuntu/Manas_Android_Research/src/langchain_logic/theory_prompt_template.txt")
            # Remove the context block if it exists
            context_block = "\nBEGIN CONTEXT\n{search_context}\nEND CONTEXT\n"
            if context_block in base_theory_prompt_str:
                final_fallback_prompt_str = base_theory_prompt_str.replace(context_block, "")
                fallback_input_variables = ["topic"]
            else: # If the original prompt didn't have context block (e.g. after a failed replace)
                final_fallback_prompt_str = base_theory_prompt_str
                fallback_input_variables = ["topic"]
                if "search_context" in final_fallback_prompt_str: # safety check
                     final_fallback_prompt_str = final_fallback_prompt_str.replace("{search_context}", "No context available.")

            fallback_prompt = PromptTemplate(template=final_fallback_prompt_str, input_variables=fallback_input_variables)
            fallback_chain = LLMChain(llm=llm, prompt=fallback_prompt)
            response = fallback_chain.invoke({"topic": topic})
            questions_text = response.get("text", "").strip()
            questions_list = [q.strip() for q in questions_text.split("\n") if q.strip() and q.strip()[0].isdigit()]
            return [{"question": q.split(". ", 1)[1] if ". " in q else q} for q in questions_list]
        except Exception as fallback_e:
            print(f"Fallback theory question generation also failed: {fallback_e}")
            return []

def parse_coding_questions(text_response):
    """Parses the LLM response for coding questions into a structured format."""
    questions = []
    current_question = None
    lines = text_response.strip().split("\n")
    
    active_field = None
    
    # Print the raw response for debugging
    print(f"Raw coding questions response: {text_response[:100]}...")

    for line in lines:
        line_stripped = line.strip()
        if not line_stripped: # Skip empty lines
            continue

        # More flexible matching for question markers
        if (line_stripped.lower().startswith("question ") or 
            (line_stripped.startswith("Q") and ":" in line_stripped[:10])):
            if current_question: # Save previous question
                questions.append(current_question)
            current_question = {"problem_statement": "", "constraints": "N/A", "input_output": "", "difficulty": "N/A"}
            active_field = None # Reset active field
            
        # More flexible field matching
        elif any(line_stripped.lower().startswith(prefix) for prefix in ["problem:", "problem statement:"]):
            if current_question:
                current_question["problem_statement"] = line_stripped.split(":", 1)[1].strip()
                active_field = "problem_statement"
        elif any(line_stripped.lower().startswith(prefix) for prefix in ["constraint:", "constraints:"]):
            if current_question:
                current_question["constraints"] = line_stripped.split(":", 1)[1].strip()
                active_field = "constraints"
        elif any(line_stripped.lower().startswith(prefix) for prefix in [
            "sample input/output:", "input/output:", "example:", "examples:", "sample:"
        ]):
            if current_question:
                current_question["input_output"] = line_stripped.split(":", 1)[1].strip()
                active_field = "input_output"
        elif any(line_stripped.lower().startswith(prefix) for prefix in ["difficulty:", "difficulty tag:", "level:"]):
            if current_question:
                difficulty_text = line_stripped.split(":", 1)[1].strip()
                # Extract just Easy/Medium/Hard from the text
                if "easy" in difficulty_text.lower():
                    current_question["difficulty"] = "Easy"
                elif "medium" in difficulty_text.lower():
                    current_question["difficulty"] = "Medium"
                elif "hard" in difficulty_text.lower():
                    current_question["difficulty"] = "Hard"
                else:
                    current_question["difficulty"] = "Medium"  # Default to Medium if unclear
                active_field = None  # Stop collecting additional lines
        elif active_field and current_question and active_field != "difficulty": # Append to the last active field if it spans multiple lines
            current_question[active_field] += "\n" + line_stripped
    
    if current_question: # Append the last question
        questions.append(current_question)
    
    # Be more lenient with validation - only require problem_statement to be non-empty
    valid_questions = [q for q in questions if q["problem_statement"]]
    
    # Debug information
    print(f"Found {len(questions)} potential questions, {len(valid_questions)} valid questions")
    if not valid_questions and questions:
        print("Found questions but none were valid. First question data:")
        print(questions[0])
        
    return valid_questions

def generate_coding_questions(topic):
    """Generates coding questions for a given topic using Langchain."""
    print(f"Generating coding questions for topic: {topic}")
    try:
        response = coding_chain.invoke({"topic": topic})
        questions_text = response.get("text", "").strip()
        parsed_questions = parse_coding_questions(questions_text)
        print(f"Generated coding questions: {len(parsed_questions)}")
        
        # Take exactly 2 questions
        return parsed_questions[:2] if len(parsed_questions) >= 2 else parsed_questions
    except Exception as e:
        print(f"Error generating coding questions: {e}")
        return []

def parse_mcq_questions(text_response):
    """Parses MCQ questions from the LLM response."""
    questions = []
    current_question = None
    
    # Split the text into lines and process each line
    lines = text_response.strip().split('\n')
    print(f"Parsing {len(lines)} lines of MCQ response")
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Start of a new question - more flexible matching
        if (re.match(r'^\d+\.\s*Question:', line) or 
            re.match(r'^\d+\.', line) or 
            line.lower().startswith('question')):
            if current_question:
                questions.append(current_question)
            current_question = {
                'question': re.sub(r'^(\d+\.)?\s*(Question:)?\s*', '', line).strip(),
                'options': [],
                'correct': None,
                'explanation': None
            }
            print(f"Found question: {current_question['question'][:50]}...")
        # Option line
        elif current_question and re.match(r'^[A-D]\)', line):
            option = line.split(')', 1)[1].strip()
            current_question['options'].append(option)
        # Correct answer line
        elif current_question and line.startswith('Correct:'):
            current_question['correct'] = line.split(':', 1)[1].strip()
        # Explanation line
        elif current_question and line.startswith('Explanation:'):
            current_question['explanation'] = line.split(':', 1)[1].strip()
            
    # Append the last question
    if current_question:
        questions.append(current_question)
        
    return [q for q in questions if len(q['options']) == 4 and q['correct'] and q['explanation']]

def generate_mcq_questions(topic):
    """Generates MCQ questions for a given topic using Langchain and Tavily search."""
    try:
        print(f"Generating MCQ questions for topic: {topic}")
        # Perform a web search for the topic
        search_results = tavily_search.invoke(topic)
        
        # Format search results for the prompt
        search_context = "\n".join([f"Source: {res.get('url', 'N/A')}\nContent: {res.get('content', 'N/A')}" for res in search_results])
        if not search_context:
            search_context = "No specific context found from web search."
            print("Warning: No search context available, using base knowledge only")
            
        response = mcq_chain.invoke({"topic": topic, "search_context": search_context})
        questions_text = response.get("text", "").strip()
        print(f"Raw MCQ response (first 200 chars): {questions_text[:200]}")
        
        questions = parse_mcq_questions(questions_text)
        print(f"Generated MCQ questions: {len(questions)}")
        
        # If no questions generated, try fallback without search context
        if not questions:
            print("Attempting fallback MCQ generation without search context...")
            fallback_response = mcq_chain.invoke({"topic": topic, "search_context": "Generate questions using your base knowledge."})
            questions = parse_mcq_questions(fallback_response.get("text", "").strip())
            print(f"Fallback generated {len(questions)} MCQ questions")
            
        return questions
    except Exception as e:
        print(f"Error generating MCQ questions: {e}")
        return []

if __name__ == '__main__':
    if not os.getenv("TOGETHER_API_KEY"):
        print("Please set the TOGETHER_API_KEY environment variable.")
    if not os.getenv("TAVILY_API_KEY"):
        print("Please set the TAVILY_API_KEY environment variable for web-augmented theory questions.")
    print("Running tests...")
    if os.getenv("TOGETHER_API_KEY"):
        # test_topic = "Graph Traversal Algorithms"
        while True:
            test_topic = input("Enter a topic for testing (send exit to quit): ")
            if test_topic.lower() != "exit":
                print(f"--- Generating Theory Questions for: {test_topic} (with web search if TAVILY_API_KEY is set) ---")
                theory_q = generate_theory_questions(test_topic)
                if theory_q:
                    for i, q_data in enumerate(theory_q):
                        print(f"{i+1}. {q_data['question']}") # Corrected here
                else:
                    print("No theory questions generated.")
                
                print(f"\n--- Generating Coding Questions for: {test_topic} ---")
                coding_q = generate_coding_questions(test_topic)
                if coding_q:
                    for i, q_data in enumerate(coding_q):
                        print(f"Question {i+1}:")
                        print(f"  Problem: {q_data['problem_statement']}") # Corrected here
                        print(f"  Constraints: {q_data.get('constraints', 'N/A')}") # Corrected here (though .get was fine, consistency)
                        print(f"  Input/Output: {q_data['input_output']}") # Corrected here
                        print(f"  Difficulty: {q_data['difficulty']}") # Corrected here
                else:
                    print("No coding questions generated.")
                
                print(f"\n--- Generating MCQ Questions for: {test_topic} ---")
                mcq_q = generate_mcq_questions(test_topic)
                if mcq_q:
                    for i, q_data in enumerate(mcq_q):
                        print(f"Question {i+1}:")
                        print(f"  Question: {q_data['question']}")
                        print(f"  Options: {', '.join(q_data['options'])}")
                        print(f"  Correct: {q_data['correct']}")
                        print(f"  Explanation: {q_data['explanation']}")
                else:
                    print("No MCQ questions generated.")
            else:
                break
    else:
        print("Skipping tests as API keys are not set.")

