const { chat } = require("./ollama");

async function summarizeText(contents) {
  const model = "qwen3:8b";
  const response = await chat(model, [
    {
      role: "system",
      content: `
Summarize the source file

Rules:
- Keep it brief but concise
- Focus on the final answer / next step.
`,
    },
    {
      role: "user",
      content: contents,
    },
  ]);
  console.log(response);
  // const content = response.content.replace("```json", "").replace("```", "");
  // const summary = JSON.parse(content);
  // summary.path = path;
  return response;
}

module.exports = {
  summarizeText,
};
