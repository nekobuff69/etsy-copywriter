"use client";

import { Toaster } from "sonner";

export function KamiToaster() {
	return (
		<Toaster
			position="top-right"
			closeButton
			toastOptions={{
				className: "kami-toast",
			}}
		/>
	);
}
