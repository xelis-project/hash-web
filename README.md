# HASH-WEB

A script that appends hashes to filenames, import paths, and any other links that connect the resources
within your entire web project.

## How does it work?

The script requires an HTML entry point to begin. It scans the page for links specifically
those with `src=""` or `href=""`, and follow these links to subsequent files. For each files,
depending on its content type (e.g, .js, .css) the script performs an additional scan to identify and
track any further links to other resources. For example, when processing a JS file, the script looks
for patterns such as `import`, `fetch`, `request`, and `url`.

As it processes each resource, the script generates a unique hash based on the file's content and appends
this hash to the corresponding links. Simultaneously, the script copies all the files to an output folder,
ensuring that resources are organized and properly linked.

This script is designed to work with any web project, as long as it used as a post-build step in your workflow.

## Why?

Force the update of your website for users who most likely have a cached version.
By changing the file path, the browser is forced to fetch the latest version, ensuring users get the update immediately
without needing to manually clear their cache or wait for it to expire.

If a file doesn't change, its hash remains the same, and the browser will serve the cached version regardless.

## How to use?

### Program

`hash-web ./public/index.html ./build`

### API

```js
hash_web({
  input: `./public/index.html`,
  output_dir: `./build`
});
```

## Handle links

| Ext | Patterns |
|-----|----------|
| `.html` | `src=""`, `href=""`, `<script></script>` |
| `.css` | `url("")` |
| `.js` | `import`, `fetch`, `new URL`, `new Request` |
| `.webmanifest` | `"src": ""` |
