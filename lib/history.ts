import type {ImageAnalysisType, CopyWritingType} from "./definitions";

export interface HistorySession {
	id: string;
	thumbnail: string;
	analysis: ImageAnalysisType;
	copy: CopyWritingType;
	createdAt: number;
	imageHash?: string;
	visionModel?: string;
	copyModel?: string;
	baseURL?: string;
	providerLabel?: string;
}

const STORAGE_KEY = "etsy-copywriter-history";
const MAX_SESSIONS = 20;

function generateId(): string {
	return typeof crypto !== "undefined" && crypto.randomUUID
		? crypto.randomUUID()
		: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readSessions(): HistorySession[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const sessions = JSON.parse(raw) as HistorySession[];

		// Fix duplicate IDs from old Date.now() id scheme (pre-UUID migration).
		// Two sessions with the same id cause the expand/collapse toggle to affect
		// both because isExpanded uses expandedSessionId === session.id for comparison.
		let needsSave = false;
		const seenIds = new Set<string>();
		for (const session of sessions) {
			if (!session.id || seenIds.has(session.id)) {
				session.id = generateId();
				needsSave = true;
			}
			seenIds.add(session.id);
		}
		if (needsSave) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
		}

		return sessions;
	} catch {
		return [];
	}
}

function writeSessions(sessions: HistorySession[]) {
	if (typeof window === "undefined") return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function getSessions(): HistorySession[] {
	return readSessions();
}

export function getSession(id: string): HistorySession | null {
	return readSessions().find((s) => s.id === id) ?? null;
}

export function saveSession(params: {
	thumbnail: string;
	analysis: ImageAnalysisType;
	copy: CopyWritingType;
	imageHash?: string;
	visionModel?: string;
	copyModel?: string;
	baseURL?: string;
	providerLabel?: string;
}): HistorySession {
	const sessions = readSessions();
	const session: HistorySession = {
		id: generateId(),
		thumbnail: params.thumbnail,
		analysis: params.analysis,
		copy: params.copy,
		createdAt: Date.now(),
		imageHash: params.imageHash,
		visionModel: params.visionModel,
		copyModel: params.copyModel,
		baseURL: params.baseURL,
		providerLabel: params.providerLabel,
	};

	sessions.unshift(session);
	if (sessions.length > MAX_SESSIONS) {
		sessions.length = MAX_SESSIONS;
	}

	writeSessions(sessions);
	return session;
}

/**
 * Enriched image group for display in the History page.
 */
export interface ImageGroup {
	imageHash: string | null;
	thumbnail: string;
	sessions: HistorySession[];
	latestDate: number;
}

/**
 * Group sessions by imageHash. Sessions without a hash get their own solo group.
 */
export function groupSessionsByImageHash(
	sessions: HistorySession[],
): Map<string, HistorySession[]> {
	const groups = new Map<string, HistorySession[]>();
	for (const session of sessions) {
		const key = session.imageHash ?? `solo-${session.id}`;
		const existing = groups.get(key) ?? [];
		existing.push(session);
		groups.set(key, existing);
	}
	return groups;
}

/**
 * Group sessions by imageHash and return enriched ImageGroup[] sorted by latestDate desc.
 * Used by the History page to render expandable group cards.
 */
export function groupSessionsByImage(
	sessions: HistorySession[],
): ImageGroup[] {
	const rawGroups = groupSessionsByImageHash(sessions);
	const groups: ImageGroup[] = [];

	for (const [key, groupSessions] of rawGroups) {
		if (groupSessions.length === 0) continue;

		const imageHash = key.startsWith("solo-") ? null : key;
		const latestDate = Math.max(...groupSessions.map((s) => s.createdAt));
		const thumbnail = groupSessions.find((s) => s.thumbnail)?.thumbnail ?? "";

		groups.push({
			imageHash,
			thumbnail,
			sessions: groupSessions,
			latestDate,
		});
	}

	return groups.sort((a, b) => b.latestDate - a.latestDate);
}

export function deleteSession(id: string) {
	const sessions = readSessions().filter((s) => s.id !== id);
	writeSessions(sessions);
}

export function clearHistory() {
	if (typeof window === "undefined") return;
	localStorage.removeItem(STORAGE_KEY);
}
