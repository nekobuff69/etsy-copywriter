import {analyzeImage} from "@/lib/getImageAnalysis";
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
		const result = await analyzeImage(bytes);
		return result.toTextStreamResponse();
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return new Response(JSON.stringify({error: message}), {
			status: 400,
			headers: {"Content-Type": "application/json"},
		});
	}
}
