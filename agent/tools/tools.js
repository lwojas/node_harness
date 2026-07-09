const fs = require("fs");
// const { systemMemory } = require("../memory/systemMemory");

const path = require("path");

async function writeFile(filePath, data) {
  // Get directory from file path
  const dir = path.dirname(filePath);
  // Create directory if it doesn't exist
  await fs.mkdir(dir, { recursive: true });
  // Write file
  await fs.writeFile(filePath, data, "utf8");
  console.log(`File saved: ${filePath}`);
}

function readDirectory(path) {
  const folder = fs
    .readdirSync(path, {
      withFileTypes: true,
    })
    .map((entry) => {
      // console.log(entry);
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
  writeFile,
};
