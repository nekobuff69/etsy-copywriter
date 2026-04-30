export type SessionMode = "current" | "history";

export interface SessionView {
	mode: SessionMode;
	activeHistoryId: string | null;
}

export function newSessionView(): SessionView {
	return { mode: "current", activeHistoryId: null };
}

export function viewHistory(id: string): SessionView {
	return { mode: "history", activeHistoryId: id };
}

export function isHistoryMode(view: SessionView): boolean {
	return view.mode === "history";
}
