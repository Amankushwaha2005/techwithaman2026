/**
 * Downloads tech-stack icons into images/tech/ (offline use on any laptop).
 * Run: node scripts/download-tech-icons.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "images", "tech");

const icons = [
  ["html5", "html5-original.svg"],
  ["css3", "css3-original.svg"],
  ["javascript", "javascript-original.svg"],
  ["react", "react-original.svg"],
  ["nextjs", "nextjs-original.svg"],
  ["nodejs", "nodejs-original.svg"],
  ["express", "express-original.svg"],
  ["angular", "angular-original.svg"],
  ["mongodb", "mongodb-original.svg"],
  ["github", "github-original.svg"],
  ["python", "python-original.svg"],
  ["php", "php-original.svg"],
  ["wordpress", "wordpress-plain.svg"],
  ["mysql", "mysql-original.svg"],
  ["mariadb", "mariadb-original.svg"],
  ["android", "android-original.svg"],
  ["apple", "apple-original.svg"],
  ["kotlin", "kotlin-original.svg"],
  ["gitlab", "gitlab-original.svg"],
  ["docker", "docker-original.svg"],
];

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  for (const [name, file] of icons) {
    const url = `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${name}/${file}`;
    const dest = path.join(outDir, `${name}.svg`);
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed ${name}: HTTP ${res.status}`);
      process.exitCode = 1;
      continue;
    }
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    console.log("ok", path.relative(root, dest));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
