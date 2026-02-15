# @nextjs-shared/shared

An internal shared package published to **GitLab Package Registry**.
It is consumed as **a single package** that contains utils, models, components, and any shared logic.

The goal is:
> Consumers install **one package only** and do not care about internal folder structure.

---

## Requirements

- Node.js **20+**
- npm **9/10+**
- Permission to **push tags** to this repository
- GitLab Package Registry enabled

---

## Installation

1. Create an `.npmrc` file in the root of your project with the following content:

   @nextjs-shared:registry=https://gitlab.homyt.dev/api/v4/projects/21/packages/npm/
   //gitlab.homyt.dev/api/v4/projects/21/packages/npm/:_authToken=${NPM_TOKEN}

2. Generate a token from your GitLab project:

   Navigate to:

   Settings → Repository → Deploy Tokens

   Create a new Deploy Token with the following permission:

  - read_package_registry

3. Set the `NPM_TOKEN` environment variable before running npm commands.

   Example (Windows PowerShell):

       $env:NPM_TOKEN="your_token_here"

   Example (Linux/macOS):

       export NPM_TOKEN="your_token_here"

4. Install the package:

       npm install @nextjs-shared/shared

5. In the file `src/app/[lng]/globals.css`, add the following line:

       @import "@nextjs-shared/shared/tailwind.css";


## Project Structure (example)

- `src/` – Source code
- `dist/` – Build output (generated in CI, **never committed**)
- `package.json` – Package name & version
- `.gitlab-ci.yml` – Build & publish pipeline

> ⚠️ `dist/` must NOT be committed to git.  
> It is built and published by GitLab CI.

---

## Release Workflow (After Any Change)

### 1. Make your changes
Edit files inside `src/**`.

---

### 2. (Optional) Build locally
```bash
npm ci
npm run build
```

---

### 3. Bump the version (required)

Edit the version in:
`package.json` (root)

Example:
```json
"version": "0.2.4"
```

GitLab Package Registry does not allow republishing the same version.

---

### 4. Commit & push
```bash
git add .
git commit -m "feat: ..."
git push
```

---

### 5. Create and push a tag (mandatory)

The CI publishes only on tags.

```bash
git tag v0.2.4
git push origin v0.2.4
or
git push --tags  
```

---

### 6. What CI does

**build stage**
- Runs TypeScript build
- Generates `dist/`

**publish stage**
- Runs only on tags
- Verifies tag version === package.json.version
- Publishes via `npm publish`

---

## Important Rules

✅ Tag version must match `package.json.version`
❌ Same version cannot be published twice
✅ One package → one version → one tag

---

## Common Issues

**❌ 403 Package already exists**
You are trying to publish an existing version.
**Fix:** Increase the version and push a new tag.

**❌ TypeScript cannot find exports**
- Ensure everything is exported from `src/index.ts`
- Ensure build generates:
  - `dist/index.js`
  - `dist/index.d.ts`
- Restart TypeScript Server in your IDE

---

