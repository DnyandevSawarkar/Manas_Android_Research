// Mock Interview Test Generator Script
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
    const endTestBtn = document.getElementById("endTestBtn");
    const testResults = document.getElementById("testResults");
    const correctCount = document.getElementById("correctCount");
    const incorrectCount = document.getElementById("incorrectCount");

    // State variables
    let timer;
    let aptitudeTimeLeft = 3600; // 60 minutes
    let codingTimeLeft = 3600; // 60 minutes
    let currentSectionName = "aptitude";
    let userAnswers = new Map();
    let correctAnswers = new Map();
    let totalScore = 0;
    let currentMockTestData = null;
    let testEnded = false;

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
        endTest();
    }

    function switchSection() {
        if (currentSectionName === "aptitude") {
            // Only allow switching from aptitude to coding
            aptitudeSection.style.display = "none";
            codingSection.style.display = "block";
            nextSectionBtn.style.display = "none"; // Hide button after switching
            startTimer("coding");
        }
    }

    function endTest() {
        clearInterval(timer);
        testEnded = true;

        // Calculate final scores
        let correct = 0;
        let incorrect = 0;
        let finalScore = 0;

        userAnswers.forEach((answer, questionId) => {
            const correctAnswer = correctAnswers.get(questionId);
            if (answer === correctAnswer) {
                correct++;
                finalScore += 4;
            } else {
                incorrect++;
                finalScore = Math.max(0, finalScore - 1);
            }
        });

        // Update scores
        scoreValue.textContent = finalScore;
        correctCount.textContent = correct;
        incorrectCount.textContent = incorrect;

        // Show results
        testResults.style.display = "block";

        // Disable all MCQ buttons and highlight correct/incorrect answers
        document.querySelectorAll('.mcq-question').forEach(questionDiv => {
            const buttons = questionDiv.querySelectorAll('.mcq-option');
            const correctAnswer = questionDiv.dataset.correctAnswer;
            const userAnswer = userAnswers.get(questionDiv.dataset.questionId);

            buttons.forEach(button => {
                button.disabled = true;
                const optionLetter = button.dataset.option;
                if (optionLetter === correctAnswer) {
                    button.classList.add('result-correct');
                } else if (optionLetter === userAnswer && userAnswer !== correctAnswer) {
                    button.classList.add('result-incorrect');
                }
            });
        });

        // Hide navigation buttons
        nextSectionBtn.style.display = "none";
        endTestBtn.style.display = "none";

        alert(`Test completed!\nFinal Score: ${finalScore}\nCorrect Answers: ${correct}\nIncorrect Answers: ${incorrect}`);
    }

    // MCQ Functions
    function createMCQQuestion(questionData, index) {
        const questionDiv = document.createElement("div");
        questionDiv.className = "mcq-question";
        questionDiv.dataset.questionId = String(index);
        questionDiv.dataset.correctAnswer = questionData.correct;

        const questionHeader = document.createElement("h4");
        questionHeader.textContent = `${index + 1}. ${questionData.question}`;
        questionDiv.appendChild(questionHeader);

        const optionsDiv = document.createElement("div");
        optionsDiv.className = "mcq-options";

        // Format options to match new backend format
        const letters = ['A', 'B', 'C', 'D'];
        questionData.options.forEach((optionText, i) => {
            const optionBtn = document.createElement("button");
            optionBtn.className = "mcq-option";
            optionBtn.textContent = `${letters[i]}) ${optionText}`;
            optionBtn.dataset.option = letters[i];
            optionBtn.onclick = () => handleMCQAnswer(optionBtn);
            optionsDiv.appendChild(optionBtn);
        });

        questionDiv.appendChild(optionsDiv);
        return questionDiv;
    }

    function handleMCQAnswer(optionElement) {
        if (testEnded) return; // Prevent answers after test ends

        const questionDiv = optionElement.closest(".mcq-question");
        const options = questionDiv.getElementsByClassName("mcq-option");
        const correctAnswer = questionDiv.dataset.correctAnswer;
        const questionId = questionDiv.dataset.questionId;
        
        Array.from(options).forEach(opt => opt.classList.remove("selected"));
        optionElement.classList.add("selected");
        
        const selectedAnswer = optionElement.dataset.option;
        userAnswers.set(questionId, selectedAnswer);
    }

    function calculateFinalScore() {
        return totalScore;
    }

    // Event Listeners
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
        mockTestOutput.style.display = "block";
        
        // Disable topic input and coding checkbox immediately
        topicInput.disabled = true;
        includeCodingCheckbox.disabled = true;
        includeCodingCheckbox.style.opacity = "0.5";
        generateBtn.style.opacity = "0.5";
        
        try {
            const response = await fetch("/generate_mock_test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    topic,
                    includeCoding: includeCodingCheckbox.checked
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            currentMockTestData = data;

            // Display MCQ questions
            theoryQuestionsTableBody.innerHTML = "";
            if (data.mcq_questions && data.mcq_questions.length > 0) {
                data.mcq_questions.forEach((q, index) => {
                    const mcqQuestion = createMCQQuestion(q, index);
                    theoryQuestionsTableBody.appendChild(mcqQuestion);
                    correctAnswers.set(String(index), q.correct);
                });
            } else {
                theoryQuestionsTableBody.innerHTML = "<div class='no-questions'>No MCQ questions generated.</div>";
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

            // Start the timer
            startTimer();

            // Permanently disable generate button and topic input
            generateBtn.disabled = true;
            generateBtn.style.opacity = "0.5";
            topicInput.disabled = true;
            generateBtn.textContent = "Test in Progress";

        } catch (error) {
            console.error("Error:", error);
            alert(`Error generating test: ${error.message}`);
            
            // Re-enable inputs only if there's an error
            topicInput.disabled = false;
            includeCodingCheckbox.disabled = false;
            includeCodingCheckbox.style.opacity = "1";
            generateBtn.disabled = false;
            generateBtn.style.opacity = "1";
            generateBtn.textContent = "Generate Mock Test";
        }
    });

    nextSectionBtn.addEventListener("click", switchSection);
    includeCodingCheckbox.addEventListener("change", () => {
        codingSection.style.display = includeCodingCheckbox.checked ? "block" : "none";
        nextSectionBtn.style.display = includeCodingCheckbox.checked ? "block" : "none";
    });

    endTestBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to end the test? This action cannot be undone.")) {
            endTest();
        }
    });

    // Export and Copy functionality
    exportPdfBtn.addEventListener("click", async () => {
        if (!currentMockTestData) {
            alert("Please generate a mock test first.");
            return;
        }

        const testData = {
            ...currentMockTestData,
            score: totalScore,
            userAnswers: Array.from(userAnswers.entries()),
            timeRemaining: {
                aptitude: aptitudeTimeLeft,
                coding: codingTimeLeft
            }
        };

        try {
            const response = await fetch("/export_pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(testData)
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `mock_test_${topicInput.value.replace(/\s+/g, "_")}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error:", error);
            alert(`Error exporting PDF: ${error.message}`);
        }
    });

    // Initialize
    mockTestOutput.style.display = "none";
    currentScore.style.display = "none";
    nextSectionBtn.style.display = "none";
    timeRemaining.textContent = "60:00";
});
