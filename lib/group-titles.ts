import type { HistorySession } from "./history";

const STORAGE_KEY = "etsy-copywriter-group-titles";

function readTitles(): Record<string, string> {
	if (typeof window === "undefined") return {};
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		return JSON.parse(raw) as Record<string, string>;
	} catch {
		return {};
	}
}

function writeTitles(titles: Record<string, string>) {
	if (typeof window === "undefined") return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(titles));
}

function groupKey(imageHash: string | null, soloId?: string): string {
	return imageHash ?? `solo-${soloId ?? "unknown"}`;
}

export function getGroupTitle(
	imageHash: string | null,
	soloId?: string,
	fallback = "Artwork",
): string {
	const key = groupKey(imageHash, soloId);
	const titles = readTitles();
	return titles[key] ?? fallback;
}

export function setGroupTitle(imageHash: string | null, title: string, soloId?: string) {
	const key = groupKey(imageHash, soloId);
	const titles = readTitles();
	titles[key] = title;
	writeTitles(titles);
}

export function getAllGroupTitles(): Record<string, string> {
	return readTitles();
}

export function cleanupOrphanedGroupTitles(sessions: HistorySession[]) {
	const activeKeys = new Set<string>();
	for (const session of sessions) {
		const key = session.imageHash ?? `solo-${session.id}`;
		activeKeys.add(key);
	}
	const titles = readTitles();
	let changed = false;
	for (const key of Object.keys(titles)) {
		if (!activeKeys.has(key)) {
			delete titles[key];
			changed = true;
		}
	}
	if (changed) {
		writeTitles(titles);
	}
}
