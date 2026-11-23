// SPDX-FileCopyrightText: 2023 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { NextResponse } from "next/server";
import { getInstalledDistributions } from "~/lib/localCollectors";

export const dynamic = "force-dynamic";

export async function GET() {
	return NextResponse.json(await getInstalledDistributions());
}
