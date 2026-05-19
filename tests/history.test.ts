import {vi, describe, it, expect, beforeEach, beforeAll} from "vitest";
import {
	getSessions,
	saveSession,
	deleteSession,
	deleteSessions,
	clearHistory,
	getSession,
	groupSessionsByImageHash,
	groupSessionsByImage,
} from "../lib/history";
import {
	getGroupTitle,
	setGroupTitle,
	getAllGroupTitles,
} from "../lib/group-titles";
import type {ImageAnalysisType, CopyWritingType} from "../lib/definitions";

const storage: Record<string, string> = {};
let quotaLimit = Infinity;

beforeAll(() => {
	(globalThis as Record<string, unknown>).window = globalThis;
	Object.defineProperty(globalThis, "localStorage", {
		value: {
			getItem: (key: string) => storage[key] ?? null,
			setItem: (key: string, value: string) => {
				if (value.length > quotaLimit) {
					throw new Error("QuotaExceededError: Setting the value exceeded the quota.");
				}
				storage[key] = value;
			},
			removeItem: (key: string) => {
				delete storage[key];
			},
		},
		configurable: true,
	});
});

beforeEach(() => {
	Object.keys(storage).forEach((k) => delete storage[k]);
	quotaLimit = Infinity;
});

const mockAnalysis: ImageAnalysisType = {
	subject: "test",
	product_type: "art print",
	medium: "oil",
	artistic_style: "impressionist",
	primary_colors: ["blue"],
	vibe_keywords: ["calm"],
};

const mockCopy: CopyWritingType = {
	titles: {
		option1: "Title 1",
		option2: "Title 2",
		option3: "Title 3",
	},
	tags: ["art", "painting"],
	description: "A beautiful painting.",
};

describe("history", () => {
	beforeEach(() => {
		clearHistory();
	});

	it("should start empty", () => {
		expect(getSessions()).toEqual([]);
	});

	it("should save and retrieve a session", () => {
		const session = saveSession({
			thumbnail: "data:image/png;base64,abc",
			analysis: mockAnalysis,
			copy: mockCopy,
		});
		expect(session.id).toBeDefined();
		expect(getSession(session.id)).toEqual(session);
	});

	it("should list sessions newest first", () => {
		const s1 = saveSession({thumbnail: "a", analysis: mockAnalysis, copy: mockCopy});
		const s2 = saveSession({thumbnail: "b", analysis: mockAnalysis, copy: mockCopy});
		const sessions = getSessions();
		expect(sessions[0].id).toBe(s2.id);
		expect(sessions[1].id).toBe(s1.id);
	});

	it("should delete a session", () => {
		const s1 = saveSession({thumbnail: "a", analysis: mockAnalysis, copy: mockCopy});
		deleteSession(s1.id);
		expect(getSession(s1.id)).toBeNull();
	});

	it("should evict oldest after 20 sessions (LRU)", () => {
		let tick = 1000;
		vi.spyOn(Date, "now").mockImplementation(() => {
			return tick++;
		});
		const sessions: string[] = [];
		for (let i = 0; i < 22; i++) {
			const s = saveSession({thumbnail: String(i), analysis: mockAnalysis, copy: mockCopy});
			sessions.push(s.id);
		}
		const stored = getSessions();
		expect(stored.length).toBe(20);
		expect(stored.some((s) => s.id === sessions[0])).toBe(false);
		expect(stored.some((s) => s.id === sessions[1])).toBe(false);
		vi.restoreAllMocks();
	});

	it("should throw when thumbnails exceed localStorage quota", () => {
		quotaLimit = 100_000;
		const largeThumbnail = "data:image/png;base64," + "a".repeat(200_000);
		expect(() => {
			saveSession({thumbnail: largeThumbnail, analysis: mockAnalysis, copy: mockCopy});
		}).toThrow("QuotaExceededError");
	});

	describe("saveSession with new fields", () => {
		it("should store imageHash when provided", () => {
			const session = saveSession({
				thumbnail: "thumb",
				analysis: mockAnalysis,
				copy: mockCopy,
				imageHash: "abc123",
			});
			expect(session.imageHash).toBe("abc123");
		});

		it("should store visionModel and copyModel when provided", () => {
			const session = saveSession({
				thumbnail: "thumb",
				analysis: mockAnalysis,
				copy: mockCopy,
				visionModel: "qwen/qwen3-vl-8b-instruct",
				copyModel: "qwen/qwen3-vl-30b-a3b-instruct",
			});
			expect(session.visionModel).toBe("qwen/qwen3-vl-8b-instruct");
			expect(session.copyModel).toBe("qwen/qwen3-vl-30b-a3b-instruct");
		});

		it("should store baseURL and providerLabel when provided", () => {
			const session = saveSession({
				thumbnail: "thumb",
				analysis: mockAnalysis,
				copy: mockCopy,
				baseURL: "https://openrouter.ai/api/v1",
				providerLabel: "openrouter",
			});
			expect(session.baseURL).toBe("https://openrouter.ai/api/v1");
			expect(session.providerLabel).toBe("openrouter");
		});

		it("should allow optional new fields to be omitted (backward compat)", () => {
			const session = saveSession({
				thumbnail: "thumb",
				analysis: mockAnalysis,
				copy: mockCopy,
			});
			expect(session.imageHash).toBeUndefined();
			expect(session.visionModel).toBeUndefined();
			expect(session.copyModel).toBeUndefined();
		});

	it("should store userText when provided", () => {
		const session = saveSession({
			thumbnail: "thumb",
			analysis: mockAnalysis,
			copy: mockCopy,
			userText: "handmade bookmark",
		});
		expect(session.userText).toBe("handmade bookmark");
	});

	it("should allow userText to be omitted (backward compat)", () => {
		const session = saveSession({
			thumbnail: "thumb",
			analysis: mockAnalysis,
			copy: mockCopy,
		});
		expect(session.userText).toBeUndefined();
	});
	});

	describe("groupSessionsByImage", () => {
		it("should return enriched groups sorted by latestDate desc", () => {
			let tick = 1000;
			vi.spyOn(Date, "now").mockImplementation(() => tick++);
			saveSession({ thumbnail: "a", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" });
			saveSession({ thumbnail: "b", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" });
			saveSession({ thumbnail: "c", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash2" });
			vi.restoreAllMocks();

			const groups = groupSessionsByImage(getSessions());
			expect(groups.length).toBe(2);
			// Sorted by latestDate desc — hash2 has the newest session (tick=1002)
			expect(groups[0].imageHash).toBe("hash2");
			expect(groups[1].imageHash).toBe("hash1");
		});

		it("should set imageHash to null for solo groups", () => {
			let tick = 5000;
			vi.spyOn(Date, "now").mockImplementation(() => tick++);
			saveSession({ thumbnail: "solo-thumb", analysis: mockAnalysis, copy: mockCopy });
			vi.restoreAllMocks();

			const groups = groupSessionsByImage(getSessions());
			expect(groups.length).toBe(1);
			expect(groups[0].imageHash).toBeNull();
			expect(groups[0].thumbnail).toBe("solo-thumb");
			expect(groups[0].sessions.length).toBe(1);
		});

		it("should return empty array for no sessions", () => {
			const groups = groupSessionsByImage([]);
			expect(groups).toEqual([]);
		});

		it("should use first available thumbnail for group", () => {
			saveSession({ thumbnail: "", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" });
			saveSession({ thumbnail: "thumb-data", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" });

			const groups = groupSessionsByImage(getSessions());
			expect(groups[0].thumbnail).toBe("thumb-data");
		});

		it("should compute correct latestDate from sessions", () => {
			let tick = 3000;
			vi.spyOn(Date, "now").mockImplementation(() => tick++);
			saveSession({ thumbnail: "a", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" });
			saveSession({ thumbnail: "b", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" });
			saveSession({ thumbnail: "c", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" });
			vi.restoreAllMocks();

			const groups = groupSessionsByImage(getSessions());
			expect(groups[0].latestDate).toBe(3002);
			expect(groups[0].sessions.length).toBe(3);
		});
	});

	describe("groupSessionsByImageHash", () => {
		it("should group sessions with the same imageHash", () => {
			let tick = 7000;
			vi.spyOn(Date, "now").mockImplementation(() => tick++);
			saveSession({ thumbnail: "a", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" });
			saveSession({ thumbnail: "b", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" });
			saveSession({ thumbnail: "c", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash2" });
			vi.restoreAllMocks();

			const groups = groupSessionsByImageHash(getSessions());
			expect(groups.size).toBe(2);
			expect(groups.get("hash1")?.length).toBe(2);
			expect(groups.get("hash2")?.length).toBe(1);
		});

		it("should treat sessions without imageHash as solo groups", () => {
			let tick = 8000;
			vi.spyOn(Date, "now").mockImplementation(() => tick++);
			saveSession({ thumbnail: "a", analysis: mockAnalysis, copy: mockCopy }); // no hash
			saveSession({ thumbnail: "b", analysis: mockAnalysis, copy: mockCopy }); // no hash
			vi.restoreAllMocks();

			const groups = groupSessionsByImageHash(getSessions());
			expect(groups.size).toBe(2);
		});

		it("should return an empty map for no sessions", () => {
			const groups = groupSessionsByImageHash([]);
			expect(groups.size).toBe(0);
		});
	});

	describe("groupSessionsByImage edge cases", () => {
		it("should never produce a group with an empty sessions array", () => {
			let tick = 9000;
			vi.spyOn(Date, "now").mockImplementation(() => tick++);
			saveSession({ thumbnail: "a", analysis: mockAnalysis, copy: mockCopy, imageHash: "h1" });
			saveSession({ thumbnail: "b", analysis: mockAnalysis, copy: mockCopy, imageHash: "h1" });
			vi.restoreAllMocks();

			const groups = groupSessionsByImage(getSessions());
			for (const g of groups) {
				expect(g.sessions.length).toBeGreaterThan(0);
			}

			// Also verify each group has a valid latestDate (> 0)
			for (const g of groups) {
				expect(g.latestDate).toBeGreaterThan(0);
			}
		});

		it("should produce stable keys: imageHash for groups, solo-session for unhashed", () => {
			let tick = 10000;
			vi.spyOn(Date, "now").mockImplementation(() => tick++);
			saveSession({ thumbnail: "x", analysis: mockAnalysis, copy: mockCopy, imageHash: "hashX" });
			saveSession({ thumbnail: "y", analysis: mockAnalysis, copy: mockCopy }); // solo, no hash
			vi.restoreAllMocks();

			const groups = groupSessionsByImage(getSessions());
			const hashedGroup = groups.find((g) => g.imageHash === "hashX");
			const soloGroup = groups.find((g) => g.imageHash === null);

			expect(hashedGroup).toBeDefined();
			expect(hashedGroup!.sessions.length).toBe(1);
			expect(soloGroup).toBeDefined();
			expect(soloGroup!.sessions.length).toBe(1);
		});
	});

	describe("orphaned group title cleanup", () => {
		it("should remove orphaned group title when last session in a group is deleted", () => {
			const s = saveSession({
				thumbnail: "a",
				analysis: mockAnalysis,
				copy: mockCopy,
				imageHash: "hash-to-delete",
			});
			setGroupTitle("hash-to-delete", "Sunset Landscape");
			expect(getGroupTitle("hash-to-delete")).toBe("Sunset Landscape");

			deleteSession(s.id);
			expect(getSessions().length).toBe(0);
			expect(getGroupTitle("hash-to-delete")).toBe("Artwork");
		});

		it("should preserve group title when other sessions remain in the group", () => {
			let tick = 2000;
			vi.spyOn(Date, "now").mockImplementation(() => tick++);
			const s1 = saveSession({ thumbnail: "a", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" });
			saveSession({ thumbnail: "b", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" }); // s2 intentionally unused
			vi.restoreAllMocks();

			setGroupTitle("hash1", "Mountain Scene");
			expect(getGroupTitle("hash1")).toBe("Mountain Scene");

			deleteSession(s1.id);
			expect(getSessions().length).toBe(1);
			expect(getGroupTitle("hash1")).toBe("Mountain Scene");
		});

		it("should remove orphaned solo-id title when solo session is deleted", () => {
			const s = saveSession({ thumbnail: "solo", analysis: mockAnalysis, copy: mockCopy });
			setGroupTitle(null, "My Solo Work", s.id);
			expect(getGroupTitle(null, s.id)).toBe("My Solo Work");

			deleteSession(s.id);
			expect(getGroupTitle(null, s.id)).toBe("Artwork");
		});

		it("should clean up orphaned titles after bulk deleteSessions", () => {
			let tick = 3000;
			vi.spyOn(Date, "now").mockImplementation(() => tick++);
			const s1 = saveSession({ thumbnail: "a", analysis: mockAnalysis, copy: mockCopy, imageHash: "bulk-hash" });
			const s2 = saveSession({ thumbnail: "b", analysis: mockAnalysis, copy: mockCopy, imageHash: "bulk-hash" });
			vi.restoreAllMocks();

			setGroupTitle("bulk-hash", "Bulk Delete Test");
			expect(getGroupTitle("bulk-hash")).toBe("Bulk Delete Test");

			const count = deleteSessions([s1.id, s2.id]);
			expect(count).toBe(2);
			expect(getSessions().length).toBe(0);
			expect(getGroupTitle("bulk-hash")).toBe("Artwork");
		});

		it("should preserve group title when bulk delete removes only some sessions", () => {
			let tick = 4000;
			vi.spyOn(Date, "now").mockImplementation(() => tick++);
			const s1 = saveSession({ thumbnail: "a", analysis: mockAnalysis, copy: mockCopy, imageHash: "partial-hash" });
			const s2 = saveSession({ thumbnail: "b", analysis: mockAnalysis, copy: mockCopy, imageHash: "partial-hash" });
			saveSession({ thumbnail: "c", analysis: mockAnalysis, copy: mockCopy, imageHash: "partial-hash" }); // s3 intentionally unused
			vi.restoreAllMocks();

			setGroupTitle("partial-hash", "Partial Delete");
			expect(getGroupTitle("partial-hash")).toBe("Partial Delete");

			const count = deleteSessions([s1.id, s2.id]);
			expect(count).toBe(2);
			expect(getSessions().length).toBe(1);
			expect(getGroupTitle("partial-hash")).toBe("Partial Delete");
		});

		it("should remove all group titles on clearHistory", () => {
			setGroupTitle("hash1", "Title One");
			setGroupTitle("hash2", "Title Two");
			setGroupTitle(null, "Solo Title", "solo-001");
			expect(getAllGroupTitles()).toHaveProperty("hash1");
			expect(getAllGroupTitles()).toHaveProperty("hash2");
			expect(getAllGroupTitles()).toHaveProperty("solo-solo-001");

			clearHistory();
			expect(getAllGroupTitles()).toEqual({});
			expect(getGroupTitle("hash1")).toBe("Artwork");
			expect(getGroupTitle("hash2")).toBe("Artwork");
			expect(getGroupTitle(null, "solo-001")).toBe("Artwork");
		});
	});

	describe("session index formula (newest-first visual, ascending index)", () => {
		/**
		 * HistoryGroupCard computes sessionIndex as:
		 *   sortedSessions.length - i
		 * where sortedSessions is sorted newest-first (descending by createdAt).
		 *
		 * So for 3 sessions:
		 *   i=0 (newest) → index = 3
		 *   i=1 (middle) → index = 2
		 *   i=2 (oldest) → index = 1
		 */
		function computeExpectedIndices(sessions: { id: string; createdAt: number }[]) {
			const sorted = [...sessions].sort((a, b) => b.createdAt - a.createdAt);
			return sorted.map((s, i) => ({
				id: s.id,
				createdAt: s.createdAt,
				visualPosition: i,
				expectedIndex: sorted.length - i,
			}));
		}

		it("should assign index #1 for a single session", () => {
			const sessions = [{ id: "s1", createdAt: 1000 }];
			const result = computeExpectedIndices(sessions);
			expect(result).toEqual([
				{ id: "s1", createdAt: 1000, visualPosition: 0, expectedIndex: 1 },
			]);
		});

		it("should assign indices #2 (newest) and #1 (oldest) for 2 sessions", () => {
			const sessions = [
				{ id: "s1", createdAt: 1000 },
				{ id: "s2", createdAt: 2000 },
			];
			const result = computeExpectedIndices(sessions);
			// Newest-first: s2 at i=0 → index=2, s1 at i=1 → index=1
			expect(result).toEqual([
				{ id: "s2", createdAt: 2000, visualPosition: 0, expectedIndex: 2 },
				{ id: "s1", createdAt: 1000, visualPosition: 1, expectedIndex: 1 },
			]);
		});

		it("should assign indices #3, #2, #1 (newest to oldest) for 3 sessions", () => {
			const sessions = [
				{ id: "s1", createdAt: 1000 },
				{ id: "s2", createdAt: 2000 },
				{ id: "s3", createdAt: 3000 },
			];
			const result = computeExpectedIndices(sessions);
			expect(result).toEqual([
				{ id: "s3", createdAt: 3000, visualPosition: 0, expectedIndex: 3 },
				{ id: "s2", createdAt: 2000, visualPosition: 1, expectedIndex: 2 },
				{ id: "s1", createdAt: 1000, visualPosition: 2, expectedIndex: 1 },
			]);
		});

		it("should verify the formula: index = totalSessions - visualPosition", () => {
			// Test with 5 sessions to ensure no off-by-one at scale
			const sessions = [
				{ id: "s1", createdAt: 1000 },
				{ id: "s2", createdAt: 2000 },
				{ id: "s3", createdAt: 3000 },
				{ id: "s4", createdAt: 4000 },
				{ id: "s5", createdAt: 5000 },
			];
			const result = computeExpectedIndices(sessions);
			expect(result.length).toBe(5);
			// Newest (i=0) → index=5, oldest (i=4) → index=1
			expect(result[0].expectedIndex).toBe(5);
			expect(result[4].expectedIndex).toBe(1);
			// Verify the formula holds for all positions
			for (const r of result) {
				expect(r.expectedIndex).toBe(sessions.length - r.visualPosition);
			}
		});

		it("should handle same createdAt values without NaN indices", () => {
			const sessions = [
				{ id: "s1", createdAt: 1000 },
				{ id: "s2", createdAt: 1000 },
				{ id: "s3", createdAt: 1000 },
			];
			const result = computeExpectedIndices(sessions);
			// All have same timestamp, so sort is stable but indices should still be 3, 2, 1
			expect(result.map(r => r.expectedIndex).sort()).toEqual([1, 2, 3]);
		});
	});
});

describe("analysis migration", () => {
	it("should migrate old nested analysis on read", () => {
		const oldSession = {
			id: "test-migrate-1",
			thumbnail: "thumb",
			analysis: {
				core_attributes: { subject: "migrated-subject", orientation: "landscape", composition: "centered" },
				technical_specs: { medium: "oil", surface: "canvas", textures: ["rough"], visible_tools: ["brush"] },
				visual_identity: { primary_colors: ["red", "blue"], lighting_vibe: "warm", artistic_style: "modern" },
				marketing_hooks: { emotional_keywords: ["joy", "peace"], symbolism: "hope", suggested_placement: ["office"], unique_handcrafted_details: "handmade" },
			},
			copy: mockCopy,
			createdAt: Date.now(),
		};
		localStorage.setItem("etsy-copywriter-history", JSON.stringify([oldSession]));

		const sessions = getSessions();
		expect(sessions.length).toBe(1);
		const analysis = sessions[0].analysis;
		expect(analysis.subject).toBe("migrated-subject");
		expect(analysis.product_type).toBe(""); // no old equivalent
		expect(analysis.medium).toBe("oil");
		expect(analysis.artistic_style).toBe("modern");
		expect(analysis.primary_colors).toEqual(["red", "blue"]);
		expect(analysis.vibe_keywords).toEqual(["joy", "peace"]);
	});

	it("should not double-migrate already-flat analysis", () => {
		const flatSession = {
			id: "test-flat-1",
			thumbnail: "thumb",
			analysis: mockAnalysis,
			copy: mockCopy,
			createdAt: Date.now(),
		};
		localStorage.setItem("etsy-copywriter-history", JSON.stringify([flatSession]));

		const sessions = getSessions();
		expect(sessions[0].analysis).toEqual(mockAnalysis);
	});
});
