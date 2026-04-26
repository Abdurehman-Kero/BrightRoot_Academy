import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import WelcomePage from "./components/pages/WelcomePage";
import Dashboard from "./components/pages/Dashboard";
import ChatInterface from "./components/pages/ChatInterface";
import UploadDocuments from "./components/pages/UploadDocuments";
import SmartQuizzes from "./components/pages/SmartQuizzes";
import LandingPage from "./components/pages/LandingPage";
import CurriculumPage from "./components/curriculum/CurriculumPage";
import AITutorPage from "./components/tutor/AITutorPage";
import ExamPage from "./components/exam/ExamPage";
import GamificationPage from "./components/gamification/GamificationPage";
import StudyPlannerPage from "./components/planner/StudyPlannerPage";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./App.css";

const AppContent = () => {
  const { user, isLoading, logout } = useAuth();
  const [currentView, setCurrentView] = useState("welcome");
  const [selectedSubjectGrade, setSelectedSubjectGrade] = useState(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="text-center">
          <div className="spinner-border text-success mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h4 className="text-light">Loading BrightRoot Academy...</h4>
          <p>Preparing your learning experience</p>
        </div>
      </div>
    );
  }

  if (!user && showLanding) {
    return (
      <LandingPage
        onGetStarted={(choice) => {
          setShowLanding(false);
          setShowRegistration(choice === "register");
        }}
      />
    );
  }

  if (!user && showRegistration) {
    return (
      <RegisterPage
        onRegisterSuccess={() => {
          setCurrentView("welcome");
          setShowRegistration(false);
        }}
        onSwitchToLogin={() => setShowRegistration(false)}
      />
    );
  }

  if (!user && !showRegistration) {
    return (
      <LoginPage
        onLoginSuccess={() => setCurrentView("welcome")}
        onSwitchToRegister={() => setShowRegistration(true)}
      />
    );
  }

  const handleSubjectSelected = (selection) => {
    setSelectedSubjectGrade(selection);
    setCurrentView("dashboard");
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case "welcome":
        return (
          <WelcomePage
            onSubjectSelected={handleSubjectSelected}
            onGoToChat={() => setCurrentView("chat")}
            onGoToUpload={() => setCurrentView("upload")}
            onGoToQuiz={() => setCurrentView("quiz")}
            onGoToCurriculum={() => setCurrentView("curriculum")}
            onGoToExam={() => setCurrentView("exam")}
            onGoToGamification={() => setCurrentView("gamification")}
            onGoToPlanner={() => setCurrentView("planner")}
          />
        );
      case "dashboard":
        return (
          <Dashboard
            selectedSubjectGrade={selectedSubjectGrade}
            onBackToSubjects={() => setCurrentView("welcome")}
          />
        );
      case "chat":
        return (
          <AITutorPage
            onBack={() => setCurrentView("welcome")}
            token={localStorage.getItem("brightroot_token")}
          />
        );
      case "upload":
        return <UploadDocuments onBack={() => setCurrentView("welcome")} />;
      case "quiz":
        return <SmartQuizzes onBack={() => setCurrentView("welcome")} />;
      case "curriculum":
        return (
          <CurriculumPage
            onBack={() => setCurrentView("welcome")}
            token={localStorage.getItem("brightroot_token")}
          />
        );
      case "exam":
        return (
          <ExamPage
            onBack={() => setCurrentView("welcome")}
            token={localStorage.getItem("brightroot_token")}
          />
        );
      case "gamification":
        return (
          <GamificationPage
            onBack={() => setCurrentView("welcome")}
            token={localStorage.getItem("brightroot_token")}
          />
        );
      case "planner":
        return (
          <StudyPlannerPage
            onBack={() => setCurrentView("welcome")}
            token={localStorage.getItem("brightroot_token")}
          />
        );
      default:
        return (
          <WelcomePage
            onSubjectSelected={handleSubjectSelected}
            onGoToChat={() => setCurrentView("chat")}
            onGoToUpload={() => setCurrentView("upload")}
            onGoToQuiz={() => setCurrentView("quiz")}
            onGoToCurriculum={() => setCurrentView("curriculum")}
            onGoToExam={() => setCurrentView("exam")}
            onGoToGamification={() => setCurrentView("gamification")}
            onGoToPlanner={() => setCurrentView("planner")}
          />
        );
    }
  };

  const NAV_ITEMS = [
    { id: 'welcome',      icon: 'bi-house-door',      label: 'Home',      mobile: true  },
    { id: 'curriculum',   icon: 'bi-book-half',       label: 'Subjects',  mobile: true  },
    { id: 'chat',         icon: 'bi-robot',           label: 'AI Tutor',  mobile: true  },
    { id: 'exam',         icon: 'bi-pencil-square',   label: 'Exams',     mobile: true  },
    { id: 'quiz',         icon: 'bi-patch-question',  label: 'Quizzes',   mobile: false },
    { id: 'gamification', icon: 'bi-star-fill',       label: 'Progress',  mobile: true  },
    { id: 'planner',      icon: 'bi-calendar-check',  label: 'Planner',   mobile: false },
  ];


  const userName = user?.first_name || user?.username || 'Student';
  const userInitials = userName.charAt(0).toUpperCase();

  return (
    <div className="app">
      {/* ── Top Navbar — always visible when logged in ── */}
      {user && (
        <nav className="app-navbar">
          <button className="br-navbar-brand" onClick={() => setCurrentView('welcome')}>
            <div className="br-navbar-logo"><span>B</span></div>
            <span>BrightRoot</span>
          </button>

          <div className="br-navbar-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`br-nav-btn ${currentView === item.id ? 'active' : ''}`}
                onClick={() => setCurrentView(item.id)}
              >
                <i className={`bi ${item.icon}`}></i>
                {item.label}
              </button>
            ))}
          </div>

          <div className="br-navbar-right">
            <div className="br-navbar-avatar" title={userName}>{userInitials}</div>
            <button className="br-logout-btn" onClick={() => {
              if (window.confirm('Sign out of BrightRoot?')) { logout(); setShowLanding(true); }
            }}>
              <i className="bi bi-box-arrow-right me-1"></i>Sign out
            </button>
          </div>
        </nav>
      )}

      <main className="app-main">
        <div key={currentView} className="page-transition">
          {renderCurrentView()}
        </div>
      </main>


      {/* ── Mobile Bottom Navigation — always visible when logged in ── */}
      {user && (
        <nav className="br-bottom-nav">
          {NAV_ITEMS.filter(i => i.mobile).map(item => (
            <button
              key={item.id}
              className={`br-bottom-btn ${currentView === item.id ? 'active' : ''}`}
              onClick={() => setCurrentView(item.id)}
            >
              <i className={`bi ${item.icon}`}></i>
              {item.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );

};

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
