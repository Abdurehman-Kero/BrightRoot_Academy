

# 🌱 BrightRoot Academy Platform

**BrightRoot Academy** is an **AI-powered learning platform** that blends an interactive frontend, a secure backend, and AI-driven services to deliver a **modern, personalized education experience** for students and instructors.

---

## 🚀 Features

### 🎨 Frontend (React + Bootstrap)

* Fully responsive, dark-mode enabled interface
* Dynamic student and instructor dashboards
* Seamless course discovery and signup flow

### ⚙️ Backend (Node.js + Express)

* Secure authentication and user role management
* Course, enrollment, and progress tracking APIs
* RESTful endpoints with JWT authentication
* MySQL database on MAMP stack

### 🤖 AI Layer

* **Gemini-powered** summary generation
* **AI Quiz generation** with multiple choice questions
* **Personalized learning recommendations**

---

## 🧩 Tech Stack

| Layer              | Technologies                             |
| :----------------- | :--------------------------------------- |
| **Frontend**       | React, Bootstrap, Vite                   |
| **Backend**        | Node.js, Express.js, MySQL (MAMP)        |
| **AI / LLM**       | Google Gemini API                        |
| **Auth**           | JWT (jsonwebtoken + bcryptjs)            |

---

## ⚙️ Installation & Setup

### 1️⃣ Clone Repository

```bash
git clone https://github.com/Abdurehman-Kero/BrightRoot_Academy.git
cd BrightRoot_Academy/INSA_Group6_BrightRoot_Academy
```

### 2️⃣ Backend Setup

```bash
cd Backend
npm install
# Make sure MAMP is running with MySQL started
node config/migrate.js    # Creates database and tables
npm run dev               # Starts server on http://localhost:8000
```

### 3️⃣ Frontend Setup

```bash
cd front-end
npm install
npm run dev               # Starts on http://localhost:5173
```

---

## 📂 Project Structure

```
INSA_Group6_BrightRoot_Academy/
│
├── Backend/                    # Node.js + Express API
│   ├── server.js               # Main entry point
│   ├── package.json
│   ├── .env                    # Environment configuration
│   ├── config/
│   │   ├── database.js         # MySQL connection pool
│   │   └── migrate.js          # Database migration script
│   ├── middleware/
│   │   └── auth.js             # JWT authentication middleware
│   ├── controllers/
│   │   ├── userController.js   # Auth & profile logic
│   │   ├── notesController.js  # File upload & management
│   │   └── aiController.js     # Gemini AI integration
│   ├── routes/
│   │   ├── userRoutes.js       # /api/users/*
│   │   ├── notesRoutes.js      # /api/notes/*
│   │   └── aiRoutes.js         # /api/ai/*
│   └── uploads/                # Uploaded files storage
│
├── front-end/                  # React + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── services/
│   │   └── styles/
│   ├── App.jsx
│   ├── index.html
│   └── vite.config.js
│
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint                      | Auth | Description          |
| :----- | :---------------------------- | :--- | :------------------- |
| POST   | `/api/token/`                 | ❌    | Login (JWT)          |
| POST   | `/api/token/refresh/`         | ❌    | Refresh Token        |
| POST   | `/api/users/register/`        | ❌    | Register             |
| POST   | `/api/users/logout/`          | ✅    | Logout               |
| GET    | `/api/users/profile/`         | ✅    | Get Profile          |
| PUT    | `/api/users/profile/`         | ✅    | Update Profile       |
| POST   | `/api/notes/upload/`          | ✅    | Upload File          |
| GET    | `/api/notes/files/`           | ✅    | Get User Files       |
| GET    | `/api/notes/common-books/`    | ✅    | Get Common Books     |
| GET    | `/api/notes/download/:id/`    | ❌    | Download File        |
| POST   | `/api/ai/summary/generate/`   | ✅    | Generate AI Summary  |
| POST   | `/api/ai/quiz/generate/`      | ✅    | Generate AI Quiz     |
| GET    | `/api/ai/summaries/`          | ✅    | Get User Summaries   |
| GET    | `/api/ai/quizzes/`            | ✅    | Get User Quizzes     |
| GET    | `/api/health/`                | ❌    | Health Check         |

---

## 🎯 Roadmap

* 🧠 Expand AI tutoring workflows (multi-agent feedback + grading)
* ☁️ Full Docker deployment
* 📊 Instructor analytics dashboard
* 🧩 Real-time chat and video learning features

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a new branch (`feature/your-feature-name`)
3. Commit your changes and open a pull request

---

## 📜 License

**MIT License** © 2025 BrightRoot Academy

