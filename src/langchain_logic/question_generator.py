# /home/ubuntu/mock_interview_app/src/langchain_logic/question_generator.py

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

# Updated theory prompt to include search_context
theory_prompt = PromptTemplate(template=theory_prompt_template_str, input_variables=["topic", "search_context"])
coding_prompt = PromptTemplate(template=coding_prompt_template_str, input_variables=["topic"])

theory_chain = LLMChain(llm=llm, prompt=theory_prompt)
coding_chain = LLMChain(llm=llm, prompt=coding_prompt)

def generate_theory_questions(topic):
    """Generates theory questions for a given topic using Langchain and Tavily search."""
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
        questions_list = [q.strip() for q in questions_text.split("\n") if q.strip() and q.strip()[0].isdigit()]
        print(f"Generated theory questions: {len(questions_list)}")
        return [{"question": q.split(". ", 1)[1] if ". " in q else q} for q in questions_list]
    except Exception as e:
        print(f"Error generating theory questions: {e}")
        # Fallback to generation without search if Tavily fails (e.g. API key issue)
        try:
            print("Falling back to theory question generation without web search.")
            # Corrected fallback prompt loading to avoid issues if search_context placeholders are still there
            base_theory_prompt_str = load_prompt_template("/home/ubuntu/mock_interview_app/src/langchain_logic/theory_prompt_template.txt")
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
                current_question["difficulty"] = line_stripped.split(":", 1)[1].strip()
                active_field = "difficulty"
        elif active_field and current_question: # Append to the last active field if it spans multiple lines
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
        print(f"Generated coding questions: {len(questions_text.split('\n'))}")
        return parse_coding_questions(questions_text)
    except Exception as e:
        print(f"Error generating coding questions: {e}")
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
            else:
                break
    else:
        print("Skipping tests as API keys are not set.")

