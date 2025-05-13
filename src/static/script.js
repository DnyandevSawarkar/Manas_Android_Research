document.addEventListener("DOMContentLoaded", () => {
    const topicInput = document.getElementById("topicInput");
    const generateBtn = document.getElementById("generateBtn");
    const mockTestOutput = document.getElementById("mockTestOutput");
    const theoryQuestionsTableBody = document.getElementById("theoryQuestionsTableBody");
    const codingQuestionsTableBody = document.getElementById("codingQuestionsTableBody");
    const exportPdfBtn = document.getElementById("exportPdfBtn");
    const copyClipboardBtn = document.getElementById("copyClipboardBtn");

    let currentMockTestData = null; // To store the latest generated data for PDF export

    generateBtn.addEventListener("click", async () => {
        const topic = topicInput.value.trim();
        if (!topic) {
            alert("Please enter a topic.");
            return;
        }

        generateBtn.disabled = true;
        generateBtn.textContent = "Generating...";

        theoryQuestionsTableBody.innerHTML = "<tr><td colspan=\"2\">Loading...</td></tr>";
        codingQuestionsTableBody.innerHTML = "<tr><td colspan=\"4\">Loading...</td></tr>";
        mockTestOutput.style.display = "block";
        currentMockTestData = null; // Reset data

        try {
            const response = await fetch("/generate_mock_test", {
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
            currentMockTestData = data; // Store for PDF export

            theoryQuestionsTableBody.innerHTML = ""; // Clear loading message
            if (data.theory_questions && data.theory_questions.length > 0) {
                data.theory_questions.forEach((q, index) => {
                    const row = theoryQuestionsTableBody.insertRow();
                    row.insertCell().textContent = index + 1;
                    row.insertCell().textContent = q.question;
                });
            } else {
                theoryQuestionsTableBody.innerHTML = "<tr><td colspan=\"2\">No theory questions generated.</td></tr>";
            }

            codingQuestionsTableBody.innerHTML = ""; // Clear loading message
            if (data.coding_questions && data.coding_questions.length > 0) {
                data.coding_questions.forEach((q, index) => {
                    const row = codingQuestionsTableBody.insertRow();
                    row.insertCell().textContent = index + 1;
                    row.insertCell().textContent = q.problem_statement;
                    row.insertCell().textContent = q.difficulty;
                    row.insertCell().textContent = q.input_output;
                });
            } else {
                codingQuestionsTableBody.innerHTML = "<tr><td colspan=\"4\">No coding questions generated.</td></tr>";
            }

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
            const response = await fetch("/export_pdf", {
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
