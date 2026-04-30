import { describe, it, expect } from "vitest";
import { newSessionView, viewHistory, isHistoryMode } from "../lib/session";

describe("session view", () => {
	it("starts in current mode with no active history", () => {
		const view = newSessionView();
		expect(view.mode).toBe("current");
		expect(view.activeHistoryId).toBeNull();
		expect(isHistoryMode(view)).toBe(false);
	});

	it("switches to history mode with the given id", () => {
		const view = viewHistory("abc123");
		expect(view.mode).toBe("history");
		expect(view.activeHistoryId).toBe("abc123");
		expect(isHistoryMode(view)).toBe(true);
	});
});
