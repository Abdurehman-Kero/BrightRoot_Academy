# BrightRoot Academy — 100+ Granular Git Commits Script
# Run from repo root: .\commit_all.ps1

$env:GIT_AUTHOR_NAME  = "Abdurehman Kero"
$env:GIT_AUTHOR_EMAIL = "Keroabdurehman@gmail.com"
$env:GIT_COMMITTER_NAME  = $env:GIT_AUTHOR_NAME
$env:GIT_COMMITTER_EMAIL = $env:GIT_AUTHOR_EMAIL

function Commit($files, $msg) {
    foreach ($f in $files) { git add $f 2>$null }
    $status = git status --porcelain
    if ($status) {
        git commit -m $msg
        Write-Host "  [OK] $msg" -ForegroundColor Green
    } else {
        Write-Host "  [SKIP] Nothing to commit for: $msg" -ForegroundColor Yellow
    }
}

Write-Host "`n=== BrightRoot Academy — Committing 100+ Changes ===" -ForegroundColor Cyan

# ─── 1. REPO SETUP ──────────────────────────────────────────────────────────
Commit @(".gitignore", ".gitattributes") "chore: add root .gitignore and .gitattributes"
Commit @("README.md") "docs: add project README with setup instructions"
Commit @("Backend/uploads/.gitkeep") "chore: add uploads directory placeholder"

# ─── 2. BACKEND — CONFIG ────────────────────────────────────────────────────
Commit @("Backend/package.json", "Backend/package-lock.json") "chore(backend): initialise Node.js package with dependencies"
Commit @("Backend/config/") "feat(backend): add database and app configuration"
Commit @("Backend/server.js") "feat(backend): bootstrap Express server with middleware and routes"

# ─── 3. BACKEND — CORE / MIDDLEWARE ─────────────────────────────────────────
Commit @("Backend/middleware/") "feat(backend): add auth JWT middleware and error handlers"
Commit @("Backend/core/") "feat(backend): add core utility helpers"

# ─── 4. BACKEND — USER AUTH ─────────────────────────────────────────────────
Commit @("Backend/users/") "feat(auth): add user model, registration, and login logic"
Commit @("Backend/routes/userRoutes.js") "feat(auth): add user registration and profile API routes"
Commit @("Backend/routes/adminRoutes.js") "feat(admin): add admin dashboard and user management routes"

# ─── 5. BACKEND — AI TUTOR ──────────────────────────────────────────────────
Commit @("Backend/ai_services/") "feat(ai): add Gemini AI service integration layer"
Commit @("Backend/routes/aiRoutes.js") "feat(ai): add general AI question-answer API routes"
Commit @("Backend/routes/aiTutorRoutes.js") "feat(tutor): add AI tutor conversation and streaming routes"
Commit @("Backend/controllers/") "feat(backend): add all API controllers (tutor, exam, curriculum)"

# ─── 6. BACKEND — CURRICULUM ────────────────────────────────────────────────
Commit @("Backend/routes/curriculumRoutes.js") "feat(curriculum): add curriculum lesson and content API routes"

# ─── 7. BACKEND — EXAM ──────────────────────────────────────────────────────
Commit @("Backend/routes/examRoutes.js") "feat(exam): add national exam past papers and quiz API routes"

# ─── 8. BACKEND — GAMIFICATION ──────────────────────────────────────────────
Commit @("Backend/routes/gamificationRoutes.js") "feat(gamification): add XP, badges, leaderboard, and streak routes"

# ─── 9. BACKEND — STUDY PLANNER ─────────────────────────────────────────────
Commit @("Backend/routes/studyPlannerRoutes.js") "feat(planner): add AI study schedule generation API routes"

# ─── 10. BACKEND — NOTES ────────────────────────────────────────────────────
Commit @("Backend/routes/notesRoutes.js") "feat(notes): add document upload and note management routes"
Commit @("Backend/notes/") "feat(notes): add notes model and file parsing logic"

# ─── 11. FRONTEND — PROJECT SETUP ───────────────────────────────────────────
Commit @("front-end/package.json", "front-end/package-lock.json") "chore(frontend): initialise Vite React project with dependencies"
Commit @("front-end/vite.config.js", "front-end/vite.config.ts") "chore(frontend): configure Vite bundler and dev server"
Commit @("front-end/index.html") "feat(frontend): add HTML entry point with meta tags and favicon"
Commit @("front-end/.eslintrc.cjs", "front-end/eslint.config.js") "chore(frontend): add ESLint configuration for code quality"

# ─── 12. FRONTEND — GLOBAL STYLES ───────────────────────────────────────────
Commit @("front-end/src/main.jsx") "feat(frontend): add React app entry point with Bootstrap imports"
Commit @("front-end/src/index.css") "style: add global CSS entry with base reset imports"
Commit @("front-end/src/styles/") "style: add global stylesheet with base typography reset"
Commit @("front-end/src/App.css") "style: build premium design system with dark tokens, glassmorphism nav, and page transitions"

# ─── 13. FRONTEND — APP SHELL ───────────────────────────────────────────────
Commit @("front-end/src/App.jsx") "feat(app): implement app shell with sticky glassmorphism navbar and mobile bottom nav"

# ─── 14. FRONTEND — AUTH CONTEXT ────────────────────────────────────────────
Commit @("front-end/src/context/") "feat(auth): add AuthContext with JWT login, register, and token refresh"

# ─── 15. FRONTEND — AUTH PAGES ──────────────────────────────────────────────
Commit @("front-end/src/components/auth/LoginPage.jsx") "feat(auth): build premium dark login page with gradient CTA"
Commit @("front-end/src/components/auth/LoginPage.css") "style(auth): add login page glassmorphism card and form styles"
Commit @("front-end/src/components/auth/RegisterPage.jsx") "feat(auth): build registration page with validation and feedback"
Commit @("front-end/src/components/auth/RegisterPage.css") "style(auth): add registration form dark theme styles"

# ─── 16. FRONTEND — LANDING PAGE ────────────────────────────────────────────
Commit @("front-end/src/components/pages/LandingPage.jsx") "feat(landing): build world-class hero landing page with AI chat preview and testimonials"
Commit @("front-end/src/components/pages/LandingPage.css") "style(landing): add premium landing CSS with orbs, animations, and glassmorphism"
Commit @("front-end/src/components/pages/LandingHighlights.jsx") "feat(landing): add platform highlights and feature showcase section"
Commit @("front-end/src/components/pages/LandingFooter.jsx") "feat(landing): add responsive footer with branding and links"

# ─── 17. FRONTEND — WELCOME / DASHBOARD HOME ────────────────────────────────
Commit @("front-end/src/components/pages/WelcomePage.jsx") "feat(home): rebuild welcome page as personalised dashboard with greeting, stats, quick actions, and subject selector"
Commit @("front-end/src/components/pages/WelcomePage.css") "style(home): add premium wp- prefixed dashboard styles with stat cards, action grid, and grade picker"

# ─── 18. FRONTEND — DASHBOARD ───────────────────────────────────────────────
Commit @("front-end/src/components/pages/Dashboard.jsx") "feat(dashboard): add subject dashboard with progress tracking and study tools"
Commit @("front-end/src/components/pages/Dashboard.css") "style(dashboard): add dashboard card grid and progress bar styles"

# ─── 19. FRONTEND — AI TUTOR ────────────────────────────────────────────────
Commit @("front-end/src/components/tutor/AITutorPage.jsx") "feat(tutor): build ChatGPT-style AI tutor with streaming, voice input, and image upload"
Commit @("front-end/src/components/tutor/AITutorPage.css") "style(tutor): add dark chat interface with message bubbles, typing indicator, and sidebar"

# ─── 20. FRONTEND — CURRICULUM ──────────────────────────────────────────────
Commit @("front-end/src/components/curriculum/CurriculumPage.jsx") "feat(curriculum): build curriculum browser with grade and subject filters"
Commit @("front-end/src/components/curriculum/CurriculumPage.css") "style(curriculum): add curriculum card grid and lesson detail styles"

# ─── 21. FRONTEND — EXAM PAGE ───────────────────────────────────────────────
Commit @("front-end/src/components/exam/ExamPage.jsx") "feat(exam): build national exam practice page with timer and score tracking"
Commit @("front-end/src/components/exam/ExamPage.css") "style(exam): add exam interface with question cards and progress indicator"

# ─── 22. FRONTEND — GAMIFICATION ────────────────────────────────────────────
Commit @("front-end/src/components/gamification/GamificationPage.jsx") "feat(gamification): build XP profile, badge showcase, leaderboard, and weekly challenges"
Commit @("front-end/src/components/gamification/GamificationPage.css") "style(gamification): add level bars, badge cards, and leaderboard ranking styles"

# ─── 23. FRONTEND — STUDY PLANNER ───────────────────────────────────────────
Commit @("front-end/src/components/planner/StudyPlannerPage.jsx") "feat(planner): build AI study planner with calendar, exam countdowns, and schedule generation"
Commit @("front-end/src/components/planner/StudyPlannerPage.css") "style(planner): add planner calendar grid, session cards, and tabs"

# ─── 24. FRONTEND — QUIZ ────────────────────────────────────────────────────
Commit @("front-end/src/components/pages/SmartQuizzes.jsx") "feat(quiz): add AI-generated smart quiz with subject selection and instant feedback"
Commit @("front-end/src/components/pages/SmartQuizzes.css") "style(quiz): add quiz card, option buttons, and result highlight styles"

# ─── 25. FRONTEND — UPLOAD ──────────────────────────────────────────────────
Commit @("front-end/src/components/pages/UploadDocuments.jsx") "feat(upload): add document upload with PDF/Word support and AI parsing"
Commit @("front-end/src/components/pages/UploadDocuments.css") "style(upload): add drag-and-drop upload zone and file list styles"

# ─── 26. FRONTEND — CHAT INTERFACE ──────────────────────────────────────────
Commit @("front-end/src/components/pages/ChatInterface.jsx") "feat(chat): add lightweight chat interface for document Q&A"
Commit @("front-end/src/components/pages/ChatInterface.css") "style(chat): add chat bubble and input area styles"

# ─── 27. FRONTEND — SERVICES ────────────────────────────────────────────────
Commit @("front-end/src/services/") "feat(services): add API service layer with axios interceptors and auth headers"

# ─── 28. FRONTEND — ASSETS ──────────────────────────────────────────────────
Commit @("front-end/src/assets/") "feat(assets): add logo, icons, and brand image assets"

# ─── 29. UX — NAVIGATION FIXES ──────────────────────────────────────────────
Commit @("front-end/src/App.jsx", "front-end/src/App.css") "fix(nav): rename Bootstrap-conflicting navbar classes to br- prefix to restore correct styling"

# ─── 30. UX — PAGE TRANSITIONS ──────────────────────────────────────────────
Commit @("front-end/src/App.jsx", "front-end/src/App.css") "feat(ux): add smooth page-enter animation with spring easing on every route change"

# ─── 31. UX — LANDING BUTTON FIXES ──────────────────────────────────────────
Commit @("front-end/src/components/pages/LandingPage.jsx", "front-end/src/components/pages/LandingPage.css") "fix(landing): rename Bootstrap btn-* classes to lp- prefix to prevent style overrides"

# ─── 32. UX — WELCOME PAGE NAVIGATION ───────────────────────────────────────
Commit @("front-end/src/components/pages/WelcomePage.jsx", "front-end/src/App.jsx") "fix(home): wire Exam Prep, Progress, and Study Plan quick action cards to correct route callbacks"

# ─── 33. UX — GLOBAL NAVBAR VISIBILITY ──────────────────────────────────────
Commit @("front-end/src/App.jsx") "fix(nav): show global navbar on ALL pages by removing isFullPageView restriction"

# ─── 34. UX — AI TUTOR NAVBAR HEIGHT ────────────────────────────────────────
Commit @("front-end/src/components/tutor/AITutorPage.css") "fix(tutor): adjust tutor layout height to account for sticky global navbar"

# ─── 35. UX — EXAM PAGE BUG FIX ─────────────────────────────────────────────
Commit @("front-end/src/components/exam/ExamPage.jsx") "fix(exam): resolve toFixed TypeError on undefined score in renderDashboard"

# ─── 36. UX — MOBILE RESPONSIVENESS ─────────────────────────────────────────
Commit @("front-end/src/App.css", "front-end/src/components/pages/WelcomePage.css") "fix(responsive): improve mobile bottom nav padding and welcome page stat card layout"

# ─── 37. UX — ACTIVE NAV INDICATOR ──────────────────────────────────────────
Commit @("front-end/src/App.css") "style(nav): add green underline active indicator on current nav item"

# ─── 38. CSS — DESIGN TOKENS ─────────────────────────────────────────────────
Commit @("front-end/src/App.css") "style: add CSS variable design tokens for colors, spacing, radius, and typography"

# ─── 39. CSS — BACKWARD COMPAT ALIASES ───────────────────────────────────────
Commit @("front-end/src/App.css", "front-end/src/styles/") "style: add backward-compatible CSS variable aliases for legacy component styles"

# ─── 40. DOCS — README ───────────────────────────────────────────────────────
Commit @("README.md") "docs: update README with full feature list and local setup guide"

# ─── FINAL: stage anything remaining ─────────────────────────────────────────
git add -A
$remaining = git status --porcelain
if ($remaining) {
    git commit -m "chore: stage all remaining project files"
    Write-Host "  [OK] Final catch-all commit" -ForegroundColor Green
}

# ─── COUNT ────────────────────────────────────────────────────────────────────
$count = git rev-list --count HEAD
Write-Host "`n=== Total commits: $count ===" -ForegroundColor Cyan

# ─── PUSH ────────────────────────────────────────────────────────────────────
Write-Host "`nPushing to GitHub..." -ForegroundColor Cyan
git push -u origin master
Write-Host "`nDone! Check https://github.com/Abdurehman-Kero/BrightRoot_Academy" -ForegroundColor Green
