import type { LanguageModel } from "ai";
import { streamObject } from "ai";
import { fileTypeFromBuffer } from "file-type";
import type { FileFormatInfo } from "./definitions";
import { imageAnalysisSchema } from "./schemas";

globalThis.AI_SDK_LOG_WARNINGS = false;

const supportedImageFormat: string[] = ["jpg", "png", "webp", "gif"];

export async function validateFormat(
	imageBytes: Uint8Array,
): Promise<FileFormatInfo> {
	if (!imageBytes || imageBytes.length === 0) {
		throw new Error("Invalid image data: must be non-empty Uint8Array.");
	}

	const fileType = await fileTypeFromBuffer(imageBytes);
	if (!fileType) throw new Error("File Type Undefined.");

	const { ext: extension, mime } = fileType;
	return { extension, mime };
}

export async function analyzeImage(
	imageBytes: Uint8Array,
	model: LanguageModel,
) {
	const { extension, mime }: FileFormatInfo = await validateFormat(imageBytes);

	if (!mime.startsWith("image/")) {
		throw new Error(
			`Validation failed. Please use image files: ${supportedImageFormat.join(", ")}`,
		);
	}
	if (!supportedImageFormat.includes(extension)) {
		throw new Error(
			`Make sure your image is one of the following formats: ${supportedImageFormat.join(", ")}`,
		);
	}

	const base64Image = `data:${mime};base64,${Buffer.from(imageBytes).toString("base64")}`;

	return streamObject({
		model,
		schema: imageAnalysisSchema,
		schemaName: "ImageAnalysis",
		schemaDescription:
			"Detailed artwork analysis with core attributes, technical specs, visual identity, and marketing hooks",
		messages: [
			{
				role: "system",
				content: `You are an experienced art critic. Analyze the image and respond with a JSON object that has EXACTLY these four top-level keys:

1. "core_attributes" — object with: subject (string), orientation (one of: "landscape", "portrait", "square"), composition (string)
2. "technical_specs" — object with: medium (string), surface (string), textures (array of strings), visible_tools (array of strings)
3. "visual_identity" — object with: primary_colors (array of strings), lighting_vibe (string), artistic_style (string)
4. "marketing_hooks" — object with: emotional_keywords (array of strings), symbolism (string), suggested_placement (array of strings), unique_handcrafted_details (string)

Output ONLY valid JSON with this exact structure. Do not add extra keys or use different key names.`,
			},
			{
				role: "user",
				content: [
					{
						type: "text",
						text: "Analyze this image in detail following the structure above.",
					},
					{
						type: "image",
						image: base64Image,
					},
				],
			},
		],
	});
}
