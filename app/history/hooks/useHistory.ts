"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	getSessions,
	deleteSession,
	clearHistory,
	groupSessionsByImage,
	type HistorySession,
	type ImageGroup,
} from "@/lib/history";

/**
 * useHistory — manages history page state: grouped sessions, expanded state, CRUD.
 */
export function useHistory() {
	const router = useRouter();

	const [groups, setGroups] = useState<ImageGroup[]>([]);
	const [expandedGroupHash, setExpandedGroupHash] = useState<string | null>(null);
	const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

	useEffect(() => {
		setGroups(groupSessionsByImage(getSessions()));
	}, []);

	const reloadGroups = useCallback(() => {
		setGroups(groupSessionsByImage(getSessions()));
	}, []);

	const toggleGroup = useCallback((hash: string) => {
		setExpandedGroupHash((prev) => (prev === hash ? null : hash));
		setExpandedSessionId(null); // collapse session rows when toggling group
	}, []);

	const toggleSession = useCallback((id: string) => {
		setExpandedSessionId((prev) => (prev === id ? null : id));
	}, []);

	const handleDeleteSession = useCallback(
		(id: string) => {
			deleteSession(id);
			reloadGroups();
			toast.success("Session deleted");
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

	return {
		groups,
		expandedGroupHash,
		expandedSessionId,
		toggleGroup,
		toggleSession,
		handleDeleteSession,
		handleClearHistory,
		openInWorkspace,
		copyText,
		copyAllForSession,
		hasHistory: groups.length > 0,
	};
}
