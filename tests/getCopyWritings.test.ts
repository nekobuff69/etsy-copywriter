import { vi, describe, it, expect, beforeEach } from "vitest";
import { streamObject } from "ai";
import type { LanguageModel } from "ai";
import { validateImageAnalysis, generateCopy } from "../lib/getCopyWritings";
import type { ImageAnalysisType } from "@/lib/definitions";

vi.mock("ai");

const mockStreamObject = vi.mocked(streamObject);

const mockAnalysis: ImageAnalysisType = {
	core_attributes: {
		subject: "test",
		orientation: "landscape",
		composition: "centered",
	},
	technical_specs: {
		medium: "oil",
		surface: "canvas",
		textures: ["smooth"],
		visible_tools: ["brush"],
	},
	visual_identity: {
		primary_colors: ["blue"],
		lighting_vibe: "soft",
		artistic_style: "impressionist",
	},
	marketing_hooks: {
		emotional_keywords: ["calm"],
		symbolism: "peace",
		suggested_placement: ["living room"],
		unique_handcrafted_details: "hand-painted",
	},
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
