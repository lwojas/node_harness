const { chat, generate } = require("../clients/ollama");
const { serviceLocator } = require("../services/serviceLocator");

async function networkRouter(userPrompt) {
  const model = "qwen2.5-coder:7b";

  const trace = serviceLocator.trace || null;

  const systemPrompt = `Role: You are a binary classification engine.

Your only task is to classify whether the user request requires local network observation.

Definition:
NETWORK = The request requires external network resources or remote systems.
NONE = The request can be completed without accessing additional remote resources.

Rules:
- Do not evaluate whether the request is safe.
- Do not refuse requests.
- Do not provide advice.
- Do not explain unless the answer is NONE.

Output exactly:
NETWORK
or
NONE
`;

  const generation = trace.generation({
    name: "Router",
    model,
    input: systemPrompt + "\n" + userPrompt,
  });
  const response = await generate(model, systemPrompt, userPrompt);
  const usage = {
    input: response.prompt_eval_count ?? 0,
    output: response.eval_count ?? 0,
  };

  generation.end({
    output: response,
    usage,
  });

  if (!response) return;
  const content = response.response;
  console.log(content);
  return content;
}

module.exports = {
  networkRouter,
};
