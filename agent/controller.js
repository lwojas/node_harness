const { chat } = require("./clients/ollama");
const { AgentMemory } = require("./memory/agentMemory");
const { summarizeText } = require("./clients/summariseText");
const { devPrompt } = require("./prompts/systemPrompts");
const { langfuse } = require("./logging/tracer");
const { serviceLocator } = require("./services/serviceLocator");

const memory = new AgentMemory();

async function run(model, messages, toolDefinitions) {
  const trace = langfuse.trace({
    name: "Agent Run",
    input: messages,
    metadata: {
      model,
    },
  });

  serviceLocator.trace = trace;
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
        // content: memory.buildContext(),
        content: devPrompt,
      },
      ...messages,
      { role: "user", content: memory.buildContext() },
      //   ,
    ];

    const generation = iterationSpan.generation({
      name: "Planner",
      model,
      input: prompt,
    });

    // const response = await chat(model, prompt, tools);

    const res = await chat(model, prompt, tools);
    const response = res.message;

    const usage = {
      input: res.prompt_eval_count ?? 0,
      output: res.eval_count ?? 0,
    };

    generation.end({
      output: res.message,
      usage,
    });

    console.dir(response, { depth: null });

    // if (response.thinking) {
    //   memory.lastTrainOfThought = response.thinking;
    // }

    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log("\nFinished.");
      // iterationSpan.update({
      //   metadata: {
      //     memory: memory.buildContext(),
      //   },
      //   usage,
      // });
      await langfuse.flushAsync?.();
      return response;
    }
    for (const call of response.tool_calls) {
      const tool = toolDefinitions[call.function.name];

      if (!tool) {
        throw new Error(`Unknown tool: ${call.function.name}`);
      }

      console.log(`Executing ${call.function.name}`, call.function.arguments);

      //   const result = await tool.handler(call.function.arguments);

      try {
        // const result = await tool.handler(call.function.arguments);

        const toolSpan = iterationSpan.span({
          name: call.function.name,
          input: call.function.arguments,
        });

        const result = await tool.handler(call.function.arguments);

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
            memory: memory.buildContext(),
          },
          usage,
        });

        memory.toolOutput = {
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            success: true,
            result,
          }),
        };

        // console.log("Tool Result:");
        // console.dir(result, { depth: null });

        // Update memory...
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
