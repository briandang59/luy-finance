import { readdir, readFile } from "node:fs/promises";
import { SourceTextModule } from "node:vm";
async function walk(dir) {
  for (const file of await readdir(dir, { withFileTypes: true })) {
    const target = `${dir}/${file.name}`;
    if (file.isDirectory()) await walk(target);
    else if (/\.(mjs|js)$/.test(file.name)) {
      new SourceTextModule(await readFile(target, "utf8"), { identifier: target });
    }
  }
}
for (const dir of ["public", "api", "lib", "scripts", "tests"]) await walk(dir);
for (const file of ["public/index.html", "public/styles.css", "public/app.js", "vercel.json"]) await readFile(file);
console.log("Source syntax and deployment files: OK. Static output: public/");
