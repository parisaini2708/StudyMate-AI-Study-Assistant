import { useState } from "react";
import { jsPDF } from "jspdf";
import "./App.css";
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [result, setResult] = useState("");
  const [activeTask, setActiveTask] = useState("");
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("studymate-dark-mode") === "true"
  );

  const toggleDarkMode = () => {
    setDarkMode((previous) => {
      const updated = !previous;
      localStorage.setItem("studymate-dark-mode", String(updated));
      return updated;
    });
  };

  const navigateTo = (page, sectionId = page) => {
    setActivePage(page);
    setMobileMenuOpen(false);

    window.setTimeout(() => {
      const target = document.getElementById(sectionId);

      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 80);
  };

  const tasks = [
    {
      id: "summary",
      title: "Smart Summary",
      description:
        "Transform lengthy documents into clear, easy-to-understand summaries.",
      icon: "✦",
      color: "purple",
      label: "QUICK READ",
    },
    {
      id: "notes",
      title: "Short Notes",
      description:
        "Create organized notes with headings and important information.",
      icon: "▤",
      color: "blue",
      label: "STUDY READY",
    },
    {
      id: "keypoints",
      title: "Important Key Points",
      description:
        "Identify the essential concepts and information from your material.",
      icon: "✧",
      color: "orange",
      label: "HIGHLIGHTS",
    },
    {
      id: "quiz",
      title: "Quiz Generator",
      description:
        "Challenge yourself with 10 AI-generated multiple-choice questions.",
      icon: "◎",
      color: "green",
      label: "TEST YOURSELF",
    },
    {
      id: "flashcards",
      title: "Flashcard Generator",
      description:
        "Turn important concepts into question-and-answer cards for quick revision.",
      icon: "▣",
      color: "purple",
      label: "QUICK REVISION",
    },
    {
      id: "explain",
      title: "Explain Simply",
      description:
        "Understand difficult concepts through simple explanations and examples.",
      icon: "✧",
      color: "blue",
      label: "EASY LEARNING",
    },
  ];

  const parseFlashcards = (text) => {
    const matches = [
      ...text.matchAll(
        /FLASHCARD\s*\d+\s*[\r\n]+QUESTION:\s*([\s\S]*?)\s*[\r\n]+ANSWER:\s*([\s\S]*?)(?=[\r\n]+FLASHCARD\s*\d+|$)/gi
      ),
    ];

    return matches.map((match) => ({
      question: match[1].trim(),
      answer: match[2].trim(),
    }));
  };

  const getTaskTitle = (task) => {
    const selectedTask = tasks.find((item) => item.id === task);
    return selectedTask ? selectedTask.title : "Study Material";
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) return;

    const validExtensions = [".pdf", ".docx"];
const fileName = selectedFile.name.toLowerCase();
const maxFileSize = 15 * 1024 * 1024;

if (selectedFile.size > maxFileSize) {
  alert("File size must not exceed 15 MB.");
  event.target.value = "";
  return;
}

    if (!validExtensions.some((extension) => fileName.endsWith(extension))) {
      alert("Please upload only PDF or DOCX files.");
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
    setExtractedText("");
    setResult("");
    setActiveTask("");
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a document first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);

     const response = await fetch(`${API_BASE_URL}/upload`, {
  method: "POST",
  body: formData,
});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to upload document.");
      }

      setExtractedText(data.extracted_text || "");
      setResult("");

      alert(
        data.message ||
          "Document uploaded and text extracted successfully."
      );

      navigateTo("tools");
    } catch (error) {
      alert(error.message || "Something went wrong while uploading.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (task) => {
    if (!extractedText) {
      alert("Please upload and extract a document first.");
      navigateTo("upload");
      return;
    }

    try {
      setAiLoading(true);
      setActiveTask(task);
      setResult("");
      setCurrentFlashcard(0);
      setShowFlashcardAnswer(false);

      const response = await fetch(`${API_BASE_URL}/generate`,{
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: extractedText,
          task: task,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "AI generation failed.");
      }

      setResult(data.result || "");
      navigateTo("results");
    } catch (error) {
      alert(error.message || "Unable to generate the result.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!result) {
      alert("There is no result to download.");
      return;
    }

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    const title = getTaskTitle(activeTask);

    let y = 20;

    const addHeader = () => {
      pdf.setFillColor(82, 42, 125);
      pdf.rect(0, 0, pageWidth, 32, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(19);
      pdf.text("StudyMate", margin, 14);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("AI Study Assistant", margin, 22);

      pdf.setFontSize(9);
      pdf.text(title, pageWidth - margin, 22, {
        align: "right",
      });

      pdf.setTextColor(45, 38, 55);
      y = 43;
    };

    const addFooter = () => {
      const pageNumber = pdf.internal.getNumberOfPages();

      pdf.setDrawColor(220, 214, 228);
      pdf.line(
        margin,
        pageHeight - 15,
        pageWidth - margin,
        pageHeight - 15
      );

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(130, 120, 140);

      pdf.text(
        "Generated using StudyMate AI Study Assistant",
        margin,
        pageHeight - 9
      );

      pdf.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 9, {
        align: "right",
      });
    };

    const checkPageSpace = (requiredSpace = 12) => {
      if (y + requiredSpace > pageHeight - 23) {
        addFooter();
        pdf.addPage();
        addHeader();
      }
    };
const cleanPdfText = (text) => {
  return String(text)
    .replace(/\r/g, "")
    .replace(/^\s*[-*+]\s+/gm, "- ")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/\*\*|__/g, "")
    .replace(/[*_`]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[ \t]+/g, " ")
    .trim();
};
body = cleanPdfText(body);
    const addSection = (heading, body) => {
      checkPageSpace(20);

      pdf.setFillColor(245, 239, 251);
      pdf.roundedRect(margin, y - 5, contentWidth, 10, 2, 2, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(92, 48, 135);
      pdf.text(heading, margin + 3, y + 1);

      y += 12;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(48, 43, 55);

      const lines = pdf.splitTextToSize(body, contentWidth - 4);

      lines.forEach((line) => {
        checkPageSpace(6);
        pdf.text(line, margin + 2, y);
        y += 5.5;
      });

      y += 5;
    };
text = cleanPdfText(text);
    const addPlainText = (text) => {
      const lines = pdf.splitTextToSize(text, contentWidth - 4);

      lines.forEach((line) => {
        checkPageSpace(6);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(48, 43, 55);
        pdf.text(line, margin + 2, y);
        y += 5.5;
      });
    };

    addHeader();

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(45, 35, 60);
    pdf.text(title, margin, y);
    y += 10;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(130, 120, 140);
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, margin, y);
    y += 12;

    const sections = result.split(
      /\n(?=(?:#{1,3}\s|[A-Z][A-Z\s]{2,}:))/
    );

    sections.forEach((section) => {
      const trimmed = section.trim();

      if (!trimmed) return;

      const lines = trimmed.split("\n");
      const firstLine = lines[0].replace(/^#{1,3}\s*/, "").trim();
      const remainingText = lines.slice(1).join("\n").trim();

      const isHeading =
        lines.length > 1 &&
        (section.startsWith("#") ||
          /^[A-Z][A-Z\s]{2,}:$/.test(firstLine));

      if (isHeading) {
        addSection(firstLine.replace(/:$/, ""), remainingText);
      } else {
        addPlainText(trimmed);
        y += 5;
      }
    });

    addFooter();

    const safeFileName = title
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();

    pdf.save(`StudyMate_${safeFileName}.pdf`);
  };

  const flashcards = parseFlashcards(result);

  const handleNextFlashcard = () => {
    if (currentFlashcard < flashcards.length - 1) {
      setCurrentFlashcard((previous) => previous + 1);
      setShowFlashcardAnswer(false);
    }
  };

  const handlePreviousFlashcard = () => {
    if (currentFlashcard > 0) {
      setCurrentFlashcard((previous) => previous - 1);
      setShowFlashcardAnswer(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setExtractedText("");
    setResult("");
    setActiveTask("");
    setCurrentFlashcard(0);
    setShowFlashcardAnswer(false);
    navigateTo("dashboard");
  };

  return (
    <div
      className={`app-shell ${mobileMenuOpen ? "menu-open" : ""} ${
        darkMode ? "dark-mode" : ""
      }`}
    >
      {mobileMenuOpen && (
        <button
          className="mobile-sidebar-overlay"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`sidebar ${mobileMenuOpen ? "mobile-expanded" : ""}`}
      >
        {/* MOBILE HAMBURGER - NOW INSIDE SIDEBAR */}

        <div className="sidebar-mobile-header">
          <button
            type="button"
            className="sidebar-mobile-toggle"
            aria-label={
              mobileMenuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={mobileMenuOpen}
            onClick={() =>
              setMobileMenuOpen((previous) => !previous)
            }
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        <div className="sidebar-brand">
          <div className="brand-icon">✦</div>

          <div className="brand-text">
            <h2>StudyMate</h2>
            <span>AI STUDY ASSISTANT</span>
          </div>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-heading">WORKSPACE</p>

          <button
            className={`nav-item ${
              activePage === "dashboard" ? "active" : ""
            }`}
            onClick={() => navigateTo("dashboard")}
          >
            <span className="nav-icon">⌂</span>
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "upload" ? "active" : ""
            }`}
            onClick={() => navigateTo("upload")}
          >
            <span className="nav-icon">⇧</span>
            <span>Upload Material</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "tools" ? "active" : ""
            }`}
            onClick={() => navigateTo("tools")}
          >
            <span className="nav-icon">✧</span>
            <span>AI Study Tools</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "results" ? "active" : ""
            }`}
            onClick={() => navigateTo("results")}
          >
            <span className="nav-icon">▤</span>
            <span>Generated Results</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "about" ? "active" : ""
            }`}
            onClick={() => navigateTo("about")}
          >
            <span className="nav-icon">ⓘ</span>
            <span>About StudyMate</span>
          </button>
        </div>

        <div className="sidebar-tools">
          <p className="sidebar-heading">AI STUDY TOOLS</p>

          {tasks.map((task) => (
            <button
              key={task.id}
              className="sidebar-tool"
              onClick={() => {
                if (!extractedText) {
                  navigateTo("upload");
                  return;
                }

                handleGenerate(task.id);
              }}
            >
              <span className={`tool-dot ${task.color}`}>
                {task.icon}
              </span>

              <span>{task.title}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-footer-icon">✦</div>

          <div>
            <strong>Study smarter.</strong>
            <span>Learn better with AI.</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <div className="breadcrumb">
              <span>Workspace</span>
              <span className="breadcrumb-divider">/</span>

              <strong>
                {activePage === "dashboard"
                  ? "Dashboard"
                  : activePage === "upload"
                    ? "Upload Material"
                    : activePage === "tools"
                      ? "AI Study Tools"
                      : activePage === "results"
                        ? "Generated Results"
                        : "About StudyMate"}
              </strong>
            </div>
          </div>

          <div className="topbar-right">
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleDarkMode}
              title={
                darkMode
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              aria-label={
                darkMode
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              <span>{darkMode ? "☀️" : "🌙"}</span>
              <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
            </button>

            <div className="topbar-status">
              <span className="status-dot"></span>
              <span className="status-text">AI Assistant Ready</span>
            </div>
          </div>
        </header>

        <div className="page-content">
          {/* DASHBOARD */}

          <section id="dashboard" className="dashboard-section">
            <div className="welcome-hero">
              <div className="hero-content">
                <span className="eyebrow">
                  YOUR PERSONAL AI STUDY COMPANION
                </span>

                <h1>
                  Welcome to <span>StudyMate.</span>
                </h1>

                <p>
                  Turn your study material into meaningful notes, smart
                  summaries, quizzes and more. Learn at your own pace
                  with the power of AI.
                </p>

                <button
                  className="primary-button hero-button"
                  onClick={() => navigateTo("upload")}
                >
                  Get Started <span>→</span>
                </button>
              </div>

              <div className="hero-visual">
                <div className="hero-orbit orbit-one"></div>
                <div className="hero-orbit orbit-two"></div>
                <div className="hero-book">✧</div>

                <div className="floating-card floating-card-one">
                  <span>✦</span> Smart learning
                </div>

                <div className="floating-card floating-card-two">
                  <span>✓</span> AI powered
                </div>
              </div>
            </div>

            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-icon purple">▤</div>

                <div>
                  <strong>PDF & DOCX</strong>
                  <span>Supported formats</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon blue">✧</div>

                <div>
                  <strong>06 TOOLS</strong>
                  <span>AI study features</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">⚡</div>

                <div>
                  <strong>AI POWERED</strong>
                  <span>Smart assistance</span>
                </div>
              </div>
            </div>

            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  GET MORE FROM YOUR MATERIAL
                </span>

                <h2>Your study workspace</h2>
                <p>Everything you need to make studying easier.</p>
              </div>
            </div>

            <div className="quick-action-grid">
              <button
                className="quick-action-card"
                onClick={() => navigateTo("upload")}
              >
                <span className="quick-action-icon purple">⇧</span>
                <strong>Upload Material</strong>
                <span>Choose a PDF or DOCX file</span>
                <span className="quick-action-arrow">→</span>
              </button>

              <button
                className="quick-action-card"
                onClick={() => navigateTo("tools")}
              >
                <span className="quick-action-icon blue">✧</span>
                <strong>Explore AI Tools</strong>
                <span>Discover your study tools</span>
                <span className="quick-action-arrow">→</span>
              </button>

              <button
                className="quick-action-card"
                onClick={() => navigateTo("results")}
              >
                <span className="quick-action-icon orange">▤</span>
                <strong>View Results</strong>
                <span>Access your generated content</span>
                <span className="quick-action-arrow">→</span>
              </button>
            </div>

            <div className="section-heading tools-preview-heading">
              <div>
                <span className="eyebrow">
                  STUDY SMARTER WITH AI
                </span>

                <h2>Explore your AI tools</h2>
                <p>Choose the right tool for your learning goal.</p>
              </div>

              <button
                className="text-button"
                onClick={() => navigateTo("tools")}
              >
                View all tools →
              </button>
            </div>

            <div className="tools-grid">
              {tasks.slice(0, 3).map((task) => (
                <div className="study-tool-card" key={task.id}>
                  <div className={`study-tool-icon ${task.color}`}>
                    {task.icon}
                  </div>

                  <span className="tool-label">{task.label}</span>
                  <h3>{task.title}</h3>
                  <p>{task.description}</p>

                  <button
                    className="tool-card-button"
                    onClick={() => navigateTo("tools")}
                  >
                    Explore tool <span>→</span>
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* UPLOAD MATERIAL */}

          <section id="upload" className="content-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  START YOUR STUDY SESSION
                </span>

                <h2>Upload your study material</h2>

                <p>
                  Upload a document and let StudyMate turn it into useful
                  learning content.
                </p>
              </div>
            </div>

            <div className="upload-layout">
              <div className="upload-card">
                <div className="upload-icon">⇧</div>

                <h3>Choose your document</h3>

                <p>
                  Select a PDF or Word document from your device to get
                  started.
                </p>

                <label className="file-picker">
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                  />

                  <span>Browse files</span>
                </label>

                <div className="supported-formats">
                  <span>PDF</span>
                  <span>DOCX</span>
                  <span>MAXIMUM SIZE: 15 MB</span>
                </div>

                {file && (
                  <div className="selected-file">
                    <span className="selected-file-icon">▤</span>

                    <div>
                      <strong>{file.name}</strong>

                      <span>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setExtractedText("");
                        setResult("");
                      }}
                      aria-label="Remove selected file"
                    >
                      ×
                    </button>
                  </div>
                )}

                <button
                  className="primary-button upload-button"
                  onClick={handleUpload}
                  disabled={loading || !file}
                >
                  {loading
                    ? "Extracting text..."
                    : "Upload & Extract Text"}

                  {!loading && <span>→</span>}
                </button>
              </div>

              <div className="upload-info-card">
                <span className="eyebrow">HOW IT WORKS</span>

                <h3>From document to learning in three steps.</h3>

                <div className="upload-step">
                  <span>01</span>

                  <div>
                    <strong>Upload your material</strong>
                    <p>Select your PDF or DOCX study document.</p>
                  </div>
                </div>

                <div className="upload-step">
                  <span>02</span>

                  <div>
                    <strong>Extract the content</strong>
                    <p>
                      StudyMate reads and extracts the document text.
                    </p>
                  </div>
                </div>

                <div className="upload-step">
                  <span>03</span>

                  <div>
                    <strong>Generate study resources</strong>
                    <p>
                      Choose an AI tool to create useful study content.
                    </p>
                  </div>
                </div>

                <div className="upload-tip">
                  <span>✦</span>

                  <p>
                    Tip: For better results, upload a document containing
                    selectable text rather than scanned images.
                  </p>
                </div>
              </div>
            </div>

            {extractedText && (
              <div className="extraction-success">
                <div className="success-icon">✓</div>

                <div>
                  <strong>Document extracted successfully!</strong>

                  <p>
                    Your material is ready. Go to AI Study Tools to choose
                    what you want to generate.
                  </p>
                </div>

                <button
                  className="text-button"
                  onClick={() => navigateTo("tools")}
                >
                  Continue →
                </button>
              </div>
            )}
          </section>

          {/* AI STUDY TOOLS */}

          <section id="tools" className="content-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  YOUR AI-POWERED STUDY SPACE
                </span>

                <h2>AI Study Tools</h2>

                <p>
                  Select a tool and transform your uploaded material into
                  something easier to study.
                </p>
              </div>

              <span className="tools-count">06 TOOLS</span>
            </div>

            {!extractedText && (
              <div className="notice-card">
                <span>ⓘ</span>

                <div>
                  <strong>Upload material to get started</strong>

                  <p>
                    You need to upload and extract a PDF or DOCX document
                    before generating study content.
                  </p>
                </div>

                <button
                  className="secondary-button"
                  onClick={() => navigateTo("upload")}
                >
                  Upload now →
                </button>
              </div>
            )}

            <div className="tools-grid full-tools-grid">
              {tasks.map((task) => (
                <div className="study-tool-card" key={task.id}>
                  <div className={`study-tool-icon ${task.color}`}>
                    {task.icon}
                  </div>

                  <span className="tool-label">{task.label}</span>
                  <h3>{task.title}</h3>
                  <p>{task.description}</p>

                  <button
                    className="tool-card-button"
                    disabled={!extractedText || aiLoading}
                    onClick={() => handleGenerate(task.id)}
                  >
                    {aiLoading && activeTask === task.id
                      ? "Generating..."
                      : "Generate with AI"}

                    <span>→</span>
                  </button>
                </div>
              ))}
            </div>

            {aiLoading && (
              <div className="generation-loading">
                <div className="loading-spinner"></div>

                <strong>
                  StudyMate is working on your material...
                </strong>

                <p>This may take a few moments.</p>
              </div>
            )}
          </section>

          {/* GENERATED RESULTS */}

          <section id="results" className="content-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  YOUR GENERATED STUDY MATERIAL
                </span>

                <h2>Generated Results</h2>

                <p>
                  Review your AI-generated content and download it as a PDF.
                </p>
              </div>
            </div>

            {result ? (
              <div className="result-card">
                <div className="result-header">
                  <div>
                    <span className="eyebrow">
                      STUDYMATE AI RESULT
                    </span>

                    <h3>{getTaskTitle(activeTask)}</h3>
                  </div>

                  <span className="result-status">
                    ✓ GENERATED
                  </span>
                </div>

                {activeTask === "flashcards" &&
                flashcards.length > 0 ? (
                  <div className="flashcard-area">
                    <div className="flashcard-progress">
                      <span>
                        CARD {currentFlashcard + 1} OF{" "}
                        {flashcards.length}
                      </span>

                      <div className="flashcard-progress-track">
                        <div
                          className="flashcard-progress-fill"
                          style={{
                            width: `${
                              ((currentFlashcard + 1) /
                                flashcards.length) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div
                      className={`flashcard ${
                        showFlashcardAnswer
                          ? "answer-visible"
                          : ""
                      }`}
                    >
                      <span className="flashcard-label">
                        {showFlashcardAnswer
                          ? "ANSWER"
                          : "QUESTION"}
                      </span>

                      <h3>
                        {showFlashcardAnswer
                          ? flashcards[currentFlashcard]?.answer
                          : flashcards[currentFlashcard]?.question}
                      </h3>

                      <button
                        className="secondary-button"
                        onClick={() =>
                          setShowFlashcardAnswer(
                            (previous) => !previous
                          )
                        }
                      >
                        {showFlashcardAnswer
                          ? "Show question"
                          : "Reveal answer"}
                      </button>
                    </div>

                    <div className="flashcard-controls">
                      <button
                        className="secondary-button"
                        onClick={handlePreviousFlashcard}
                        disabled={currentFlashcard === 0}
                      >
                        ← Previous
                      </button>

                      <button
                        className="primary-button"
                        onClick={handleNextFlashcard}
                        disabled={
                          currentFlashcard ===
                          flashcards.length - 1
                        }
                      >
                        Next card →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="result-content">
                    {result.split("\n").map((line, index) => {
                      const trimmedLine = line.trim();

                      if (!trimmedLine) {
                        return (
                          <div
                            className="result-spacer"
                            key={index}
                          />
                        );
                      }

                      if (/^#{1,3}\s/.test(trimmedLine)) {
                        return (
                          <h3 key={index}>
                            {trimmedLine.replace(/^#{1,3}\s*/, "")}
                          </h3>
                        );
                      }

                      if (/^\*\*.*\*\*$/.test(trimmedLine)) {
                        return (
                          <h3 key={index}>
                            {trimmedLine.replace(/\*\*/g, "")}
                          </h3>
                        );
                      }

                      if (/^[-•*]\s/.test(trimmedLine)) {
                        return (
                          <div
                            className="result-bullet"
                            key={index}
                          >
                            <span>•</span>

                            <p>
                              {trimmedLine.replace(/^[-•*]\s*/, "")}
                            </p>
                          </div>
                        );
                      }

                      if (/^\d+[\.)]\s/.test(trimmedLine)) {
                        return (
                          <p
                            className="result-numbered"
                            key={index}
                          >
                            {trimmedLine}
                          </p>
                        );
                      }

                      return <p key={index}>{trimmedLine}</p>;
                    })}
                  </div>
                )}

                <div className="result-actions">
                  <button
                    className="primary-button"
                    onClick={handleDownloadPDF}
                  >
                    ↓ Download as PDF
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() => navigateTo("tools")}
                  >
                    Generate another →
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-results">
                <div className="empty-results-icon">▤</div>

                <h3>No generated results yet</h3>

                <p>
                  Once you generate a summary, notes, quiz or other
                  study material, your result will appear here.
                </p>

                <button
                  className="primary-button"
                  onClick={() =>
                    navigateTo(
                      extractedText ? "tools" : "upload"
                    )
                  }
                >
                  {extractedText
                    ? "Explore AI Tools"
                    : "Upload Material"}

                  <span>→</span>
                </button>
              </div>
            )}
          </section>

          {/* ABOUT STUDYMATE */}

          <section id="about" className="content-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  ABOUT THE PLATFORM
                </span>

                <h2>Meet StudyMate</h2>

                <p>
                  An AI-powered study assistant designed to make learning
                  simpler, clearer and more productive.
                </p>
              </div>
            </div>

            <div className="about-card">
              <div className="about-brand-icon">✦</div>

              <h3>Study smarter, not harder.</h3>

              <p>
                StudyMate helps students transform their study documents
                into structured learning resources. By combining document
                text extraction with AI-powered content generation, it
                provides tools for summarising, revising, understanding
                and testing knowledge.
              </p>

              <div className="about-feature-grid">
                <div>
                  <span>01</span>
                  <strong>Document processing</strong>
                  <p>Upload PDF and DOCX study materials.</p>
                </div>

                <div>
                  <span>02</span>
                  <strong>AI content generation</strong>
                  <p>
                    Create useful learning resources from extracted text.
                  </p>
                </div>

                <div>
                  <span>03</span>
                  <strong>Interactive revision</strong>
                  <p>
                    Use quizzes and flashcards to revise concepts.
                  </p>
                </div>

                <div>
                  <span>04</span>
                  <strong>PDF export</strong>
                  <p>
                    Save generated study content for later use.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <footer className="page-footer">
            <span>© {new Date().getFullYear()} StudyMate</span>
            <span>Made to make learning easier. ✦</span>
          </footer>
        </div>
      </main>

      {/* MOBILE RESPONSIVE STYLES */}

      <style>{`
        /* Hide mobile hamburger on desktop */
        .sidebar-mobile-header {
          display: none;
        }

        .mobile-sidebar-overlay {
          display: none;
        }

        @media (max-width: 800px) {

          /* SIDEBAR */

          .sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            height: 100dvh !important;
            width: 75px !important;
            min-width: 75px !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
            z-index: 1101 !important;
            transition: width 0.28s ease, min-width 0.28s ease !important;
            padding-top: 0 !important;
          }

          .sidebar.mobile-expanded {
            width: min(270px, 82vw) !important;
            min-width: min(270px, 82vw) !important;
            box-shadow: 15px 0 45px rgba(30, 20, 45, 0.25) !important;
          }

          /* HAMBURGER INSIDE SIDEBAR */

          .sidebar-mobile-header {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 100% !important;
            height: 64px !important;
            flex-shrink: 0 !important;
            position: relative !important;
            z-index: 5 !important;
          }

          .sidebar-mobile-toggle {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 5px !important;
            width: 42px !important;
            height: 42px !important;
            padding: 10px !important;
            border: 1px solid rgba(140, 110, 180, 0.25) !important;
            border-radius: 11px !important;
            background: rgba(140, 110, 180, 0.10) !important;
            cursor: pointer !important;
            flex-shrink: 0 !important;
          }

          .sidebar-mobile-toggle span {
            display: block !important;
            width: 19px !important;
            height: 2px !important;
            border-radius: 5px !important;
            background: #7955d9 !important;
            transition: all 0.2s ease !important;
          }

          .app-shell.dark-mode .sidebar-mobile-toggle {
            background: #30243f !important;
            border-color: #49365f !important;
          }

          .app-shell.dark-mode .sidebar-mobile-toggle span {
            background: #d2adff !important;
          }

          /* SIDEBAR COLLAPSED CONTENT */

          .sidebar .brand-text,
          .sidebar .sidebar-heading,
          .sidebar .nav-item span:not(.nav-icon),
          .sidebar .sidebar-tool span:not(.tool-dot),
          .sidebar .sidebar-footer > div:last-child {
            display: none !important;
          }

          .sidebar .sidebar-brand {
            justify-content: center !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          .sidebar .nav-item,
          .sidebar .sidebar-tool {
            justify-content: center !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          .sidebar .sidebar-footer {
            justify-content: center !important;
          }

          /* SIDEBAR EXPANDED CONTENT */

          .sidebar.mobile-expanded .brand-text,
          .sidebar.mobile-expanded .nav-item span:not(.nav-icon),
          .sidebar.mobile-expanded .sidebar-tool span:not(.tool-dot),
          .sidebar.mobile-expanded .sidebar-footer > div:last-child {
            display: flex !important;
          }

          .sidebar.mobile-expanded .sidebar-heading {
            display: block !important;
          }

          .sidebar.mobile-expanded .sidebar-brand {
            justify-content: flex-start !important;
            padding-left: 20px !important;
            padding-right: 12px !important;
          }

          .sidebar.mobile-expanded .nav-item,
          .sidebar.mobile-expanded .sidebar-tool {
            justify-content: flex-start !important;
            padding-left: 18px !important;
            padding-right: 12px !important;
          }

          .sidebar.mobile-expanded .sidebar-footer {
            justify-content: flex-start !important;
          }

          /* OVERLAY */

          .mobile-sidebar-overlay {
            display: block !important;
            position: fixed !important;
            inset: 0 !important;
            z-index: 1100 !important;
            width: 100% !important;
            height: 100% !important;
            border: 0 !important;
            background: rgba(20, 14, 30, 0.42) !important;
            cursor: pointer !important;
          }

          /* MAIN CONTENT */

          .main-content {
            margin-left: 75px !important;
            width: calc(100% - 75px) !important;
            min-width: 0 !important;
          }

          /* TOPBAR */

          .topbar {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 8px !important;
            width: 100% !important;
            min-width: 0 !important;
            min-height: 68px !important;
            padding: 10px 12px !important;
            flex-wrap: nowrap !important;
          }

          .topbar-left {
            display: flex !important;
            align-items: center !important;
            flex: 1 1 auto !important;
            min-width: 0 !important;
            overflow: hidden !important;
          }

          .breadcrumb {
            display: flex !important;
            align-items: center !important;
            gap: 5px !important;
            min-width: 0 !important;
            overflow: hidden !important;
            white-space: nowrap !important;
            font-size: 12px !important;
          }

          .breadcrumb strong {
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }

          .topbar-right {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            gap: 9px !important;
            flex: 0 0 auto !important;
            min-width: 0 !important;
          }

          .theme-toggle {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 6px !important;
            padding: 8px 10px !important;
            min-width: 38px !important;
            flex-shrink: 0 !important;
            white-space: nowrap !important;
          }

          .topbar-status {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 6px !important;
            flex-shrink: 0 !important;
            white-space: nowrap !important;
          }

          /* PAGE CONTENT */

          .page-content {
            min-width: 0 !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
        }

        /* SMALL MOBILE SCREENS */

        @media (max-width: 480px) {

          .topbar {
            gap: 5px !important;
            padding-left: 10px !important;
            padding-right: 9px !important;
          }

          .breadcrumb {
            font-size: 11px !important;
          }

          .breadcrumb > span:first-child,
          .breadcrumb .breadcrumb-divider {
            display: none !important;
          }

          .topbar-right {
            gap: 7px !important;
          }

          .theme-toggle {
            width: 36px !important;
            height: 36px !important;
            padding: 7px !important;
          }

          .theme-toggle span:last-child {
            display: none !important;
          }

          .topbar-status {
            font-size: 0 !important;
            gap: 0 !important;
          }

          .topbar-status .status-text {
            display: none !important;
          }

          .topbar-status .status-dot {
            display: inline-block !important;
            width: 8px !important;
            height: 8px !important;
            border-radius: 50% !important;
          }

          .sidebar.mobile-expanded {
            width: min(280px, 82vw) !important;
            min-width: min(280px, 82vw) !important;
          }
        }

        /* =========================================
           FINAL MOBILE SIDEBAR FIXES
        ========================================= */

        @media (max-width: 800px) {

          /* HAMBURGER: ABSOLUTE LEFT EDGE */

          .sidebar.mobile-expanded .sidebar-mobile-header {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-start !important;
            padding-left: 0 !important;
            position: relative !important;
          }

          .sidebar.mobile-expanded .sidebar-mobile-toggle {
            position: absolute !important;
            top: 12px !important;
            left: 0 !important;
            right: auto !important;
            margin: 0 !important;
            align-self: flex-start !important;
          }

          /* BRAND: PREVENT TEXT OVERLAPPING */

          .sidebar.mobile-expanded .sidebar-brand {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-start !important;
            gap: 12px !important;
            padding-left: 18px !important;
            padding-right: 14px !important;
          }

          .sidebar.mobile-expanded .brand-text {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            justify-content: center !important;
            gap: 3px !important;
            min-width: 0 !important;
            flex: 1 !important;
            white-space: normal !important;
            line-height: 1.3 !important;
          }

          .sidebar.mobile-expanded .brand-text > * {
            max-width: 100% !important;
            white-space: normal !important;
            overflow-wrap: break-word !important;
          }

          /* FOOTER: PREVENT TEXT OVERLAPPING */

          .sidebar.mobile-expanded .sidebar-footer {
            display: flex !important;
            align-items: flex-start !important;
            justify-content: flex-start !important;
            gap: 10px !important;
            width: 100% !important;
            min-width: 0 !important;
            padding: 15px 12px 10px !important;
            box-sizing: border-box !important;
          }

          .sidebar.mobile-expanded .sidebar-footer > div:last-child {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            justify-content: center !important;
            gap: 4px !important;
            flex: 1 !important;
            min-width: 0 !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            line-height: 1.5 !important;
          }

          .sidebar.mobile-expanded .sidebar-footer strong,
          .sidebar.mobile-expanded .sidebar-footer span {
            max-width: 100% !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            line-height: 1.5 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default App;