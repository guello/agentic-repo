# Agentic Repo

Automate the development lifecycle of a repository using any coding agent, locally or in CI.

## Development

The CLI runs on Node.js 22 or later. The build needs Node.js >=22 and pnpm through Corepack.

```sh
pnpm install
pnpm check     # format, lint, types
pnpm test
pnpm build     # writes dist/agentic-repo.mjs
```

Git ignores `dist/`. The release job builds and commits the bundle only on release.

## License

[MIT](LICENSE)
