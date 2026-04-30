import { useCallback, useEffect, useRef, useState } from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { toast } from "sonner";
import { imageAnalysisSchema, copyWritingSchema } from "@/lib/schemas";
import type { ImageAnalysisType, CopyWritingType } from "@/lib/definitions";
import {
	getSessions,
	saveSession,
	deleteSession,
	clearHistory,
	type HistorySession,
} from "@/lib/history";
import {
	newSessionView,
	viewHistory,
	isHistoryMode,
	type SessionView,
} from "@/lib/session";
import { createThumbnail } from "@/lib/file-utils";

export interface UploadGroup {
	file: File | null;
	previewUrl: string | null;
	thumbnailUrl: string | null;
	handleFile: (f: File | null) => void;
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
}

export interface HistoryGroup {
	history: HistorySession[];
	historyOpen: boolean;
	setHistoryOpen: (v: boolean) => void;
	restoreSession: (session: HistorySession) => void;
	startNewSession: () => void;
	handleDeleteSession: (id: string) => void;
	handleClearHistory: () => void;
	activeHistoryId: string | null;
}

export interface GlobalGroup {
	stage: "idle" | "analyzing" | "generating" | "done" | "error";
	error: string | null;
	isLoading: boolean;
	isHistory: boolean;
	stop: () => void;
}

export function useWorkspace(): {
	upload: UploadGroup;
	analysis: AnalysisGroup;
	copy: CopyGroup;
	history: HistoryGroup;
	global: GlobalGroup;
} {
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
	const [analysis, setAnalysis] = useState<Partial<ImageAnalysisType> | null>(
		null,
	);
	const [copy, setCopy] = useState<Partial<CopyWritingType> | null>(null);
	const [stage, setStage] = useState<
		"idle" | "analyzing" | "generating" | "done" | "error"
	>("idle");
	const [error, setError] = useState<string | null>(null);
	const [history, setHistory] = useState<HistorySession[]>([]);
	const [historyOpen, setHistoryOpen] = useState(false);
	const [sessionView, setSessionView] = useState<SessionView>(newSessionView());

	const fileInputRef = useRef<HTMLInputElement>(null);
	const formDataRef = useRef<FormData | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	const isHistory = isHistoryMode(sessionView);

	const loadHistory = useCallback(() => {
		setHistory(getSessions());
	}, []);

	useEffect(() => {
		loadHistory();
	}, [loadHistory]);

	useEffect(() => {
		if (!file) {
			setPreviewUrl(null);
			setThumbnailUrl(null);
			return;
		}
		const url = URL.createObjectURL(file);
		setPreviewUrl(url);
		createThumbnail(file).then(setThumbnailUrl);
		return () => URL.revokeObjectURL(url);
	}, [file]);

	const {
		object: streamedAnalysis,
		submit: submitAnalysis,
		isLoading: analysisLoading,
		stop: stopAnalysis,
	} = useObject({
		api: "/api/analyze-image",
		schema: imageAnalysisSchema,
		fetch: async (url) => {
			if (!formDataRef.current) throw new Error("No image file selected");
			return fetch(url, { method: "POST", body: formDataRef.current });
		},
		onFinish: ({ object }) => {
			if (object) {
				setAnalysis(object);
				setStage("done");
			}
		},
		onError: (err) => {
			setError(err.message);
			setStage("error");
		},
	});

	const {
		object: streamedCopy,
		submit: submitCopy,
		isLoading: copyLoading,
		stop: stopCopy,
	} = useObject({
		api: "/api/generate-copy",
		schema: copyWritingSchema,
		onFinish: ({ object }) => {
			if (object) {
				setCopy(object);
				setStage("done");
				if (analysis && thumbnailUrl) {
					saveSession({
						thumbnail: thumbnailUrl,
						analysis: analysis as ImageAnalysisType,
						copy: object,
					});
					loadHistory();
				}
			}
		},
		onError: (err) => {
			setError(err.message);
			setStage("error");
		},
	});

	const isLoading =
		analysisLoading ||
		copyLoading ||
		stage === "analyzing" ||
		stage === "generating";

	const handleFile = useCallback(
		(f: File | null) => {
			setFile(f);
			setError(null);
			if (f && isHistory) {
				setSessionView(newSessionView());
			}
		},
		[isHistory],
	);

	const onDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			const dropped = e.dataTransfer.files[0];
			if (dropped) handleFile(dropped);
		},
		[handleFile],
	);

	const onFileInput = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			handleFile(e.target.files?.[0] ?? null);
		},
		[handleFile],
	);

	const startAnalysis = useCallback(() => {
		if (!file) return;
		const fd = new FormData();
		fd.append("image", file);
		formDataRef.current = fd;
		setStage("analyzing");
		setError(null);
		setAnalysis(null);
		setCopy(null);
		submitAnalysis({});
	}, [file, submitAnalysis]);

	const startCopy = useCallback(
		(data?: ImageAnalysisType) => {
			const payload = data ?? (analysis as ImageAnalysisType | undefined);
			if (!payload) return;
			setStage("generating");
			setError(null);
			setCopy(null);
			submitCopy(payload);
		},
		[analysis, submitCopy],
	);

	const runAll = useCallback(async () => {
		if (!file) return;
		setStage("analyzing");
		setError(null);
		setAnalysis(null);
		setCopy(null);

		const fd = new FormData();
		fd.append("image", file);
		abortRef.current = new AbortController();

		try {
			const res = await fetch("/api/run-all", {
				method: "POST",
				body: fd,
				signal: abortRef.current.signal,
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || "Run-all failed");
			}

			const reader = res.body?.getReader();
			if (!reader) throw new Error("No response body");

			const decoder = new TextDecoder();
			let buffer = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";
				for (const line of lines) {
					if (!line.trim()) continue;
					const event = JSON.parse(line);
					setStage(event.stage);
					if (event.stage === "done") {
						setAnalysis(event.analysis);
						setCopy(event.copy);
						if (thumbnailUrl) {
							saveSession({
								thumbnail: thumbnailUrl,
								analysis: event.analysis,
								copy: event.copy,
							});
							loadHistory();
						}
					}
					if (event.stage === "error") {
						throw new Error(event.error);
					}
				}
			}
		} catch (err: unknown) {
			if (err instanceof Error && err.name !== "AbortError") {
				setError(err.message);
				setStage("error");
			}
		}
	}, [file, thumbnailUrl, loadHistory]);

	const stop = useCallback(() => {
		stopAnalysis();
		stopCopy();
		if (abortRef.current) {
			abortRef.current.abort();
			abortRef.current = null;
		}
		setStage("idle");
	}, [stopAnalysis, stopCopy]);

	const stopZoneAnalysis = useCallback(() => {
		stopAnalysis();
		setStage((prev) => (prev === "analyzing" ? "idle" : prev));
	}, [stopAnalysis]);

	const stopZoneCopy = useCallback(() => {
		stopCopy();
		setStage((prev) => (prev === "generating" ? "done" : prev));
	}, [stopCopy]);

	const copyText = useCallback(async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success("Copied to clipboard");
		} catch {
			toast.error("Failed to copy");
		}
	}, []);

	const copyAll = useCallback(() => {
		if (!copy) return;
		const text = `Title 1: ${copy.titles?.option1 ?? ""}\nTitle 2: ${copy.titles?.option2 ?? ""}\nTitle 3: ${copy.titles?.option3 ?? ""}\n\nTags: ${(copy.tags ?? []).join(", ")}\n\nDescription:\n${copy.description ?? ""}`;
		copyText(text);
	}, [copy, copyText]);

	const restoreSession = useCallback((session: HistorySession) => {
		setAnalysis(session.analysis);
		setCopy(session.copy);
		setPreviewUrl(session.thumbnail);
		setThumbnailUrl(null);
		setFile(null);
		setStage("done");
		setError(null);
		setSessionView(viewHistory(session.id));
	}, []);

	const startNewSession = useCallback(() => {
		setFile(null);
		setPreviewUrl(null);
		setThumbnailUrl(null);
		setAnalysis(null);
		setCopy(null);
		setStage("idle");
		setError(null);
		setSessionView(newSessionView());
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}, []);

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
		if (isHistory) {
			startNewSession();
		}
	}, [loadHistory, isHistory, startNewSession]);

	const updateAnalysisField = useCallback(
		<K extends keyof ImageAnalysisType>(
			section: K,
			field: keyof ImageAnalysisType[K],
			value: unknown,
		) => {
			setAnalysis((prev) => {
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
			setCopy((prev) => (prev ? { ...prev, [field]: value } : prev));
		},
		[],
	);

	const displayAnalysis =
		(streamedAnalysis as Partial<ImageAnalysisType> | undefined) ?? analysis;
	const displayCopy =
		(streamedCopy as Partial<CopyWritingType> | undefined) ?? copy;

	return {
		upload: {
			file,
			previewUrl,
			thumbnailUrl,
			handleFile,
			onDrop,
			onFileInput,
			startAnalysis,
			runAll,
			stop,
			fileInputRef,
		},
		analysis: {
			displayAnalysis,
			updateAnalysisField,
			startCopy,
			startAnalysis,
			stopZoneAnalysis,
			analysisLoading,
			copyLoading,
		},
		copy: {
			displayCopy,
			updateCopyField,
			startCopy,
			copyAll,
			copyText,
			stopZoneCopy,
			copyLoading,
		},
		history: {
			history,
			historyOpen,
			setHistoryOpen,
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
			stop,
		},
	};
}
