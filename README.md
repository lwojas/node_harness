# Harness v1

An experimental **agentic harness** for running a local LLM in a tool-calling loop. The agent explores a codebase, accumulates verified knowledge in a structured memory layer, and completes tasks such as repository analysis, documentation generation, and code modification — all driven by [Ollama](https://ollama.com/) models running on your machine.

## Overview

Harness v1 is a minimal but opinionated agent loop built in Node.js. Instead of stuffing full file contents into every prompt, it:

1. **Routes** the user request through a set of lightweight classifiers to determine intent, scope, and knowledge requirements.
2. **Discovers** files on disk via tool calls (`readDirectory`, `readFile`, `writeFile`).
3. **Summarizes** observed files and stores them in a `WORLD_STATE` context block.
4. **Plans** each iteration using that world state, calling tools only when information is missing.
5. **Traces** every LLM call and tool invocation through [Langfuse](https://langfuse.com/) for observability.

The primary entry point is `agent/index.js`, which wires a user prompt, tool definitions, and model name into the controller loop.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         agent/index.js                          │
│              (user prompt + model + tool definitions)           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      agent/controller.js                        │
│                                                                 │
│  1. Create Langfuse trace                                       │
│  2. Run context routers ──────────────────────────────┐         │
│  3. Agent loop (max 20 iterations):                   │         │
│     a. Rebuild tool output window                     │         │
│     b. Build prompt: system + messages + WORLD_STATE  │         │
│     c. Call Ollama chat with tools                    │         │
│     d. Execute tool calls → update AgentMemory        │         │
│     e. Return when LLM responds without tool calls    │         │
└────────────────────────────┬──────────────────────────┼─────────┘
                             │                          │
              ┌──────────────┼──────────────┐           │
              ▼              ▼              ▼           ▼
        ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌─────────────┐
        │  Ollama  │  │ AgentMemory│  │  Tools   │  │   Routers   │
        │  client  │  │ (WORLD_    │  │ readDir  │  │ intent      │
        │          │  │  STATE)    │  │ readFile │  │ scope       │
        └──────────┘  └────────────┘  │ writeFile│  │ knowledge   │
                                      └──────────┘  │ user        │
                                                    │ network     │
                                                    └─────────────┘
```

### Agent loop

The controller (`agent/controller.js`) runs up to **20 iterations**. On each iteration:

1. The most recent tool outputs are included in the message history (windowed to reduce context size).
2. A **system prompt** (`devPromptv2`) instructs the model to treat `WORLD_STATE` as the source of truth and minimize redundant tool calls.
3. A synthetic **user message** containing the current `WORLD_STATE` is appended so the model always sees verified facts.
4. If the model returns **tool calls**, each is dispatched to its handler, results are stored in memory, and the loop continues.
5. If the model returns **text only**, the run completes and the response is returned.

### Context routers

Before the main loop starts, five small LLM classifiers analyze the user prompt. Each router uses `qwen2.5-coder:7b` via Ollama's `/api/generate` endpoint with temperature 0.

| Router | Output | Purpose |
|--------|--------|---------|
| `intentRouter` | `OBSERVE` or `MODIFY` | Whether the task reads/explores or changes files |
| `scopeRouter` | `WIDE` or `NARROW` | Whether many files or a focused subset are needed |
| `knowledgeRouter` | `COMPLETE` or `INCOMPLETE` | Whether the model's own knowledge suffices |
| `userRouter` | `LOCAL` or `NONE` | Whether local filesystem access is required |
| `networkRouter` | `NETWORK` or `NONE` | Whether remote/network resources are required |

Router results are passed to `AgentMemory.buildContext()` as `contextFlags`. Currently, `scope` adjusts memory window sizes (fewer retained tool outputs and more action history for wide-scope tasks), and `needsLocalUser === "LOCAL"` controls whether directory and file summaries appear in `WORLD_STATE`.

### Memory and WORLD_STATE

`AgentMemory` (`agent/memory/agentMemory.js`) maintains:

- **`directories`** — results of `readDirectory` calls, keyed by path
- **`files`** — LLM-generated summaries of files read via `readFile`, keyed by path
- **`actions`** — a log of recent agent actions (e.g. "Scanned directory ./agent")
- **`toolOutput`** — raw tool call results fed back into the conversation

When a file is read for the first time, the **summarizer** (`agent/clients/summariser.js`) calls `qwen2.5-coder:7b` to produce a structured summary (purpose, functions, imports, exports). Subsequent references use the cached summary rather than re-reading the file.

The assembled `WORLD_STATE` block is injected into every planner turn so the model can decide whether it already has enough information to answer.

### Tools

Tools are defined in `agent/tools/toolDefinitions.js` as schema + handler pairs:

| Tool | Description |
|------|-------------|
| `readDirectory` | List files and subdirectories at a given path |
| `readFile` | Read a text file from disk |
| `writeFile` | Write contents to a file (creates parent directories if needed) |

Implementations live in `agent/tools/tools.js` and use Node.js `fs` synchronously for reads and asynchronously for writes.

### Prompts

- **`devPrompt` / `devPromptv2`** (`agent/prompts/systemPrompts.js`) — system instructions for the main planner. `devPromptv2` introduces knowledge levels (summary vs. implementation) and a explicit planning loop.
- **`userPrompts.js`** — canned test prompts for narrow tasks (single-file questions) and wide tasks (full repo README generation).

### Observability

All LLM calls are traced via **Langfuse** (`agent/logging/tracer.js`). Each agent run creates a trace; each iteration creates a span with a generation record for the planner, plus child spans for tool executions and router/summarizer calls.

## Prerequisites

- **Node.js** (v18+ recommended for native `fetch`)
- **Ollama** running and reachable at the configured host (default in code: `http://lynn:11434`)
- Pull the required models:

```bash
ollama pull qwen3.5:latest
ollama pull qwen2.5-coder:7b
ollama pull qwen3:8b
```

- **Langfuse** account (optional but wired in by default) for tracing

## Installation

```bash
git clone <repo-url>
cd v1
npm install
```

## Configuration

Create `agent/.env` with your Langfuse credentials:

```env
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

The Ollama API base URL is currently hardcoded in `agent/clients/ollama.js`:

```js
http://lynn:11434/api/chat
http://lynn:11434/api/generate
```

Update the hostname (`lynn`) to match your Ollama server before running.

## Usage

### Run the default task

`agent/index.js` is the current driver. Edit the imported prompt and model, then:

```bash
npm start
# or
node agent/index.js
```

By default it runs the `wideTest2` prompt — a full repository exploration task that generates a README — using `qwen3.5:latest`.

### Customize a run

```js
const { run } = require("./controller");
const { toolDefinitions } = require("./tools/toolDefinitions");

const messages = [
  {
    role: "user",
    content: "Your task here. Root path is '.'.",
  },
];

run("qwen3.5:latest", messages, toolDefinitions)
  .then((response) => console.log(response.content))
  .catch(console.error);
```

### Test prompts

`agent/prompts/userPrompts.js` exports several ready-made prompts:

| Export | Type | Description |
|--------|------|-------------|
| `narrowTest` | Narrow | Analyze and improve the system prompt |
| `narrowTestv2` | Narrow | Add a function to `controller.js` |
| `narrowTestv3` | Narrow | General project question (CSS framework) |
| `wideTest` | Wide | Scan repo and create README |
| `wideTest2` | Wide | Explore from `index.js`, follow imports, create README |

## Project structure

```
v1/
├── agent/
│   ├── index.js              # Entry point — wires prompt, model, and run()
│   ├── controller.js         # Main agent loop
│   ├── test.js               # Summarizer smoke test
│   │
│   ├── clients/
│   │   ├── ollama.js         # Ollama chat + generate API wrappers
│   │   ├── summariser.js     # File summarization (used by memory)
│   │   └── summariseText.js  # Generic text summarization
│   │
│   ├── memory/
│   │   └── agentMemory.js    # WORLD_STATE builder and file/directory cache
│   │
│   ├── routers/
│   │   ├── intentRouter.js   # OBSERVE vs MODIFY
│   │   ├── scopeRouter.js    # WIDE vs NARROW
│   │   ├── knowledgeRouter.js# COMPLETE vs INCOMPLETE
│   │   ├── userRouter.js     # LOCAL vs NONE (filesystem)
│   │   └── networkRouter.js  # NETWORK vs NONE (remote)
│   │
│   ├── tools/
│   │   ├── toolDefinitions.js# Tool schemas + handler bindings
│   │   └── tools.js          # Filesystem tool implementations
│   │
│   ├── prompts/
│   │   ├── systemPrompts.js  # Planner system prompts
│   │   └── userPrompts.js    # Test / example user prompts
│   │
│   ├── logging/
│   │   └── tracer.js         # Langfuse client initialization
│   │
│   └── services/
│       └── serviceLocator.js # Shared trace reference for routers
│
├── package.json
└── README.md
```

## Models

| Component | Model | Endpoint |
|-----------|-------|----------|
| Main planner | `qwen3.5:latest` (configurable in `index.js`) | `/api/chat` |
| Routers | `qwen2.5-coder:7b` | `/api/generate` |
| File summarizer | `qwen2.5-coder:7b` | `/api/chat` |
| Text summarizer | `qwen3:8b` | `/api/chat` |

The planner uses a 16K context window (`8192 * 2` tokens) per iteration.

## Design principles

The system prompt enforces several behaviors designed to keep the loop efficient:

- **WORLD_STATE is authoritative** — the model must consult it before calling tools.
- **Summary knowledge is enough** for exploration, architecture questions, and documentation; full file contents are only needed for code modification.
- **No assumed paths** — directories must be discovered with `readDirectory` before files are read.
- **No duplicate work** — already-observed files and directories should not be re-fetched unless implementation-level detail is required.
- **Minimum tool calls** — every tool invocation should reduce uncertainty.

## Limitations and known issues

- **Hardcoded Ollama host** — the API URL points to `http://lynn:11434`; there is no env-based configuration yet.
- **No streaming** — all Ollama calls use `stream: false`.
- **Synchronous file reads** — `readFile` and `readDirectory` block the event loop.
- **No path sandboxing** — tools can read/write anywhere the process has filesystem access.
- **Router outputs are unstructured** — routers return free-form LLM text; downstream code does not parse or validate the expected single-word answers.
- **Iteration cap** — runs fail with `"Maximum iterations exceeded."` after 20 planner turns.
- **Early commits note** — initial testing reported ~50% success rate on autonomous README generation tasks.

## Development

### Run the summarizer test

```bash
node agent/test.js
```

### Trace inspection

After a run, inspect the Langfuse dashboard for:

- Full prompt/response pairs per iteration
- Router classification inputs and outputs
- Per-tool execution spans with arguments and results
- Token usage per generation

### Extending the harness

**Add a new tool:**

1. Implement the handler in `agent/tools/tools.js`.
2. Add a schema + handler entry in `agent/tools/toolDefinitions.js`.
3. Optionally add a `switch` case in `controller.js` to update memory on specific tool results.

**Add a new router:**

1. Create a router module in `agent/routers/` following the existing pattern.
2. Call it in `controller.js` and pass the result into `contextFlags`.
3. Use the flag in `AgentMemory.buildContext()` to tailor the world state.

**Swap models:**

Change the model string in `agent/index.js` (planner) or in individual router/summarizer files.

## License

ISC

## Author

Lech Wojas
