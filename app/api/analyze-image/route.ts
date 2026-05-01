import { analyzeImage } from "@/lib/getImageAnalysis";
import { createProvider } from "@/lib/llm-provider";
import { parseSettingsFromRequest } from "@/lib/api-settings";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
	const settings = parseSettingsFromRequest(req);
	if (settings instanceof Response) return settings;

	try {
		const formData = await req.formData();
		const file = formData.get("image");

		if (!(file instanceof File)) {
			return new Response(JSON.stringify({ error: "Missing image file" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const bytes = new Uint8Array(await file.arrayBuffer());
		const provider = createProvider(settings.vision);
		const model = provider(settings.vision.model);
		const result = await analyzeImage(bytes, model);
		return result.toTextStreamResponse();
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return new Response(JSON.stringify({ error: message }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}
}
