document.addEventListener("DOMContentLoaded", () => {
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
    
    let timer;
    let secondsLeft = 3600; // 60 minutes
    let currentSectionName = "aptitude";
    let userAnswers = new Map();
    let correctAnswers = new Map();
    let currentMockTestData = null;

    function updateTimer() {
        const minutes = Math.floor(secondsLeft / 60);
        const seconds = secondsLeft % 60;
        timeRemaining.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (secondsLeft <= 0) {
            if (currentSectionName === "aptitude") {
                switchToNextSection();
            } else {
                endTest();
            }
        } else {
            secondsLeft--;
        }
    }
    
    function startTimer() {
        clearInterval(timer);
        secondsLeft = 3600; // Reset to 60 minutes
        updateTimer();
        timer = setInterval(updateTimer, 1000);
    }
    
    function switchToNextSection() {
        clearInterval(timer);
        if (currentSectionName === "aptitude") {
            // Calculate and display MCQ score
            calculateMCQScore();
            if (includeCodingCheckbox.checked) {
                currentSectionName = "coding";
                currentSection.textContent = "Coding Section";
                aptitudeSection.style.display = "none";
                codingSection.style.display = "block";
                startTimer();
            } else {
                endTest();
            }
        }
    }
    
    function calculateMCQScore() {
        let score = 0;
        userAnswers.forEach((answer, questionId) => {
            if (correctAnswers.has(questionId)) {
                if (answer === correctAnswers.get(questionId)) {
                    score += 4; // +4 for correct answer
                } else {
                    score -= 1; // -1 for incorrect answer
                }
            }
        });
        scoreValue.textContent = score;
        currentScore.style.display = "block";
        return score;
    }
    
    function endTest() {
        clearInterval(timer);
        timeRemaining.textContent = "Time's up!";
        calculateMCQScore();
        // Disable all inputs
        document.querySelectorAll('input[type="radio"]').forEach(input => {
            input.disabled = true;
        });
    }

    function createMCQQuestion(question, index) {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'mcq-question';
        questionDiv.innerHTML = `
            <p><strong>${index + 1}. ${question.question}</strong></p>
            <div class="mcq-options">
                ${question.options.map((option, i) => `
                    <label class="mcq-option">
                        <input type="radio" name="q${index}" value="${String.fromCharCode(65 + i)}">
                        ${String.fromCharCode(65 + i)}) ${option}
                    </label>
                `).join('')}
            </div>
        `;
        
        // Store correct answer
        correctAnswers.set(`q${index}`, question.correct);
        
        // Add event listener to track user's answer
        const radioButtons = questionDiv.querySelectorAll('input[type="radio"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                userAnswers.set(`q${index}`, e.target.value);
            });
        });
        
        return questionDiv;
    }

    generateBtn.addEventListener("click", async () => {
        const topic = topicInput.value.trim();
        if (!topic) {
            alert("Please enter a topic");
            return;
        }

        generateBtn.disabled = true;
        generateBtn.textContent = "Generating...";

        theoryQuestionsTableBody.innerHTML = "<div>Loading...</div>";
        codingQuestionsTableBody.innerHTML = "<div>Loading...</div>";
        mockTestOutput.style.display = "block";
        currentMockTestData = null;

        try {
            const response = await fetch("/generate_mock_test", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                    topic,
                    include_coding: includeCodingCheckbox.checked
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            currentMockTestData = data;

            // Clear loading messages
            theoryQuestionsTableBody.innerHTML = "";
            codingQuestionsTableBody.innerHTML = "";

            // Display MCQ questions
            if (data.mcq_questions && data.mcq_questions.length > 0) {
                data.mcq_questions.forEach((q, index) => {
                    theoryQuestionsTableBody.appendChild(createMCQQuestion(q, index));
                });
            } else {
                theoryQuestionsTableBody.innerHTML = "<div>No MCQ questions generated.</div>";
            }

            // Display coding questions if included
            if (data.include_coding) {
                if (data.coding_questions && data.coding_questions.length > 0) {
                    codingSection.innerHTML = `
                        <h2>Section 2: Coding Test (60 minutes)</h2>
                        ${data.coding_questions.map((q, index) => `
                            <div class="coding-question">
                                <h3>Question ${index + 1}</h3>
                                <p><strong>Problem Statement:</strong> ${q.problem_statement}</p>
                                <p><strong>Constraints:</strong> ${q.constraints}</p>
                                <pre class="input-output">${q.input_output}</pre>
                                <p><strong>Difficulty:</strong> ${q.difficulty}</p>
                            </div>
                        `).join('')}
                    `;
                } else {
                    codingSection.innerHTML = "<div>No coding questions generated.</div>";
                }
            }

            // Start the timer for the first section
            startTimer();
            nextSectionBtn.style.display = data.include_coding ? "block" : "none";

        } catch (error) {
            console.error("Error:", error);
            alert(`Failed to generate test: ${error.message}`);
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = "Generate Mock Test";
        }
    });

    nextSectionBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to proceed to the coding section? You cannot return to the MCQ section.")) {
            switchToNextSection();
        }
    });

    exportPdfBtn.addEventListener("click", async () => {
        if (!currentMockTestData) {
            alert("Please generate a mock test first.");
            return;
        }

        try {
            const score = calculateMCQScore();
            const dataToExport = {
                ...currentMockTestData,
                mcq_score: score
            };

            const response = await fetch("/export_pdf", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(dataToExport),
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `mock_test_${currentMockTestData.topic.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error:", error);
            alert("Failed to export PDF. Please try again.");
        }
    });

    // Initially hide the test output
    mockTestOutput.style.display = "none";
});
