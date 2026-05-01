import type { LanguageModel } from "ai";
import { streamObject } from "ai";
import type { ImageAnalysisType } from "./definitions";
import { copyWritingSchema, imageAnalysisSchema } from "./schemas";

globalThis.AI_SDK_LOG_WARNINGS = false;

export function validateImageAnalysis(analysis: ImageAnalysisType) {
	if (!analysis) throw new Error("Analysis is empty");

	const validated = imageAnalysisSchema.safeParse(analysis);
	if (!validated.success) {
		console.error(validated.error);
		throw new Error(`Invalid data error. ${JSON.stringify(validated.error)}`);
	}
	return validated.data;
}

export function generateCopy(
	artworkAnalysis: ImageAnalysisType,
	model: LanguageModel,
) {
	const validArtworkAnalysis = validateImageAnalysis(artworkAnalysis);

	return streamObject({
		model,
		schema: copyWritingSchema,
		schemaName: "CopyWriting",
		schemaDescription:
			"Etsy listing copy with titles, tags, and description",
		messages: [
			{
				role: "system",
				content: `You are an expert copywriter for Etsy artwork listings. Create compelling titles, tags, and descriptions based on the artwork analysis provided.

Respond with a JSON object that has EXACTLY these three top-level keys:

1. "titles" — object with: option1 (string), option2 (string), option3 (string)
2. "tags" — array of 5-8 SEO strings, ordered by relevance
3. "description" — a compelling product description string

Output ONLY valid JSON with this exact structure. Do not add extra keys or use different key names.`,
			},
			{
				role: "user",
				content: `Based on this artwork analysis, create compelling and SEO-friendly copy for an Etsy listing:

${JSON.stringify(validArtworkAnalysis, null, 2)}
`,
			},
		],
	});
}
