const fs = require("fs");
// const { systemMemory } = require("../memory/systemMemory");

function readDirectory(path) {
  const folder = fs
    .readdirSync(path, {
      withFileTypes: true,
    })
    .map((entry) => {
      console.log(entry);
      return { name: entry.name, directory: entry.isDirectory() };
    });
  return folder;
}

function readFile(path) {
  return fs.readFileSync(path, "utf8");
}

module.exports = {
  readDirectory,
  readFile,
};
