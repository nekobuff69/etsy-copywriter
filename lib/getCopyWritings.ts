import type {ImageAnalysisType} from "./definitions";
import {createOpenRouter} from "@openrouter/ai-sdk-provider";
import {streamObject} from "ai";
import {copyWritingSchema, imageAnalysisSchema} from "./schemas";

globalThis.AI_SDK_LOG_WARNINGS = false;

const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
});

const copyModel = "qwen/qwen3-vl-30b-a3b-instruct";

export function validateImageAnalysis(analysis: ImageAnalysisType) {
	if (!analysis) throw new Error("Analysis is empty");

	const validated = imageAnalysisSchema.safeParse(analysis);
	if (!validated.success) {
		console.error(validated.error);
		throw new Error(`Invalid data error. ${JSON.stringify(validated.error)}`);
	}
	return validated.data;
}

export function generateCopy(artworkAnalysis: ImageAnalysisType) {
	const validArtworkAnalysis = validateImageAnalysis(artworkAnalysis);

	return streamObject({
		model: openrouter.chat(copyModel),
		schema: copyWritingSchema,
		messages: [
			{
				role: "system",
				content:
					"You are an expert copywriter for Etsy artwork listings. Create compelling titles, tags, and descriptions based on the artwork analysis provided.",
			},
			{
				role: "user",
				content: `Based on this artwork analysis, create compelling and SEO-friendly copy for an Etsy listing:

${JSON.stringify(validArtworkAnalysis, null, 2)}

Output only valid JSON following the schema. Do not include any other text or keys, just the JSON object.
`,
			},
		],
	});
}
