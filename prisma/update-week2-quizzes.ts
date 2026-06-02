/**
 * update-week2-quizzes.ts
 * Replaces Week 2 quiz questions with improved nuance-driven versions.
 * SAFE: skips quizzes with existing learner attempts. All other data preserved.
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const QUIZ_UPDATES: Array<{subtopic: string; questions: Array<{type: string; text: string; options: Array<{text: string; isCorrect: boolean}>}>}> = [
  {
    subtopic: 'Tokens, context windows, and reasoning',
    questions: [
      {
        type: 'mcq',
        text: `A developer pastes a 40,000-token document into an API call with a 32,000-token context limit. The API returns an error. The developer\'s colleague says "just ask the model to summarise as it reads, so it fits." What is wrong with this reasoning?`,
        options: [
          { text: `The model processes the entire input before generating any output — it cannot summarise mid-ingestion to free up space`, isCorrect: true },
          { text: `Summarisation prompts use more tokens than the original text, making the problem progressively worse with each pass`, isCorrect: false },
          { text: `The model would summarise correctly but the output token limit would still be exceeded by the condensed result`, isCorrect: false },
          { text: `Context limits only apply to output tokens by default, so the colleague\'s suggestion targets the wrong constraint`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A user asks an LLM "how many times does the letter \'s\' appear in \'mississippi\'?" The model answers 3. The correct answer is 4. Which explanation is most accurate?`,
        options: [
          { text: `The model has not seen enough spelling examples in training to count individual characters reliably across all words`, isCorrect: false },
          { text: `The model tokenises "mississippi" into subword units, so it reasons over tokens — not individual characters`, isCorrect: true },
          { text: `The model\'s attention mechanism skips duplicate characters to reduce computation on repeated input patterns`, isCorrect: false },
          { text: `Letter-counting requires retrieval from a character index that the model does not have access to at inference time`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A chatbot handles long support threads. Users report that details from the first few messages are ignored while recent messages are handled well. The engineering team increases the context window. The problem persists. Why?`,
        options: [
          { text: `A larger context window shifts the lost-in-the-middle zone but does not eliminate it — the model still underweights middle content`, isCorrect: true },
          { text: `Support threads structurally exceed context limits regardless of window size due to multi-turn overhead tokens`, isCorrect: false },
          { text: `The model prioritises system prompt tokens over all user message tokens when context approaches its limit`, isCorrect: false },
          { text: `Context window size only affects maximum output length, not how input tokens are attended to during generation`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `An LLM API is described as "stateless." A junior developer argues this just means the model doesn\'t save chat logs to disk. What is the more precise meaning?`,
        options: [
          { text: `Each API call processes only the tokens sent in that request — no information persists from prior calls in model state`, isCorrect: true },
          { text: `The model\'s weights are not updated between calls, which is why outputs are deterministic across identical requests`, isCorrect: false },
          { text: `Stateless means the model cannot write to external databases or file systems during the generation process`, isCorrect: false },
          { text: `API responses are not cached server-side, so identical prompts may return different outputs on subsequent calls`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'Why models hallucinate',
    questions: [
      {
        type: 'mcq',
        text: `A legal team uses an LLM to draft contract clauses. The model produces a clause citing "Section 14(b) of the Companies Act 2013." The section exists but the clause content misrepresents what it says. Which explanation best describes what happened?`,
        options: [
          { text: `The model predicted text that fits the statistical pattern of legal citations without verifying the clause content`, isCorrect: true },
          { text: `The model retrieved an outdated version of the Act from its training corpus and applied superseded language`, isCorrect: false },
          { text: `The model was not given enough context to locate the correct section and defaulted to an approximation`, isCorrect: false },
          { text: `Legal text is underrepresented in training data, so the model generates approximations for domain-specific references`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A RAG system is deployed to reduce hallucinations. A user asks a question whose answer is not in any retrieved document. The model confidently answers anyway. What is the most accurate description of what happened?`,
        options: [
          { text: `The retrieval step failed to embed the query correctly, returning unrelated chunks with high similarity scores`, isCorrect: false },
          { text: `RAG reduces hallucination by grounding responses in retrieved text — but when retrieval returns nothing useful, the model falls back on its training data and can still hallucinate`, isCorrect: true },
          { text: `The model temperature was set too high, causing it to generate creative responses rather than factual ones`, isCorrect: false },
          { text: `RAG only prevents hallucination for factual queries, not inferential ones, so this failure is expected behaviour`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Two LLM responses are identical in content. One says "I\'m confident this is accurate." The other says "I\'m not entirely sure, but here is what I know." Which statement about their reliability is correct?`,
        options: [
          { text: `The confident response is more likely to be correct — the model signals uncertainty when it detects genuine knowledge gaps`, isCorrect: false },
          { text: `Expressed confidence is not correlated with factual accuracy — models learn confident-sounding language from training text, not from verified knowledge`, isCorrect: true },
          { text: `Neither response can be trusted because LLMs generate hallucinated content at roughly equal rates for all query types`, isCorrect: false },
          { text: `The uncertain response is more reliable because hedging language indicates the model is operating near its knowledge boundary`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A product team debates whether to fine-tune their model or implement RAG to reduce hallucinations in a customer-facing FAQ bot. The knowledge base is updated weekly. Which argument best supports choosing RAG?`,
        options: [
          { text: `Fine-tuning is more expensive at scale, so RAG is the correct default for any production system with cost constraints`, isCorrect: false },
          { text: `Fine-tuning bakes knowledge into weights at training time — weekly updates would require weekly retraining, whereas RAG retrieves current documents at query time`, isCorrect: true },
          { text: `RAG eliminates hallucination entirely on factual queries, while fine-tuning only statistically reduces its frequency`, isCorrect: false },
          { text: `Fine-tuned models lose general reasoning ability over time, making them unsuitable for open-ended FAQ responses`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'The model landscape: Claude, GPT, and Gemini',
    questions: [
      {
        type: 'mcq',
        text: `A startup needs to process 800-page legal contracts in a single API call. Their engineer says "we should pick whichever model scored highest on the MMLU benchmark." What is the flaw in this reasoning?`,
        options: [
          { text: `MMLU tests knowledge breadth, not context length capacity — the relevant capability here is how much text fits in a single prompt`, isCorrect: true },
          { text: `Legal contracts require domain-specific fine-tuning, and benchmark scores do not predict fine-tuning outcomes reliably`, isCorrect: false },
          { text: `MMLU scores are self-reported by model providers and have not been independently verified across evaluation sets`, isCorrect: false },
          { text: `High benchmark scores correlate with increased hallucination risk on domain-specific tasks outside the test distribution`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A team runs identical coding tasks on Claude, GPT-4o, and Gemini. Claude produces the best output for their specific codebase. A stakeholder argues they should switch to whichever model leads the HumanEval leaderboard instead. What does the team\'s result actually demonstrate?`,
        options: [
          { text: `Claude has been fine-tuned on more code than competing models at the time of testing, explaining the performance gap`, isCorrect: false },
          { text: `Benchmark rankings reflect average performance across diverse tasks — real-world results on a specific codebase can diverge significantly from leaderboard order`, isCorrect: true },
          { text: `The stakeholder is correct — leaderboard rankings are the most reliable predictor of task-specific output quality available`, isCorrect: false },
          { text: `GPT-4o and Gemini are not competitive on coding tasks and should be deprioritised in future model evaluations`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A product manager says "we chose GPT-4o because it\'s the most powerful model available." A machine learning engineer pushes back. Which engineer response is best supported by how model selection should work?`,
        options: [
          { text: `"OpenAI models have documented safety issues that make them unsuitable for use in our production environment."`, isCorrect: false },
          { text: `"Model capability claims are largely marketing — all frontier models perform identically on real-world tasks at scale."`, isCorrect: false },
          { text: `"\'Most powerful\' depends on the task — we should evaluate all shortlisted models on our specific inputs and judge on our actual outputs."`, isCorrect: true },
          { text: `"We should select based on API pricing, since performance differences between frontier models are negligible in practice."`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Gemini 1.5 Pro\'s most distinctive capability at the time of its release was handling very long contexts including video, audio, and documents in a single prompt. A developer argues this makes it the best choice for all multimodal tasks. What is wrong with this reasoning?`,
        options: [
          { text: `Gemini 1.5 Pro does not support audio inputs through its standard API configuration at any tier`, isCorrect: false },
          { text: `A strong capability in one dimension does not mean a model is best across all multimodal tasks — accuracy on the specific modality and task still requires evaluation`, isCorrect: true },
          { text: `Claude and GPT-4o have since matched Gemini\'s context length exactly, making this advantage no longer relevant`, isCorrect: false },
          { text: `Very long context windows increase hallucination risk proportionally, which negates the advantage on factual tasks`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'Prompting vs RAG vs fine-tuning',
    questions: [
      {
        type: 'mcq',
        text: `A company has 600 pages of internal policy documentation that changes quarterly. They want an LLM to answer employee questions accurately. Their first instinct is to fine-tune the model on the documents. What is the strongest argument against this approach?`,
        options: [
          { text: `Fine-tuning requires more than 600 pages of data to achieve reliable performance on document-question tasks`, isCorrect: false },
          { text: `Fine-tuning embeds knowledge into model weights at training time — quarterly updates would require quarterly retraining, and the model cannot answer about newly added content until retrained`, isCorrect: true },
          { text: `Fine-tuned models lose instruction-following ability over training cycles and would stop responding correctly to employee phrasing`, isCorrect: false },
          { text: `Policy documents contain PII and proprietary information that cannot legally be included in fine-tuning pipelines`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A RAG system answers questions about a product catalogue. A user asks "which of your products would work best for someone with sensitive skin?" The system retrieves product descriptions but the response is poor. What does this reveal about RAG\'s limitation?`,
        options: [
          { text: `RAG cannot handle questions about physical products because it is designed for text-only knowledge retrieval`, isCorrect: false },
          { text: `RAG retrieves relevant chunks but the synthesis and reasoning over multiple retrieved pieces is still done by the LLM — complex cross-document reasoning can still fail`, isCorrect: true },
          { text: `The embedding model failed to retrieve the correct products because "sensitive skin" is too colloquial for the index`, isCorrect: false },
          { text: `RAG systems require structured data like relational databases, not unstructured product descriptions, for reliable retrieval`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `An engineer proposes fine-tuning the model on 500 examples of correctly formatted outputs to solve a formatting problem. A colleague suggests trying few-shot prompting first. Which argument best supports the colleague\'s position?`,
        options: [
          { text: `Fine-tuning on fewer than 10,000 examples never produces reliable results for formatting tasks in production`, isCorrect: false },
          { text: `Fine-tuning is irreversible and will degrade the model\'s general capabilities on all other tasks permanently`, isCorrect: false },
          { text: `Few-shot prompting can often achieve consistent formatting with far less overhead — fine-tuning is expensive, requires labelled data, and should be tried after simpler approaches fail`, isCorrect: true },
          { text: `The model provider\'s terms of service prohibit fine-tuning specifically for formatting and style-related tasks`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A developer uses a system prompt to inject 400 pages of product documentation into every API call. Response quality is inconsistent and latency is high. A colleague recommends RAG instead. What is the core problem the colleague is identifying?`,
        options: [
          { text: `System prompts are limited to 2,000 tokens on most providers, so the documents are being silently truncated each call`, isCorrect: false },
          { text: `Injecting all documents every call wastes context on irrelevant content — RAG retrieves only the sections relevant to each specific query, improving both relevance and efficiency`, isCorrect: true },
          { text: `Injecting large system prompts causes the model to ignore the user\'s actual question and attend to document content instead`, isCorrect: false },
          { text: `Product documentation must be in structured JSON format for the model to reason over it reliably at scale`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'What embeddings are and why they matter',
    questions: [
      {
        type: 'mcq',
        text: `A semantic search system returns "how do I cancel my account?" when a user searches for "stop my subscription." A keyword search returns no results for the same query. What does this difference demonstrate?`,
        options: [
          { text: `Keyword search has a bug — it should match "subscription" to "account" via a synonym dictionary in the index layer`, isCorrect: false },
          { text: `Embeddings capture meaning in vector space so semantically similar phrases have nearby representations, even without shared words`, isCorrect: true },
          { text: `The semantic system was trained specifically on customer service language, which gave it an advantage on this query type`, isCorrect: false },
          { text: `Keyword search only supports exact character matches, which makes it unsuitable for any production search use case`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A team embeds all their support documents and also embeds each incoming user query before searching. A new engineer asks why the query needs to be embedded. What is the correct answer?`,
        options: [
          { text: `Embedding the query is a performance optimisation — raw text queries produce the same results but run more slowly`, isCorrect: false },
          { text: `Cosine similarity operates on vectors of the same dimensionality — the query must be embedded into the same vector space as the documents to compute similarity`, isCorrect: true },
          { text: `Embedding the query compresses it into fewer tokens, which reduces the cost of the retrieval API call`, isCorrect: false },
          { text: `Raw text queries would match too broadly — embedding adds specificity by filtering stopwords and low-signal terms`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A developer embeds "The dog chased the cat" and "The cat chased the dog." They expect cosine similarity near zero because the meaning is different. The score comes back at 0.94. Which explanation is correct?`,
        options: [
          { text: `The embedding model has a known bug where subject-object inversions produce artificially inflated similarity scores`, isCorrect: false },
          { text: `Embeddings represent semantic content using shared vocabulary and structure — word-order-based meaning differences are often underrepresented, especially when most tokens overlap`, isCorrect: true },
          { text: `A score of 0.94 confirms the sentences are semantically identical, which is the correct interpretation of the result`, isCorrect: false },
          { text: `Cosine similarity is not the appropriate metric for sentence pairs — it should only be applied to single-word comparisons`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A RAG pipeline retrieves the top 3 documents by cosine similarity but answers are consistently wrong for a specific query type. The LLM is confirmed to be working correctly. Where should the team investigate first?`,
        options: [
          { text: `The LLM\'s temperature setting — high temperature causes the model to ignore retrieved context and generate freely`, isCorrect: false },
          { text: `The number of retrieved documents — 3 is universally too few for production RAG systems to return reliable answers`, isCorrect: false },
          { text: `The embedding model and chunking strategy — poor retrieval quality means relevant content is either not retrieved or buried below the top 3`, isCorrect: true },
          { text: `The system prompt — if it does not mention RAG explicitly, the model ignores the retrieved passages entirely`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'Anatomy of a strong prompt',
    questions: [
      {
        type: 'mcq',
        text: `A developer prompts Claude: "You are a senior lawyer. Summarise this contract." The output is accurate but formatted as dense paragraphs, making it hard for the client to skim. Which prompt component most directly caused this?`,
        options: [
          { text: `Missing output format specification — no structure or length was defined, so the model chose its own`, isCorrect: true },
          { text: `Missing role precision — the persona was not specific enough to signal that the output would be read by non-lawyers`, isCorrect: false },
          { text: `Missing context — the model did not know enough about the contract type to determine appropriate formatting`, isCorrect: false },
          { text: `Missing chain-of-thought instruction — the model skipped its reasoning steps and defaulted to prose`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A team copies a prompt that worked well for customer feedback analysis and uses it unchanged for analysing sales call transcripts. Output quality drops sharply. What is the most likely cause?`,
        options: [
          { text: `The instruction component was written for a different task context and no longer matches the new input type`, isCorrect: true },
          { text: `Sales transcripts are longer than feedback forms, which automatically degrades model performance on longer inputs`, isCorrect: false },
          { text: `Copying prompts between tasks introduces token interference that degrades quality regardless of content similarity`, isCorrect: false },
          { text: `The role component was too specific, causing the model to reject the new input type as outside its defined scope`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Which of the following prompts is most likely to produce a response that misses the mark on tone, length, and structure simultaneously?`,
        options: [
          { text: `"Write a product update email for non-technical users. Three short paragraphs. No jargon."`, isCorrect: false },
          { text: `"Write something about the new feature we just launched for our customers."`, isCorrect: true },
          { text: `"As a product manager, summarise the new feature launch in plain English for customers."`, isCorrect: false },
          { text: `"Summarise the feature. Keep it simple. Use bullet points. Avoid technical terms."`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A content team gives Claude "Write a blog post," then gives it a 600-word version specifying audience, topic, structure, language level, and an example requirement. What specifically makes the second prompt stronger?`,
        options: [
          { text: `It defines length, audience, topic focus, structure, language level, and example requirement — removing the model\'s need to guess on any dimension`, isCorrect: true },
          { text: `It is longer, and longer prompts always produce more detailed and accurate responses from language models`, isCorrect: false },
          { text: `It uses more professional vocabulary, which signals to the model that a higher quality output is expected`, isCorrect: false },
          { text: `It specifies a word count, which is the single most important constraint for controlling output quality in practice`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'Structured output and JSON',
    questions: [
      {
        type: 'mcq',
        text: `A developer asks an LLM to return a JSON object with a "status" field that should be either "approved" or "rejected." The model occasionally returns "Approved" or "needs review." What is the most robust fix?`,
        options: [
          { text: `Add an enum constraint to the schema restricting "status" to exactly the two valid lowercase values`, isCorrect: true },
          { text: `Add a sentence to the prompt saying "always use lowercase and stick to the allowed values" as a reminder`, isCorrect: false },
          { text: `Post-process the output with a string normalisation function that catches and maps known variant forms`, isCorrect: false },
          { text: `Switch to a larger model, which is statistically less likely to deviate from format instructions in the output`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A team is parsing LLM output with a regex that extracts a number from sentences like "The score is 7." After a model update, phrasing changes to "I would rate this a 7." The parser breaks. What does this illustrate?`,
        options: [
          { text: `Prose output requires fragile string matching that breaks when phrasing varies even slightly`, isCorrect: true },
          { text: `Model updates always introduce breaking changes to output format and require parser rewrites after each release`, isCorrect: false },
          { text: `Regex is an unreliable tool for any text processing task that involves extracting numbers from sentences`, isCorrect: false },
          { text: `The prompt should have specified a particular sentence template for the model to follow in all responses`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A developer wants the LLM to return a confidence score as a number between 0 and 1. The model returns values like 0.85 and "high" inconsistently. What is the most direct cause?`,
        options: [
          { text: `The prompt did not specify the data type and range, so the model alternates between interpretations of "confidence"`, isCorrect: true },
          { text: `The model lacks the arithmetic capability to produce consistent decimal outputs across repeated generation calls`, isCorrect: false },
          { text: `Confidence scores require fine-tuning to produce reliably — prompt-level instructions cannot enforce numeric output types`, isCorrect: false },
          { text: `The system prompt is intermittently overriding the user instruction on output format during the generation step`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A pipeline receives JSON from an LLM and passes it directly to a database write function. Occasionally a field is missing entirely, crashing the write. What should be added to the pipeline architecture?`,
        options: [
          { text: `Output validation between the LLM call and the database write that checks for required fields before proceeding`, isCorrect: true },
          { text: `A retry loop that re-sends the same prompt until all fields appear in the output before allowing the write`, isCorrect: false },
          { text: `A fallback prompt that asks the model to confirm its own output is complete and correct before returning it`, isCorrect: false },
          { text: `A larger context window allocation so the model has sufficient room to include all fields consistently`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'Few-shot prompting',
    questions: [
      {
        type: 'mcq',
        text: `A developer adds three examples to a classification prompt. All three examples have short, single-word labels. The model starts returning one-word labels even for classes that need two-word names. What caused this?`,
        options: [
          { text: `The examples implicitly taught the model that label length is a pattern, overriding the label names in the instructions`, isCorrect: true },
          { text: `The model cannot produce multi-word outputs when single-word outputs appear anywhere in the input context`, isCorrect: false },
          { text: `Three examples are too few to establish a reliable pattern — the model fell back to its training data defaults`, isCorrect: false },
          { text: `Few-shot examples always override explicit instructions when the two provide conflicting format signals`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A team uses few-shot prompting to classify support tickets. Examples are all drawn from January. In March, ticket phrasing and issue types shift. Accuracy drops. What is the most likely cause?`,
        options: [
          { text: `The examples no longer represent the current distribution of inputs, so the demonstrated pattern no longer fits the new data`, isCorrect: true },
          { text: `Few-shot prompting degrades over time as the model gradually forgets examples across multiple sessions`, isCorrect: false },
          { text: `The context window filled up over time, causing earlier examples to be silently dropped from the prompt`, isCorrect: false },
          { text: `Three months of distribution shift requires fine-tuning to accommodate — few-shot prompting cannot adapt to it`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Which scenario would benefit least from adding few-shot examples to a prompt?`,
        options: [
          { text: `Asking the model to return today\'s date in a specific format, where the instruction alone is unambiguous`, isCorrect: true },
          { text: `Asking the model to classify customer feedback using a non-standard internal taxonomy with many edge cases`, isCorrect: false },
          { text: `Asking the model to follow an unusual JSON structure not commonly represented in its training data`, isCorrect: false },
          { text: `Asking the model to match the tone of a specific brand voice that is difficult to describe in abstract terms`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A developer includes 40 labelled examples in a prompt for a task where 6 well-chosen examples were working fine. Response quality drops noticeably. What is the most plausible explanation?`,
        options: [
          { text: `The large example block pushes the actual task instruction toward the end of the context, where it receives less model attention`, isCorrect: true },
          { text: `LLM APIs cap the number of examples processed per call and silently truncate any excess examples provided`, isCorrect: false },
          { text: `Forty examples trigger a different model mode designed for fine-tuning rather than inference-time pattern matching`, isCorrect: false },
          { text: `The model averages across all 40 examples, blending patterns in ways that produce an incoherent output style`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'Chain of thought prompting',
    questions: [
      {
        type: 'mcq',
        text: `A developer adds "Let\'s think step by step" to a prompt asking an LLM to name the capital of France. Response time increases but accuracy does not improve. What does this illustrate?`,
        options: [
          { text: `Chain of thought adds overhead without benefit for factual recall tasks that require no multi-step reasoning`, isCorrect: true },
          { text: `Chain of thought only works when the model has been fine-tuned specifically to apply it on defined task types`, isCorrect: false },
          { text: `The phrase "let\'s think step by step" is too vague — numbered reasoning instructions are required for it to activate correctly`, isCorrect: false },
          { text: `Chain of thought degrades performance on geography questions by introducing unnecessary uncertainty into retrieval`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A model correctly states each intermediate reasoning step but arrives at a wrong final answer. What is the most accurate diagnosis?`,
        options: [
          { text: `The model failed to synthesise the intermediate steps into a correct conclusion despite sound individual reasoning`, isCorrect: true },
          { text: `Chain of thought produces hallucinated reasoning steps that do not reflect the model\'s actual internal computation`, isCorrect: false },
          { text: `The final answer token is generated independently from the reasoning tokens and always requires separate validation`, isCorrect: false },
          { text: `The model prioritised fluency in the reasoning chain over factual correctness in the concluding statement`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A product team wants Claude to reason through a complex recommendation before surfacing a conclusion to users. They do not want the reasoning steps visible in the final output. Which approach fits this requirement?`,
        options: [
          { text: `Use extended thinking or a scratchpad step that isolates reasoning from the user-facing response`, isCorrect: true },
          { text: `Add "do not show your reasoning" to the prompt, which suppresses intermediate tokens from being included in output`, isCorrect: false },
          { text: `Run chain of thought in a separate API call, then discard that output and re-prompt for a clean final answer`, isCorrect: false },
          { text: `Use a system prompt to instruct the model to reason silently, which activates an internal reasoning-only mode`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Which of the following tasks would most benefit from chain-of-thought prompting?`,
        options: [
          { text: `Determining whether a multi-condition discount applies to a specific order based on price, quantity, and membership tier`, isCorrect: true },
          { text: `Translating a product description from English to Spanish with consistent brand terminology throughout`, isCorrect: false },
          { text: `Extracting all email addresses from a block of unstructured text and returning them as a list`, isCorrect: false },
          { text: `Classifying a customer message as a complaint, question, or compliment based on its overall tone`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'What breaks a prompt',
    questions: [
      {
        type: 'mcq',
        text: `A prompt says: "Extract all action items from this meeting transcript. Be comprehensive. Keep your response under 50 words." The model returns 3 action items from a meeting that had 12. What is the primary cause of failure?`,
        options: [
          { text: `The word limit directly conflicts with the comprehensiveness instruction, forcing the model to truncate output`, isCorrect: true },
          { text: `The model lacks the ability to extract more than a few items from long transcripts in a single generation call`, isCorrect: false },
          { text: `The prompt is missing a role definition, which is required for extraction tasks to function reliably`, isCorrect: false },
          { text: `"Comprehensive" is ambiguous and the model defaulted to a conservative interpretation of the instruction`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A developer writes a detailed 900-word prompt. The model follows instructions in the final paragraph well but ignores three critical constraints stated in the middle. What is the most likely cause?`,
        options: [
          { text: `Models weight content toward the end of the prompt more heavily, causing mid-prompt instructions to be underweighted`, isCorrect: true },
          { text: `The prompt exceeded the model\'s effective instruction-following capacity, which caps at roughly 500 words`, isCorrect: false },
          { text: `The three ignored constraints were stated as suggestions rather than hard rules, so the model treated them as optional`, isCorrect: false },
          { text: `Long prompts trigger an internal summarisation mode where the model compresses and loses some instructions`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A prompt asks Claude to: "Write in a warm, approachable tone. Maintain formal academic register. Avoid contractions. Use conversational language." A team member says the output feels inconsistent. What is the actual structural problem?`,
        options: [
          { text: `The prompt contains directly conflicting style instructions that cannot be simultaneously satisfied`, isCorrect: true },
          { text: `The prompt is missing an output length constraint, which is causing the inconsistent tonal balance`, isCorrect: false },
          { text: `Listing multiple style requirements in one prompt always degrades output coherence regardless of their compatibility`, isCorrect: false },
          { text: `The model is ignoring half the instructions because four style constraints exceed its instruction-following limit`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A developer tests a prompt and gets strong results on five examples. They deploy it to production, where it fails unpredictably on real user inputs. Which explanation is most likely?`,
        options: [
          { text: `The test examples were not representative of the actual input distribution, so the prompt was never validated against real variation`, isCorrect: true },
          { text: `Model behaviour changes between testing and production environments due to different API configurations being applied`, isCorrect: false },
          { text: `Five test examples are always insufficient — production deployment requires at least 50 validated examples as a minimum`, isCorrect: false },
          { text: `The prompt worked during testing because the model cached its responses, which is not available in production`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'What a spec is and why it changes everything',
    questions: [
      {
        type: 'mcq',
        text: `A developer asks Claude to "build a dashboard for our sales team." Claude produces something that doesn\'t match what the team wanted. What is the most likely root cause?`,
        options: [
          { text: `The prompt didn\'t define who the users are, what data to show, or what actions the dashboard must support`, isCorrect: true },
          { text: `Claude requires a formal document template before it can generate UI components with any reliability`, isCorrect: false },
          { text: `Dashboards are too structurally complex for AI tools without a domain-specific pre-trained model`, isCorrect: false },
          { text: `The developer should have used Cursor instead of Claude for a UI generation task of this scope`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A junior developer says: "I\'ll just describe what I want as I go — iterating is faster than writing a spec upfront." What is the strongest counterargument?`,
        options: [
          { text: `Iterating without a spec means each round starts from unresolved assumptions, so errors compound rather than reduce`, isCorrect: true },
          { text: `AI tools require a formal spec file in a specific format before they will generate production-ready code`, isCorrect: false },
          { text: `Writing a spec takes at least a week, so skipping it only makes sense for projects under two days`, isCorrect: false },
          { text: `Iterative prompting is avoided by most engineering teams because it produces non-deterministic outputs`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Which of the following best describes what a spec does that a vague requirement does not?`,
        options: [
          { text: `It forces decisions about inputs, outputs, logic, and edge cases before any code is generated`, isCorrect: true },
          { text: `It tells the AI which programming language and framework to use for the implementation`, isCorrect: false },
          { text: `It replaces user stories so the team doesn\'t need to run a separate discovery process`, isCorrect: false },
          { text: `It guarantees that the AI\'s first output will match what the team intended without further iteration`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A team writes: "Users should be able to filter results." After three AI-generated iterations, the filter behaves differently each time. What would a spec have prevented?`,
        options: [
          { text: `Unspecified filter behaviour left the AI to interpret the requirement differently on each run`, isCorrect: true },
          { text: `The AI model was inconsistent because it lacked access to the team\'s previous conversation history across sessions`, isCorrect: false },
          { text: `Filter features require fine-tuning, not prompting, to produce stable behaviour across multiple iterations`, isCorrect: false },
          { text: `The team should have locked the random seed to get consistent outputs from the generation model`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `What distinguishes a spec from a user story?`,
        options: [
          { text: `A spec defines explicit inputs, outputs, logic, and edge cases — a user story states intent but leaves implementation undefined`, isCorrect: true },
          { text: `A spec is written by engineers while a user story is written by designers, so they serve different teams and functions`, isCorrect: false },
          { text: `A spec is only needed for backend systems — user stories are sufficient for anything with a user-facing interface`, isCorrect: false },
          { text: `User stories are more detailed than specs and are used later in the development process after architecture is set`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'The five parts of a spec',
    questions: [
      {
        type: 'mcq',
        text: `A spec for an "order cancellation feature" defines inputs, outputs, logic, and constraints — but not edge cases. Which scenario is most likely to break the AI-generated code?`,
        options: [
          { text: `A user tries to cancel an order that has already been shipped`, isCorrect: true },
          { text: `The AI misreads the output format and returns XML instead of the specified JSON structure`, isCorrect: false },
          { text: `The logic section is too short for the model to infer the complete set of cancellation rules`, isCorrect: false },
          { text: `The constraints section conflicts with the logic section and produces a runtime error in the generated code`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A team writes a spec with clear inputs and outputs but skips the logic section. What will most likely go wrong?`,
        options: [
          { text: `The AI will produce code that knows what to receive and return but has no basis for the core calculation or decision rules`, isCorrect: true },
          { text: `The AI will refuse to generate code until all five spec sections are present and non-empty in the document`, isCorrect: false },
          { text: `The output format will be incorrect because logic and output format are tightly coupled in how most models interpret specs`, isCorrect: false },
          { text: `The AI will default to the most common implementation pattern for that feature type, which is usually close enough to work`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Which of the following belongs in the constraints section of a spec rather than the logic section?`,
        options: [
          { text: `Response time must be under 200ms and no customer PII may be written to application logs`, isCorrect: true },
          { text: `If the cart total exceeds ₹5,000, apply a 10% discount before calculating the final tax amount`, isCorrect: false },
          { text: `Accept a list of product IDs and quantities as the input to the pricing calculation function`, isCorrect: false },
          { text: `Return an error object with a code and human-readable message if any input validation check fails`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A spec lists inputs and outputs for a "lead scoring" feature but omits edge cases. A learner argues: "Edge cases are optional — they only matter for unusual data." What is the problem with this view?`,
        options: [
          { text: `In production, unusual data is common — missing edge cases are where failures actually occur and erode user trust`, isCorrect: true },
          { text: `Edge cases can always be added after launch once real user behaviour reveals what they are in the wild`, isCorrect: false },
          { text: `The AI will automatically handle edge cases based on patterns in its training data, so speccing them is redundant`, isCorrect: false },
          { text: `Edge cases belong in the test plan rather than the spec and should be documented separately by the QA team`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A developer is writing a spec and is unsure whether a detail belongs in "logic" or "edge cases." Which question best helps them decide?`,
        options: [
          { text: `Is this a normal transformation the system always performs, or a condition that only applies when input is abnormal or missing?`, isCorrect: true },
          { text: `Does this detail affect the output format, or only the internal processing steps of the feature?`, isCorrect: false },
          { text: `Was this requirement raised by a product manager or an engineer, since each role owns a different section?`, isCorrect: false },
          { text: `Will this detail require a conditional statement in code, because all conditionals belong in the edge cases section?`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'Writing a spec an AI can execute',
    questions: [
      {
        type: 'mcq',
        text: `A developer writes: "Handle the payment flow correctly." Why is this hard for an AI to execute?`,
        options: [
          { text: `The instruction defines no success condition, no error states, and no expected outputs — the AI has no basis for any specific decision`, isCorrect: true },
          { text: `Payment logic requires a model fine-tuned on financial data rather than a general-purpose LLM`, isCorrect: false },
          { text: `The instruction is too short — AI tools require a minimum of three sentences per spec instruction to generate reliable code`, isCorrect: false },
          { text: `"Correctly" is a valid constraint that most AI tools interpret using training on payment industry standards`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Which of these spec instructions is most executable by an AI tool?`,
        options: [
          { text: `If the user\'s cart total exceeds ₹500, apply a 10% discount. If the user has a valid coupon code, apply it after the discount. Return the final total as an integer in paise.`, isCorrect: true },
          { text: `Make the checkout experience smooth and ensure discounts are applied where relevant to the user\'s situation`, isCorrect: false },
          { text: `Handle discounts in the checkout flow and return the correct total to the frontend component`, isCorrect: false },
          { text: `Apply discounts appropriately based on cart contents and any codes the user has entered at checkout`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A spec says "validate the form before submission." After the AI generates code, the form accepts blank required fields. What was missing from the spec?`,
        options: [
          { text: `The spec did not define which fields are required, what valid input looks like, or what to do when validation fails`, isCorrect: true },
          { text: `The AI misread "before submission" as a timing instruction rather than a functional requirement for the form`, isCorrect: false },
          { text: `Form validation requires a separate spec document from the main feature spec to avoid conflicting logic definitions`, isCorrect: false },
          { text: `The AI needed a few-shot example of a validated form before it could apply validation rules to the generated code`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A team writes a detailed, well-structured spec. The AI\'s first output is still wrong on one specific condition. What should they do first?`,
        options: [
          { text: `Identify which condition failed, check whether it was specified in the spec, and add it explicitly before re-prompting`, isCorrect: true },
          { text: `Rewrite the entire spec from scratch, since a wrong output on the first attempt indicates the spec structure is flawed`, isCorrect: false },
          { text: `Switch to a more powerful model, since wrong outputs on the first attempt indicate the current model is insufficient`, isCorrect: false },
          { text: `Add more examples to the spec until the AI produces a correct output through pattern matching on the examples`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A spec written for a human developer says "use your judgment on error handling — you know what we normally do." Why does this fail when used as-is for an AI tool?`,
        options: [
          { text: `An AI tool has no access to the team\'s conventions unless they are written down — "use your judgment" produces unpredictable results`, isCorrect: true },
          { text: `AI tools ignore any instruction that includes the phrase "use your judgment" for safety and scope reasons`, isCorrect: false },
          { text: `Error handling specs must be written in a formal schema language for AI tools to parse them reliably`, isCorrect: false },
          { text: `Human developers and AI tools use the same underlying logic, so this instruction should work equally well for both`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'Iterating when output is wrong',
    questions: [
      {
        type: 'mcq',
        text: `Claude generates code based on your spec. It handles the main flow correctly but fails when the input list is empty. What is the most efficient next step?`,
        options: [
          { text: `Add the empty list case explicitly to the spec and re-prompt, including the specific failure in your message to Claude`, isCorrect: true },
          { text: `Manually patch the generated code to handle the empty list, then move on without updating the spec`, isCorrect: false },
          { text: `Restart the conversation with a completely new prompt, since partial failures indicate a fundamentally broken spec`, isCorrect: false },
          { text: `Ask Claude to review its own output and identify all edge cases it may have missed in the generated code`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `After four iterations, the AI output still misses the same requirement you included in the spec. What is the most likely explanation?`,
        options: [
          { text: `The requirement may be positioned where the model underweights it — try moving it earlier or marking it as a hard constraint`, isCorrect: true },
          { text: `The model has a hard limit on how many requirements it can follow in a single prompt, so one will always be dropped`, isCorrect: false },
          { text: `The requirement is inherently ambiguous and should be removed from the spec entirely to simplify the prompt`, isCorrect: false },
          { text: `Four failed iterations means the task exceeds what the current generation of AI tools can reliably produce`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A developer manually fixes AI-generated code each time it has a bug, without updating the spec. What risk does this create?`,
        options: [
          { text: `The spec gap remains unfixed, so the same bug will reappear whenever that component is regenerated or modified`, isCorrect: true },
          { text: `Manual edits corrupt the model\'s internal representation of the codebase, causing future outputs to degrade`, isCorrect: false },
          { text: `The developer becomes legally responsible for any bugs in the manually edited code, removing vendor accountability`, isCorrect: false },
          { text: `Manual fixes work acceptably for bugs but not for missing features, so this approach is acceptable for bug-only issues`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A team has iterated six times and output quality has not improved. What does this most likely signal?`,
        options: [
          { text: `The spec probably has an unresolved ambiguity — clarifying inputs, outputs, or logic will likely do more than re-prompting`, isCorrect: true },
          { text: `The model being used has reached its capability ceiling and a more powerful model is the only path forward`, isCorrect: false },
          { text: `Six failed iterations is the standard threshold for concluding a task is unsuitable for AI-assisted development`, isCorrect: false },
          { text: `The team\'s prompting style is the problem — they should adopt a different prompting framework before continuing`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `You add more detail to a spec to fix a wrong output. The new output is worse than the previous one. What most likely happened?`,
        options: [
          { text: `The added detail introduced a constraint that conflicts with an existing instruction, over-constraining the task`, isCorrect: true },
          { text: `Adding detail always degrades output quality past a certain token threshold, so shorter specs are universally better`, isCorrect: false },
          { text: `The model interpreted the new detail as a correction to a different part of the spec than the one you intended`, isCorrect: false },
          { text: `More detail increases hallucination probability, so specs should always be kept to the minimum necessary length`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'Claude Projects and persistent context',
    questions: [
      {
        type: 'mcq',
        text: `A developer stores their full project architecture doc, coding conventions, and tech stack in a Claude Project. They start a new conversation and Claude immediately gives context-aware suggestions. What explains this?`,
        options: [
          { text: `Claude Projects persist uploaded files and instructions across all conversations in that project`, isCorrect: true },
          { text: `Claude automatically indexes GitHub repos linked to the account and refreshes context between sessions`, isCorrect: false },
          { text: `The model fine-tunes itself on project files after each conversation ends to improve future suggestions`, isCorrect: false },
          { text: `Claude caches the last session\'s context window for 24 hours before clearing it for the next conversation`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A team uses a Claude Project with a system prompt in their API integration. A developer asks: are these two things the same? What is the accurate distinction?`,
        options: [
          { text: `Project context persists across sessions without re-sending; a single API system prompt is scoped to one call`, isCorrect: true },
          { text: `Project context is encrypted at rest while API system prompts are stored in plain text on Anthropic servers`, isCorrect: false },
          { text: `API system prompts support more tokens than Claude Project context by a factor of four across all tiers`, isCorrect: false },
          { text: `Project context is visible to all Claude users while API system prompts are private to the individual caller`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A developer updates their codebase to use a new authentication library but forgets to update the project files in their Claude Project. Claude keeps suggesting the old library. What is the root cause?`,
        options: [
          { text: `Claude reasons from what is in its context — stale project files produce stale suggestions`, isCorrect: true },
          { text: `Claude Projects cache file contents for 72 hours before pulling the latest uploaded version automatically`, isCorrect: false },
          { text: `The model\'s training data overrides project files when a conflict between the two is detected at inference time`, isCorrect: false },
          { text: `Claude Projects only update when a new conversation thread is explicitly marked as a context refresh`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Which of the following is the most appropriate content to store in a Claude Project for a software team?`,
        options: [
          { text: `Coding conventions, architecture decisions, and constraints Claude should always respect`, isCorrect: true },
          { text: `The full git commit history exported as a text file for Claude to search during responses`, isCorrect: false },
          { text: `A personal bio of the lead developer so Claude understands who it is working with`, isCorrect: false },
          { text: `Marketing copy and brand guidelines so Claude stays on-brand across all outputs from the project`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A developer relies on a Claude Project to maintain context and stops re-explaining their stack in every conversation. Three weeks later, Claude gives advice that contradicts a recent architectural decision. What most likely went wrong?`,
        options: [
          { text: `The project files were not updated to reflect the new decision — Claude has no automatic sync`, isCorrect: true },
          { text: `Claude Projects expire after 14 days and silently reset to their default context configuration`, isCorrect: false },
          { text: `The new decision conflicted with Claude\'s training data, which took precedence over the project files`, isCorrect: false },
          { text: `Claude Project context is only applied to the first message in each new conversation thread`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'What Claude is great at vs where to be careful',
    questions: [
      {
        type: 'mcq',
        text: `A developer asks Claude to draft an authentication module. The code looks clean and compiles without errors. What is the most important next step before merging?`,
        options: [
          { text: `Test edge cases manually and run a security-focused review — clean compilation does not confirm correct logic`, isCorrect: true },
          { text: `Ask Claude to review its own output for bugs before treating it as production-ready code`, isCorrect: false },
          { text: `Check whether the code uses the same library versions as the rest of the project throughout`, isCorrect: false },
          { text: `Run a spell-check on variable names and comments to ensure the team\'s style guide is met`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A startup uses Claude to generate product descriptions for a niche medical device category. Outputs are fluent and confident. What risk is most likely being underestimated?`,
        options: [
          { text: `Claude may produce plausible but factually incorrect claims about the device\'s capabilities`, isCorrect: true },
          { text: `Claude\'s outputs will be flagged automatically by Anthropic\'s content filters for medical product content`, isCorrect: false },
          { text: `The descriptions will be too technical for general consumers to understand despite sounding confident`, isCorrect: false },
          { text: `Claude will refuse to write product copy if the product category requires regulatory approval to sell`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Which of the following tasks should a developer delegate to Claude with the least need for deep review?`,
        options: [
          { text: `Reformatting a JSON config file to match a new schema with documented field mappings`, isCorrect: true },
          { text: `Implementing OAuth2 token refresh logic for a production user authentication flow`, isCorrect: false },
          { text: `Deciding which third-party payment provider best fits the team\'s compliance requirements`, isCorrect: false },
          { text: `Writing the core retry logic for a distributed job queue that handles financial transactions`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A developer notices Claude expresses high confidence in a recommended database query optimisation. They merge it without testing. The query returns correct results in staging but corrupts data in production. What does this illustrate?`,
        options: [
          { text: `Claude\'s confidence signals reflect fluency, not verified correctness — review cannot be skipped`, isCorrect: true },
          { text: `Claude is reliable in staging environments but not calibrated for production-scale data volumes`, isCorrect: false },
          { text: `The developer should have used a more capable model for database optimisation tasks specifically`, isCorrect: false },
          { text: `Query optimisation is outside Claude\'s training distribution and should always be avoided as a task category`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A team correctly identifies that Claude is strong at restructuring existing code. Which scenario best fits that strength?`,
        options: [
          { text: `Refactoring a working module to follow a new naming convention the team has documented`, isCorrect: true },
          { text: `Auditing a legacy codebase to identify all security vulnerabilities without requiring human follow-up`, isCorrect: false },
          { text: `Determining whether a proposed system architecture will meet future scaling requirements`, isCorrect: false },
          { text: `Writing net-new business logic for a domain Claude has never seen examples of in prior context`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'What Cursor is and why it is different',
    questions: [
      {
        type: 'mcq',
        text: `A developer switches from pasting code into Claude\'s browser interface to using Cursor. Which capability does Cursor provide that the browser interface does not?`,
        options: [
          { text: `AI suggestions that reference symbols, imports, and structure across the entire indexed codebase`, isCorrect: true },
          { text: `Access to a more powerful underlying model than the one available via claude.ai for equivalent tasks`, isCorrect: false },
          { text: `The ability to run prompts without an internet connection using a locally cached model`, isCorrect: false },
          { text: `A higher token limit per request than any Claude API tier currently supports for browser users`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A developer uses Cursor\'s Cmd+K inline edit on a 30-line function. What does this action do?`,
        options: [
          { text: `Triggers an AI-powered edit targeted at that specific code section without switching to a separate chat`, isCorrect: true },
          { text: `Opens a full project-wide refactor that applies the change across all files in the repository`, isCorrect: false },
          { text: `Sends the function to Cursor\'s cloud for asynchronous review and returns suggestions by email notification`, isCorrect: false },
          { text: `Runs the function in a sandboxed environment and reports runtime errors back directly to the editor`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A team lead argues that Cursor\'s codebase indexing makes code review unnecessary because the AI understands the full project. What is wrong with this reasoning?`,
        options: [
          { text: `Indexing gives the AI structural awareness — it does not verify correctness or replace developer judgment`, isCorrect: true },
          { text: `Cursor\'s index only covers files modified in the last 30 days, so older code is excluded from its context`, isCorrect: false },
          { text: `Codebase indexing is a paid feature unavailable to most teams at the startup stage`, isCorrect: false },
          { text: `The indexed codebase is sent to a third-party server, making review a compliance requirement in most jurisdictions`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A developer is working on a large monorepo and uses Cursor\'s @codebase feature in a prompt. What does this let them do?`,
        options: [
          { text: `Reference specific files or symbols from across the indexed project directly within their prompt`, isCorrect: true },
          { text: `Automatically merge all open pull requests that have passed CI before continuing the session`, isCorrect: false },
          { text: `Export the entire codebase as a single text file to paste into a separate Claude conversation`, isCorrect: false },
          { text: `Sync local file changes to a remote Cursor workspace shared with the rest of the team in real time`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A junior developer argues that using Cursor means they no longer need to understand the code it generates, since the AI can explain any part on demand. What is the most accurate response?`,
        options: [
          { text: `Understanding the code is still required — accepting changes without comprehension creates compounding technical debt`, isCorrect: true },
          { text: `This is correct for isolated components, but not for code that touches shared state or databases`, isCorrect: false },
          { text: `Cursor includes a built-in comprehension check that flags when a developer approves code too quickly`, isCorrect: false },
          { text: `The argument holds when the developer can reproduce the AI\'s explanation back to a teammate accurately`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'Reviewing AI-written code',
    questions: [
      {
        type: 'mcq',
        text: `A developer reviews a React component generated by Claude. It renders correctly in the browser and handles the happy path. What category of issue is most likely still unexamined?`,
        options: [
          { text: `Edge cases — null props, empty arrays, network errors, and unexpected input types`, isCorrect: true },
          { text: `Import statements — AI tools frequently reference libraries that do not exist in npm registries`, isCorrect: false },
          { text: `Variable naming — models default to single-letter names that fail standard linting rules`, isCorrect: false },
          { text: `Component structure — AI consistently generates class components rather than functional ones`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Claude generates a utility function and the developer\'s primary review question is: "Is this well-commented?" What more important question should they be asking first?`,
        options: [
          { text: `Does this do what I intended, or only what I literally wrote in the prompt?`, isCorrect: true },
          { text: `Does this function use the most performant algorithm available for this input size?`, isCorrect: false },
          { text: `Would a senior developer approve this code in a pull request without modification?`, isCorrect: false },
          { text: `Does this match the style of the surrounding codebase in terms of spacing and syntax?`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A developer asks Claude to add input validation to an existing API endpoint. Claude adds validation for the fields mentioned in the prompt but not for three other fields on the same endpoint. What does this illustrate?`,
        options: [
          { text: `Claude validates what is specified — gaps in the prompt produce gaps in the output`, isCorrect: true },
          { text: `Claude deprioritises validation tasks because they are lower complexity than feature code generation`, isCorrect: false },
          { text: `The existing endpoint structure confused Claude into treating unmentioned fields as read-only by default`, isCorrect: false },
          { text: `Input validation requires few-shot examples to trigger complete coverage in Claude\'s generated output`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `During code review, a developer finds that Claude used an unfamiliar third-party library for a task the team\'s existing utilities already handle. What should the developer do?`,
        options: [
          { text: `Evaluate whether the library is maintained and whether the existing utility should be used instead`, isCorrect: true },
          { text: `Accept it since Claude selected it — the model optimises for best-in-class dependencies during code generation`, isCorrect: false },
          { text: `Rewrite the entire function from scratch to avoid any dependency Claude introduced in the output`, isCorrect: false },
          { text: `Check whether the library appears in the project\'s package.json before making any further decision`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A team runs their full unit test suite on AI-generated code and all tests pass. A team member argues the code is fully reviewed. What is the strongest counterargument?`,
        options: [
          { text: `Tests only cover what was written — edge cases outside the test suite remain unverified`, isCorrect: true },
          { text: `Unit tests cannot detect performance regressions introduced by AI-generated algorithms`, isCorrect: false },
          { text: `The team should run integration tests first, since unit tests are insufficient as the primary review mechanism for AI output`, isCorrect: false },
          { text: `Passing tests confirms functional correctness but not compliance with the team\'s style guide`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'Agentic tasks in Claude Code',
    questions: [
      {
        type: 'mcq',
        text: `What distinguishes Claude Code from using Claude in a web browser for a coding task?`,
        options: [
          { text: `Claude Code is a CLI agent that directly reads files, runs commands, and edits code in your actual repo`, isCorrect: true },
          { text: `Claude Code uses a larger context window than claude.ai due to a separate API tier for CLI users`, isCorrect: false },
          { text: `Claude Code responses are faster because they bypass the standard Anthropic rate-limiting layer`, isCorrect: false },
          { text: `Claude Code operates offline by caching model weights locally during the installation process`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A developer runs Claude Code on a refactor task and approves each step quickly without reading the diffs. The build breaks. What is the most accurate diagnosis?`,
        options: [
          { text: `The developer did not review changes before approving — agentic tools make real edits that require scrutiny`, isCorrect: true },
          { text: `Claude Code is unreliable for refactor tasks and should only be used for greenfield file creation`, isCorrect: false },
          { text: `The build broke because Claude Code does not run tests before finalising multi-file changes automatically`, isCorrect: false },
          { text: `The developer should have used Cursor instead, which provides safer sandboxed edits by default`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Which type of task is Claude Code best suited for?`,
        options: [
          { text: `Bounded, well-specified tasks with clear success criteria — like reformatting files or adding a documented feature`, isCorrect: true },
          { text: `Open-ended architectural decisions that require weighing long-term tradeoffs across the entire codebase`, isCorrect: false },
          { text: `Real-time pair programming where the developer describes goals verbally without a written spec`, isCorrect: false },
          { text: `Tasks that require judgment calls about which requirements to prioritise when they conflict with each other`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `After Claude Code completes a multi-step task, a developer\'s tests fail. What is the correct first step?`,
        options: [
          { text: `Inspect which files were changed and trace the logic of each change before re-running anything`, isCorrect: true },
          { text: `Revert all changes immediately — any test failure means Claude Code made a fundamental error`, isCorrect: false },
          { text: `Ask Claude Code to fix the failing tests, since it has full context on the changes it made`, isCorrect: false },
          { text: `Switch to a more capable model and rerun the same task with the original instructions unchanged`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A developer treats Claude Code\'s output as equivalent to output from a senior engineer and merges it directly to main. What is the most significant risk?`,
        options: [
          { text: `Bugs and unintended changes reach production without the human oversight that agentic autonomy requires`, isCorrect: true },
          { text: `The senior engineers on the team may feel undervalued and disengage from the review process over time`, isCorrect: false },
          { text: `Claude Code\'s output is non-deterministic, so the same code may behave differently on each execution run`, isCorrect: false },
          { text: `Anthropic\'s terms of service require human review before AI-generated code is deployed to production`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'Why LLMs have no memory by default',
    questions: [
      {
        type: 'mcq',
        text: `A user chats with a support bot for 20 minutes, resolves their issue, then returns the next day and asks a follow-up. The bot has no idea what they discussed. What is the most accurate explanation?`,
        options: [
          { text: `The bot\'s session cache expired after the conversation ended and was cleared from the server`, isCorrect: false },
          { text: `LLMs process only what is in the current context window — prior sessions are invisible unless explicitly included`, isCorrect: true },
          { text: `The model was reset to a base checkpoint after the first conversation ended to free compute resources`, isCorrect: false },
          { text: `The API rate-limited the session and cleared history to free capacity for concurrent users`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A developer says: "Our LLM is stateless, so it forgets everything mid-conversation." What is wrong with this statement?`,
        options: [
          { text: `Stateless models can retain mid-conversation context if the server caches it between turns automatically`, isCorrect: false },
          { text: `Stateless refers to cross-call independence — messages within one call are all visible to the model`, isCorrect: true },
          { text: `Statelessness only applies to fine-tuned models, not to foundation models served via API`, isCorrect: false },
          { text: `The model retains some mid-conversation state through its attention mechanism between generation steps`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A product team wants their chatbot to refer back to what a user said three turns ago. Which mechanism actually makes this possible?`,
        options: [
          { text: `Enabling persistent memory mode in the API settings dashboard for the deployment`, isCorrect: false },
          { text: `Increasing the model\'s parameter count to improve recall capacity across longer conversations`, isCorrect: false },
          { text: `Including all prior turns as part of the current API request payload`, isCorrect: true },
          { text: `Using a more recent model version with built-in session awareness across separate calls`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `An engineer stores a summary of each session and injects it at the start of the next one. Compared to replaying full conversation history, what is the main tradeoff?`,
        options: [
          { text: `Summaries consume more tokens than raw history on average, negating the context efficiency benefit`, isCorrect: false },
          { text: `Fine detail and exact phrasing from prior turns may be lost in the summary`, isCorrect: true },
          { text: `The model refuses to accept pre-session summaries in the system prompt position`, isCorrect: false },
          { text: `Summaries require fine-tuning before the model can interpret them correctly at session start`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Which of the following would NOT solve the problem of an LLM forgetting earlier user preferences across sessions?`,
        options: [
          { text: `Storing user preferences in a database and injecting them into each new session at start`, isCorrect: false },
          { text: `Including relevant preference fields in the system prompt at the beginning of each session`, isCorrect: false },
          { text: `Sending the model a reminder message early in each new conversation with key preferences listed`, isCorrect: false },
          { text: `Relying on the model to recall preferences because it saw them in prior training data`, isCorrect: true },
        ],
      },
    ],
  },
  {
    subtopic: 'Three ways to give an LLM context',
    questions: [
      {
        type: 'mcq',
        text: `A legal assistant product must always cite sources, refuse out-of-scope questions, and use formal language — regardless of what users say. Which context mechanism is best suited for enforcing this?`,
        options: [
          { text: `Few-shot examples embedded in each user message at runtime to demonstrate the expected behaviour`, isCorrect: false },
          { text: `A system prompt that sets behaviour and constraints for the session`, isCorrect: true },
          { text: `Retrieval of a policy document injected after each user turn to reinforce the rules`, isCorrect: false },
          { text: `Conversation history showing prior compliant responses as implicit examples for the model to follow`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A knowledge base has 8,000 pages of documentation. A user asks a narrow technical question. What is the primary reason to use retrieval rather than putting everything in the system prompt?`,
        options: [
          { text: `System prompts cannot contain technical content by design and will be rejected if they include it`, isCorrect: false },
          { text: `Retrieval lets you inject only relevant passages, avoiding context window overflow`, isCorrect: true },
          { text: `Retrieval always produces more accurate answers than direct prompt injection for factual queries`, isCorrect: false },
          { text: `System prompts degrade in quality when they exceed one paragraph in length per the model architecture`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Conversation history grows with every user turn. At what point does this become a practical problem for a deployed chatbot?`,
        options: [
          { text: `After the 10th message, when the model starts ignoring earlier context systematically`, isCorrect: false },
          { text: `When total history length approaches the context window limit and must be truncated`, isCorrect: true },
          { text: `Once history includes more than one distinct topic, causing the model to mix answers across threads`, isCorrect: false },
          { text: `When users revisit a question already answered earlier in the same conversation session`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A customer service bot needs to maintain a consistent brand persona AND access 5,000 support articles. Which combination of context mechanisms handles both requirements?`,
        options: [
          { text: `Conversation history for persona, fine-tuning for article access at query time`, isCorrect: false },
          { text: `System prompt for persona and constraints, retrieval for relevant articles per query`, isCorrect: true },
          { text: `Few-shot examples for persona, full knowledge base injected into conversation history`, isCorrect: false },
          { text: `Fine-tuning for persona, system prompt for article injection at session startup`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A developer argues: "We use a system prompt and conversation history, so we have twice the context budget." What is wrong with this reasoning?`,
        options: [
          { text: `System prompts and conversation history use separate token pools that do not interact with each other`, isCorrect: false },
          { text: `Only conversation history counts toward the context window — system prompts are handled separately`, isCorrect: false },
          { text: `Both system prompt and conversation history draw from the same context window limit`, isCorrect: true },
          { text: `System prompts are compressed before being added, so they consume fewer tokens than their raw length suggests`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'What RAG actually is in practice',
    questions: [
      {
        type: 'mcq',
        text: `A RAG system retrieves three relevant policy paragraphs and passes them to an LLM. The LLM\'s final response contains a detail that appears in none of the three paragraphs. What most likely happened?`,
        options: [
          { text: `The retrieval step returned a fourth hidden document not shown to the user in the interface`, isCorrect: false },
          { text: `The model hallucinated — RAG reduces but does not eliminate model-generated errors`, isCorrect: true },
          { text: `The embedding model retrieved paragraphs from the wrong knowledge base index`, isCorrect: false },
          { text: `The LLM synthesised across paragraphs in a way that introduced new meaning not present in any source`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A RAG-powered chatbot answers some queries correctly and others incorrectly. Where should a developer look first to diagnose the failures?`,
        options: [
          { text: `The LLM\'s temperature setting, which may be set too high for factual queries in this deployment`, isCorrect: false },
          { text: `The system prompt, which may be overriding the retrieved content in ways not visible in the output`, isCorrect: false },
          { text: `The retrieval step — wrong documents being fetched cause downstream wrong answers`, isCorrect: true },
          { text: `The chunking strategy, which is always the root cause of inconsistent RAG output in production`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `An engineer splits documents into 50-word chunks to maximise retrieval precision. What risk does this introduce?`,
        options: [
          { text: `The vector index will reject chunks below a minimum token threshold required by the embedding model`, isCorrect: false },
          { text: `Individual chunks may lack enough surrounding context to answer multi-part questions`, isCorrect: true },
          { text: `Smaller chunks always produce lower cosine similarity scores across the board during retrieval`, isCorrect: false },
          { text: `The LLM will treat short chunks as incomplete and refuse to synthesise answers from them`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A RAG system retrieves the correct documents but still returns a wrong answer. Fine-tuning is proposed as the fix. When would fine-tuning actually address this failure mode?`,
        options: [
          { text: `When the retrieved documents are ambiguous and the model needs domain-specific interpretation to reason over them`, isCorrect: true },
          { text: `When the retrieval index contains outdated versions of the source documents that need refreshing`, isCorrect: false },
          { text: `When the chunk size is mismatched with the average query length in the dataset being served`, isCorrect: false },
          { text: `When the embedding model was trained on a different language than the documents in the index`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A team replaces their keyword search retrieval with embedding-based retrieval. A user searches "cancellation terms" and the system now returns the refund policy document, which was previously not surfaced. What does this illustrate?`,
        options: [
          { text: `Embedding-based retrieval eliminates all cases where relevant documents are missed in production`, isCorrect: false },
          { text: `Keyword search is always inferior to embedding-based retrieval for legal and policy documents`, isCorrect: false },
          { text: `Semantic similarity allowed a conceptually related document to match without shared keywords`, isCorrect: true },
          { text: `The keyword index was corrupted, which is why the refund policy was previously missing from results`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'Chaining prompts and when memory matters',
    questions: [
      {
        type: 'mcq',
        text: `A pipeline extracts key facts from a document, then classifies each fact, then drafts a summary. The summary is wrong. What is the most efficient first debugging step?`,
        options: [
          { text: `Rewrite the final summarisation prompt with more explicit instructions about the desired output`, isCorrect: false },
          { text: `Inspect the output of the classification step to see if the inputs to summarisation are correct`, isCorrect: true },
          { text: `Switch to a more powerful model for the entire pipeline to reduce compounding errors across steps`, isCorrect: false },
          { text: `Merge the classification and summarisation steps into one prompt to simplify the overall flow`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `When is it better to use a single LLM call rather than a chained multi-step workflow?`,
        options: [
          { text: `When the task involves more than 500 output tokens, which chains handle poorly at that length`, isCorrect: false },
          { text: `When the task is well-defined, needs no intermediate branching, and one prompt fully specifies it`, isCorrect: true },
          { text: `When you want to reduce hallucination, since single calls are inherently more accurate than chained ones`, isCorrect: false },
          { text: `When the input data is structured, since chains are designed only for unstructured input processing`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Step 2 of a three-step chain outputs a numbered list. Step 3 expects a JSON array. What problem will this cause, and where should it be fixed?`,
        options: [
          { text: `Step 3 will silently reformat the list, producing correct output but with increased latency`, isCorrect: false },
          { text: `The mismatch will cause step 3 to fail or produce garbage; the fix is at step 2\'s output format`, isCorrect: true },
          { text: `The model will raise a schema validation error and halt the entire pipeline automatically`, isCorrect: false },
          { text: `The list will be interpreted as valid JSON because numbered items resemble array syntax`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A simple internal tool answers employee HR questions using a static policy document updated quarterly. What is the most appropriate memory architecture?`,
        options: [
          { text: `A vector database with continuous ingestion of every policy update in real time as documents change`, isCorrect: false },
          { text: `Fine-tuning the model quarterly to embed the latest policy version directly into its weights`, isCorrect: false },
          { text: `Full conversation history storage in a database to track every employee query across all sessions`, isCorrect: false },
          { text: `A static system prompt containing the current policy, refreshed on each quarterly update`, isCorrect: true },
        ],
      },
      {
        type: 'mcq',
        text: `A fitness app stores each user\'s goals and restrictions in a structured database and injects relevant fields into every session. Why is this preferable to storing full conversation transcripts?`,
        options: [
          { text: `Databases cannot store unstructured conversation text, making full transcript storage technically infeasible`, isCorrect: false },
          { text: `Transcripts consume more storage, which increases API costs per query significantly over time`, isCorrect: false },
          { text: `Structured fields are easier to update, query, and inject selectively without bloating context`, isCorrect: true },
          { text: `Full transcripts cause the model to prioritise older interactions over more recent ones in the session`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'What a workflow is',
    questions: [
      {
        type: 'mcq',
        text: `A system takes raw customer feedback, runs sentiment analysis on each entry, filters negatives, and logs them to a support queue. Which description best fits this system?`,
        options: [
          { text: `A fine-tuned model pipeline where each layer handles a different classification task in sequence`, isCorrect: false },
          { text: `A RAG system that retrieves relevant responses based on feedback content and routes accordingly`, isCorrect: false },
          { text: `A workflow — a sequence of discrete steps transforming input to a structured output`, isCorrect: true },
          { text: `A single-call LLM system with a multi-task prompt covering all operations at once`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A workflow includes steps for calling an external pricing API, running LLM classification, and writing results to a database. A junior developer argues the API call is not really part of the AI workflow. Why are they wrong?`,
        options: [
          { text: `External API calls always require a separate AI model to interpret and validate their output`, isCorrect: false },
          { text: `Non-AI steps like API calls and database writes are legitimate, expected parts of AI workflows`, isCorrect: true },
          { text: `Calling external APIs introduces latency that invalidates the reliability of the workflow\'s AI outputs`, isCorrect: false },
          { text: `The pricing API call should be handled by a fine-tuned model rather than a third-party service`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `What is the main operational advantage of breaking a workflow into discrete, single-responsibility steps?`,
        options: [
          { text: `Each step can use a different programming language, improving flexibility across the development team`, isCorrect: false },
          { text: `Fewer API calls are made overall, which reduces total latency across the entire pipeline`, isCorrect: false },
          { text: `Each step can be tested, debugged, and replaced without touching the rest of the workflow`, isCorrect: true },
          { text: `Discrete steps allow the workflow to run in parallel by default without extra configuration`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A team defines their workflow as: ingest → clean → classify → store → notify. The cleaning step is done by a deterministic Python function, not an LLM. Is this valid?`,
        options: [
          { text: `No — every step in an AI workflow must involve a model call to qualify as a workflow`, isCorrect: false },
          { text: `No — deterministic steps should be handled in a separate preprocessing pipeline instead`, isCorrect: false },
          { text: `Yes — workflows can and often should combine deterministic logic with model calls`, isCorrect: true },
          { text: `Yes — but only if the deterministic step is wrapped in an LLM prompt for consistency across the pipeline`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A workflow has been running in production for three months. The team stops monitoring it because it passed all pre-launch tests. What risk does this create?`,
        options: [
          { text: `Pre-launch tests become invalid after 90 days due to model version drift in the underlying provider`, isCorrect: false },
          { text: `The workflow may silently degrade if upstream data formats, APIs, or model behaviour shift`, isCorrect: true },
          { text: `Unmonitored workflows consume more API tokens over time due to gradual prompt expansion`, isCorrect: false },
          { text: `The workflow will eventually route all requests to the fallback step if left unmonitored`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'Single call vs multi-step decisions',
    questions: [
      {
        type: 'mcq',
        text: `A user asks a chatbot to translate a single sentence from Spanish to English. Which approach is correct?`,
        options: [
          { text: `Multi-step: detect language first, then translate, then verify the output quality in a third call`, isCorrect: false },
          { text: `Single call — the task is fully specified and needs no intermediate verification`, isCorrect: true },
          { text: `Multi-step: translation always benefits from a second LLM call to check fluency before returning`, isCorrect: false },
          { text: `Single call, but only if the model has been fine-tuned on translation examples for this language pair`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A pipeline must analyse 40 customer interviews, identify recurring themes, rank themes by frequency, and draft one positioning statement per theme. Why does this require multiple steps?`,
        options: [
          { text: `One prompt cannot accept more than 10 documents at a time due to standard API input constraints`, isCorrect: false },
          { text: `Each sub-task produces an output that the next step depends on and should verify independently`, isCorrect: true },
          { text: `LLMs are unreliable at synthesis tasks, so each theme needs a human review checkpoint before proceeding`, isCorrect: false },
          { text: `The ranking step requires a deterministic algorithm that LLMs cannot perform at any scale`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A team is deciding between one LLM call and a three-step chain for a new feature. What is the most useful question to ask?`,
        options: [
          { text: `How many output tokens does the task typically require in a standard response?`, isCorrect: false },
          { text: `Does any intermediate output need to be inspected, stored, or used to branch logic?`, isCorrect: true },
          { text: `How complex does the task description sound when written out in plain English?`, isCorrect: false },
          { text: `Which approach will be faster to implement given the team\'s current codebase structure?`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A team uses three LLM calls where one would work. What is the most likely consequence?`,
        options: [
          { text: `Output quality improves automatically because each step refines and corrects the previous result`, isCorrect: false },
          { text: `The workflow becomes harder to debug and adds latency without a quality benefit`, isCorrect: true },
          { text: `Token costs decrease because shorter focused prompts are more efficient than long single ones`, isCorrect: false },
          { text: `The pipeline becomes more robust because errors in one step are caught by the next step`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A single LLM prompt produces a report that is almost right but consistently misformats one section. What should the team try before converting to a multi-step workflow?`,
        options: [
          { text: `Switch to a more powerful model, since formatting failures indicate a capability ceiling`, isCorrect: false },
          { text: `Refine the prompt\'s output format instructions and add a concrete formatting example`, isCorrect: true },
          { text: `Add a second LLM call to reformat the output, since prompts cannot enforce structure alone`, isCorrect: false },
          { text: `Accept the formatting issue, since converting to multi-step will introduce new failure points`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'Tools, models, and debugging orchestration',
    questions: [
      {
        type: 'mcq',
        text: `An LLM in a workflow needs to determine whether a submitted order date falls within a valid return window. The model lacks access to today\'s date. What is the correct fix?`,
        options: [
          { text: `Include a static date in the system prompt and update it manually each day before the pipeline runs`, isCorrect: false },
          { text: `Fine-tune the model on recent date-handling examples to improve its temporal reasoning capability`, isCorrect: false },
          { text: `Provide a tool the model can call to retrieve the current date at inference time`, isCorrect: true },
          { text: `Use a different model version trained more recently so it has a later knowledge cutoff date`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A workflow uses an expensive, powerful model for every step, including simple data extraction from structured CSVs. What is the most direct problem with this design?`,
        options: [
          { text: `Powerful models perform worse on structured data extraction than lightweight models by design`, isCorrect: false },
          { text: `The workflow will exceed rate limits because powerful models have lower throughput caps per tier`, isCorrect: false },
          { text: `Simple extraction tasks don\'t justify the cost and latency of a high-capability model`, isCorrect: true },
          { text: `Using one model across all steps prevents the workflow from scaling horizontally under load`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A five-step workflow produces an incorrect final output. A developer reruns the entire pipeline with a different model for every step to find the failure. Why is this a poor debugging strategy?`,
        options: [
          { text: `Changing the model invalidates the original workflow design and requires re-testing the full system`, isCorrect: false },
          { text: `Rerunning the full pipeline multiplies cost without isolating which step is responsible`, isCorrect: true },
          { text: `A different model may produce correct output by chance, masking the real underlying bug`, isCorrect: false },
          { text: `Full pipeline reruns always time out on workflows with more than three steps in sequence`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Step 4 of a workflow occasionally returns a string where the next step expects an integer, causing a crash. The team fixes this by updating the step 4 prompt. Two weeks later the bug recurs. What is a more durable fix?`,
        options: [
          { text: `Replace step 4 with a deterministic function that always returns the correct data type`, isCorrect: false },
          { text: `Add a type validation layer between step 4 and step 5 that catches and retries on bad output`, isCorrect: true },
          { text: `Switch step 5 to a model that is more tolerant of type mismatches in its input data`, isCorrect: false },
          { text: `Merge steps 4 and 5 so the type conversion happens inside a single prompt invocation`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A workflow was deployed after thorough testing. Three weeks later, an upstream API changes its response format. The workflow silently produces wrong outputs for five days before anyone notices. What practice would have caught this sooner?`,
        options: [
          { text: `Running more extensive pre-launch integration tests covering all possible API response shapes`, isCorrect: false },
          { text: `Monitoring output quality and setting alerts on schema validation failures at each step boundary`, isCorrect: true },
          { text: `Using a more powerful model that can adapt to upstream format changes automatically at inference time`, isCorrect: false },
          { text: `Building the workflow with only internal data sources to eliminate external API dependencies entirely`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'The full funnel from ad to conversion',
    questions: [
      {
        type: 'mcq',
        text: `A D2C brand sees 50,000 impressions, 1,500 clicks, 300 product page views, 45 add-to-carts, and 9 purchases in a week. Which stage has the sharpest drop-off?`,
        options: [
          { text: `Product page to add-to-cart: 300 views yielding 45 carts is a 15% conversion, the lowest rate in the funnel`, isCorrect: false },
          { text: `Impressions to clicks: 1,500 clicks from 50,000 impressions is a 3% CTR, which is below average for Meta`, isCorrect: false },
          { text: `Add-to-cart to purchase: 9 purchases from 45 carts is a 20% checkout conversion, which signals friction`, isCorrect: false },
          { text: `Clicks to product page views: losing 1,200 of 1,500 clicks before the page loads suggests a landing page load issue`, isCorrect: true },
        ],
      },
      {
        type: 'mcq',
        text: `A brand fixes its checkout flow and purchase rate rises from 1.5% to 3%. CTR and add-to-cart rate stay the same. What is the most accurate description of what happened?`,
        options: [
          { text: `The brand improved top-of-funnel performance by making the ad more compelling to the right audience segment`, isCorrect: false },
          { text: `The brand resolved a bottom-of-funnel bottleneck without changing anything upstream in the funnel`, isCorrect: true },
          { text: `The brand improved mid-funnel performance by making the product page more persuasive to arriving visitors`, isCorrect: false },
          { text: `The brand increased overall traffic volume, which statistically raised the number of completed purchases`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Two campaigns run simultaneously. Campaign A has a 4% CTR and 1% purchase rate. Campaign B has a 1.5% CTR and 4% purchase rate. Which campaign deserves more budget?`,
        options: [
          { text: `Campaign A, because a 4% CTR proves the creative is resonating strongly and driving qualified traffic`, isCorrect: false },
          { text: `Campaign B, because higher purchase rate means the audience it reaches converts efficiently once they arrive`, isCorrect: true },
          { text: `Campaign A, because CTR is the leading indicator and purchase rate will improve once volume increases`, isCorrect: false },
          { text: `Campaign B, because a lower CTR signals the ad is selective and therefore reaching a more targeted audience`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A brand\'s funnel shows strong metrics at every stage except add-to-cart rate, which dropped from 9% to 3% this week. The team is debating whether to pause ads or relaunch creatives. What should they do first?`,
        options: [
          { text: `Pause all ad spend immediately, since a drop of this size signals audience fatigue and wasted budget`, isCorrect: false },
          { text: `Audit the product page for changes — a drop isolated to ATC rate points to the page, not the ad or audience`, isCorrect: true },
          { text: `Relaunch ad creatives with stronger offers, since product page conversion depends on ad-driven intent quality`, isCorrect: false },
          { text: `Lower the price by 15% temporarily, since ATC drop-offs are most commonly caused by price sensitivity`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A brand has stable impressions and CTR week-over-week but revenue dropped 35%. Which funnel stage should the team examine first?`,
        options: [
          { text: `Top-of-funnel — stable impressions may be masking a shift in audience quality not visible in CTR alone`, isCorrect: false },
          { text: `The ad creative — CTR stability could reflect habit clicks rather than genuine purchase intent from new audiences`, isCorrect: false },
          { text: `Mid-to-bottom funnel — stable traffic with falling revenue means conversion or checkout is breaking down`, isCorrect: true },
          { text: `The product catalogue — a revenue drop with stable traffic often reflects inventory issues reducing average order value`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'Top-of-funnel metrics: hook rate, CTR, CPM',
    questions: [
      {
        type: 'mcq',
        text: `An ad gets 80,000 impressions, 2,400 three-second video views, and 960 clicks. What is the hook rate?`,
        options: [
          { text: `1.2%, calculated by dividing clicks by impressions across the full campaign window`, isCorrect: false },
          { text: `40%, calculated by dividing clicks by three-second views to show post-hook engagement`, isCorrect: false },
          { text: `3%, calculated by dividing three-second views by total impressions`, isCorrect: true },
          { text: `4%, calculated by dividing clicks by impressions to measure overall ad engagement rate`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Campaign A has a CPM of ₹150 and a CTR of 0.8%. Campaign B has a CPM of ₹350 and a CTR of 2.1%. Assuming equal conversion rates downstream, which campaign delivers a lower cost per click?`,
        options: [
          { text: `Campaign A, because its lower CPM means each impression costs less regardless of how often people click`, isCorrect: false },
          { text: `Campaign B, because the higher CTR more than offsets the higher cost per thousand impressions`, isCorrect: true },
          { text: `Campaign A, because CPM is the primary driver of total spend and a lower CPM always reduces cost per click`, isCorrect: false },
          { text: `They are equivalent, because a proportionally higher CTR always cancels out a proportionally higher CPM`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A brand\'s hook rate drops from 6% to 2% week-over-week with no change in targeting or budget. CTR remains stable. What is the most likely explanation?`,
        options: [
          { text: `The audience has become more expensive to reach, driving up CPM and reducing how often the ad is shown`, isCorrect: false },
          { text: `The landing page is loading slowly, causing users to drop off before the platform registers a view`, isCorrect: false },
          { text: `The first three seconds of the creative are no longer stopping the scroll, but those who do watch are still clicking`, isCorrect: true },
          { text: `Ad frequency has increased and users are skipping the opening frames after recognising the format`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A Meta campaign has a CPM of ₹500 and generates 200 clicks per ₹10,000 spent. What is the CTR?`,
        options: [
          { text: `0.5%, calculated by dividing clicks by spend in rupees and adjusting for the cost per impression`, isCorrect: false },
          { text: `2%, calculated by dividing 200 clicks by 10,000 impressions reached at the stated CPM`, isCorrect: true },
          { text: `1%, calculated by dividing total clicks by total spend to arrive at a cost-normalised engagement rate`, isCorrect: false },
          { text: `4%, calculated by dividing CPM by clicks and multiplying by the campaign efficiency coefficient`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A brand improves hook rate from 2% to 7% by recutting the video opening. CTR stays flat at 1.2%. What does this mean for top-of-funnel efficiency?`,
        options: [
          { text: `Top-of-funnel improved significantly — more people are engaging with the full ad, which will raise conversions downstream`, isCorrect: false },
          { text: `The improvement is irrelevant since CTR, not hook rate, determines how many people visit the product page`, isCorrect: false },
          { text: `More people are watching past three seconds but the same proportion of total impressions are clicking through`, isCorrect: true },
          { text: `The campaign became less efficient because a rising hook rate with flat CTR means fewer viewers convert to clicks`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'Mid-funnel metrics: CPC and add-to-cart rate',
    questions: [
      {
        type: 'mcq',
        text: `A campaign has a CPC of ₹80 and an add-to-cart rate of 5%. A second campaign has a CPC of ₹40 and an add-to-cart rate of 2%. Which campaign has the lower Cost Per Add to Cart?`,
        options: [
          { text: `Campaign 1, because its higher ATC rate generates more carts per visitor despite the higher cost per click`, isCorrect: false },
          { text: `Campaign 2, because the lower CPC means each visitor is cheaper regardless of how often they add to cart`, isCorrect: false },
          { text: `They are equal — a 2x higher CPC offset by a 2.5x higher ATC rate results in the same cost per cart`, isCorrect: false },
          { text: `Campaign 1 at ₹1,600 per cart versus Campaign 2 at ₹2,000 per cart, so Campaign 1 is cheaper`, isCorrect: true },
        ],
      },
      {
        type: 'mcq',
        text: `CTR is 2.8% and holding steady. Add-to-cart rate fell from 11% to 4% after a homepage redesign. A product manager says the issue is ad targeting. What is wrong with that diagnosis?`,
        options: [
          { text: `Nothing — a drop in ATC rate often reflects a shift in audience composition driven by Meta\'s targeting algorithm`, isCorrect: false },
          { text: `The CTR data contradicts it — stable click quality means the drop is occurring on-site, not in ad delivery`, isCorrect: true },
          { text: `It is partially correct — targeting affects audience intent, which directly determines whether visitors add to cart`, isCorrect: false },
          { text: `It is correct for mobile traffic but incorrect for desktop, where ATC rate is driven primarily by page load speed`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A brand\'s Cost Per Add to Cart rose from ₹600 to ₹1,400 in two weeks. CPC is unchanged at ₹70. What must have changed?`,
        options: [
          { text: `CPM increased, which raised the cost of each click and therefore the cost of each downstream add-to-cart`, isCorrect: false },
          { text: `The campaign audience shifted, bringing in lower-intent users who cost the same per click but convert less often`, isCorrect: false },
          { text: `Add-to-cart rate fell — at the same CPC, a higher Cost Per ATC means fewer visitors are completing the action`, isCorrect: true },
          { text: `The product price increased, reducing consumer willingness to add to cart at the same traffic acquisition cost`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Mid-funnel analysis is most useful for distinguishing between which two failure types?`,
        options: [
          { text: `Organic versus paid traffic quality, since mid-funnel data separates the two acquisition channels by intent`, isCorrect: false },
          { text: `Ad creative problems versus product-market fit problems, since both manifest as low CTR in the funnel`, isCorrect: false },
          { text: `Traffic quality problems versus on-site experience problems, using ATC rate as the dividing signal`, isCorrect: true },
          { text: `Budget allocation problems versus targeting problems, since mid-funnel spend data separates these root causes`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A brand runs an A/B test on its product page. Variant B adds three customer reviews and a size guide. Add-to-cart rate improves from 5% to 9%. CPC is ₹90. What is the Cost Per Add to Cart for each variant?`,
        options: [
          { text: `Variant A: ₹450, Variant B: ₹810 — higher ATC rate means more carts but also higher downstream fulfilment cost`, isCorrect: false },
          { text: `Variant A: ₹1,800, Variant B: ₹1,000 — calculated by dividing CPC by ATC rate and converting to percentage`, isCorrect: true },
          { text: `Variant A: ₹900, Variant B: ₹500 — calculated using CPC multiplied by ATC rate expressed as a decimal`, isCorrect: false },
          { text: `Both variants cost the same per cart because CPC is identical and ATC rate only affects total volume, not unit cost`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'Bottom-of-funnel metrics: ROAS, purchase rate, prepaid %',
    questions: [
      {
        type: 'mcq',
        text: `A brand spends ₹80,000 on ads and reports ₹3,20,000 in revenue. COGS is 45% of revenue and fulfilment is ₹80 per order. Average order value is ₹800. Are they profitable on ad spend?`,
        options: [
          { text: `Yes — a 4x ROAS comfortably covers all variable costs and leaves meaningful margin for the business`, isCorrect: false },
          { text: `Cannot be determined — ROAS only measures revenue return and omits COGS, fulfilment, and return costs`, isCorrect: true },
          { text: `No — any ROAS below 6x in D2C e-commerce fails to cover standard cost structures at scale`, isCorrect: false },
          { text: `Yes — COGS and fulfilment are fixed costs that do not affect the profitability calculation for ad campaigns`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Purchase rate drops from 3.2% to 0.9% on a Tuesday with no creative changes, no price changes, and no new campaigns launched. What should the team check first?`,
        options: [
          { text: `Ad frequency — a sharp mid-week drop often signals audience saturation from overexposure to the same creative`, isCorrect: false },
          { text: `Competitor activity — sudden conversion drops frequently coincide with aggressive competitor promotions`, isCorrect: false },
          { text: `Payment gateway and checkout flow — an abrupt drop with no upstream changes points to a technical failure`, isCorrect: true },
          { text: `Product page load speed — slow pages suppress purchase intent even when upstream funnel metrics appear stable`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A D2C brand has 60% COD orders and 40% prepaid orders. A logistics consultant recommends shifting to 70% prepaid. What is the primary operational reason for this recommendation?`,
        options: [
          { text: `Prepaid customers spend more per order on average, which raises AOV and improves ROAS on the same ad spend`, isCorrect: false },
          { text: `Payment gateways charge lower transaction fees for prepaid orders, which reduces cost of revenue at scale`, isCorrect: false },
          { text: `COD orders are frequently refused at delivery, generating RTO costs that erode margin on fulfilled orders`, isCorrect: true },
          { text: `Prepaid checkout flows convert faster, which reduces cart abandonment and improves overall purchase rate`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A brand\'s ROAS rises from 3x to 5x after cutting ad spend by 40%. Revenue falls but the founder says performance improved. Is that assessment correct?`,
        options: [
          { text: `No — ROAS is the definitive performance metric and a rise always means the campaign is doing more with less`, isCorrect: false },
          { text: `Partially — ROAS improved but reduced revenue may mean fixed costs are now less covered by contribution margin`, isCorrect: true },
          { text: `Yes — higher ROAS always signals better audience targeting and more efficient use of the creative budget`, isCorrect: false },
          { text: `No — ROAS and revenue must both rise for performance to genuinely improve in a D2C business context`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Two brands each achieve 4x ROAS. Brand A has 30% COD and 15% return rate. Brand B has 80% COD and 35% return rate. Which brand is more profitable on the same revenue?`,
        options: [
          { text: `Brand B, because higher COD volume signals stronger brand reach into cash-preference markets with broader demand`, isCorrect: false },
          { text: `They are equally profitable — ROAS captures all relevant revenue and cost variables for comparing outcomes`, isCorrect: false },
          { text: `Brand A, because lower COD and lower returns mean less RTO cost and more revenue actually collected`, isCorrect: true },
          { text: `Brand A, because prepaid orders process faster through logistics, reducing warehouse holding costs significantly`, isCorrect: false },
        ],
      },
    ],
  },
  {
    subtopic: 'Diagnosing a broken funnel',
    questions: [
      {
        type: 'mcq',
        text: `Revenue is down 30% this week. Impressions and CPM are unchanged. CTR dropped from 2.1% to 0.7%. Where should the team focus?`,
        options: [
          { text: `The checkout flow — a CTR drop this severe usually reflects friction at the payment step discouraging repeat visitors`, isCorrect: false },
          { text: `The product page — strong impression volume with falling CTR indicates the landing experience is underperforming`, isCorrect: false },
          { text: `The ad creative — a two-thirds drop in CTR with stable reach means the ad itself stopped compelling clicks`, isCorrect: true },
          { text: `The audience targeting — CPM stability masks shifts in who sees the ad, suppressing click intent over time`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `Hook rate: stable. CTR: stable. Add-to-cart rate: stable. Purchase rate: dropped from 4% to 1.2%. ROAS: dropped from 5x to 1.8x. Where is the funnel broken?`,
        options: [
          { text: `Top-of-funnel — the stable hook rate masks a deterioration in audience quality that only shows up at purchase intent`, isCorrect: false },
          { text: `Mid-funnel — the add-to-cart rate will decline in the next reporting period as purchase intent collapses downstream`, isCorrect: false },
          { text: `Checkout — all upstream metrics are intact, so the failure is occurring between cart and completed purchase`, isCorrect: true },
          { text: `The product page — stable ATC rate means users are adding to cart reflexively without genuine purchase intent`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A brand fixes what it believes is a checkout bug. Purchase rate rises from 1% to 2% but remains below the historical 4%. What should the team do next?`,
        options: [
          { text: `Declare the fix successful — a 100% improvement in purchase rate confirms the checkout was the sole issue`, isCorrect: false },
          { text: `Re-examine the checkout for a second bug — purchase rate recoveries are always sequential and require iterative patching`, isCorrect: false },
          { text: `Audit all other funnel stages to identify whether a second bottleneck is suppressing the remaining gap to 4%`, isCorrect: true },
          { text: `Shift focus to top-of-funnel — once checkout is repaired, traffic volume is the only remaining lever to pull`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `ROAS dropped from 4.5x to 2.8x over three weeks. CTR, ATC rate, and purchase rate are all stable. Average order value is also unchanged. What is the most likely cause?`,
        options: [
          { text: `Ad creative fatigue — stable CTR masks declining audience engagement that manifests as lower revenue per click`, isCorrect: false },
          { text: `A rise in CPM — the same conversion efficiency now costs more per impression, reducing revenue return on ad spend`, isCorrect: true },
          { text: `Audience targeting drift — Meta\'s algorithm is shifting delivery toward lower-intent users who still click and buy`, isCorrect: false },
          { text: `Increased competitor spend — market-level pressure raises acquisition costs across all campaigns simultaneously`, isCorrect: false },
        ],
      },
      {
        type: 'mcq',
        text: `A brand\'s add-to-cart rate is 12% (healthy). Purchase rate is 3.5% (healthy). ROAS is 1.9x (below target). CTR is 1.8% (healthy). What is the most likely source of the profitability problem?`,
        options: [
          { text: `The checkout experience — a purchase rate of 3.5% is deceptively low and is compressing revenue at the final step`, isCorrect: false },
          { text: `Ad targeting — healthy CTR with low ROAS indicates the brand is reaching clickers who spend below average order value`, isCorrect: false },
          { text: `Unit economics — with all conversion metrics healthy, the issue is likely COGS, AOV, or returns suppressing margin`, isCorrect: true },
          { text: `CPM — the cost to reach audiences is too high relative to the revenue each converted customer generates`, isCorrect: false },
        ],
      },
    ],
  },
]

async function main() {
  console.log('Updating Week 2 quiz questions...')
  const week2 = await prisma.week.findUnique({ where: { number: 2 } })
  if (!week2) throw new Error('Week 2 not found')

  let updated = 0
  let skipped = 0

  for (const entry of QUIZ_UPDATES) {
    const sub = await prisma.subtopic.findFirst({
      where: { title: entry.subtopic, topic: { weekId: week2.id } },
      include: { quiz: { select: { id: true } } },
    })
    if (!sub?.quiz) { console.log(`  Not found: ${entry.subtopic}`); skipped++; continue }

    // Skip quizzes with existing learner attempts (preserve their data)
    const attempts = await prisma.quizAttempt.count({ where: { quizId: sub.quiz.id } })
    if (attempts > 0) {
      console.log(`  Skipping (${attempts} attempt${attempts > 1 ? 's' : ''}): ${entry.subtopic}`)
      skipped++
      continue
    }

    // Delete old questions and insert new ones
    await prisma.question.deleteMany({ where: { quizId: sub.quiz.id } })
    for (let i = 0; i < entry.questions.length; i++) {
      const q = entry.questions[i]
      await prisma.question.create({
        data: {
          quizId: sub.quiz.id,
          type: q.type,
          text: q.text,
          points: 1,
          sortOrder: i,
          options: { create: q.options.map((o, j) => ({ text: o.text, isCorrect: o.isCorrect, sortOrder: j })) },
        },
      })
    }
    console.log(`  ✓ Updated (${entry.questions.length} questions): ${entry.subtopic}`)
    updated++
  }

  const totalQ = await prisma.question.count({ where: { quiz: { subtopic: { topic: { weekId: week2.id } } } } })
  console.log(`\nDone. Updated: ${updated} | Skipped: ${skipped} | Total questions in Week 2: ${totalQ}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
