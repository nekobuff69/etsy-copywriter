import { describe, it, expect } from "vitest";
import { migrateAnalysis } from "../lib/schemas";

describe("migrateAnalysis", () => {
	it("should migrate complete old nested structure", () => {
		const old = {
			core_attributes: { subject: "a cat", orientation: "portrait", composition: "centered" },
			technical_specs: { medium: "watercolor", surface: "paper", textures: ["smooth"], visible_tools: ["brush"] },
			visual_identity: { primary_colors: ["pink", "white"], lighting_vibe: "soft", artistic_style: "kawaii" },
			marketing_hooks: { emotional_keywords: ["cute", "happy"], symbolism: "joy", suggested_placement: ["desk"], unique_handcrafted_details: "hand-made" },
		};
		const result = migrateAnalysis(old);
		expect(result.subject).toBe("a cat");
		expect(result.product_type).toBe("");
		expect(result.medium).toBe("watercolor");
		expect(result.artistic_style).toBe("kawaii");
		expect(result.primary_colors).toEqual(["pink", "white"]);
		expect(result.vibe_keywords).toEqual(["cute", "happy"]);
	});

	it("should return defaults for null", () => {
		const result = migrateAnalysis(null);
		expect(result.subject).toBe("");
		expect(result.product_type).toBe("");
		expect(result.medium).toBe("");
		expect(result.artistic_style).toBe("");
		expect(result.primary_colors).toEqual([]);
		expect(result.vibe_keywords).toEqual([]);
	});

	it("should return defaults for undefined", () => {
		const result = migrateAnalysis(undefined);
		expect(result.subject).toBe("");
	});

	it("should return defaults for string", () => {
		const result = migrateAnalysis("not an object");
		expect(result.subject).toBe("");
	});

	it("should return defaults for empty object", () => {
		const result = migrateAnalysis({});
		expect(result.subject).toBe("");
		expect(result.primary_colors).toEqual([]);
		expect(result.vibe_keywords).toEqual([]);
	});

	it("should handle partially missing sections", () => {
		const partial = {
			core_attributes: { subject: "only subject" },
			// no technical_specs, visual_identity, marketing_hooks
		};
		const result = migrateAnalysis(partial);
		expect(result.subject).toBe("only subject");
		expect(result.product_type).toBe("");
		expect(result.medium).toBe("");
		expect(result.artistic_style).toBe("");
		expect(result.primary_colors).toEqual([]);
		expect(result.vibe_keywords).toEqual([]);
	});

	it("should handle arrays that are not arrays", () => {
		const badArrays = {
			core_attributes: { subject: "x", orientation: "x", composition: "x" },
			technical_specs: { medium: "x", surface: "x", textures: "not-an-array", visible_tools: 123 },
			visual_identity: { primary_colors: "not-an-array", lighting_vibe: "x", artistic_style: "x" },
			marketing_hooks: { emotional_keywords: 42, symbolism: "x", suggested_placement: null, unique_handcrafted_details: "x" },
		};
		const result = migrateAnalysis(badArrays);
		expect(result.primary_colors).toEqual([]);
		expect(result.vibe_keywords).toEqual([]);
	});
});
