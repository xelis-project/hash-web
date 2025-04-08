import test from './index_2.js';
import './sub/index.js';

console.log(test);

async function main() {
  const load = await fetch(`file.data`);
}

main();