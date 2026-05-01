import { vi, describe, it, expect, beforeEach } from "vitest";
import { validateFormat, analyzeImage } from "../lib/getImageAnalysis";
import { fileTypeFromBuffer } from "file-type";
import { streamObject } from "ai";
import type { LanguageModel } from "ai";

vi.mock("file-type");
vi.mock("ai");

const mockFileTypeFromBuffer = vi.mocked(fileTypeFromBuffer);
const mockStreamObject = vi.mocked(streamObject);

describe("validateFormat", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return file info for valid image", async () => {
		mockFileTypeFromBuffer.mockResolvedValue({ ext: "jpg", mime: "image/jpeg" });
		const result = await validateFormat(new Uint8Array([1, 2, 3]));
		expect(result).toEqual({ extension: "jpg", mime: "image/jpeg" });
	});

	it("should throw for empty Uint8Array", async () => {
		await expect(validateFormat(new Uint8Array(0))).rejects.toThrow(
			"Invalid image data: must be non-empty Uint8Array.",
		);
	});

	it("should throw for undefined file type", async () => {
		mockFileTypeFromBuffer.mockResolvedValue(undefined);
		await expect(validateFormat(new Uint8Array([1]))).rejects.toThrow(
			"File Type Undefined.",
		);
	});

	it("should handle png", async () => {
		mockFileTypeFromBuffer.mockResolvedValue({ ext: "png", mime: "image/png" });
		const result = await validateFormat(new Uint8Array([1]));
		expect(result).toEqual({ extension: "png", mime: "image/png" });
	});
});

describe("analyzeImage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockStreamObject.mockReturnValue({
			toTextStreamResponse: vi.fn(() => new Response("stream")),
		} as unknown as ReturnType<typeof streamObject>);
	});

	it("should proceed for valid image and pass model to streamObject", async () => {
		mockFileTypeFromBuffer.mockResolvedValue({ ext: "png", mime: "image/png" });
		const testModel = { _isTestModel: true } as unknown as LanguageModel;
		const result = await analyzeImage(new Uint8Array([1, 2, 3]), testModel);
		expect(mockStreamObject).toHaveBeenCalledWith(
			expect.objectContaining({
				model: testModel,
			}),
		);
		expect(result.toTextStreamResponse).toBeDefined();
	});

	it("should throw for non-image mime", async () => {
		mockFileTypeFromBuffer.mockResolvedValue({ ext: "md", mime: "text/markdown" });
		await expect(analyzeImage(new Uint8Array([1]), {} as unknown as LanguageModel)).rejects.toThrow(
			"Validation failed. Please use image files: jpg, png, webp, gif",
		);
	});

	it("should throw for unsupported image extension", async () => {
		mockFileTypeFromBuffer.mockResolvedValue({ ext: "bmp", mime: "image/bmp" });
		await expect(analyzeImage(new Uint8Array([1]), {} as unknown as LanguageModel)).rejects.toThrow(
			"Make sure your image is one of the following formats: jpg, png, webp, gif",
		);
	});
});
