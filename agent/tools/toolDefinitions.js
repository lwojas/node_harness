const { readDirectory, readFile, writeFile } = require("./tools");

const toolDefinitions = {
  readDirectory: {
    schema: {
      type: "function",
      function: {
        name: "readDirectory",
        description: "List files in a directory.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
            },
          },
          required: ["path"],
        },
      },
    },

    handler(args) {
      return readDirectory(args.path);
    },
  },

  readFile: {
    schema: {
      type: "function",
      function: {
        name: "readFile",
        description: "Read a text file.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
            },
          },
          required: ["path"],
        },
      },
    },

    handler(args) {
      return readFile(args.path);
    },
  },

  writeFile: {
    schema: {
      type: "function",
      function: {
        name: "writeFile",
        description: "Write a text file.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
            },
          },
          required: ["path"],
        },
      },
    },

    handler(args) {
      return writeFile(args.path);
    },
  },
};

module.exports = {
  toolDefinitions,
};
