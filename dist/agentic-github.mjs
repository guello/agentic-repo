#!/usr/bin/env node
import process from "node:process";
import { parseArgs } from "node:util";
// package.json
var version = "0.0.0";
// src/commands/index.ts
const help = `Usage: agentic-github [options]

Run software work through GitHub issues and pull requests, with any coding agent.

Options:
  -h, --help     Show this help
  -v, --version  Show the version
`;
const hint = "Run \"agentic-github --help\" for the usage.\n";
const parse = (argv) => parseArgs({
	allowPositionals: true,
	args: argv,
	options: {
		help: {
			short: "h",
			type: "boolean"
		},
		version: {
			short: "v",
			type: "boolean"
		}
	}
});
const run = (argv, io) => {
	let parsed;
	try {
		parsed = parse(argv);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		io.stderr(`${message}\n${hint}`);
		return 1;
	}
	if (parsed.values.version) {
		io.stdout(`${version}\n`);
		return 0;
	}
	const [command] = parsed.positionals;
	if (command !== void 0) {
		io.stderr(`Unknown command "${command}".\n${hint}`);
		return 1;
	}
	io.stdout(help);
	return 0;
};
// src/cli.ts
process.exitCode = run(process.argv.slice(2), {
	stderr: (text) => process.stderr.write(text),
	stdout: (text) => process.stdout.write(text)
});
export {};
