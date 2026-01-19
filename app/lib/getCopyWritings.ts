import type {ImageAnalysisType, CopyWritingType} from "./definitions";
import {createOpenRouter} from "@openrouter/ai-sdk-provider";
import {createOpenAICompatible} from "@ai-sdk/openai-compatible";
import {generateText, streamText, Output} from "ai";
import {config} from "dotenv";
import {copyWritingSchema} from "./schemas";
config({quiet: true, debug: false});

const mockArtworkAnalysis: ImageAnalysisType = {
	core_attributes: {
		subject:
			"A long tunnel of vermilion torii gates leading to a bright white light at the end, with a gravel path in the foreground.",
		orientation: "portrait",
		composition:
			"A symmetrical, linear perspective composition that draws the viewer's eye down a long, narrow corridor formed by repeating red torii gates.",
	},
	technical_specs: {
		medium: "Printed poster",
		surface: "Paper",
		textures: ["smooth", "grainy", "flat"],
		visible_tools: ["printer", "ink", "cutting tool"],
	},
	visual_identity: {
		primary_colors: ["vermilion", "black", "white"],
		lighting_vibe:
			"High contrast with dramatic shadows and a bright focal point",
		artistic_style:
			"Minimalist graphic design with strong geometric forms and limited color palette",
	},
	marketing_hooks: {
		emotional_keywords: [
			"serene",
			"spiritual",
			"journey",
			"tranquility",
			"awe",
		],
		symbolism:
			"The torii gates symbolize the transition from the mundane to the sacred, representing spiritual journey and cultural heritage.",
		suggested_placement: [
			"art galleries",
			"design studios",
			"hotel lobbies",
			"museum walls",
			"corporate offices",
		],
		unique_handcrafted_details:
			"The artwork features a stylized, graphic representation with bold lines and flat areas of color, reminiscent of traditional Japanese woodblock prints.",
	},
};

//Turn off warning logs
globalThis.AI_SDK_LOG_WARNINGS = false;
//Turn off dotenv logs
config({quiet: true, debug: false});

//Create an OpenRouter instance
const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
});

//Create a LM Studio instance
const lmstudio = createOpenAICompatible({
	name: "LM Studio",
	baseURL: "http://localhost:1234/v1",
});

//Choose model from providers
const openrouterLlm = "qwen/qwen3-vl-30b-a3b-instruct";
const lmstudioLlm = "openai/gpt-oss-20b";

async function getCopyWritings(
	artworkAnalysis: ImageAnalysisType,
): Promise<CopyWritingType> {
	const {output, partialOutputStream} = streamText({
		model: openrouter.chat(openrouterLlm),
		output: Output.object({schema: copyWritingSchema}),
		maxOutputTokens: 500,
		messages: [
			{
				role: "system",
				content:
					"You are an expert copywriter for Etsy artwork listings. Create compelling titles, tags, and descriptions based on the artwork analysis provided.",
			},
			{
				role: "user",
				content: `Based on this artwork analysis, create compelling and SEO-friendly copy for Etsy listing:

				${JSON.stringify(artworkAnalysis, null, 2)}

				Output only valid JSON following the schema. Do not include any other text or keys, just the JSON object.
				`,
			},
		],
	});
	for await (const partialObject of partialOutputStream) {
		console.log(partialObject);
	}
	return output;
}

getCopyWritings(mockArtworkAnalysis);
