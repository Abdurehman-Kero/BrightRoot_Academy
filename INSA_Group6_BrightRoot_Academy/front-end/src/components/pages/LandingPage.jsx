import React, { useState, useEffect } from "react";
import "./LandingPage.css";

const FEATURES = [
  { icon: "🤖", title: "AI Tutor",        desc: "Real-time streaming answers to any question in any subject", color: "#3b82f6" },
  { icon: "📝", title: "Exam Prep",        desc: "22+ past national exams with auto-grading and explanations",  color: "#22c55e" },
  { icon: "📅", title: "Study Planner",    desc: "AI builds your daily schedule based on your exam dates",      color: "#8b5cf6" },
  { icon: "🏆", title: "Gamification",    desc: "XP, levels, badges, streaks — make studying addictive",       color: "#f59e0b" },
  { icon: "📊", title: "Analytics",       desc: "Know exactly which topics to focus on next",                  color: "#ef4444" },
  { icon: "📚", title: "Curriculum",      desc: "Full Grade 9–12 Ethiopian curriculum, structured and clear",  color: "#1abc9c" },
];

const SUBJECTS = [
  { name: "Mathematics",  icon: "📐", grade: "9–12" },
  { name: "Physics",      icon: "⚡", grade: "9–12" },
  { name: "Chemistry",    icon: "🧪", grade: "9–12" },
  { name: "Biology",      icon: "🌿", grade: "9–12" },
  { name: "English",      icon: "📖", grade: "9–12" },
  { name: "History",      icon: "🏛️", grade: "9–12" },
];

const TESTIMONIALS = [
  { name: "Meron T.", grade: "Grade 12, Addis Ababa", text: "I went from failing Maths to passing with 85%. The AI tutor explains things better than any teacher.", avatar: "M" },
  { name: "Dawit K.", grade: "Grade 11, Hawassa",     text: "The study planner helped me cover all subjects before the exam. I used to waste hours not knowing what to study.", avatar: "D" },
  { name: "Hanan A.", grade: "Grade 12, Bahir Dar",   text: "Practicing past exams every day and seeing my improvement chart motivated me to keep going.", avatar: "H" },
];

const LandingPage = ({ onGetStarted }) => {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setActiveTestimonial(i => (i + 1) % TESTIMONIALS.length), 4000);
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => { clearInterval(timer); window.removeEventListener("scroll", onScroll); };
  }, []);

  return (
    <div className="landing-page">
      {/* ── Nav ── */}
      <nav className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <div className="logo-mark"><span>B</span></div>
            <span className="logo-text">BrightRoot</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#subjects">Subjects</a>
            <a href="#testimonials">Stories</a>
          </div>
          <div className="landing-nav-actions">
            <button className="lp-btn-ghost" onClick={() => onGetStarted("login")}>Sign In</button>
            <button className="lp-btn-outline" onClick={() => onGetStarted("register")}>Get Started Free</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero-section">
        {/* Background orbs */}
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>

        <div className="hero-inner">
          <div className="hero-badge fade-up">
            <span className="badge-dot"></span>
            AI-Powered · Ethiopian Curriculum · Grade 9–12
          </div>

          <h1 className="hero-title fade-up fade-up-1">
            Study Smarter.<br />
            <span className="text-grad">Score Higher.</span>
          </h1>

          <p className="hero-subtitle fade-up fade-up-2">
            BrightRoot Academy combines an AI tutor, past exam database, personalized study plans, 
            and gamification — built specifically for Ethiopian students preparing for the National Exam.
          </p>

          <div className="hero-cta fade-up fade-up-3">
            <button className="lp-btn-hero" onClick={() => onGetStarted("register")}>
              Start Learning for Free
              <i className="bi bi-arrow-right ms-2"></i>
            </button>
            <button className="lp-btn-hero-ghost" onClick={() => onGetStarted("login")}>
              <i className="bi bi-play-circle me-2"></i>
              Already have an account?
            </button>
          </div>

          <div className="hero-social-proof fade-up fade-up-4">
            <div className="proof-avatars">
              {["A","B","C","D"].map((l,i) => (
                <div key={i} className="proof-avatar" style={{background: `hsl(${i*40+120},70%,45%)`}}>{l}</div>
              ))}
            </div>
            <span>Join <strong>2,000+</strong> Ethiopian students already learning</span>
          </div>

          {/* Hero visual */}
          <div className="hero-visual fade-up fade-up-4">
            <div className="chat-preview">
              <div className="cp-header">
                <div className="cp-dot red"></div>
                <div className="cp-dot yellow"></div>
                <div className="cp-dot green"></div>
                <span>AI Tutor</span>
              </div>
              <div className="cp-body">
                <div className="cp-msg user">What is the quadratic formula?</div>
                <div className="cp-msg ai">
                  <span className="ai-icon">🤖</span>
                  The quadratic formula is:<br />
                  <code className="math-code">x = (−b ± √(b²−4ac)) / 2a</code><br />
                  <span className="ai-explanation">Where a, b, c are coefficients of ax²+bx+c=0. Want me to solve an example?</span>
                </div>
                <div className="cp-cursor"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section className="stats-strip">
        {[
          { n: "22+",   l: "Past Exam Questions" },
          { n: "6",     l: "Core Subjects" },
          { n: "15",    l: "Achievement Badges" },
          { n: "100%",  l: "Free to Use" },
        ].map((s, i) => (
          <div key={i} className="stat-item">
            <div className="stat-num">{s.n}</div>
            <div className="stat-lbl">{s.l}</div>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section className="features-section" id="features">
        <div className="section-header">
          <div className="section-label">Everything you need</div>
          <h2>One platform. Every tool.<br />Built for your success.</h2>
          <p>From AI tutoring to gamified learning — BrightRoot has everything Ethiopian Grade 9–12 students need to excel.</p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card" style={{"--fc": f.color}}>
              <div className="feature-icon" style={{background: f.color + "22"}}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <div className="feature-glow"></div>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Tutor Preview ── */}
      <section className="ai-preview-section">
        <div className="ai-preview-inner">
          <div className="ai-preview-text">
            <div className="section-label">AI Tutor</div>
            <h2>Ask anything.<br />Get instant answers.</h2>
            <p>Our AI understands the Ethiopian curriculum. Ask about photosynthesis, quadratic equations, or how the Battle of Adwa started — and get clear, step-by-step explanations.</p>
            <ul className="feature-list">
              <li><i className="bi bi-check-circle-fill"></i> Real-time streaming responses</li>
              <li><i className="bi bi-check-circle-fill"></i> Math equation rendering</li>
              <li><i className="bi bi-check-circle-fill"></i> Upload notes for instant summaries</li>
              <li><i className="bi bi-check-circle-fill"></i> Available 24/7, completely free</li>
            </ul>
            <button className="lp-btn-outline mt-4" onClick={() => onGetStarted("register")}>
              Try AI Tutor Free <i className="bi bi-arrow-right ms-1"></i>
            </button>
          </div>
          <div className="ai-preview-visual">
            <div className="floating-cards">
              {[
                { subj: "Physics", q: "Explain Newton's 3rd law", color: "#3b82f6" },
                { subj: "Chemistry", q: "Balance: H₂ + O₂ → H₂O", color: "#22c55e" },
                { subj: "Biology", q: "Stages of mitosis?", color: "#8b5cf6" },
              ].map((c, i) => (
                <div key={i} className="floating-card" style={{"--i": i, "--cc": c.color}}>
                  <span className="fc-subj" style={{color: c.color}}>{c.subj}</span>
                  <span className="fc-q">{c.q}</span>
                  <span className="fc-ans">✨ AI Answer Ready</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Subjects ── */}
      <section className="subjects-section" id="subjects">
        <div className="section-header">
          <div className="section-label">Curriculum Coverage</div>
          <h2>All core subjects.<br />Complete coverage.</h2>
        </div>
        <div className="subjects-grid">
          {SUBJECTS.map((s, i) => (
            <div key={i} className="subject-card" onClick={() => onGetStarted("register")}>
              <div className="subj-icon">{s.icon}</div>
              <div className="subj-name">{s.name}</div>
              <div className="subj-grade">Grade {s.grade}</div>
              <div className="subj-arrow"><i className="bi bi-arrow-right-short"></i></div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="testimonials-section" id="testimonials">
        <div className="section-header">
          <div className="section-label">Student Stories</div>
          <h2>Trusted by students<br />across Ethiopia</h2>
        </div>
        <div className="testimonials-carousel">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className={`testimonial-card ${i === activeTestimonial ? "active" : ""}`}>
              <div className="t-quote">"</div>
              <p className="t-text">{t.text}</p>
              <div className="t-author">
                <div className="t-avatar">{t.avatar}</div>
                <div>
                  <strong>{t.name}</strong>
                  <span>{t.grade}</span>
                </div>
              </div>
            </div>
          ))}
          <div className="t-dots">
            {TESTIMONIALS.map((_, i) => (
              <button key={i} className={`t-dot ${i === activeTestimonial ? "active" : ""}`} onClick={() => setActiveTestimonial(i)} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="cta-inner">
          <div className="orb orb-cta"></div>
          <h2>Ready to ace the<br /><span className="text-grad">National Exam?</span></h2>
          <p>Join thousands of Ethiopian students already using BrightRoot Academy. It's free — no credit card needed.</p>
          <button className="lp-btn-cta" onClick={() => onGetStarted("register")}>
            Get Started for Free <i className="bi bi-arrow-right ms-2"></i>
          </button>
          <p className="cta-note">Free forever · No ads · Made for Ethiopian students</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="logo-mark sm"><span>B</span></div>
            <span>BrightRoot Academy</span>
          </div>
          <p className="footer-copy">© {new Date().getFullYear()} BrightRoot Academy · Built for Ethiopian students</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
