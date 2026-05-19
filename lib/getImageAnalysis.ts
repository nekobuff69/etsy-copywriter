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
	userText = "",
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
			"Flat product image analysis with 6 fields",
		messages: [
			{
				role: "system",
				content: `${userText ? `User says this product is: "${userText}". Your analysis MUST respect this as ground truth about what the product actually is. The image shows the design, pattern, or artwork ON this product — not the product category itself.

` : ""}You are an experienced product photography analyst for Etsy sellers. Analyze the image and respond with a JSON object that has EXACTLY these six top-level keys:

1. "subject" — string describing what is depicted in the image (the artwork, pattern, or design shown)
2. "product_type" — string: the physical product being sold (e.g., "art print", "original painting", "bookmark", "tote bag", "sticker", "mug")
3. "medium" — string: the art medium or material (e.g., "oil on canvas", "digital art", "watercolor", "cotton paper")
4. "artistic_style" — string: the artistic style (e.g., "impressionist", "boho", "minimalist", "vintage")
5. "primary_colors" — array of strings: dominant colors in the design
6. "vibe_keywords" — array of strings: emotional and aesthetic keywords for marketing (e.g., ["calm", "elegant", "cozy"])

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
