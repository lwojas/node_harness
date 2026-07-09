const { run } = require("./controller");
const { toolDefinitions } = require("./tools/toolDefinitions");
const {
  narrowTest,
  wideTest,
  wideTest2,
  narrowTestv2,
  narrowTestv3,
} = require("./prompts/userPrompts");

const messages = [
  {
    role: "user",
    content: narrowTest,
  },
];

// run("qwen3:8b", messages, toolDefinitions)
run("qwen3.5:latest", messages, toolDefinitions)
  .then((response) => {
    console.log("\nAssistant:");
    console.log(response.content);
    console.log("\n\nFull output:\n\n");
    console.log(response);
    console.log(messages);
  })
  .catch(console.error);
