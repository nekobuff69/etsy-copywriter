import {createOpenRouter} from "@openrouter/ai-sdk-provider";
import {generateText, Output, streamText} from "ai";
import fs from "node:fs";
import path from "path";
import {config} from "dotenv";
import {fileTypeFromFile} from "file-type";
import type {FileFormatInfo, ImageAnalysisType} from "@/app/lib/definitions";
import {imageAnalysisSchema} from "./schemas";

//Turn off warning logs
globalThis.AI_SDK_LOG_WARNINGS = false;
//Turn off dotenv logs
config({quiet: true, debug: false});

// Create an OpenRouter instance
const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
});
const visionModel = "qwen/qwen3-vl-8b-instruct";

const supportedImageFormat: string[] = ["jpg", "png", "webp", "gif"];

// File format detection and validation before passing it to encodeImageToBase64 fucntion
export async function validateFormat(
	filePath: string,
): Promise<FileFormatInfo> {
	if (!filePath || typeof filePath !== "string") {
		throw Error("Invalid file path: must be a non-empty string.");
	}

	const fileType = await fileTypeFromFile(filePath);
	if (!fileType) throw new Error("File Type Undefined.");

	const fileExtension = fileType.ext;
	const fileMime = fileType.mime;
	console.log(
		`\nFileFormatInfo:\nExtension:${fileExtension}; MIME:${fileMime}`,
	);
	return {extension: fileExtension, mime: fileMime};
}

async function encodeImageToBase64(
	filePath: string,
	mime: string,
): Promise<string> {
	const imageBuffer = await fs.promises.readFile(filePath);
	//check for empty file
	if (imageBuffer.length === 0) throw new Error("File is empty");

	const base64Image = imageBuffer.toString("base64");
	console.log("FINNISHED ENCODING IMAGE");
	return `data:${mime};base64, ${base64Image}`;
}

export async function getImageAnalysis(
	filePath: string,
): Promise<ImageAnalysisType> {
	//File validation
	const {extension, mime}: FileFormatInfo = await validateFormat(filePath);
	//Terminate task if file is not valid.
	if (!mime.startsWith("image/")) {
		throw Error(
			`Validation failed. Please use image files: ${supportedImageFormat.join()}`,
		);
	} else if (!supportedImageFormat.includes(extension)) {
		throw new Error(
			`Make sure your image is one of the following format: ${supportedImageFormat.join()}`,
		);
	}

	console.log("VALIDATION PASSED");
	console.log("ENCODING IMAGE");
	const imageEncoded = await encodeImageToBase64(filePath, mime);

	//send request to AI model
	//return a structured output following imageAnalysisSchema
	console.log("GENERATING IMAGE ANALYSIS");
	const {output, partialOutputStream} = streamText({
		model: openrouter.chat(visionModel),
		output: Output.object({schema: imageAnalysisSchema}),
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
						text: "describe this image in details",
					},
					{
						type: "image",
						image: imageEncoded,
					},
				],
			},
		],
		maxOutputTokens: 500,
		onError({error}) {
			console.error(error);
		},
	});
	for await (const partialObject of partialOutputStream) {
		console.log(partialObject);
	}
	return output;
}

const imagePath = "./public/test.png";
const absolutePath = path.join(process.cwd(), imagePath);
getImageAnalysis(absolutePath);
