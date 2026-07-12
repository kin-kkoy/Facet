# AI-Integrated Cloud

Where Azure development is heading: apps that **call AI models** as just another service. You don't
need to train anything — you consume a hosted model over an API, the same way you'd call any other
cloud service. This chapter is the practical shape of "add AI to a .NET app," plus the one pattern
that makes it actually useful on *your* data: RAG.

---

## 1. Calling a model from C#

**Azure OpenAI** (and Azure AI services generally) expose large language models behind an API you call
from C# with an SDK. Conceptually it's a function: you send **messages** (a system instruction + the
conversation) and get back generated text.

```csharp
using Azure.AI.OpenAI;
using Azure.Identity;

var client = new AzureOpenAIClient(new Uri(endpoint), new DefaultAzureCredential())
    .GetChatClient("gpt-4o-mini");   // a deployed model

var result = await client.CompleteChatAsync(
    new SystemChatMessage("You are a concise assistant."),
    new UserChatMessage("Summarize this todo list in one sentence: ..."));

string reply = result.Value.Content[0].Text;
```

Notice the familiar patterns: `async`/`await` (it's a network call), `DefaultAzureCredential` (managed
identity — no API key in config), and a **system message** that sets behaviour + **user messages** that
carry the request. If you've used the AI Tutor in *this app*, that's exactly this shape under the hood.

- **The system prompt** is your main control surface — it sets role, tone, and rules.
- **Tokens cost money and are limited** — long prompts and long histories both cost; trim what you send.
- **Models are non-deterministic** — the same prompt can give different answers; design for that
  (validate outputs, don't parse them as if they were a strict API).

> **Try it (lab):** send a system prompt ("reply in exactly 3 bullet points") + a user question and
> print the reply. Then change only the system prompt and watch the behaviour change — that's your
> primary lever.

---

## 2. Safety, cost & reliability

Calling a model in production isn't just "get text back":

- **Never trust output blindly** — validate/constrain it, especially if it drives an action. Treat
  model output like untrusted user input.
- **Handle failure & rate limits** — it's a network call to a shared service; retry transient errors
  (with backoff), and have a fallback when the model is unavailable.
- **Watch cost** — bill is per token; cache repeated prompts, cap history length, pick the smallest
  model that's good enough (a mini model for classification, a big one only when needed).
- **Content safety** — Azure offers moderation for user-generated prompts; use it if users can send
  arbitrary text.

> **Try it (thinking):** for a feature that auto-summarizes a user's todos, list three failure modes
> (model down, nonsense output, cost spike) and how you'd handle each. "Just call the API" is not a
> production design.

---

## 3. RAG — grounding the model in *your* data

A model only knows its training data — not your database, your docs, or today's facts. **RAG
(Retrieval-Augmented Generation)** fixes that: before asking the model, you **retrieve** the relevant
bits of *your* data and put them in the prompt, so the answer is grounded in your content instead of
hallucinated.

The pipeline:

1. **Embed** your documents — turn each chunk of text into a vector (a list of numbers capturing
   meaning) with an embedding model, and store the vectors in a **vector store** (Azure AI Search,
   Cosmos DB's vector support, etc.).
2. **On a question**, embed the question the same way, and **search** for the most similar document
   vectors (nearest-neighbour) — that's semantic search: it finds text by *meaning*, not keywords.
3. **Augment** the prompt with those retrieved chunks and ask the model to answer *using only this
   context*.

```
question ──embed──▶ vector ──search──▶ top-k relevant chunks
                                              │
      "Answer using ONLY this context: {chunks}\n\nQ: {question}" ──▶ model ──▶ grounded answer
```

**Use-case:** "answer questions about *my* project's docs." Without RAG the model guesses; with RAG it
quotes your actual content. This is the dominant pattern for real business AI features, and exactly how
you'd let an assistant answer over your own knowledge base. *(This app's AI-reads-the-page feature is a
tiny hand-rolled version of the same idea: it stuffs the current page into the prompt as context.)*

> **Try it (thinking):** sketch a RAG flow for "ask questions about my todos" — what do you embed
> (each todo?), where do the vectors live, and what does the final prompt look like? You don't need to
> build it to understand the shape.

---

## Performance / cost notes

- **Smallest model that works** — mini/flash models are far cheaper and often plenty for
  classification/summarization; reserve big models for hard reasoning.
- **Trim the prompt** — history and retrieved context both cost tokens; send the least that gives a
  good answer.
- **Cache** deterministic-ish calls and embeddings (re-embedding unchanged docs is wasted money).
- **Chunk size matters in RAG** — too big dilutes relevance, too small loses context; tune it.

## Build it (make the chapter real)

Add one AI feature to your to-do API:

1. A `POST /todos/summarize` endpoint that sends the user's open todos to a model with a tight system
   prompt and returns a one-paragraph summary — `async`, managed-identity auth, cost-aware.
2. Handle the model failing (retry + fallback message).
3. **Stretch (RAG):** let the user ask a question about their todos — embed the todos, retrieve the
   relevant ones, and answer grounded in them.

Success test: a real AI feature ships behind your API, degrades gracefully when the model misbehaves,
and (stretch) answers from *your* data rather than guessing. That's an AI-integrated cloud app — the
direction the whole field is moving.

*Cert note: Azure's developer cert path is shifting toward AI (the AI-200 successor to AZ-204) — this
chapter's skills are exactly what that reflects. A shipped AI feature proves more than the badge.*
