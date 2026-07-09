const { chat, generate } = require("../clients/ollama");
const { serviceLocator } = require("../services/serviceLocator");

async function knowledgeRouter(userPrompt) {
  const model = "qwen2.5-coder:7b";

  const trace = serviceLocator.trace || null;

  const systemPrompt = `You are an advanced application router.

Provide an answer with a single word, either COMPLETE or INCOMPLETE.

Perform the following actions:

- Analyse the user request.
- Determine if you need more context to answer the user request, apply a percentage score.
- Determine if your own knowledge is enough to answer the user request, apply a percenatage score.
- If the score for more context is higher, answer with the word: INCOMPLETE
- If the score for your own knowledge is higher, answer with the word: COMPLETE
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
  knowledgeRouter,
};
