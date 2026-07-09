const narrowTest =
  "Locate the file systemPrompts.js in the current repo, look at the prompt inside, this is the system prompt to guide your model in a harness loop, how can we improve it, provide tips and a full example.";

const narrowTestv2 =
  "Add a function to controller.js to call a decision router.";

const narrowTestv3 = "How can I add a CSS framework to this project?";

const wideTest =
  "Root path is '.', scan the folders and files in this project and create a comprehensive readme.md.";

const wideTest2 =
  "Root path is '.', Explore folders and files in this project and create a comprehensive readme.md. Start with index.js - locate and read the file, follow the imports to understand how the application works. Do not ask for confirmation to proceed to next steps, continue until this task is complete.";

module.exports = {
  narrowTest,
  narrowTestv2,
  narrowTestv3,
  wideTest,
  wideTest2,
};
