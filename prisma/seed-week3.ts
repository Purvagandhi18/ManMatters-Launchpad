import * as fs from 'fs'
import * as path from 'path'
import { PrismaClient } from '@prisma/client'

function parseEnvFile(filePath: string): Record<string, string> {
  try {
    return Object.fromEntries(
      fs.readFileSync(filePath, 'utf8').split('\n')
        .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
        .map(l => {
          const eq = l.indexOf('=')
          const key = l.slice(0, eq).trim()
          const val = l.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
          return [key, val]
        })
    )
  } catch { return {} }
}

const envBase = parseEnvFile(path.join(process.cwd(), '.env'))
const envLocal = parseEnvFile(path.join(process.cwd(), '.env.local'))
const env = { ...envBase, ...envLocal }

const dbUrl = env.DIRECT_URL || env.DATABASE_URL
if (!dbUrl) throw new Error('No DATABASE_URL or DIRECT_URL found in .env / .env.local')
console.log('Using direct DB connection (bypassing pooler)')

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })

type Opt = { text: string; isCorrect: boolean }
type Q = { type: string; text: string; points: number; options: Opt[] }

async function createQuestions(quizId: string, questions: Q[]) {
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
          create: q.options.map((opt, j) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
            sortOrder: j,
          })),
        },
      },
    })
  }
}

async function main() {
  console.log('Seeding Week 3...')

  // Check if Week 3 already exists
  let week3 = await prisma.week.findUnique({ where: { number: 3 } })

  if (week3) {
    const existingTopics = await prisma.topic.count({ where: { weekId: week3.id } })
    if (existingTopics > 0) {
      console.log('Week 3 already has topics — running unlock only.')
      await unlockWeek3ForAll(week3.id)
      console.log('Done.')
      return
    }
  } else {
    week3 = await prisma.week.create({
      data: {
        number: 3,
        title: 'Tech Foundations',
        description: 'Master SQL, Supabase, Mixpanel analytics, and authentication & security — the technical building blocks every startup operator needs.',
        badgeName: 'In the Loop',
        badgeIcon: '🛠️',
        isPublished: true,
      },
    })
    console.log('Created Week 3.')
  }

  const w = week3.id

  // ═══════════════════════════════════════════════════════════════════════════════
  // TOPIC 1 — SQL Fundamentals
  // ═══════════════════════════════════════════════════════════════════════════════
  const t1 = await prisma.topic.create({ data: { weekId: w, title: 'SQL Fundamentals', tag: 'tech', sortOrder: 0 } })

  // Subtopic 1.1 — Databases and How Data Lives
  {
    const sub = await prisma.subtopic.create({ data: { topicId: t1.id, title: 'Databases and How Data Lives', tag: 'tech', sortOrder: 0, description: 'What a relational database is, relational vs non-relational, tables/rows/columns/data types, creating your first database and table.' } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
            { type: "mcq", text: "A D2C brand stores customer orders in a spreadsheet with columns for order_id, customer_name, product, and price. If they move this data into a relational database, what is the closest equivalent of a single spreadsheet row?", points: 1, options: [
        { text: "A table", isCorrect: false },
        { text: "A column", isCorrect: false },
        { text: "A row (also called a record)", isCorrect: true },
        { text: "A database", isCorrect: false },
      ]},
      { type: "true_false", text: "A relational database stores data in tables with defined columns and data types, while a non-relational (NoSQL) database can store data in flexible formats like documents or key-value pairs.", points: 1, options: [
        { text: "True", isCorrect: true },
        { text: "False", isCorrect: false },
      ]},
      { type: "mcq", text: "You run: CREATE TABLE products (id INTEGER, name TEXT, price DECIMAL); — What does the DECIMAL keyword specify?", points: 1, options: [
        { text: "The name of the column", isCorrect: false },
        { text: "The data type the column will accept", isCorrect: true },
        { text: "A constraint that limits which values can go in", isCorrect: false },
        { text: "The default value for the column", isCorrect: false },
      ]},
      { type: "multi_select", text: "Which of the following are true about relational databases? (Select all that apply)", points: 1, options: [
        { text: "Every column in a table has a defined data type", isCorrect: true },
        { text: "Tables can be linked to each other through shared columns", isCorrect: true },
        { text: "Each row in a table can have a different set of columns", isCorrect: false },
        { text: "Data is organized into tables with rows and columns", isCorrect: true },
      ]},
      { type: "mcq", text: "Your team wants to store product reviews where each review can have a different structure — some include photos, some include star ratings, and some include both. Which type of database is better suited for this flexible structure?", points: 1, options: [
        { text: "A relational database, because it enforces structure", isCorrect: false },
        { text: "A relational database, because tables handle any format", isCorrect: false },
        { text: "A non-relational database, because it allows flexible document structures", isCorrect: true },
        { text: "Neither — you need a spreadsheet for mixed formats", isCorrect: false },
      ]},
    ])
  }

  // Subtopic 1.2 — Keys and Constraints
  {
    const sub = await prisma.subtopic.create({ data: { topicId: t1.id, title: 'Keys and Constraints', tag: 'tech', sortOrder: 1, description: 'Primary keys, unique constraints, NOT NULL, foreign keys — why constraints exist for data integrity.' } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
            { type: "mcq", text: "A customers table has a primary key on the id column. What happens if you try to insert two rows with the same id value?", points: 1, options: [
        { text: "The second row overwrites the first row silently", isCorrect: false },
        { text: "Both rows are inserted because primary keys allow duplicates", isCorrect: false },
        { text: "The database returns an error and rejects the second insert", isCorrect: true },
        { text: "The database automatically assigns a new id to the second row", isCorrect: false },
      ]},
      { type: "true_false", text: "A NOT NULL constraint on the email column means customers can leave their email blank as long as they provide a name.", points: 1, options: [
        { text: "True", isCorrect: false },
        { text: "False", isCorrect: true },
      ]},
      { type: "multi_select", text: "Which of the following are valid reasons to use a foreign key? (Select all that apply)", points: 1, options: [
        { text: "To prevent orders from referencing a customer_id that does not exist in the customers table", isCorrect: true },
        { text: "To automatically generate unique IDs for new rows", isCorrect: false },
        { text: "To create a link between two related tables", isCorrect: true },
        { text: "To ensure that deleting a customer does not leave orphaned orders", isCorrect: true },
      ]},
      { type: "mcq", text: "You have a users table where the email column has a UNIQUE constraint. A colleague says: 'UNIQUE is the same as a primary key.' What is wrong with this statement?", points: 1, options: [
        { text: "UNIQUE allows NULL values and a table can have multiple UNIQUE columns, while there can only be one primary key", isCorrect: true },
        { text: "There is nothing wrong — UNIQUE and primary key are identical", isCorrect: false },
        { text: "UNIQUE only works on text columns, while primary keys work on any type", isCorrect: false },
        { text: "UNIQUE prevents inserts entirely, while primary keys allow duplicates", isCorrect: false },
      ]},
      { type: "mcq", text: "An orders table has no constraints at all. A team member accidentally inserts an order with a NULL customer_id and a negative price. Why did the database allow this?", points: 1, options: [
        { text: "The database always allows any data regardless of constraints", isCorrect: false },
        { text: "Without constraints, the database has no rules to reject invalid data", isCorrect: true },
        { text: "Constraints only apply to SELECT queries, not INSERT", isCorrect: false },
        { text: "NULL values and negative numbers are always valid in SQL", isCorrect: false },
      ]},
    ])
  }

  // Subtopic 1.3 — Reading Data
  {
    const sub = await prisma.subtopic.create({ data: { topicId: t1.id, title: 'Reading Data — SELECT, WHERE, ORDER BY', tag: 'tech', sortOrder: 2, description: 'SELECT in detail, WHERE operators, ORDER BY and LIMIT — building queries that answer real business questions.' } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
            { type: "mcq", text: "What does the following query return?\n\nSELECT name, price FROM products WHERE price BETWEEN 10 AND 50;", points: 1, options: [
        { text: "Products with a price greater than 10 and less than 50", isCorrect: false },
        { text: "Products with a price of exactly 10 or exactly 50 only", isCorrect: false },
        { text: "Products with a price from 10 to 50, including both 10 and 50", isCorrect: true },
        { text: "All products, sorted by price from 10 to 50", isCorrect: false },
      ]},
      { type: "mcq", text: "You run: SELECT * FROM customers WHERE name LIKE '%son'; — Which names would this match?", points: 1, options: [
        { text: "Only the exact name 'son'", isCorrect: false },
        { text: "Names that start with 'son', such as 'Sonia'", isCorrect: false },
        { text: "Names that contain 'son' anywhere, such as 'Sonali'", isCorrect: false },
        { text: "Names that end with 'son', such as 'Jackson'", isCorrect: true },
      ]},
      { type: "multi_select", text: "Which of the following WHERE clauses are valid SQL? (Select all that apply)", points: 1, options: [
        { text: "WHERE status IN ('shipped', 'delivered')", isCorrect: true },
        { text: "WHERE price != 0", isCorrect: true },
        { text: "WHERE city = NULL", isCorrect: false },
        { text: "WHERE created_at BETWEEN '2025-01-01' AND '2025-12-31'", isCorrect: true },
      ]},
      { type: "true_false", text: "Adding LIMIT 10 to a query without ORDER BY guarantees you will always get the same 10 rows each time you run it.", points: 1, options: [
        { text: "True", isCorrect: false },
        { text: "False", isCorrect: true },
      ]},
      { type: "mcq", text: "You want to find all products whose name contains the word 'organic' anywhere in it. Which WHERE clause should you use?", points: 1, options: [
        { text: "WHERE name = 'organic'", isCorrect: false },
        { text: "WHERE name IN ('organic')", isCorrect: false },
        { text: "WHERE name LIKE 'organic%'", isCorrect: false },
        { text: "WHERE name LIKE '%organic%'", isCorrect: true },
      ]},
    ])
  }

  // Subtopic 1.4 — Aggregation
  {
    const sub = await prisma.subtopic.create({ data: { topicId: t1.id, title: 'Aggregation — COUNT, SUM, AVG, GROUP BY', tag: 'tech', sortOrder: 3, description: 'Aggregate functions, GROUP BY vs DISTINCT, HAVING vs WHERE — filtering before vs after aggregation.' } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
            { type: "mcq", text: "What does the following query return?\n\nSELECT category, COUNT(*) FROM products GROUP BY category;", points: 1, options: [
        { text: "Every product row, with its category listed next to it", isCorrect: false },
        { text: "One row per category, showing how many products are in each", isCorrect: true },
        { text: "A single number: the total count of all products", isCorrect: false },
        { text: "All distinct category names, without any count", isCorrect: false },
      ]},
      { type: "mcq", text: "You want to show only categories that have more than 5 products. Which clause should you add to a GROUP BY query?", points: 1, options: [
        { text: "WHERE COUNT(*) > 5", isCorrect: false },
        { text: "HAVING COUNT(*) > 5", isCorrect: true },
        { text: "ORDER BY COUNT(*) > 5", isCorrect: false },
        { text: "LIMIT COUNT(*) > 5", isCorrect: false },
      ]},
      { type: "true_false", text: "SELECT DISTINCT category FROM products and SELECT category FROM products GROUP BY category return the same set of category values.", points: 1, options: [
        { text: "True", isCorrect: true },
        { text: "False", isCorrect: false },
      ]},
      { type: "multi_select", text: "Which of the following statements about HAVING and WHERE are correct? (Select all that apply)", points: 1, options: [
        { text: "WHERE filters individual rows before grouping happens", isCorrect: true },
        { text: "HAVING filters groups after aggregation is calculated", isCorrect: true },
        { text: "WHERE can reference aggregate functions like COUNT(*)", isCorrect: false },
        { text: "HAVING and WHERE are interchangeable in all situations", isCorrect: false },
      ]},
      { type: "mcq", text: "You run: SELECT AVG(price) FROM products; — The table has prices: 10, 20, NULL, 30. What result do you get?", points: 1, options: [
        { text: "15, because NULL is treated as 0", isCorrect: false },
        { text: "20, because AVG ignores NULL values", isCorrect: true },
        { text: "NULL, because any NULL makes the result NULL", isCorrect: false },
        { text: "An error, because AVG cannot handle NULL values", isCorrect: false },
      ]},
    ])
  }

  // Subtopic 1.5 — Writing Data
  {
    const sub = await prisma.subtopic.create({ data: { topicId: t1.id, title: 'Writing Data — INSERT, UPDATE, DELETE', tag: 'tech', sortOrder: 4, description: 'Adding rows safely, updating data (and why a missing WHERE clause is terrifying), deleting, cascading effects.' } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
            { type: "mcq", text: "What is the danger of running this query?\n\nUPDATE products SET price = 0;", points: 1, options: [
        { text: "It will fail because 0 is not a valid price", isCorrect: false },
        { text: "It sets the price to 0 for every single row in the table because there is no WHERE clause", isCorrect: true },
        { text: "It only updates the first row in the table", isCorrect: false },
        { text: "It deletes all products with a price of 0", isCorrect: false },
      ]},
      { type: "true_false", text: "Running DELETE FROM orders WHERE id = 5 will also automatically delete related rows in other tables, even without foreign key cascading rules set up.", points: 1, options: [
        { text: "True", isCorrect: false },
        { text: "False", isCorrect: true },
      ]},
      { type: "mcq", text: "You run: INSERT INTO customers (name, email) VALUES ('Jane', 'jane@example.com'); — The table also has columns id (auto-increment primary key) and created_at (default: current timestamp). What happens?", points: 1, options: [
        { text: "The insert fails because you did not provide values for id and created_at", isCorrect: false },
        { text: "The row is inserted with NULL for id and created_at", isCorrect: false },
        { text: "The row is inserted and the database fills in id and created_at automatically", isCorrect: true },
        { text: "The insert succeeds but id and created_at are left blank", isCorrect: false },
      ]},
      { type: "multi_select", text: "A customers table has a foreign key on orders. The foreign key is set to ON DELETE CASCADE. What happens when you delete a customer? (Select all that apply)", points: 1, options: [
        { text: "The customer row is removed from the customers table", isCorrect: true },
        { text: "All orders belonging to that customer are also deleted automatically", isCorrect: true },
        { text: "The orders remain but their customer_id is set to NULL", isCorrect: false },
        { text: "The database blocks the delete to protect the orders", isCorrect: false },
      ]},
      { type: "mcq", text: "You need to change the email for customer id 42 only. Which query is correct?", points: 1, options: [
        { text: "INSERT INTO customers (email) VALUES ('new@example.com') WHERE id = 42;", isCorrect: false },
        { text: "UPDATE customers SET email = 'new@example.com';", isCorrect: false },
        { text: "UPDATE customers SET email = 'new@example.com' WHERE id = 42;", isCorrect: true },
        { text: "DELETE FROM customers WHERE id = 42 AND INSERT email = 'new@example.com';", isCorrect: false },
      ]},
    ])
  }

  // Subtopic 1.6 — Joins, Subqueries, and Safe SQL
  {
    const sub = await prisma.subtopic.create({ data: { topicId: t1.id, title: 'Joins, Subqueries, and Safe SQL', tag: 'tech', sortOrder: 5, description: 'INNER vs LEFT JOIN, subqueries, parameterised queries — why you never concatenate user input into SQL.' } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
            { type: "mcq", text: "You run:\n\nSELECT customers.name, orders.total\nFROM customers\nLEFT JOIN orders ON customers.id = orders.customer_id;\n\nA customer named 'Alex' has never placed an order. What appears in the result for Alex?", points: 1, options: [
        { text: "Alex is excluded from the results entirely", isCorrect: false },
        { text: "Alex appears with NULL for orders.total", isCorrect: true },
        { text: "Alex appears with 0 for orders.total", isCorrect: false },
        { text: "The query returns an error for customers without orders", isCorrect: false },
      ]},
      { type: "mcq", text: "What is the key difference between an INNER JOIN and a LEFT JOIN?", points: 1, options: [
        { text: "INNER JOIN is faster; LEFT JOIN is slower but returns the same rows", isCorrect: false },
        { text: "LEFT JOIN drops unmatched rows from the left table; INNER JOIN keeps them", isCorrect: false },
        { text: "INNER JOIN returns only rows with matches in both tables; LEFT JOIN keeps all rows from the left table", isCorrect: true },
        { text: "LEFT JOIN combines tables side by side; INNER JOIN stacks them on top of each other", isCorrect: false },
      ]},
      { type: "multi_select", text: "Why is using parameterised queries (prepared statements) safer than building SQL with string concatenation? (Select all that apply)", points: 1, options: [
        { text: "User input is treated as data, not as executable SQL commands", isCorrect: true },
        { text: "It prevents SQL injection attacks where malicious input alters the query", isCorrect: true },
        { text: "It makes queries run faster by caching the query plan", isCorrect: false },
        { text: "It ensures user input cannot break out of its intended place in the query", isCorrect: true },
      ]},
      { type: "true_false", text: "A subquery in a WHERE clause — such as WHERE id IN (SELECT customer_id FROM orders) — runs once for each row in the outer table, making subqueries always slower than joins.", points: 1, options: [
        { text: "True", isCorrect: false },
        { text: "False", isCorrect: true },
      ]},
      { type: "mcq", text: "A web form takes a user-entered city name and runs this query:\n\nSELECT * FROM customers WHERE city = '\" + userInput + \"';\n\nIf a user types: '; DROP TABLE customers; -- what could happen?", points: 1, options: [
        { text: "The query searches for a customer in a city called \"DROP TABLE\"", isCorrect: false },
        { text: "The database ignores the extra text and runs the query normally", isCorrect: false },
        { text: "The input could end the original query and execute a command that deletes the entire customers table", isCorrect: true },
        { text: "The query returns an error but no data is affected", isCorrect: false },
      ]},
    ])
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TOPIC 2 — Supabase
  // ═══════════════════════════════════════════════════════════════════════════════
  const t2 = await prisma.topic.create({ data: { weekId: w, title: 'Supabase', tag: 'tech', sortOrder: 1 } })

  // Subtopic 2.1 — What Supabase Is and Project Setup
  {
    const sub = await prisma.subtopic.create({ data: { topicId: t2.id, title: 'What Supabase Is and Project Setup', tag: 'tech', sortOrder: 0, description: 'Supabase as a Postgres wrapper with batteries included — creating a project, navigating the dashboard, creating tables.' } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
            { type: "mcq", text: "A friend says Supabase is a completely custom database built from scratch. What is the most accurate correction?", points: 1, options: [
        { text: "Supabase is a wrapper around PostgreSQL that adds auth, APIs, and a dashboard", isCorrect: true },
        { text: "Supabase replaces PostgreSQL with a faster NoSQL engine under the hood", isCorrect: false },
        { text: "Supabase is a frontend framework that happens to include a database", isCorrect: false },
        { text: "Supabase is a hosted MongoDB service with a SQL-like query language", isCorrect: false },
      ]},
      { type: "true_false", text: "When you create a new Supabase project, you automatically get a full PostgreSQL database — not a simplified or limited version of SQL.", points: 1, options: [
        { text: "True", isCorrect: true },
        { text: "False", isCorrect: false },
      ]},
      { type: "mcq", text: "You just created a new Supabase project and want to add a 'products' table with columns for name and price. Where do you do this?", points: 1, options: [
        { text: "In the Table Editor section of the Supabase dashboard", isCorrect: true },
        { text: "In the Authentication section under User Tables", isCorrect: false },
        { text: "By editing a JSON config file in your code editor", isCorrect: false },
        { text: "In the Storage section under Data Buckets", isCorrect: false },
      ]},
      { type: "multi_select", text: "Which of the following are provided automatically when you create a new Supabase project? (Select all that apply)", points: 1, options: [
        { text: "A PostgreSQL database instance", isCorrect: true },
        { text: "Auto-generated API endpoints for your tables", isCorrect: true },
        { text: "A pre-built frontend application template", isCorrect: false },
        { text: "API keys for connecting from your code", isCorrect: true },
        { text: "A custom domain name for your app", isCorrect: false },
      ]},
      { type: "mcq", text: "When creating a table in the Supabase dashboard, what does checking 'Enable Row Level Security' do at that moment?", points: 1, options: [
        { text: "It turns on RLS for the table but blocks all access until you write policies", isCorrect: true },
        { text: "It automatically allows all logged-in users to read and write data", isCorrect: false },
        { text: "It encrypts every row in the table with a unique key", isCorrect: false },
        { text: "It hides the table from the dashboard so only code can access it", isCorrect: false },
      ]},
    ])
  }

  // Subtopic 2.2 — Relationships and Querying
  {
    const sub = await prisma.subtopic.create({ data: { topicId: t2.id, title: 'Relationships and Querying', tag: 'tech', sortOrder: 1, description: 'Foreign keys in Supabase, querying from the dashboard — filters, joins, reading results.' } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
            { type: "mcq", text: "You have an 'orders' table and a 'customers' table. You want each order to be linked to exactly one customer. What do you add to the 'orders' table?", points: 1, options: [
        { text: "A foreign key column that references the customers table's primary key", isCorrect: true },
        { text: "A copy of all the customer's columns inside the orders table", isCorrect: false },
        { text: "A JSON column that stores the customer object as text", isCorrect: false },
        { text: "A separate junction table that maps order IDs to customer IDs", isCorrect: false },
      ]},
      { type: "true_false", text: "In Supabase, you can filter and sort query results directly from the Table Editor in the dashboard without writing any code.", points: 1, options: [
        { text: "True", isCorrect: true },
        { text: "False", isCorrect: false },
      ]},
      { type: "mcq", text: "You query the 'orders' table and want to include the customer name from the related 'customers' table. In the Supabase client, what makes this possible without a manual JOIN statement?", points: 1, options: [
        { text: "Supabase auto-detects foreign keys and lets you select columns from related tables", isCorrect: true },
        { text: "You must always write raw SQL joins — there is no shortcut in Supabase", isCorrect: false },
        { text: "Supabase copies related data into your table automatically each night", isCorrect: false },
        { text: "You need to create a view in the SQL editor before any join is possible", isCorrect: false },
      ]},
      { type: "multi_select", text: "Which of the following are valid ways to filter data when querying in Supabase? (Select all that apply)", points: 1, options: [
        { text: "Using the filter controls in the Table Editor dashboard", isCorrect: true },
        { text: "Using .eq(), .gt(), or .like() methods in the client library", isCorrect: true },
        { text: "Writing raw SQL in the SQL Editor", isCorrect: true },
        { text: "Adding filter parameters to the table name itself", isCorrect: false },
      ]},
      { type: "mcq", text: "A foreign key on orders.customer_id references customers.id. Someone tries to insert an order with a customer_id that does not exist in the customers table. What happens?", points: 1, options: [
        { text: "The database rejects the insert with a foreign key violation error", isCorrect: true },
        { text: "The order is inserted and a new empty customer is created automatically", isCorrect: false },
        { text: "The order is inserted with customer_id set to null instead", isCorrect: false },
        { text: "The insert succeeds but the order is flagged as orphaned", isCorrect: false },
      ]},
    ])
  }

  // Subtopic 2.3 — Connecting Python to Supabase
  {
    const sub = await prisma.subtopic.create({ data: { topicId: t2.id, title: 'Connecting Python to Supabase', tag: 'tech', sortOrder: 2, description: 'Installing the Python client, CRUD from code, handling responses and errors.' } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
            { type: "mcq", text: "You run `pip install supabase` and create a client. Which two pieces of information from your Supabase project do you need to initialize the connection?", points: 1, options: [
        { text: "The project URL and the anon (public) API key", isCorrect: true },
        { text: "The database password and the project region", isCorrect: false },
        { text: "Your Supabase account email and password", isCorrect: false },
        { text: "The table name and the project creation date", isCorrect: false },
      ]},
      { type: "mcq", text: "You write `supabase.table('products').select('*').execute()` in Python. The response comes back with an empty `data` list and no error. What is the most likely explanation?", points: 1, options: [
        { text: "The table exists but has no rows, or RLS is blocking access", isCorrect: true },
        { text: "The Python client failed to connect to Supabase", isCorrect: false },
        { text: "The select('*') syntax is wrong and returned nothing", isCorrect: false },
        { text: "Supabase automatically hides data from Python clients", isCorrect: false },
      ]},
      { type: "multi_select", text: "Which of the following are valid CRUD operations you can perform using the Supabase Python client? (Select all that apply)", points: 1, options: [
        { text: "Insert a new row with .insert({'name': 'Widget'}).execute()", isCorrect: true },
        { text: "Read rows with .select('*').execute()", isCorrect: true },
        { text: "Update a row with .update({'price': 10}).eq('id', 1).execute()", isCorrect: true },
        { text: "Delete a row with .remove('id', 1).execute()", isCorrect: false },
      ]},
      { type: "true_false", text: "If a Supabase Python operation fails (for example due to a missing column), the client always raises a Python exception that crashes your program immediately.", points: 1, options: [
        { text: "True", isCorrect: false },
        { text: "False", isCorrect: true },
      ]},
      { type: "mcq", text: "You want to insert a row and immediately get the inserted data back in the same call. How do you accomplish this with the Supabase Python client?", points: 1, options: [
        { text: "The insert operation returns the inserted row by default in the response data", isCorrect: true },
        { text: "You must call .select() in a second request after the insert completes", isCorrect: false },
        { text: "You add .returning('all') as a separate method before .execute()", isCorrect: false },
        { text: "Supabase does not support returning data from insert operations", isCorrect: false },
      ]},
    ])
  }

  // Subtopic 2.4 — Row-Level Security and pgvector
  {
    const sub = await prisma.subtopic.create({ data: { topicId: t2.id, title: 'Row-Level Security and pgvector', tag: 'tech', sortOrder: 3, description: 'What RLS is, why public-by-default is dangerous, writing RLS policies, pgvector for embeddings and RAG.' } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
            { type: "mcq", text: "You create a table in Supabase and immediately query it from a frontend app using the anon key, without enabling RLS. What happens?", points: 1, options: [
        { text: "Anyone with the anon key can read and modify all data in the table", isCorrect: true },
        { text: "The query is blocked because RLS is enabled by default on all tables", isCorrect: false },
        { text: "Only authenticated users can access the data by default", isCorrect: false },
        { text: "The data is visible but automatically read-only without RLS", isCorrect: false },
      ]},
      { type: "true_false", text: "Row-Level Security (RLS) is the same thing as Supabase Authentication. If you set up auth, your tables are automatically protected.", points: 1, options: [
        { text: "True", isCorrect: false },
        { text: "False", isCorrect: true },
      ]},
      { type: "mcq", text: "You enable RLS on a 'notes' table but do not add any policies. What can users do through the API?", points: 1, options: [
        { text: "Nothing — all access is denied until you create at least one policy", isCorrect: true },
        { text: "They can read all rows but cannot write any data", isCorrect: false },
        { text: "They have full access because enabling RLS without policies changes nothing", isCorrect: false },
        { text: "Only the table owner's data is visible to everyone", isCorrect: false },
      ]},
      { type: "multi_select", text: "Which of the following are true about pgvector in Supabase? (Select all that apply)", points: 1, options: [
        { text: "It stores vector embeddings as a column type in your Postgres table", isCorrect: true },
        { text: "It enables similarity search to find items closest to a query vector", isCorrect: true },
        { text: "It replaces your text data with vectors so the original text is deleted", isCorrect: false },
        { text: "It is useful for building retrieval-augmented generation (RAG) applications", isCorrect: true },
        { text: "It requires a separate non-Postgres database to store the vectors", isCorrect: false },
      ]},
      { type: "mcq", text: "You are building a RAG app where users search documents by meaning. You store text chunks and their embeddings using pgvector. To find the most relevant chunks for a user query, what do you do?", points: 1, options: [
        { text: "Convert the query to an embedding and use a similarity search function to find the closest vectors", isCorrect: true },
        { text: "Use a SQL LIKE query to match the query text against the stored text chunks", isCorrect: false },
        { text: "Loop through every row in Python and calculate cosine similarity manually", isCorrect: false },
        { text: "Store the query as a new row and let pgvector auto-match it to similar rows", isCorrect: false },
      ]},
    ])
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TOPIC 3 — Mixpanel
  // ═══════════════════════════════════════════════════════════════════════════════
  const t3 = await prisma.topic.create({ data: { weekId: w, title: 'Mixpanel', tag: 'tech', sortOrder: 2 } })

  // Subtopic 3.1 — Events, Properties, and Users
  {
    const sub = await prisma.subtopic.create({ data: { topicId: t3.id, title: 'Events, Properties, and Users', tag: 'tech', sortOrder: 0, description: 'What an event is, event vs user properties, how Mixpanel\'s data model differs from a spreadsheet.' } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
            { type: "mcq", text: "Your D2C brand tracks \"Add to Cart\" in Mixpanel. A teammate asks why you also store the product category and cart value alongside it. What is the best explanation?", points: 1, options: [
        { text: "Those are event properties that let you break down and filter the event by meaningful dimensions later", isCorrect: true },
        { text: "Mixpanel requires at least two extra fields for every event or it will not record the event at all", isCorrect: false },
        { text: "They are user properties that update the customer profile each time an Add to Cart happens", isCorrect: false },
        { text: "They create separate events for each product category so you can count them independently", isCorrect: false },
      ]},
      { type: "true_false", text: "In Mixpanel, a single page view and a button click are both examples of events.", points: 1, options: [
        { text: "True", isCorrect: true },
        { text: "False", isCorrect: false },
      ]},
      { type: "mcq", text: "A colleague builds a spreadsheet where each row is a customer and columns include 'total orders' and 'last visit date.' How does the Mixpanel data model differ from this approach?", points: 1, options: [
        { text: "Mixpanel stores a timestamped stream of individual actions rather than one summary row per customer", isCorrect: true },
        { text: "Mixpanel stores the same summary row per customer but adds automatic charts on top", isCorrect: false },
        { text: "Mixpanel only tracks aggregate totals and cannot show data for a single customer", isCorrect: false },
        { text: "Mixpanel replaces spreadsheets by importing CSV files and converting them into pivot tables", isCorrect: false },
      ]},
      { type: "multi_select", text: "Which of the following are user properties (as opposed to event properties) in a typical D2C Mixpanel setup? Select all that apply.", points: 1, options: [
        { text: "The customer's subscription plan stored on their profile", isCorrect: true },
        { text: "The city listed in the customer's account settings", isCorrect: true },
        { text: "The discount code entered during a specific checkout session", isCorrect: false },
        { text: "The shipping method selected for a particular order", isCorrect: false },
      ]},
      { type: "mcq", text: "You notice that 'Product Viewed' events outnumber your website page views by a large margin. What is the most likely explanation?", points: 1, options: [
        { text: "Events are not the same as page views — a single page can fire multiple custom events based on user interactions", isCorrect: true },
        { text: "Mixpanel is double-counting every page view and recording it as a product view as well", isCorrect: false },
        { text: "Page views are always higher than custom events, so the data must contain tracking errors", isCorrect: false },
        { text: "Product Viewed events only fire on mobile apps while page views only fire on desktop browsers", isCorrect: false },
      ]},
    ])
  }

  // Subtopic 3.2 — Funnels and Segmentation
  {
    const sub = await prisma.subtopic.create({ data: { topicId: t3.id, title: 'Funnels and Segmentation', tag: 'tech', sortOrder: 1, description: 'Building funnels, reading drop-off, segmentation by dimensions — what top-line numbers hide.' } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
            { type: "mcq", text: "Your three-step funnel shows: Product Viewed (10,000) → Add to Cart (3,000) → Purchase Completed (600). Where should you focus optimization efforts first?", points: 1, options: [
        { text: "The Add to Cart to Purchase step, because 80% of interested shoppers drop off before buying", isCorrect: true },
        { text: "The Product Viewed step, because 10,000 views is too low and you need more top-of-funnel traffic", isCorrect: false },
        { text: "The Purchase Completed step, because 600 purchases means checkout is broken for everyone", isCorrect: false },
        { text: "All three steps equally, because funnel optimization should never prioritize one step over another", isCorrect: false },
      ]},
      { type: "mcq", text: "Your overall funnel conversion rate is 5%. When you segment by acquisition channel, you discover that Instagram is at 9% and Google Ads is at 2%. What does this tell you?", points: 1, options: [
        { text: "Segmentation revealed that the top-line number hides meaningful differences between channels worth investigating", isCorrect: true },
        { text: "The 5% overall number is wrong and should be replaced with the average of 9% and 2%", isCorrect: false },
        { text: "Google Ads should be turned off immediately since its conversion rate is below the overall average", isCorrect: false },
        { text: "Instagram users are always better customers regardless of what product you sell", isCorrect: false },
      ]},
      { type: "true_false", text: "Segmenting a funnel by city can only be done if city is stored as an event property on every single event in the funnel.", points: 1, options: [
        { text: "True", isCorrect: false },
        { text: "False", isCorrect: true },
      ]},
      { type: "multi_select", text: "Which of the following are valid reasons to segment a funnel in Mixpanel? Select all that apply.", points: 1, options: [
        { text: "To check whether mobile and desktop users drop off at different steps", isCorrect: true },
        { text: "To see if customers from a recent campaign convert differently than organic visitors", isCorrect: true },
        { text: "To compare conversion rates across different product categories", isCorrect: true },
        { text: "To increase the total number of users entering the top of the funnel", isCorrect: false },
      ]},
      { type: "mcq", text: "You build a funnel with a 7-day conversion window. A user does Step 1 on Monday and Step 2 the following Wednesday (9 days later). How does Mixpanel treat this user?", points: 1, options: [
        { text: "The user counts as dropped off because they completed Step 2 outside the 7-day conversion window", isCorrect: true },
        { text: "The user counts as converted because they eventually completed both steps regardless of timing", isCorrect: false },
        { text: "The user is excluded from the funnel entirely and does not appear in any step", isCorrect: false },
        { text: "The user is counted twice — once as dropped off and once as converted in a later cohort", isCorrect: false },
      ]},
    ])
  }

  // Subtopic 3.3 — Retention and User Paths
  {
    const sub = await prisma.subtopic.create({ data: { topicId: t3.id, title: 'Retention and User Paths', tag: 'tech', sortOrder: 2, description: 'Reading retention curves, flows — what users do before and after key events, spotting unexpected behavior.' } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
            { type: "mcq", text: "Your retention curve drops steeply in the first two weeks and then flattens at 18% from week 3 onward. What is the best interpretation?", points: 1, options: [
        { text: "You have a stable core of retained users — the flattening is a positive sign that churn has slowed", isCorrect: true },
        { text: "The flattening means growth has stalled and you should be alarmed about the product's future", isCorrect: false },
        { text: "An 18% retention rate is always considered poor regardless of industry or product type", isCorrect: false },
        { text: "The curve is broken because real retention curves should decline continuously and never flatten", isCorrect: false },
      ]},
      { type: "true_false", text: "A retention curve that never flattens and keeps declining toward zero suggests the product has not yet found a core group of users who get lasting value.", points: 1, options: [
        { text: "True", isCorrect: true },
        { text: "False", isCorrect: false },
      ]},
      { type: "mcq", text: "You use Mixpanel Flows to look at what users do right before they cancel their subscription. You see that 40% of cancellers visited the 'Edit Subscription' page but did not find a downgrade option. What action does this suggest?", points: 1, options: [
        { text: "Adding a downgrade or pause option on that page could save users who would otherwise cancel entirely", isCorrect: true },
        { text: "Removing the Edit Subscription page so that users cannot find the cancel flow as easily", isCorrect: false },
        { text: "Ignoring this pattern because only 40% of cancellers took this path and it is not a majority", isCorrect: false },
        { text: "Sending a discount email to all users regardless of whether they visited that page", isCorrect: false },
      ]},
      { type: "multi_select", text: "Which of the following would count as 'unexpected behavior' worth investigating in a Mixpanel Flows report? Select all that apply.", points: 1, options: [
        { text: "A large percentage of users navigating to the returns page immediately after their first purchase", isCorrect: true },
        { text: "Users repeatedly toggling between two product pages before adding either to their cart", isCorrect: true },
        { text: "Users viewing a product page and then proceeding to add it to their cart", isCorrect: false },
        { text: "New users landing on the homepage and then browsing a product category", isCorrect: false },
      ]},
      { type: "mcq", text: "You compare retention curves for two cohorts: users who completed onboarding in their first session vs. users who skipped it. The onboarding group retains at 25% after 4 weeks while the skip group retains at 8%. What conclusion is most appropriate?", points: 1, options: [
        { text: "Onboarding completion is strongly correlated with retention and is worth optimizing to increase completion rates", isCorrect: true },
        { text: "Onboarding definitely causes better retention so you should force every user through it without exception", isCorrect: false },
        { text: "The skip group's 8% retention is acceptable for a D2C brand so no action is needed", isCorrect: false },
        { text: "Retention curves cannot be compared across cohorts because each group has a different starting size", isCorrect: false },
      ]},
    ])
  }

  // Subtopic 3.4 — Mixpanel API
  {
    const sub = await prisma.subtopic.create({ data: { topicId: t3.id, title: 'Mixpanel API — Data in Python', tag: 'tech', sortOrder: 3, description: 'Pulling event data via API, when to use API vs dashboard, data format expectations.' } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
            { type: "mcq", text: "Your marketing lead asks for a custom report combining Mixpanel event data with warehouse data on customer lifetime value. When does using the Mixpanel API in Python beat using the dashboard?", points: 1, options: [
        { text: "When you need to join Mixpanel data with external datasets that are not available inside the Mixpanel UI", isCorrect: true },
        { text: "Always, because the API returns more accurate data than the dashboard shows", isCorrect: false },
        { text: "Never, because the dashboard can connect to any external database and join data automatically", isCorrect: false },
        { text: "Only when the dashboard is down for maintenance and you need a temporary workaround", isCorrect: false },
      ]},
      { type: "true_false", text: "The Mixpanel API returns event data in JSON format by default, not as a CSV spreadsheet.", points: 1, options: [
        { text: "True", isCorrect: true },
        { text: "False", isCorrect: false },
      ]},
      { type: "multi_select", text: "Which of the following are realistic scenarios where pulling Mixpanel data via the API is more practical than using the dashboard? Select all that apply.", points: 1, options: [
        { text: "Automating a weekly report that combines funnel data with ad spend from another platform", isCorrect: true },
        { text: "Running a statistical test on event data that requires custom Python calculations", isCorrect: true },
        { text: "Checking how many times a single event was triggered yesterday afternoon", isCorrect: false },
        { text: "Building a quick funnel visualization to share in a team meeting this morning", isCorrect: false },
      ]},
      { type: "mcq", text: "You write a Python script to pull 'Purchase Completed' events from the Mixpanel API. The response includes nested dictionaries with keys like 'event' and 'properties'. What should you expect inside 'properties'?", points: 1, options: [
        { text: "Key-value pairs for each event property such as product name, revenue amount, and timestamp", isCorrect: true },
        { text: "A single string summarizing the event in plain English for easy reading", isCorrect: false },
        { text: "A list of all users who triggered the event with their full profile information", isCorrect: false },
        { text: "The raw HTML of the page where the event was triggered for debugging purposes", isCorrect: false },
      ]},
      { type: "mcq", text: "A teammate suggests using the Mixpanel API to pull every single event from the past two years into a Python script running on their laptop. What is the biggest practical concern?", points: 1, options: [
        { text: "The data volume will likely be too large for local memory and the API may enforce rate limits or export caps", isCorrect: true },
        { text: "The API only stores data for the last 30 days so events older than that cannot be retrieved", isCorrect: false },
        { text: "Python cannot process JSON data so they would need to switch to a different programming language", isCorrect: false },
        { text: "The API will automatically aggregate the data into monthly summaries and individual events will be lost", isCorrect: false },
      ]},
    ])
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TOPIC 4 — Auth and Security
  // ═══════════════════════════════════════════════════════════════════════════════
  const t4 = await prisma.topic.create({ data: { weekId: w, title: 'Auth and Security', tag: 'tech', sortOrder: 3 } })

  // Subtopic 4.1 — Authentication vs Authorisation
  {
    const sub = await prisma.subtopic.create({ data: { topicId: t4.id, title: 'Authentication vs Authorisation', tag: 'tech', sortOrder: 0, description: 'What each does, why both matter, passwords/sessions/tokens/OAuth.' } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
            { type: "mcq", text: "A customer logs into your D2C store and sees their order history. Which part is authentication and which is authorisation?", points: 1, options: [
        { text: "Logging in is authentication; seeing only their own orders is authorisation", isCorrect: true },
        { text: "Logging in is authorisation; seeing only their own orders is authentication", isCorrect: false },
        { text: "Both steps are authentication since the user proved who they are", isCorrect: false },
        { text: "Both steps are authorisation since the system is granting access", isCorrect: false },
      ]},
      { type: "true_false", text: "If your app has strong authentication (e.g. multi-factor login), you don't also need authorisation rules because verified users can be trusted.", points: 1, options: [
        { text: "True", isCorrect: false },
        { text: "False", isCorrect: true },
      ]},
      { type: "mcq", text: "When you log into a website and it gives your browser a session cookie, what is the cookie's primary purpose?", points: 1, options: [
        { text: "It remembers your identity so you don't re-enter your password on every page", isCorrect: true },
        { text: "It encrypts your password and stores it locally for security", isCorrect: false },
        { text: "It determines which pages you are allowed to visit on the site", isCorrect: false },
        { text: "It sends your login credentials to the server with each request", isCorrect: false },
      ]},
      { type: "multi_select", text: "Which of the following are examples of authentication methods? (Select all that apply)", points: 1, options: [
        { text: "Entering a username and password on a login form", isCorrect: true },
        { text: "Scanning your fingerprint to unlock a phone app", isCorrect: true },
        { text: "An admin marking a user's account as 'read-only'", isCorrect: false },
        { text: "Signing in with Google via OAuth on a third-party site", isCorrect: true },
        { text: "Setting a user's role to 'warehouse staff' in the admin panel", isCorrect: false },
      ]},
      { type: "mcq", text: "Your D2C brand lets customers log in with Google (OAuth). What does Google share with your app during this process?", points: 1, options: [
        { text: "A token confirming the user's identity, without sharing their Google password", isCorrect: true },
        { text: "The user's Google password so your app can verify it directly", isCorrect: false },
        { text: "Full access to the user's Google Drive and Gmail account", isCorrect: false },
        { text: "A copy of all the user's browsing history for verification", isCorrect: false },
      ]},
    ])
  }

  // Subtopic 4.2 — JWT and API Keys
  {
    const sub = await prisma.subtopic.create({ data: { topicId: t4.id, title: 'JWT and API Keys', tag: 'tech', sortOrder: 1, description: 'What JWT is, signed vs encrypted, API key management, when to use which.' } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
            { type: "mcq", text: "A colleague says 'JWTs are encrypted, so the data inside is hidden from everyone.' What's wrong with this statement?", points: 1, options: [
        { text: "Standard JWTs are signed, not encrypted — anyone can decode and read the payload", isCorrect: true },
        { text: "Nothing is wrong; JWTs always encrypt their contents by default", isCorrect: false },
        { text: "JWTs don't contain any data at all, they are just random tokens", isCorrect: false },
        { text: "JWTs are encrypted but only when sent over HTTP, not HTTPS", isCorrect: false },
      ]},
      { type: "multi_select", text: "Which of the following are typically found inside a JWT's payload? (Select all that apply)", points: 1, options: [
        { text: "The user's ID or email address", isCorrect: true },
        { text: "An expiration time for the token", isCorrect: true },
        { text: "The user's plaintext password for re-authentication", isCorrect: false },
        { text: "The user's role or permissions", isCorrect: true },
        { text: "A full copy of the application's database schema", isCorrect: false },
      ]},
      { type: "mcq", text: "Your team's API key for a payment service is leaked in a public GitHub repo. What should you do FIRST?", points: 1, options: [
        { text: "Revoke the leaked key immediately and generate a new one", isCorrect: true },
        { text: "Delete the GitHub repo to remove the key from public view", isCorrect: false },
        { text: "Change the repo from public to private to hide the key", isCorrect: false },
        { text: "Add the key to a .env file and push a new commit to overwrite it", isCorrect: false },
      ]},
      { type: "mcq", text: "When should you use an API key instead of a JWT for authenticating requests?", points: 1, options: [
        { text: "When a backend service needs to call another service without a logged-in user", isCorrect: true },
        { text: "When you want to store the user's role and permissions in the token", isCorrect: false },
        { text: "When you need the token to expire automatically after a set time", isCorrect: false },
        { text: "When you need to identify which specific user is making the request", isCorrect: false },
      ]},
      { type: "true_false", text: "API keys should be rotated (replaced with new ones) regularly, even if you have no evidence they've been compromised.", points: 1, options: [
        { text: "True", isCorrect: true },
        { text: "False", isCorrect: false },
      ]},
    ])
  }

  // Subtopic 4.3 — Supabase Auth and Environment Variables
  {
    const sub = await prisma.subtopic.create({ data: { topicId: t4.id, title: 'Supabase Auth and Environment Variables', tag: 'tech', sortOrder: 2, description: 'Setting up login in Supabase, .env files, secrets management, what gets committed.' } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
            { type: "mcq", text: "Your project has a .env file containing SUPABASE_SERVICE_KEY. A teammate asks if it's safe to commit this file to Git. What's the correct answer?", points: 1, options: [
        { text: "No — .env files with secrets must be listed in .gitignore and never committed", isCorrect: true },
        { text: "Yes — Git encrypts all committed files, so secrets are protected automatically", isCorrect: false },
        { text: "Yes — as long as the repository is private, committing secrets is fine", isCorrect: false },
        { text: "No — but only because .env files are too large for Git to handle properly", isCorrect: false },
      ]},
      { type: "multi_select", text: "Which of the following should be stored as environment variables rather than hardcoded in your source code? (Select all that apply)", points: 1, options: [
        { text: "Your Supabase project URL", isCorrect: true },
        { text: "Your Supabase service role key", isCorrect: true },
        { text: "The name of a database table like 'products'", isCorrect: false },
        { text: "A third-party payment gateway API secret", isCorrect: true },
        { text: "The hex code for your brand's primary colour", isCorrect: false },
      ]},
      { type: "mcq", text: "In Supabase, what is the difference between the 'anon' key and the 'service_role' key?", points: 1, options: [
        { text: "The anon key has limited public access; the service_role key bypasses row-level security", isCorrect: true },
        { text: "The anon key is for testing only; the service_role key is for production use", isCorrect: false },
        { text: "Both keys provide the same access but the service_role key is faster", isCorrect: false },
        { text: "The anon key works on mobile apps; the service_role key works on web apps", isCorrect: false },
      ]},
      { type: "true_false", text: "If you accidentally commit a .env file containing API secrets to a public repo, simply deleting the file in the next commit removes it completely from the repository's history.", points: 1, options: [
        { text: "True", isCorrect: false },
        { text: "False", isCorrect: true },
      ]},
      { type: "mcq", text: "You're setting up Supabase Auth for your D2C app's customer login. Which approach correctly handles the authentication flow?", points: 1, options: [
        { text: "Use Supabase's built-in auth methods and store the session token client-side", isCorrect: true },
        { text: "Store the user's password in a Supabase database table you create yourself", isCorrect: false },
        { text: "Send the user's password to your frontend and verify it with JavaScript", isCorrect: false },
        { text: "Hardcode a master password in your app that all customers share", isCorrect: false },
      ]},
    ])
  }

  // Subtopic 4.4 — Access Control and Injection Attacks
  {
    const sub = await prisma.subtopic.create({ data: { topicId: t4.id, title: 'Access Control and Injection Attacks', tag: 'tech', sortOrder: 3, description: 'RBAC, CORS, SQL injection, parameterised queries.' } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
            { type: "mcq", text: "Look at this Python code:\n\nquery = f\"SELECT * FROM users WHERE name = '{user_input}'\"\n\nWhat is the security risk?", points: 1, options: [
        { text: "It's vulnerable to SQL injection because user input is inserted directly into the query", isCorrect: true },
        { text: "It will crash because f-strings are not valid Python syntax for queries", isCorrect: false },
        { text: "It's slow because string formatting is less efficient than concatenation", isCorrect: false },
        { text: "It's safe as long as the database connection uses HTTPS encryption", isCorrect: false },
      ]},
      { type: "mcq", text: "In RBAC (Role-Based Access Control), a warehouse team member should NOT be able to edit product prices. How is this enforced?", points: 1, options: [
        { text: "The 'warehouse' role is only granted permissions for inventory actions, not pricing", isCorrect: true },
        { text: "A popup asks warehouse staff to promise they won't change prices", isCorrect: false },
        { text: "The pricing page is hidden from the navigation menu so they can't find it", isCorrect: false },
        { text: "Warehouse staff use a different browser that blocks the pricing page", isCorrect: false },
      ]},
      { type: "true_false", text: "CORS (Cross-Origin Resource Sharing) is a server-side setting that controls which external websites are allowed to make requests to your API.", points: 1, options: [
        { text: "True", isCorrect: true },
        { text: "False", isCorrect: false },
      ]},
      { type: "multi_select", text: "Which of the following practices help prevent SQL injection attacks? (Select all that apply)", points: 1, options: [
        { text: "Using parameterised queries with placeholders instead of string formatting", isCorrect: true },
        { text: "Validating and sanitising user input before it reaches the database", isCorrect: true },
        { text: "Making your database password longer and more complex", isCorrect: false },
        { text: "Using an ORM (Object-Relational Mapper) that generates queries for you", isCorrect: true },
      ]},
      { type: "mcq", text: "Your D2C website's API has no CORS restrictions. What could go wrong?", points: 1, options: [
        { text: "Any website on the internet could make requests to your API using your customers' browsers", isCorrect: true },
        { text: "Your website will load more slowly because CORS adds caching benefits", isCorrect: false },
        { text: "Search engines won't be able to index your product pages properly", isCorrect: false },
        { text: "Your API will reject all requests, even from your own frontend", isCorrect: false },
      ]},
    ])
  }

  // Subtopic 4.5 — Data Handling and Production Security
  {
    const sub = await prisma.subtopic.create({ data: { topicId: t4.id, title: 'Data Handling and Production Security', tag: 'tech', sortOrder: 4, description: 'PII rules, secure file handling, audit logs, common attack vectors, HTTPS, input validation, least privilege.' } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
            { type: "multi_select", text: "Which of the following should NEVER be pasted into a public AI chatbot or logged in plaintext? (Select all that apply)", points: 1, options: [
        { text: "Customer email addresses and phone numbers", isCorrect: true },
        { text: "Your brand's publicly listed return policy", isCorrect: false },
        { text: "Customer payment card details or billing addresses", isCorrect: true },
        { text: "A customer's order history with their name attached", isCorrect: true },
        { text: "The name of a product category on your website", isCorrect: false },
      ]},
      { type: "mcq", text: "A teammate wants to debug a production issue and copies a real customer's full profile (name, address, phone, orders) into a Slack channel. What's the problem?", points: 1, options: [
        { text: "This exposes PII to people who may not need it and creates a record in an uncontrolled channel", isCorrect: true },
        { text: "This is fine because Slack is an internal tool and all employees are trusted", isCorrect: false },
        { text: "The only issue is that Slack messages can be slow to deliver", isCorrect: false },
        { text: "This is acceptable as long as the teammate deletes the message within 24 hours", isCorrect: false },
      ]},
      { type: "mcq", text: "What does the 'principle of least privilege' mean in practice for your D2C app?", points: 1, options: [
        { text: "Each user or service should only have the minimum permissions needed for their specific task", isCorrect: true },
        { text: "Only the CEO should have admin access to all systems in the company", isCorrect: false },
        { text: "You should use the cheapest hosting plan available to reduce attack surface", isCorrect: false },
        { text: "All team members should share one login to reduce the number of access points", isCorrect: false },
      ]},
      { type: "true_false", text: "If your website uses HTTPS, you don't need to worry about validating user input on the server side because the data is encrypted in transit.", points: 1, options: [
        { text: "True", isCorrect: false },
        { text: "False", isCorrect: true },
      ]},
      { type: "mcq", text: "Why should your production application maintain audit logs of sensitive data access?", points: 1, options: [
        { text: "To track who accessed what data and when, enabling investigation of breaches or misuse", isCorrect: true },
        { text: "To speed up database queries by caching recent access patterns", isCorrect: false },
        { text: "To automatically block users who access data too frequently", isCorrect: false },
        { text: "To generate marketing reports about customer engagement trends", isCorrect: false },
      ]},
    ])
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CAPSTONE
  // ═══════════════════════════════════════════════════════════════════════════════
  const tCapstone = await prisma.topic.create({ data: { weekId: w, title: 'Week 3 Capstone', tag: 'capstone', sortOrder: 4 } })

  await prisma.subtopic.create({
    data: { topicId: tCapstone.id, title: 'Tech Foundations Capstone Project', tag: 'capstone', sortOrder: 0, description: 'Week-level capstone project.' },
  })

  await prisma.project.create({
    data: {
      weekId: w,
      title: 'Build a Secure Data Pipeline',
      briefText: `Design a system (documented, not necessarily coded) that handles a real startup data workflow end-to-end. Your submission should cover:

1. DATABASE DESIGN — Design a Supabase schema for storing customer consultation data. Include at least 3 related tables with proper foreign keys. Explain your table structure and why you chose it.

2. ANALYTICS SETUP — Define 5 Mixpanel events you would track for this product, with their properties. Build one funnel and explain what the drop-off would tell you.

3. AUTH & ACCESS MODEL — Describe who can access what data and how. Include: authentication method, role-based access (at least 2 roles), and RLS policies you would write.

4. SECURITY AUDIT — Identify at least 3 security risks in this system and explain how you would mitigate each one. Cover: data handling (PII), API security, and at least one attack vector.

Submit as a document (Google Doc, Notion, or PDF) with diagrams where helpful, plus a short Loom walkthrough (3-5 minutes) explaining your design decisions.`,
      expectedOutput: 'A design document covering database schema, analytics events, auth model, and security audit, plus a video walkthrough explaining the reasoning.',
      isPublished: true,
      isCapstone: true,
      criteria: {
        create: [
          { name: 'Database Design', description: 'Clear schema with proper relationships, constraints, and rationale', maxMarks: 25, sortOrder: 0 },
          { name: 'Analytics Setup', description: 'Well-chosen events with meaningful properties and actionable funnel', maxMarks: 20, sortOrder: 1 },
          { name: 'Auth & Access Model', description: 'Complete auth flow with RBAC and RLS policies that make sense', maxMarks: 25, sortOrder: 2 },
          { name: 'Security Audit', description: 'Real risks identified with practical mitigations, not generic advice', maxMarks: 20, sortOrder: 3 },
          { name: 'Walkthrough', description: 'Clear explanation of design decisions and tradeoffs', maxMarks: 10, sortOrder: 4 },
        ],
      },
    },
  })

  console.log('Week 3 content created.')
  await unlockWeek3ForAll(w)
  console.log('Week 3 seed complete!')
}

async function unlockWeek3ForAll(week3Id: string) {
  // Unlock Week 3 for ALL learner accounts
  const allLearners = await prisma.user.findMany({
    where: { role: 'learner' },
    select: { id: true, displayName: true },
  })

  let count = 0
  for (const user of allLearners) {
    await prisma.userWeekProgress.upsert({
      where: { userId_weekId: { userId: user.id, weekId: week3Id } },
      create: { userId: user.id, weekId: week3Id, isUnlocked: true, unlockedAt: new Date(), unlockedByAdmin: true },
      update: { isUnlocked: true, unlockedByAdmin: true },
    })
    count++
  }

  console.log(`Unlocked Week 3 for ${count} learner(s).`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
