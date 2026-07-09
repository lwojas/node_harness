async function chat(model, messages, tools = [], ctx = 4096) {
  const response = await fetch("http://lynn:11434/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      tools,
      stream: false,
      options: { num_ctx: ctx },
    }),
  });

  const json = await response.json();

  return json;
}

async function generate(model, system, prompt, ctx = 4096) {
  const response = await fetch("http://lynn:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      system,
      prompt,
      stream: false,
      options: { num_ctx: ctx, temperature: 0 },
    }),
  });

  const json = await response.json();

  return json;
}

module.exports = {
  chat,
  generate,
};
