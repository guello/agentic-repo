# Agentic Repo

Automate the issue and pull request lifecycle with any coding agent, locally or in CI.

## Development

The CLI runs on Node.js 22 or later. The build needs Node.js >=22 and pnpm through Corepack.

```sh
pnpm install
pnpm check    # format, lint, types
pnpm test
pnpm build    # writes dist/agentic-repo.mjs
```

Git ignores `dist/`. The release job builds the bundle and commits it only on the release tag, because CI runs the bundle of its tag.

## License

[MIT](LICENSE)
