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

function readSessions(): HistorySession[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as HistorySession[]) : [];
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
		id: String(Date.now()),
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

export function deleteSession(id: string) {
	const sessions = readSessions().filter((s) => s.id !== id);
	writeSessions(sessions);
}

export function clearHistory() {
	if (typeof window === "undefined") return;
	localStorage.removeItem(STORAGE_KEY);
}
