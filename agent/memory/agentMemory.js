const { summarizeFile } = require("../clients/summariser");
const { devPrompt } = require("../prompts/systemPrompts");

class AgentMemory {
  constructor() {
    this.files = {};
    this.directories = {};
    this.actions = [];
    this.openFiles = {};
    this.toolOutput = null;
    this.lastTrainOfThought = "";
  }

  // rememberToolOutput(output) {
  //   this.toolOutput.push(output);
  //   if (this.toolOutput.length > 3) {
  //     this.toolOutput.slice();
  //   }
  // }

  rememberDirectory(path, contents) {
    this.directories[path] = contents;
    this.actions.push(`Scanned directory ${path}`);
    console.log(`Scanned directory ${path}`);
  }

  async rememberFile(path, contents) {
    if (this.files[path]) {
      console.log("Retrieving file from memory");
    } else {
      const date = Date.now();
      this.openFiles = {
        path,
        contents,
        accessed: date,
      };
      const summary = await summarizeFile(path, contents);
      this.files[path] = {
        summary,
        accessed: date,
      };
    }

    this.actions.push(`Opened file ${path}`);
    console.log(`Opened file ${path}`);
  }

  buildContext() {
    let text = "";

    // if (this.toolOutput) {
    //   text +=
    //     "\nTOOL_OUTPUT\n\nShowing only last tool_call output to save memory:\n\n";

    //   text += `{${JSON.stringify(this.toolOutput)}}\n`;

    //   text += "\n]\n";
    //   text += "--------------------------------\n";
    // }
    // let text = "\nYour last thought:";
    // text += this.lastTrainOfThought;
    // text += "\n";

    text += "\nWORLD_STATE\n\n";

    if (Object.keys(this.directories).length) {
      text += "OBSERVED_DIRECTORIES:\n\n";

      for (const dir in this.directories) {
        // console.log("-- Dir object:", this.directories[dir]);
        text += `Directory name: "${dir}"`;
        text += "\n\nContains the following\n";
        const directory = this.directories[dir];
        const files = [];
        const folders = [];
        for (let item in directory) {
          if (directory[item].directory) {
            folders.push(directory[item]);
          } else {
            files.push(directory[item]);
          }
        }
        if (folders.length) {
          text += "\nFolders\n";
          for (const folder of folders) {
            text += `  - ${folder.name}\n`;
          }
        }
        if (files.length) {
          text += "\nFiles\n";
          for (const file of files) {
            text += `  - ${file.name} `;
            // const filepath = dir + "/" + file.name;
            // if (this.files[filepath]) {
            //   text += `\n    observed: true\n\n`;
            // } else {
            //   text += `\n    observed: false\n\n`;
            // }
            // console.log("File status to check: ", filepath);
          }
        }
        text += "\n-----\n\n";
      }

      text += "\n";
      text += "------------------\n";
    }

    if (Object.keys(this.files).length) {
      text += "\nOBSERVED_FILES:";

      for (let file in this.files) {
        text += "\nFile:\n";
        text += `${file}\n`;
        text += "\nstate: COMPLETE\n";
        text += `\n${this.files[file].summary}\n\n-----\n`;
        console.log("Filname: ", file);
      }
      text += "\n";
      text += "------------------\n";
    }

    if (this.actions.length) {
      text += "\nRECENT_ACTIONS:\n\n";

      for (const action of this.actions.slice(-8)) {
        text += `- ${action}\n`;
      }
      text += "\n";
      text += "------------------\n";
    }

    // if (this.toolOutput.length) {
    //   text += "Open File List:\n";

    //   for (const tool of this.toolOutput) {
    //     text += `- ${tool}\n`;
    //   }
    //   text += "\n";
    //   text += "--------------------------------";
    // }
    // console.log("=========== Rebuilt context ===========");
    // console.log(text);
    // console.log("\n----\n");
    return text;
  }
}

module.exports = {
  AgentMemory,
};
