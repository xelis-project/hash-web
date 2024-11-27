import hash_web from '../index.js';

function main() {
  hash_web({
    input: "./project/index.html",
    output_dir: "./build"
  });  
}

main();