const { summarizeFile } = require("../clients/summariser");
const { devPrompt } = require("../prompts/systemPrompts");

class AgentMemory {
  constructor() {
    this.files = {};
    this.directories = {};
    this.actions = [];
    this.openFiles = {};
    this.toolOutput = [];
    this.lastTrainOfThought = "";
  }

  rememberToolOutput(output) {
    this.toolOutput.push(output);
  }

  rememberDirectory(path, contents) {
    this.directories[path] = contents;
    this.actions.push(`Scanned directory ${path}  - Successfully`);
    console.log(`[Memory] - Scanned directory ${path} - Successfully`);
  }

  async rememberFile(path, contents) {
    if (this.files[path]) {
      console.log("[Memory] - Retrieving file from memory");
    } else {
      console.log("[Memory] - Retrieving file from disk");
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
      // this.toolOutput = {
      //   contents: contents,
      // };
    }

    this.actions.push(`Opened file ${path} - Successfully`);
    console.log(`[Memory] - Opened file ${path}`);
  }

  buildContext(contextFlags = {}) {
    const {
      intent,
      scope,
      isKnowledgeComplete,
      needsLocalUser,
      needsLocalNetwork,
    } = contextFlags;
    let text = "";

    text += "\nWORLD_STATE\n\n";

    if (needsLocalUser) {
      if (Object.keys(this.directories).length) {
        text += "OBSERVED_DIRECTORIES:\n\n";

        for (const dir in this.directories) {
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
          // console.log("Filname: ", file);
        }
        text += "\n";
        text += "------------------\n";
      }
    }
    let fileCount = 5;
    let actions = 8;
    if (scope === "WIDE") {
      fileCount -= 3;
      actions += 16;
    }
    if (this.actions.length) {
      text += "\nRECENT_ACTIONS:\n\n";

      for (const action of this.actions.slice(-actions)) {
        text += `- ${action}\n`;
      }
      text += "\n";
      text += "------------------\n";
    }

    if (this.toolOutput.length) {
      text += "TOOL OUTPUT:\n\n";

      for (const output of this.toolOutput.slice(-fileCount)) {
        text += `- ${output.content}\n`;
      }
      text += "\n";
      text += "------------------\n";
    }

    // if (this.toolOutput) {
    //   text +=
    //     "\nLAST_OPEN_FILE\n\nShowing only most recent file to be accessed to reduce context size.\n\n";

    //   text += `{${this.toolOutput.contents}\n`;

    //   text += "\n\n";
    //   text += "--------------------------------\n";
    // }

    return text;
  }
}

module.exports = {
  AgentMemory,
};
