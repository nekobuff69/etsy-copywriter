/**
 * Shorten a model ID by stripping the provider prefix (everything before and including the last "/").
 * e.g., "qwen/qwen3-vl-8b-instruct" → "qwen3-vl-8b-instruct"
 * e.g., "gpt-4" → "gpt-4"
 *
 * CSS `truncate` class handles overflow in containers with constrained width.
 */
export function shortModelName(model: string): string {
	if (!model) return model;
	const parts = model.split("/");
	return parts[parts.length - 1];
}
