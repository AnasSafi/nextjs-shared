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
## Installation in a Consumer Project

Follow these steps to install the package from the GitLab Package Registry.

### 1. Configure the NPM registry

Create an `.npmrc` file in the **root of your project** and add the following configuration.
This tells `npm` where to download the `@nextjs-shared` packages from and how to authenticate.

```
@nextjs-shared:registry=https://gitlab.homyt.dev/api/v4/projects/21/packages/npm/
//gitlab.homyt.dev/api/v4/projects/21/packages/npm/:_authToken=${NPM_TOKEN}
```

Alternatively, you can place the configuration in your **global npm configuration** so it works for all projects on your system.

Typical locations:

* **macOS / Linux**

  ```
  ~/.npmrc
  ```

* **Windows**

  ```
  C:\Users\<your-username>\.npmrc
  ```

Add the same configuration lines to that file if you prefer a global setup.

---

### 2. Generate a GitLab Deploy Token

Create a token that allows npm to download packages from your GitLab registry.

Navigate to your GitLab project:

```
Settings → Repository → Deploy Tokens
```

Create a new **Deploy Token** with the following permission:

* `read_package_registry`

Copy the generated token value.

---

### 3. Set the `NPM_TOKEN` environment variable

Before running any npm command, define the environment variable containing the token.

**Windows (PowerShell)**

```
$env:NPM_TOKEN="your_token_here"
```

**Linux / macOS**

```
export NPM_TOKEN="your_token_here"
```

---

### 4. Install the package

Run the installation command inside your project:

```
npm install @nextjs-shared/shared
```

---

### 5. Import the shared Tailwind styles

In the file:

```
src/app/[lng]/globals.css
```

add the following line:

```
@import "@nextjs-shared/shared/tailwind.css";
```
---

## Use the Package in Development Mode

Follow these steps to test the package locally before publishing it.

1. Build the package:

```bash
npm run build
```

2. Create a local tarball of the package:

```bash
npm pack
```

3. Install the generated package in the consumer project using the absolute path:

```bash
npm install [absolute-path]\nextjs-shared\nextjs-shared-shared-0.2.174.tgz
```

Example:

```bash
npm install D:\work\projects\nextjs-shared\nextjs-shared-shared-0.2.174.tgz
```


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
git push {{name_of_git_remote}} v0.2.221  
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

