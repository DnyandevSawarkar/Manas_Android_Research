document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const topicInput = document.getElementById("topicInput");
    const generateBtn = document.getElementById("generateBtn");
    const mockTestOutput = document.getElementById("mockTestOutput");
    const theoryQuestionsTableBody = document.getElementById("theoryQuestionsTableBody");
    const codingQuestionsTableBody = document.getElementById("codingQuestionsTableBody");
    const exportPdfBtn = document.getElementById("exportPdfBtn");
    const copyClipboardBtn = document.getElementById("copyClipboardBtn");
    const includeCodingCheckbox = document.getElementById("includeCoding");
    const timeRemaining = document.getElementById("timeRemaining");
    const currentSection = document.getElementById("currentSection");
    const nextSectionBtn = document.getElementById("nextSectionBtn");
    const aptitudeSection = document.getElementById("aptitudeSection");
    const codingSection = document.getElementById("codingSection");
    const currentScore = document.getElementById("currentScore");
    const scoreValue = document.getElementById("scoreValue");
    
    // State variables
    let timer;
    let aptitudeTimeLeft = 3600; // 60 minutes
    let codingTimeLeft = 3600; // 60 minutes
    let currentSectionName = "aptitude";
    let userAnswers = new Map();
    let correctAnswers = new Map();
    let totalScore = 0;
    let currentMockTestData = null;

    // Timer Functions
    function startTimer(section = "aptitude") {
        if (timer) clearInterval(timer);
        
        currentSectionName = section;
        currentSection.textContent = section === "aptitude" ? "Aptitude Section" : "Coding Section";
        
        timer = setInterval(() => {
            const timeLeft = section === "aptitude" ? aptitudeTimeLeft : codingTimeLeft;
            
            if (timeLeft <= 0) {
                handleSectionTimeout();
                return;
            }
            
            if (section === "aptitude") {
                aptitudeTimeLeft--;
                timeRemaining.textContent = formatTime(aptitudeTimeLeft);
            } else {
                codingTimeLeft--;
                timeRemaining.textContent = formatTime(codingTimeLeft);
            }
        }, 1000);
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    function handleSectionTimeout() {
        if (currentSectionName === "aptitude") {
            if (includeCodingCheckbox.checked) {
                switchSection();
            } else {
                endTest();
            }
        } else {
            endTest();
        }
    }

    function switchSection() {
        if (currentSectionName === "aptitude") {
            aptitudeSection.style.display = "none";
            codingSection.style.display = "block";
            nextSectionBtn.textContent = "Return to Aptitude Section";
            startTimer("coding");
        } else {
            aptitudeSection.style.display = "block";
            codingSection.style.display = "none";
            nextSectionBtn.textContent = "Proceed to Coding Section";
            startTimer("aptitude");
        }
    }

    function endTest() {
        clearInterval(timer);
        
        // Disable all interaction
        const allInputs = document.querySelectorAll('input, button.mcq-option');
        allInputs.forEach(input => input.disabled = true);
        
        // Show test results section
        const testResults = document.getElementById('testResults');
        testResults.style.display = 'block';
        
        // Update score and stats
        const scoreValue = document.getElementById('scoreValue');
        const correctCount = document.getElementById('correctCount');
        const incorrectCount = document.getElementById('incorrectCount');
        
        scoreValue.textContent = totalScore;
        correctCount.textContent = Array.from(userAnswers.values()).filter(answer => 
            correctAnswers.get(answer.questionId) === answer.value
        ).length;
        incorrectCount.textContent = userAnswers.size - Number(correctCount.textContent);
        
        // Show correct answers in MCQ section
        const mcqQuestions = document.querySelectorAll('.mcq-question');
        mcqQuestions.forEach(question => {
            const options = question.querySelectorAll('.mcq-option');
            const correctAnswer = question.dataset.correctAnswer;
            options.forEach(option => {
                if (option.dataset.option === correctAnswer) {
                    option.classList.add('result-correct');
                } else if (option.classList.contains('selected')) {
                    option.classList.add('result-incorrect');
                }
                option.disabled = true;
            });
        });
        
        // Show correct answers in coding section
        const codingRows = document.querySelectorAll('#codingQuestionsTableBody tr');
        codingRows.forEach(row => {
            // Add a new cell for expected output if it exists
            const expectedOutputCell = row.insertCell();
            const questionIndex = row.cells[0].textContent - 1;
            if (currentMockTestData?.coding_questions?.[questionIndex]?.expected_output) {
                expectedOutputCell.textContent = "Expected Output: " + currentMockTestData.coding_questions[questionIndex].expected_output;
            }
            row.classList.add('completed-question');
        });
        
        // Disable navigation and test control buttons
        const nextSectionBtn = document.getElementById('nextSectionBtn');
        const endTestBtn = document.getElementById('endTestBtn');
        if (nextSectionBtn) nextSectionBtn.style.display = 'none';
        if (endTestBtn) endTestBtn.style.display = 'none';
        
        // Show both sections for review
        document.getElementById('aptitudeSection').style.display = 'block';
        document.getElementById('codingSection').style.display = 'block';
    }

    // MCQ Functions
    function createMCQQuestion(questionData, index) {
        const questionDiv = document.createElement("div");
        questionDiv.className = "mcq-question";
        questionDiv.dataset.correctAnswer = questionData.correct_answer;

        const questionHeader = document.createElement("h4");
        questionHeader.textContent = `${index + 1}. ${questionData.question}`;
        questionDiv.appendChild(questionHeader);

        const optionsDiv = document.createElement("div");
        optionsDiv.className = "mcq-options";

        questionData.options.forEach(option => {
            const optionBtn = document.createElement("button");
            optionBtn.className = "mcq-option";
            optionBtn.textContent = `${option.letter}) ${option.text}`;
            optionBtn.dataset.option = option.letter;
            optionBtn.onclick = () => handleMCQAnswer(optionBtn);
            optionsDiv.appendChild(optionBtn);
        });

        questionDiv.appendChild(optionsDiv);
        return questionDiv;
    }

    function handleMCQAnswer(optionElement) {
        const questionDiv = optionElement.closest(".mcq-question");
        const options = questionDiv.getElementsByClassName("mcq-option");
        const correctAnswer = questionDiv.dataset.correctAnswer;
        
        Array.from(options).forEach(opt => opt.classList.remove("selected", "correct", "incorrect"));
        optionElement.classList.add("selected");
        
        const selectedAnswer = optionElement.dataset.option;
        const questionId = questionDiv.dataset.questionId;
        
        if (selectedAnswer === correctAnswer) {
            optionElement.classList.add("correct");
            if (!userAnswers.has(questionId)) {
                totalScore += 4;
            }
        } else {
            optionElement.classList.add("incorrect");
            if (!userAnswers.has(questionId)) {
                totalScore = Math.max(0, totalScore - 1);
            }
        }
        
        userAnswers.set(questionId, selectedAnswer);
        scoreValue.textContent = totalScore;
    }

    // Add checkbox change handler
    includeCodingCheckbox.addEventListener("change", () => {
        if (!includeCodingCheckbox.checked) {
            codingSection.style.display = "none";
            if (nextSectionBtn) nextSectionBtn.style.display = "none";
            currentSectionName = "aptitude";
            clearInterval(timer);
            startTimer("aptitude");
        }
    });

    generateBtn.addEventListener("click", async () => {
        const topic = topicInput.value.trim();
        if (!topic) {
            alert("Please enter a topic.");
            return;
        }

        // Reset test state
        aptitudeTimeLeft = 3600;
        codingTimeLeft = 3600;
        totalScore = 0;
        scoreValue.textContent = "0";
        currentScore.style.display = "block";
        userAnswers.clear();
        correctAnswers.clear();

        generateBtn.disabled = true;
        generateBtn.textContent = "Generating...";

        theoryQuestionsTableBody.innerHTML = "<tr><td colspan=\"2\">Loading...</td></tr>";
        codingQuestionsTableBody.innerHTML = "<tr><td colspan=\"4\">Loading...</td></tr>";
        mockTestOutput.style.display = "block";
        currentMockTestData = null; // Reset data

        try {
            const response = await fetch(`${config.apiUrl}/generate_mock_test`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ topic }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            currentMockTestData = data;

            // Display MCQ questions
            theoryQuestionsTableBody.innerHTML = "";
            if (data.theory_questions && data.theory_questions.length > 0) {
                data.theory_questions.forEach((q, index) => {
                    const mcqQuestion = createMCQQuestion(q, index);
                    theoryQuestionsTableBody.appendChild(mcqQuestion);
                    correctAnswers.set(String(index), q.correct_answer);
                });
            } else {
                theoryQuestionsTableBody.innerHTML = "<div class='no-questions'>No theory questions generated.</div>";
            }

            // Display coding questions if included
            codingQuestionsTableBody.innerHTML = "";
            if (includeCodingCheckbox.checked && data.coding_questions && data.coding_questions.length > 0) {
                data.coding_questions.forEach((q, index) => {
                    const row = codingQuestionsTableBody.insertRow();
                    row.insertCell().textContent = index + 1;
                    row.insertCell().textContent = q.problem_statement;
                    row.insertCell().textContent = q.difficulty;
                    row.insertCell().textContent = q.input_output;
                });
                nextSectionBtn.style.display = "block";
                codingSection.style.display = "none";  // Initially hide coding section
            } else {
                codingQuestionsTableBody.innerHTML = "<tr><td colspan='4'>No coding questions included</td></tr>";
                nextSectionBtn.style.display = "none";
                codingSection.style.display = "none";
            }

            // Reset section visibility
            aptitudeSection.style.display = "block";

            // Start the timer
            startTimer("aptitude");
            currentSectionName = "aptitude";

        } catch (error) {
            console.error("Error generating mock test:", error);
            alert(`Failed to generate mock test: ${error.message}`);
            theoryQuestionsTableBody.innerHTML = "<tr><td colspan=\"2\">Error loading questions.</td></tr>";
            codingQuestionsTableBody.innerHTML = "<tr><td colspan=\"4\">Error loading questions.</td></tr>";
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = "Generate Mock Test";
        }
    });

    exportPdfBtn.addEventListener("click", async () => {
        if (!currentMockTestData || (!currentMockTestData.theory_questions && !currentMockTestData.coding_questions)) {
            alert("Please generate a mock test first before exporting to PDF.");
            return;
        }

        exportPdfBtn.disabled = true;
        exportPdfBtn.textContent = "Exporting...";

        try {
            const response = await fetch(`${config.apiUrl}/export_pdf`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(currentMockTestData), // Send the stored data
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            const topicSlug = (currentMockTestData.topic || "mock_test").toLowerCase().replace(/\s+/g, "_");
            a.download = `${topicSlug}_mock_test.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            alert("PDF exported successfully!");

        } catch (error) {
            console.error("Error exporting PDF:", error);
            alert(`Failed to export PDF: ${error.message}`);
        } finally {
            exportPdfBtn.disabled = false;
            exportPdfBtn.textContent = "Export as PDF";
        }
    });

    copyClipboardBtn.addEventListener("click", () => {
        if (!currentMockTestData) {
            alert("Please generate a mock test first before copying to clipboard.");
            return;
        }

        let textToCopy = `Mock Test for Topic: ${currentMockTestData.topic || "N/A"}\n\n`;
        textToCopy += "Theory Questions:\n";
        if (currentMockTestData.theory_questions && currentMockTestData.theory_questions.length > 0) {
            currentMockTestData.theory_questions.forEach((q, index) => {
                textToCopy += `${index + 1}. ${q.question}\n`;
            });
        } else {
            textToCopy += "No theory questions generated.\n";
        }
        
        textToCopy += "\nCoding Questions:\n";
        if (currentMockTestData.coding_questions && currentMockTestData.coding_questions.length > 0) {
            currentMockTestData.coding_questions.forEach((q, index) => {
                textToCopy += `\nQuestion ${index + 1}:\n`;
                textToCopy += `  Problem Statement: ${q.problem_statement}\n`;
                textToCopy += `  Difficulty: ${q.difficulty}\n`;
                textToCopy += `  Constraints: ${q.constraints || "N/A"}\n`;
                textToCopy += `  Sample Input/Output: ${q.input_output}\n`;
            });
        } else {
            textToCopy += "No coding questions generated.\n";
        }

        navigator.clipboard.writeText(textToCopy)
            .then(() => alert("Mock test copied to clipboard!"))
            .catch(err => {
                console.error("Failed to copy text: ", err);
                alert("Failed to copy to clipboard. Please try again or copy manually.");
            });
    });

    mockTestOutput.style.display = "none";
});
