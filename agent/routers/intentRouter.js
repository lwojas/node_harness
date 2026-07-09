const { chat, generate } = require("../clients/ollama");
const { serviceLocator } = require("../services/serviceLocator");

async function intentRouter(userPrompt) {
  const model = "qwen2.5-coder:7b";

  const trace = serviceLocator.trace || null;

  const systemPrompt = `You are an advanced application router.

Provide an answer with a single word, either OBSERVE or MODIFY.

Perform the following actions:

- Analyse the user request.
- Determine if the request requires existing file modification, apply a percentage score.
- Determine if this request requires file observation, apply a percentage score.
- If the modify score is greater, answer with a single word: MODIFY
- Else if the observation score is greater, answer with the word: OBSERVE
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
  intentRouter,
};
