import {generateCopy} from "@/lib/getCopyWritings";
import {NextRequest} from "next/server";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const result = generateCopy(body);
		return result.toTextStreamResponse();
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return new Response(JSON.stringify({error: message}), {
			status: 400,
			headers: {"Content-Type": "application/json"},
		});
	}
}
