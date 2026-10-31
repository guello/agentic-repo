# agentic-github

Run software work through GitHub issues and pull requests, with any coding agent, local or in CI.

GitHub does not make or endorse this project. GitHub is a trademark of GitHub, Inc.

## Development

The CLI runs on Node.js 22 or later. The build needs Node.js 22.18, 24.11 or 26, and pnpm through Corepack.

```sh
pnpm install
pnpm run check   # format, lint and types
pnpm test
pnpm run build   # writes dist/agentic-github.mjs
```

Commit `dist/agentic-github.mjs` with each change to `src/`, because CI runs the committed bundle.

## License

[MIT](LICENSE)
