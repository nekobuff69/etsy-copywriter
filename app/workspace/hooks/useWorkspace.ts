"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	getSessions,
	deleteSession,
	clearHistory,
	groupSessionsByImageHash,
	type HistorySession,
} from "@/lib/history";
import {
	newSessionView,
	viewHistory,
	isHistoryMode,
	type SessionView,
} from "@/lib/session";
import type { ImageAnalysisType, CopyWritingType } from "@/lib/definitions";
import { useUpload } from "./useUpload";
import { usePipeline } from "./usePipeline";

export interface UploadGroup {
	file: File | null;
	previewUrl: string | null;
	thumbnailUrl: string | null;
	handleFile: (f: File | null) => void;
	setThumbnailUrl: (url: string | null) => void;
	onDrop: (e: React.DragEvent) => void;
	onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
	startAnalysis: () => void;
	runAll: () => void;
	stop: () => void;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export interface AnalysisGroup {
	displayAnalysis: Partial<ImageAnalysisType> | null;
	updateAnalysisField: <K extends keyof ImageAnalysisType>(
		section: K,
		field: keyof ImageAnalysisType[K],
		value: unknown,
	) => void;
	startCopy: (data?: ImageAnalysisType) => void;
	startAnalysis: () => void;
	stopZoneAnalysis: () => void;
	analysisLoading: boolean;
	copyLoading: boolean;
	visionModel: string | null;
}

export interface CopyGroup {
	displayCopy: Partial<CopyWritingType> | null;
	updateCopyField: <K extends keyof CopyWritingType>(
		field: K,
		value: CopyWritingType[K],
	) => void;
	startCopy: (data?: ImageAnalysisType) => void;
	copyAll: () => void;
	copyText: (text: string) => void;
	stopZoneCopy: () => void;
	copyLoading: boolean;
	copyModel: string | null;
}

export interface HistoryGroup {
	history: HistorySession[];
	restoreSession: (session: HistorySession) => void;
	startNewSession: () => void;
	handleDeleteSession: (id: string) => void;
	handleClearHistory: () => void;
	activeHistoryId: string | null;
}

export interface SessionNavInfo {
	currentIndex: number;
	totalCount: number;
	onPrev: () => void;
	onNext: () => void;
	onBackToGroup: () => void;
}

export interface GlobalGroup {
	stage: "idle" | "analyzing" | "generating" | "done" | "error";
	error: string | null;
	isLoading: boolean;
	isHistory: boolean;
	stop: () => void;
}

/**
 * Build session navigation state from the current restored session.
 * Returns the ordered list of sibling sessions and the current index.
 */
function buildSessionNav(sessionId: string) {
	const allSessions = getSessions();
	const current = allSessions.find((s) => s.id === sessionId);
	if (!current) return { siblings: [], currentIndex: -1 };

	const groups = groupSessionsByImageHash(allSessions);
	const groupKey = current.imageHash ?? `solo-${current.id}`;
	const group = groups.get(groupKey);
	if (!group || group.length <= 1) return { siblings: [], currentIndex: -1 };

	// Sort by createdAt ascending so "Session 1 of N" is earliest first
	const sorted = [...group].sort((a, b) => a.createdAt - b.createdAt);
	const idx = sorted.findIndex((s) => s.id === sessionId);
	return { siblings: sorted, currentIndex: idx };
}

/**
 * Reads `?session=<id>` from the URL, loads the session from localStorage,
 * and returns it. After reading, the query param is replaced away so refresh
 * doesn't re-trigger restoration.
 */
function useSessionRestoration(
	onRestore: (session: HistorySession) => void,
) {
	useEffect(() => {
		if (typeof window === "undefined") return;
		const params = new URLSearchParams(window.location.search);
		const sessionId = params.get("session");
		if (!sessionId) return;

		const sessions = getSessions();
		const session = sessions.find((s) => s.id === sessionId);
		if (session) {
			onRestore(session);
		}

	}, [onRestore]);
}

export function useWorkspace(): {
	upload: UploadGroup;
	analysis: AnalysisGroup;
	copy: CopyGroup;
	history: HistoryGroup;
	global: GlobalGroup;
	sessionNav: SessionNavInfo | null;
} {
	const router = useRouter();
	const [stage, setStage] = useState<
		"idle" | "analyzing" | "generating" | "done" | "error"
	>("idle");
	const [error, setError] = useState<string | null>(null);
	const [sessionView, setSessionView] = useState<SessionView>(newSessionView());
	const [sessionNav, setSessionNav] = useState<{
		siblings: HistorySession[];
		currentIndex: number;
	}>({ siblings: [], currentIndex: -1 });

	const isHistory = isHistoryMode(sessionView);

	const [activeModels, setActiveModels] = useState<{
		vision: string | null;
		copy: string | null;
	}>({ vision: null, copy: null });

	const [history, setHistory] = useState<HistorySession[]>(() => getSessions());

	const loadHistory = useCallback(() => setHistory(getSessions()), []);

	// Upload state
	const uploadState = useUpload();

	// When file changes in history mode, switch back to current session
	const rawHandleFile = uploadState.handleFile;
	const handleFile = useCallback(
		(f: File | null) => {
			rawHandleFile(f);
			if (f && isHistoryMode(sessionView)) {
				setSessionView(newSessionView());
				setSessionNav({ siblings: [], currentIndex: -1 });
				setActiveModels({ vision: null, copy: null });
				window.history.replaceState({}, "", "/workspace");
			}
		},
		[rawHandleFile, sessionView],
	);

	// Analysis/copy editing state (client-side edits)
	const [editedAnalysis, setEditedAnalysis] =
		useState<Partial<ImageAnalysisType> | null>(null);
	const [editedCopy, setEditedCopy] = useState<Partial<CopyWritingType> | null>(
		null,
	);

	const onAnalysisFinish = useCallback((analysis: ImageAnalysisType) => {
		setEditedAnalysis(analysis);
		setStage("done");
		setError(null);
	}, []);

	const onCopyFinish = useCallback((copyData: CopyWritingType) => {
		setEditedCopy(copyData);
		setStage("done");
		setError(null);
	}, []);

	const onError = useCallback((message: string) => {
		setError(message);
		setStage("error");
	}, []);

	const onStateChange = useCallback(
		(s: "idle" | "analyzing" | "generating" | "done" | "error") => {
			console.log(`[PIPELINE] stage → ${s}`);
			setStage(s);
			if (s !== "error") setError(null);
		},
		[],
	);

	// Pipeline state
	const pipeline = usePipeline({
		thumbnailUrl: uploadState.thumbnailUrl,
		imageHash: uploadState.imageHash,
		onAnalysisFinish,
		onCopyFinish,
		onError,
		onStateChange,
		onReloadHistory: loadHistory,
	});

	// Switch to a specific session (used by nav)
	const switchToSession = useCallback(
		(session: HistorySession) => {
			setEditedAnalysis(session.analysis);
			setEditedCopy(session.copy);
			uploadState.handleFile(null);
			uploadState.setThumbnailUrl(session.thumbnail ?? null);
			setStage("done");
			setError(null);
			setSessionView(viewHistory(session.id));
			setActiveModels({
				vision: session.visionModel ?? null,
				copy: session.copyModel ?? null,
			});
			// Recompute nav for the new session
			setSessionNav(buildSessionNav(session.id));
			router.replace(`/workspace?session=${session.id}`, { scroll: false });
		},
		[uploadState, router],
	);

	// Session restoration from ?session= query param
	const restoreSession = useCallback(
		(session: HistorySession) => {
			setEditedAnalysis(session.analysis);
			setEditedCopy(session.copy);
			uploadState.handleFile(null);
			uploadState.setThumbnailUrl(session.thumbnail ?? null);
			setStage("done");
			setError(null);
			setSessionView(viewHistory(session.id));
			setActiveModels({
				vision: session.visionModel ?? null,
				copy: session.copyModel ?? null,
			});
			setSessionNav(buildSessionNav(session.id));
		},
		[uploadState],
	);

	useSessionRestoration(restoreSession);

	// Navigation methods
	const navigatePrev = useCallback(() => {
		const { siblings, currentIndex } = sessionNav;
		if (currentIndex <= 0) return;
		const prev = siblings[currentIndex - 1];
		if (prev) switchToSession(prev);
	}, [sessionNav, switchToSession]);

	const navigateNext = useCallback(() => {
		const { siblings, currentIndex } = sessionNav;
		if (currentIndex < 0 || currentIndex >= siblings.length - 1) return;
		const next = siblings[currentIndex + 1];
		if (next) switchToSession(next);
	}, [sessionNav, switchToSession]);

	const navigateBackToGroup = useCallback(() => {
		const activeId = sessionView.activeHistoryId;
		if (!activeId) {
			router.push("/history");
			return;
		}
		const session = getSessions().find((s) => s.id === activeId);
		if (!session) {
			router.push("/history");
			return;
		}
		const groupKey = session.imageHash ?? `solo-${session.id}`;
		router.push(`/history#group-${encodeURIComponent(groupKey)}/session-${encodeURIComponent(session.id)}`);
	}, [sessionView.activeHistoryId, router]);

	const isLoading =
		pipeline.analysisLoading ||
		pipeline.copyLoading ||
		stage === "analyzing" ||
		stage === "generating";

	// Clipboard helpers
	const copyText = useCallback(async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success("Copied to clipboard");
		} catch {
			toast.error("Failed to copy");
		}
	}, []);

	const copyAll = useCallback(() => {
		const c = pipeline.displayCopy ?? editedCopy;
		if (!c) return;
		const text = `Title 1: ${c.titles?.option1 ?? ""}\nTitle 2: ${c.titles?.option2 ?? ""}\nTitle 3: ${c.titles?.option3 ?? ""}\n\nTags: ${(c.tags ?? []).join(", ")}\n\nDescription:\n${c.description ?? ""}`;
		copyText(text);
	}, [pipeline.displayCopy, editedCopy, copyText]);

	// History actions
	const startNewSession = useCallback(() => {
		uploadState.handleFile(null);
		setEditedAnalysis(null);
		setEditedCopy(null);
		setStage("idle");
		setError(null);
		setSessionView(newSessionView());
		setSessionNav({ siblings: [], currentIndex: -1 });
		setActiveModels({ vision: null, copy: null });
		window.history.replaceState({}, "", "/workspace");
	}, [uploadState]);

	const handleDeleteSession = useCallback(
		(id: string) => {
			deleteSession(id);
			loadHistory();
			if (sessionView.activeHistoryId === id) {
				startNewSession();
			}
		},
		[loadHistory, sessionView.activeHistoryId, startNewSession],
	);

	const handleClearHistory = useCallback(() => {
		clearHistory();
		loadHistory();
		if (isHistoryMode(sessionView)) {
			startNewSession();
		}
	}, [loadHistory, sessionView, startNewSession]);

	// Field editors
	const updateAnalysisField = useCallback(
		<K extends keyof ImageAnalysisType>(
			section: K,
			field: keyof ImageAnalysisType[K],
			value: unknown,
		) => {
			setEditedAnalysis((prev) => {
				if (!prev) return prev;
				return {
					...prev,
					[section]: {
						...(prev[section] as object),
						[field]: value,
					},
				};
			});
		},
		[],
	);

	const updateCopyField = useCallback(
		<K extends keyof CopyWritingType>(field: K, value: CopyWritingType[K]) => {
			setEditedCopy((prev) => (prev ? { ...prev, [field]: value } : prev));
		},
		[],
	);

	// Merge pipeline display with manual edits
	const displayAnalysis = pipeline.displayAnalysis ?? editedAnalysis;
	const displayCopy = pipeline.displayCopy ?? editedCopy;

	const hasSessionNav =
		isHistory && sessionNav.siblings.length > 1 && sessionNav.currentIndex >= 0;

	return {
		upload: {
			file: uploadState.file,
			previewUrl: uploadState.previewUrl,
			thumbnailUrl: uploadState.thumbnailUrl,
			handleFile,
			setThumbnailUrl: uploadState.setThumbnailUrl,
			onDrop: uploadState.onDrop,
			onFileInput: uploadState.onFileInput,
			startAnalysis: () => pipeline.startAnalysis(uploadState.file),
			runAll: () => pipeline.runAll(uploadState.file),
			stop: pipeline.stop,
			fileInputRef: uploadState.fileInputRef,
		},
		analysis: {
			displayAnalysis,
			updateAnalysisField,
			startCopy: pipeline.startCopy,
			startAnalysis: () => pipeline.startAnalysis(uploadState.file),
			stopZoneAnalysis: pipeline.stopZoneAnalysis,
			analysisLoading: pipeline.analysisLoading,
			copyLoading: pipeline.copyLoading,
			visionModel: activeModels.vision,
		},
		copy: {
			displayCopy,
			updateCopyField,
			startCopy: pipeline.startCopy,
			copyAll,
			copyText,
			stopZoneCopy: pipeline.stopZoneCopy,
			copyLoading: pipeline.copyLoading,
			copyModel: activeModels.copy,
		},
		history: {
			history,
			restoreSession,
			startNewSession,
			handleDeleteSession,
			handleClearHistory,
			activeHistoryId: sessionView.activeHistoryId,
		},
		global: {
			stage,
			error,
			isLoading,
			isHistory,
			stop: pipeline.stop,
		},
		// Extra exports for session navigation
		sessionNav: hasSessionNav
			? {
					currentIndex: sessionNav.currentIndex,
					totalCount: sessionNav.siblings.length,
					onPrev: navigatePrev,
					onNext: navigateNext,
					onBackToGroup: navigateBackToGroup,
				}
			: null,
	};
}
