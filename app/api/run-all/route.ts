import { analyzeImage } from "@/lib/getImageAnalysis";
import { generateCopy } from "@/lib/getCopyWritings";
import { createProvider } from "@/lib/llm-provider";
import { parseSettingsFromRequest } from "@/lib/api-settings";
import { NextRequest } from "next/server";

const LLM_TIMEOUT_MS = 120_000; // 2 minutes per LLM call

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]);
}

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

		const visionProvider = createProvider(settings.vision);
		const copyProvider = createProvider(settings.copy);
		const visionModel = visionProvider(settings.vision.model);
		const copyModel = copyProvider(settings.copy.model);

		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();
				const send = (data: unknown) => {
					controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
				};

				try {
					send({ stage: "analyzing" });
					const analysisResult = await analyzeImage(bytes, visionModel);
					const analysis = await withTimeout(
						analysisResult.object,
						LLM_TIMEOUT_MS,
						"Image analysis",
					);

					send({ stage: "generating" });
					const copyResult = generateCopy(analysis, copyModel);
					const copy = await withTimeout(
						copyResult.object,
						LLM_TIMEOUT_MS,
						"Copy generation",
					);

					send({ stage: "done", analysis, copy });
					controller.close();
				} catch (err: unknown) {
					const message = err instanceof Error ? err.message : "Unknown error";
					try {
						send({ stage: "error", error: message });
					} catch {
						// stream already closed — swallow
					}
					controller.close();
				}
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Cache-Control": "no-cache",
			},
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return new Response(JSON.stringify({ error: message }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}
}
