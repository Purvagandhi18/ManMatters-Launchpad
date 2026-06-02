import * as fs from 'fs'
import * as path from 'path'
import { PrismaClient } from '@prisma/client'

// Load env files and prefer DIRECT_URL to avoid pooler timeouts during seeding
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

// Use nested creates — one DB call per question (options nested), not one per option
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
  console.log('Seeding Week 2...')

  const week2 = await prisma.week.findUnique({ where: { number: 2 } })
  if (!week2) throw new Error('Week 2 not found. Run the main seed first.')

  const existingTopics = await prisma.topic.count({ where: { weekId: week2.id } })
  if (existingTopics > 0) {
    console.log('Week 2 already has topics — running backfill only.')
    await backfillUnlocks(week2.id)
    console.log('Done.')
    return
  }

  // Update Week 2 metadata
  await prisma.week.update({
    where: { id: week2.id },
    data: {
      title: 'AI in the Wild',
      description: 'Master AI tools, prompting, spec-driven development, and the full marketing funnel.',
      badgeName: 'Wired In',
      badgeIcon: '🤖',
      isPublished: true,
    },
  })

  const w = week2.id

  // ─── Topic 1: How LLMs Actually Work ────────────────────────────────────────
  const t1 = await prisma.topic.create({ data: { weekId: w, title: 'How LLMs Actually Work', tag: 'tech', sortOrder: 0 } })

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t1.id, title: 'Tokens, context windows, and reasoning', tag: 'tech', sortOrder: 0 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A developer sends a 50-page PDF to an LLM API and gets truncated responses. The model has a 128k token context window. What is the most likely cause?', points: 1, options: [
        { text: 'The PDF contains too many images for the API to process', isCorrect: false },
        { text: 'The text extracted from the 50-page PDF exceeds the context window limit', isCorrect: true },
        { text: 'The API rate limit was exceeded on this request', isCorrect: false },
        { text: 'PDF format is not natively supported by LLM APIs', isCorrect: false },
      ]},
      { type: 'mcq', text: 'An LLM generates a response word by word. What does it actually produce at each step?', points: 1, options: [
        { text: 'A complete sentence selected from its training data', isCorrect: false },
        { text: 'A probability distribution over possible next tokens, then samples one based on that distribution', isCorrect: true },
        { text: 'A random word chosen independently from its vocabulary', isCorrect: false },
        { text: 'The exact output it was supervised to produce during training', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A user gives an LLM a 200-page document and asks about page 1. The answer is wrong. The same question on a 2-page context works perfectly. What phenomenon explains this?', points: 1, options: [
        { text: 'The model processes pages in reverse order', isCorrect: false },
        { text: 'Lost-in-the-middle: LLMs attend less reliably to content buried in the middle of very long contexts', isCorrect: true },
        { text: 'The model ran out of tokens mid-document', isCorrect: false },
        { text: 'Page 1 content was overwritten by later pages', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You ask an LLM to count the letter "r" in "strawberry" and it gets it wrong. What does this reveal about how LLMs process text?', points: 1, options: [
        { text: 'The model was not trained on spelling tasks', isCorrect: false },
        { text: 'LLMs tokenise text — "strawberry" may be one token, making character-level reasoning unreliable', isCorrect: true },
        { text: 'The model needs a larger context window for counting tasks', isCorrect: false },
        { text: 'The model requires few-shot examples to count correctly', isCorrect: false },
      ]},
      { type: 'true_false', text: 'An LLM with a larger context window can remember more of a conversation because it retains state between separate sessions by default.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — context window defines what the model sees in a single call; there is no cross-session memory by default', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t1.id, title: 'Why models hallucinate', tag: 'tech', sortOrder: 1 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You ask an LLM for a research paper citation. It returns a plausible-looking but completely fabricated DOI. What is happening?', points: 1, options: [
        { text: 'The model accessed a broken academic database', isCorrect: false },
        { text: 'The model is predicting statistically plausible text — not retrieving facts — so it generates a convincing but invented citation', isCorrect: true },
        { text: 'The paper was recently deleted from the internet', isCorrect: false },
        { text: 'This only happens with lower-tier models', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which of the following BEST explains why LLMs hallucinate?', points: 1, options: [
        { text: 'They were trained predominantly on incorrect internet data', isCorrect: false },
        { text: 'Their training objective is to produce probable next tokens, not to verify factual accuracy', isCorrect: true },
        { text: 'GPU floating-point arithmetic introduces rounding errors', isCorrect: false },
        { text: 'Hallucinations only occur when the model is overloaded with requests', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A customer-facing chatbot confidently tells a user an incorrect product price. What is the PRIMARY production risk this represents?', points: 1, options: [
        { text: 'The model needs a longer system prompt', isCorrect: false },
        { text: 'Hallucinations in customer-facing contexts erode trust and cause direct business harm — outputs must be grounded in verified data', isCorrect: true },
        { text: 'The model should be fine-tuned on pricing data', isCorrect: false },
        { text: 'The system prompt was conflicting with user input', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which approach MOST effectively reduces hallucinations for factual queries in production?', points: 1, options: [
        { text: 'Increasing the temperature setting to reduce repetition', isCorrect: false },
        { text: 'Grounding responses in retrieved, verified documents (RAG) rather than relying solely on training data', isCorrect: true },
        { text: 'Switching to the largest available model', isCorrect: false },
        { text: 'Adding "be accurate and do not hallucinate" to the system prompt', isCorrect: false },
      ]},
      { type: 'true_false', text: 'An LLM that says "I am confident this is correct" is more likely to be accurate than one that expresses uncertainty.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — confidence expressions in LLMs are not reliable indicators of factual accuracy; the model can be confidently wrong', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t1.id, title: 'The model landscape: Claude, GPT, and Gemini', tag: 'tech', sortOrder: 2 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You need to process 1,000-page legal contracts and extract specific clauses. Which model capability matters most for this task?', points: 1, options: [
        { text: 'Fastest tokens-per-second response speed', isCorrect: false },
        { text: 'Long context window — the ability to hold the entire document in a single prompt', isCorrect: true },
        { text: 'Multimodal image understanding', isCorrect: false },
        { text: 'Native fine-tuning support', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A product team picks Claude for their coding assistant over GPT-4o. What is the most rational basis for this decision?', points: 1, options: [
        { text: 'Claude always scores highest on coding benchmarks', isCorrect: false },
        { text: 'They tested all three on their specific coding tasks, evaluated output quality, and Claude performed best for their use case', isCorrect: true },
        { text: 'Claude is consistently the cheapest frontier model', isCorrect: false },
        { text: 'The model with the biggest context window is always best for coding', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A startup is building a product that needs both vision (reading screenshots) and text reasoning. What should guide model selection?', points: 1, options: [
        { text: 'Always pick whichever model costs least per token', isCorrect: false },
        { text: 'Choose a model with strong multimodal capabilities and evaluate accuracy on your specific task, not benchmarks alone', isCorrect: true },
        { text: 'All frontier models support vision equally well', isCorrect: false },
        { text: 'Use fine-tuning instead of a frontier model for vision tasks', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Gemini 1.5 Pro is notably strong at which capability compared to earlier frontier models?', points: 1, options: [
        { text: 'Lowest cost per token across all use cases', isCorrect: false },
        { text: 'Very long context — handling millions of tokens including video, audio, and documents in a single prompt', isCorrect: true },
        { text: 'Superior performance on short creative writing tasks', isCorrect: false },
        { text: 'Fastest response times for real-time applications', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Model benchmarks like MMLU or HumanEval scores guarantee that the highest-scoring model will perform best on your specific production use case.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — benchmarks measure general capability; real-world performance depends on your specific task, prompts, and evaluation criteria', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t1.id, title: 'Prompting vs RAG vs fine-tuning', tag: 'tech', sortOrder: 3 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A company wants their LLM to answer questions about 500 pages of internal product documentation updated weekly. Which approach is most practical?', points: 1, options: [
        { text: 'Fine-tune the model on the documentation each week', isCorrect: false },
        { text: 'RAG — retrieve relevant documentation chunks at query time and include them in the prompt', isCorrect: true },
        { text: 'Write a very long system prompt containing all 500 pages', isCorrect: false },
        { text: 'Use better zero-shot prompting techniques', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Fine-tuning is best described as:', points: 1, options: [
        { text: 'Adding reference documents to the model\'s context window at inference time', isCorrect: false },
        { text: 'Updating the model\'s weights on domain-specific examples to change its behaviour or style', isCorrect: true },
        { text: 'Writing a detailed system prompt with many examples', isCorrect: false },
        { text: 'Searching a vector database and injecting results into the prompt', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A customer support bot answers correctly 70% of the time using zero-shot prompting. When should the team consider fine-tuning?', points: 1, options: [
        { text: 'Immediately — fine-tuning always improves performance', isCorrect: false },
        { text: 'After first trying few-shot examples, better prompts, and RAG — fine-tuning is expensive and requires labelled data', isCorrect: true },
        { text: 'Never — fine-tuning is only for ML researchers', isCorrect: false },
        { text: 'Only if they have more than 10 million training examples', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A RAG system gives wrong answers when the relevant document is missing from the knowledge base. What does this reveal about RAG\'s limitation?', points: 1, options: [
        { text: 'RAG is broken and should be replaced with fine-tuning', isCorrect: false },
        { text: 'RAG can only answer questions where the answer exists in the retrieved documents — it cannot generate knowledge that isn\'t there', isCorrect: true },
        { text: 'The vector search model needs more training data', isCorrect: false },
        { text: 'The LLM does not support RAG for this domain', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Prompt engineering is always sufficient for production use cases — RAG and fine-tuning are only needed in extreme edge cases.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — prompt engineering has real limits (context size, stale knowledge, consistency) that RAG and fine-tuning specifically address', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t1.id, title: 'What embeddings are and why they matter', tag: 'tech', sortOrder: 4 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'Which task are embeddings MOST naturally suited for?', points: 1, options: [
        { text: 'Generating new text based on a prompt', isCorrect: false },
        { text: 'Finding semantically similar items — documents, products, or queries — in a large collection', isCorrect: true },
        { text: 'Converting speech to text', isCorrect: false },
        { text: 'Classifying images into predefined categories', isCorrect: false },
      ]},
      { type: 'mcq', text: 'In a RAG system, why are user queries also converted to embeddings?', points: 1, options: [
        { text: 'To compress the query before sending it to the LLM', isCorrect: false },
        { text: 'So the query can be compared numerically to document embeddings using vector similarity, finding semantically relevant documents', isCorrect: true },
        { text: 'To encrypt the query before transmission', isCorrect: false },
        { text: 'Because LLMs require vector inputs rather than text', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A semantic search system returns irrelevant results when users search for "how to cancel my subscription" but a keyword search finds the right help article. What does this indicate?', points: 1, options: [
        { text: 'Embeddings are always worse than keyword search for support queries', isCorrect: false },
        { text: 'The embedding model may not be well-calibrated for this domain, or the document\'s meaning isn\'t well-represented in the embedding space', isCorrect: true },
        { text: 'The context window was exceeded during embedding', isCorrect: false },
        { text: 'Semantic search only works reliably in English', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You embed "The dog chased the cat" and "The cat chased the dog." What do you expect about their cosine similarity?', points: 1, options: [
        { text: 'Zero similarity — word order completely changes the embedding', isCorrect: false },
        { text: 'High similarity since they share most words, though a strong semantic model may score them slightly lower due to inverted meaning', isCorrect: true },
        { text: 'Identical embeddings — they contain exactly the same words', isCorrect: false },
        { text: 'Embeddings cannot represent sentences, only single words', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Two sentences can have a high cosine similarity score even if they share no common words, as long as they express a similar meaning.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // ─── Topic 2: Writing Prompts That Work ─────────────────────────────────────
  const t2 = await prisma.topic.create({ data: { weekId: w, title: 'Writing Prompts That Work', tag: 'tech', sortOrder: 1 } })

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t2.id, title: 'Anatomy of a strong prompt', tag: 'tech', sortOrder: 0 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You ask Claude "Summarise this." The output is too long, uses technical language, and includes irrelevant sections. Which prompt component was most clearly missing?', points: 1, options: [
        { text: 'A role definition for Claude to adopt', isCorrect: false },
        { text: 'Output format and constraints — the prompt didn\'t specify length, audience, or what to exclude', isCorrect: true },
        { text: 'A few-shot example of a good summary', isCorrect: false },
        { text: 'A chain-of-thought instruction', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A developer adds this to their prompt: "You are a senior product manager with 10 years at a top-tier startup." What is the PRIMARY function of this?', points: 1, options: [
        { text: 'It causes the model to verify its own credentials before responding', isCorrect: false },
        { text: 'It sets the model\'s persona, influencing tone, vocabulary, and the level of expertise assumed in the response', isCorrect: true },
        { text: 'It grants the model access to product management databases', isCorrect: false },
        { text: 'It forces the model to respond only to product-related questions', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You prompt: "Given these customer reviews, identify the top 3 issues. Format your response as a numbered list where each item is: [Issue]: [one-sentence explanation]." Which component is this strongest at?', points: 1, options: [
        { text: 'Providing relevant background context', isCorrect: false },
        { text: 'Specifying output format — it tells the model exactly how to structure the response', isCorrect: true },
        { text: 'Defining a role for the model', isCorrect: false },
        { text: 'Chain of thought reasoning instruction', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A prompt works perfectly for one team. Another team copies it and gets poor results, even after adding more context. What is most likely wrong?', points: 1, options: [
        { text: 'Prompts are not reusable across different teams or organisations', isCorrect: false },
        { text: 'The instruction was specific to the first team\'s task — reusing it without updating the instruction for the new task causes misalignment', isCorrect: true },
        { text: 'Adding more context always degrades prompt performance', isCorrect: false },
        { text: 'The model version changed between teams', isCorrect: false },
      ]},
      { type: 'true_false', text: 'A well-written prompt should be as short as possible — every additional word reduces model performance.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — clarity and completeness matter more than brevity; a well-structured longer prompt typically outperforms a vague short one', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t2.id, title: 'Structured output and JSON', tag: 'tech', sortOrder: 1 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A developer asks an LLM to extract product data as JSON. The model sometimes adds explanatory text before the JSON, breaking their parser. What is the most robust fix?', points: 1, options: [
        { text: 'Ask the model more politely and hope for consistency', isCorrect: false },
        { text: 'Use a model that supports enforced JSON mode / structured outputs, which guarantees valid parseable JSON without surrounding text', isCorrect: true },
        { text: 'Parse the JSON manually from anywhere in the response using regex', isCorrect: false },
        { text: 'Switch to CSV output format instead', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You ask an LLM to return {"score": 7, "label": "positive"}. The "score" field comes back as "7" (a string). What\'s the fix?', points: 1, options: [
        { text: 'The model made an arithmetic error that needs correcting', isCorrect: false },
        { text: 'Explicitly specify the data type in the prompt or use a JSON schema — "score as an integer, not a string"', isCorrect: true },
        { text: 'JSON doesn\'t support integers in all implementations', isCorrect: false },
        { text: 'The response was truncated before type conversion', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Why is structured JSON output preferable to prose when an LLM response feeds into application code?', points: 1, options: [
        { text: 'JSON is more readable to human developers reviewing the output', isCorrect: false },
        { text: 'JSON provides a predictable, machine-parseable format — prose requires fragile string parsing that breaks whenever phrasing changes', isCorrect: true },
        { text: 'LLMs produce higher quality content when asked for JSON', isCorrect: false },
        { text: 'JSON responses are always shorter and cheaper to generate', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A team asks an LLM to classify support tickets into 5 categories. Occasionally the model invents a 6th category. What is the cleanest fix?', points: 1, options: [
        { text: 'Post-process responses to catch unknown categories after the fact', isCorrect: false },
        { text: 'Use an enum constraint in the JSON schema — restrict the "category" field to only the 5 valid values', isCorrect: true },
        { text: 'Instruct the model not to make up categories in the system prompt', isCorrect: false },
        { text: 'Use a smaller, more constrained model', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Asking for JSON output in a prompt guarantees valid, parseable JSON in the response regardless of model or API settings.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — without enforced JSON mode, the model may include preamble, trailing text, or invalid syntax; proper JSON mode is required for reliable output', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t2.id, title: 'Few-shot prompting', tag: 'tech', sortOrder: 2 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You\'re classifying customer feedback as "Bug", "Feature Request", or "Compliment." Zero-shot gives inconsistent results. You add 2 labelled examples of each class to the prompt. This technique is called:', points: 1, options: [
        { text: 'Fine-tuning', isCorrect: false },
        { text: 'Few-shot prompting — providing labelled examples in the prompt to guide the model\'s output', isCorrect: true },
        { text: 'Retrieval-augmented generation (RAG)', isCorrect: false },
        { text: 'Chain of thought prompting', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A few-shot prompt includes 3 examples that all have short, one-sentence answers. The model gives short answers even when the task requires detail. What does this illustrate?', points: 1, options: [
        { text: 'Few-shot prompting always reduces output quality', isCorrect: false },
        { text: 'Models learn implicit patterns from examples — unintended patterns like output length are picked up alongside the intended ones', isCorrect: true },
        { text: 'Three examples is always too few', isCorrect: false },
        { text: 'The model ignored the examples and defaulted to its training', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which scenario is few-shot prompting MOST useful for?', points: 1, options: [
        { text: 'Teaching the model new factual information it was not trained on', isCorrect: false },
        { text: 'Showing the model the specific format, style, or reasoning pattern you want, especially where instructions alone are ambiguous', isCorrect: true },
        { text: 'Reducing API costs by shortening prompts', isCorrect: false },
        { text: 'Replacing fine-tuning in all scenarios', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You have 50 labelled examples for a classification task and put all 50 in the prompt. What is the PRIMARY risk?', points: 1, options: [
        { text: '50 examples is too few for few-shot to work properly', isCorrect: false },
        { text: 'Exceeding the context window or degrading performance — very long few-shot sections can hurt reliability; consider fine-tuning for large labelled datasets', isCorrect: true },
        { text: 'The model will memorise all 50 examples perfectly and overfit', isCorrect: false },
        { text: 'The API will reject prompts that contain examples', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Few-shot examples must be perfect gold-standard cases — using noisy or borderline examples will always hurt performance more than using no examples at all.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — representative examples, even imperfect ones, often help; extreme outliers or mislabelled examples mislead the model, but noise alone is not always harmful', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t2.id, title: 'Chain of thought prompting', tag: 'tech', sortOrder: 3 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You ask an LLM a multi-step maths problem and it gets it wrong. You add "Let\'s think through this step by step." The model now gets it right. Why?', points: 1, options: [
        { text: 'The phrase triggers a special computation mode in the model', isCorrect: false },
        { text: 'Prompting the model to reason step by step forces intermediate tokens that guide it toward correct final answers — the working is the mechanism', isCorrect: true },
        { text: 'The model was confused by the original question format', isCorrect: false },
        { text: 'The model re-reads its training data when prompted to reason', isCorrect: false },
      ]},
      { type: 'mcq', text: 'When is chain of thought prompting MOST valuable?', points: 1, options: [
        { text: 'For simple factual lookups like "What is the capital of France?"', isCorrect: false },
        { text: 'For tasks requiring multi-step reasoning, logical deduction, or arithmetic — where intermediate steps reduce errors', isCorrect: true },
        { text: 'For generating short creative writing or poetry', isCorrect: false },
        { text: 'For producing shorter, more concise responses', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You use chain of thought but the model\'s intermediate reasoning steps are correct while the final answer is wrong. What does this most likely indicate?', points: 1, options: [
        { text: 'Chain of thought does not work for this category of task', isCorrect: false },
        { text: 'The model made an error in the final synthesis step — the conclusion doesn\'t properly follow from the stated reasoning', isCorrect: true },
        { text: 'The prompt is too long for the context window', isCorrect: false },
        { text: 'You need to add few-shot examples alongside chain of thought', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A product team wants the LLM to reason through recommendations, but they don\'t want the reasoning visible to end users. Which approach handles this?', points: 1, options: [
        { text: 'Disable chain of thought entirely for this use case', isCorrect: false },
        { text: 'Use extended thinking or a scratchpad approach — the model reasons internally, then surfaces only the conclusion in the final response', isCorrect: true },
        { text: 'Instruct the model to think faster to reduce visible output', isCorrect: false },
        { text: 'Use a smaller, faster model that skips reasoning', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Chain of thought prompting always reduces response output token count since the model focuses only on the relevant reasoning path.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — chain of thought increases token count by producing explicit intermediate steps; this trades higher latency and cost for improved accuracy on complex tasks', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t2.id, title: 'What breaks a prompt', tag: 'tech', sortOrder: 4 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A prompt says: "Write a formal technical report. Be conversational and friendly." What problem does this illustrate?', points: 1, options: [
        { text: 'The prompt is too long and should be shortened', isCorrect: false },
        { text: 'Conflicting instructions — the model cannot be simultaneously formal/technical AND conversational/friendly', isCorrect: true },
        { text: 'Critical context is missing from the prompt', isCorrect: false },
        { text: 'No output format was specified', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A developer writes: "Do the analysis." With no context about the data, the use case, or the format. The LLM produces a generic useless response. What is the PRIMARY missing element?', points: 1, options: [
        { text: 'Few-shot examples of a good analysis', isCorrect: false },
        { text: 'Context — the prompt provides no information about what to analyse, for what purpose, or what a good result looks like', isCorrect: true },
        { text: 'A specific output format specification', isCorrect: false },
        { text: 'A role definition for the model', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You write a 1,000-word prompt with precise instructions, but the model ignores most of them and focuses on the last paragraph. What common issue does this demonstrate?', points: 1, options: [
        { text: 'The model cannot process prompts longer than a certain word count', isCorrect: false },
        { text: 'Recency bias — models tend to weight later context more heavily; critical instructions buried mid-prompt are often underweighted', isCorrect: true },
        { text: 'The model needs more few-shot examples to follow long instructions', isCorrect: false },
        { text: 'The system prompt is overriding the user-turn instructions', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A prompt says "Extract all 50 customer complaints. Be thorough. Keep it brief." The model returns 10. What likely caused this?', points: 1, options: [
        { text: 'The model cannot count items beyond a certain threshold', isCorrect: false },
        { text: 'Conflicting instructions — "be thorough" (return all) and "keep it brief" (return few) directly contradict each other', isCorrect: true },
        { text: 'The context window was exceeded during extraction', isCorrect: false },
        { text: 'The model needs few-shot examples showing complete extraction', isCorrect: false },
      ]},
      { type: 'true_false', text: 'If an LLM produces a poor response, the most effective fix is always to make the prompt longer and add more detail.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — adding detail helps when context is missing, but over-specifying or adding conflicting instructions can make outputs worse', isCorrect: true },
      ]},
    ])
  }

  // ─── Topic 3: Spec-Driven Development ───────────────────────────────────────
  const t3 = await prisma.topic.create({ data: { weekId: w, title: 'Spec-Driven Development', tag: 'tech', sortOrder: 2 } })

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t3.id, title: 'What a spec is and why it changes everything', tag: 'tech', sortOrder: 0 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A developer asks Claude to "build a login page." Claude misses key requirements. A colleague writes a 2-page spec and Claude produces exactly what was needed. What changed?', points: 1, options: [
        { text: 'The colleague used a newer version of Claude', isCorrect: false },
        { text: 'The spec gave Claude concrete inputs, outputs, and constraints — removing ambiguity that forces the model to guess', isCorrect: true },
        { text: 'The colleague used a different prompt template format', isCorrect: false },
        { text: 'The API call was made with a higher timeout', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Why does writing a spec "change everything" compared to a vague requirement?', points: 1, options: [
        { text: 'Specs are longer and longer prompts always work better', isCorrect: false },
        { text: 'A spec forces you to think through what you actually want before prompting, surfacing hidden assumptions and gaps that would otherwise cause failed iterations', isCorrect: true },
        { text: 'Specs give the AI access to more of its training data', isCorrect: false },
        { text: 'Specs allow the AI to write code without any human review', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What distinguishes a spec from a user story ("As a user, I want to...")?', points: 1, options: [
        { text: 'User stories are superior in every practical way', isCorrect: false },
        { text: 'A spec includes explicit inputs, outputs, logic, edge cases, and constraints — user stories capture intent but leave implementation details undefined', isCorrect: true },
        { text: 'Specs are only appropriate for large enterprise engineering teams', isCorrect: false },
        { text: 'User stories are simply specs written in a different format', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A PM says "I\'ll describe what I want as we go." A developer with spec experience pushes back. Why?', points: 1, options: [
        { text: 'Iterative refinement never works with AI tools', isCorrect: false },
        { text: 'Without a spec, every iteration starts from ambiguous requirements — unresolved edge cases and conflicting assumptions compound over time', isCorrect: true },
        { text: 'The PM will inevitably change their mind mid-project', isCorrect: false },
        { text: 'AI tools can only follow formal specs, not conversational descriptions', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Writing a spec before prompting an AI tool is only useful for complex multi-week projects — for small tasks it adds unnecessary overhead.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — even small tasks benefit from clarity on inputs, outputs, and constraints; the overhead of a brief spec is far less than the cost of failed AI output cycles', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t3.id, title: 'The five parts of a spec', tag: 'tech', sortOrder: 1 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A spec for a "customer segmentation feature" lists inputs and outputs but no edge cases. The AI-generated code breaks when a customer has zero purchase history. Which spec part would have caught this?', points: 1, options: [
        { text: 'Constraints — a constraint about data completeness was missing', isCorrect: false },
        { text: 'Edge cases — the spec should have specified how to handle customers with no data', isCorrect: true },
        { text: 'Better-defined inputs', isCorrect: false },
        { text: 'A clearer output format', isCorrect: false },
      ]},
      { type: 'mcq', text: 'The "logic" section of a spec serves what purpose?', points: 1, options: [
        { text: 'It describes what the feature looks like visually to users', isCorrect: false },
        { text: 'It specifies the rules, transformations, and decision trees that turn inputs into outputs — the core of what the system must do', isCorrect: true },
        { text: 'It lists the third-party tools and APIs the implementation should use', isCorrect: false },
        { text: 'It defines which users and roles can access the feature', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A spec has excellent inputs, outputs, and logic but no constraints section. What is most likely to go wrong in implementation?', points: 1, options: [
        { text: 'The AI will refuse to implement the feature without constraints', isCorrect: false },
        { text: 'Implementation choices will violate non-functional requirements — performance, security, or data retention rules — because they weren\'t specified', isCorrect: true },
        { text: 'The output format will be structured incorrectly', isCorrect: false },
        { text: 'Edge cases won\'t be handled correctly', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You write: "Input: a CSV of orders. Output: a PDF report." Which of the remaining spec parts is most critical to add next?', points: 1, options: [
        { text: 'Constraints — performance limits must come before logic', isCorrect: false },
        { text: 'Logic — without specifying which metrics to compute and how to aggregate data, the AI has no basis for the core calculation', isCorrect: true },
        { text: 'Edge cases — unusual data must be handled before logic', isCorrect: false },
        { text: 'A different output format', isCorrect: false },
      ]},
      { type: 'true_false', text: 'A spec\'s edge cases section is optional for features that handle "normal" data and can be added later if bugs emerge in production.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — edge cases represent the exact scenarios most likely to cause production failures; deferring them means shipping untested paths', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t3.id, title: 'Writing a spec an AI can execute', tag: 'tech', sortOrder: 2 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'Which spec instruction is most executable by an AI tool?', points: 1, options: [
        { text: '"Make the checkout flow better"', isCorrect: false },
        { text: '"When a user submits an order, validate that: (1) all items are in stock, (2) the delivery pincode is serviceable. If either fails, return a JSON error with code and reason."', isCorrect: true },
        { text: '"Build a good checkout experience"', isCorrect: false },
        { text: '"Improve the UX of the order flow"', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A spec says "Handle errors gracefully." Why is this hard for an AI to execute?', points: 1, options: [
        { text: 'AI tools cannot implement error handling', isCorrect: false },
        { text: '"Gracefully" is undefined — the spec needs to specify exactly what happens on each error: what to return, what to log, what to show users', isCorrect: true },
        { text: 'The spec instruction is too short', isCorrect: false },
        { text: 'Error handling should always be specified separately from the main spec', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You\'re speccing a search feature for Claude to implement. Which addition makes it most executable?', points: 1, options: [
        { text: '"Search should be fast and return relevant results"', isCorrect: false },
        { text: '"Given a query string, return the top 5 matching in-stock products sorted by relevance score descending. If no results, return an empty array."', isCorrect: true },
        { text: '"Use best practices for search implementation"', isCorrect: false },
        { text: '"Implement search similar to how Google does it"', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A spec is well-written but the AI\'s output is still wrong. What should you do FIRST?', points: 1, options: [
        { text: 'Rewrite the entire spec from scratch', isCorrect: false },
        { text: 'Isolate the failure — check whether the AI\'s output fails on a specific edge case or constraint before changing the spec broadly', isCorrect: true },
        { text: 'Switch to a different AI tool', isCorrect: false },
        { text: 'Add more constraints to every part of the spec', isCorrect: false },
      ]},
      { type: 'true_false', text: 'A spec written for a human developer can be used as-is for an AI tool with no modification.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — human developers infer context and fill in gaps; AI tools execute literally, so ambiguities that humans resolve through judgment become errors', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t3.id, title: 'Iterating when output is wrong', tag: 'tech', sortOrder: 3 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'Claude writes code based on your spec. The output is almost right but fails on one edge case. What is the most efficient next step?', points: 1, options: [
        { text: 'Start a fresh conversation with a completely rewritten spec', isCorrect: false },
        { text: 'Add the failing edge case to the spec and re-prompt, showing Claude the specific failure', isCorrect: true },
        { text: 'Switch to a different AI model', isCorrect: false },
        { text: 'Accept the output and fix the edge case manually in the code', isCorrect: false },
      ]},
      { type: 'mcq', text: 'AI output consistently misses a requirement you stated clearly. What is the most likely cause?', points: 1, options: [
        { text: 'The AI is deliberately ignoring your instructions', isCorrect: false },
        { text: 'The requirement may be correctly stated but positioned where the model underweights it — move it, emphasise it, or make it a hard constraint', isCorrect: true },
        { text: 'The requirement is fundamentally too complex for AI to implement', isCorrect: false },
        { text: 'The model needs fine-tuning on your specific domain', isCorrect: false },
      ]},
      { type: 'mcq', text: 'After 5 iterations the AI output still isn\'t right. What does this most likely signal?', points: 1, options: [
        { text: 'The AI fundamentally cannot do this type of task', isCorrect: false },
        { text: 'Likely a spec problem — spending time clarifying inputs, outputs, logic, and edge cases will be more effective than re-prompting with the same ambiguous instructions', isCorrect: true },
        { text: 'You need to upgrade to a more powerful model', isCorrect: false },
        { text: 'The problem requires a human-only solution', isCorrect: false },
      ]},
      { type: 'mcq', text: '"The AI gave me wrong output so I manually fixed it and moved on." What risk does this create?', points: 1, options: [
        { text: 'No risk — this is the most efficient workflow', isCorrect: false },
        { text: 'The spec gap that caused the error remains unfixed — the same error will recur when the component is regenerated or modified', isCorrect: true },
        { text: 'It creates a merge conflict in version control', isCorrect: false },
        { text: 'The AI learns the wrong behaviour from this correction', isCorrect: false },
      ]},
      { type: 'true_false', text: 'If you add more detail to a prompt and the output gets worse, you have likely introduced a conflicting instruction or over-constrained the task.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // ─── Topic 4: Building with AI Tools ────────────────────────────────────────
  const t4 = await prisma.topic.create({ data: { weekId: w, title: 'Building with AI Tools: Cursor and Claude', tag: 'tech', sortOrder: 3 } })

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t4.id, title: 'Claude Projects and persistent context', tag: 'tech', sortOrder: 0 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You start a new conversation with Claude each time you work on your project. After 20 sessions, Claude keeps asking basic questions about your codebase. What feature would prevent this?', points: 1, options: [
        { text: 'Claude does not support any form of persistent memory', isCorrect: false },
        { text: 'Claude Projects — a persistent context layer where you store project files and instructions that persist across every conversation', isCorrect: true },
        { text: 'Writing much longer individual prompts', isCorrect: false },
        { text: 'Fine-tuning Claude on your codebase', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What should you include in a Claude Project\'s context to maximise usefulness for a development project?', points: 1, options: [
        { text: 'A detailed personal biography and work history', isCorrect: false },
        { text: 'Architecture decisions, tech stack, coding conventions, what the project does, and constraints Claude should always respect', isCorrect: true },
        { text: 'The complete git commit history', isCorrect: false },
        { text: 'Marketing copy and brand guidelines', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You\'re using a Claude Project and accidentally upload the wrong version of a file. What happens to Claude\'s outputs?', points: 1, options: [
        { text: 'Claude detects the version mismatch and uses the correct version automatically', isCorrect: false },
        { text: 'Claude reasons based on what\'s in context — wrong files lead to wrong outputs; context accuracy is the developer\'s responsibility', isCorrect: true },
        { text: 'Claude ignores uploaded files and uses only its training knowledge', isCorrect: false },
        { text: 'The project automatically syncs with your repository to correct the error', isCorrect: false },
      ]},
      { type: 'mcq', text: 'How does Claude\'s persistent project context differ from a long system prompt in a single API call?', points: 1, options: [
        { text: 'They are functionally identical — both are sent on every request', isCorrect: false },
        { text: 'Project context persists across sessions without needing to be re-sent each time — it\'s attached to the project, not the individual conversation', isCorrect: true },
        { text: 'A system prompt is always more powerful and takes precedence', isCorrect: false },
        { text: 'Project context has a smaller token limit than a system prompt', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Claude Projects eliminate the need to ever re-explain your project — once added, all context is perfectly retained and updated automatically as your codebase changes.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — you must manually update project files when your codebase changes; Claude does not automatically sync with your repository', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t4.id, title: 'What Claude is great at vs where to be careful', tag: 'tech', sortOrder: 1 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'Claude writes a complete authentication module. The code looks clean on visual review. You still run your test suite. Why?', points: 1, options: [
        { text: 'Claude\'s code is always correct so tests are just formality', isCorrect: false },
        { text: 'AI-generated code can pass visual review but contain subtle logic errors, edge case bugs, or security issues that only tests or runtime behaviour exposes', isCorrect: true },
        { text: 'Tests are optional for UI components but required for backend code', isCorrect: false },
        { text: 'You need to regenerate the code after testing', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which task should you be MOST cautious delegating entirely to Claude without thorough review?', points: 1, options: [
        { text: 'Generating boilerplate code for a CRUD endpoint', isCorrect: false },
        { text: 'Implementing payment processing or authentication flows — high-security code where bugs have direct business consequences', isCorrect: true },
        { text: 'Writing unit test scaffolding', isCorrect: false },
        { text: 'Converting a JSON schema to TypeScript type definitions', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which pairing best describes "Claude is great at X, not Y"?', points: 1, options: [
        { text: 'Great at knowing your full codebase end-to-end; poor at general language and writing tasks', isCorrect: false },
        { text: 'Great at drafting code, explaining concepts, and restructuring existing code; less reliable for factual correctness on niche domains and long-horizon reasoning', isCorrect: true },
        { text: 'Great at real-time data retrieval from the internet; poor at code generation', isCorrect: false },
        { text: 'Great at replacing all human judgment; poor at only basic formatting tasks', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You ask Claude to optimise a database query. It produces a solution that looks faster but subtly changes the query semantics, returning different rows. What does this illustrate?', points: 1, options: [
        { text: 'Claude is fundamentally unsuitable for any database work', isCorrect: false },
        { text: 'AI can optimise for surface metrics like apparent efficiency while missing semantic correctness — all optimised code must be validated against expected behaviour', isCorrect: true },
        { text: 'You should use a different, more specialised model for database tasks', isCorrect: false },
        { text: 'The prompt was too vague and needs more detail', isCorrect: false },
      ]},
      { type: 'true_false', text: 'If Claude expresses high confidence in a code solution, it means the solution has been verified and is correct.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — Claude\'s confidence expressions reflect statistical patterns in training, not actual verification; all AI-generated code should be tested', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t4.id, title: 'What Cursor is and why it is different', tag: 'tech', sortOrder: 2 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A developer says Cursor is different from using Claude in the browser. What is the most accurate explanation?', points: 1, options: [
        { text: 'Cursor uses a fundamentally different underlying model', isCorrect: false },
        { text: 'Cursor integrates AI directly into the editor with access to your full codebase, file tree, and history — enabling context-aware multi-file edits', isCorrect: true },
        { text: 'Cursor generates text faster than Claude in the browser', isCorrect: false },
        { text: 'Cursor works fully offline without an internet connection', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Cursor\'s inline edit feature (Cmd+K / Ctrl+K) is used to:', points: 1, options: [
        { text: 'Open a separate Claude chat window in a new tab', isCorrect: false },
        { text: 'Make targeted AI-powered edits to a specific section of code without leaving the editor', isCorrect: true },
        { text: 'Run terminal commands from within the editor', isCorrect: false },
        { text: 'Push the current file to GitHub', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Why is Cursor\'s codebase indexing significant for large projects?', points: 1, options: [
        { text: 'It automatically deploys your code to production', isCorrect: false },
        { text: 'It allows AI to understand file relationships and symbols across the project, making suggestions more context-aware than a single-file paste into chat', isCorrect: true },
        { text: 'It replaces the need for version control like Git', isCorrect: false },
        { text: 'It runs your test suite automatically on each save', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A developer uses Cursor\'s @codebase feature. What does this allow them to do?', points: 1, options: [
        { text: 'Search npm for relevant packages', isCorrect: false },
        { text: 'Reference and query specific files, symbols, or the entire indexed codebase directly within a Cursor prompt', isCorrect: true },
        { text: 'Automatically deploy changes to a staging environment', isCorrect: false },
        { text: 'Share the current session with a teammate in real time', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Cursor replaces the need for a developer to understand their code — because AI understands the full codebase, the developer just needs to describe what they want.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — the developer must understand the code to review, validate, and take responsibility for AI-generated changes; lacking understanding leads to merging broken or insecure code', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t4.id, title: 'Reviewing AI-written code', tag: 'tech', sortOrder: 3 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'Claude generates a React component. You review it visually and it looks clean. What should you do before merging?', points: 1, options: [
        { text: 'Merge it — visual review is sufficient for UI components', isCorrect: false },
        { text: 'Run it, test edge cases, and check that it handles loading, error states, empty data, and unexpected inputs correctly', isCorrect: true },
        { text: 'Ask Claude to review its own code for errors', isCorrect: false },
        { text: 'Check only that the file compiles without TypeScript errors', isCorrect: false },
      ]},
      { type: 'mcq', text: 'When reviewing AI-written code, what is the most important question to ask about each function?', points: 1, options: [
        { text: '"Is the variable naming consistent with our style guide?"', isCorrect: false },
        { text: '"Does this do what I intended, or only what I said?" — AI executes instructions literally; your intent and your words may not have matched', isCorrect: true },
        { text: '"Did the AI add sufficient inline comments?"', isCorrect: false },
        { text: '"Is this the most performant possible implementation?"', isCorrect: false },
      ]},
      { type: 'mcq', text: 'AI-generated code most commonly omits which of the following?', points: 1, options: [
        { text: 'Variable declarations and basic structure', isCorrect: false },
        { text: 'Edge case handling — what happens when input is null, empty, out of range, or malformed', isCorrect: true },
        { text: 'Return statements from functions', isCorrect: false },
        { text: 'Import statements for standard libraries', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You review AI code and find it uses a library you\'ve never seen before. What should you do?', points: 1, options: [
        { text: 'Trust the AI — it chose the best available library', isCorrect: false },
        { text: 'Research the library: is it maintained, widely used, does it have security issues, does it fit your stack?', isCorrect: true },
        { text: 'Replace it immediately with code you write from scratch', isCorrect: false },
        { text: 'Run it in production and see if any issues arise', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Once AI-written code passes all unit tests, it can be considered fully reviewed and safe to merge into production.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — tests verify covered cases but don\'t catch security vulnerabilities, performance issues, incorrect abstractions, or edge cases no test was written for', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t4.id, title: 'Agentic tasks in Claude Code', tag: 'tech', sortOrder: 4 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'What distinguishes Claude Code from using Claude in a web browser for coding tasks?', points: 1, options: [
        { text: 'Claude Code uses a fundamentally different underlying model', isCorrect: false },
        { text: 'Claude Code is a CLI agent that can directly read files, run terminal commands, and edit code across your actual codebase without copy-pasting', isCorrect: true },
        { text: 'Claude Code generates text significantly faster', isCorrect: false },
        { text: 'Claude Code works fully offline', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Claude Code completes a multi-step task but your tests fail afterwards. What is the appropriate response?', points: 1, options: [
        { text: 'Trust Claude Code — test failures after agentic tasks are normal and can be ignored', isCorrect: false },
        { text: 'Review Claude Code\'s changes carefully: which files were modified, what was the logic change, is the failure exposing a real bug?', isCorrect: true },
        { text: 'Revert all changes immediately without reviewing any of them', isCorrect: false },
        { text: 'Ask Claude Code to fix the failing tests rather than the underlying code', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which type of task is Claude Code MOST suited for?', points: 1, options: [
        { text: 'Designing your overall system architecture from scratch', isCorrect: false },
        { text: 'Executing well-defined, bounded tasks with clear success criteria — like running migrations, reformatting files, or adding a documented feature', isCorrect: true },
        { text: 'Replacing your entire development process end-to-end', isCorrect: false },
        { text: 'Making strategic product and business decisions', isCorrect: false },
      ]},
      { type: 'mcq', text: '"AI writes the draft, you own the output." Why does this matter especially for agentic tools like Claude Code?', points: 1, options: [
        { text: 'Because Claude Code is fundamentally unreliable', isCorrect: false },
        { text: 'Agentic tools make real changes directly to your codebase — developers must understand and take responsibility for every change, not just approve quickly', isCorrect: true },
        { text: 'Because agentic tools charge significantly more per token', isCorrect: false },
        { text: 'Because Claude Code requires manual approval before modifying any file', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Claude Code\'s ability to run commands and edit files means it can autonomously complete any software development task without human review.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — agentic AI makes real, sometimes irreversible changes; human review remains essential, especially for tasks touching production systems or sensitive data', isCorrect: true },
      ]},
    ])
  }

  // ─── Topic 5: Memory and Context in AI Systems ───────────────────────────────
  const t5 = await prisma.topic.create({ data: { weekId: w, title: 'Memory and Context in AI Systems', tag: 'tech', sortOrder: 4 } })

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t5.id, title: 'Why LLMs have no memory by default', tag: 'tech', sortOrder: 0 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You have a 10-message conversation with an LLM and it gives excellent advice. You start a new conversation an hour later and ask a follow-up. The model has no idea what you\'re referring to. Why?', points: 1, options: [
        { text: 'The model\'s memory was cleared by the platform after one hour', isCorrect: false },
        { text: 'LLMs are stateless — each API call is independent; the model has no access to previous conversations unless explicitly included', isCorrect: true },
        { text: 'The model\'s session cache expired after inactivity', isCorrect: false },
        { text: 'You need to re-train the model after each conversation', isCorrect: false },
      ]},
      { type: 'mcq', text: '"Stateless" in the context of LLMs means:', points: 1, options: [
        { text: 'The model cannot be used to build stateful applications', isCorrect: false },
        { text: 'Each model invocation is independent — the model processes only the current context window and retains nothing between calls', isCorrect: true },
        { text: 'The model\'s state is stored in GPU memory between requests', isCorrect: false },
        { text: 'The model has no internal parameters or weights', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A customer support chatbot needs to remember what a user said 3 messages ago. What mechanism makes this possible?', points: 1, options: [
        { text: 'The LLM platform has built-in session memory for chatbots', isCorrect: false },
        { text: 'Including the conversation history (prior messages) in each API request — the memory is stored in your application, not the model', isCorrect: true },
        { text: 'A special persistent memory API endpoint provided by the model provider', isCorrect: false },
        { text: 'The model learns from the conversation and updates itself in real time', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A chatbot summarises each conversation and stores that summary to inject into the next session. This implements:', points: 1, options: [
        { text: 'Fine-tuning — updating the model on each conversation', isCorrect: false },
        { text: 'Compressed conversation memory — preserving relevant context across sessions while managing context window limits', isCorrect: true },
        { text: 'RAG — retrieving documents to answer questions', isCorrect: false },
        { text: 'A system prompt that persists automatically', isCorrect: false },
      ]},
      { type: 'true_false', text: 'If you want an LLM to remember information across multiple sessions, you must store and retrieve that information in your application layer and explicitly include it in each prompt.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t5.id, title: 'Three ways to give an LLM context', tag: 'tech', sortOrder: 1 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A company wants their LLM to always respond in a specific brand tone and follow guidelines, regardless of what users ask. Which mechanism is most appropriate?', points: 1, options: [
        { text: 'Few-shot examples included in every user message', isCorrect: false },
        { text: 'A system prompt — instructions placed before the conversation that establish behaviour and constraints for the entire session', isCorrect: true },
        { text: 'RAG on brand documents retrieved at each query', isCorrect: false },
        { text: 'Fine-tuning for each individual user', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You\'re building a product that answers questions about a 10,000-page knowledge base. Putting the full knowledge base in every prompt is not feasible. Which mechanism is designed for this?', points: 1, options: [
        { text: 'Conversation history — store the entire knowledge base in the chat history', isCorrect: false },
        { text: 'Retrieval — search the knowledge base at query time and inject only the relevant passages into the prompt', isCorrect: true },
        { text: 'A longer system prompt that summarises the entire knowledge base', isCorrect: false },
        { text: 'Fine-tuning the model on the knowledge base', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Conversation history in a chatbot grows with every turn. What problem does this create if not managed?', points: 1, options: [
        { text: 'The model becomes biased toward the most recently discussed topics', isCorrect: false },
        { text: 'The context window fills up — eventually you hit the limit and must truncate or summarise history, potentially losing important earlier context', isCorrect: true },
        { text: 'The API rate limit is exceeded due to larger requests', isCorrect: false },
        { text: 'The model\'s response time degrades linearly with history length', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Which combination is best for a coding assistant that needs both consistent behavior and access to a large codebase?', points: 1, options: [
        { text: 'Conversation history only — just include all prior messages', isCorrect: false },
        { text: 'System prompt (for coding conventions and persona) + retrieval (for relevant code files at query time)', isCorrect: true },
        { text: 'Fine-tuning only — train the model on the entire codebase', isCorrect: false },
        { text: 'Conversation history + fine-tuning, no system prompt needed', isCorrect: false },
      ]},
      { type: 'true_false', text: 'A system prompt and conversation history both count toward the context window — there is no separate, unlimited storage for either.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t5.id, title: 'What RAG actually is in practice', tag: 'tech', sortOrder: 2 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A user asks your RAG-powered FAQ bot: "What is your refund policy?" The system finds 3 relevant paragraphs from the returns policy document and includes them in the LLM prompt. What does the LLM do with them?', points: 1, options: [
        { text: 'It stores them permanently for future conversations', isCorrect: false },
        { text: 'It synthesises a natural language answer grounded in the retrieved text rather than training data alone', isCorrect: true },
        { text: 'It validates them against a live database before responding', isCorrect: false },
        { text: 'It returns the paragraphs verbatim without any processing', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A RAG system gives wrong answers on some queries but correct ones on others. What should you investigate first?', points: 1, options: [
        { text: 'The underlying LLM model quality and version', isCorrect: false },
        { text: 'The retrieval step — are the wrong documents being retrieved? Garbage in, garbage out', isCorrect: true },
        { text: 'The system prompt wording', isCorrect: false },
        { text: 'The temperature and sampling settings', isCorrect: false },
      ]},
      { type: 'mcq', text: 'In a RAG pipeline, why is chunking strategy important?', points: 1, options: [
        { text: 'Smaller chunks always produce better retrieval results', isCorrect: false },
        { text: 'Chunk size affects retrieval quality — too small loses context; too large dilutes relevance; the right size depends on document structure and query type', isCorrect: true },
        { text: 'Chunking determines the LLM\'s ability to generate coherent text', isCorrect: false },
        { text: 'Chunking strategy determines the final API cost', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Your RAG system retrieves the right documents but the LLM still gives a wrong answer. What is the most likely cause?', points: 1, options: [
        { text: 'RAG fundamentally doesn\'t work for this domain', isCorrect: false },
        { text: 'The LLM may have misinterpreted the retrieved context, or the answer requires synthesis across chunks in a way the model failed to combine correctly', isCorrect: true },
        { text: 'You need a larger context window for the retrieved documents', isCorrect: false },
        { text: 'The embeddings model is miscalibrated', isCorrect: false },
      ]},
      { type: 'true_false', text: 'RAG eliminates hallucination entirely because the model always answers from retrieved facts rather than training data.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — the model can still hallucinate by misinterpreting retrieved documents, combining them incorrectly, or generating text when retrieval fails to find relevant context', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t5.id, title: 'Chaining prompts and orchestration', tag: 'tech', sortOrder: 3 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You need an LLM to: extract action items from a meeting transcript, then categorise them by team, then draft an email per team. Instead of one prompt, you split this into 3 calls. What is the PRIMARY advantage?', points: 1, options: [
        { text: 'Three API calls are always cheaper than one', isCorrect: false },
        { text: 'Each call has a focused, verifiable task — you can inspect intermediate outputs, catch errors early, and each step receives clean structured input', isCorrect: true },
        { text: 'A single prompt would always exceed the context window for this task', isCorrect: false },
        { text: 'Chaining gives the model access to the internet between steps', isCorrect: false },
      ]},
      { type: 'mcq', text: 'In a chained workflow, the second LLM call produces an unexpected output that breaks the third call. What is the best debugging approach?', points: 1, options: [
        { text: 'Rewrite the entire pipeline from scratch', isCorrect: false },
        { text: 'Isolate and inspect the second call\'s output — the error is in the transition between step 2 and step 3', isCorrect: true },
        { text: 'Add more instructions to the first prompt to prevent the cascade', isCorrect: false },
        { text: 'Switch to a different model for the entire pipeline', isCorrect: false },
      ]},
      { type: 'mcq', text: 'When should you use a single LLM call instead of chaining?', points: 1, options: [
        { text: 'Whenever the task description sounds simple', isCorrect: false },
        { text: 'When the task can be fully specified in one prompt and the output needs no intermediate verification or branching logic', isCorrect: true },
        { text: 'When you want to save money on API costs', isCorrect: false },
        { text: 'When you need the fastest possible response time', isCorrect: false },
      ]},
      { type: 'mcq', text: 'What is the most important rule when designing the connection between two chained prompts?', points: 1, options: [
        { text: 'Always use the same model for both steps', isCorrect: false },
        { text: 'Define a clear, explicit output format for step N that matches the expected input format of step N+1', isCorrect: true },
        { text: 'Ensure both prompts are approximately the same length', isCorrect: false },
        { text: 'Always add a human review step between every pair of prompts', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Prompt chaining introduces more failure points than a single prompt — a bug in any step can propagate through the entire pipeline.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t5.id, title: 'When memory architecture matters', tag: 'tech', sortOrder: 4 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A simple Q&A chatbot needs to answer support questions with no cross-session memory requirements. What memory approach is needed?', points: 1, options: [
        { text: 'A full vector database for retrieval-augmented memory', isCorrect: false },
        { text: 'Simply include the conversation history in each API call — no additional memory architecture required', isCorrect: true },
        { text: 'A full RAG system with document indexing', isCorrect: false },
        { text: 'Fine-tune the model on previous support conversations', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A fitness app needs to remember a user\'s goals, restrictions, and progress across all sessions indefinitely. Which memory approach is most appropriate?', points: 1, options: [
        { text: 'Include only the last 5 messages in every prompt', isCorrect: false },
        { text: 'Store structured user profile data in a database and inject relevant profile fields into each session\'s system prompt', isCorrect: true },
        { text: 'Fine-tune the model individually on each user\'s conversation history', isCorrect: false },
        { text: 'Ask users to repeat their goals and restrictions at the start of every session', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A product team debates whether they need a memory layer for their AI feature. What is the key question to answer first?', points: 1, options: [
        { text: 'Which vector database is most cost-effective for our scale?', isCorrect: false },
        { text: 'Does the feature require knowledge of past interactions or information beyond the current conversation? If not, memory architecture adds complexity without benefit', isCorrect: true },
        { text: 'How much will the memory layer cost per user per month?', isCorrect: false },
        { text: 'Does the model provider support memory natively?', isCorrect: false },
      ]},
      { type: 'mcq', text: 'When does RAG-based retrieval become the right memory mechanism?', points: 1, options: [
        { text: 'For every AI product, regardless of use case', isCorrect: false },
        { text: 'When the information space is too large to include in a prompt and queries are sufficiently varied that selective retrieval outperforms injecting everything', isCorrect: true },
        { text: 'When users have a slow internet connection', isCorrect: false },
        { text: 'When the model has a very large context window', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Every AI product needs a vector database for memory — without one, the product will always feel stateless and broken to users.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — many AI products work well with simple conversation history or structured database lookups; vector databases solve specific problems and aren\'t universally required', isCorrect: true },
      ]},
    ])
  }

  // ─── Topic 6: Workflows and Orchestration ───────────────────────────────────
  const t6 = await prisma.topic.create({ data: { weekId: w, title: 'Workflows and Orchestration', tag: 'tech', sortOrder: 5 } })

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t6.id, title: 'What a workflow is', tag: 'tech', sortOrder: 0 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A startup builds a system that takes a CSV of leads, enriches each with company data, scores each using an LLM, and sends the top 10 to a CRM. This is best described as:', points: 1, options: [
        { text: 'A single LLM API call with a very detailed prompt', isCorrect: false },
        { text: 'An AI workflow — a sequence of steps where input is transformed through multiple operations to produce a final structured output', isCorrect: true },
        { text: 'A fine-tuned model that handles all steps internally', isCorrect: false },
        { text: 'A retrieval-augmented generation system', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Why is defining a workflow as a series of discrete steps better than one monolithic LLM prompt?', points: 1, options: [
        { text: 'Discrete steps always cost less in API fees', isCorrect: false },
        { text: 'Discrete steps are testable, debuggable, and replaceable independently — if step 3 breaks, you fix step 3 without rewriting the whole system', isCorrect: true },
        { text: 'Monolithic prompts simply do not work for multi-step tasks', isCorrect: false },
        { text: 'LLMs cannot handle multiple tasks in a single prompt', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A workflow\'s individual step should ideally:', points: 1, options: [
        { text: 'Do as many things as possible to minimise the total number of steps', isCorrect: false },
        { text: 'Have a single, clear responsibility with defined inputs and outputs — making it testable and replaceable in isolation', isCorrect: true },
        { text: 'Always involve at least one LLM API call', isCorrect: false },
        { text: 'Never call external APIs or databases', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A real-world AI workflow includes data enrichment via an external API, then LLM classification, then a database write. The external API call is:', points: 1, options: [
        { text: 'Outside the scope of the AI workflow and should be managed separately', isCorrect: false },
        { text: 'A legitimate workflow step — non-AI steps like API calls and database writes are normal parts of AI workflows', isCorrect: true },
        { text: 'A fine-tuning step that updates the model', isCorrect: false },
        { text: 'A RAG retrieval step', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Workflows are only relevant for AI-specific tasks — non-AI steps like API calls, database writes, and data formatting don\'t belong in an AI workflow definition.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — a real-world AI workflow includes both AI steps and non-AI steps; they work together as a unified pipeline', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t6.id, title: 'Single call vs multi-step', tag: 'tech', sortOrder: 1 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You need to translate a paragraph from English to French. Which is most appropriate?', points: 1, options: [
        { text: 'Multi-step orchestration with 3 sequential LLM calls', isCorrect: false },
        { text: 'A single LLM call — the task is well-defined, needs no intermediate verification, and one call can do it completely', isCorrect: true },
        { text: 'A RAG pipeline to retrieve translation examples first', isCorrect: false },
        { text: 'Fine-tuning a translation-specific model', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You need to analyse 50 customer interviews for themes, rank themes by frequency, and draft messaging for each theme. Which approach is appropriate?', points: 1, options: [
        { text: 'One LLM call with all 50 interviews in a single context', isCorrect: false },
        { text: 'Multi-step: extract themes per interview → aggregate and rank → draft messaging per theme', isCorrect: true },
        { text: 'One call per interview with no synthesis step', isCorrect: false },
        { text: 'Fine-tune a model on the interview corpus', isCorrect: false },
      ]},
      { type: 'mcq', text: 'The key decision criterion for single vs multi-step is:', points: 1, options: [
        { text: 'How many input tokens the task consumes', isCorrect: false },
        { text: 'Whether intermediate verification or branching is needed — if output of step A changes what step B does, you need a multi-step flow', isCorrect: true },
        { text: 'How complex the task description sounds to a human', isCorrect: false },
        { text: 'The cost per API call on your current pricing plan', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A multi-step workflow adds complexity. When is that complexity justified?', points: 1, options: [
        { text: 'Whenever the task involves more than 100 output tokens', isCorrect: false },
        { text: 'When a single prompt can\'t reliably produce the required quality, or when intermediate outputs need inspection, storage, or conditional routing', isCorrect: true },
        { text: 'Always — multi-step is always better than single-step', isCorrect: false },
        { text: 'When the engineering team has more than 5 developers', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Using multiple LLM calls always produces better output than a single call — the more calls, the higher the quality.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — unnecessary steps add latency, cost, and failure points; the goal is as few steps as needed to reliably achieve the required quality', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t6.id, title: 'Tools, models, and debugging orchestration', tag: 'tech', sortOrder: 2 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'In an orchestrated workflow, an LLM needs the current date to answer a question. LLMs don\'t have clocks. What mechanism handles this?', points: 1, options: [
        { text: 'Include approximate date information in the training data', isCorrect: false },
        { text: 'Tool use / function calling — the LLM requests the current date from a defined tool, which injects real-world data into the response', isCorrect: true },
        { text: 'Ask a different model that was trained more recently', isCorrect: false },
        { text: 'Include an approximate date in the system prompt and update it manually', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A workflow uses a fast, cheap model for data extraction and a more powerful model for complex reasoning. Why is this a good design pattern?', points: 1, options: [
        { text: 'Mixing models from different providers always produces better results', isCorrect: false },
        { text: 'Matching model capability to task complexity reduces cost and latency — simple tasks don\'t need the most capable model', isCorrect: true },
        { text: 'Cheaper models always perform better on structured extraction tasks', isCorrect: false },
        { text: 'The workflow architecture technically requires two separate models', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A 5-step workflow produces a wrong final output. What is the most efficient debugging approach?', points: 1, options: [
        { text: 'Rewrite the entire workflow from scratch', isCorrect: false },
        { text: 'Inspect intermediate outputs at each step boundary to locate where correct data first becomes incorrect — isolate the failing step', isCorrect: true },
        { text: 'Add more instructions to the first step\'s prompt', isCorrect: false },
        { text: 'Switch to a different model for the final step only', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Step 3 of your workflow produces malformed JSON 10% of the time, causing downstream failures. What is the most robust fix?', points: 1, options: [
        { text: 'Accept a 90% success rate as good enough for a production system', isCorrect: false },
        { text: 'Add output validation at step 3\'s output boundary — detect malformed JSON and retry or surface an error before it propagates', isCorrect: true },
        { text: 'Completely rewrite step 3\'s prompt from scratch', isCorrect: false },
        { text: 'Merge step 3\'s logic into the final step to reduce handoffs', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Once a workflow has been tested and deployed, it requires no further monitoring because AI workflows are inherently stable once working.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — AI workflows can degrade over time due to model updates, changes in input data, API changes, or dependency failures; ongoing monitoring is essential', isCorrect: true },
      ]},
    ])
  }

  // ─── Topic 7: Marketing Funnel Fundamentals ──────────────────────────────────
  const t7 = await prisma.topic.create({ data: { weekId: w, title: 'Marketing Funnel Fundamentals', tag: 'marketing', sortOrder: 6 } })

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t7.id, title: 'The full funnel from ad to conversion', tag: 'marketing', sortOrder: 0 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A brand spends ₹1,00,000 on Meta ads. 10,000 people see the ad. 500 click through. 50 add to cart. 20 complete a purchase. What does this describe?', points: 1, options: [
        { text: 'A poorly performing campaign that should be paused immediately', isCorrect: false },
        { text: 'The conversion funnel — each stage shows how many people move to the next action, with drop-off at every step', isCorrect: true },
        { text: 'A single metric called ROAS (Return on Ad Spend)', isCorrect: false },
        { text: 'The total addressable market for this product', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A brand\'s ad gets millions of impressions but almost no clicks. Which stage of the funnel is broken?', points: 1, options: [
        { text: 'Add-to-cart — products aren\'t compelling enough once users land', isCorrect: false },
        { text: 'Top of funnel — the ad isn\'t stopping the scroll and generating interest (hook rate / CTR is the issue)', isCorrect: true },
        { text: 'Purchase completion — the checkout is creating friction', isCorrect: false },
        { text: 'Post-purchase retention — customers aren\'t returning', isCorrect: false },
      ]},
      { type: 'mcq', text: 'A funnel has strong CTR but very low add-to-cart rate. Where should the team focus first?', points: 1, options: [
        { text: 'Improve the ad creative to attract more clicks', isCorrect: false },
        { text: 'The product page — people arrive but aren\'t convinced to add to cart; price, copy, images, or social proof may be the issue', isCorrect: true },
        { text: 'The checkout flow — friction at payment is causing drop-off', isCorrect: false },
        { text: 'The ad targeting — the wrong audience is clicking', isCorrect: false },
      ]},
      { type: 'mcq', text: '"Every stage, every metric" in funnel analysis means:', points: 1, options: [
        { text: 'Tracking only ROAS as the single source of truth', isCorrect: false },
        { text: 'Measuring conversion rate between each stage — impressions → clicks → product page → add-to-cart → purchase — to locate where drop-off is highest', isCorrect: true },
        { text: 'Tracking only ad spend and total revenue', isCorrect: false },
        { text: 'Measuring only top-of-funnel metrics like reach and impressions', isCorrect: false },
      ]},
      { type: 'true_false', text: 'Improving ad creative will fix a broken funnel regardless of which stage is underperforming.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — ad creative improvements only help if the top-of-funnel is broken; issues at checkout, product page, or pricing require different interventions', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t7.id, title: 'Top-of-funnel metrics: hook rate, CTR, CPM', tag: 'marketing', sortOrder: 1 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'A video ad is shown 100,000 times. 3,000 people watch more than 3 seconds. What is the hook rate?', points: 1, options: [
        { text: '0.3%', isCorrect: false },
        { text: '3%', isCorrect: true },
        { text: '30%', isCorrect: false },
        { text: '300%', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Your ad has a CTR of 0.5% on Meta. Industry benchmark is 1.5%. What does low CTR most likely indicate?', points: 1, options: [
        { text: 'The product pricing is too high on the landing page', isCorrect: false },
        { text: 'The ad creative, copy, or targeting isn\'t compelling enough to generate clicks from the audience seeing it', isCorrect: true },
        { text: 'The landing page is loading too slowly', isCorrect: false },
        { text: 'The checkout flow has a technical error', isCorrect: false },
      ]},
      { type: 'mcq', text: 'CPM is ₹200 for campaign A and ₹400 for campaign B. Both have the same CTR and conversion rate. Which generates more value per rupee spent?', points: 1, options: [
        { text: '₹400 CPM — higher cost usually signals better audience quality', isCorrect: false },
        { text: '₹200 CPM — same conversion efficiency at half the cost to reach 1,000 people means roughly twice the ROAS', isCorrect: true },
        { text: 'They are identical in value since conversion rates match', isCorrect: false },
        { text: 'CPM doesn\'t affect overall return — only CPC matters', isCorrect: false },
      ]},
      { type: 'mcq', text: 'You\'re optimising for hook rate in a video ad. What specifically are you improving?', points: 1, options: [
        { text: 'The percentage of people who click through to your website', isCorrect: false },
        { text: 'The percentage of people who stop scrolling and watch beyond the first 3 seconds', isCorrect: true },
        { text: 'The cost to reach 1,000 people with your ad', isCorrect: false },
        { text: 'The percentage of viewers who complete a purchase', isCorrect: false },
      ]},
      { type: 'true_false', text: 'A low CPM always means your campaign is performing well — cheaper impressions always lead to better ROI.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — low CPM reduces cost per reach, but if CTR or conversion rate is poor, cheap impressions still produce no ROI', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t7.id, title: 'Mid-funnel metrics: CPC and add-to-cart rate', tag: 'marketing', sortOrder: 2 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'Your Meta ads have a CTR of 2.5% (strong) but your add-to-cart rate is 2% (industry norm: 8%). Where is the problem?', points: 1, options: [
        { text: 'The ad creative needs to be improved', isCorrect: false },
        { text: 'The product page — people are arriving but not adding to cart; price, copy, images, or trust signals are causing the drop-off', isCorrect: true },
        { text: 'The checkout flow has technical friction', isCorrect: false },
        { text: 'The ad targeting is reaching the wrong audience', isCorrect: false },
      ]},
      { type: 'mcq', text: 'CPC is ₹100. Your add-to-cart rate is 10%. What is your Cost Per Add to Cart?', points: 1, options: [
        { text: '₹10', isCorrect: false },
        { text: '₹1,000', isCorrect: true },
        { text: '₹100', isCorrect: false },
        { text: '₹1,100', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Your add-to-cart rate dropped from 12% to 4% after a site redesign. No product or price changes were made. What most likely caused this?', points: 1, options: [
        { text: 'Your ad creative changed and attracted a different audience', isCorrect: false },
        { text: 'The redesign likely moved or obscured the Add to Cart button, changed the product page layout, or removed social proof that was converting users', isCorrect: true },
        { text: 'Your ad budget decreased during the same period', isCorrect: false },
        { text: 'Your CPM increased, reducing overall traffic quality', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Mid-funnel analysis specifically helps you answer:', points: 1, options: [
        { text: 'How many total impressions did the ad receive?', isCorrect: false },
        { text: 'Which part of the website experience between click and cart is causing drop-off?', isCorrect: true },
        { text: 'What is the total campaign spend this month?', isCorrect: false },
        { text: 'How many repeat customers did we acquire?', isCorrect: false },
      ]},
      { type: 'true_false', text: 'A high CTR and high CPC together always indicate a campaign problem that must be fixed immediately.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — high CTR with high CPC may reflect competitive audience bidding rather than a campaign problem; the key follow-on question is whether those clicks convert profitably', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t7.id, title: 'Bottom-of-funnel metrics: ROAS, purchase rate, prepaid %', tag: 'marketing', sortOrder: 3 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'You spend ₹50,000 on ads and generate ₹2,00,000 in revenue. What is your ROAS?', points: 1, options: [
        { text: '2.5x', isCorrect: false },
        { text: '4x', isCorrect: true },
        { text: '25%', isCorrect: false },
        { text: '₹1,50,000 net profit', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Your purchase rate (visitors who complete a purchase) dropped from 3.5% to 1.2% overnight with no product or ad changes. What should you check first?', points: 1, options: [
        { text: 'Ad creative — the campaign may have refreshed automatically', isCorrect: false },
        { text: 'Checkout flow — a technical issue or broken payment gateway is the most likely cause of a sudden sharp drop with no other changes', isCorrect: true },
        { text: 'Product pricing — a competitor may have dropped prices', isCorrect: false },
        { text: 'Meta ad targeting — the algorithm may have shifted audiences', isCorrect: false },
      ]},
      { type: 'mcq', text: '"Prepaid %" refers to the proportion of orders paid upfront vs COD. Why is higher prepaid % desirable in D2C e-commerce?', points: 1, options: [
        { text: 'Prepaid customers tend to spend significantly more per order on average', isCorrect: false },
        { text: 'Prepaid orders have near-zero return-to-origin (RTO) rates — COD orders are frequently refused on delivery, increasing fulfillment costs and inventory waste', isCorrect: true },
        { text: 'Prepaid checkout flows are technically faster for users', isCorrect: false },
        { text: 'Payment gateways charge significantly less for prepaid transactions', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Your ROAS is 3x. COGS is 40% of revenue and fulfillment is 10%. Are you profitable?', points: 1, options: [
        { text: 'Yes — 3x ROAS is always profitable', isCorrect: false },
        { text: 'Not necessarily — with ad spend at ~33% of revenue (1/3x), COGS at 40%, and fulfillment at 10%, you\'re at or below breakeven before other costs', isCorrect: true },
        { text: 'No — ROAS below 5x is never profitable in D2C', isCorrect: false },
        { text: 'ROAS tells you nothing about profitability', isCorrect: false },
      ]},
      { type: 'true_false', text: 'ROAS is the most complete measure of campaign profitability — if ROAS is strong, the campaign is definitely making money.', points: 1, options: [
        { text: 'True', isCorrect: false },
        { text: 'False — ROAS measures revenue per rupee of ad spend, not profit; COGS, returns, fulfillment, and overhead can make a high-ROAS campaign unprofitable', isCorrect: true },
      ]},
    ])
  }

  {
    const sub = await prisma.subtopic.create({ data: { topicId: t7.id, title: 'Diagnosing a broken funnel', tag: 'marketing', sortOrder: 4 } })
    const quiz = await prisma.quiz.create({ data: { subtopicId: sub.id, status: 'live', passThreshold: 80 } })
    await createQuestions(quiz.id, [
      { type: 'mcq', text: 'Sales are down 40% week-on-week. Your first step in diagnosis is:', points: 1, options: [
        { text: 'Immediately pause all ads to stop the spend', isCorrect: false },
        { text: 'Examine each funnel stage\'s metrics — impressions, CTR, ATC%, purchase rate — to isolate which stage dropped, then investigate that specific drop', isCorrect: true },
        { text: 'Change the product pricing to boost conversion', isCorrect: false },
        { text: 'Redesign the website to improve the overall experience', isCorrect: false },
      ]},
      { type: 'mcq', text: 'All funnel metrics look normal except purchase rate (dropped from 4% to 1%). Where should you focus?', points: 1, options: [
        { text: 'Ad creative — the top of funnel needs refreshing', isCorrect: false },
        { text: 'Checkout experience — is there a technical failure, a broken payment method, or added friction at the final step?', isCorrect: true },
        { text: 'Product page — the offer isn\'t compelling enough', isCorrect: false },
        { text: 'Ad audience targeting — wrong users are reaching the checkout', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Hook rate and CTR are both strong, CPC is healthy, but add-to-cart rate is very low. What is the likely culprit?', points: 1, options: [
        { text: 'The ad creative isn\'t compelling enough to drive interest', isCorrect: false },
        { text: 'The product page — people are interested (they click) but not convinced to add to cart; the offer, price, or product presentation needs work', isCorrect: true },
        { text: 'The checkout is technically broken and causing drop-off', isCorrect: false },
        { text: 'The campaign targeting is reaching the wrong audience entirely', isCorrect: false },
      ]},
      { type: 'mcq', text: 'Funnel diagnosis is most valuable because:', points: 1, options: [
        { text: 'It tells you exactly what change to make to your product to fix the problem', isCorrect: false },
        { text: 'It narrows the hypothesis space — instead of changing everything, you identify the specific stage underperforming and focus intervention there', isCorrect: true },
        { text: 'It replaces the need for A/B testing entirely', isCorrect: false },
        { text: 'It predicts future campaign performance with high accuracy', isCorrect: false },
      ]},
      { type: 'true_false', text: 'If ROAS drops but all other funnel metrics remain stable, the most likely cause is a change in COGS, average order value, or return rate — not ad performance.', points: 1, options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ]},
    ])
  }

  // ─── Capstone Topic ──────────────────────────────────────────────────────────
  const tCapstone = await prisma.topic.create({
    data: { weekId: w, title: 'Week 2 Capstone Project', tag: 'capstone', sortOrder: 99 },
  })

  const subCapstone = await prisma.subtopic.create({
    data: { topicId: tCapstone.id, title: 'AI Builder Week Project', tag: 'capstone', sortOrder: 0, description: 'Week-level capstone project. Unlocked by admin.' },
  })

  await prisma.project.create({
    data: {
      subtopicId: subCapstone.id,
      title: 'Build an AI-Powered Product Brief Generator',
      briefText: `Build a working AI workflow that takes a raw product idea as text input and outputs a structured product brief. Your brief must include: target user, core problem being solved, proposed solution, 3 key features, suggested tech stack, and a one-paragraph marketing hook.

The workflow should chain at least 2 LLM calls. For example: a first call to extract and structure the raw idea, and a second call to generate the marketing hook from the structured output.

You may use Claude API, OpenAI API, or any AI tool available to you. You may build this as a script, a simple web page, or a CLI tool — the implementation format is up to you.

Submit a working demo link (e.g. a deployed app, a Replit, or a Loom walkthrough) plus a link to your code (GitHub, Gist, or shared folder).`,
      expectedOutput: 'A working demo or repository link + a short video walkthrough (2–3 minutes) showing the workflow in action with a sample product idea as input.',
      isPublished: true,
      isCapstone: true,
      criteria: {
        create: [
          { name: 'Workflow Design', description: 'Clear multi-step workflow with defined inputs/outputs at each step', maxMarks: 20, sortOrder: 0 },
          { name: 'Prompt Quality', description: 'Prompts use role, context, instruction, format, and constraints correctly', maxMarks: 20, sortOrder: 1 },
          { name: 'Output Quality', description: 'Generated product brief is coherent, structured, and actionable', maxMarks: 20, sortOrder: 2 },
          { name: 'Implementation', description: 'Working code that is readable and follows the spec', maxMarks: 20, sortOrder: 3 },
          { name: 'Walkthrough', description: 'Clear video explaining design decisions and what you built', maxMarks: 20, sortOrder: 4 },
        ],
      },
    },
  })

  console.log('Week 2 content created.')
  await backfillUnlocks(week2.id)
  console.log('Week 2 seed complete!')
}

async function backfillUnlocks(week2Id: string) {
  // Find users who have the week_complete badge for Week 1
  const week1Badge = await prisma.badge.findFirst({
    where: { conditionType: 'week_complete', conditionValue: '1' },
  })

  // Also check UserWeekProgress.isCompleted = true for Week 1 (in case badge was somehow not awarded)
  const week1 = await prisma.week.findUnique({ where: { number: 1 } })
  if (!week1) return

  const completedViaProgress = await prisma.userWeekProgress.findMany({
    where: { weekId: week1.id, isCompleted: true },
    select: { userId: true },
  })

  const completedViaBadge = week1Badge
    ? await prisma.userBadge.findMany({ where: { badgeId: week1Badge.id }, select: { userId: true } })
    : []

  const seen: Record<string, boolean> = {}
  const allUserIds: string[] = []
  for (const r of [...completedViaProgress, ...completedViaBadge]) {
    if (!seen[r.userId]) { seen[r.userId] = true; allUserIds.push(r.userId) }
  }

  for (const userId of allUserIds) {
    await prisma.userWeekProgress.upsert({
      where: { userId_weekId: { userId, weekId: week2Id } },
      create: { userId, weekId: week2Id, isUnlocked: true, unlockedAt: new Date() },
      update: {},
    })
  }

  if (allUserIds.length > 0) {
    console.log(`Backfill: unlocked Week 2 for ${allUserIds.length} user(s) who completed Week 1.`)
  } else {
    console.log('Backfill: no users with completed Week 1 found — nothing to unlock.')
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
