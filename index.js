import fs from "fs";
import path from "path";
import crypto from "crypto";

const html_file_ext = ".html";
const js_file_ext = ".js";
const style_file_ext = ".css";
const webmanifest_file_ext = ".webmanifest";

function gen_hash(data) {
  const hash = crypto.createHash("sha256");
  hash.update(data);
  return hash.digest("hex").substring(0, 6);
}

function set_file_hash(file_path, hash) {
  const ext = path.extname(file_path);
  return `${file_path.replaceAll(ext, "")}-${hash}${ext}`;
}

const file_cache = {};

function load_file(file_path) {
  if (file_cache[file_cache]) {
    return file_cache[file_cache];
  }

  const ext = path.extname(file_path);

  let data = null;
  let hash = null;
  let buf = null;
  const exists = fs.existsSync(file_path);
  if (exists) {
    buf = fs.readFileSync(file_path);
    data = fs.readFileSync(file_path, { encoding: "utf-8" });
    hash = gen_hash(data);
  }

  const result = { ext, buf, data, exists, path: file_path, hash };
  file_cache[file_path] = result;

  return result;
}

function load_input(file_path, { working_dir, output_dir }) {
  const file_info = load_file(path.join(working_dir, file_path));
  if (!file_info.exists) {
    console.log("skip file", file_info.path);
    return;
  }

  let imports = [];
  let copy = false;

  switch (file_info.ext) {
    case html_file_ext: // .html
      imports = parse_html_imports(file_info.data);
      break;
    case js_file_ext:  // .js
      imports = parse_js_imports(file_info.data);
      break;
    case style_file_ext: // .css
      imports = parse_style_imports(file_info.data);
      break;
    case webmanifest_file_ext: // .webmanifest
      imports = parse_webmanifest_imports(file_info.data);
      break;
    default:
      copy = true; // write the buf variable instead of the data - the data is using utf-8 encoding to make modication but sometimes you have files in other encoding (that don't need modif)
  }

  imports.forEach((imp) => {
    const fdir = path.dirname(file_path);
    const fp = path.join(fdir, imp.path);
    const imp_file_info = load_file(path.join(working_dir, fp));
    if (imp_file_info.exists) {
      const hash_path = set_file_hash(imp.path, imp_file_info.hash);
      if (imp_file_info.ext !== ".html") { // don't hash html import
        console.log("hash import", imp.path);
        file_info.data = file_info.data.replace(imp.path, hash_path);
      }

      load_input(fp, { working_dir, output_dir });
    } else {
      console.log("skip import", imp.path);
    }
  });

  let new_file_path = file_path;
  if (file_info.ext !== ".html") { // don't hash html file
    new_file_path = set_file_hash(file_path, file_info.hash);
  }

  const output = path.join(output_dir, new_file_path);
  console.log("hash file", file_info.path, new_file_path);
  const dir = path.dirname(output);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (copy) {
    fs.writeFileSync(output, file_info.buf);
  } else {
    fs.writeFileSync(output, file_info.data);
  }
}

function parse_html_imports(data) {
  const r_href = /href=['"]([^'"]*)['"]/g; // href=""
  const r_src = /src=['"]([^'"]*)['"]/g; // src=""
  const r_script_content = /<script[^>]*>([^>]*)<\/script>/g; // <script></script> handle inline script content
  const r_srcset = /srcset=['"]([^'"]*)['"]/g; // srcset="" content is separated by commas to specify image resources
  const r_object_data = /<object.+data=["']([^"']*)["']/g; // <object data=""
  const r_content = /content=['"]([^'"]*)['"]/g; // content="" mostly for meta tags 

  let imports = [];
  let match;

  while (match = r_href.exec(data)) {
    imports.push({ match: match[0], path: match[1] });
  }

  while (match = r_src.exec(data)) {
    imports.push({ match: match[0], path: match[1] });
  }

  while (match = r_script_content.exec(data)) {
    const content = match[1];
    if (content) {
      const js_imports = parse_js_imports(content);
      imports = [...imports, ...js_imports];
    }
  }

  const r_srcset_url = /^\s*([^\s]*)\s+/;
  while (match = r_srcset.exec(data)) {
    const content = match[1];
    if (content) {
      const resources = content.split(",");
      resources.forEach((resource) => {
        const sub_match = r_srcset_url.exec(resource);
        if (sub_match) {
          imports.push({ match: sub_match[0], path: sub_match[1] });
        }
      });
    }
  }

  while (match = r_object_data.exec(data)) {
    imports.push({ match: match[0], path: match[1] });
  }

  // check for relative path here because content can be anything
  // usually href and src are exclusive to resource ref so I don't check
  const r_relative_path = /^(\/|\.\/|\.\.\/).*/;
  while (match = r_content.exec(data)) {
    if (r_relative_path.test(match[1])) {
      imports.push({ match: match[0], path: match[1] });
    }
  }

  return imports;
}

function parse_js_imports(data) {
  const r_import = /import\s+[^"'`]*["'`]([^"'`]*)["'`]/g; // import "" or import test from ""
  const r_fetch = /fetch\(["'`]([^'"`]*)['"`]/g; // fetch()
  const r_url = /new\s+URL\(["'`]([^'"`]*)['"`]/g; // new URL()
  const r_request = /new\s+Request\(["'`]([^'"`]*)["'`]/g; // new Request()

  const imports = [];
  let match;

  while (match = r_import.exec(data)) {
    imports.push({ match: match[0], path: match[1] });
  }

  while (match = r_fetch.exec(data)) {
    imports.push({ match: match[0], path: match[1] });
  }

  while (match = r_url.exec(data)) {
    imports.push({ match: match[0], path: match[1] });
  }

  while (match = r_request.exec(data)) {
    imports.push({ match: match[0], path: match[1] });
  }

  return imports;
}

function parse_style_imports(data) {
  const r_url = /url\(["'](.+)["']\)/g; // url() which will work with @import url()

  const imports = [];
  let match;

  while (match = r_url.exec(data)) {
    imports.push({ match: match[0], path: match[1] });
  }

  return imports;
}

function parse_webmanifest_imports(data) {
  const r_src = /"src":\s*"([^"]+)"/g;

  const imports = [];
  let match;

  while (match = r_src.exec(data)) {
    imports.push({ match: match[0], path: match[1] });
  }

  return imports;
}

function hash_web({ input, output_dir }) {
  const working_dir = path.dirname(input);
  const file_path = path.basename(input);

  load_input(file_path, { output_dir, working_dir });
}

export default hash_web;
