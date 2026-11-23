// SPDX-FileCopyrightText: 2026 OTelBin contributors
// SPDX-License-Identifier: Apache-2.0

import { constants, createWriteStream } from "node:fs";
import { access, chmod, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

/** @typedef {{ version: string, artifact: string, sha256: Record<string, string> }} CollectorRelease */
/** @type {Record<string, { releases: CollectorRelease[] }>} */
const catalog = JSON.parse(await readFile(new URL("../src/lib/collector-catalog.json", import.meta.url), "utf8"));
const root = resolve(process.env.OTELBIN_COLLECTORS_DIR || ".collectors");
const base = (
	process.env.COLLECTOR_RELEASES_URL ||
	"https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download"
).replace(/\/$/, "");
const platform = `${process.platform}_${process.arch === "x64" ? "amd64" : process.arch}`;

/** @param {string} distro @param {CollectorRelease} release @param {string} sha256 */
async function install(distro, release, sha256) {
	const target = join(root, distro, release.version, release.artifact);
	const marker = `${target}.archive-sha256`;
	try {
		await access(target, constants.X_OK);
		if ((await readFile(marker, "utf8")) === sha256) return;
	} catch {
		// Install when the executable or its checksum receipt is absent.
	}

	await mkdir(dirname(target), { recursive: true });
	const work = await mkdtemp(join(root, ".download-"));
	try {
		const asset = `${release.artifact}_${release.version.slice(1)}_${platform}.tar.gz`;
		const response = await fetch(`${base}/${release.version}/${asset}`, { signal: AbortSignal.timeout(180_000) });
		if (!response.ok || !response.body) throw new Error(`${asset}: HTTP ${response.status}`);

		const body = /** @type {import("node:stream/web").ReadableStream<Uint8Array>} */ (
			/** @type {unknown} */ (response.body)
		);
		const hash = createHash("sha256");
		const archive = join(work, asset);
		await pipeline(
			Readable.fromWeb(body),
			new Transform({
				transform(chunk, _encoding, callback) {
					hash.update(chunk);
					callback(null, chunk);
				},
			}),
			createWriteStream(archive)
		);
		if (hash.digest("hex") !== sha256) throw new Error(`${asset}: SHA-256 mismatch`);

		await promisify(execFile)("tar", ["-xzf", archive, "-C", work, release.artifact]);
		await chmod(join(work, release.artifact), 0o755);
		await rename(join(work, release.artifact), target);
		await writeFile(marker, sha256);
		console.log(`Installed ${distro} ${release.version}`);
	} finally {
		await rm(work, { recursive: true, force: true });
	}
}

const installers = Object.entries(catalog).flatMap(([distro, data]) =>
	data.releases.flatMap((release) => {
		const sha256 = release.sha256[platform];
		return sha256 ? [() => install(distro, release, sha256)] : [];
	})
);
if (!installers.length) throw new Error(`No pinned Collector releases for ${platform}`);
await mkdir(root, { recursive: true });
for (let index = 0; index < installers.length; index += 2) {
	await Promise.all(installers.slice(index, index + 2).map((installer) => installer()));
}
