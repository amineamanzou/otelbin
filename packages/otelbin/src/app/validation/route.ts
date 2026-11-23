// SPDX-FileCopyrightText: 2023 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { type NextRequest, NextResponse } from "next/server";
import z from "zod";
import { getCollector } from "~/lib/localCollectors";
import { prepareValidation, validateCollector } from "~/lib/localValidation";

const maxBody = 512 * 1024;
const payloadSchema = z.object({
	config: z
		.string()
		.min(1)
		.max(256 * 1024),
	env: z.record(z.string(), z.string().max(4096)).optional(),
});
let inFlight = 0;

const invalidRequest = (error: string, status: number) =>
	NextResponse.json({ message: "Validation could not run", error }, { status });

export async function POST(request: NextRequest): Promise<NextResponse> {
	const distro = request.nextUrl.searchParams.get("distro");
	const version = request.nextUrl.searchParams.get("version");
	const binary = distro && version && (await getCollector(distro, version));
	if (!binary) return invalidRequest("Select an installed Collector distribution and version.", 404);

	if (!request.headers.get("content-type")?.startsWith("application/json") || !request.body) {
		return invalidRequest("Expected a JSON validation request.", 400);
	}
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let bytes = 0;
	try {
		for (;;) {
			const chunk = await reader.read();
			if (chunk.done) break;
			bytes += chunk.value.byteLength;
			if (bytes > maxBody) {
				await reader.cancel();
				return invalidRequest("The configuration is too large.", 413);
			}
			chunks.push(chunk.value);
		}
	} catch {
		return invalidRequest("The configuration could not be read.", 400);
	} finally {
		reader.releaseLock();
	}

	let payload: z.infer<typeof payloadSchema>;
	try {
		payload = payloadSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
	} catch {
		return invalidRequest("Invalid configuration or environment values.", 400);
	}

	if (inFlight >= 4) return invalidRequest("The validator is busy. Try again shortly.", 429);
	inFlight += 1;
	try {
		let prepared;
		try {
			prepared = prepareValidation(payload.config, payload.env ?? {});
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unusable YAML configuration.";
			return NextResponse.json({ message: "The provided configuration is invalid", error: message });
		}
		return NextResponse.json(await validateCollector(binary, prepared));
	} catch {
		return invalidRequest("The local Collector could not complete validation.", 503);
	} finally {
		inFlight -= 1;
	}
}
