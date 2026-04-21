# Automatic Script Generation

## 📁 1. Create Generator Script

📄 `/scripts/generate-scripts.mjs`

```javascript
import fs from "fs";
import path from "path";
import yaml from "yaml";

const root = process.cwd();

// Read workspace config
const workspaceConfig = yaml.parse(
  fs.readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8"),
);

const patterns = workspaceConfig.packages;

// Resolve all package.json files
function getPackagePaths(patterns) {
  const glob = require("glob");

  let paths = [];
  patterns.forEach((pattern) => {
    paths = paths.concat(glob.sync(pattern + "/package.json"));
  });

  return paths;
}

const packageJsonPaths = getPackagePaths(patterns);

// Extract package names
const packages = packageJsonPaths.map((pkgPath) => {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  return {
    name: pkg.name,
    dir: path.dirname(pkgPath),
  };
});

// Generate scripts
const scripts = {};

packages.forEach((pkg) => {
  const shortName = pkg.name.replace("@debridgers/", "");

  scripts[`dev-${shortName}`] = `pnpm --filter ${pkg.name} dev`;
  scripts[`build-${shortName}`] = `pnpm --filter ${pkg.name} build`;
  scripts[`lint-${shortName}`] = `pnpm --filter ${pkg.name} lint`;
});

// Read root package.json
const rootPkgPath = path.join(root, "package.json");
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));

// Merge scripts
rootPkg.scripts = {
  ...rootPkg.scripts,
  ...scripts,
};

// Write back
fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2));

console.log("✅ Scripts generated successfully");
```

---

## 📦 2. Install Required Dependency

We used yaml + glob.

Install them:

```bash
pnpm add -D yaml glob
```

## ⚙️ 3. Add Generator Script to Root

📄 Root `package.json`

```json
{
  "scripts": {
    "generate:scripts": "node scripts/generate-scripts.mjs"
  }
}
```

---

## 🚀 4. Run Generator

```bash
pnpm generate:scripts
```

## 🎯 5. What It Produces

If you have:

- @debridgers/landing-page
- @debridgers/backend
- @debridgers/ui-web

It will generate:

```json
{
  "dev-landing-page": "pnpm --filter @debridgers/landing-page dev",
  "build-landing-page": "pnpm --filter @debridgers/landing-page build",
  "lint-landing-page": "pnpm --filter @debridgers/landing-page lint",

  "dev-backend": "pnpm --filter @debridgers/backend dev",
  "build-backend": "pnpm --filter @debridgers/backend build",
  "lint-backend": "pnpm --filter @debridgers/backend lint",

  "dev-ui-web": "pnpm --filter @debridgers/ui-web dev",
  "build-ui-web": "pnpm --filter @debridgers/ui-web build",
  "lint-ui-web": "pnpm --filter @debridgers/ui-web lint"
}
```

---

## 🔁 6. Optional: Auto-run on Install

Add this to root package.json:

```json
{
  "scripts": {
    "prepare": "pnpm generate:scripts"
  }
}
```

Now scripts regenerate automatically after install.

---

## 🧠 7. Important Design Notes

- Script names are derived from package name:
  - @debridgers/landing-page → landing-page
- Works regardless of how many packages you add
- No manual updates needed
- Fully deterministic

---

## ⚠️ Limitations (Intentional Simplicity)

- Assumes each package has:
  - dev
  - build
  - lint

If a package doesn’t have one, the command will fail - which is good (explicit contracts).

---

## 🔥 Result

You now have:

- Zero manual script maintenance
- Automatic alias generation
- Consistent command interface
- Scales with monorepo growth
  ⏭️ Next Upgrade (Optional)
