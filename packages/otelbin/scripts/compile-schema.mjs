// SPDX-FileCopyrightText: 2026 OTelBin contributors
// SPDX-License-Identifier: Apache-2.0

import { writeFile } from "node:fs/promises";
import Ajv from "ajv";
import ajvErrors from "ajv-errors";
import standaloneCode from "ajv/dist/standalone/index.js";

const schemaDir = new URL("../src/components/monaco-editor/", import.meta.url);
const { schema } = await import(new URL("JSONSchema.ts", schemaDir).href);
const ajv = new Ajv({ allErrors: true, code: { source: true } });
ajvErrors(ajv);
const validator = ajv.compile(schema);
await writeFile(new URL("browser-schema.cjs", schemaDir), "// @ts-nocheck\n" + standaloneCode(ajv, validator));
