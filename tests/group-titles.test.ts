import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import {
	getGroupTitle,
	setGroupTitle,
	getAllGroupTitles,
	cleanupOrphanedGroupTitles,
} from "../lib/group-titles";
import type { HistorySession } from "../lib/history";

const storage: Record<string, string> = {};

beforeAll(() => {
	(globalThis as Record<string, unknown>).window = globalThis;
	Object.defineProperty(globalThis, "localStorage", {
		value: {
			getItem: (key: string) => storage[key] ?? null,
			setItem: (key: string, value: string) => {
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
});

const STORAGE_KEY = "etsy-copywriter-group-titles";

function readStoredTitles(): Record<string, string> {
	const raw = storage[STORAGE_KEY];
	return raw ? JSON.parse(raw) : {};
}

describe("group-titles", () => {
	describe("getGroupTitle", () => {
		it("falls back to 'Artwork' when no titles stored", () => {
			expect(getGroupTitle("abc123")).toBe("Artwork");
		});

		it("falls back to 'Artwork' when key not found", () => {
			setGroupTitle("abc123", "Sunset");
			expect(getGroupTitle("different-key")).toBe("Artwork");
		});

		it("returns stored title for imageHash key", () => {
			setGroupTitle("abc123", "Sunset Landscape");
			expect(getGroupTitle("abc123")).toBe("Sunset Landscape");
		});

		it("returns stored title for solo-id key", () => {
			setGroupTitle(null, "Solo Art", "session-001");
			expect(getGroupTitle(null, "session-001")).toBe("Solo Art");
		});

		it("uses custom fallback when provided", () => {
			expect(getGroupTitle("missing", undefined, "Untitled")).toBe("Untitled");
		});

		it("distinguishes between different keys", () => {
			setGroupTitle("hash1", "Group One");
			setGroupTitle("hash2", "Group Two");
			expect(getGroupTitle("hash1")).toBe("Group One");
			expect(getGroupTitle("hash2")).toBe("Group Two");
		});

		it("falls back for solo-id when key not found", () => {
			expect(getGroupTitle(null, "nonexistent")).toBe("Artwork");
		});
	});

	describe("setGroupTitle", () => {
		it("writes to localStorage under the correct key", () => {
			setGroupTitle("abc123", "My Artwork");
			const stored = readStoredTitles();
			expect(stored["abc123"]).toBe("My Artwork");
		});

		it("persists across calls (doesn't overwrite unrelated keys)", () => {
			setGroupTitle("hash1", "First");
			setGroupTitle("hash2", "Second");
			const stored = readStoredTitles();
			expect(stored["hash1"]).toBe("First");
			expect(stored["hash2"]).toBe("Second");
		});

		it("overwrites existing title for the same key", () => {
			setGroupTitle("abc123", "Old Title");
			setGroupTitle("abc123", "New Title");
			expect(getGroupTitle("abc123")).toBe("New Title");
		});

		it("handles solo-id key correctly", () => {
			setGroupTitle(null, "Solo Piece", "solo-session-1");
			expect(getGroupTitle(null, "solo-session-1")).toBe("Solo Piece");
		});

		it("accepts empty string title", () => {
			setGroupTitle("abc123", "");
			expect(getGroupTitle("abc123")).toBe("");
		});
	});

	describe("getAllGroupTitles", () => {
		it("returns empty object when nothing stored", () => {
			expect(getAllGroupTitles()).toEqual({});
		});

		it("returns all stored titles", () => {
			setGroupTitle("h1", "One");
			setGroupTitle("h2", "Two");
			const all = getAllGroupTitles();
			expect(all).toEqual({ h1: "One", h2: "Two" });
		});
	});

	describe("cleanupOrphanedGroupTitles", () => {
		function mockSession(overrides: Partial<HistorySession> = {}): HistorySession {
			return {
				id: "test-id",
				thumbnail: "",
				analysis: {} as HistorySession["analysis"],
				copy: {} as HistorySession["copy"],
				createdAt: Date.now(),
				...overrides,
			};
		}

		it("removes titles whose keys no longer have any sessions", () => {
			setGroupTitle("orphan-hash", "Orphaned");
			setGroupTitle("active-hash", "Active");
			const sessions: HistorySession[] = [mockSession({ imageHash: "active-hash" })];
			cleanupOrphanedGroupTitles(sessions);
			expect(getGroupTitle("orphan-hash")).toBe("Artwork");
			expect(getGroupTitle("active-hash")).toBe("Active");
		});

		it("preserves titles for active groups", () => {
			setGroupTitle("hash1", "Group One");
			setGroupTitle("hash2", "Group Two");
			const sessions: HistorySession[] = [
				mockSession({ imageHash: "hash1" }),
				mockSession({ imageHash: "hash2" }),
			];
			cleanupOrphanedGroupTitles(sessions);
			expect(getGroupTitle("hash1")).toBe("Group One");
			expect(getGroupTitle("hash2")).toBe("Group Two");
		});

		it("is a no-op when nothing to clean", () => {
			setGroupTitle("h1", "Title One");
			const sessions: HistorySession[] = [mockSession({ imageHash: "h1" })];
			cleanupOrphanedGroupTitles(sessions);
			expect(getGroupTitle("h1")).toBe("Title One");
		});

		it("cleans orphaned solo-id titles", () => {
			setGroupTitle(null, "Active Solo", "active-id");
			setGroupTitle(null, "Orphan Solo", "orphan-id");
			const sessions: HistorySession[] = [mockSession({ id: "active-id" })];
			cleanupOrphanedGroupTitles(sessions);
			expect(getGroupTitle(null, "active-id")).toBe("Active Solo");
			expect(getGroupTitle(null, "orphan-id")).toBe("Artwork");
		});

		it("preserves active solo alongside hash titles", () => {
			setGroupTitle("hash1", "Hashed Group");
			setGroupTitle(null, "Solo Group", "solo-1");
			const sessions: HistorySession[] = [
				mockSession({ imageHash: "hash1" }),
				mockSession({ id: "solo-1" }),
			];
			cleanupOrphanedGroupTitles(sessions);
			expect(getGroupTitle("hash1")).toBe("Hashed Group");
			expect(getGroupTitle(null, "solo-1")).toBe("Solo Group");
		});

		it("removes all titles when sessions array is empty", () => {
			setGroupTitle("h1", "One");
			setGroupTitle("h2", "Two");
			cleanupOrphanedGroupTitles([]);
			expect(getAllGroupTitles()).toEqual({});
		});

		it("handles mixed active and orphaned keys", () => {
			setGroupTitle("active-hash", "Active Hash");
			setGroupTitle("orphan-hash", "Orphan Hash");
			setGroupTitle(null, "Active Solo", "active-solo");
			setGroupTitle(null, "Orphan Solo", "orphan-solo");
			const sessions: HistorySession[] = [
				mockSession({ imageHash: "active-hash" }),
				mockSession({ id: "active-solo" }),
			];
			cleanupOrphanedGroupTitles(sessions);
			expect(getGroupTitle("active-hash")).toBe("Active Hash");
			expect(getGroupTitle("orphan-hash")).toBe("Artwork");
			expect(getGroupTitle(null, "active-solo")).toBe("Active Solo");
			expect(getGroupTitle(null, "orphan-solo")).toBe("Artwork");
		});
	});
});
