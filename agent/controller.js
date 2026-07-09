const { chat } = require("./clients/ollama");
const { AgentMemory } = require("./memory/agentMemory");
const { summarizeText } = require("./clients/summariseText");
const { devPrompt, devPromptv2 } = require("./prompts/systemPrompts");
const { langfuse } = require("./logging/tracer");
const { serviceLocator } = require("./services/serviceLocator");
const { intentRouter } = require("./routers/intentRouter");
const { scopeRouter } = require("./routers/scopeRouter");
const { knowledgeRouter } = require("./routers/knowledgeRouter");
const { userRouter } = require("./routers/userRouter");
const { networkRouter } = require("./routers/networkRouter");

const memory = new AgentMemory();

async function run(model, messages, toolDefinitions) {
  const trace = langfuse.trace({
    name: "Agent Run",
    input: messages,
    metadata: {
      model,
    },
  });

  const userPrompt = messages[0].content;

  // Add trace to the serviceLocator so we can log LLM calls outside the main loop
  serviceLocator.trace = trace;

  const contextFlags = {
    intent: await intentRouter(userPrompt), // Modify or Observe
    scope: await scopeRouter(userPrompt), // WIDE or NARROW
    isKnowledgeComplete: await knowledgeRouter(userPrompt), // COMPLETE or INCOMPLETE
    needsLocalUser: await userRouter(userPrompt), // Localhost knowledge required? LOCAL or NONE
    needsLocalNetwork: await networkRouter(userPrompt), // Local network knowledge required? LOCAL or NONE
  };
  // const intent = await intentRouter(messages);
  // const scope = await scopeRouter(messages);
  // const isKnowledgeComplete = await knowledgeRouter(messages);
  // const needsLocalUser = await userRouter(messages);
  // const needsLocalNetwork = await networkRouter(messages);

  const tools = Object.values(toolDefinitions).map((t) => t.schema);

  const MAX_ITERATIONS = 20;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    console.log(`\n=== Iteration ${iteration + 1} ===`);

    const iterationSpan = trace.span({
      name: `Iteration ${iteration + 1}`,
    });

    const prompt = [
      {
        role: "system",
        content: devPromptv2,
      },
      ...messages,
      { role: "user", content: memory.buildContext(contextFlags) },
    ];

    const generation = iterationSpan.generation({
      name: "Planner",
      model,
      input: prompt,
    });
    const res = await chat(model, prompt, tools, 8192);
    const response = res.message;
    const usage = {
      input: res.prompt_eval_count ?? 0,
      output: res.eval_count ?? 0,
    };
    generation.end({
      output: res.message,
      usage,
    });
    console.log("[Agent] - LLM response:\n");
    console.dir(response, { depth: null });
    // console.log("[Agent]: LLM is thinking\n");
    // console.log(response.thinking);

    if (!response.tool_calls || response.tool_calls.length === 0) {
      if (!response.content) continue;
      console.log("\nFinished.");
      await langfuse.flushAsync?.();
      return response;
    }
    for (const call of response.tool_calls) {
      const tool = toolDefinitions[call.function.name];

      if (!tool) {
        throw new Error(`Unknown tool: ${call.function.name}`);
      }

      console.log(
        `[Agent] - Executing ${call.function.name}`,
        call.function.arguments,
      );

      try {
        const toolSpan = iterationSpan.span({
          name: call.function.name,
          input: call.function.arguments,
        });
        const result = await tool.handler(call.function.arguments);
        memory.rememberToolOutput({
          role: "tool",
          tool_call_id: call.id,
          content: result,
        });
        toolSpan.end({
          output: result,
        });
        switch (call.function.name) {
          case "readDirectory":
            memory.rememberDirectory(call.function.arguments.path, result);
            break;
          case "readFile":
            await memory.rememberFile(call.function.arguments.path, result);
            break;
        }
        iterationSpan.update({
          metadata: {
            memory: memory.buildContext(contextFlags),
          },
          usage,
        });
      } catch (err) {
        memory.toolOutput = {
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            success: false,
            error: err.message,
          }),
        };
      }
    }
  }

  //   await langfuse.shutdownAsync();

  throw new Error("Maximum iterations exceeded.");
}

module.exports = {
  run,
};
