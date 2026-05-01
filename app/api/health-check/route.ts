import {NextRequest} from "next/server";
import {generateText} from "ai";
import {parseSettingsFromRequest} from "@/lib/api-settings";
import {createProvider} from "@/lib/llm-provider";

// Tiny 1x1 transparent PNG
const TINY_PNG_BASE64 =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export async function POST(req: NextRequest) {
	const settings = parseSettingsFromRequest(req);
	if (settings instanceof Response) return settings;

	const body = await req.json().catch(() => ({}));
	const type = body.type;

	if (type !== "vision" && type !== "copy") {
		return new Response(
			JSON.stringify({error: "Invalid type. Must be 'vision' or 'copy'."}),
			{status: 400, headers: {"Content-Type": "application/json"}},
		);
	}

	const config = type === "vision" ? settings.vision : settings.copy;

	try {
		const provider = createProvider(config);

		if (type === "vision") {
			await generateText({
				model: provider(config.model),
				messages: [
					{
						role: "user",
						content: [
							{type: "text", text: "Describe this image in one word."},
							{
								type: "image",
								image: `data:image/png;base64,${TINY_PNG_BASE64}`,
							},
						],
					},
				],
			});
		} else {
			await generateText({
				model: provider(config.model),
				prompt: "Respond with exactly the word 'ok' and nothing else.",
			});
		}

		return new Response(JSON.stringify({ok: true}), {
			status: 200,
			headers: {"Content-Type": "application/json"},
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return new Response(JSON.stringify({ok: false, error: message}), {
			status: 200,
			headers: {"Content-Type": "application/json"},
		});
	}
}
