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
	userText: string;
}

/**
 * usePipeline — owns streaming analysis/copy, runAll, loading states, saveSession.
 *
 * runAll orchestrates the two existing working endpoints sequentially:
 *   POST /api/analyze-image  →  await stream  →  POST /api/generate-copy  →  await stream
 * This avoids the broken server-side /api/run-all endpoint which used
 * streamObject().object — that never resolves with Qwen/OpenRouter because
 * the provider doesn't support response_format: json_schema.
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
		userText,
	} = deps;

	const [analysis, setAnalysis] = useState<Partial<ImageAnalysisType> | null>(null);
	const [copy, setCopy] = useState<Partial<CopyWritingType> | null>(null);
	const formDataRef = useRef<FormData | null>(null);

	// Promise resolvers for runAll orchestration
	const analysisResolveRef = useRef<((value: ImageAnalysisType) => void) | null>(null);
	const analysisRejectRef = useRef<((error: Error) => void) | null>(null);
	const copyResolveRef = useRef<((value: CopyWritingType) => void) | null>(null);
	const copyRejectRef = useRef<((error: Error) => void) | null>(null);

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
				analysisRejectRef.current?.(error);
				analysisResolveRef.current = null;
				analysisRejectRef.current = null;
				return;
			}
			if (object) {
				setAnalysis(object);
				onAnalysisFinish(object);
				analysisResolveRef.current?.(object);
				analysisResolveRef.current = null;
				analysisRejectRef.current = null;
			}
		},
		onError: (err) => {
			const msg = err?.message ?? String(err);
			onError(msg);
			analysisRejectRef.current?.(err instanceof Error ? err : new Error(msg));
			analysisResolveRef.current = null;
			analysisRejectRef.current = null;
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
				copyRejectRef.current?.(error);
				copyResolveRef.current = null;
				copyRejectRef.current = null;
				return;
			}
			if (object) {
				setCopy(object);
				onCopyFinish(object);
				if (analysis) {
					handleSaveSession(analysis as ImageAnalysisType, object);
				}
				copyResolveRef.current?.(object);
				copyResolveRef.current = null;
				copyRejectRef.current = null;
			}
		},
		onError: (err) => {
			const msg = err?.message ?? String(err);
			onError(msg);
			copyRejectRef.current?.(err instanceof Error ? err : new Error(msg));
			copyResolveRef.current = null;
			copyRejectRef.current = null;
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
			if (userText) fd.append("userText", userText);
			formDataRef.current = fd;
			onStateChange("analyzing");
			setAnalysis(null);
			setCopy(null);
			submitAnalysis({});
		},
		[onStateChange, submitAnalysis, userText],
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
			submitCopy({ analysis: payload, userText });
		},
		[analysis, onStateChange, submitCopy, userText],
	);

	/**
	 * runAll — sequential client-side orchestration of analysis → copy.
	 * Uses the existing working useObject hooks instead of the broken
	 * server-side /api/run-all endpoint.
	 */
	const runAll = useCallback(
		async (file: File | null) => {
			if (!file) return;

			// Step 1: Analyze image
			onStateChange("analyzing");
			setAnalysis(null);
			setCopy(null);

			const analysisPromise = new Promise<ImageAnalysisType>((resolve, reject) => {
				analysisResolveRef.current = resolve;
				analysisRejectRef.current = reject;
			});

			const fd = new FormData();
			fd.append("image", file);
			if (userText) fd.append("userText", userText);
			formDataRef.current = fd;
			submitAnalysis({});

			let analysisResult: ImageAnalysisType;
			try {
				analysisResult = await analysisPromise;
			} catch {
				// Error already surfaced via onError callback
				return;
			}

			// Step 2: Generate copy
			onStateChange("generating");
			setCopy(null);

			const copyPromise = new Promise<CopyWritingType>((resolve, reject) => {
				copyResolveRef.current = resolve;
				copyRejectRef.current = reject;
			});

			submitCopy({ analysis: analysisResult, userText });

			let copyResult: CopyWritingType;
			try {
				copyResult = await copyPromise;
			} catch {
				// Error already surfaced via onError callback
				return;
			}

			// Guarantee session save (copy onFinish may also save, which is idempotent)
			handleSaveSession(analysisResult, copyResult);
		},
		[onStateChange, submitAnalysis, submitCopy, handleSaveSession, userText],
	);

	const stop = useCallback(() => {
		stopAnalysis();
		stopCopy();
		// Reject any pending runAll promises so the async function returns
		analysisRejectRef.current?.(new Error("Stopped by user"));
		copyRejectRef.current?.(new Error("Stopped by user"));
	}, [stopAnalysis, stopCopy]);

	const stopZoneAnalysis = useCallback(() => {
		stopAnalysis();
		analysisRejectRef.current?.(new Error("Stopped by user"));
	}, [stopAnalysis]);

	const stopZoneCopy = useCallback(() => {
		stopCopy();
		copyRejectRef.current?.(new Error("Stopped by user"));
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
