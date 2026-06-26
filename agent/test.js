const { summarizeFile } = require("./clients/summariser");

const contents = `async function chat(model, messages, tools = []) {
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

  return json.message;
}

module.exports = {
  chat,
};
`;

async function start() {
  const testresult = await summarizeFile("/", contents);
  console.log(testresult);
}

start();
