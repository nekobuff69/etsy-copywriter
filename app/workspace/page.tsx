"use client";

import {useCallback, useEffect, useRef, useState, useSyncExternalStore} from "react";
import {experimental_useObject as useObject} from "@ai-sdk/react";
import {useTheme} from "next-themes";
import {toast} from "sonner";
import {
	Copy,
	Moon,
	Sun,
	Upload,
	X,
	History,
	Trash2,
	RefreshCw,
	Play,
	Square,
	ChevronLeft,
	ClipboardList,
} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Textarea} from "@/components/ui/textarea";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Progress} from "@/components/ui/progress";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {imageAnalysisSchema, copyWritingSchema} from "@/lib/schemas";
import type {ImageAnalysisType, CopyWritingType} from "@/lib/definitions";
import {
	getSessions,
	saveSession,
	deleteSession,
	clearHistory,
	type HistorySession,
} from "@/lib/history";

function ThemeToggle() {
	const {theme, setTheme} = useTheme();
	const mounted = useSyncExternalStore(
		() => () => {},
		() => true,
		() => false,
	);

	if (!mounted) {
		return (
			<Button variant='ghost' size='icon' disabled>
				<span className='h-4 w-4' />
			</Button>
		);
	}

	return (
		<Button
			variant='ghost'
			size='icon'
			onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
			{theme === "dark" ? <Sun /> : <Moon />}
		</Button>
	);
}

export default function Workspace() {
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

	const fileInputRef = useRef<HTMLInputElement>(null);
	const formDataRef = useRef<FormData | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	const loadHistory = useCallback(() => {
		setHistory(getSessions());
	}, []);

	useEffect(() => {
		loadHistory();
	}, [loadHistory]);

	useEffect(() => {
		if (!file) {
			setPreviewUrl(null);
			return;
		}
		const url = URL.createObjectURL(file);
		setPreviewUrl(url);
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
			return fetch(url, {method: "POST", body: formDataRef.current});
		},
		onFinish: ({object}) => {
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
		onFinish: ({object}) => {
			if (object) {
				setCopy(object);
				setStage("done");
				if (analysis && previewUrl) {
					saveSession({
						thumbnail: previewUrl,
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

	const handleFile = (f: File | null) => {
		setFile(f);
		setError(null);
	};

	const onDrop = (e: React.DragEvent) => {
		e.preventDefault();
		const dropped = e.dataTransfer.files[0];
		if (dropped) handleFile(dropped);
	};

	const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		handleFile(e.target.files?.[0] ?? null);
	};

	const startAnalysis = () => {
		if (!file) return;
		const fd = new FormData();
		fd.append("image", file);
		formDataRef.current = fd;
		setStage("analyzing");
		setError(null);
		setAnalysis(null);
		setCopy(null);
		submitAnalysis({});
	};

	const startCopy = (data?: ImageAnalysisType) => {
		const payload = data ?? (analysis as ImageAnalysisType | undefined);
		if (!payload) return;
		setStage("generating");
		setError(null);
		setCopy(null);
		submitCopy(payload);
	};

	const runAll = async () => {
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
				const {done, value} = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, {stream: true});
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";
				for (const line of lines) {
					if (!line.trim()) continue;
					const event = JSON.parse(line);
					setStage(event.stage);
					if (event.stage === "done") {
						setAnalysis(event.analysis);
						setCopy(event.copy);
						if (previewUrl) {
							saveSession({
								thumbnail: previewUrl,
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
	};

	const stop = () => {
		stopAnalysis();
		stopCopy();
		if (abortRef.current) {
			abortRef.current.abort();
			abortRef.current = null;
		}
		setStage("idle");
	};

	const stopZoneAnalysis = () => {
		stopAnalysis();
		setStage((prev) => (prev === "analyzing" ? "idle" : prev));
	};

	const stopZoneCopy = () => {
		stopCopy();
		setStage((prev) => (prev === "generating" ? "done" : prev));
	};

	const copyText = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success("Copied to clipboard");
		} catch {
			toast.error("Failed to copy");
		}
	};

	const copyAll = () => {
		if (!copy) return;
		const text = `Title 1: ${copy.titles?.option1 ?? ""}\nTitle 2: ${copy.titles?.option2 ?? ""}\nTitle 3: ${copy.titles?.option3 ?? ""}\n\nTags: ${(copy.tags ?? []).join(", ")}\n\nDescription:\n${copy.description ?? ""}`;
		copyText(text);
	};

	const restoreSession = (session: HistorySession) => {
		setAnalysis(session.analysis);
		setCopy(session.copy);
		setPreviewUrl(session.thumbnail);
		setStage("done");
		setError(null);
	};

	const handleDeleteSession = (id: string) => {
		deleteSession(id);
		loadHistory();
	};

	const handleClearHistory = () => {
		clearHistory();
		loadHistory();
	};

	const updateAnalysisField = <K extends keyof ImageAnalysisType>(
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
	};

	const updateCopyField = <K extends keyof CopyWritingType>(
		field: K,
		value: CopyWritingType[K],
	) => {
		setCopy((prev) => (prev ? {...prev, [field]: value} : prev));
	};

	const displayAnalysis =
		(streamedAnalysis as Partial<ImageAnalysisType> | undefined) ?? analysis;
	const displayCopy =
		(streamedCopy as Partial<CopyWritingType> | undefined) ?? copy;

	return (
		<div className='min-h-screen bg-background text-foreground'>
			<header className='border-b px-4 py-3 flex items-center justify-between sticky top-0 bg-background z-10'>
				<div className='flex items-center gap-3'>
					<Button
						variant='ghost'
						size='icon'
						onClick={() => setHistoryOpen(!historyOpen)}>
						{historyOpen ? <ChevronLeft /> : <History />}
					</Button>
					<h1 className='text-lg font-semibold'>Etsy Copywriter</h1>
				</div>
				<ThemeToggle />
			</header>

			<div className='flex'>
				{historyOpen && (
					<aside className='w-64 border-r bg-card p-3 space-y-3 shrink-0 h-[calc(100vh-57px)] overflow-y-auto'>
						<div className='flex items-center justify-between'>
							<h2 className='font-medium text-sm'>History</h2>
							{history.length > 0 && (
								<Button
									variant='ghost'
									size='icon'
									className='h-7 w-7'
									onClick={handleClearHistory}>
									<Trash2 className='h-4 w-4' />
								</Button>
							)}
						</div>
						{history.length === 0 && (
							<p className='text-xs text-muted-foreground'>No sessions yet.</p>
						)}
						{history.map((session) => (
							<div
								key={session.id}
								className='group relative border rounded-md p-2 cursor-pointer hover:bg-accent'
								onClick={() => restoreSession(session)}>
								{session.thumbnail && (
									<>
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											src={session.thumbnail}
											alt='Thumbnail'
											className='w-full h-20 object-cover rounded mb-2'
										/>
									</>
								)}
								<div className='flex items-center justify-between'>
									<span className='text-xs text-muted-foreground'>
										{new Date(session.createdAt).toLocaleString()}
									</span>
									<Button
										variant='ghost'
										size='icon'
										className='h-6 w-6 opacity-0 group-hover:opacity-100'
										onClick={(e) => {
											e.stopPropagation();
											handleDeleteSession(session.id);
										}}>
										<X className='h-3 w-3' />
									</Button>
								</div>
							</div>
						))}
					</aside>
				)}

				<main className='flex-1 p-4 overflow-y-auto h-[calc(100vh-57px)]'>
					{error && (
						<Alert variant='destructive' className='mb-4'>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{isLoading && (
						<div className='mb-4 space-y-2'>
							<div className='flex items-center gap-2 text-sm text-muted-foreground'>
								{stage === "analyzing" && (
									<>
										<RefreshCw className='h-4 w-4 animate-spin' />
										Analyzing image...
									</>
								)}
								{stage === "generating" && (
									<>
										<RefreshCw className='h-4 w-4 animate-spin' />
										Generating copy...
									</>
								)}
							</div>
							<Progress
								value={
									stage === "analyzing" ? 33 : stage === "generating" ? 66 : 100
								}
								className='h-2'
							/>
						</div>
					)}

					<div className='grid grid-cols-1 xl:grid-cols-3 gap-4'>
						{/* Upload Zone */}
						<Card>
							<CardHeader>
								<CardTitle className='text-base flex items-center gap-2'>
									<Upload className='h-4 w-4' />
									Upload
								</CardTitle>
							</CardHeader>
							<CardContent className='space-y-4'>
								<div
									onDrop={onDrop}
									onDragOver={(e) => e.preventDefault()}
									onClick={() => fileInputRef.current?.click()}
									className='border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-accent/50 transition-colors'>
									{previewUrl ? (
										<>
											{/* eslint-disable-next-line @next/next/no-img-element */}
											<img
												src={previewUrl}
												alt='Preview'
												className='mx-auto max-h-48 object-contain rounded'
											/>
										</>
									) : (
										<div className='text-muted-foreground space-y-1'>
											<Upload className='h-8 w-8 mx-auto' />
											<p className='text-sm'>Drag & drop or click to upload</p>
											<p className='text-xs'>jpg, png, webp, gif</p>
										</div>
									)}
									<input
										ref={fileInputRef}
										type='file'
										accept='image/jpeg,image/png,image/webp,image/gif'
										className='hidden'
										onChange={onFileInput}
									/>
								</div>

								<div className='flex flex-wrap gap-2'>
									<Button
										onClick={startAnalysis}
										disabled={!file || isLoading}
										size='sm'>
										<Play className='h-4 w-4 mr-1' />
										Analyze
									</Button>
									<Button
										onClick={runAll}
										disabled={!file || isLoading}
										size='sm'>
										<Play className='h-4 w-4 mr-1' />
										Run All
									</Button>
									<Button
										onClick={stop}
										disabled={!isLoading}
										variant='outline'
										size='sm'>
										<Square className='h-4 w-4 mr-1' />
										Stop
									</Button>
								</div>
							</CardContent>
						</Card>

						{/* Analysis Zone */}
						<Card>
							<CardHeader>
								<CardTitle className='text-base'>Analysis</CardTitle>
							</CardHeader>
							<CardContent>
								{displayAnalysis ? (
									<div className='space-y-3 max-h-[60vh] overflow-y-auto pr-1'>
										<Section title='Core Attributes'>
											<Field label='Subject'>
												<Textarea
													value={displayAnalysis.core_attributes?.subject ?? ""}
													onChange={(e) =>
														updateAnalysisField(
															"core_attributes",
															"subject",
															e.target.value,
														)
													}
													rows={2}
												/>
											</Field>
											<Field label='Orientation'>
												<Input
													value={
														displayAnalysis.core_attributes?.orientation ?? ""
													}
													onChange={(e) =>
														updateAnalysisField(
															"core_attributes",
															"orientation",
															e.target.value,
														)
													}
												/>
											</Field>
											<Field label='Composition'>
												<Textarea
													value={
														displayAnalysis.core_attributes?.composition ?? ""
													}
													onChange={(e) =>
														updateAnalysisField(
															"core_attributes",
															"composition",
															e.target.value,
														)
													}
													rows={2}
												/>
											</Field>
										</Section>

										<Section title='Technical Specs'>
											<Field label='Medium'>
												<Input
													value={displayAnalysis.technical_specs?.medium ?? ""}
													onChange={(e) =>
														updateAnalysisField(
															"technical_specs",
															"medium",
															e.target.value,
														)
													}
												/>
											</Field>
											<Field label='Surface'>
												<Input
													value={displayAnalysis.technical_specs?.surface ?? ""}
													onChange={(e) =>
														updateAnalysisField(
															"technical_specs",
															"surface",
															e.target.value,
														)
													}
												/>
											</Field>
											<Field label='Textures'>
												<Textarea
													value={(
														displayAnalysis.technical_specs?.textures ?? []
													).join(", ")}
													onChange={(e) =>
														updateAnalysisField(
															"technical_specs",
															"textures",
															e.target.value.split(",").map((s) => s.trim()),
														)
													}
													rows={2}
												/>
											</Field>
											<Field label='Visible Tools'>
												<Textarea
													value={(
														displayAnalysis.technical_specs?.visible_tools ?? []
													).join(", ")}
													onChange={(e) =>
														updateAnalysisField(
															"technical_specs",
															"visible_tools",
															e.target.value.split(",").map((s) => s.trim()),
														)
													}
													rows={2}
												/>
											</Field>
										</Section>

										<Section title='Visual Identity'>
											<Field label='Primary Colors'>
												<Textarea
													value={(
														displayAnalysis.visual_identity?.primary_colors ??
														[]
													).join(", ")}
													onChange={(e) =>
														updateAnalysisField(
															"visual_identity",
															"primary_colors",
															e.target.value.split(",").map((s) => s.trim()),
														)
													}
													rows={2}
												/>
											</Field>
											<Field label='Lighting Vibe'>
												<Textarea
													value={
														displayAnalysis.visual_identity?.lighting_vibe ?? ""
													}
													onChange={(e) =>
														updateAnalysisField(
															"visual_identity",
															"lighting_vibe",
															e.target.value,
														)
													}
													rows={2}
												/>
											</Field>
											<Field label='Artistic Style'>
												<Textarea
													value={
														displayAnalysis.visual_identity?.artistic_style ??
														""
													}
													onChange={(e) =>
														updateAnalysisField(
															"visual_identity",
															"artistic_style",
															e.target.value,
														)
													}
													rows={2}
												/>
											</Field>
										</Section>

										<Section title='Marketing Hooks'>
											<Field label='Emotional Keywords'>
												<Textarea
													value={(
														displayAnalysis.marketing_hooks
															?.emotional_keywords ?? []
													).join(", ")}
													onChange={(e) =>
														updateAnalysisField(
															"marketing_hooks",
															"emotional_keywords",
															e.target.value.split(",").map((s) => s.trim()),
														)
													}
													rows={2}
												/>
											</Field>
											<Field label='Symbolism'>
												<Textarea
													value={
														displayAnalysis.marketing_hooks?.symbolism ?? ""
													}
													onChange={(e) =>
														updateAnalysisField(
															"marketing_hooks",
															"symbolism",
															e.target.value,
														)
													}
													rows={2}
												/>
											</Field>
											<Field label='Suggested Placement'>
												<Textarea
													value={(
														displayAnalysis.marketing_hooks
															?.suggested_placement ?? []
													).join(", ")}
													onChange={(e) =>
														updateAnalysisField(
															"marketing_hooks",
															"suggested_placement",
															e.target.value.split(",").map((s) => s.trim()),
														)
													}
													rows={2}
												/>
											</Field>
											<Field label='Unique Details'>
												<Textarea
													value={
														displayAnalysis.marketing_hooks
															?.unique_handcrafted_details ?? ""
													}
													onChange={(e) =>
														updateAnalysisField(
															"marketing_hooks",
															"unique_handcrafted_details",
															e.target.value,
														)
													}
													rows={2}
												/>
											</Field>
										</Section>

										<div className='flex flex-wrap gap-2 pt-2'>
											<Button
												onClick={() => startCopy()}
												disabled={copyLoading || !displayAnalysis}
												size='sm'>
												<ClipboardList className='h-4 w-4 mr-1' />
												Generate Copy
											</Button>
											<Button
												onClick={startAnalysis}
												disabled={analysisLoading || !file}
												variant='outline'
												size='sm'>
												<RefreshCw className='h-4 w-4 mr-1' />
												Regenerate
											</Button>
											{analysisLoading && (
												<Button
													onClick={stopZoneAnalysis}
													variant='destructive'
													size='sm'>
													<Square className='h-4 w-4 mr-1' />
													Stop
												</Button>
											)}
										</div>
									</div>
								) : (
									<p className='text-sm text-muted-foreground'>
										Upload an image and analyze to see results.
									</p>
								)}
							</CardContent>
						</Card>

						{/* Copy Zone */}
						<Card>
							<CardHeader>
								<CardTitle className='text-base'>Copy</CardTitle>
							</CardHeader>
							<CardContent>
								{displayCopy ? (
									<div className='space-y-4 max-h-[60vh] overflow-y-auto pr-1'>
										<div className='space-y-2'>
											{(["option1", "option2", "option3"] as const).map(
												(opt, i) => (
													<div key={opt}>
														<Label className='text-xs'>Title {i + 1}</Label>
														<div className='flex gap-2 mt-1'>
															<Input
																value={displayCopy.titles?.[opt] ?? ""}
																onChange={(e) =>
																	setCopy((prev) =>
																		prev
																			? ({
																					...prev,
																					titles: {
																						option1: prev.titles?.option1 ?? "",
																						option2: prev.titles?.option2 ?? "",
																						option3: prev.titles?.option3 ?? "",
																						[opt]: e.target.value,
																					},
																				} as Partial<CopyWritingType>)
																			: prev,
																	)
																}
															/>
															<Button
																variant='outline'
																size='icon'
																className='shrink-0'
																onClick={() =>
																	copyText(displayCopy.titles?.[opt] ?? "")
																}>
																<Copy className='h-4 w-4' />
															</Button>
														</div>
													</div>
												),
											)}
										</div>

										<div>
											<Label className='text-xs'>Tags</Label>
											<div className='flex gap-2 mt-1'>
												<Textarea
													value={(displayCopy.tags ?? []).join(", ")}
													onChange={(e) =>
														updateCopyField(
															"tags",
															e.target.value.split(",").map((s) => s.trim()),
														)
													}
													rows={3}
												/>
												<Button
													variant='outline'
													size='icon'
													className='shrink-0'
													onClick={() =>
														copyText((displayCopy.tags ?? []).join(", "))
													}>
													<Copy className='h-4 w-4' />
												</Button>
											</div>
										</div>

										<div>
											<Label className='text-xs'>Description</Label>
											<div className='flex gap-2 mt-1'>
												<Textarea
													value={displayCopy.description ?? ""}
													onChange={(e) =>
														updateCopyField("description", e.target.value)
													}
													rows={6}
												/>
												<Button
													variant='outline'
													size='icon'
													className='shrink-0'
													onClick={() =>
														copyText(displayCopy.description ?? "")
													}>
													<Copy className='h-4 w-4' />
												</Button>
											</div>
										</div>

										<div className='flex flex-wrap gap-2 pt-2'>
											<Button onClick={copyAll} size='sm'>
												<ClipboardList className='h-4 w-4 mr-1' />
												Copy All
											</Button>
											<Button
												onClick={() => startCopy()}
												disabled={copyLoading || !displayAnalysis}
												variant='outline'
												size='sm'>
												<RefreshCw className='h-4 w-4 mr-1' />
												Regenerate
											</Button>
											{copyLoading && (
												<Button
													onClick={stopZoneCopy}
													variant='destructive'
													size='sm'>
													<Square className='h-4 w-4 mr-1' />
													Stop
												</Button>
											)}
										</div>
									</div>
								) : (
									<p className='text-sm text-muted-foreground'>
										Generate copy from analysis to see results.
									</p>
								)}
							</CardContent>
						</Card>
					</div>
				</main>
			</div>
		</div>
	);
}

function Section({
	children,
	title,
}: {
	children: React.ReactNode;
	title: string;
}) {
	return (
		<div>
			<h3 className='text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2'>
				{title}
			</h3>
			<div className='space-y-2'>{children}</div>
		</div>
	);
}

function Field({children, label}: {children: React.ReactNode; label: string}) {
	return (
		<div>
			<Label className='text-xs'>{label}</Label>
			<div className='mt-1'>{children}</div>
		</div>
	);
}
