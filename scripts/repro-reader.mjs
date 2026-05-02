/**
 * Test analyze-image with getReader to see raw stream data
 */
const BASE = "http://localhost:3000";

const MINIMAL_JPEG_BASE64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQgJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYI4Q/SFhSRFJiMkVic4EzMyQ1NmQ9QkNDR0SlFUVVNXWFlomJicoKSo0NUVVZTV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwA3/9k=";
const MINIMAL_JPEG = Buffer.from(MINIMAL_JPEG_BASE64, "base64");

function encode(settings) { return Buffer.from(JSON.stringify(settings)).toString("base64"); }
const settings = {
  vision: { baseURL: "https://openrouter.ai/api/v1", apiKey: "", model: "qwen/qwen3-vl-8b-instruct" },
  copy: { baseURL: "https://openrouter.ai/api/v1", apiKey: "", model: "qwen/qwen3-vl-30b-a3b-instruct" },
};
const HDRS = { "X-LLM-Config": encode(settings) };

async function test() {
  const fd = new FormData();
  fd.append("image", new Blob([MINIMAL_JPEG], { type: "image/jpeg" }), "test.jpg");

  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/analyze-image`, { method: "POST", body: fd, headers: HDRS });
  console.log(`Response: ${res.status} (${Date.now() - t0}ms)`);
  console.log(`Headers: ${[...res.headers.entries()].map(([k,v]) => `${k}: ${v}`).join(", ")}`);
  console.log(`BodyUsed: ${res.bodyUsed}`);

  const reader = res.body.getReader();
  let chunks = 0, bytes = 0;
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) { console.log(`Stream done. chunks=${chunks}, bytes=${bytes}`); break; }
    chunks++;
    bytes += value.length;
    console.log(`Chunk ${chunks}: ${value.length} bytes at ${Date.now() - t0}ms`);
    console.log(`  Text: ${decoder.decode(value).slice(0, 200)}`);
  }
  console.log(`Total: ${Date.now() - t0}ms`);
}

test();
