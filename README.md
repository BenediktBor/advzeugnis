# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## GitHub Pages

The repository is configured to deploy the static Nuxt build through GitHub Actions.
In GitHub, set **Settings > Pages > Build and deployment > Source** to **GitHub Actions**.

The workflow runs linting, tests, and type checks first. On pushes to `main` or `master`,
it then generates `.output/public` and deploys it to GitHub Pages.

For local testing with the same base path as project Pages, run:

```bash
NUXT_APP_BASE_URL=/advzeugnis/ npm run generate
```
