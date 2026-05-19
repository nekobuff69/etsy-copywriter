import {z} from "zod";

export const imageAnalysisSchema = z.object({
	subject: z.string(),
	product_type: z.string(),
	medium: z.string(),
	artistic_style: z.string(),
	primary_colors: z.array(z.string()),
	vibe_keywords: z.array(z.string()),
});

export function migrateAnalysis(raw: unknown): z.infer<typeof imageAnalysisSchema> {
	const defaults = { subject: "", product_type: "", medium: "", artistic_style: "", primary_colors: [] as string[], vibe_keywords: [] as string[] };
	if (!raw || typeof raw !== "object") return defaults;
	const old = raw as Record<string, unknown>;
	const ca = old.core_attributes as Record<string, unknown> | undefined;
	const ts = old.technical_specs as Record<string, unknown> | undefined;
	const vi = old.visual_identity as Record<string, unknown> | undefined;
	const mh = old.marketing_hooks as Record<string, unknown> | undefined;
	return {
		subject: typeof ca?.subject === "string" ? ca!.subject as string : "",
		product_type: "",
		medium: typeof ts?.medium === "string" ? ts!.medium as string : "",
		artistic_style: typeof vi?.artistic_style === "string" ? vi!.artistic_style as string : "",
		primary_colors: Array.isArray(vi?.primary_colors) ? vi!.primary_colors as string[] : [],
		vibe_keywords: Array.isArray(mh?.emotional_keywords) ? mh!.emotional_keywords as string[] : [],
	};
}

export const copyWritingSchema = z.object({
	titles: z.object({
		option1: z.string().describe("A catchy, attention-grabbing title option"),
		option2: z
			.string()
			.describe("An alternative title with different emotional appeal"),
		option3: z
			.string()
			.describe("A third title option that highlights unique features"),
	}),
	tags: z
		.array(z.string())
		.describe(
			"A list of 5 to 8 SEO tags for the artwork, arranged by descending relevance",
		),
	description: z
		.string()
		.describe(
			"A compelling product description that highlights the artwork's unique qualities and emotional appeal",
		),
});
