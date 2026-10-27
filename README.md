# LLM-Hub — All-in-One Multi-Model AI Workspace, Arena & Gateway

**LLM-Hub** is a unified AI engineering workspace that combines a **Multi-Model Side-by-Side Chat & Blind Arena Playground**, a **Frontier & Open-Weights Model Directory & Benchmark Explorer**, a **Parameterized Prompt Engineering Studio**, and a **Bring-Your-Own-Key (BYOK) API Gateway & Telemetry Dashboard** in a single web application.

---

## ✨ Key Capabilities

### 1. Multi-Model Chat Playground & Blind Arena (`PlaygroundView`)
- **Single Chat Mode**: Deep technical sessions with any frontier or open-weights LLM.
- **Synchronized Multi-Model Compare (2–4 Models)**: Broadcast a single prompt to up to 4 models simultaneously and compare their streaming speed, Chain-of-Thought (`<think>`) reasoning traces, code quality, latency, and token cost side-by-side.
- **Blind Arena Battle Mode**: Anonymized **Model A vs. Model B** evaluation where model identities stay hidden until you cast a vote, updating live session ELO ratings.
- **Hyperparameter Controls**: Configure System Prompts, Temperature (`0.0–1.5`), Max Output Tokens, Top-P, and Reasoning Effort (`low`, `medium`, `high`).
- **Session Persistence & Markdown Export**: Save multiple conversation threads and export full multi-model comparisons as `.md` reports.

### 2. LLM Directory, Leaderboard & Cost Calculator (`DirectoryView`)
- **13+ Frontier & Open-Weights Models**: Includes `Claude 3.7 Sonnet`, `Gemini 2.5 Pro`, `OpenAI o3-mini`, `GPT-4o`, `DeepSeek-R1 (671B)`, `DeepSeek-V3`, `Llama 3.3 70B`, `Qwen 2.5 Coder 32B`, `Qwen QwQ-32B`, `Mistral Large 2.1`, and more.
- **Multi-Axis Benchmark Filtering**: Sort and filter by **Arena ELO**, **SWE-bench Verified**, **MATH-500**, **GPQA Diamond**, **MMLU-Pro**, **Context Window (up to 2M)**, **Throughput (tok/s)**, and **License (`Open Weights` vs. `Proprietary`)**.
- **Head-to-Head Spec Comparator**: Pin up to 4 models for side-by-side visual benchmark & pricing comparison.
- **Interactive Token & Cost Calculator**: Live prompt tokenizer + workload sliders (requests/day, input/output tokens, prompt cache hit rate) that rank all models by daily and 30-day projected spend.

### 3. Parameterized Prompt Engineering Studio (`PromptLibraryView`)
- **Dynamic `{{variable}}` Detection & Interpolation**: Automatically detects `{{placeholders}}` in any template and renders live form inputs with real-time token estimation.
- **Curated Engineering Templates**: Distributed Systems Architecture, Formal Algorithmic Proofs, Zero-Trust Security Audits, Strict JSON Schema Extraction, Multi-Agent ReAct Orchestration, and PostgreSQL Query Tuning.
- **1-Click Playground Execution**: Launch any compiled prompt directly into a Single Chat or 3-Model Parallel Comparison.

### 4. Unified API Gateway, BYOK Vault & Telemetry (`GatewayDashboardView`)
- **Hybrid Connectivity (BYOK + Smart Demo Stream)**:
  - Works out-of-the-box with realistic token-by-token streaming simulations tailored to each model's authentic throughput, pricing, and Chain-of-Thought reasoning style.
  - Seamlessly switches to **Live API Calls** when you add API keys for **OpenAI**, **Anthropic**, **Google Gemini**, **DeepSeek**, **OpenRouter**, **Groq**, or **Local Ollama**.
- **Multi-Language SDK Snippet Generator**: Generate copy-ready **TypeScript**, **Python**, and **cURL** integration snippets for any model.
- **Real-Time Telemetry & Cost Audit Log**: Inspect prompt/completion token counts, E2E latency, throughput (`tok/s`), and exact USD cost for every request.

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start the development server (bound to 0.0.0.0:5173)
npm run dev

# Type-check and build for production
npm run build
```
