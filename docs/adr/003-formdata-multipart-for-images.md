# ADR 003: FormData Multipart for Image Uploads

**Status:** Accepted

**Context:**
The original pipeline read images from disk via `fs.readFile` and encoded them to base64 strings. The new workspace UI needed browser-based upload.

We evaluated:
1. Base64-in-JSON body (`{ image: "data:image/png;base64,..." }`)
2. FormData multipart (`FormData` with `image` file field)

**Decision:**
Use FormData multipart for the upload API.

**Rationale:**
- No base64 inflation (33% size overhead).
- Native browser support via `<input type="file">` and `fetch` with `FormData`.
- Server-side `req.formData()` gives us a `File` blob → `file.arrayBuffer()` → `Uint8Array`.
- Pipelines were refactored to accept `Uint8Array` instead of file paths — this aligns perfectly with `FormData`.

**Consequences:**
- Client must construct `FormData` and append the file.
- `useObject` does not natively support FormData; we provide a custom `fetch` function.
- For `/api/run-all`, we also use FormData and parse it manually in the route handler.
