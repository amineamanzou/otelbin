// SPDX-FileCopyrightText: 2026 OTelBin contributors
// SPDX-License-Identifier: Apache-2.0

import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import catalog from "./collector-catalog.json";
import type { Distribution, Distributions, Release } from "~/types";

const distributions: Record<string, Distribution> = catalog;

async function installedBinary(distro: string, release: Release): Promise<string | null> {
	const path = resolve(process.env.OTELBIN_COLLECTORS_DIR || ".collectors", distro, release.version, release.artifact);
	try {
		await access(path, constants.X_OK);
		return path;
	} catch {
		return null;
	}
}

export async function getCollector(distro: string, version: string): Promise<string | null> {
	if (!Object.hasOwn(distributions, distro)) return null;
	const release = distributions[distro]?.releases.find((entry) => entry.version === version);
	return release ? installedBinary(distro, release) : null;
}

export async function getInstalledDistributions(): Promise<Distributions> {
	const installed: Distributions = {};
	for (const [id, distribution] of Object.entries(distributions)) {
		const releases = await Promise.all(
			distribution.releases.map(async ({ version, artifact }) => {
				const release = { version, artifact };
				return (await installedBinary(id, release)) ? release : null;
			})
		);
		const available = releases.filter((release) => release !== null);
		if (available.length) installed[id] = { ...distribution, releases: available };
	}
	return installed;
}
