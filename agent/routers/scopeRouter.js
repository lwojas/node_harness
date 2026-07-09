const { chat, generate } = require("../clients/ollama");
const { serviceLocator } = require("../services/serviceLocator");

async function scopeRouter(userPrompt) {
  const model = "qwen2.5-coder:7b";

  const trace = serviceLocator.trace || null;

  const systemPrompt = `  Role: You are an advanced application router.

Provide an answer with a single word, either WIDE or NARROW.

Perform the following actions:

- Analyse the user request.
- Determine if the request requires access to a wide range of files, apply a percentage score.
- Determine if the request requires access to only a narrow range of file(s), apply a percentage score.
- If the wide range score is greater answer with a single word: WIDE
- Else if the narrow range score is greater answer with the word: NARROW`;
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
  scopeRouter,
};
