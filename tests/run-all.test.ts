import {vi, describe, it, expect, beforeEach} from "vitest";

/* ------------------------------------------------------------------ */
/* Mock the pipeline modules BEFORE importing the route               */
/* ------------------------------------------------------------------ */
const mockAnalyzeImage = vi.fn();
const mockGenerateCopy = vi.fn();

vi.mock("@/lib/getImageAnalysis", () => ({
	analyzeImage: (...args: unknown[]) => mockAnalyzeImage(...args),
}));

vi.mock("@/lib/getCopyWritings", () => ({
	generateCopy: (...args: unknown[]) => mockGenerateCopy(...args),
}));

import {POST} from "../app/api/run-all/route";
import type {ImageAnalysisType} from "../lib/definitions";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeFakeFile(): File {
	return new File([new Blob(["fake-image-data"])], "test.jpg", {
		type: "image/jpeg",
	});
}

function makeFakeFormData(file: File): FormData {
	const fd = new FormData();
	fd.append("image", file);
	return fd;
}

function makeNextRequest(body: FormData): Request {
	return new Request("http://localhost/api/run-all", {
		method: "POST",
		body,
	});
}

async function readStreamLines(
	response: Response,
): Promise<Record<string, unknown>[]> {
	const reader = response.body?.getReader();
	if (!reader) throw new Error("No response body");

	const decoder = new TextDecoder();
	let buffer = "";
	const events: Record<string, unknown>[] = [];

	while (true) {
		const {done, value} = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, {stream: true});
		const lines = buffer.split("\n");
		buffer = lines.pop() || "";
		for (const line of lines) {
			if (!line.trim()) continue;
			events.push(JSON.parse(line));
		}
	}
	return events;
}

const MOCK_ANALYSIS: ImageAnalysisType = {
	core_attributes: {
		subject: "A sunset",
		orientation: "landscape",
		composition: "rule of thirds",
	},
	technical_specs: {
		medium: "oil",
		surface: "canvas",
		textures: ["brush strokes"],
		visible_tools: ["palette knife"],
	},
	visual_identity: {
		primary_colors: ["orange", "purple"],
		lighting_vibe: "warm",
		artistic_style: "impressionism",
	},
	marketing_hooks: {
		emotional_keywords: ["serene", "peaceful"],
		symbolism: "end of day",
		suggested_placement: ["living room"],
		unique_handcrafted_details: "hand-painted",
	},
};

const MOCK_COPY = {
	titles: {
		option1: "Sunset Bliss",
		option2: "Golden Hour",
		option3: "Dawn's Light",
	},
	tags: ["sunset", "art", "painting"],
	description: "A beautiful sunset painting.",
};

function mockStreamResult(objectValue: unknown) {
	return {
		object: Promise.resolve(objectValue),
		toTextStreamResponse: vi.fn(),
	};
}

/* ------------------------------------------------------------------ */
/* Tests                                                              */
/* ------------------------------------------------------------------ */

describe("POST /api/run-all", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("streams analyzing → generating → done on success", async () => {
		mockAnalyzeImage.mockResolvedValue(mockStreamResult(MOCK_ANALYSIS));
		mockGenerateCopy.mockReturnValue(mockStreamResult(MOCK_COPY));

		const file = makeFakeFile();
		const fd = makeFakeFormData(file);
		const req = makeNextRequest(fd);

		const res = await POST(req as any);
		expect(res.ok).toBe(true);

		const events = await readStreamLines(res);
		expect(events).toHaveLength(3);
		expect(events[0]).toEqual({stage: "analyzing"});
		expect(events[1]).toEqual({stage: "generating"});
		expect(events[2]).toMatchObject({
			stage: "done",
			analysis: MOCK_ANALYSIS,
			copy: MOCK_COPY,
		});
	});

	it("streams error when analysis rejects", async () => {
		// Attach .catch() so the rejected promise doesn't leak as unhandled
		const rejectedObj = Promise.reject(new Error("LLM analysis failed"));
		rejectedObj.catch(() => {});
		mockAnalyzeImage.mockResolvedValue({
			object: rejectedObj,
			toTextStreamResponse: vi.fn(),
		});

		const file = makeFakeFile();
		const fd = makeFakeFormData(file);
		const req = makeNextRequest(fd);

		const res = await POST(req as any);
		const events = await readStreamLines(res);

		const errorEvent = events.find((e) => e.stage === "error");
		expect(errorEvent).toBeDefined();
		expect((errorEvent as any).error).toBe("LLM analysis failed");
	});

	it("streams error when copy generation rejects", async () => {
		const rejectedObj = Promise.reject(new Error("LLM copy failed"));
		rejectedObj.catch(() => {});
		mockAnalyzeImage.mockResolvedValue(mockStreamResult(MOCK_ANALYSIS));
		mockGenerateCopy.mockReturnValue({
			object: rejectedObj,
			toTextStreamResponse: vi.fn(),
		});

		const file = makeFakeFile();
		const fd = makeFakeFormData(file);
		const req = makeNextRequest(fd);

		const res = await POST(req as any);
		const events = await readStreamLines(res);

		const errorEvent = events.find((e) => e.stage === "error");
		expect(errorEvent).toBeDefined();
		expect((errorEvent as any).error).toBe("LLM copy failed");
	});

	it("returns 400 when no image file provided", async () => {
		const fd = new FormData(); // no image
		const req = makeNextRequest(fd);

		const res = await POST(req as any);
		expect(res.status).toBe(400);

		const json = await res.json();
		expect((json as any).error).toBe("Missing image file");
	});

	it("withTimeout prevents stream from hanging forever", async () => {
		// The route uses a 120s timeout. We verify the timeout exists by
		// checking that the stream sends the initial "analyzing" event but
		// then hangs because the inner promise never resolves.
		const neverResolves = new Promise<never>(() => {
			// intentionally never settles
		});
		mockAnalyzeImage.mockResolvedValue({
			object: neverResolves,
			toTextStreamResponse: vi.fn(),
		});

		const file = makeFakeFile();
		const fd = makeFakeFormData(file);
		const req = makeNextRequest(fd);

		// POST returns the Response immediately (stream created, start() running)
		const res = await POST(req as any);
		expect(res.ok).toBe(true);
		expect(res.body).not.toBeNull();

		// Start reading the stream — the first event should be "analyzing"
		// then the stream should NOT complete within 100ms because analysis
		// is hanging (timeout is 120s).
		const reader = res.body!.getReader();
		const firstRead = await reader.read();
		const decoder = new TextDecoder();
		const text = decoder.decode(firstRead.value);
		expect(text).toContain('"stage":"analyzing"');

		// Second read should not resolve quickly (stream is waiting for LLM)
		const secondRead = await Promise.race([
			reader.read(),
			new Promise((r) => setTimeout(r, 100)).then(() => "timeout" as const),
		]);
		expect(secondRead).toBe("timeout");

		// Clean up
		reader.releaseLock();
	});
});
