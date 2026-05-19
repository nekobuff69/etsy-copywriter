"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	getSessions,
	deleteSession,
	deleteSessions,
	clearHistory,
	groupSessionsByImage,
	type HistorySession,
	type ImageGroup,
} from "@/lib/history";
import { setGroupTitle } from "@/lib/group-titles";

/**
 * Parse hash from URL, e.g. `#group-<key>/session-<id>` or `#group-<key>`.
 */
function parseHash(): { groupKey: string | null; sessionId: string | null } {
	if (typeof window === "undefined") return { groupKey: null, sessionId: null };
	const hash = window.location.hash.replace(/^#/, "");
	if (!hash) return { groupKey: null, sessionId: null };

	const match = hash.match(/^group-(.+?)(?:\/session-(.+))?$/);
	if (match) {
		return { groupKey: decodeURIComponent(match[1]!), sessionId: match[2] ? decodeURIComponent(match[2]) : null };
	}
	return { groupKey: null, sessionId: null };
}

/**
 * useHistory — manages history page state: grouped sessions, expanded state, CRUD.
 */
export function useHistory() {
	const router = useRouter();

	const [groups, setGroups] = useState<ImageGroup[]>([]);
	const [expandedGroupHash, setExpandedGroupHash] = useState<string | null>(null);
	const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
	const [groupTitles, setGroupTitlesState] = useState<Record<string, string>>({});

	// Hydrate from localStorage on mount, then process hash
	const hydrated = useRef(false);

	useEffect(() => {
		if (hydrated.current) return;
		hydrated.current = true;

		// Load sessions and group titles from localStorage
		setGroups(groupSessionsByImage(getSessions()));
		const raw = localStorage.getItem("etsy-copywriter-group-titles");
		if (raw) {
			try {
				setGroupTitlesState(JSON.parse(raw));
			} catch { /* ignore parse errors */ }
		}

		// Process hash — auto-expand the group/session referenced
		const { groupKey, sessionId } = parseHash();
		if (!groupKey) return;

		const timer = setTimeout(() => {
			setExpandedGroupHash(groupKey);
			if (sessionId) {
				setExpandedSessionId(sessionId);
			}

			// Scroll to the session row (or group card if session not found)
			setTimeout(() => {
				if (sessionId) {
					const sessionEl = document.getElementById(`session-${sessionId}`);
					if (sessionEl) {
						sessionEl.scrollIntoView({ behavior: "smooth", block: "start" });
						return;
					}
				}
				const groupEl = document.getElementById(`group-${CSS.escape(groupKey)}`);
				if (groupEl) groupEl.scrollIntoView({ behavior: "smooth", block: "start" });
			}, 150);
		}, 0);

		return () => clearTimeout(timer);
	}, []);

	const reloadGroups = useCallback(() => {
		if (hydrated.current) {
			setGroups(groupSessionsByImage(getSessions()));
		}
	}, []);

	const toggleGroup = useCallback((hash: string) => {
		setExpandedGroupHash((prev) => (prev === hash ? null : hash));
		setExpandedSessionId(null);
	}, []);

	const toggleSession = useCallback((id: string) => {
		setExpandedSessionId((prev) => (prev === id ? null : id));
	}, []);

	const handleDeleteSession = useCallback(
		(id: string) => {
			deleteSession(id);
			reloadGroups();
			toast.success("1 session deleted");
		},
		[reloadGroups],
	);

	const handleDeleteSessions = useCallback(
		(ids: string[]) => {
			const count = deleteSessions(ids);
			reloadGroups();
			toast.success(`${count} session${count !== 1 ? "s" : ""} deleted`);
		},
		[reloadGroups],
	);

	const handleClearHistory = useCallback(() => {
		clearHistory();
		setGroups([]);
		setExpandedGroupHash(null);
		setExpandedSessionId(null);
		toast.success("History cleared");
	}, []);

	const openInWorkspace = useCallback(
		(session: HistorySession) => {
			router.push(`/workspace?session=${session.id}`);
		},
		[router],
	);

	const copyText = useCallback(async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success("Copied to clipboard");
		} catch {
			toast.error("Failed to copy");
		}
	}, []);

	const copyAllForSession = useCallback(
		(session: HistorySession) => {
			const c = session.copy;
			const text = `Title 1: ${c.titles?.option1 ?? ""}\nTitle 2: ${c.titles?.option2 ?? ""}\nTitle 3: ${c.titles?.option3 ?? ""}\n\nTags: ${(c.tags ?? []).join(", ")}\n\nDescription:\n${c.description ?? ""}`;
			copyText(text);
		},
		[copyText],
	);

	const updateGroupTitle = useCallback((key: string, title: string) => {
		setGroupTitle(key || "", title);
		setGroupTitlesState((prev) => ({ ...prev, [key || ""]: title }));
	}, []);

	return {
		groups,
		expandedGroupHash,
		expandedSessionId,
		toggleGroup,
		toggleSession,
		handleDeleteSession,
		handleDeleteSessions,
		handleClearHistory,
		openInWorkspace,
		copyText,
		copyAllForSession,
		groupTitles,
		updateGroupTitle,
		hasHistory: groups.length > 0,
	};
}
