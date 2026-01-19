import {vi, describe, it, expect, beforeEach, beforeAll} from "vitest";
import {validateFormat, getImageAnalysis} from "../getImageAnalysis";
import {fileTypeFromFile} from "file-type";
import {generateText} from "ai";

// Mock dependencies
vi.mock("file-type");
vi.mock("ai");
vi.mock("@openrouter/ai-sdk-provider");
vi.mock("dotenv", () => ({
	config: vi.fn(),
}));

const mockFileTypeFromFile = vi.mocked(fileTypeFromFile);
const mockGenerateText = vi.mocked(generateText);

describe("validateFormat", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return file info for valid image", async () => {
		mockFileTypeFromFile.mockResolvedValue({ext: "jpg", mime: "image/jpeg"});
		const result = await validateFormat("/path/to/image.jpg");
		expect(result).toEqual({extension: "jpg", mime: "image/jpeg"});
	});

	it("should throw for invalid file path: null", async () => {
		await expect(validateFormat(null as any)).rejects.toThrow(
			"Invalid file path: must be a non-empty string.",
		);
	});

	it("should throw for invalid file path: undefined", async () => {
		await expect(validateFormat(undefined as any)).rejects.toThrow(
			"Invalid file path: must be a non-empty string.",
		);
	});

	it("should throw for invalid file path: empty string", async () => {
		await expect(validateFormat("")).rejects.toThrow(
			"Invalid file path: must be a non-empty string.",
		);
	});

	it("should throw for invalid file path: non-string", async () => {
		await expect(validateFormat(123 as any)).rejects.toThrow(
			"Invalid file path: must be a non-empty string.",
		);
	});

	it("should throw for file not found", async () => {
		mockFileTypeFromFile.mockRejectedValue(
			new Error("ENOENT: no such file or directory"),
		);
		await expect(validateFormat("/nonexistent")).rejects.toThrow(
			"ENOENT: no such file or directory",
		);
	});

	it("should throw for undefined file type", async () => {
		mockFileTypeFromFile.mockResolvedValue(undefined);
		await expect(validateFormat("/path")).rejects.toThrow(
			"File Type Undefined.",
		);
	});

	it("should handle file with special characters in path", async () => {
		mockFileTypeFromFile.mockResolvedValue({ext: "png", mime: "image/png"});
		const result = await validateFormat("/path with spaces/image.png");
		expect(result).toEqual({extension: "png", mime: "image/png"});
	});
});

// describe("getImageAnalysis validation", () => {
// 	beforeEach(() => {
// 		vi.clearAllMocks();
// 		mockReadFile.mockResolvedValue(Buffer.from("fake image data"));
// 		mockGenerateText.mockResolvedValue({output: {}} as any);
// 	});

// 	it("should proceed for valid image", async () => {
// 		mockFileTypeFromFile.mockResolvedValue({ext: "png", mime: "image/png"});
// 		await expect(getImageAnalysis("/path/to/image.png")).resolves.not.toThrow();
// 	});

// 	it("should throw for non-image mime", async () => {
// 		mockFileTypeFromFile.mockResolvedValue({ext: "md", mime: "text/markdown"});
// 		await expect(getImageAnalysis("/path/to/file.md")).rejects.toThrow(
// 			"Validation failed. Please use image files: jpg,png,webp,gif",
// 		);
// 	});

// 	it("should throw for unsupported image extension", async () => {
// 		mockFileTypeFromFile.mockResolvedValue({ext: "bmp", mime: "image/bmp"});
// 		await expect(getImageAnalysis("/path/to/image.bmp")).rejects.toThrow(
// 			"Make sure your image is one of the following format: jpg,png,webp,gif",
// 		);
// 	});

// 	it("should throw for empty file", async () => {
// 		mockFileTypeFromFile.mockResolvedValue({ext: "jpg", mime: "image/jpeg"});
// 		mockReadFile.mockResolvedValue(Buffer.alloc(0));
// 		await expect(getImageAnalysis("/path/to/empty.jpg")).rejects.toThrow(
// 			"File is empty",
// 		);
// 	});

// 	it("should handle large file", async () => {
// 		mockFileTypeFromFile.mockResolvedValue({ext: "webp", mime: "image/webp"});
// 		const largeBuffer = Buffer.alloc(1024 * 1024); // 1MB
// 		mockReadFile.mockResolvedValue(largeBuffer);
// 		await expect(
// 			getImageAnalysis("/path/to/large.webp"),
// 		).resolves.not.toThrow();
// 	});
// });
