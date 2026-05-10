import React, { useState, useEffect, useRef } from "react";
import { Container, Row, Col, Card, Badge, Button, Spinner, Form, OverlayTrigger, Tooltip } from "react-bootstrap";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import "./CurriculumPage.css";

const API = "http://localhost:8000/api";

const CurriculumPage = ({ onBack, token }) => {
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [loading, setLoading] = useState(true);

  // Library States
  const [myFiles, setMyFiles] = useState([]);
  const [uploadingCategory, setUploadingCategory] = useState(null);
  const fileInputRef = useRef(null);
  
  // Reading States
  const [readingFile, setReadingFile] = useState(null);
  
  // Chat States
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [activeConvId, setActiveConvId] = useState(null);
  const chatEndRef = useRef(null);

  const apiHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    loadSubjectsAndGrades();
  }, []);

  useEffect(() => {
    if (selectedSubject && selectedGrade) {
      loadMyFiles();
    }
  }, [selectedSubject, selectedGrade]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const loadSubjectsAndGrades = async () => {
    try {
      const [subRes, gradeRes] = await Promise.all([
        axios.get(`${API}/curriculum/subjects/`),
        axios.get(`${API}/curriculum/grades/`),
      ]);
      setSubjects(subRes.data);
      setGrades(gradeRes.data);
    } catch (error) {
      console.error("Failed to load subjects/grades:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyFiles = async () => {
    try {
      const res = await axios.get(
        `${API}/notes/files/?subject=${selectedSubject.name}&grade=${selectedGrade.label.replace(" ", "")}`,
        { headers: apiHeaders }
      );
      setMyFiles(res.data);
    } catch (err) {
      console.error("Failed to load user files:", err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadingCategory) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);
      formData.append("description", uploadingCategory);
      formData.append("subject", selectedSubject.name);
      formData.append("grade", selectedGrade.label.replace(" ", ""));

      await axios.post(`${API}/notes/upload/`, formData, { 
        headers: apiHeaders 
      });
      loadMyFiles();
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload file.");
    } finally {
      setUploadingCategory(null);
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm("Delete this material?")) return;
    try {
      await axios.delete(`${API}/notes/files/${fileId}/`, { headers: apiHeaders });
      if (readingFile && readingFile.id === fileId) setReadingFile(null);
      loadMyFiles();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const triggerUpload = (category) => {
    setUploadingCategory(category);
    fileInputRef.current?.click();
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: msg }]);
    setIsChatting(true);

    let convId = activeConvId;
    try {
      if (!convId) {
        // Create conversation
        const res = await axios.post(
          `${API}/tutor/conversations/`,
          { subject: selectedSubject.name, grade: selectedGrade.label.replace(" ", ""), language: "en", title: "Library Assistant" },
          { headers: apiHeaders }
        );
        convId = res.data.id;
        setActiveConvId(convId);
      }

      // We append a temporary assistant message to stream into
      setChatMessages(prev => [...prev, { role: "assistant", content: "" }]);

      const formData = new FormData();
      formData.append("message", `[Context: I am reading a file named ${readingFile ? readingFile.title : 'Nothing specific'}.] ${msg}`);

      const response = await fetch(`${API}/tutor/conversations/${convId}/send/`, {
        method: "POST",
        headers: apiHeaders,
        body: formData,
      });

      if (!response.ok) throw new Error("Chat request failed");

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
                setChatMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1].content = fullText;
                  return updated;
                });
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages(prev => {
        const updated = [...prev];
        if (updated[updated.length - 1].content === "") {
          updated[updated.length - 1].content = "Sorry, I encountered an error. Please try again.";
        }
        return updated;
      });
    } finally {
      setIsChatting(false);
    }
  };

  const categorizeFiles = (category) => {
    return myFiles.filter(f => f.description === category || (category === "Other" && !["Text Book", "PPT", "Reference"].includes(f.description)));
  };

  const renderFileSection = (title, category, icon) => {
    const files = categorizeFiles(category);
    return (
      <Card className="bg-dark text-light border-secondary mb-4 shadow-lg rounded-4 overflow-hidden">
        <Card.Header className="d-flex justify-content-between align-items-center bg-black border-secondary p-3">
          <h5 className="mb-0 fw-bold"><i className={`bi ${icon} me-3 text-success fs-4 align-middle`}></i>{title}</h5>
          <Button 
            variant="outline-success" 
            size="sm" 
            className="rounded-pill px-3"
            onClick={() => triggerUpload(category)}
            disabled={uploadingCategory === category}
          >
            {uploadingCategory === category ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <><i className="bi bi-cloud-arrow-up-fill me-2"></i> Upload</>
            )}
          </Button>
        </Card.Header>
        <Card.Body className="p-0">
          {files.length === 0 ? (
            <div className="text-secondary text-center py-5">
              <i className="bi bi-folder2-open display-4 opacity-25 mb-3 d-block"></i>
              No {title.toLowerCase()} uploaded yet.
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {files.map(f => (
                <div key={f.id} className="list-group-item bg-dark text-light border-secondary d-flex justify-content-between align-items-center p-3 hover-bg-secondary transition-all">
                  <div className="text-truncate flex-grow-1 pe-3 fw-medium">
                    <i className="bi bi-file-earmark-pdf-fill text-danger me-3 fs-5 align-middle"></i>
                    {f.title}
                  </div>
                  <div className="d-flex gap-2 flex-shrink-0">
                    <Button variant="success" size="sm" className="rounded-pill px-3 shadow-sm" onClick={() => setReadingFile(f)}>Read Here</Button>
                    <Button variant="outline-info" size="sm" className="rounded-pill px-3" onClick={() => window.open(f.file_url, "_blank")}>New Tab</Button>
                    <Button variant="outline-danger" size="sm" className="rounded-circle" onClick={() => handleDeleteFile(f.id)} title="Delete"><i className="bi bi-trash"></i></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };

  // Selector View
  if (!selectedSubject || !selectedGrade) {
    return (
      <div className="curriculum-selector">
        <Container fluid className="py-5">
          <div className="text-center mb-5">
            <Button variant="outline-light" onClick={onBack} className="mb-4" size="sm" style={{ borderRadius: '20px' }}>
              <i className="bi bi-arrow-left me-2"></i>Back to Dashboard
            </Button>
            <h2 className="text-white fw-bold mb-3" style={{ fontSize: '2.5rem' }}>
              <i className="bi bi-journal-bookmark-fill me-3 text-success"></i>
              Your Personal Library
            </h2>
            <p className="text-secondary fs-5">
              Organize, read, and chat with your AI assistant
            </p>
          </div>

          {loading ? (
            <div className="text-center mt-5">
              <Spinner animation="border" variant="success" style={{ width: '3rem', height: '3rem' }} />
            </div>
          ) : (
            <>
              {!selectedGrade && (
                <div className="mb-5 animation-fade-in">
                  <h4 className="text-center text-white mb-4 fw-light">Step 1: Select your grade</h4>
                  <Row className="justify-content-center">
                    {grades.map((grade) => (
                      <Col key={grade.id} xs={6} md={3} className="mb-4">
                        <Card className="grade-card text-center border-0 shadow-lg bg-dark" onClick={() => setSelectedGrade(grade)}>
                          <Card.Body className="py-5">
                            <h1 className="grade-number display-4 fw-bold text-success mb-3">{grade.grade_level}</h1>
                            <h5 className="text-light m-0">{grade.label}</h5>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}

              {selectedGrade && !selectedSubject && (
                <div className="animation-fade-in">
                  <div className="text-center mb-4">
                    <Badge bg="success" className="px-4 py-2 fs-6 rounded-pill shadow">{selectedGrade.label}</Badge>
                    <Button variant="link" className="text-info ms-3 text-decoration-none" onClick={() => setSelectedGrade(null)}>
                      <i className="bi bi-pencil-square me-1"></i> Change Grade
                    </Button>
                  </div>
                  <h4 className="text-center text-white mb-4 fw-light">Step 2: Choose a subject</h4>
                  <Row className="justify-content-center">
                    {subjects.map((subject) => (
                      <Col key={subject.id} xs={6} md={4} lg={3} className="mb-4">
                        <Card 
                          className="subject-select-card text-center shadow-lg h-100" 
                          onClick={() => setSelectedSubject(subject)} 
                          style={{ 
                            border: `2px solid ${subject.color || '#3498db'}`,
                            background: 'linear-gradient(145deg, #161b22, #0d1117)'
                          }}
                        >
                          <Card.Body className="py-4 d-flex flex-column align-items-center justify-content-center">
                            <div className="rounded-circle p-3 mb-3 shadow" style={{ backgroundColor: `${subject.color || '#3498db'}22` }}>
                              <i className={`bi ${subject.icon}`} style={{ fontSize: "2.5rem", color: subject.color || '#3498db' }}></i>
                            </div>
                            <h5 className="text-light fw-bold m-0" style={{ color: subject.color || '#fff' }}>{subject.name}</h5>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </>
          )}
        </Container>
      </div>
    );
  }

  // Reading Mode View
  if (readingFile) {
    return (
      <div className="curriculum-layout reading-mode">
        <div className="curriculum-topbar d-flex justify-content-between">
          <div>
            <Button variant="link" className="text-secondary p-0 me-3" onClick={() => setReadingFile(null)}>
              <i className="bi bi-arrow-left me-1"></i>Back to Library
            </Button>
            <span className="text-light fw-bold">{readingFile.title}</span>
          </div>
          <Button variant="outline-success" size="sm" onClick={() => setShowChat(!showChat)}>
            <i className="bi bi-robot me-1"></i> {showChat ? "Hide Chat" : "Ask Assistant"}
          </Button>
        </div>
        <div className="d-flex h-100 overflow-hidden">
          <div className="flex-grow-1 p-2 bg-dark">
            <iframe src={readingFile.file_url} className="w-100 h-100 rounded border-0" title="Reading Material" />
          </div>
          {showChat && (
            <div className="chat-sidebar bg-black border-start border-secondary d-flex flex-column" style={{ width: "400px", zIndex: 10 }}>
              <div className="p-3 border-bottom border-secondary bg-dark text-success fw-bold d-flex align-items-center">
                <i className="bi bi-robot fs-4 me-2"></i> 
                <span className="fs-5">Library Assistant</span>
              </div>
              <div className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-3">
                {chatMessages.length === 0 && (
                  <div className="text-center text-secondary mt-5">
                    <i className="bi bi-chat-dots display-1 opacity-25"></i>
                    <p className="mt-3">Need help understanding this material?<br/>Ask me anything!</p>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`p-3 rounded shadow-sm ${msg.role === 'user' ? 'bg-primary text-white ms-auto' : 'bg-dark text-light border border-secondary me-auto'}`} style={{ maxWidth: '90%', lineHeight: '1.5' }}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="markdown-chat">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-top border-secondary bg-dark">
                <div className="d-flex gap-2">
                  <Form.Control type="text" placeholder="Ask a question..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMessage()} className="bg-black text-white border-secondary shadow-none" />
                  <Button variant="success" onClick={sendChatMessage} disabled={isChatting} className="px-4"><i className="bi bi-send-fill"></i></Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Library Dashboard View
  return (
    <div className="curriculum-layout">
      <div className="curriculum-topbar">
        <Button variant="link" className="text-secondary" onClick={() => setSelectedSubject(null)}>
          <i className="bi bi-arrow-left me-1"></i>Back
        </Button>
        <span className="text-light ms-3 fw-bold fs-5">
          <i className={`bi ${selectedSubject.icon} me-2`} style={{ color: selectedSubject.color }}></i>
          {selectedSubject.name} Library <Badge bg="dark" className="ms-2 fs-6">{selectedGrade.label}</Badge>
        </span>
      </div>

      <div className="curriculum-body overflow-auto p-4 bg-black">
        <Container>
          <input type="file" ref={fileInputRef} className="d-none" onChange={handleFileUpload} accept=".pdf,.txt,.ppt,.pptx,.doc,.docx" />
          
          <Row>
            <Col lg={8} className="mx-auto">
              {renderFileSection("Text Books", "Text Book", "bi-book")}
              {renderFileSection("Presentations (PPT)", "PPT", "bi-file-earmark-slides")}
              {renderFileSection("Reference Materials", "Reference", "bi-journal-bookmark")}
            </Col>
          </Row>
        </Container>
      </div>
      
      {/* Floating Chat Button for Main Library */}
      <OverlayTrigger placement="left" overlay={<Tooltip>Need study advice?</Tooltip>}>
        <Button 
          variant="success" 
          className="rounded-circle shadow-lg position-fixed d-flex align-items-center justify-content-center"
          style={{ bottom: "30px", right: "30px", width: "60px", height: "60px", zIndex: 1000 }}
          onClick={() => setShowChat(true)}
        >
          <i className="bi bi-chat-dots-fill fs-3"></i>
        </Button>
      </OverlayTrigger>

      {/* Floating Chat Window */}
      {showChat && (
        <Card className="position-fixed shadow-lg border-secondary bg-dark text-light" style={{ bottom: "100px", right: "30px", width: "350px", height: "450px", zIndex: 1000, display: "flex", flexDirection: "column" }}>
          <Card.Header className="d-flex justify-content-between align-items-center bg-black border-secondary">
            <span className="text-success fw-bold"><i className="bi bi-robot me-2"></i>Library Assistant</span>
            <Button variant="link" className="text-secondary p-0" onClick={() => setShowChat(false)}><i className="bi bi-x-lg"></i></Button>
          </Card.Header>
          <Card.Body className="overflow-auto d-flex flex-column gap-3 p-3 flex-grow-1">
             {chatMessages.length === 0 && (
                <div className="text-secondary text-center small mt-4">
                  Hello! I'm your library assistant. I can help you organize your studies!
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`p-2 rounded ${msg.role === 'user' ? 'bg-primary text-white ms-auto' : 'bg-secondary text-light me-auto'}`} style={{ maxWidth: '85%', fontSize: '0.9rem' }}>
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <div className="markdown-chat">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
          </Card.Body>
          <Card.Footer className="bg-black border-secondary p-2">
            <div className="d-flex gap-2">
              <Form.Control type="text" size="sm" placeholder="Ask a question..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMessage()} className="bg-dark text-light border-secondary" />
              <Button variant="success" size="sm" onClick={sendChatMessage} disabled={isChatting}><i className="bi bi-send"></i></Button>
            </div>
          </Card.Footer>
        </Card>
      )}
    </div>
  );
};

export default CurriculumPage;
