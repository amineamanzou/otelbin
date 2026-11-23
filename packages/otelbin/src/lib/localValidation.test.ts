// SPDX-FileCopyrightText: 2026 OTelBin contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "@jest/globals";
import { parse } from "yaml";
import { prepareValidation } from "./localValidation";

describe("prepareValidation", () => {
	test("preserves the Collector fallback and passes only isolated aliases for referenced values", () => {
		const config = prepareValidation('endpoint: "${env:ENDPOINT:-localhost:4317}"\npath: "${PATH}"\n', {
			ENDPOINT: "localhost:9999",
			PATH: "sample",
			UNREFERENCED: "unused",
		});
		expect(parse(config.yaml)).toEqual({
			endpoint: "${env:OTELBIN_VALUE_0:-localhost:4317}",
			path: "${env:OTELBIN_VALUE_1}",
		});
		expect(config.env).toEqual({ OTELBIN_VALUE_0: "localhost:9999", OTELBIN_VALUE_1: "sample" });
	});

	test.each(['endpoint: "${file:example.yaml}"', 'endpoint: "\\u0024{https://example.test/config.yaml}"'])(
		"refuses non-environment providers after YAML decoding (%s)",
		(config) => {
			expect(() => prepareValidation(config, {})).toThrow("environment substitutions only");
		}
	);

	test("does not accept provider expressions from supplied environment values", () => {
		expect(() => prepareValidation('endpoint: "${env:ENDPOINT}"', { ENDPOINT: "${file:example.yaml}" })).toThrow(
			"Environment values must be literal"
		);
	});

	test("preserves escaped dollar expressions", () => {
		const config = prepareValidation("expression: '$${literal}'", {});
		expect(parse(config.yaml)).toEqual({ expression: "$${literal}" });
	});
});
