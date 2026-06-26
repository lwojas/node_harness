async function chat(model, messages, tools = []) {
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
    }),
  });

  const json = await response.json();

  return json;
}

module.exports = {
  chat,
};
