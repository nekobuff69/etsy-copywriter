import { generateCopy } from "@/lib/getCopyWritings";
import { createProvider } from "@/lib/llm-provider";
import { parseSettingsFromRequest } from "@/lib/api-settings";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
	const settings = parseSettingsFromRequest(req);
	if (settings instanceof Response) return settings;

	try {
		const body = await req.json();
		const analysis = body.analysis ?? body;
		const userText = typeof body.userText === "string" ? body.userText : "";
		const provider = createProvider(settings.copy);
		const model = provider(settings.copy.model);
		const result = generateCopy(analysis, model, userText);
		return result.toTextStreamResponse();
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return new Response(JSON.stringify({ error: message }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}
}
