import {NextRequest} from "next/server";
import {appSettingsSchema, type AppSettings, decodeConfigHeader} from "./settings";

export function parseSettingsFromRequest(req: NextRequest): AppSettings | Response {
	const header = req.headers.get("X-LLM-Config");
	if (!header) {
		return new Response(JSON.stringify({error: "Missing X-LLM-Config header"}), {
			status: 400,
			headers: {"Content-Type": "application/json"},
		});
	}

	let decoded: unknown;
	try {
		decoded = decodeConfigHeader(header);
	} catch {
		return new Response(
			JSON.stringify({error: "Invalid X-LLM-Config header: not valid base64 JSON"}),
			{status: 400, headers: {"Content-Type": "application/json"}},
		);
	}

	const parsed = appSettingsSchema.safeParse(decoded);
	if (!parsed.success) {
		return new Response(
			JSON.stringify({
				error: "Invalid X-LLM-Config header: schema validation failed",
				details: parsed.error.flatten(),
			}),
			{status: 400, headers: {"Content-Type": "application/json"}},
		);
	}

	return parsed.data;
}
