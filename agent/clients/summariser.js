const { chat } = require("./ollama");
const { serviceLocator } = require("../services/serviceLocator");

async function summarizeFile(path, contents) {
  const model = "qwen2.5-coder:7b";

  const trace = serviceLocator.trace || null;

  const prompt = [
    {
      role: "system",
      content: `
Summarize this source file.

Return a text string only with the structure below:

Purpose:
A short one line description
Important_functions:
Short 3 line max description
Imports:
Function name and path only
Exports:
Function name and path only
`,
    },
    {
      role: "user",
      content: contents,
    },
  ];
  const generation = trace.generation({
    name: "Summarizer",
    model,
    input: prompt,
  });
  const response = await chat(model, prompt);
  const usage = {
    input: response.prompt_eval_count ?? 0,
    output: response.eval_count ?? 0,
  };

  generation.end({
    output: response.message,
    usage,
  });

  // console.log(response);
  if (!response.message?.content) return;
  const content = response.message.content;
  //   .replace("```json", "")
  //   .replace("```", "");
  // let summary = `File: ${path}`;
  // summary += content;
  // const summary = JSON.parse(content);
  // summary.path = path;
  return content;
}

module.exports = {
  summarizeFile,
};
