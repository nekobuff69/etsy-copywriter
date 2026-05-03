import { describe, it, expect, beforeEach } from "vitest";
import {
	getSessions,
	groupSessionsByImage,
	clearHistory,
} from "../lib/history";
import type { ImageAnalysisType, CopyWritingType } from "../lib/definitions";

const mockAnalysis: ImageAnalysisType = {
	core_attributes: { subject: "test", orientation: "landscape", composition: "centered" },
	technical_specs: { medium: "oil", surface: "canvas", textures: ["smooth"], visible_tools: ["brush"] },
	visual_identity: { primary_colors: ["blue"], lighting_vibe: "soft", artistic_style: "impressionist" },
	marketing_hooks: { emotional_keywords: ["calm"], symbolism: "peace", suggested_placement: ["living room"], unique_handcrafted_details: "hand-painted" },
};

const mockCopy: CopyWritingType = {
	titles: { option1: "Title 1", option2: "Title 2", option3: "Title 3" },
	tags: ["art", "painting"],
	description: "A beautiful painting.",
};

const STORAGE_KEY = "etsy-copywriter-history";
const storage: Record<string, string> = {};

beforeEach(() => {
	Object.keys(storage).forEach((k) => delete storage[k]);

	Object.defineProperty(globalThis, "localStorage", {
		value: {
			getItem: (key: string) => storage[key] ?? null,
			setItem: (key: string, value: string) => { storage[key] = value; },
			removeItem: (key: string) => { delete storage[key]; },
		},
		configurable: true,
	});
	Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true });
	clearHistory();
});

describe("DUPLICATE ID MIGRATION — old sessions with colliding Date.now() ids", () => {
	it("fixes duplicate IDs on read, so toggle only affects one session", () => {
		// Simulate old sessions with duplicate Date.now() ids
		const oldSessions = [
			{ id: "1650000000000", imageHash: "hash1", createdAt: 1001, thumbnail: "a", analysis: mockAnalysis, copy: mockCopy },
			{ id: "1650000000000", imageHash: "hash1", createdAt: 1002, thumbnail: "b", analysis: mockAnalysis, copy: mockCopy },
			{ id: "1650000000001", imageHash: "hash1", createdAt: 1003, thumbnail: "c", analysis: mockAnalysis, copy: mockCopy },
		];
		storage[STORAGE_KEY] = JSON.stringify(oldSessions);

		const groups = groupSessionsByImage(getSessions());
		expect(groups.length).toBe(1);
		expect(groups[0].sessions.length).toBe(3);

		const sessions = groups[0].sessions;

		// FIXED: sessions 0 and 1 now have DIFFERENT IDs
		expect(sessions[0].id).not.toBe(sessions[1].id);
		expect(sessions[0].id).not.toBe(sessions[2].id);
		expect(sessions[1].id).not.toBe(sessions[2].id);

		// Verify all IDs are unique
		const ids = sessions.map((s) => s.id);
		expect(new Set(ids).size).toBe(3);

		// Simulate toggleSession — click session 0
		let expandedSessionId: string | null = null;
		const toggleWithSession = (id: string) => {
			expandedSessionId = expandedSessionId === id ? null : id;
		};

		// CORRECT BEHAVIOR: clicking session 0 expands ONLY session 0
		toggleWithSession(sessions[0].id);
		const isExpanded = sessions.map((s) => expandedSessionId === s.id);
		expect(isExpanded).toEqual([true, false, false]); // Only session 0 is expanded!
	});

	it("toggleSession correctly expands/collapses one session at a time after dedup", () => {
		const oldSessions = [
			{ id: "1650000000000", imageHash: "hash1", createdAt: 1001, thumbnail: "a", analysis: mockAnalysis, copy: mockCopy },
			{ id: "1650000000000", imageHash: "hash1", createdAt: 1002, thumbnail: "b", analysis: mockAnalysis, copy: mockCopy },
			{ id: "1650000000001", imageHash: "hash1", createdAt: 1003, thumbnail: "c", analysis: mockAnalysis, copy: mockCopy },
		];
		storage[STORAGE_KEY] = JSON.stringify(oldSessions);

		const groups = groupSessionsByImage(getSessions());
		const sessions = groups[0].sessions;

		let expandedSessionId: string | null = null;
		const toggleWithSession = (id: string) => {
			expandedSessionId = expandedSessionId === id ? null : id;
		};

		// Click session 0 to expand — only session 0 expands
		toggleWithSession(sessions[0].id);
		expect(sessions.map((s) => expandedSessionId === s.id)).toEqual([true, false, false]);

		// Click session 0 to collapse — only session 0 collapses
		toggleWithSession(sessions[0].id);
		expect(sessions.map((s) => expandedSessionId === s.id)).toEqual([false, false, false]);

		// Click session 1 to expand — only session 1 expands
		toggleWithSession(sessions[1].id);
		expect(sessions.map((s) => expandedSessionId === s.id)).toEqual([false, true, false]);

		// Click session 2 to expand — session 1 collapses, session 2 expands
		toggleWithSession(sessions[2].id);
		expect(sessions.map((s) => expandedSessionId === s.id)).toEqual([false, false, true]);
	});

	it("persists fixed IDs back to localStorage", () => {
		// Simulate old data with duplicates
		const oldSessions = [
			{ id: "1650000000000", imageHash: "hash1", createdAt: 1001, thumbnail: "a", analysis: mockAnalysis, copy: mockCopy },
			{ id: "1650000000000", imageHash: "hash1", createdAt: 1002, thumbnail: "b", analysis: mockAnalysis, copy: mockCopy },
		];
		storage[STORAGE_KEY] = JSON.stringify(oldSessions);

		// First read triggers migration and saves back
		getSessions();
		const savedRaw = storage[STORAGE_KEY];
		expect(savedRaw).toBeDefined();
		const saved = JSON.parse(savedRaw);
		expect(saved.length).toBe(2);
		expect(saved[0].id).not.toBe(saved[1].id);
	});
});
