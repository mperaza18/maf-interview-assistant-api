Send a test HTTP request to the Interview Assistant API endpoint specified by: $ARGUMENTS

The API must be running at http://localhost:5001. Use the fetch tool to make the POST request.

Match $ARGUMENTS to the route and payload below:

---

**analyze** → POST http://localhost:5001/api/interview/analyze

```json
{
  "resumeText": "Jane Smith\njane@example.com\n\nSoftware Engineer with 5 years of experience in backend development.\n\nSkills: C#, .NET 8, Azure, SQL Server, Docker, Kubernetes\n\nExperience:\n- Senior Developer at Acme Corp (2021-2024): Led migration of monolith to microservices, reduced API latency by 40%\n- Developer at Beta Inc (2019-2021): Built REST APIs for e-commerce platform serving 500k users",
  "role": "Senior Software Engineer"
}
```

---

**plan** → POST http://localhost:5001/api/interview/plan

```json
{
  "profile": {
    "candidateName": "Jane Smith",
    "email": "jane@example.com",
    "currentTitle": "Senior Developer",
    "yearsExperience": 5,
    "coreSkills": ["C#", ".NET 8", "Azure", "SQL Server", "Docker"],
    "roles": ["Senior Developer at Acme Corp (2021-2024)", "Developer at Beta Inc (2019-2021)"],
    "notableProjects": ["Microservices migration at Acme Corp — 40% latency reduction"],
    "redFlags": []
  },
  "seniority": {
    "level": "Senior",
    "confidence": 0.87,
    "rationale": "5 years with demonstrated technical leadership and measurable impact"
  },
  "role": "Senior Software Engineer",
  "mode": "simple"
}
```

---

**revise** → POST http://localhost:5001/api/interview/plan/revise

```json
{
  "plan": {
    "role": "Senior Software Engineer",
    "level": "Senior",
    "summary": "A balanced interview plan covering technical and behavioral competencies",
    "rounds": [
      {
        "name": "Technical Screen",
        "durationMinutes": 45,
        "questions": ["What is the difference between a process and a thread?", "What is a REST API?"]
      },
      {
        "name": "System Design",
        "durationMinutes": 60,
        "questions": ["Design a URL shortener"]
      }
    ],
    "rubric": [
      {
        "dimension": "Problem Solving",
        "signals": ["Breaks problems into steps", "Considers edge cases"]
      }
    ]
  },
  "feedback": "Reduce trivia questions and add more practical system design and debugging scenarios"
}
```

---

**evaluate** → POST http://localhost:5001/api/interview/evaluate

```json
{
  "profile": {
    "candidateName": "Jane Smith",
    "email": "jane@example.com",
    "currentTitle": "Senior Developer",
    "yearsExperience": 5,
    "coreSkills": ["C#", ".NET 8", "Azure"],
    "roles": ["Senior Developer at Acme Corp"],
    "notableProjects": ["Microservices migration"],
    "redFlags": []
  },
  "plan": {
    "role": "Senior Software Engineer",
    "level": "Senior",
    "summary": "Balanced technical interview for senior backend role",
    "rounds": [
      {
        "name": "System Design",
        "durationMinutes": 60,
        "questions": ["Design a distributed job queue"]
      }
    ],
    "rubric": [
      {
        "dimension": "System Design",
        "signals": ["Understands trade-offs", "Considers scalability"]
      }
    ]
  },
  "notes": "Candidate showed strong understanding of distributed systems. Hesitated on database normalization. Excellent communication and structured thinking."
}
```

---

After receiving the response:
1. Show the raw JSON response
2. Summarize what the response contains in 2-3 sentences
3. Flag any unexpected fields, errors, or non-200 status codes
