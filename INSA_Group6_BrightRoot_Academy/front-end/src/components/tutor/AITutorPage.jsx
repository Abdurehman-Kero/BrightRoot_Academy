import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button, Badge, Spinner, Form, ProgressBar } from "react-bootstrap";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import axios from "axios";
import "./AITutorPage.css";

const API = "http://localhost:8000/api/tutor";

const AITutorPage = ({ onBack, token }) => {
  // --- Basic Chat State ---
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [convTitle, setConvTitle] = useState("New Chat");
  const [apiError, setApiError] = useState(null);

  // --- Split Screen & Material State ---
  const [isMaterialOpen, setIsMaterialOpen] = useState(true);
  const [materialFile, setMaterialFile] = useState(null); // { name, url, type, blob }
  const [isUploading, setIsUploading] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState("material"); // 'material' or 'quiz'

  // --- Quiz State ---
  const [quizData, setQuizData] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizInstructions, setQuizInstructions] = useState("");

  // --- Subject/Grade ---
  const [newSubject, setNewSubject] = useState("");
  const [newGrade, setNewGrade] = useState("");
  const [newLanguage, setNewLanguage] = useState("en");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const materialInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}` };

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Setup speech recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = newLanguage === "am" ? "am-ET" : "en-US";

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((r) => r[0].transcript)
          .join("");
        setInput(transcript);
      };

      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, [newLanguage]);

  const loadConversations = async () => {
    try {
      const res = await axios.get(`${API}/conversations/`, { headers });
      setConversations(res.data);
    } catch (err) {
      console.error("Load conversations error:", err);
    }
  };

  const loadMessages = async (convId) => {
    try {
      const res = await axios.get(`${API}/conversations/${convId}/messages/`, { headers });
      setMessages(res.data.messages);
      setSuggestions(res.data.suggestions?.map((s) => s.question) || []);
      setConvTitle(res.data.conversation.title);
      setNewSubject(res.data.conversation.subject || "");
      setNewGrade(res.data.conversation.grade || "");
      setActiveConvId(convId);
    } catch (err) {
      console.error("Load messages error:", err);
    }
  };

  const createNewChat = async () => {
    try {
      const res = await axios.post(
        `${API}/conversations/`,
        { subject: newSubject || undefined, grade: newGrade || undefined, language: newLanguage },
        { headers: { ...headers, "Content-Type": "application/json" } }
      );
      setActiveConvId(res.data.id);
      setMessages([]);
      setSuggestions([]);
      setConvTitle(res.data.title);
      loadConversations();
    } catch (err) {
      console.error("Create conversation error:", err);
    }
  };

  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API}/conversations/${convId}/`, { headers });
      if (activeConvId === convId) {
        setActiveConvId(null);
        setMessages([]);
      }
      loadConversations();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleSend = async (customMessage) => {
    const msg = customMessage || input.trim();
    if ((!msg && !selectedImage) || isStreaming) return;

    // Check if user is asking for a quiz
    const quizKeywords = ["generate quiz", "quiz me", "test me", "give me a quiz"];
    if (quizKeywords.some(k => msg.toLowerCase().includes(k))) {
       handleGenerateQuiz(msg);
    }

    // Add user message to UI
    const userMsg = { role: "user", content: msg, image_url: imagePreview };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreamingText("");
    setIsStreaming(true);
    setSuggestions([]);

    let convId = activeConvId;
    if (!convId) {
      try {
        const res = await axios.post(
          `${API}/conversations/`,
          { subject: newSubject || undefined, grade: newGrade || undefined, language: newLanguage },
          { headers: { ...headers, "Content-Type": "application/json" } }
        );
        convId = res.data.id;
        setActiveConvId(convId);
      } catch {
        setIsStreaming(false);
        return;
      }
    }

    try {
      const formData = new FormData();
      let contextStr = "";
      if (materialFile) {
        contextStr = `[Context: I am reading a document titled "${materialFile.name}". `;
        if (materialFile.textContent) {
          contextStr += `Document excerpt: ${materialFile.textContent.substring(0, 1500)}... `;
        }
        contextStr += `] `;
      }
      formData.append("message", contextStr + msg);

      if (selectedImage) {
        formData.append("image", selectedImage);
      } else if (materialFile && materialFile.blob) {
        formData.append("image", materialFile.blob);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(`${API}/conversations/${convId}/send/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok && !response.body) {
        const errText = await response.text().catch(() => "");
        throw new Error(`Server returned ${response.status}: ${errText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "chunk") {
                fullText += data.content;
                setStreamingText(fullText);
              } else if (data.type === "quota_error") {
                setApiError(data.content);
              } else if (data.type === "suggestions") {
                setSuggestions(data.content);
              } else if (data.type === "title") {
                setConvTitle(data.content);
                loadConversations();
              } else if (data.type === "done") {
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: fullText },
                ]);
                setStreamingText("");
              } else if (data.type === "error") {
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: `⚠️ Error: ${data.content}` },
                ]);
                setStreamingText("");
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error("Send error:", err);
      const errMsg = err.message || "";
      if (err.name === "AbortError") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "⏱️ Request timed out (20s)." },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ Error: ${errMsg || "Connection failed."}` },
        ]);
      }
      setStreamingText("");
    } finally {
      setIsStreaming(false);
      setSelectedImage(null);
      setImagePreview(null);
      loadConversations();
      inputRef.current?.focus();
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleMaterialSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const isText = file.type === "text/plain" || file.name.endsWith(".txt");
      
      if (isText) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setMaterialFile({
            name: file.name,
            url: url,
            type: file.type,
            blob: file,
            textContent: event.target.result
          });
        };
        reader.readAsText(file);
      } else {
        setMaterialFile({
          name: file.name,
          url: url,
          type: file.type,
          blob: file
        });
      }
      setActiveRightTab("material");
    }
  };

  const handleGenerateQuiz = async (topicFromChat) => {
    setIsGeneratingQuiz(true);
    setActiveRightTab("quiz");
    setQuizData(null);
    setQuizAnswers({});
    setShowQuizResults(false);

    try {
      const formData = new FormData();
      if (materialFile?.blob) {
        formData.append("file", materialFile.blob);
      }
      formData.append("topic", topicFromChat || materialFile?.name || "General Study");
      formData.append("subject", newSubject);
      formData.append("grade", newGrade);
      if (quizInstructions) {
        formData.append("instructions", quizInstructions);
      }

      const res = await axios.post(`${API}/generate-quiz`, formData, {
        headers: { 
          ...headers,
          "Content-Type": "multipart/form-data"
        }
      });

      setQuizData(res.data.quiz);
    } catch (err) {
      console.error("Quiz generation error:", err);
      alert("Failed to generate quiz. Please try again.");
      setActiveRightTab("material");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleAnswerChange = (qId, option) => {
    if (showQuizResults) return;
    setQuizAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const submitQuiz = () => {
    setShowQuizResults(true);
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessage = (content) => (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ node, className, children, ...props }) {
          const isBlock = className && className.startsWith("language-");
          return isBlock ? (
            <pre className="code-block">
              <code className={className} {...props}>{children}</code>
            </pre>
          ) : (
            <code className="inline-code" {...props}>{children}</code>
          );
        },
        blockquote({ children }) {
          return <blockquote className="ai-blockquote">{children}</blockquote>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );

  return (
    <div className="tutor-layout">
      {apiError && (
        <div className="api-error-banner">
          <div className="api-error-content">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>Gemini API Quota Exceeded</strong>
            <span className="api-error-steps">Update GEMINI_API_KEY in Backend/.env</span>
          </div>
          <button className="api-error-close" onClick={() => setApiError(null)}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      )}

      <div className="tutor-body">
        {/* --- Sidebar --- */}
        <div className={`tutor-sidebar ${sidebarOpen ? "open" : "closed"}`}>
          <div className="sidebar-top">
            <Button variant="outline-success" className="w-100 new-chat-btn" onClick={createNewChat}>
              <i className="bi bi-plus-lg me-2"></i>New Chat
            </Button>
            <div className="sidebar-options mt-2">
              <Form.Select
                size="sm"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="mb-1"
              >
                <option value="">Choose Subject</option>
                <option value="Maths">📐 Maths</option>
                <option value="Physics">⚡ Physics</option>
                <option value="Chemistry">🧪 Chemistry</option>
                <option value="Biology">🌿 Biology</option>
                <option value="English">📖 English</option>
                <option value="History">🏛️ History</option>
              </Form.Select>
              <Form.Select
                size="sm"
                value={newGrade}
                onChange={(e) => setNewGrade(e.target.value)}
                className="mb-1"
              >
                <option value="">Choose Grade</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
              </Form.Select>
              <Form.Select
                size="sm"
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
              >
                <option value="en">🇬🇧 English</option>
                <option value="am">🇪🇹 አማርኛ</option>
              </Form.Select>
            </div>
          </div>

          <div className="sidebar-conversations">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conv-item ${activeConvId === conv.id ? "active" : ""}`}
                onClick={() => loadMessages(conv.id)}
              >
                <div className="conv-icon">
                  <i className="bi bi-chat-text"></i>
                </div>
                <div className="conv-info">
                  <span className="conv-title">{conv.title}</span>
                  <span className="conv-meta">
                    {conv.subject && <Badge bg="dark" className="me-1">{conv.subject}</Badge>}
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <button className="conv-delete" onClick={(e) => deleteConversation(conv.id, e)}>
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* --- Main Split Content --- */}
        <div className="tutor-content-split">
          
          {/* LEFT: Chat Section */}
          <div className="tutor-main-section">
            <div className="tutor-topbar">
              <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <i className={`bi ${sidebarOpen ? "bi-layout-sidebar" : "bi-layout-sidebar-inset"}`}></i>
              </button>
              <h6 className="topbar-title">
                <i className="bi bi-robot me-2 text-success"></i>
                {convTitle || "BrightRoot AI"}
              </h6>
              <button className="material-toggle ms-auto" onClick={() => setIsMaterialOpen(!isMaterialOpen)}>
                <i className={`bi ${isMaterialOpen ? "bi-book-fill" : "bi-book"}`}></i>
                <span className="ms-2 d-none d-md-inline">{isMaterialOpen ? "Hide Material" : "Show Material"}</span>
              </button>
            </div>

            <div className="tutor-messages">
              {messages.length === 0 && !streamingText && (
                <div className="welcome-screen">
                  <div className="welcome-icon"><i className="bi bi-mortarboard-fill"></i></div>
                  <h3>AI Study Buddy</h3>
                  <p className="text-secondary">Upload your material on the right to start a focused session.</p>
                  <div className="starter-prompts">
                    {["Explain this concept", "Summarize the material", "Generate a quiz", "Give me practice questions"].map((p, i) => (
                      <button key={i} className="starter-btn" onClick={() => handleSend(p)}>
                        <i className="bi bi-lightning-charge me-2"></i>{p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`message ${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === "user" ? <i className="bi bi-person-fill"></i> : <i className="bi bi-robot"></i>}
                  </div>
                  <div className="message-content">
                    {msg.image_url && <img src={msg.image_url} alt="Uploaded" className="message-image" />}
                    {msg.role === "user" ? <p>{msg.content}</p> : <div className="markdown-body">{renderMessage(msg.content)}</div>}
                  </div>
                </div>
              ))}
              {streamingText && (
                <div className="message assistant">
                  <div className="message-avatar"><i className="bi bi-robot"></i></div>
                  <div className="message-content">
                    <div className="markdown-body">{renderMessage(streamingText)}<span className="typing-cursor">▊</span></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {suggestions.length > 0 && !isStreaming && (
              <div className="suggestions-bar">
                {suggestions.map((s, i) => (
                  <button key={i} className="suggestion-btn" onClick={() => handleSend(s)}>
                    <i className="bi bi-arrow-return-right me-1"></i>{s}
                  </button>
                ))}
              </div>
            )}

            <div className="tutor-input-area">
              <div className="input-container">
                <button className="input-action-btn" onClick={() => fileInputRef.current?.click()} title="Upload image">
                  <i className="bi bi-image"></i>
                </button>
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} style={{ display: "none" }} />
                
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask your tutor about the material..."
                  rows={1}
                  className="chat-input"
                  disabled={isStreaming}
                />
                <button className="send-btn" onClick={() => handleSend()} disabled={(!input.trim() && !selectedImage) || isStreaming}>
                  {isStreaming ? <Spinner size="sm" variant="light" /> : <i className="bi bi-send-fill"></i>}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Material/Quiz Section */}
          <div className={`tutor-material-section ${isMaterialOpen ? "open" : "closed"}`}>
            <div className="material-header">
              <div className="d-flex gap-2">
                <Button 
                  size="sm" 
                  variant={activeRightTab === "material" ? "success" : "outline-secondary"}
                  onClick={() => setActiveRightTab("material")}
                >
                  <i className="bi bi-file-earmark-text me-1"></i>Study Material
                </Button>
                <Button 
                  size="sm" 
                  variant={activeRightTab === "quiz" ? "success" : "outline-secondary"}
                  onClick={() => setActiveRightTab("quiz")}
                  disabled={!materialFile && !activeConvId}
                >
                  <i className="bi bi-patch-question me-1"></i>AI Quiz
                </Button>
              </div>
              {activeRightTab === "material" && materialFile && (
                <Button size="sm" variant="outline-danger" onClick={() => setMaterialFile(null)}>
                  <i className="bi bi-trash"></i>
                </Button>
              )}
            </div>

            <div className="material-content">
              {activeRightTab === "material" ? (
                <>
                  {!materialFile ? (
                    <div className="material-upload-box" onClick={() => materialInputRef.current?.click()}>
                      <i className="bi bi-cloud-arrow-up"></i>
                      <h5>Upload Study Material</h5>
                      <p>Upload PDF or TXT to study side-by-side</p>
                      <input type="file" ref={materialInputRef} accept=".pdf,.txt" onChange={handleMaterialSelect} style={{ display: "none" }} />
                    </div>
                  ) : (
                    <div className="h-100 d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-center mb-2 gap-2">
                        <h6 className="mb-0 text-truncate">{materialFile.name}</h6>
                        <div className="d-flex gap-2">
                          <Form.Control
                            size="sm"
                            type="text"
                            placeholder="Quiz focus (e.g. Chapter 1)"
                            value={quizInstructions}
                            onChange={(e) => setQuizInstructions(e.target.value)}
                            style={{ width: "200px" }}
                          />
                          <Button size="sm" variant="success" onClick={() => handleGenerateQuiz()}>
                            Generate Quiz
                          </Button>
                        </div>
                      </div>
                      {materialFile.type === "application/pdf" ? (
                        <iframe src={materialFile.url} className="pdf-viewer" title="Material"></iframe>
                      ) : (
                        <div className="text-viewer">
                          {materialFile.textContent || "Reading file content..."}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="quiz-container">
                  {isGeneratingQuiz ? (
                    <div className="text-center py-5">
                      <Spinner animation="border" variant="success" className="mb-3" />
                      <h5 className="text-light">AI is crafting your quiz...</h5>
                      <p className="text-secondary">Analyzing material and generating questions.</p>
                    </div>
                  ) : quizData ? (
                    <>
                      <div className="quiz-header">
                        <h4 className="text-light">Self-Assessment Quiz</h4>
                        <p className="text-secondary">Test your understanding of the material.</p>
                      </div>
                      {quizData.map((q, idx) => (
                        <div key={q.id} className="quiz-card">
                          <div className="quiz-question">{idx + 1}. {q.question}</div>
                          <div className="quiz-options">
                            {q.options.map((opt, i) => {
                              const isSelected = quizAnswers[q.id] === opt;
                              const isCorrect = q.correct === opt;
                              let className = "quiz-option";
                              if (isSelected) className += " selected";
                              if (showQuizResults) {
                                if (isCorrect) className += " correct";
                                else if (isSelected) className += " wrong";
                                className += " disabled";
                              }
                              return (
                                <button key={i} className={className} onClick={() => handleAnswerChange(q.id, opt)}>
                                  <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                                  {opt}
                                  {showQuizResults && isCorrect && <i className="bi bi-check-circle-fill ms-auto"></i>}
                                  {showQuizResults && isSelected && !isCorrect && <i className="bi bi-x-circle-fill ms-auto"></i>}
                                </button>
                              );
                            })}
                          </div>
                          {showQuizResults && q.explanation && (
                            <div className="quiz-explanation">
                              <strong>Explanation:</strong> {q.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                      {!showQuizResults ? (
                        <Button 
                          variant="success" 
                          className="w-100 py-3 mb-4" 
                          onClick={submitQuiz}
                          disabled={Object.keys(quizAnswers).length < quizData.length}
                        >
                          Submit Quiz
                        </Button>
                      ) : (
                        <Button variant="outline-success" className="w-100 py-3 mb-4" onClick={() => handleGenerateQuiz()}>
                          Retry with New Questions
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-5">
                      <i className="bi bi-patch-question text-secondary" style={{ fontSize: "3rem" }}></i>
                      <h5 className="text-light mt-3">Ready to test yourself?</h5>
                      <p className="text-secondary">Click the button below to generate a quiz based on your study material.</p>
                      <Button variant="success" onClick={() => handleGenerateQuiz()}>Generate Quiz Now</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AITutorPage;
