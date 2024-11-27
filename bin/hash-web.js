#!/usr/bin/env node

import hash_web from "../index.js";

const args = process.argv.slice(2);

if (args.length !== 2) {
  console.log(`Usage: hash-web <input> <output_dir>`)
  process.exit(1);
}

const input = args[0];
const output_dir = args[1];

function main() {
  hash_web({
    input: input,
    output_dir: output_dir
  });
}

main();
