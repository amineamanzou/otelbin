// SPDX-FileCopyrightText: 2023 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import "./globals.css";

import { type PropsWithChildren } from "react";
import { type Metadata } from "next";
import { TooltipProvider } from "~/components/tooltip";
import { Toaster } from "~/components/toaster";

export const metadata: Metadata = {
	title: "OTelBin for air-gapped environments",
	description: "Edit, visualize and validate OpenTelemetry Collector configurations offline",
};

export default function RootLayout({ children }: PropsWithChildren) {
	return (
		<html lang="en" className="dark overflow-hidden">
			<head>
				<meta name="viewport" content="initial-scale=1" />
				<link rel="preload" href="/validation/supported-distributions" as="fetch" crossOrigin="anonymous" />
			</head>
			<body className="max-h-screen min-h-screen min-w-[64rem] bg-background font-sans antialiased">
				<TooltipProvider>
					<main className="max-h-screen min-h-screen">{children}</main>
					<Toaster />
				</TooltipProvider>
			</body>
		</html>
	);
}
