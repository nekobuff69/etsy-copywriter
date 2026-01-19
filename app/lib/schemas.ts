import {z} from "zod";

export const imageAnalysisSchema = z.object({
	core_attributes: z.object({
		subject: z.string(),
		orientation: z.enum(["landscape", "portrait", "square"]),
		composition: z.string(),
	}),
	technical_specs: z.object({
		medium: z.string(),
		surface: z.string(),
		textures: z.array(z.string()),
		visible_tools: z.array(z.string()),
	}),
	visual_identity: z.object({
		primary_colors: z.array(z.string()),
		lighting_vibe: z.string(),
		artistic_style: z.string(),
	}),
	marketing_hooks: z.object({
		emotional_keywords: z.array(z.string()),
		symbolism: z.string(),
		suggested_placement: z.array(z.string()),
		unique_handcrafted_details: z.string(),
	}),
});

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
