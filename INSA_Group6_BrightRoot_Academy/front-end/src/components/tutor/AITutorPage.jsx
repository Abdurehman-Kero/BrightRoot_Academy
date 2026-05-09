import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button, Badge, Spinner, Form } from "react-bootstrap";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import axios from "axios";
import "./AITutorPage.css";

const API = "http://localhost:8000/api/tutor";

const AITutorPage = ({ onBack, token }) => {
  // State
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
  const [apiError, setApiError] = useState(null); // quota / key errors

  // Subject/Grade for new conversations
  const [newSubject, setNewSubject] = useState("");
  const [newLanguage, setNewLanguage] = useState("en");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
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
      setActiveConvId(convId);
    } catch (err) {
      console.error("Load messages error:", err);
    }
  };

  const createNewChat = async () => {
    try {
      const res = await axios.post(
        `${API}/conversations/`,
        { subject: newSubject || undefined, language: newLanguage },
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

    // Add user message to UI
    const userMsg = { role: "user", content: msg, image_url: imagePreview };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreamingText("");
    setIsStreaming(true);
    setSuggestions([]);

    // Auto-create conversation if none active
    let convId = activeConvId;
    if (!convId) {
      try {
        const res = await axios.post(
          `${API}/conversations/`,
          { subject: newSubject || undefined, language: newLanguage },
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
      // Build form data for image support
      const formData = new FormData();
      formData.append("message", msg);
      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      // SSE streaming — abort after 20 seconds if no response
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(`${API}/conversations/${convId}/send/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check for non-streaming HTTP error (e.g., 401, 500 before headers sent)
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
                // Distinct quota/key error event — show the banner immediately
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

      // Detect quota / key errors in the streamed content
      if (fullText.includes("quota") || fullText.includes("rate limit") || fullText.includes("API key not valid")) {
        setApiError(fullText);
      }
    } catch (err) {
      console.error("Send error:", err);
      const errMsg = err.message || "";

      // AbortError = our 20-second timeout fired
      if (err.name === "AbortError") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "⏱️ Request timed out (20s). The AI service may be overloaded — please try again." },
        ]);
      } else if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("rate limit")) {
        setApiError("Gemini API free-tier quota exceeded. Get a new API key at https://aistudio.google.com/app/apikey and update GEMINI_API_KEY in Backend/.env");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "⚠️ API quota exceeded. See the banner above for how to fix this." },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ Error: ${errMsg || "Connection failed. Please try again."}` },
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

  // Render a single message with markdown + KaTeX
  // NOTE: react-markdown v10 removed the `inline` prop from code components.
  // We detect inline code by checking if the parent is a <pre> element.
  const renderMessage = (content) => (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ node, className, children, ...props }) {
          // If className contains 'language-' it's a fenced code block (block-level)
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

      {/* ── API Quota / Key Error Banner ── */}
      {apiError && (
        <div className="api-error-banner">
          <div className="api-error-content">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>Gemini API Quota Exceeded</strong> — The free-tier daily limit has been hit.
            <span className="api-error-steps">
              <b>Fix:</b> Get a new API key at{" "}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
                aistudio.google.com
              </a>
              {" "}→ paste it into <code>Backend/.env</code> as <code>GEMINI_API_KEY=...</code> → restart the backend.
            </span>
          </div>
          <button className="api-error-close" onClick={() => setApiError(null)}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      )}

      {/* Sidebar + Main wrapped in flex row */}
      <div className="tutor-body">

      {/* Sidebar */}
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
              <option value="">All Subjects</option>
              <option value="Maths">Maths</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
              <option value="English">English</option>
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
              <button
                className="conv-delete"
                onClick={(e) => deleteConversation(conv.id, e)}
              >
                <i className="bi bi-trash"></i>
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="no-conversations">
              <i className="bi bi-chat-square-text"></i>
              <p>No conversations yet</p>
            </div>
          )}
        </div>

        <div className="sidebar-bottom">
          <p className="sidebar-hint">Use the top nav to switch pages</p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="tutor-main">
        {/* Top Bar */}
        <div className="tutor-topbar">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <i className={`bi ${sidebarOpen ? "bi-layout-sidebar" : "bi-layout-sidebar-inset"}`}></i>
          </button>
          <h6 className="topbar-title mb-0">
            <i className="bi bi-robot me-2 text-success"></i>
            {convTitle || "BrightRoot AI Tutor"}
          </h6>
          <Badge bg="dark" className="ms-auto">
            {newLanguage === "am" ? "🇪🇹 አማርኛ" : "🇬🇧 English"}
          </Badge>
        </div>

        {/* Messages */}
        <div className="tutor-messages">
          {messages.length === 0 && !streamingText && (
            <div className="welcome-screen">
              <div className="welcome-icon">
                <i className="bi bi-mortarboard-fill"></i>
              </div>
              <h3>BrightRoot AI Tutor</h3>
              <p className="text-secondary">
                Your personal AI tutor for the Ethiopian curriculum.
                <br />Ask me anything about Maths, Physics, Chemistry, Biology, or English!
              </p>
              <div className="starter-prompts">
                {[
                  "Explain the quadratic formula step by step",
                  "What is Newton's second law of motion?",
                  "Help me understand photosynthesis",
                  "Solve: 2x² + 5x - 3 = 0",
                ].map((prompt, i) => (
                  <button key={i} className="starter-btn" onClick={() => handleSend(prompt)}>
                    <i className="bi bi-lightning-charge me-2"></i>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === "user" ? (
                  <i className="bi bi-person-fill"></i>
                ) : (
                  <i className="bi bi-robot"></i>
                )}
              </div>
              <div className="message-content">
                {msg.image_url && (
                  <img src={msg.image_url} alt="Uploaded" className="message-image" />
                )}
                {msg.role === "user" ? (
                  <p>{msg.content}</p>
                ) : (
                  <div className="markdown-body">{renderMessage(msg.content)}</div>
                )}
              </div>
            </div>
          ))}

          {/* Streaming response */}
          {streamingText && (
            <div className="message assistant">
              <div className="message-avatar">
                <i className="bi bi-robot"></i>
              </div>
              <div className="message-content">
                <div className="markdown-body">
                  {renderMessage(streamingText)}
                  <span className="typing-cursor">▊</span>
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isStreaming && !streamingText && (
            <div className="message assistant">
              <div className="message-avatar">
                <i className="bi bi-robot"></i>
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && !isStreaming && (
          <div className="suggestions-bar">
            {suggestions.map((s, i) => (
              <button key={i} className="suggestion-btn" onClick={() => handleSend(s)}>
                <i className="bi bi-arrow-return-right me-1"></i>{s}
              </button>
            ))}
          </div>
        )}

        {/* Image Preview */}
        {imagePreview && (
          <div className="image-preview-bar">
            <img src={imagePreview} alt="Preview" />
            <button onClick={() => { setSelectedImage(null); setImagePreview(null); }}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        )}

        {/* Input Area */}
        <div className="tutor-input-area">
          <div className="input-container">
            <button className="input-action-btn" onClick={() => fileInputRef.current?.click()} title="Upload image">
              <i className="bi bi-image"></i>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: "none" }}
            />
            <button
              className={`input-action-btn ${isListening ? "listening" : ""}`}
              onClick={toggleVoice}
              title="Voice input"
            >
              <i className={`bi ${isListening ? "bi-mic-fill" : "bi-mic"}`}></i>
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Ask your AI tutor anything..."}
              rows={1}
              className="chat-input"
              disabled={isStreaming}
            />
            <button
              className="send-btn"
              onClick={() => handleSend()}
              disabled={(!input.trim() && !selectedImage) || isStreaming}
            >
              {isStreaming ? (
                <Spinner size="sm" variant="light" />
              ) : (
                <i className="bi bi-send-fill"></i>
              )}
            </button>
          </div>
          <p className="input-disclaimer">
            BrightRoot AI Tutor uses Google Gemini. Responses may not always be accurate.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default AITutorPage;
