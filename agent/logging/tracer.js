// tracing.js

const { Langfuse } = require("langfuse");
require("dotenv").config();

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL,
});

module.exports = {
  langfuse,
};
