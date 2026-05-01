import { useCallback, useRef, useState } from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { imageAnalysisSchema, copyWritingSchema } from "@/lib/schemas";
import type { ImageAnalysisType, CopyWritingType } from "@/lib/definitions";
import { saveSession } from "@/lib/history";
import { getStoredSettings, encodeConfigHeader, deriveProviderLabel } from "@/lib/settings";

function llmHeaders(): Record<string, string> {
	const settings = getStoredSettings();
	return { "X-LLM-Config": encodeConfigHeader(settings) };
}

interface UsePipelineDeps {
	thumbnailUrl: string | null;
	imageHash: string | null;
	onAnalysisFinish: (analysis: ImageAnalysisType) => void;
	onCopyFinish: (copy: CopyWritingType) => void;
	onError: (message: string) => void;
	onStateChange: (
		stage: "idle" | "analyzing" | "generating" | "done" | "error",
	) => void;
	onReloadHistory: () => void;
}

/**
 * usePipeline — owns streaming analysis/copy, runAll, loading states, saveSession.
 */
export function usePipeline(deps: UsePipelineDeps) {
	const {
		thumbnailUrl,
		imageHash,
		onAnalysisFinish,
		onCopyFinish,
		onError,
		onStateChange,
		onReloadHistory,
	} = deps;

	const [analysis, setAnalysis] = useState<Partial<ImageAnalysisType> | null>(null);
	const [copy, setCopy] = useState<Partial<CopyWritingType> | null>(null);
	const formDataRef = useRef<FormData | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	const handleSaveSession = useCallback(
		(analysisData: ImageAnalysisType, copyData: CopyWritingType) => {
			if (!thumbnailUrl) return;
			const settings = getStoredSettings();
			saveSession({
				thumbnail: thumbnailUrl,
				analysis: analysisData,
				copy: copyData,
				imageHash: imageHash ?? undefined,
				visionModel: settings.vision.model,
				copyModel: settings.copy.model,
				baseURL: settings.vision.baseURL,
				providerLabel: deriveProviderLabel(settings.vision.baseURL),
			});
			onReloadHistory();
		},
		[thumbnailUrl, imageHash, onReloadHistory],
	);

	// Analysis streaming
	const {
		object: streamedAnalysis,
		submit: submitAnalysis,
		isLoading: analysisLoading,
		stop: stopAnalysis,
	} = useObject({
		api: "/api/analyze-image",
		schema: imageAnalysisSchema,
		headers: llmHeaders,
		fetch: async (url) => {
			if (!formDataRef.current) throw new Error("No image file selected");
			return fetch(url, {
				method: "POST",
				body: formDataRef.current,
				headers: llmHeaders(),
			});
		},
		onFinish: ({ object, error }) => {
			if (error) {
				onError(`Analysis failed: ${error.message}`);
				return;
			}
			if (object) {
				setAnalysis(object);
				onAnalysisFinish(object);
			}
		},
		onError: (err) => {
			const msg = err?.message ?? String(err);
			onError(msg);
		},
	});

	// Copy streaming
	const {
		object: streamedCopy,
		submit: submitCopy,
		isLoading: copyLoading,
		stop: stopCopy,
	} = useObject({
		api: "/api/generate-copy",
		schema: copyWritingSchema,
		headers: llmHeaders,
		onFinish: ({ object, error }) => {
			if (error) {
				onError(`Copy generation failed: ${error.message}`);
				return;
			}
			if (object) {
				setCopy(object);
				onCopyFinish(object);
				if (analysis) {
					handleSaveSession(analysis as ImageAnalysisType, object);
				}
			}
		},
		onError: (err) => {
			const msg = err?.message ?? String(err);
			onError(msg);
		},
	});

	const startAnalysis = useCallback(
		(file: File | null) => {
			if (!file) {
				console.warn("[PIPELINE] startAnalysis: no file");
				return;
			}
			const fd = new FormData();
			fd.append("image", file);
			formDataRef.current = fd;
			onStateChange("analyzing");
			setAnalysis(null);
			setCopy(null);
			submitAnalysis({});
		},
		[onStateChange, submitAnalysis],
	);

	const startCopy = useCallback(
		(data?: ImageAnalysisType) => {
			const payload = data ?? (analysis as ImageAnalysisType | undefined);
			if (!payload) {
				console.warn("[PIPELINE] startCopy: no analysis payload");
				return;
			}
			onStateChange("generating");
			setCopy(null);
			submitCopy(payload);
		},
		[analysis, onStateChange, submitCopy],
	);

	const runAll = useCallback(
		async (file: File | null) => {
			if (!file) return;
			onStateChange("analyzing");
			setAnalysis(null);
			setCopy(null);

			const fd = new FormData();
			fd.append("image", file);
			abortRef.current = new AbortController();

			try {
				const res = await fetch("/api/run-all", {
					method: "POST",
					body: fd,
					headers: llmHeaders(),
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
						onStateChange(event.stage);
						if (event.stage === "done") {
							setAnalysis(event.analysis);
							setCopy(event.copy);
							handleSaveSession(event.analysis, event.copy);
						}
						if (event.stage === "error") {
							throw new Error(event.error);
						}
					}
				}
			} catch (err: unknown) {
				if (err instanceof Error && err.name !== "AbortError") {
					onError(err.message);
				}
			}
		},
		[onStateChange, handleSaveSession, onError],
	);

	const stop = useCallback(() => {
		stopAnalysis();
		stopCopy();
		if (abortRef.current) {
			abortRef.current.abort();
			abortRef.current = null;
		}
	}, [stopAnalysis, stopCopy]);

	const stopZoneAnalysis = useCallback(() => {
		stopAnalysis();
	}, [stopAnalysis]);

	const stopZoneCopy = useCallback(() => {
		stopCopy();
	}, [stopCopy]);

	const displayAnalysis =
		(streamedAnalysis as Partial<ImageAnalysisType> | undefined) ?? analysis;
	const displayCopy =
		(streamedCopy as Partial<CopyWritingType> | undefined) ?? copy;

	return {
		analysis,
		copy,
		displayAnalysis,
		displayCopy,
		analysisLoading,
		copyLoading,
		startAnalysis,
		startCopy,
		runAll,
		stop,
		stopZoneAnalysis,
		stopZoneCopy,
	};
}
