import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Clearing database...')

  // Delete in FK-safe order
  await prisma.adminOverrideLog.deleteMany()
  await prisma.userBadge.deleteMany()
  await prisma.badge.deleteMany()
  await prisma.streakRecord.deleteMany()
  await prisma.xPTransaction.deleteMany()
  await prisma.projectCriterionScore.deleteMany()
  await prisma.projectGrade.deleteMany()
  await prisma.projectSubmission.deleteMany()
  await prisma.rubricCriterion.deleteMany()
  await prisma.project.deleteMany()
  await prisma.quizAttemptAnswer.deleteMany()
  await prisma.quizAttempt.deleteMany()
  await prisma.answerOption.deleteMany()
  await prisma.question.deleteMany()
  await prisma.quiz.deleteMany()
  await prisma.reference.deleteMany()
  await prisma.userSubtopicProgress.deleteMany()
  await prisma.userWeekProgress.deleteMany()
  await prisma.subtopic.deleteMany()
  await prisma.topic.deleteMany()
  await prisma.week.deleteMany()
  await prisma.user.deleteMany()
  await prisma.cohort.deleteMany()

  console.log('Creating cohort...')
  const cohort = await prisma.cohort.create({
    data: {
      name: 'Cohort 1 - May 2026',
      startDate: new Date('2026-05-01'),
    },
  })

  console.log('Creating users...')
  const adminPassword = await bcrypt.hash('Admin123!', 10)
  const learnerPassword = await bcrypt.hash('Learn123!', 10)

  await prisma.user.create({
    data: {
      email: 'admin@manmatters.com',
      password: adminPassword,
      displayName: 'Admin',
      role: 'admin',
    },
  })

  await prisma.user.create({
    data: {
      email: 'sarah@manmatters.com',
      password: adminPassword,
      displayName: 'Sarah',
      role: 'admin',
    },
  })

  const alex = await prisma.user.create({
    data: {
      email: 'alex@manmatters.com',
      password: learnerPassword,
      displayName: 'Alex',
      role: 'learner',
      cohortId: cohort.id,
    },
  })

  const sam = await prisma.user.create({
    data: {
      email: 'sam@manmatters.com',
      password: learnerPassword,
      displayName: 'Sam',
      role: 'learner',
      cohortId: cohort.id,
    },
  })

  console.log('Creating weeks...')
  const weeksData = [
    { number: 1, title: 'Boot Sequence',   description: 'Lay the technical foundation — internet, APIs, tools, and data formats.', isPublished: true,  badgeName: 'Bootloaded',       badgeIcon: '🔧' },
    { number: 2, title: 'AI in the Wild',  description: 'Explore how AI is reshaping products, workflows, and decision-making.', isPublished: false, badgeName: 'Wired In',         badgeIcon: '🤖' },
    { number: 3, title: 'Data Matters',    description: 'Learn to collect, analyse, and act on data that drives product decisions.', isPublished: false, badgeName: 'In the Loop',      badgeIcon: '📊' },
    { number: 4, title: 'Market Fit',      description: 'Understand customers, competitors, and how to position for growth.', isPublished: false, badgeName: 'Halfway There',     badgeIcon: '🎯' },
    { number: 5, title: 'Build and Ship',  description: 'Develop the skills to prototype, iterate, and deliver fast.', isPublished: false, badgeName: 'Deep Stack',       badgeIcon: '🚀' },
    { number: 6, title: 'Growth Loops',    description: 'Design acquisition and retention loops that scale your product.', isPublished: false, badgeName: 'Growth Mode',      badgeIcon: '📈' },
    { number: 7, title: 'Brand Voice',     description: 'Craft a compelling narrative and communicate your product story.', isPublished: false, badgeName: 'Almost Shipped',   badgeIcon: '✍️' },
    { number: 8, title: 'Final Deploy',    description: 'Capstone week — present your work and prepare for the real world.', isPublished: false, badgeName: 'Fully Deployed',   badgeIcon: '🌟' },
  ]

  const weeks: Record<number, string> = {}
  for (const w of weeksData) {
    const week = await prisma.week.create({ data: w })
    weeks[w.number] = week.id
  }

  console.log('Creating Week 1 curriculum...')
  const week1Id = weeks[1]

  // ─── Topic 1: Internet & APIs ───────────────────────────────────────────────
  const topic1 = await prisma.topic.create({
    data: { weekId: week1Id, title: 'Internet & APIs', tag: 'tech', sortOrder: 0 },
  })

  // Subtopic 1-1: Client, server, request, response
  const sub1_1 = await prisma.subtopic.create({
    data: { topicId: topic1.id, title: 'Client, server, request, response', tag: 'tech', sortOrder: 0 },
  })
  const quiz1_1 = await prisma.quiz.create({
    data: { subtopicId: sub1_1.id, status: 'live', passThreshold: 80 },
  })
  await createQuestions(quiz1_1.id, [
    { type: 'mcq', text: 'In HTTP communication, which party initiates a request?', points: 1, options: [
      { text: 'Client', isCorrect: true }, { text: 'Server', isCorrect: false }, { text: 'Database', isCorrect: false }, { text: 'Router', isCorrect: false },
    ]},
    { type: 'mcq', text: 'What does a server send back after processing a request?', points: 1, options: [
      { text: 'A query', isCorrect: false }, { text: 'A response', isCorrect: true }, { text: 'A router packet', isCorrect: false }, { text: 'A session token only', isCorrect: false },
    ]},
    { type: 'mcq', text: 'Which protocol is most commonly used for web communication?', points: 1, options: [
      { text: 'FTP', isCorrect: false }, { text: 'HTTP', isCorrect: true }, { text: 'SMTP', isCorrect: false }, { text: 'SSH', isCorrect: false },
    ]},
    { type: 'true_false', text: 'A client always waits for a server response before proceeding.', points: 1, options: [
      { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
    ]},
    { type: 'true_false', text: 'One server can handle requests from multiple clients simultaneously.', points: 1, options: [
      { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
    ]},
  ])

  // Subtopic 1-2: HTTP, HTTPS, status codes
  const sub1_2 = await prisma.subtopic.create({
    data: { topicId: topic1.id, title: 'HTTP, HTTPS, status codes', tag: 'tech', sortOrder: 1 },
  })
  const quiz1_2 = await prisma.quiz.create({
    data: { subtopicId: sub1_2.id, status: 'live', passThreshold: 80 },
  })
  await createQuestions(quiz1_2.id, [
    { type: 'mcq', text: 'What does the HTTP status code 404 mean?', points: 1, options: [
      { text: 'Server error', isCorrect: false }, { text: 'Resource not found', isCorrect: true }, { text: 'Unauthorized', isCorrect: false }, { text: 'Request timeout', isCorrect: false },
    ]},
    { type: 'mcq', text: 'What is the key difference between HTTP and HTTPS?', points: 1, options: [
      { text: 'HTTPS is faster', isCorrect: false }, { text: 'HTTPS encrypts data in transit using TLS', isCorrect: true }, { text: 'HTTP uses port 443', isCorrect: false }, { text: 'HTTPS requires no server', isCorrect: false },
    ]},
    { type: 'mcq', text: 'Which HTTP status code range indicates a successful response?', points: 1, options: [
      { text: '1xx', isCorrect: false }, { text: '2xx', isCorrect: true }, { text: '3xx', isCorrect: false }, { text: '4xx', isCorrect: false },
    ]},
    { type: 'true_false', text: 'A 5xx status code indicates a client-side error.', points: 1, options: [
      { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
    ]},
    { type: 'true_false', text: 'HTTP status code 200 means the request was successful.', points: 1, options: [
      { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
    ]},
  ])

  // Subtopic 1-3: What an API is
  const sub1_3 = await prisma.subtopic.create({
    data: { topicId: topic1.id, title: 'What an API is', tag: 'tech', sortOrder: 2 },
  })
  const quiz1_3 = await prisma.quiz.create({
    data: { subtopicId: sub1_3.id, status: 'live', passThreshold: 80 },
  })
  await createQuestions(quiz1_3.id, [
    { type: 'mcq', text: 'What does API stand for?', points: 1, options: [
      { text: 'Application Programming Interface', isCorrect: true }, { text: 'Automated Process Integration', isCorrect: false }, { text: 'Advanced Protocol Input', isCorrect: false }, { text: 'Application Protocol Index', isCorrect: false },
    ]},
    { type: 'mcq', text: 'Which best describes what an API does?', points: 1, options: [
      { text: 'Stores data in a database', isCorrect: false }, { text: 'Allows two applications to communicate with each other', isCorrect: true }, { text: 'Renders HTML in a browser', isCorrect: false }, { text: 'Compiles source code', isCorrect: false },
    ]},
    { type: 'mcq', text: 'Which of the following is a real-world analogy for an API?', points: 1, options: [
      { text: 'A filing cabinet', isCorrect: false }, { text: 'A waiter taking orders between customer and kitchen', isCorrect: true }, { text: 'A power plant', isCorrect: false }, { text: 'A compiler', isCorrect: false },
    ]},
    { type: 'true_false', text: 'APIs can only be used between applications on the same server.', points: 1, options: [
      { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
    ]},
    { type: 'true_false', text: 'A public API can be accessed by anyone who has the correct endpoint URL and credentials.', points: 1, options: [
      { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
    ]},
  ])

  // Subtopic 1-4: REST: GET, POST, DELETE
  const sub1_4 = await prisma.subtopic.create({
    data: { topicId: topic1.id, title: 'REST: GET, POST, DELETE', tag: 'tech', sortOrder: 3 },
  })
  const quiz1_4 = await prisma.quiz.create({
    data: { subtopicId: sub1_4.id, status: 'live', passThreshold: 80 },
  })
  await createQuestions(quiz1_4.id, [
    { type: 'mcq', text: 'Which HTTP method is used to retrieve data from a REST API?', points: 1, options: [
      { text: 'POST', isCorrect: false }, { text: 'DELETE', isCorrect: false }, { text: 'GET', isCorrect: true }, { text: 'PATCH', isCorrect: false },
    ]},
    { type: 'mcq', text: 'Which HTTP method is typically used to create a new resource?', points: 1, options: [
      { text: 'GET', isCorrect: false }, { text: 'POST', isCorrect: true }, { text: 'DELETE', isCorrect: false }, { text: 'HEAD', isCorrect: false },
    ]},
    { type: 'mcq', text: 'In REST, what does it mean for an operation to be "idempotent"?', points: 1, options: [
      { text: 'It runs automatically', isCorrect: false }, { text: 'Calling it multiple times produces the same result', isCorrect: true }, { text: 'It requires authentication', isCorrect: false }, { text: 'It returns no data', isCorrect: false },
    ]},
    { type: 'true_false', text: 'A DELETE request permanently removes a resource from the server.', points: 1, options: [
      { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
    ]},
    { type: 'true_false', text: 'REST stands for Representational State Transfer.', points: 1, options: [
      { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
    ]},
  ])

  // Subtopic 1-5: JSON as the universal language
  const sub1_5 = await prisma.subtopic.create({
    data: { topicId: topic1.id, title: 'JSON as the universal language', tag: 'tech', sortOrder: 4 },
  })
  const quiz1_5 = await prisma.quiz.create({
    data: { subtopicId: sub1_5.id, status: 'live', passThreshold: 80 },
  })
  await createQuestions(quiz1_5.id, [
    { type: 'mcq', text: 'What does JSON stand for?', points: 1, options: [
      { text: 'JavaScript Object Notation', isCorrect: true }, { text: 'Java Serialized Object Network', isCorrect: false }, { text: 'Joint Structured Output Node', isCorrect: false }, { text: 'JavaScript Open Network', isCorrect: false },
    ]},
    { type: 'mcq', text: 'Which of the following is valid JSON?', points: 1, options: [
      { text: "{ name: 'Alex' }", isCorrect: false }, { text: '{ "name": "Alex" }', isCorrect: true }, { text: '{ name = "Alex" }', isCorrect: false }, { text: '<name>Alex</name>', isCorrect: false },
    ]},
    { type: 'mcq', text: 'What data type does JSON NOT natively support?', points: 1, options: [
      { text: 'String', isCorrect: false }, { text: 'Array', isCorrect: false }, { text: 'Date object', isCorrect: true }, { text: 'Boolean', isCorrect: false },
    ]},
    { type: 'true_false', text: 'JSON keys must be enclosed in double quotes.', points: 1, options: [
      { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
    ]},
    { type: 'true_false', text: 'JSON can only represent flat (non-nested) data structures.', points: 1, options: [
      { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
    ]},
  ])

  // Subtopic 1-6: Postman — call a real API (PROJECT)
  const sub1_6 = await prisma.subtopic.create({
    data: { topicId: topic1.id, title: 'Postman — call a real API', tag: 'tech', sortOrder: 5 },
  })
  await prisma.project.create({
    data: {
      subtopicId: sub1_6.id,
      title: 'Postman API Explorer',
      briefText: 'Use Postman to call a public API (e.g., JSONPlaceholder or Open-Meteo). Make at least 3 different API calls: a GET, a POST, and one with query parameters. Document what each call returns.',
      expectedOutput: 'Share a Postman Collection export link or screenshot showing your 3 API calls with their responses.',
      isPublished: true,
      criteria: {
        create: [
          { name: 'API Calls Made', description: 'Made all 3 required API call types', maxMarks: 10, sortOrder: 0 },
          { name: 'Understanding', description: 'Notes or descriptions show understanding of request/response', maxMarks: 10, sortOrder: 1 },
          { name: 'Documentation', description: 'Collection is well-organized and shared correctly', maxMarks: 5, sortOrder: 2 },
        ],
      },
    },
  })

  // ─── Topic 2: Systems Mental Model ──────────────────────────────────────────
  const topic2 = await prisma.topic.create({
    data: { weekId: week1Id, title: 'Systems Mental Model', tag: 'tech', sortOrder: 1 },
  })

  const sysSubtopics = [
    { title: 'Frontend vs backend', sortOrder: 0, questions: [
      { type: 'mcq', text: 'What best describes the "frontend" of a web application?', points: 1, options: [
        { text: 'The server that processes data', isCorrect: false }, { text: 'The part of the app users see and interact with', isCorrect: true }, { text: 'The database layer', isCorrect: false }, { text: 'The CI/CD pipeline', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which language is primarily used for styling the frontend?', points: 1, options: [
        { text: 'Python', isCorrect: false }, { text: 'SQL', isCorrect: false }, { text: 'CSS', isCorrect: true }, { text: 'Bash', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which of the following is a backend concern?', points: 1, options: [
        { text: 'Button color', isCorrect: false }, { text: 'Font size', isCorrect: false }, { text: 'User authentication logic', isCorrect: true }, { text: 'CSS animations', isCorrect: false },
      ]},
      { type: 'true_false', text: 'JavaScript can be used for both frontend and backend development.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'The backend is directly visible to end users in a browser.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
    ]},
    { title: 'What a database is and why', sortOrder: 1, questions: [
      { type: 'mcq', text: 'Which of the following is a relational database?', points: 1, options: [
        { text: 'MongoDB', isCorrect: false }, { text: 'Redis', isCorrect: false }, { text: 'PostgreSQL', isCorrect: true }, { text: 'Kafka', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What language is used to query a relational database?', points: 1, options: [
        { text: 'JSON', isCorrect: false }, { text: 'SQL', isCorrect: true }, { text: 'HTML', isCorrect: false }, { text: 'CSS', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Why do applications use databases instead of storing data in files?', points: 1, options: [
        { text: 'Files cannot store text', isCorrect: false }, { text: 'Databases support concurrent access, indexing, and querying at scale', isCorrect: true }, { text: 'Databases are always faster than files', isCorrect: false }, { text: 'Files require internet access', isCorrect: false },
      ]},
      { type: 'true_false', text: 'A primary key uniquely identifies each record in a database table.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'NoSQL databases cannot store structured data.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
    ]},
    { title: 'What the cloud is', sortOrder: 2, questions: [
      { type: 'mcq', text: 'What does "the cloud" refer to in software?', points: 1, options: [
        { text: 'Local storage on your laptop', isCorrect: false }, { text: 'Remote servers accessed over the internet', isCorrect: true }, { text: 'A type of programming language', isCorrect: false }, { text: 'A browser extension', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which is an example of a cloud platform?', points: 1, options: [
        { text: 'Notepad', isCorrect: false }, { text: 'AWS (Amazon Web Services)', isCorrect: true }, { text: 'Microsoft Word', isCorrect: false }, { text: 'VLC Media Player', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is "serverless" computing?', points: 1, options: [
        { text: 'Running code without any computers', isCorrect: false }, { text: 'Running functions in the cloud without managing server infrastructure', isCorrect: true }, { text: 'Storing files only on local drives', isCorrect: false }, { text: 'A type of database', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Cloud providers charge based on resources consumed (pay-as-you-go).', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Once you deploy to the cloud, you can never move your app elsewhere.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
    ]},
    { title: 'What version control does', sortOrder: 3, questions: [
      { type: 'mcq', text: 'What is the primary purpose of version control?', points: 1, options: [
        { text: 'To speed up code execution', isCorrect: false }, { text: 'To track changes to code over time and enable collaboration', isCorrect: true }, { text: 'To compile code', isCorrect: false }, { text: 'To deploy applications', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is a "commit" in Git?', points: 1, options: [
        { text: 'A type of branch', isCorrect: false }, { text: 'A snapshot of your changes saved to the repository', isCorrect: true }, { text: 'A server deployment', isCorrect: false }, { text: 'A merge conflict', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What does git clone do?', points: 1, options: [
        { text: 'Deletes a repository', isCorrect: false }, { text: 'Creates a local copy of a remote repository', isCorrect: true }, { text: 'Merges two branches', isCorrect: false }, { text: 'Pushes code to GitHub', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Git is a distributed version control system.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'You can only use version control for code files.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
    ]},
    { title: 'Environment variables — never hardcode', sortOrder: 4, questions: [
      { type: 'mcq', text: 'What is an environment variable?', points: 1, options: [
        { text: 'A variable that changes based on screen size', isCorrect: false }, { text: 'A configuration value stored outside your code', isCorrect: true }, { text: 'A constant defined in the HTML file', isCorrect: false }, { text: 'A database column', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Why should API keys never be hardcoded in source code?', points: 1, options: [
        { text: 'They take up too much memory', isCorrect: false }, { text: 'They can be exposed publicly if the code is shared or committed to version control', isCorrect: true }, { text: 'They slow down the app', isCorrect: false }, { text: 'They are not valid as strings', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which file is conventionally used to store environment variables locally?', points: 1, options: [
        { text: 'config.json', isCorrect: false }, { text: '.env', isCorrect: true }, { text: 'secrets.txt', isCorrect: false }, { text: 'variables.yml', isCorrect: false },
      ]},
      { type: 'true_false', text: 'The .env file should be added to .gitignore to prevent it from being committed.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Environment variables are identical across all deployment environments by design.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
    ]},
  ]

  for (const st of sysSubtopics) {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic2.id, title: st.title, tag: 'tech', sortOrder: st.sortOrder },
    })
    const quiz = await prisma.quiz.create({
      data: { subtopicId: sub.id, status: 'live', passThreshold: 80 },
    })
    await createQuestions(quiz.id, st.questions)
  }

  // ─── Topic 3: Tools Setup ────────────────────────────────────────────────────
  const topic3 = await prisma.topic.create({
    data: { weekId: week1Id, title: 'Tools Setup', tag: 'tech', sortOrder: 2 },
  })

  const toolsSubtopics = [
    { title: 'VS Code + Python extension', sortOrder: 0, questions: [
      { type: 'mcq', text: 'What is VS Code?', points: 1, options: [
        { text: 'A cloud database', isCorrect: false }, { text: 'A lightweight, extensible code editor by Microsoft', isCorrect: true }, { text: 'A web browser', isCorrect: false }, { text: 'A Python framework', isCorrect: false },
      ]},
      { type: 'mcq', text: 'How do you install extensions in VS Code?', points: 1, options: [
        { text: 'By editing the config.yaml file', isCorrect: false }, { text: 'Through the Extensions panel (Ctrl+Shift+X)', isCorrect: true }, { text: 'By restarting the computer', isCorrect: false }, { text: 'Via terminal only', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What does the Python extension add to VS Code?', points: 1, options: [
        { text: 'A new programming language', isCorrect: false }, { text: 'Syntax highlighting, IntelliSense, and debugging for Python', isCorrect: true }, { text: 'A database browser', isCorrect: false }, { text: 'A new file system', isCorrect: false },
      ]},
      { type: 'true_false', text: 'VS Code supports multiple programming languages through extensions.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'You need to install VS Code separately for each project.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
    ]},
    { title: 'Git & GitHub basics', sortOrder: 1, questions: [
      { type: 'mcq', text: 'What is GitHub?', points: 1, options: [
        { text: 'A code editor', isCorrect: false }, { text: 'A cloud-hosted platform for Git repositories', isCorrect: true }, { text: 'A programming language', isCorrect: false }, { text: 'A browser plugin', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What does git push do?', points: 1, options: [
        { text: 'Downloads remote changes', isCorrect: false }, { text: 'Uploads local commits to a remote repository', isCorrect: true }, { text: 'Creates a new branch', isCorrect: false }, { text: 'Deletes a file', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is a repository in Git?', points: 1, options: [
        { text: 'A configuration file', isCorrect: false }, { text: 'A directory containing your project and its full version history', isCorrect: true }, { text: 'A branch', isCorrect: false }, { text: 'A merge conflict', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Git and GitHub are the same thing.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
      { type: 'true_false', text: 'A GitHub repository can be public or private.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
    ]},
    { title: 'Notion for docs', sortOrder: 2, questions: [
      { type: 'mcq', text: 'What type of tool is Notion?', points: 1, options: [
        { text: 'A code editor', isCorrect: false }, { text: 'An all-in-one workspace for notes, docs, and project management', isCorrect: true }, { text: 'A deployment platform', isCorrect: false }, { text: 'A database engine', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is a Notion "database"?', points: 1, options: [
        { text: 'A SQL server', isCorrect: false }, { text: 'A structured collection of pages with properties and views', isCorrect: true }, { text: 'A cloud storage bucket', isCorrect: false }, { text: 'A spreadsheet macro', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which feature in Notion allows you to link related pages together?', points: 1, options: [
        { text: 'Code blocks', isCorrect: false }, { text: 'Relations', isCorrect: true }, { text: 'Toggle lists', isCorrect: false }, { text: 'Callouts', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Notion pages can be shared with external collaborators via a link.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Notion can only be used for personal note-taking, not team collaboration.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
    ]},
    { title: 'Claude.ai + Cursor orientation', sortOrder: 3, questions: [
      { type: 'mcq', text: 'What is Cursor?', points: 1, options: [
        { text: 'A mouse pointer tool', isCorrect: false }, { text: 'An AI-powered code editor built on VS Code', isCorrect: true }, { text: 'A terminal emulator', isCorrect: false }, { text: 'A cloud database', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is Claude.ai primarily used for?', points: 1, options: [
        { text: 'Hosting websites', isCorrect: false }, { text: 'AI-powered conversations, writing, and analysis', isCorrect: true }, { text: 'Storing files', isCorrect: false }, { text: 'Running SQL queries', isCorrect: false },
      ]},
      { type: 'mcq', text: 'How does Cursor differ from standard VS Code?', points: 1, options: [
        { text: 'It only supports Python', isCorrect: false }, { text: 'It has built-in AI features for code generation and editing', isCorrect: true }, { text: 'It cannot run extensions', isCorrect: false }, { text: 'It requires a subscription to edit files', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Claude.ai can help you debug code by explaining error messages.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Cursor replaces the need for any coding knowledge entirely.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
    ]},
  ]

  for (const st of toolsSubtopics) {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic3.id, title: st.title, tag: 'tech', sortOrder: st.sortOrder },
    })
    const quiz = await prisma.quiz.create({
      data: { subtopicId: sub.id, status: 'live', passThreshold: 80 },
    })
    await createQuestions(quiz.id, st.questions)
  }

  // ─── Topic 4: Data Formats ───────────────────────────────────────────────────
  const topic4 = await prisma.topic.create({
    data: { weekId: week1Id, title: 'Data Formats', tag: 'tech', sortOrder: 3 },
  })

  const dataFormatSubtopics = [
    { title: 'JSON — parse, write, use with APIs', sortOrder: 0, questions: [
      { type: 'mcq', text: 'In Python, which library is used to parse JSON?', points: 1, options: [
        { text: 'csv', isCorrect: false }, { text: 'json', isCorrect: true }, { text: 'xml', isCorrect: false }, { text: 'yaml', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What does JSON.parse() do in JavaScript?', points: 1, options: [
        { text: 'Converts a JavaScript object to JSON string', isCorrect: false }, { text: 'Converts a JSON string to a JavaScript object', isCorrect: true }, { text: 'Sends a network request', isCorrect: false }, { text: 'Validates an HTML form', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which Python function converts a dict to a JSON string?', points: 1, options: [
        { text: 'json.loads()', isCorrect: false }, { text: 'json.dumps()', isCorrect: true }, { text: 'json.read()', isCorrect: false }, { text: 'json.encode()', isCorrect: false },
      ]},
      { type: 'true_false', text: 'JSON arrays are ordered collections of values.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'JSON supports comments using the // syntax.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
    ]},
    { title: 'CSV — structure, encoding, edge cases', sortOrder: 1, questions: [
      { type: 'mcq', text: 'What does CSV stand for?', points: 1, options: [
        { text: 'Compiled Structured Values', isCorrect: false }, { text: 'Comma-Separated Values', isCorrect: true }, { text: 'Complex System Variables', isCorrect: false }, { text: 'Content Storage Volume', isCorrect: false },
      ]},
      { type: 'mcq', text: 'How should you handle a comma inside a CSV field?', points: 1, options: [
        { text: 'Remove it', isCorrect: false }, { text: 'Wrap the field in double quotes', isCorrect: true }, { text: 'Replace it with a semicolon', isCorrect: false }, { text: 'Add a backslash before it', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which encoding is most commonly recommended for CSV files to avoid character issues?', points: 1, options: [
        { text: 'ASCII', isCorrect: false }, { text: 'UTF-8', isCorrect: true }, { text: 'ISO-8859-1', isCorrect: false }, { text: 'UTF-16', isCorrect: false },
      ]},
      { type: 'true_false', text: 'CSV files always use commas as delimiters.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
      { type: 'true_false', text: 'The first row of a CSV file typically contains column headers.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
    ]},
    { title: 'Markdown — docs and READMEs', sortOrder: 2, questions: [
      { type: 'mcq', text: 'What syntax creates a top-level heading in Markdown?', points: 1, options: [
        { text: '## Heading', isCorrect: false }, { text: '# Heading', isCorrect: true }, { text: '**Heading**', isCorrect: false }, { text: '<h1>Heading</h1>', isCorrect: false },
      ]},
      { type: 'mcq', text: 'How do you create a code block in Markdown?', points: 1, options: [
        { text: 'Surround with <code> tags', isCorrect: false }, { text: 'Use triple backticks (```)', isCorrect: true }, { text: 'Indent with 2 spaces', isCorrect: false }, { text: 'Use double asterisks', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What file extension is typically used for Markdown files?', points: 1, options: [
        { text: '.txt', isCorrect: false }, { text: '.md', isCorrect: true }, { text: '.html', isCorrect: false }, { text: '.doc', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Markdown can be rendered as HTML.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Markdown requires a special editor to read.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
    ]},
    { title: 'HTML basics — read page structure', sortOrder: 3, questions: [
      { type: 'mcq', text: 'What does HTML stand for?', points: 1, options: [
        { text: 'Hypertext Markup Language', isCorrect: true }, { text: 'High-level Text Management Layer', isCorrect: false }, { text: 'Hyperlink Transfer Markup Language', isCorrect: false }, { text: 'Hosted Template Markup Logic', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which tag defines the main content of an HTML page?', points: 1, options: [
        { text: '<head>', isCorrect: false }, { text: '<body>', isCorrect: true }, { text: '<footer>', isCorrect: false }, { text: '<meta>', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is the purpose of the <head> element in HTML?', points: 1, options: [
        { text: 'To display the page title on screen', isCorrect: false }, { text: 'To contain metadata like title, CSS links, and scripts', isCorrect: true }, { text: 'To hold all visible content', isCorrect: false }, { text: 'To define the page footer', isCorrect: false },
      ]},
      { type: 'true_false', text: 'HTML tags are case-sensitive.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
      { type: 'true_false', text: 'A <div> element is a generic block-level container in HTML.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
    ]},
  ]

  for (const st of dataFormatSubtopics) {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic4.id, title: st.title, tag: 'tech', sortOrder: st.sortOrder },
    })
    const quiz = await prisma.quiz.create({
      data: { subtopicId: sub.id, status: 'live', passThreshold: 80 },
    })
    await createQuestions(quiz.id, st.questions)
  }

  // ─── Topic 5: Google Sheets ──────────────────────────────────────────────────
  const topic5 = await prisma.topic.create({
    data: { weekId: week1Id, title: 'Google Sheets', tag: 'tech', sortOrder: 4 },
  })

  const sheetsSubtopics = [
    { title: 'VLOOKUP, INDEX/MATCH', sortOrder: 0, questions: [
      { type: 'mcq', text: 'What does VLOOKUP stand for?', points: 1, options: [
        { text: 'Value Lookup', isCorrect: false }, { text: 'Vertical Lookup', isCorrect: true }, { text: 'Variable Lookup', isCorrect: false }, { text: 'Vectorized Lookup', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is an advantage of INDEX/MATCH over VLOOKUP?', points: 1, options: [
        { text: 'INDEX/MATCH is easier to type', isCorrect: false }, { text: 'INDEX/MATCH can look left and is not column-order dependent', isCorrect: true }, { text: 'INDEX/MATCH is faster to calculate', isCorrect: false }, { text: 'INDEX/MATCH works offline', isCorrect: false },
      ]},
      { type: 'mcq', text: 'In VLOOKUP, what does the 4th argument (range_lookup) control?', points: 1, options: [
        { text: 'The column to return', isCorrect: false }, { text: 'Whether to use approximate or exact match', isCorrect: true }, { text: 'The number of rows to search', isCorrect: false }, { text: 'Whether to sort the result', isCorrect: false },
      ]},
      { type: 'true_false', text: 'VLOOKUP searches the leftmost column of a table.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'INDEX/MATCH requires the lookup column to be the first column.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
    ]},
    { title: 'SUMIF, COUNTIF, AVERAGEIF', sortOrder: 1, questions: [
      { type: 'mcq', text: 'What does COUNTIF do?', points: 1, options: [
        { text: 'Counts all numbers in a range', isCorrect: false }, { text: 'Counts cells that meet a specified condition', isCorrect: true }, { text: 'Sums values based on a condition', isCorrect: false }, { text: 'Averages all values in a column', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which formula sums values in B2:B10 where A2:A10 equals "Tech"?', points: 1, options: [
        { text: '=SUM(B2:B10, "Tech")', isCorrect: false }, { text: '=SUMIF(A2:A10, "Tech", B2:B10)', isCorrect: true }, { text: '=COUNTIF(B2:B10, A2:A10)', isCorrect: false }, { text: '=AVERAGEIF("Tech", A2:A10)', isCorrect: false },
      ]},
      { type: 'mcq', text: 'AVERAGEIF calculates the average of values where...', points: 1, options: [
        { text: 'All values are positive', isCorrect: false }, { text: 'A corresponding range meets a given criterion', isCorrect: true }, { text: 'The column is sorted', isCorrect: false }, { text: 'Values exceed the median', isCorrect: false },
      ]},
      { type: 'true_false', text: 'SUMIFS (with an S) allows multiple conditions.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'COUNTIF can only count numeric values.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
    ]},
    { title: 'Pivot tables', sortOrder: 2, questions: [
      { type: 'mcq', text: 'What is the main purpose of a pivot table?', points: 1, options: [
        { text: 'To sort a spreadsheet alphabetically', isCorrect: false }, { text: 'To summarise and analyse large datasets interactively', isCorrect: true }, { text: 'To create charts automatically', isCorrect: false }, { text: 'To format cells with colours', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which section of a pivot table defines the categories shown as rows?', points: 1, options: [
        { text: 'Values', isCorrect: false }, { text: 'Rows', isCorrect: true }, { text: 'Filters', isCorrect: false }, { text: 'Columns', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What happens when you refresh a pivot table?', points: 1, options: [
        { text: 'It resets to default settings', isCorrect: false }, { text: 'It updates to reflect changes in the source data', isCorrect: true }, { text: 'It deletes custom formatting', isCorrect: false }, { text: 'It exports to CSV', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Pivot tables can group dates by month or quarter automatically.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Editing a pivot table directly changes the source data.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
    ]},
    { title: 'Data validation & named ranges', sortOrder: 3, questions: [
      { type: 'mcq', text: 'What does data validation in Google Sheets do?', points: 1, options: [
        { text: 'Automatically corrects spelling', isCorrect: false }, { text: 'Restricts what values can be entered in a cell', isCorrect: true }, { text: 'Exports data to a CSV', isCorrect: false }, { text: 'Encrypts cell contents', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is a named range in Google Sheets?', points: 1, options: [
        { text: 'A sheet with a custom tab name', isCorrect: false }, { text: 'A cell range assigned a descriptive name for easier reference in formulas', isCorrect: true }, { text: 'A column with a header row', isCorrect: false }, { text: 'A protected range', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which validation type creates a dropdown list in a cell?', points: 1, options: [
        { text: 'Number', isCorrect: false }, { text: 'List of items', isCorrect: true }, { text: 'Text length', isCorrect: false }, { text: 'Date', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Named ranges make formulas more readable and maintainable.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Data validation prevents users from pasting invalid values.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
    ]},
    { title: 'Sheets API via Python', sortOrder: 4, questions: [
      { type: 'mcq', text: 'Which Google library is used to access Sheets from Python?', points: 1, options: [
        { text: 'google-sheets', isCorrect: false }, { text: 'google-api-python-client or gspread', isCorrect: true }, { text: 'pandas-sheets', isCorrect: false }, { text: 'pygoogle', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What authentication method does the Sheets API require?', points: 1, options: [
        { text: 'Username and password', isCorrect: false }, { text: 'OAuth 2.0 credentials or a service account key', isCorrect: true }, { text: 'An API URL key only', isCorrect: false }, { text: 'No authentication', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is a service account used for when accessing Google Sheets via Python?', points: 1, options: [
        { text: 'Creating new Google accounts', isCorrect: false }, { text: 'Allowing server-side code to authenticate without user interaction', isCorrect: true }, { text: 'Storing spreadsheet data', isCorrect: false }, { text: 'Compiling Python scripts', isCorrect: false },
      ]},
      { type: 'true_false', text: 'The Google Sheets API allows you to read and write cell values programmatically.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'You must share the spreadsheet with the service account email to grant access.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
    ]},
    { title: 'IMPORTDATA for live feeds', sortOrder: 5, questions: [
      { type: 'mcq', text: 'What does IMPORTDATA do in Google Sheets?', points: 1, options: [
        { text: 'Imports data from another sheet tab', isCorrect: false }, { text: 'Fetches data from a public CSV or TSV URL into your sheet', isCorrect: true }, { text: 'Connects to a SQL database', isCorrect: false }, { text: 'Downloads a PDF', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which function fetches structured data from an HTML table on a webpage?', points: 1, options: [
        { text: 'IMPORTDATA', isCorrect: false }, { text: 'IMPORTHTML', isCorrect: true }, { text: 'IMPORTRANGE', isCorrect: false }, { text: 'IMPORTFEED', isCorrect: false },
      ]},
      { type: 'mcq', text: 'How often does IMPORTDATA refresh by default in Google Sheets?', points: 1, options: [
        { text: 'Every second', isCorrect: false }, { text: 'Approximately every 1–2 hours', isCorrect: true }, { text: 'Once per day', isCorrect: false }, { text: 'Never — it only loads once', isCorrect: false },
      ]},
      { type: 'true_false', text: 'IMPORTRANGE can pull data from a different Google Sheet.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'IMPORTDATA can pull data from any private URL without authentication.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
    ]},
  ]

  for (const st of sheetsSubtopics) {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic5.id, title: st.title, tag: 'tech', sortOrder: st.sortOrder },
    })
    const quiz = await prisma.quiz.create({
      data: { subtopicId: sub.id, status: 'live', passThreshold: 80 },
    })
    await createQuestions(quiz.id, st.questions)
  }

  // Subtopic: Apps Script basics — PROJECT
  const appsScriptSub = await prisma.subtopic.create({
    data: { topicId: topic5.id, title: 'Apps Script basics', tag: 'tech', sortOrder: 6 },
  })
  await prisma.project.create({
    data: {
      subtopicId: appsScriptSub.id,
      title: 'Apps Script Automation',
      briefText: 'Write a Google Apps Script that reads data from one sheet, performs a calculation or transformation, and writes results to another sheet. The script should run on a trigger or button click.',
      expectedOutput: 'Share a link to your Google Sheet with the Apps Script embedded. The script must be viewable.',
      isPublished: true,
      criteria: {
        create: [
          { name: 'Script Functionality', description: 'Script runs without errors and produces correct output', maxMarks: 15, sortOrder: 0 },
          { name: 'Code Quality', description: 'Code is readable, with comments explaining logic', maxMarks: 10, sortOrder: 1 },
          { name: 'Trigger/UX', description: 'Script runs via trigger or UI button (not manual execution only)', maxMarks: 5, sortOrder: 2 },
        ],
      },
    },
  })

  // ─── Topic 6: Git & Clean Code ───────────────────────────────────────────────
  const topic6 = await prisma.topic.create({
    data: { weekId: week1Id, title: 'Git & Clean Code', tag: 'tech', sortOrder: 5 },
  })

  const gitSubtopics = [
    { title: 'init, add, commit, push, pull', sortOrder: 0, questions: [
      { type: 'mcq', text: 'Which command initialises a new Git repository?', points: 1, options: [
        { text: 'git start', isCorrect: false }, { text: 'git init', isCorrect: true }, { text: 'git create', isCorrect: false }, { text: 'git new', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What does git add . do?', points: 1, options: [
        { text: 'Commits all changes', isCorrect: false }, { text: 'Stages all changes in the current directory for the next commit', isCorrect: true }, { text: 'Pushes to remote', isCorrect: false }, { text: 'Creates a new branch', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What does git pull do?', points: 1, options: [
        { text: 'Uploads local changes to remote', isCorrect: false }, { text: 'Fetches and merges changes from the remote repository', isCorrect: true }, { text: 'Creates a new commit', isCorrect: false }, { text: 'Deletes a branch', isCorrect: false },
      ]},
      { type: 'true_false', text: 'You must stage files with git add before committing them.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'git push sends your local commits to the remote repository.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
    ]},
    { title: 'Branching & pull requests', sortOrder: 1, questions: [
      { type: 'mcq', text: 'What is the purpose of a branch in Git?', points: 1, options: [
        { text: 'To delete old commits', isCorrect: false }, { text: 'To work on changes in isolation without affecting the main codebase', isCorrect: true }, { text: 'To back up the repository', isCorrect: false }, { text: 'To host the site publicly', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is a pull request (PR)?', points: 1, options: [
        { text: 'A request to download code', isCorrect: false }, { text: 'A proposal to merge changes from one branch into another', isCorrect: true }, { text: 'A git pull command', isCorrect: false }, { text: 'A request for API access', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which command creates and switches to a new branch called "feature"?', points: 1, options: [
        { text: 'git branch feature', isCorrect: false }, { text: 'git checkout -b feature', isCorrect: true }, { text: 'git switch create feature', isCorrect: false }, { text: 'git new feature', isCorrect: false },
      ]},
      { type: 'true_false', text: 'It is good practice to review code in a pull request before merging.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'You should always commit directly to the main branch for speed.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
    ]},
    { title: 'One function = one job', sortOrder: 2, questions: [
      { type: 'mcq', text: 'Which software design principle states that a function should do only one thing?', points: 1, options: [
        { text: 'DRY (Don\'t Repeat Yourself)', isCorrect: false }, { text: 'Single Responsibility Principle', isCorrect: true }, { text: 'KISS (Keep It Simple, Stupid)', isCorrect: false }, { text: 'YAGNI', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Why should functions be kept small and focused?', points: 1, options: [
        { text: 'To reduce file size', isCorrect: false }, { text: 'To make code easier to test, read, and maintain', isCorrect: true }, { text: 'To speed up compilation', isCorrect: false }, { text: 'To reduce memory usage', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is a "side effect" in a function?', points: 1, options: [
        { text: 'A syntax error', isCorrect: false }, { text: 'When a function modifies state outside its own scope', isCorrect: true }, { text: 'A return value', isCorrect: false }, { text: 'A performance optimisation', isCorrect: false },
      ]},
      { type: 'true_false', text: 'A function that both fetches data AND formats it for display violates the single responsibility principle.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Longer functions are always more efficient than shorter ones.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
    ]},
    { title: '.env variables, never hardcode', sortOrder: 3, questions: [
      { type: 'mcq', text: 'What is the risk of hardcoding a database password in your source code?', points: 1, options: [
        { text: 'It increases app startup time', isCorrect: false }, { text: 'It can be exposed if the code is committed to a public repository', isCorrect: true }, { text: 'It breaks version control', isCorrect: false }, { text: 'It disables authentication', isCorrect: false },
      ]},
      { type: 'mcq', text: 'In Python, how do you read an environment variable named DB_URL?', points: 1, options: [
        { text: 'os.getenv("DB_URL")', isCorrect: true }, { text: 'env.read("DB_URL")', isCorrect: false }, { text: 'config["DB_URL"]', isCorrect: false }, { text: 'process.env.DB_URL', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What should you do if you accidentally commit a secret to GitHub?', points: 1, options: [
        { text: 'Delete the repository', isCorrect: false }, { text: 'Immediately rotate/revoke the exposed secret and remove it from git history', isCorrect: true }, { text: 'Ignore it since GitHub is private', isCorrect: false }, { text: 'Rename the file', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Environment variables can differ between development, staging, and production environments.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'A .env.example file (with placeholder values) is safe to commit to version control.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
    ]},
    { title: 'Logging & error handling', sortOrder: 4, questions: [
      { type: 'mcq', text: 'What is the purpose of a try/except block in Python?', points: 1, options: [
        { text: 'To speed up execution', isCorrect: false }, { text: 'To catch and handle exceptions so the program does not crash', isCorrect: true }, { text: 'To define new functions', isCorrect: false }, { text: 'To format output', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which logging level indicates a serious error that stopped the program?', points: 1, options: [
        { text: 'INFO', isCorrect: false }, { text: 'DEBUG', isCorrect: false }, { text: 'CRITICAL', isCorrect: true }, { text: 'WARNING', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Why is it bad practice to use a bare "except:" clause in Python?', points: 1, options: [
        { text: 'It is slower', isCorrect: false }, { text: 'It silently swallows all errors, including unexpected ones', isCorrect: true }, { text: 'It is deprecated', isCorrect: false }, { text: 'It prevents logging', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Logging is preferable to print() for production applications because logs can be filtered, stored, and monitored.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'You should always suppress all errors in production to avoid confusing users.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
    ]},
    { title: 'Modular file structure', sortOrder: 5, questions: [
      { type: 'mcq', text: 'What is a module in Python?', points: 1, options: [
        { text: 'A type of database', isCorrect: false }, { text: 'A single Python file that contains functions, classes, or variables', isCorrect: true }, { text: 'A compiled binary', isCorrect: false }, { text: 'A virtual environment', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is the DRY principle?', points: 1, options: [
        { text: 'Design, Review, Yield', isCorrect: false }, { text: 'Don\'t Repeat Yourself — avoid duplicating logic', isCorrect: true }, { text: 'Develop Rapidly and Yield', isCorrect: false }, { text: 'Define, Run, Yield', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Why is splitting code into multiple files beneficial?', points: 1, options: [
        { text: 'It makes deployment faster', isCorrect: false }, { text: 'It improves readability, reusability, and maintainability', isCorrect: true }, { text: 'It reduces memory usage', isCorrect: false }, { text: 'It compiles faster', isCorrect: false },
      ]},
      { type: 'true_false', text: 'A utils.py or helpers.py file is a common pattern for shared utility functions.', points: 1, options: [
        { text: 'True', isCorrect: true }, { text: 'False', isCorrect: false },
      ]},
      { type: 'true_false', text: 'All code for a project should be written in a single file for simplicity.', points: 1, options: [
        { text: 'True', isCorrect: false }, { text: 'False', isCorrect: true },
      ]},
    ]},
  ]

  for (const st of gitSubtopics) {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic6.id, title: st.title, tag: 'tech', sortOrder: st.sortOrder },
    })
    const quiz = await prisma.quiz.create({
      data: { subtopicId: sub.id, status: 'live', passThreshold: 80 },
    })
    await createQuestions(quiz.id, st.questions)
  }

  console.log('Creating badges...')
  await prisma.badge.createMany({
    data: [
      { name: 'Bootloaded',      description: 'Complete Week 1: Boot Sequence',          iconEmoji: '🔧', conditionType: 'week_complete', conditionValue: '1',             isSpecial: false },
      { name: 'Wired In',        description: 'Complete Week 2: AI in the Wild',          iconEmoji: '🤖', conditionType: 'week_complete', conditionValue: '2',             isSpecial: false },
      { name: 'In the Loop',     description: 'Complete Week 3: Data Matters',            iconEmoji: '📊', conditionType: 'week_complete', conditionValue: '3',             isSpecial: false },
      { name: 'Halfway There',   description: 'Complete Week 4: Market Fit',              iconEmoji: '🎯', conditionType: 'week_complete', conditionValue: '4',             isSpecial: true  },
      { name: 'Deep Stack',      description: 'Complete Week 5: Build and Ship',          iconEmoji: '🚀', conditionType: 'week_complete', conditionValue: '5',             isSpecial: false },
      { name: 'Growth Mode',     description: 'Complete Week 6: Growth Loops',            iconEmoji: '📈', conditionType: 'week_complete', conditionValue: '6',             isSpecial: false },
      { name: 'Almost Shipped',  description: 'Complete Week 7: Brand Voice',             iconEmoji: '✍️', conditionType: 'week_complete', conditionValue: '7',             isSpecial: false },
      { name: 'Fully Deployed',  description: 'Complete all 8 weeks',                    iconEmoji: '🌟', conditionType: 'week_complete', conditionValue: '8',             isSpecial: true  },
      { name: 'Quiz Master',     description: 'Score 95%+ on 5 or more quizzes',         iconEmoji: '🧠', conditionType: 'special',        conditionValue: 'quiz_master',   isSpecial: true  },
      { name: 'Perfectionist',   description: 'Score 100% on every quiz in a week',       iconEmoji: '💎', conditionType: 'special',        conditionValue: 'perfectionist', isSpecial: true  },
      { name: 'Ship It',         description: 'All program projects submitted and graded',iconEmoji: '📦', conditionType: 'special',        conditionValue: 'ship_it',       isSpecial: true  },
      { name: 'Streak Lord',     description: 'Maintain a 4-week learning streak',        iconEmoji: '🔥', conditionType: 'special',        conditionValue: 'streak_lord',   isSpecial: true  },
      { name: 'Speed Runner',    description: 'Complete Week 1 within 5 days',            iconEmoji: '⚡', conditionType: 'special',        conditionValue: 'speed_runner',  isSpecial: true  },
      { name: 'Early Operator',  description: 'Member of the founding cohort',            iconEmoji: '🎖️', conditionType: 'special',       conditionValue: 'early_operator',isSpecial: false },
      { name: 'All-Star',        description: 'Complete the full 8-week program',         iconEmoji: '⭐', conditionType: 'special',        conditionValue: 'all_star',      isSpecial: true  },
    ],
  })

  console.log('Unlocking Week 1 for learners...')
  const week1Record = await prisma.week.findUnique({ where: { number: 1 } })
  if (week1Record) {
    for (const learner of [alex, sam]) {
      await prisma.userWeekProgress.create({
        data: {
          userId: learner.id,
          weekId: week1Record.id,
          isUnlocked: true,
          unlockedAt: new Date(),
          unlockedByAdmin: false,
        },
      })
    }
  }

  console.log('Awarding Early Operator badge...')
  const earlyOpBadge = await prisma.badge.findFirst({ where: { conditionValue: 'early_operator' } })
  if (earlyOpBadge) {
    for (const learner of [alex, sam]) {
      await prisma.userBadge.create({
        data: { userId: learner.id, badgeId: earlyOpBadge.id },
      })
    }
  }

  console.log('Seed complete!')
}

type QuestionInput = {
  type: string
  text: string
  points: number
  options: { text: string; isCorrect: boolean }[]
}

async function createQuestions(quizId: string, questions: QuestionInput[]) {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    await prisma.question.create({
      data: {
        quizId,
        type: q.type,
        text: q.text,
        points: q.points,
        sortOrder: i,
        options: {
          create: q.options.map((o, idx) => ({
            text: o.text,
            isCorrect: o.isCorrect,
            sortOrder: idx,
          })),
        },
      },
    })
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
