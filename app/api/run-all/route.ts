import {analyzeImage} from "@/lib/getImageAnalysis";
import {generateCopy} from "@/lib/getCopyWritings";
import {NextRequest} from "next/server";

export async function POST(req: NextRequest) {
	try {
		const formData = await req.formData();
		const file = formData.get("image");

		if (!(file instanceof File)) {
			return new Response(JSON.stringify({error: "Missing image file"}), {
				status: 400,
				headers: {"Content-Type": "application/json"},
			});
		}

		const bytes = new Uint8Array(await file.arrayBuffer());

		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();
				const send = (data: unknown) => {
					controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
				};

				try {
					send({stage: "analyzing"});
					const analysisResult = await analyzeImage(bytes);
					const analysis = await analysisResult.object;

					send({stage: "generating"});
					const copyResult = generateCopy(analysis);
					const copy = await copyResult.object;

					send({stage: "done", analysis, copy});
					controller.close();
				} catch (err: unknown) {
					const message = err instanceof Error ? err.message : "Unknown error";
					send({stage: "error", error: message});
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
		return new Response(JSON.stringify({error: message}), {
			status: 400,
			headers: {"Content-Type": "application/json"},
		});
	}
}
