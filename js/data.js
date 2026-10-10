/* MEMORYVAULT AI - static demo data (mirrors the Flask seed data) */
window.MV = {
  users: [
    { name: "MemoryVault Demo", email: "demo@memoryvault.local", password: "demo1234", role: "faculty", department: "Computer Science", year: "2024-25" },
    { name: "Aravind Raj", email: "admin@memoryvault.local", password: "admin1234", role: "admin", department: "Computer Science", year: "2024-25" }
  ],
  projects: [
    {
      id: 1, title: "[DEMO] AI Campus Safety Assistant",
      description: "Chatbot that answers campus safety questions. (Demonstration content, not a real university record.)",
      department: "Computer Science", year: "2024-25", category: "AI", tech: "Flask, SQLite, NLP",
      tags: "demo", status: "Active", visibility: "public",
      handover_notes: "Demonstration notes only.", owner: "demo@memoryvault.local", created: "2024-11-04", demo: true, docs: []
    },
    {
      id: 2, title: "[DEMO] Student Attendance Management System",
      description: "Tracks attendance with QR codes. (Demonstration content, not a real university record.)",
      department: "Computer Science", year: "2024-25", category: "Web App", tech: "Flask, SQLite, Bootstrap",
      tags: "demo", status: "Active", visibility: "public",
      handover_notes: "Demonstration notes only.", owner: "demo@memoryvault.local", created: "2024-11-06", demo: true, docs: []
    },
    {
      id: 3, title: "[DEMO] Library Management System",
      description: "Book lending and fines. (Demonstration content, not a real university record.)",
      department: "Computer Science", year: "2024-25", category: "Web App", tech: "Django, PostgreSQL",
      tags: "demo", status: "Active", visibility: "public",
      handover_notes: "Demonstration notes only.", owner: "demo@memoryvault.local", created: "2024-11-08", demo: true, docs: []
    }
  ],
  failures: [
    {
      id: 1, project_id: 1, title: "[DEMO] Flask login loop after redirect",
      error_message: "Redirected to /login repeatedly", description: "Flask login loop after redirect",
      root_cause: "SECRET_KEY changed on each restart so sessions were invalidated",
      failed_attempts: "", solution: "Set a fixed SECRET_KEY in .env",
      technologies: "Flask, SQLite, NLP", severity: "Medium",
      lessons: "Always load SECRET_KEY from environment", prevention: "",
      verified: false, verified_by: "", contributor: "MemoryVault Demo", created: "2024-11-05"
    },
    {
      id: 2, project_id: 2, title: "[DEMO] sqlite3.OperationalError: database is locked",
      error_message: "database is locked", description: "sqlite3.OperationalError: database is locked",
      root_cause: "Two processes wrote to the SQLite file simultaneously",
      failed_attempts: "", solution: "Use one app process and short transactions",
      technologies: "Flask, SQLite, Bootstrap", severity: "High",
      lessons: "Don't run multiple dev servers on one DB file", prevention: "",
      verified: false, verified_by: "", contributor: "MemoryVault Demo", created: "2024-11-07"
    },
    {
      id: 3, project_id: 3, title: "[DEMO] Deployment static files 404",
      error_message: "404 for /static/css", description: "Deployment static files 404",
      root_cause: "collectstatic was not run before deployment",
      failed_attempts: "", solution: "Run collectstatic and configure the web server",
      technologies: "Django, PostgreSQL", severity: "Medium",
      lessons: "Add deploy checklist", prevention: "",
      verified: false, verified_by: "", contributor: "MemoryVault Demo", created: "2024-11-09"
    }
  ]
};
