// SPDX-FileCopyrightText: 2026 OTelBin contributors
// SPDX-License-Identifier: Apache-2.0

import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { isMap, parseDocument, visit } from "yaml";

const execute = promisify(execFile);
const references = /(\$+)\{([^{}]*)\}/g;
const envReference = /^(?:env:)?([A-Za-z_][A-Za-z0-9_]*)(?::-([^\r\n]*))?$/;

export function prepareValidation(config: string, values: Record<string, string>) {
	const document = parseDocument(config);
	const yamlError = document.errors[0];
	if (yamlError) throw new Error(yamlError.message);
	if (!isMap(document.contents)) throw new Error("The Collector configuration must be a YAML mapping.");

	const env: Record<string, string> = {};
	const aliases = new Map<string, string>();
	visit(document, {
		Scalar(_key, node) {
			if (typeof node.value !== "string") return;
			// Inspect decoded YAML scalars so escaping cannot hide a provider reference.
			if (node.value.replace(references, "").includes("${")) {
				throw new Error("Nested or incomplete configuration substitutions are unavailable in offline validation.");
			}
			node.value = node.value.replace(references, (reference: string, dollars: string, expression: string) => {
				if (dollars.length % 2 === 0) return reference;
				const [, name, fallback] = envReference.exec(expression) ?? [];
				if (!name) throw new Error("Offline validation accepts environment substitutions only.");
				let alias = aliases.get(name);
				if (!alias) {
					alias = `OTELBIN_VALUE_${aliases.size}`;
					aliases.set(name, alias);
					if (Object.hasOwn(values, name)) {
						const supplied = values[name]!;
						if (supplied.includes("${")) throw new Error("Environment values must be literal.");
						env[alias] = supplied;
					}
				}
				return `${dollars}{env:${alias}${fallback === undefined ? "" : `:-${fallback}`}}`;
			});
		},
	});

	return { yaml: document.toString(), env };
}

export async function validateCollector(binary: string, config: ReturnType<typeof prepareValidation>) {
	const dir = await mkdtemp(join(tmpdir(), "otelbin-"));
	const path = join(dir, "config.yaml");
	try {
		await writeFile(path, config.yaml, { mode: 0o600 });
		try {
			await execute(binary, ["validate", "--config", path], {
				cwd: dir,
				env: {
					NODE_ENV: "production",
					HOME: dir,
					TMPDIR: dir,
					SNOWFLAKE_CRL_ON_DISK_CACHE_DIR: dir,
					...config.env,
				},
				timeout: 8_000,
				maxBuffer: 64 * 1024,
			});
			return { message: "Configuration is valid" };
		} catch (failure) {
			const error = failure as NodeJS.ErrnoException & { stderr?: string; stdout?: string };
			if (typeof error.code !== "number" || /^panic:/m.test(error.stderr ?? "")) throw error;
			const details = (error.stderr || error.stdout || "Collector validation failed.")
				.replaceAll(path, "config.yaml")
				.trim();
			return { message: "The provided configuration is invalid", error: details.slice(0, 6000) };
		}
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}
