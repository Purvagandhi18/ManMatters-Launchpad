import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Checking database state...')

  const adminPassword  = await bcrypt.hash('admin123',   10)
  const kunalPassword  = await bcrypt.hash('Learner123', 10)
  const sabikaPassword = await bcrypt.hash('Learner456', 10)
  const testPassword   = await bcrypt.hash('Test123',    10)

  // Ensure cohort exists
  let cohort = await prisma.cohort.findFirst({ where: { name: 'Cohort 1 - May 2026' } })
  if (!cohort) {
    cohort = await prisma.cohort.create({
      data: { name: 'Cohort 1 - May 2026', startDate: new Date('2026-05-01') },
    })
  }

  console.log('Ensuring users...')
  await prisma.user.upsert({
    where: { email: 'admin@manmatters.com' },
    create: { email: 'admin@manmatters.com', username: 'admin', password: adminPassword, displayName: 'Admin', role: 'admin' },
    update: { username: 'admin', password: adminPassword },
  })

  const kunal = await prisma.user.upsert({
    where: { email: 'kunal@manmatters.com' },
    create: { email: 'kunal@manmatters.com', username: 'kunal', password: kunalPassword, displayName: 'Kunal', role: 'learner', cohortId: cohort.id, learnerTitle: 'CURIOUS' },
    update: { username: 'kunal', password: kunalPassword, learnerTitle: 'CURIOUS' },
  })

  const sabika = await prisma.user.upsert({
    where: { email: 'sabika@manmatters.com' },
    create: { email: 'sabika@manmatters.com', username: 'sabika', password: sabikaPassword, displayName: 'Sabika', role: 'learner', cohortId: cohort.id, learnerTitle: 'BUILDER' },
    update: { username: 'sabika', password: sabikaPassword, learnerTitle: 'BUILDER' },
  })

  const test = await prisma.user.upsert({
    where: { email: 'test@internal.manmatters.com' },
    create: { email: 'test@internal.manmatters.com', username: 'test', password: testPassword, displayName: 'Test User', role: 'learner', cohortId: cohort.id, learnerTitle: 'TESTER', isTestUser: true },
    update: { username: 'test', password: testPassword, isTestUser: true },
  })

  // If curriculum already exists, just ensure unlocks and return
  const existingWeeks = await prisma.week.count()
  if (existingWeeks > 0) {
    console.log('Curriculum already exists — skipping curriculum seed.')
    await ensureWeek1Unlocked([kunal.id, sabika.id, test.id])
    console.log('Seed complete!')
    return
  }

  console.log('Creating weeks...')
  const weeksData = [
    { number: 1, title: 'Boot Sequence',   description: 'Lay the technical foundation: internet, APIs, tools, and data formats.', isPublished: true,  badgeName: 'Bootloaded',       badgeIcon: '🔧' },
    { number: 2, title: 'AI in the Wild',  description: 'Explore how AI is reshaping products, workflows, and decision-making.', isPublished: false, badgeName: 'Wired In',         badgeIcon: '🤖' },
    { number: 3, title: 'Data Matters',    description: 'Learn to collect, analyse, and act on data that drives product decisions.', isPublished: false, badgeName: 'In the Loop',      badgeIcon: '📊' },
    { number: 4, title: 'Market Fit',      description: 'Understand customers, competitors, and how to position for growth.', isPublished: false, badgeName: 'Halfway There',     badgeIcon: '🎯' },
    { number: 5, title: 'Build and Ship',  description: 'Develop the skills to prototype, iterate, and deliver fast.', isPublished: false, badgeName: 'Deep Stack',       badgeIcon: '🚀' },
    { number: 6, title: 'Growth Loops',    description: 'Design acquisition and retention loops that scale your product.', isPublished: false, badgeName: 'Growth Mode',      badgeIcon: '📈' },
    { number: 7, title: 'Brand Voice',     description: 'Craft a compelling narrative and communicate your product story.', isPublished: false, badgeName: 'Almost Shipped',   badgeIcon: '✍️' },
    { number: 8, title: 'Final Deploy',    description: 'Capstone week: present your work and prepare for the real world.', isPublished: false, badgeName: 'Fully Deployed',   badgeIcon: '🌟' },
  ]

  const weeks: Record<number, string> = {}
  for (const w of weeksData) {
    const week = await prisma.week.upsert({
      where: { number: w.number },
      create: w,
      update: {},
    })
    weeks[w.number] = week.id
  }

  console.log('Creating Week 1 curriculum...')
  const week1Id = weeks[1]

  // ─── Topic 1: Internet & APIs ───────────────────────────────────────────────
  const topic1 = await prisma.topic.create({
    data: { weekId: week1Id, title: 'Internet & APIs', tag: 'tech', sortOrder: 0 },
  })

  // Subtopic 1-1: How the internet works
  const sub1_1 = await prisma.subtopic.create({
    data: { topicId: topic1.id, title: 'How the internet works', tag: 'tech', sortOrder: 0 },
  })
  const quiz1_1 = await prisma.quiz.create({
    data: { subtopicId: sub1_1.id, status: 'live', passThreshold: 80 },
  })
  await createQuestions(quiz1_1.id, [
    { type: 'mcq', text: 'A user types a URL into their browser and hits Enter. Which sequence correctly describes what happens next?', points: 1, options: [
      { text: 'The browser searches its local database, then contacts the server directly via the URL string', isCorrect: false },
      { text: 'The browser performs a DNS lookup to resolve the domain to an IP address, then sends an HTTP request to that IP', isCorrect: true },
      { text: 'The browser sends the URL to the ISP, which returns the page HTML directly', isCorrect: false },
      { text: 'The operating system resolves the IP, then the browser sends an FTP request', isCorrect: false },
    ]},
    { type: 'mcq', text: 'A server responds to 10,000 simultaneous client requests. Which concept makes this possible without requiring 10,000 separate server machines?', points: 1, options: [
      { text: 'Each client waits in a strict queue until the previous one finishes', isCorrect: false },
      { text: 'Concurrency — the server handles multiple requests by interleaving processing, not running them one-by-one', isCorrect: true },
      { text: 'Each client connects to a different DNS server', isCorrect: false },
      { text: 'Clients cache the full server response locally so the server only responds once', isCorrect: false },
    ]},
    { type: 'mcq', text: 'You receive a valid HTTP response with status 200 but the page looks broken. What is the most likely explanation?', points: 1, options: [
      { text: 'The server is down', isCorrect: false },
      { text: 'The response body arrived correctly but linked CSS or JS assets failed to load (separate requests)', isCorrect: true },
      { text: 'DNS resolution failed', isCorrect: false },
      { text: 'The client has no internet connection', isCorrect: false },
    ]},
    { type: 'mcq', text: 'Which layer of the internet model is responsible for breaking data into packets and routing them across networks?', points: 1, options: [
      { text: 'Application layer (HTTP)', isCorrect: false },
      { text: 'Transport layer (TCP)', isCorrect: false },
      { text: 'Internet/Network layer (IP)', isCorrect: true },
      { text: 'Physical layer (Ethernet cables)', isCorrect: false },
    ]},
    { type: 'true_false', text: 'A single HTTP page load typically involves only one request-response cycle between client and server.', points: 1, options: [
      { text: 'True', isCorrect: false },
      { text: 'False', isCorrect: true },
    ]},
  ])

  // Subtopic 1-2: What an API is and why everything runs on them
  const sub1_2 = await prisma.subtopic.create({
    data: { topicId: topic1.id, title: 'What an API is and why everything runs on them', tag: 'tech', sortOrder: 1 },
  })
  const quiz1_2 = await prisma.quiz.create({
    data: { subtopicId: sub1_2.id, status: 'live', passThreshold: 80 },
  })
  await createQuestions(quiz1_2.id, [
    { type: 'mcq', text: 'Uber\'s app shows real-time maps, processes payments, and sends SMS confirmations. Each of these capabilities is owned by a different company. What architectural pattern makes this possible?', points: 1, options: [
      { text: 'Uber built all these features in-house and shares its codebase with partners', isCorrect: false },
      { text: 'Uber integrates third-party APIs (Google Maps, Stripe, Twilio) rather than rebuilding each capability', isCorrect: true },
      { text: 'The phone OS handles all these functions natively', isCorrect: false },
      { text: 'Uber uses a shared database with Google, Stripe, and Twilio', isCorrect: false },
    ]},
    { type: 'mcq', text: 'A developer calls a weather API and gets back data, but the API\'s terms of service say "1000 free calls/day." On day 3 they start getting 429 errors. What is the PRIMARY reason?', points: 1, options: [
      { text: 'The server is down for maintenance', isCorrect: false },
      { text: 'The API is enforcing a rate limit — the daily quota has been exceeded', isCorrect: true },
      { text: 'The API key has expired', isCorrect: false },
      { text: 'The JSON response format changed', isCorrect: false },
    ]},
    { type: 'mcq', text: 'Which of the following best explains WHY APIs hide implementation details from the caller?', points: 1, options: [
      { text: 'To prevent developers from understanding how their data is stored', isCorrect: false },
      { text: 'So the provider can change internal logic without breaking integrations that depend on the API contract', isCorrect: true },
      { text: 'APIs are legally required to conceal source code', isCorrect: false },
      { text: 'So that only paying customers can access the full response', isCorrect: false },
    ]},
    { type: 'mcq', text: 'A mobile app sends a user\'s location to a backend server every 5 seconds. The server responds with nearby restaurants. Which party is the client in this exchange?', points: 1, options: [
      { text: 'The restaurant database', isCorrect: false },
      { text: 'The backend server', isCorrect: false },
      { text: 'The mobile app', isCorrect: true },
      { text: 'The GPS satellite', isCorrect: false },
    ]},
    { type: 'true_false', text: 'An API contract guarantees that as long as you call the API correctly, you don\'t need to know how the server processes your request internally.', points: 1, options: [
      { text: 'True', isCorrect: true },
      { text: 'False', isCorrect: false },
    ]},
  ])

  // Subtopic 1-3: JSON — the universal language of APIs
  const sub1_3 = await prisma.subtopic.create({
    data: { topicId: topic1.id, title: 'JSON: the universal language of APIs', tag: 'tech', sortOrder: 2 },
  })
  const quiz1_3 = await prisma.quiz.create({
    data: { subtopicId: sub1_3.id, status: 'live', passThreshold: 80 },
  })
  await createQuestions(quiz1_3.id, [
    { type: 'mcq', text: 'A JSON object has a key "createdAt" with the value "2024-01-15T10:30:00Z". What is the actual data type of this value in JSON?', points: 1, options: [
      { text: 'Date', isCorrect: false },
      { text: 'String', isCorrect: true },
      { text: 'Timestamp', isCorrect: false },
      { text: 'Number', isCorrect: false },
    ]},
    { type: 'mcq', text: 'You receive this JSON from an API: {"price": "149.99"}. A teammate writes code to add 10 to it directly. What will happen?', points: 1, options: [
      { text: 'The result will be 159.99', isCorrect: false },
      { text: 'It will concatenate to "149.9910" or throw a type error — price is a string, not a number', isCorrect: true },
      { text: 'JSON automatically converts strings to numbers during arithmetic', isCorrect: false },
      { text: 'The API will reject the modified value', isCorrect: false },
    ]},
    { type: 'mcq', text: 'Which of the following is NOT valid JSON?', points: 1, options: [
      { text: '{"active": true}', isCorrect: false },
      { text: '{"count": null}', isCorrect: false },
      { text: '{"tags": ["a", "b"]}', isCorrect: false },
      { text: "{name: 'Alice'}", isCorrect: true },
    ]},
    { type: 'mcq', text: 'An API returns a deeply nested JSON object. You need the city name from: {"user": {"address": {"city": "Mumbai"}}}. Which access pattern is correct in JavaScript?', points: 1, options: [
      { text: 'data["user.address.city"]', isCorrect: false },
      { text: 'data.user.address.city', isCorrect: true },
      { text: 'data->user->address->city', isCorrect: false },
      { text: 'data.get("user").get("address").get("city")', isCorrect: false },
    ]},
    { type: 'true_false', text: 'JSON supports trailing commas after the last element in an array or object.', points: 1, options: [
      { text: 'True', isCorrect: false },
      { text: 'False', isCorrect: true },
    ]},
  ])

  // Subtopic 1-4: Your first real API call in Postman — PROJECT
  const sub1_4 = await prisma.subtopic.create({
    data: { topicId: topic1.id, title: 'Your first real API call in Postman', tag: 'tech', sortOrder: 3 },
  })
  await prisma.project.create({
    data: {
      subtopicId: sub1_4.id,
      title: 'Postman API Explorer',
      briefText: 'Use Postman to make 3 API calls to a public API (e.g. JSONPlaceholder or Open-Meteo): a GET request, a POST request, and one call using query parameters. Screenshot each response.',
      expectedOutput: 'Share a Postman Collection export or screenshots showing all 3 calls and their responses.',
      isPublished: true,
      criteria: {
        create: [
          { name: 'API Calls Made', description: 'All 3 required call types attempted', maxMarks: 10, sortOrder: 0 },
          { name: 'Response Understanding', description: 'Annotations or notes show understanding of the response', maxMarks: 10, sortOrder: 1 },
          { name: 'Organisation', description: 'Collection is clean and labelled', maxMarks: 5, sortOrder: 2 },
        ],
      },
    },
  })


  // ─── Topic 2: Systems Mental Model ──────────────────────────────────────────
  const topic2 = await prisma.topic.create({
    data: { weekId: week1Id, title: 'Systems Mental Model', tag: 'tech', sortOrder: 1 },
  })

  // Subtopic 2-1
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic2.id, title: 'Frontend vs backend: where the work lives', tag: 'tech', sortOrder: 0 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A product manager reports that clicking "Submit Order" does nothing visible for 3 seconds. A developer says the button fires correctly. Where is the bottleneck most likely located?', points: 1, options: [
        { text: 'CSS is blocking the button click event', isCorrect: false },
        { text: 'The frontend sent the request fine, but the backend is slow to process and respond', isCorrect: true },
        { text: 'The browser does not support the button element', isCorrect: false },
        { text: 'The DNS lookup is failing', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A startup decides to put all business logic — pricing rules, discount calculations, user eligibility checks — in the frontend JavaScript. What is the PRIMARY risk?', points: 1, options: [
        { text: 'The UI will load slower', isCorrect: false },
        { text: 'Any user can open DevTools and modify the logic to bypass rules or manipulate pricing', isCorrect: true },
        { text: 'JavaScript cannot perform arithmetic', isCorrect: false },
        { text: 'Frontend code cannot access the database', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which combination correctly maps technology to layer?', points: 1, options: [
        { text: 'React → backend, Node.js → frontend', isCorrect: false },
        { text: 'React → frontend, Node.js → backend', isCorrect: true },
        { text: 'SQL → frontend, HTML → backend', isCorrect: false },
        { text: 'CSS → backend, Python → frontend', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A mobile app and a web app both need the same user data. Which architecture avoids duplicating logic for both clients?', points: 1, options: [
        { text: 'Build separate backends for mobile and web', isCorrect: false },
        { text: 'Expose a shared backend API that both clients call', isCorrect: true },
        { text: 'Store all data in localStorage on each device', isCorrect: false },
        { text: 'Use only frontend JavaScript on both platforms', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Server-Side Rendering (SSR) means HTML is generated on the server before being sent to the browser, rather than built by JavaScript in the browser.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // Subtopic 2-2
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic2.id, title: 'Databases and the cloud: where the data lives', tag: 'tech', sortOrder: 1 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'An e-commerce app stores product names, prices, and categories. A separate service stores customer sessions as key-value pairs with short expiry times. Which pair of databases best fits these two use cases?', points: 1, options: [
        { text: 'PostgreSQL for products, Redis for sessions', isCorrect: true },
        { text: 'Redis for products, MongoDB for sessions', isCorrect: false },
        { text: 'MySQL for both', isCorrect: false },
        { text: 'S3 for products, DynamoDB for sessions', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A startup runs its database on a single server in an office. What is the PRIMARY operational risk compared to using a managed cloud database?', points: 1, options: [
        { text: 'Cloud databases always perform worse than on-premise', isCorrect: false },
        { text: 'If the office server fails or loses power, the data and service go down with no managed failover', isCorrect: true },
        { text: 'You cannot run SQL on cloud databases', isCorrect: false },
        { text: 'Cloud databases charge per query, making them too expensive', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You query a relational database for all orders where status = "shipped". The table has 5 million rows and the query is slow. What should you investigate first?', points: 1, options: [
        { text: 'Switch to a NoSQL database', isCorrect: false },
        { text: 'Whether an index exists on the status column', isCorrect: true },
        { text: 'Whether the cloud region is too far from the user', isCorrect: false },
        { text: 'Whether the query uses the wrong HTTP method', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What does it mean for a cloud service to have 99.9% uptime?', points: 1, options: [
        { text: 'The service is available every second of every day', isCorrect: false },
        { text: 'The service is allowed approximately 8.7 hours of downtime per year', isCorrect: true },
        { text: 'The service guarantees zero data loss', isCorrect: false },
        { text: 'Requests complete within 99.9ms', isCorrect: false },
      ]},
      { type: 'true_false', text: 'A managed cloud database (e.g. AWS RDS) handles backups, patches, and failover automatically, whereas a self-hosted database requires you to manage all of these yourself.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // Subtopic 2-3
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic2.id, title: 'Version control and environment variables: how you work safely', tag: 'tech', sortOrder: 2 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A teammate pushes directly to main without creating a branch. The deployment breaks. What is the PRIMARY risk this workflow creates that branching would have prevented?', points: 1, options: [
        { text: 'The code cannot be committed without a branch', isCorrect: false },
        { text: 'There was no opportunity for review or testing in isolation before the code hit production', isCorrect: true },
        { text: 'Git does not allow pushing to main', isCorrect: false },
        { text: 'The code compiles differently on the main branch', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You accidentally commit your Stripe secret key to a public GitHub repo. You delete the file and commit again. Is the secret now safe?', points: 1, options: [
        { text: 'Yes — once deleted from the latest commit, it is gone from GitHub', isCorrect: false },
        { text: 'No — the secret is still visible in the git history and must be rotated immediately', isCorrect: true },
        { text: 'Yes — GitHub automatically redacts secrets in commits', isCorrect: false },
        { text: 'No — but only GitHub staff can see the history', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Your app works locally but crashes in production with "API key not found." Your local .env has the key. What is the most likely cause?', points: 1, options: [
        { text: 'The .env file was committed and the production server is ignoring it', isCorrect: false },
        { text: 'The environment variable was not set in the production environment', isCorrect: true },
        { text: 'The API key format is invalid in production', isCorrect: false },
        { text: 'Node.js does not support .env files in production', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which of the following is the safest way to share required environment variables with a new teammate?', points: 1, options: [
        { text: 'Commit a .env file with real values to the repo', isCorrect: false },
        { text: 'Send them via a secure secrets manager or encrypted message, referencing .env.example for structure', isCorrect: true },
        { text: 'Post them in the team Slack channel', isCorrect: false },
        { text: 'Hard-code them in a config.js file that is gitignored', isCorrect: false },
      ]},
      { type: 'true_false', text: 'git revert creates a new commit that undoes a previous commit, while git reset --hard permanently deletes commits from history — making revert safer for shared branches.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // ─── Topic 3: Data Formats ───────────────────────────────────────────────────
  const topic3 = await prisma.topic.create({
    data: { weekId: week1Id, title: 'Data Formats', tag: 'tech', sortOrder: 2 },
  })

  // Subtopic 3-1
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic3.id, title: 'JSON: parse, write, use with APIs', tag: 'tech', sortOrder: 0 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You call json.loads() on a string and get back a Python dict. You then call json.loads() again on a value inside that dict. What does this tell you about the original JSON structure?', points: 1, options: [
        { text: 'The JSON was malformed', isCorrect: false },
        { text: 'One of the values was itself a JSON-encoded string nested inside the outer JSON', isCorrect: true },
        { text: 'json.loads() can be called infinitely without side effects', isCorrect: false },
        { text: 'The dict contained a list that needed unpacking', isCorrect: false },
      ]},
      { type: 'mcq', text: 'An API returns {"score": "9.5"}. Your code tries to calculate score * 2 and crashes. What went wrong?', points: 1, options: [
        { text: 'Python does not support multiplication', isCorrect: false },
        { text: 'The score value is a string, not a number — it must be cast with float() before arithmetic', isCorrect: true },
        { text: 'JSON does not support decimal values', isCorrect: false },
        { text: 'The API returned invalid JSON', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You need to send a Python dict to an API as JSON in the request body. Which function produces the correct JSON string?', points: 1, options: [
        { text: 'json.loads(my_dict)', isCorrect: false },
        { text: 'json.dumps(my_dict)', isCorrect: true },
        { text: 'str(my_dict)', isCorrect: false },
        { text: 'json.encode(my_dict)', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which of the following JSON values is of type boolean?', points: 1, options: [
        { text: '"true"', isCorrect: false },
        { text: '1', isCorrect: false },
        { text: 'true', isCorrect: true },
        { text: 'True', isCorrect: false },
      ]},
      { type: 'true_false', text: 'In valid JSON, object keys must always be strings enclosed in double quotes — single quotes are not permitted.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // Subtopic 3-2
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic3.id, title: 'CSV: structure, encoding, edge cases', tag: 'tech', sortOrder: 1 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A CSV file exported from Excel on Windows opens in Python and all special characters (é, ü, ₹) appear as garbage. What is the most likely cause?', points: 1, options: [
        { text: 'Python cannot read CSV files', isCorrect: false },
        { text: 'Excel exported the file in a Windows-1252 or Latin-1 encoding, but Python is reading it as UTF-8', isCorrect: true },
        { text: 'Special characters are not allowed in CSV', isCorrect: false },
        { text: 'The CSV has too many columns', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A CSV row contains: John,"Mumbai, India",Engineer. How many fields does this row have?', points: 1, options: [
        { text: '4 — the comma inside the quotes is also a separator', isCorrect: false },
        { text: '3 — the comma inside double quotes is part of the field value, not a separator', isCorrect: true },
        { text: '2 — only the quoted fields count', isCorrect: false },
        { text: '5 — each word is a field', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You receive a CSV where some numeric fields contain commas as thousands separators (e.g. "1,200,000"). When pandas reads this, what will the value likely be treated as?', points: 1, options: [
        { text: 'The integer 1200000', isCorrect: false },
        { text: 'A string, because the commas break numeric parsing', isCorrect: true },
        { text: 'Three separate columns', isCorrect: false },
        { text: 'A float', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which scenario would cause a CSV to silently lose data when opened in Excel?', points: 1, options: [
        { text: 'Having more than 10 columns', isCorrect: false },
        { text: 'A cell value starting with = that Excel interprets as a formula', isCorrect: true },
        { text: 'Using UTF-8 encoding', isCorrect: false },
        { text: 'Having an empty header row', isCorrect: false },
      ]},
      { type: 'true_false', text: 'A TSV (Tab-Separated Values) file is structurally identical to CSV except it uses a tab character as the delimiter instead of a comma.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // Subtopic 3-3
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic3.id, title: 'Markdown: docs and READMEs', tag: 'tech', sortOrder: 2 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A developer writes a README with the line: ## Getting Started. On GitHub, what will this render as?', points: 1, options: [
        { text: 'A paragraph with the text "## Getting Started"', isCorrect: false },
        { text: 'A level-2 heading labelled "Getting Started"', isCorrect: true },
        { text: 'A code block', isCorrect: false },
        { text: 'A bullet point', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You want to include a code snippet with syntax highlighting for Python in Markdown. Which syntax is correct?', points: 1, options: [
        { text: '```python\\n# code here\\n```', isCorrect: true },
        { text: '<code lang="python"># code here</code>', isCorrect: false },
        { text: '    python\\n    # code here', isCorrect: false },
        { text: '**python**\\n# code here', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which Markdown element would you use to add a clickable hyperlink?', points: 1, options: [
        { text: '{text}(url)', isCorrect: false },
        { text: '[text](url)', isCorrect: true },
        { text: '<link>url</link>', isCorrect: false },
        { text: '((text|url))', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A colleague says their Markdown table looks fine in their editor but broken on GitHub. What is the most likely cause?', points: 1, options: [
        { text: 'GitHub does not support Markdown tables', isCorrect: false },
        { text: 'The table is missing the header separator row (the row of dashes after the header)', isCorrect: true },
        { text: 'The table has too many columns', isCorrect: false },
        { text: 'Markdown tables require HTML to render', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Markdown is a plain-text format — a .md file is readable as-is even without a renderer, because the syntax is designed to be human-legible in raw form.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // Subtopic 3-4
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic3.id, title: 'HTML basics: read page structure', tag: 'tech', sortOrder: 3 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You open DevTools on a webpage and see: <div class="price" data-id="42">₹1,499</div>. A scraper needs the numeric ID. Where should it look?', points: 1, options: [
        { text: 'Inside the text content of the div', isCorrect: false },
        { text: 'In the data-id attribute of the element', isCorrect: true },
        { text: 'In the class attribute', isCorrect: false },
        { text: 'In the parent element\'s ID', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A page has <link rel="stylesheet" href="styles.css"> in the <head>. Where does this element belong and why?', points: 1, options: [
        { text: 'It belongs in <body> because it controls visual content', isCorrect: false },
        { text: 'It belongs in <head> because it is metadata that links an external resource, not visible content', isCorrect: true },
        { text: 'It can go anywhere — HTML ignores placement of link tags', isCorrect: false },
        { text: 'It belongs after the closing </body> tag', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is the difference between a <div> and a <span>?', points: 1, options: [
        { text: '<div> is for images; <span> is for text', isCorrect: false },
        { text: '<div> is a block-level element; <span> is an inline element', isCorrect: true },
        { text: 'They are identical — one is just an alias for the other', isCorrect: false },
        { text: '<span> creates a new section; <div> does not', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You see <script src="app.js" defer></script> in the <head>. What does the defer attribute do?', points: 1, options: [
        { text: 'It prevents the script from ever executing', isCorrect: false },
        { text: 'It tells the browser to download the script but only execute it after the HTML is fully parsed', isCorrect: true },
        { text: 'It loads the script before any CSS', isCorrect: false },
        { text: 'It makes the script run asynchronously, possibly before HTML finishes parsing', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Semantic HTML elements like <article>, <nav>, and <footer> provide meaning to the page structure that benefits accessibility tools and search engines, unlike generic <div> wrappers.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // ─── Topic 4: Google Sheets ──────────────────────────────────────────────────
  const topic4 = await prisma.topic.create({
    data: { weekId: week1Id, title: 'Google Sheets', tag: 'tech', sortOrder: 3 },
  })

  // Subtopic 4-1
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic4.id, title: 'SUMIF, SUMIFS, COUNTIF, COUNTIFS, AVERAGEIF', tag: 'tech', sortOrder: 0 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You need the total sales for rows where Region = "South" AND Product = "Cream". Which formula works?', points: 1, options: [
        { text: '=SUMIF(A:A,"South",C:C) + SUMIF(B:B,"Cream",C:C)', isCorrect: false },
        { text: '=SUMIFS(C:C,A:A,"South",B:B,"Cream")', isCorrect: true },
        { text: '=COUNTIFS(A:A,"South",B:B,"Cream")', isCorrect: false },
        { text: '=SUMIF(A:A,"South",B:B,"Cream",C:C)', isCorrect: false },
      ]},
      { type: 'mcq', text: 'AVERAGEIF(A2:A100,"<50",B2:B100) — what does this formula compute?', points: 1, options: [
        { text: 'The average of all values in A2:A100 that are less than 50', isCorrect: false },
        { text: 'The average of values in B2:B100 where the corresponding value in A2:A100 is less than 50', isCorrect: true },
        { text: 'The count of rows in B2:B100 where A is less than 50', isCorrect: false },
        { text: 'The sum of B2:B100 divided by 50', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You use =COUNTIF(A:A, "apple") and get 0, but you can clearly see "Apple" in the column. What is the most likely reason?', points: 1, options: [
        { text: 'COUNTIF is case-sensitive and "Apple" does not match "apple"', isCorrect: false },
        { text: 'The cells contain leading or trailing spaces, making the text "Apple " rather than "Apple"', isCorrect: true },
        { text: 'COUNTIF cannot search text columns', isCorrect: false },
        { text: 'The range A:A is too large for COUNTIF', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What distinguishes SUMIFS from SUMIF?', points: 1, options: [
        { text: 'SUMIFS sums faster on large datasets', isCorrect: false },
        { text: 'SUMIFS accepts multiple criteria ranges and criteria pairs; SUMIF only accepts one', isCorrect: true },
        { text: 'SUMIFS returns an array; SUMIF returns a scalar', isCorrect: false },
        { text: 'SUMIF is deprecated and should not be used', isCorrect: false },
      ]},
      { type: 'true_false', text: 'COUNTIF(">=100") will count cells where the value is exactly ">=100" as a text string, not cells with a numeric value greater than or equal to 100.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False', isCorrect: true },
      ]},
    ])
  }

  // Subtopic 4-2
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic4.id, title: 'VLOOKUP, HLOOKUP, XLOOKUP', tag: 'tech', sortOrder: 1 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: '=VLOOKUP("P001",A:D,3,FALSE) — a colleague changes the sheet so that a new column is inserted between B and C. What happens to this formula?', points: 1, options: [
        { text: 'It automatically adjusts and still returns the correct column', isCorrect: false },
        { text: 'It now returns the wrong column because the hardcoded col_index 3 shifted with the insertion', isCorrect: true },
        { text: 'The formula throws a #NAME? error', isCorrect: false },
        { text: 'Nothing changes — VLOOKUP uses column names, not positions', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You need to look up a customer name in column C and return their email from column A (to the left). Which function handles this without rearranging the sheet?', points: 1, options: [
        { text: 'VLOOKUP — it can search any column', isCorrect: false },
        { text: 'XLOOKUP — it can return values from any column regardless of position relative to the lookup column', isCorrect: true },
        { text: 'HLOOKUP — it searches horizontally', isCorrect: false },
        { text: 'SUMIF — it can retrieve values from adjacent columns', isCorrect: false },
      ]},
      { type: 'mcq', text: 'VLOOKUP with TRUE (approximate match) is used on an unsorted column. What is the risk?', points: 1, options: [
        { text: 'The formula will always return #N/A', isCorrect: false },
        { text: 'It may return incorrect results — approximate match assumes the lookup column is sorted ascending', isCorrect: true },
        { text: 'TRUE is not a valid argument for VLOOKUP', isCorrect: false },
        { text: 'The formula will be significantly slower', isCorrect: false },
      ]},
      { type: 'mcq', text: 'XLOOKUP\'s fifth argument (if_not_found) is set to "Not found". What advantage does this provide over VLOOKUP?', points: 1, options: [
        { text: 'It makes the lookup faster', isCorrect: false },
        { text: 'It returns a custom message instead of #N/A when no match exists, removing the need for IFERROR wrapping', isCorrect: true },
        { text: 'It enables the lookup to search multiple columns simultaneously', isCorrect: false },
        { text: 'It forces an exact match automatically', isCorrect: false },
      ]},
      { type: 'true_false', text: 'HLOOKUP searches across the first row of a range and returns a value from a specified row below it — making it the horizontal equivalent of VLOOKUP.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // Subtopic 4-3
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic4.id, title: 'INDEX/MATCH', tag: 'tech', sortOrder: 2 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'In =INDEX(C2:C100, MATCH("P001",A2:A100,0)), what does the MATCH portion return?', points: 1, options: [
        { text: 'The value at "P001" in column A', isCorrect: false },
        { text: 'The relative row position of "P001" within A2:A100', isCorrect: true },
        { text: 'The value in column C corresponding to "P001"', isCorrect: false },
        { text: 'A TRUE/FALSE indicating whether "P001" exists', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Why is INDEX/MATCH generally preferred over VLOOKUP for large, frequently-edited datasets?', points: 1, options: [
        { text: 'INDEX/MATCH is faster to type', isCorrect: false },
        { text: 'INDEX/MATCH is not column-order dependent — inserting/deleting columns does not break it', isCorrect: true },
        { text: 'INDEX/MATCH supports wildcard characters; VLOOKUP does not', isCorrect: false },
        { text: 'VLOOKUP cannot handle text values', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You use =INDEX(B:B, MATCH(MAX(A:A), A:A, 0)) — what does this formula return?', points: 1, options: [
        { text: 'The maximum value in column B', isCorrect: false },
        { text: 'The value in column B that corresponds to the row containing the maximum value in column A', isCorrect: true },
        { text: 'The row number of the maximum value in column A', isCorrect: false },
        { text: 'A #REF! error because MAX cannot be nested in MATCH', isCorrect: false },
      ]},
      { type: 'mcq', text: 'MATCH is called with match_type 0. What does this mean?', points: 1, options: [
        { text: 'It finds the largest value less than or equal to the lookup value', isCorrect: false },
        { text: 'It finds the first exact match, with the list in any order', isCorrect: true },
        { text: 'It returns 0 if no match is found instead of an error', isCorrect: false },
        { text: 'It searches from the bottom up', isCorrect: false },
      ]},
      { type: 'true_false', text: 'INDEX can be used alone (without MATCH) to return the value at a specific row and column position within a range.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // Subtopic 4-4
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic4.id, title: 'IF, IFS and nested logic', tag: 'tech', sortOrder: 3 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: '=IF(A1>100, "High", IF(A1>50, "Mid", "Low")) — A1 = 100. Which label is returned?', points: 1, options: [
        { text: '"High"', isCorrect: false },
        { text: '"Mid"', isCorrect: true },
        { text: '"Low"', isCorrect: false },
        { text: 'An error', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A formula uses 5 nested IFs. A colleague suggests using IFS instead. What is the PRIMARY benefit?', points: 1, options: [
        { text: 'IFS is faster to calculate', isCorrect: false },
        { text: 'IFS is easier to read and maintain — each condition-result pair is listed sequentially without deep nesting', isCorrect: true },
        { text: 'IFS supports more than 64 conditions; nested IF does not', isCorrect: false },
        { text: 'IFS automatically sorts the conditions by priority', isCorrect: false },
      ]},
      { type: 'mcq', text: '=IF(AND(A1="Active", B1>0), "Bill", "Skip") — when will this return "Bill"?', points: 1, options: [
        { text: 'When A1 is "Active" OR B1 is greater than 0', isCorrect: false },
        { text: 'Only when A1 is exactly "Active" AND B1 is strictly greater than 0', isCorrect: true },
        { text: 'When either condition is false', isCorrect: false },
        { text: 'When B1 equals 0 and A1 is "Active"', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What does =IF(ISBLANK(A1), "Empty", A1*2) accomplish?', points: 1, options: [
        { text: 'It doubles A1 if A1 is blank, otherwise returns "Empty"', isCorrect: false },
        { text: 'It returns "Empty" if A1 is blank, otherwise doubles A1\'s value', isCorrect: true },
        { text: 'It converts A1 to text if blank', isCorrect: false },
        { text: 'It throws a #VALUE! error when A1 is blank', isCorrect: false },
      ]},
      { type: 'true_false', text: 'In Google Sheets, IFS(condition1, value1, condition2, value2) returns value1 if condition1 is TRUE, without evaluating the remaining conditions.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // Subtopic 4-5
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic4.id, title: 'Pivot tables', tag: 'tech', sortOrder: 4 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You build a pivot table on a dataset and add new rows to the source data. The pivot table does not show the new rows. What must you do?', points: 1, options: [
        { text: 'Delete and rebuild the pivot table', isCorrect: false },
        { text: 'Refresh the pivot table so it picks up the updated data range', isCorrect: true },
        { text: 'Sort the source data first', isCorrect: false },
        { text: 'Nothing — pivot tables update automatically in real time', isCorrect: false },
      ]},
      { type: 'mcq', text: 'In a pivot table, you drag "City" to Rows and "Revenue" to Values (set to SUM). What does each row in the output represent?', points: 1, options: [
        { text: 'A single transaction per city', isCorrect: false },
        { text: 'The total revenue aggregated across all records for each unique city', isCorrect: true },
        { text: 'The average revenue per city', isCorrect: false },
        { text: 'A count of cities', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You want to compare monthly revenue across different product categories simultaneously in a pivot table. Which configuration achieves this?', points: 1, options: [
        { text: 'Month → Rows, Category → Rows, Revenue → Values', isCorrect: false },
        { text: 'Month → Rows, Category → Columns, Revenue → Values', isCorrect: true },
        { text: 'Category → Filters, Month → Values, Revenue → Rows', isCorrect: false },
        { text: 'Revenue → Rows, Month → Columns, Category → Filters', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A pivot table shows "Sum of Revenue" but you need to show each city\'s share of total revenue as a percentage. What setting enables this?', points: 1, options: [
        { text: 'Change the aggregation function from SUM to COUNT', isCorrect: false },
        { text: 'Use "Show values as → % of Grand Total" in the value field settings', isCorrect: true },
        { text: 'Add a calculated column to the source data', isCorrect: false },
        { text: 'Apply a percentage number format to the cells', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Editing a value directly inside a pivot table modifies the underlying source data.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False', isCorrect: true },
      ]},
    ])
  }

  // Subtopic 4-6
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic4.id, title: 'Graphs and charts', tag: 'tech', sortOrder: 5 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You want to show how a single product\'s monthly revenue changed over 12 months. Which chart type is most appropriate?', points: 1, options: [
        { text: 'Pie chart', isCorrect: false },
        { text: 'Line chart', isCorrect: true },
        { text: 'Scatter plot', isCorrect: false },
        { text: 'Histogram', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A pie chart shows 8 slices, the smallest being 0.3% of the total. What is the PRIMARY problem with this visualisation?', points: 1, options: [
        { text: 'Pie charts cannot display more than 5 slices', isCorrect: false },
        { text: 'The tiny slices are visually indistinguishable, making the chart misleading and hard to read', isCorrect: true },
        { text: 'Pie charts require integer values', isCorrect: false },
        { text: 'There is no problem — pie charts are ideal for many categories', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You start a bar chart\'s Y-axis at 95 instead of 0 to make a small difference look larger. What is wrong with this?', points: 1, options: [
        { text: 'Google Sheets does not allow Y-axis minimums other than 0', isCorrect: false },
        { text: 'It is a misleading chart — the truncated axis exaggerates differences and distorts the viewer\'s perception', isCorrect: true },
        { text: 'The bars will overlap', isCorrect: false },
        { text: 'Nothing — adjusting the axis is always acceptable for readability', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You need to show the correlation between advertising spend and sales volume across 50 campaigns. Which chart type best reveals this relationship?', points: 1, options: [
        { text: 'Stacked bar chart', isCorrect: false },
        { text: 'Scatter plot', isCorrect: true },
        { text: 'Donut chart', isCorrect: false },
        { text: 'Area chart', isCorrect: false },
      ]},
      { type: 'true_false', text: 'A dual-axis chart can display two data series with different scales (e.g. revenue in INR and order count) on the same chart, with separate Y-axes for each.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // Subtopic 4-7
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic4.id, title: 'Conditional formatting, sorting and filtering', tag: 'tech', sortOrder: 6 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You apply conditional formatting to highlight rows where column C > 1000, but only column C cells get highlighted — not the whole row. What likely went wrong?', points: 1, options: [
        { text: 'Conditional formatting cannot highlight entire rows', isCorrect: false },
        { text: 'The formatting range was set to only column C instead of the full row range, and a custom formula was not used', isCorrect: true },
        { text: 'The condition was entered incorrectly', isCorrect: false },
        { text: 'Conditional formatting only applies to numbers', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You sort a sheet by column B (descending) but column A\'s data no longer matches the correct rows. What caused this?', points: 1, options: [
        { text: 'You sorted only column B without including the other columns in the sort range', isCorrect: true },
        { text: 'Google Sheets sorts columns independently by default', isCorrect: false },
        { text: 'Column A was locked', isCorrect: false },
        { text: 'Descending sort only works on numeric data', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A filter is applied to a sheet. A colleague editing the sheet complains they cannot see all the rows. What is the best solution to let them work without being affected by your filter?', points: 1, options: [
        { text: 'Remove the filter entirely', isCorrect: false },
        { text: 'Use a Filter View instead — it applies only to your session and does not affect other users', isCorrect: true },
        { text: 'Copy the sheet to a new tab', isCorrect: false },
        { text: 'Export to CSV and filter there', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You apply a colour scale conditional format (green to red) to a column. A new row is added below the formatted range. What happens to the new row?', points: 1, options: [
        { text: 'It is automatically included in the colour scale', isCorrect: false },
        { text: 'It is not formatted — it falls outside the original formatting range', isCorrect: true },
        { text: 'The new row inherits the last row\'s colour', isCorrect: false },
        { text: 'Colour scales are recalculated across all rows in the sheet', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Applying a sort to a sheet permanently reorders the rows — if no undo is available and no backup exists, the original order cannot be recovered.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // Subtopic 4-8
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic4.id, title: 'Data validation, dropdowns and named ranges', tag: 'tech', sortOrder: 7 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A sheet uses data validation to restrict a column to the values ["Active","Inactive","Pending"]. A user pastes a column of data containing "active" (lowercase). What happens?', points: 1, options: [
        { text: 'The paste is blocked entirely', isCorrect: false },
        { text: 'The pasted values bypass the validation warning — paste operations can override data validation in Google Sheets', isCorrect: true },
        { text: 'Google Sheets auto-corrects to "Active"', isCorrect: false },
        { text: 'The cell is cleared', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You define a named range called "ProductList" pointing to Sheet2!A2:A50. You then use it in a VLOOKUP on Sheet1. What advantage does the named range provide?', points: 1, options: [
        { text: 'The VLOOKUP runs faster with a named range', isCorrect: false },
        { text: 'If the product list moves to A2:A100, you only update the named range definition once rather than every formula', isCorrect: true },
        { text: 'Named ranges are required to reference other sheets', isCorrect: false },
        { text: 'It prevents other users from editing the range', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You create a dependent dropdown — City choices depend on which Country is selected. Which approach makes this dynamic in Google Sheets?', points: 1, options: [
        { text: 'Use data validation with a hardcoded list for every possible city', isCorrect: false },
        { text: 'Use INDIRECT() with named ranges per country, so the dropdown source changes based on the country cell\'s value', isCorrect: true },
        { text: 'Use a pivot table to filter cities', isCorrect: false },
        { text: 'Write an Apps Script that locks certain cells', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Data validation is set to "Show warning" (not "Reject input"). A user enters an invalid value. What occurs?', points: 1, options: [
        { text: 'The cell turns red and the value is deleted', isCorrect: false },
        { text: 'The value is accepted but the cell is flagged with a warning indicator', isCorrect: true },
        { text: 'The sheet is locked until corrected', isCorrect: false },
        { text: 'The invalid entry triggers a formula error in adjacent cells', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Named ranges in Google Sheets are scoped to the entire spreadsheet file — they can be referenced from any sheet within the same file.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // ─── Topic 5: Git ────────────────────────────────────────────────────────────
  const topic5 = await prisma.topic.create({
    data: { weekId: week1Id, title: 'Git', tag: 'tech', sortOrder: 4 },
  })

  // Subtopic 5-1
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic5.id, title: 'What is Git and why it exists', tag: 'tech', sortOrder: 0 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A team of 4 developers works on the same codebase by emailing zip files to each other. What is the PRIMARY problem that Git would solve?', points: 1, options: [
        { text: 'Git compresses files better than zip', isCorrect: false },
        { text: 'Without Git, concurrent changes have no merge mechanism — whoever emails last overwrites everyone else\'s work', isCorrect: true },
        { text: 'Git enables faster code execution', isCorrect: false },
        { text: 'Zip files cannot contain source code', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Git is described as "distributed." What does this mean in practice?', points: 1, options: [
        { text: 'The code runs on distributed servers automatically', isCorrect: false },
        { text: 'Every developer has a full copy of the repository history locally — no single server is required to work', isCorrect: true },
        { text: 'Git distributes commits evenly between team members', isCorrect: false },
        { text: 'The codebase is split across multiple machines for performance', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A developer accidentally deletes a critical function that was working 3 days ago. Which Git capability allows them to recover it?', points: 1, options: [
        { text: 'git status — it lists deleted files', isCorrect: false },
        { text: 'git log and git checkout/restore — they can view history and retrieve the file at a previous commit', isCorrect: true },
        { text: 'git push — it re-downloads the file from remote', isCorrect: false },
        { text: 'git init — it resets the project to its initial state', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which statement best describes the difference between Git and GitHub?', points: 1, options: [
        { text: 'Git is the cloud platform; GitHub is the version control software', isCorrect: false },
        { text: 'Git is the version control system that runs locally; GitHub is a cloud hosting service for Git repositories', isCorrect: true },
        { text: 'They are the same product made by the same company', isCorrect: false },
        { text: 'GitHub is required to use Git', isCorrect: false },
      ]},
      { type: 'true_false', text: 'A Git repository stores the complete history of all commits, meaning you can reconstruct the project\'s state at any previous point in time.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // Subtopic 5-2
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic5.id, title: 'Config: setting up Git for the first time', tag: 'tech', sortOrder: 1 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You set up Git on a new machine but forget to run git config --global user.email. What consequence will this have?', points: 1, options: [
        { text: 'Git will refuse to run any commands', isCorrect: false },
        { text: 'Commits will be attributed to an empty or incorrect email, making authorship tracking unreliable', isCorrect: true },
        { text: 'Push will fail because GitHub requires an email to authenticate', isCorrect: false },
        { text: 'The repository will become corrupted', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is the difference between git config --global and git config --local?', points: 1, options: [
        { text: '--global applies to all repositories on the machine; --local applies only to the current repository', isCorrect: true },
        { text: '--global writes to the cloud; --local writes to disk', isCorrect: false },
        { text: '--global requires admin rights; --local does not', isCorrect: false },
        { text: 'They are identical — both set the same configuration', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A team uses different default branch names — some machines default to "main", others to "master". Which config command standardises this?', points: 1, options: [
        { text: 'git config --global branch.default main', isCorrect: false },
        { text: 'git config --global init.defaultBranch main', isCorrect: true },
        { text: 'git init --branch main', isCorrect: false },
        { text: 'git branch --set-default main', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Where does git config --global store its settings?', points: 1, options: [
        { text: 'In the current project\'s .git/config file', isCorrect: false },
        { text: 'In a ~/.gitconfig file in the user\'s home directory', isCorrect: true },
        { text: 'In an environment variable called GIT_CONFIG', isCorrect: false },
        { text: 'In /etc/gitconfig on all operating systems', isCorrect: false },
      ]},
      { type: 'true_false', text: 'A --local config value in a specific repository overrides the --global config value for the same setting when working inside that repository.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // Subtopic 5-3
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic5.id, title: 'Init: starting a repository', tag: 'tech', sortOrder: 2 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You run git init inside a folder that already has project files. What does this do to the existing files?', points: 1, options: [
        { text: 'It deletes all existing files and starts fresh', isCorrect: false },
        { text: 'It creates a .git directory to track the folder — existing files are unaffected and simply become untracked', isCorrect: true },
        { text: 'It immediately commits all existing files', isCorrect: false },
        { text: 'It clones a remote repository over the existing files', isCorrect: false },
      ]},
      { type: 'mcq', text: 'After git init, you run git status and see all files listed as "untracked." What does this mean?', points: 1, options: [
        { text: 'The files are corrupted and cannot be added', isCorrect: false },
        { text: 'Git is aware of the files\' existence but has not been told to track them — they are not yet part of any commit', isCorrect: true },
        { text: 'The files have been staged for deletion', isCorrect: false },
        { text: 'The files are already committed to the repository', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is the .git directory and why should it never be deleted?', points: 1, options: [
        { text: 'It stores temporary build artifacts — deleting it is fine', isCorrect: false },
        { text: 'It contains the entire repository history, configuration, and object database — deleting it destroys all Git history', isCorrect: true },
        { text: 'It is a log of recent commands and is recreated by git init', isCorrect: false },
        { text: 'It stores only the current branch name and remote URLs', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A developer runs git init in their home directory (~) by mistake. What problem could this cause?', points: 1, options: [
        { text: 'No problem — Git only tracks files you explicitly add', isCorrect: false },
        { text: 'Any subdirectory project may be picked up by this root-level repository, causing confusing git status output across unrelated projects', isCorrect: true },
        { text: 'All files in the home directory are immediately committed', isCorrect: false },
        { text: 'Git cannot be initialised in a home directory', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Running git init on an already-initialised repository (one that already has a .git directory) is destructive and will erase all existing commits.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False', isCorrect: true },
      ]},
    ])
  }

  // Subtopic 5-4
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic5.id, title: 'Clone & status: getting a repo and checking what\'s changed', tag: 'tech', sortOrder: 3 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You clone a repository and a teammate pushes a new commit 10 minutes later. What does git status show you about this new commit?', points: 1, options: [
        { text: 'git status shows the new remote commit and prompts you to pull', isCorrect: false },
        { text: 'git status only shows your local working tree state — it does not fetch remote changes automatically', isCorrect: true },
        { text: 'git status downloads and applies the new commit automatically', isCorrect: false },
        { text: 'git status shows a merge conflict warning', isCorrect: false },
      ]},
      { type: 'mcq', text: 'git status reports a file as "modified" but you haven\'t intentionally changed it. What is a plausible cause?', points: 1, options: [
        { text: 'Git randomly marks files as modified for performance reasons', isCorrect: false },
        { text: 'A text editor auto-saved with different line endings (CRLF vs LF), or a tool modified file metadata', isCorrect: true },
        { text: 'The file was deleted and recreated', isCorrect: false },
        { text: 'Git cannot track binary files and marks them modified', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is the difference between git clone and git pull?', points: 1, options: [
        { text: 'clone copies only the latest commit; pull copies the full history', isCorrect: false },
        { text: 'clone creates a full local copy of a remote repository from scratch; pull fetches and merges new changes into an existing local repository', isCorrect: true },
        { text: 'They are identical commands with different names', isCorrect: false },
        { text: 'pull creates a new repository; clone updates an existing one', isCorrect: false },
      ]},
      { type: 'mcq', text: 'After cloning, git status says "nothing to commit, working tree clean." You edit a file. What will git status report next?', points: 1, options: [
        { text: 'The file appears under "Changes to be committed" automatically', isCorrect: false },
        { text: 'The file appears under "Changes not staged for commit" — it is modified but not yet staged', isCorrect: true },
        { text: 'git status still says "nothing to commit" until you run git add', isCorrect: false },
        { text: 'The file appears as a new untracked file', isCorrect: false },
      ]},
      { type: 'true_false', text: 'git clone automatically sets up a remote called "origin" pointing to the URL you cloned from.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // Subtopic 5-5
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic5.id, title: 'Add & commit: saving your work', tag: 'tech', sortOrder: 4 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You run git add file.py then edit file.py again before committing. What does the commit contain?', points: 1, options: [
        { text: 'The latest version of file.py including the second edit', isCorrect: false },
        { text: 'The version of file.py at the time of git add — the second edit is unstaged and not included', isCorrect: true },
        { text: 'Nothing — you must re-run git add after editing', isCorrect: false },
        { text: 'Both versions are stored as separate snapshots', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A teammate writes commit messages like "fix" or "wip". What is the PRIMARY problem with this practice?', points: 1, options: [
        { text: 'Git rejects short commit messages', isCorrect: false },
        { text: 'Future developers (including themselves) cannot understand what changed or why by reading the history', isCorrect: true },
        { text: 'Short messages cause merge conflicts', isCorrect: false },
        { text: 'The commit will not push to GitHub', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is the staging area (index) in Git?', points: 1, options: [
        { text: 'A temporary branch where untested code lives', isCorrect: false },
        { text: 'An intermediate area where you curate exactly which changes will be included in the next commit', isCorrect: true },
        { text: 'The remote repository before code is pushed', isCorrect: false },
        { text: 'A cached copy of the last commit', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You have changes in 3 files. You want to commit files A and B now, and file C in a separate commit. Which approach achieves this?', points: 1, options: [
        { text: 'Run git add . then commit — Git will split them automatically', isCorrect: false },
        { text: 'Run git add fileA fileB, commit, then git add fileC, commit', isCorrect: true },
        { text: 'Run git commit --split to divide the files', isCorrect: false },
        { text: 'It is impossible to commit a subset of changed files', isCorrect: false },
      ]},
      { type: 'true_false', text: 'git commit --amend replaces the most recent commit — if the commit has already been pushed to a shared branch, amending it and force-pushing can cause problems for teammates.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // Subtopic 5-6
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic5.id, title: 'Push & pull: syncing with GitHub', tag: 'tech', sortOrder: 5 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You try to git push and get "rejected — non-fast-forward." What does this mean?', points: 1, options: [
        { text: 'Your commit message is too short', isCorrect: false },
        { text: 'The remote branch has commits your local branch does not — you must pull and merge/rebase before pushing', isCorrect: true },
        { text: 'Your internet connection is too slow', isCorrect: false },
        { text: 'The repository is read-only', isCorrect: false },
      ]},
      { type: 'mcq', text: 'git pull is equivalent to which two commands run in sequence?', points: 1, options: [
        { text: 'git fetch + git push', isCorrect: false },
        { text: 'git fetch + git merge', isCorrect: true },
        { text: 'git clone + git merge', isCorrect: false },
        { text: 'git status + git commit', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A developer runs git push --force on a shared branch. What is the PRIMARY danger?', points: 1, options: [
        { text: 'The push will fail on branches with more than 100 commits', isCorrect: false },
        { text: 'It overwrites the remote history, potentially erasing teammates\' commits that were already pushed', isCorrect: true },
        { text: 'It creates a duplicate branch on the remote', isCorrect: false },
        { text: 'GitHub will automatically lock the branch', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You run git fetch but not git merge. What state is your local repository in?', points: 1, options: [
        { text: 'Your working directory now includes all remote changes', isCorrect: false },
        { text: 'The remote changes are downloaded into origin/main but your local branch is unchanged until you merge', isCorrect: true },
        { text: 'The fetch was incomplete — you must always follow it with push', isCorrect: false },
        { text: 'Your local commits have been sent to the remote', isCorrect: false },
      ]},
      { type: 'true_false', text: 'git push -u origin main sets the upstream tracking reference, so subsequent pushes and pulls on this branch can use just git push and git pull without specifying the remote and branch.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // Subtopic 5-7
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic5.id, title: 'Branches, merge, and fork', tag: 'tech', sortOrder: 6 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'Two developers each branch off main and both modify the same line in the same file. When the second branch is merged, what happens?', points: 1, options: [
        { text: 'Git automatically picks the newer change', isCorrect: false },
        { text: 'A merge conflict occurs — Git cannot determine which change to keep and requires manual resolution', isCorrect: true },
        { text: 'Both changes are concatenated into the line', isCorrect: false },
        { text: 'The second merge is rejected automatically', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is the difference between merging and rebasing a feature branch onto main?', points: 1, options: [
        { text: 'Merge rewrites history; rebase preserves it exactly', isCorrect: false },
        { text: 'Merge creates a merge commit preserving both histories; rebase replays your commits on top of main, producing a linear history', isCorrect: true },
        { text: 'They are equivalent — both produce the same result', isCorrect: false },
        { text: 'Rebase is only used for reverting commits', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You fork a public open-source repository on GitHub. The original repo then gets 20 new commits. How do you bring those commits into your fork?', points: 1, options: [
        { text: 'Delete and re-fork the repository', isCorrect: false },
        { text: 'Add the original repo as an upstream remote, fetch it, and merge or rebase onto your fork\'s branch', isCorrect: true },
        { text: 'Forked repositories automatically sync with the original', isCorrect: false },
        { text: 'Cherry-pick each of the 20 commits individually from GitHub\'s UI', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is a "fast-forward merge" and when does it occur?', points: 1, options: [
        { text: 'A merge that skips conflict resolution automatically', isCorrect: false },
        { text: 'When the target branch has no new commits since the feature branch was created — Git simply moves the pointer forward without creating a merge commit', isCorrect: true },
        { text: 'A merge that completes in under 1 second', isCorrect: false },
        { text: 'A merge that overwrites the target branch entirely', isCorrect: false },
      ]},
      { type: 'true_false', text: 'A fork is a server-side copy of a repository under your own account, while a branch is a pointer within the same repository — they serve different collaboration purposes.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // ─── Topic 6: Personas & Narratives ─────────────────────────────────────────
  const topic6 = await prisma.topic.create({
    data: { weekId: week1Id, title: 'Personas & Narratives', tag: 'marketing', sortOrder: 5 },
  })

  // Subtopic 6-1
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic6.id, title: 'What is a persona', tag: 'marketing', sortOrder: 0 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A brand manager creates a persona based entirely on gut feeling and team assumptions without any user research. What is the PRIMARY risk?', points: 1, options: [
        { text: 'The persona will have too many demographic fields', isCorrect: false },
        { text: 'The persona may reflect internal biases rather than real customer behaviour, leading to misdirected product and marketing decisions', isCorrect: true },
        { text: 'The persona cannot be used in campaigns without research approval', isCorrect: false },
        { text: 'Personas without research are illegal under GDPR', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Two products in the same category have identical demographic personas (age 25-35, urban, professional). Why might they still need different personas?', points: 1, options: [
        { text: 'Personas must always be unique by legal requirement', isCorrect: false },
        { text: 'Demographics alone are insufficient — the products likely address different psychographic profiles, pain points, and motivations within the same demographic', isCorrect: true },
        { text: 'Having the same demographic persona means the products should merge their marketing', isCorrect: false },
        { text: 'Different products cannot share any persona attributes', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A persona card includes: "Arjun, 29, software engineer, earns ₹18L/year, lives in Bangalore." What critical element is missing that makes this persona hard to market to?', points: 1, options: [
        { text: 'His favourite colour and hobbies', isCorrect: false },
        { text: 'His goals, frustrations, and buying motivations — without these, you cannot craft relevant messaging', isCorrect: true },
        { text: 'His social media handles', isCorrect: false },
        { text: 'His exact neighbourhood', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A product has 3 distinct buyer segments with very different needs. Should a single persona represent all three?', points: 1, options: [
        { text: 'Yes — one persona keeps the team aligned and avoids confusion', isCorrect: false },
        { text: 'No — averaging across segments creates a persona that accurately represents no one; separate personas should be built for each segment', isCorrect: true },
        { text: 'Yes — personas are only used for broad brand positioning, so one is enough', isCorrect: false },
        { text: 'No — personas can only represent individual real customers', isCorrect: false },
      ]},
      { type: 'true_false', text: 'A well-built persona is a fictional but research-grounded archetype — it represents patterns across many real users, not any single individual.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // Subtopic 6-2
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic6.id, title: 'What is a narrative', tag: 'marketing', sortOrder: 1 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'Brand A says "Our shampoo contains keratin and biotin." Brand B says "Our shampoo is for men who refuse to let thinning hair define them." Which is a narrative and why?', points: 1, options: [
        { text: 'Brand A — it uses factual product claims which form the core of any narrative', isCorrect: false },
        { text: 'Brand B — it frames the product within an identity and emotional story that the target customer can see themselves in', isCorrect: true },
        { text: 'Both are narratives — any marketing message qualifies', isCorrect: false },
        { text: 'Neither — a narrative requires a specific story format with a beginning, middle, and end', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A brand narrative stays consistent across 5 years despite multiple product launches and campaigns. What does this consistency achieve?', points: 1, options: [
        { text: 'It makes the marketing team\'s job easier by reducing creative work', isCorrect: false },
        { text: 'It builds brand recognition and trust — customers develop a stable mental model of what the brand stands for', isCorrect: true },
        { text: 'It prevents competitors from copying the brand', isCorrect: false },
        { text: 'It satisfies regulatory requirements for consistent advertising', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A brand\'s narrative claims to champion "natural wellness" but its top-selling product contains 12 synthetic ingredients. What marketing risk does this create?', points: 1, options: [
        { text: 'The product will be recalled by regulators', isCorrect: false },
        { text: 'Narrative-product misalignment erodes trust — customers who feel misled may publicly call out the brand, damaging credibility', isCorrect: true },
        { text: 'The narrative will need to be legally approved before use', isCorrect: false },
        { text: 'Synthetic ingredients are prohibited in wellness marketing', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What distinguishes a brand narrative from a tagline?', points: 1, options: [
        { text: 'A tagline is longer and more detailed', isCorrect: false },
        { text: 'A tagline is a short catchphrase; a narrative is the broader strategic story about who the brand is, who it serves, and why it exists', isCorrect: true },
        { text: 'A narrative is only used internally; a tagline is customer-facing', isCorrect: false },
        { text: 'They are interchangeable terms for the same concept', isCorrect: false },
      ]},
      { type: 'true_false', text: 'A brand narrative should evolve completely with every product launch to stay relevant, even if this means breaking continuity with previous messaging.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False', isCorrect: true },
      ]},
    ])
  }

  // Subtopic 6-3
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic6.id, title: 'Persona vs narrative: how they work together', tag: 'marketing', sortOrder: 2 },
    })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A men\'s grooming brand has a persona of "Rahul — 28, self-conscious about hair loss, values confidence" and a narrative of "Reclaim your confidence." How does the narrative serve the persona?', points: 1, options: [
        { text: 'The narrative describes the product\'s ingredients to match Rahul\'s need for information', isCorrect: false },
        { text: 'The narrative speaks directly to Rahul\'s core fear and aspiration, making the brand story feel personally relevant to him', isCorrect: true },
        { text: 'The narrative replaces the need for a persona because it addresses all customers', isCorrect: false },
        { text: 'They are unrelated — persona informs product; narrative informs pricing', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A brand changes its target persona from "young gym-goers" to "busy professionals aged 35-50" but keeps its original "Beast Mode" narrative unchanged. What problem is likely to emerge?', points: 1, options: [
        { text: 'The narrative will resonate even more strongly with professionals', isCorrect: false },
        { text: 'The narrative no longer reflects the values, language, or context of the new persona, creating a disconnect that weakens relevance', isCorrect: true },
        { text: 'Changing personas without changing the narrative is standard practice', isCorrect: false },
        { text: 'The old persona customers will stop buying', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which statement correctly describes the relationship between persona and narrative?', points: 1, options: [
        { text: 'The persona is the message; the narrative is the audience', isCorrect: false },
        { text: 'The persona defines WHO you are speaking to; the narrative defines WHAT story you tell them and why it matters', isCorrect: true },
        { text: 'Narrative comes first; persona is derived from the narrative', isCorrect: false },
        { text: 'They are the same thing expressed in different formats', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A campaign team skips persona research and builds the narrative first. What is the most likely outcome?', points: 1, options: [
        { text: 'The campaign will perform well because narrative drives emotion regardless of audience', isCorrect: false },
        { text: 'The narrative may be compelling in isolation but fail to connect with the actual target customer\'s real pain points and language', isCorrect: true },
        { text: 'The narrative will automatically attract the right persona', isCorrect: false },
        { text: 'Building narrative before persona is the recommended sequence in marketing', isCorrect: false },
      ]},
      { type: 'true_false', text: 'A brand can serve multiple personas with a single narrative only if all personas share the same core emotional need or aspiration that the narrative addresses.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // Subtopic 6-4: Map a persona and narrative — PROJECT
  {
    const sub = await prisma.subtopic.create({
      data: { topicId: topic6.id, title: 'Map a persona and narrative', tag: 'marketing', sortOrder: 3 },
    })
    await prisma.project.create({
      data: {
        subtopicId: sub.id,
        title: 'Persona & Narrative Documentation',
        briefText: 'Sit with 2 category managers at Man Matters. Understand the target persona and brand narrative for the product you\'re handling. Document both in a structured format.',
        expectedOutput: 'A Notion page or document with: (1) Persona profile — demographics, goals, pain points, behaviour. (2) Narrative — the story the brand tells this persona and why.',
        isPublished: true,
        criteria: {
          create: [
            { name: 'Persona Depth', description: 'Persona covers demographics, goals, pain points, and behaviour patterns', maxMarks: 15, sortOrder: 0 },
            { name: 'Narrative Clarity', description: 'Narrative is distinct from the persona and explains the brand story', maxMarks: 10, sortOrder: 1 },
            { name: 'Insight Quality', description: 'Documentation reflects real insights from the interviews, not generic templates', maxMarks: 10, sortOrder: 2 },
          ],
        },
      },
    })
  }


  console.log('Creating badges...')
  await prisma.badge.createMany({
    skipDuplicates: true,
    data: [
      { name: 'Bootloaded',      description: 'Complete Week 1: Boot Sequence',          iconEmoji: '🔧', conditionType: 'week_complete', conditionValue: '1',             isSpecial: false },
      { name: 'Wired In',        description: 'Complete Week 2: AI in the Wild',          iconEmoji: '🤖', conditionType: 'week_complete', conditionValue: '2',             isSpecial: false },
      { name: 'In the Loop',     description: 'Complete Week 3: Data Matters',            iconEmoji: '📊', conditionType: 'week_complete', conditionValue: '3',             isSpecial: false },
      { name: 'Halfway There',   description: 'Complete Week 4: Market Fit',              iconEmoji: '🎯', conditionType: 'week_complete', conditionValue: '4',             isSpecial: true  },
      { name: 'Deep Stack',      description: 'Complete Week 5: Build and Ship',          iconEmoji: '🚀', conditionType: 'week_complete', conditionValue: '5',             isSpecial: false },
      { name: 'Growth Mode',     description: 'Complete Week 6: Growth Loops',            iconEmoji: '📈', conditionType: 'week_complete', conditionValue: '6',             isSpecial: false },
      { name: 'Almost Shipped',  description: 'Complete Week 7: Brand Voice',             iconEmoji: '✍️', conditionType: 'week_complete', conditionValue: '7',             isSpecial: false },
      { name: 'Fully Deployed',  description: 'Complete all 8 weeks',                    iconEmoji: '🌟', conditionType: 'week_complete', conditionValue: '8',             isSpecial: true  },
      { name: 'Quiz Master',     description: 'Score 95%+ on 5 or more distinct quizzes',          iconEmoji: '🧠', conditionType: 'special',            conditionValue: 'quiz_master',   isSpecial: true  },
      { name: 'Perfectionist',   description: '90%+ on every required quiz in a week, first attempt',iconEmoji: '💎', conditionType: 'weekly_performance', conditionValue: 'perfectionist', isSpecial: true  },
      { name: 'Ship It',         description: 'All required projects for a week submitted and graded',iconEmoji: '📦', conditionType: 'weekly_performance', conditionValue: 'ship_it',       isSpecial: true  },
      { name: 'Streak Lord',     description: 'Maintain a 4-week learning streak',                   iconEmoji: '🔥', conditionType: 'special',            conditionValue: 'streak_lord',   isSpecial: true  },
      { name: 'Early Operator',  description: 'Member of the founding cohort',                       iconEmoji: '🎖️', conditionType: 'special',           conditionValue: 'early_operator',isSpecial: false },
      { name: 'First 1K',        description: 'Earn 1,000 XP',                                       iconEmoji: '⚡', conditionType: 'xp_milestone',       conditionValue: '1000',          isSpecial: false },
      { name: '5K Club',         description: 'Earn 5,000 XP',                                       iconEmoji: '💫', conditionType: 'xp_milestone',       conditionValue: '5000',          isSpecial: false },
      { name: '10K Club',        description: 'Earn 10,000 XP',                                      iconEmoji: '🏆', conditionType: 'xp_milestone',       conditionValue: '10000',         isSpecial: true  },
    ],
  })

  console.log('Unlocking Week 1 for learners...')
  await ensureWeek1Unlocked([kunal.id, sabika.id, test.id])

  console.log('Awarding Early Operator badge...')
  const earlyOpBadge = await prisma.badge.findFirst({ where: { conditionValue: 'early_operator' } })
  if (earlyOpBadge) {
    for (const learner of [kunal, sabika]) {
      const existing = await prisma.userBadge.findFirst({
        where: { userId: learner.id, badgeId: earlyOpBadge.id, weekNumber: null },
      })
      if (!existing) {
        await prisma.userBadge.create({ data: { userId: learner.id, badgeId: earlyOpBadge.id } })
      }
    }
  }

  console.log('Seed complete!')
}

async function ensureWeek1Unlocked(learnerIds: string[]) {
  const week1 = await prisma.week.findUnique({ where: { number: 1 } })
  if (!week1) return
  for (const userId of learnerIds) {
    await prisma.userWeekProgress.upsert({
      where: { userId_weekId: { userId, weekId: week1.id } },
      create: { userId, weekId: week1.id, isUnlocked: true, unlockedAt: new Date(), unlockedByAdmin: false },
      update: {},
    })
  }
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
