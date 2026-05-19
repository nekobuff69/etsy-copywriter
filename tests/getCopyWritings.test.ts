import { vi, describe, it, expect, beforeEach } from "vitest";
import { streamObject } from "ai";
import type { LanguageModel } from "ai";
import { validateImageAnalysis, generateCopy } from "../lib/getCopyWritings";
import type { ImageAnalysisType } from "@/lib/definitions";

vi.mock("ai");

const mockStreamObject = vi.mocked(streamObject);

const mockAnalysis: ImageAnalysisType = {
	subject: "test",
	product_type: "art print",
	medium: "oil",
	artistic_style: "impressionist",
	primary_colors: ["blue"],
	vibe_keywords: ["calm"],
};

describe("validateImageAnalysis", () => {
	it("should return validated data for valid analysis", () => {
		const result = validateImageAnalysis(mockAnalysis);
		expect(result).toEqual(mockAnalysis);
	});

	it("should throw for null analysis", () => {
		expect(() => validateImageAnalysis(null as unknown as ImageAnalysisType)).toThrow(
			"Analysis is empty",
		);
	});

	it("should throw for invalid analysis shape", () => {
		expect(() =>
			validateImageAnalysis({ core_attributes: { subject: "x" } } as unknown as ImageAnalysisType),
		).toThrow();
	});
});

describe("generateCopy", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockStreamObject.mockReturnValue({
			toTextStreamResponse: vi.fn(() => new Response("stream")),
		} as unknown as ReturnType<typeof streamObject>);
	});

	it("should call streamObject with the injected model", () => {
		const testModel = { _isTestModel: true } as unknown as LanguageModel;
		generateCopy(mockAnalysis, testModel);
		expect(mockStreamObject).toHaveBeenCalledWith(
			expect.objectContaining({
				model: testModel,
			}),
		);
	});

	it("should return a result with toTextStreamResponse", () => {
		const result = generateCopy(mockAnalysis, {} as unknown as LanguageModel);
		expect(result.toTextStreamResponse).toBeDefined();
	});
});
