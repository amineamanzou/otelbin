// SPDX-FileCopyrightText: 2023 Dash0 Inc.
// SPDX-License-Identifier: Apache-2.0

import { DownloadImageButton } from "~/components/share/DownloadImageButton";
import { UrlCopy } from "~/components/share/UrlCopy";
import { useUrlState } from "~/lib/urlState/client/useUrlState";
import { editorBinding } from "~/components/monaco-editor/editorBinding";
import { envVarBinding } from "~/components/validation/binding";

export function ShareContent() {
	const [, getLink] = useUrlState([editorBinding, envVarBinding]);
	const url = window.location.origin + getLink({ env: {} });

	return (
		<div>
			<p className="mx-4 my-3 text-sm text-default">This link contains the Collector configuration.</p>
			<UrlCopy url={url} />
			<div className="mx-4 my-3">
				<DownloadImageButton />
			</div>
		</div>
	);
}
