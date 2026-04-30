import {createOpenRouter} from "@openrouter/ai-sdk-provider";
import {streamObject} from "ai";
import {fileTypeFromBuffer} from "file-type";
import type {FileFormatInfo} from "./definitions";
import {imageAnalysisSchema} from "./schemas";

globalThis.AI_SDK_LOG_WARNINGS = false;

const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
});
const visionModel = "qwen/qwen3-vl-8b-instruct";
const supportedImageFormat: string[] = ["jpg", "png", "webp", "gif"];

export async function validateFormat(
	imageBytes: Uint8Array,
): Promise<FileFormatInfo> {
	if (!imageBytes || imageBytes.length === 0) {
		throw new Error("Invalid image data: must be non-empty Uint8Array.");
	}

	const fileType = await fileTypeFromBuffer(imageBytes);
	if (!fileType) throw new Error("File Type Undefined.");

	const {ext: extension, mime} = fileType;
	return {extension, mime};
}

export async function analyzeImage(imageBytes: Uint8Array) {
	const {extension, mime}: FileFormatInfo = await validateFormat(imageBytes);

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
		model: openrouter.chat(visionModel),
		schema: imageAnalysisSchema,
		messages: [
			{
				role: "system",
				content: "You are an experienced art critic.",
			},
			{
				role: "user",
				content: [
					{
						type: "text",
						text: "Describe this image in detail.",
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
