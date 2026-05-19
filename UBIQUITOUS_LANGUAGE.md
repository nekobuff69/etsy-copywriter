# Ubiquitous Language

## App Panels

| Term        | Definition                                                                     | Aliases to avoid            |
| ----------- | ------------------------------------------------------------------------------ | --------------------------- |
| **Workspace** | The panel where the user uploads an image, runs analysis, and generates copy | Work space, editor, main    |
| **History**   | The panel where past sessions are browsed, grouped by image                    | Archive, past work, sidebar |
| **Settings**  | The panel where LLM endpoints, models, and theme are configured                | Config, preferences         |

## Pipeline

| Term          | Definition                                                                      | Aliases to avoid        |
| ------------- | ------------------------------------------------------------------------------- | ----------------------- |
| **Pipeline**  | The full chain: optionally provide user context + upload an image → analyze it → generate copy                    | Workflow, process       |
| **Analysis**  | Structured data describing the product: subject, product_type, medium, artistic_style, primary_colors, vibe_keywords            | Description, metadata   |
| **Copy**      | Etsy listing content: titles, tags, and description                             | Content, text, output   |
| **Session**   | One complete run through the pipeline, saved to History                         | Entry, run, generation  |
| **Session Nav** | prev/next buttons and "Session N of M" indicator in the workspace header when viewing history | Navigation, pagination |
| **Back to Group** | Navigation action returning from a history session in the workspace to the History page, scrolled to the specific session row | Return, go back |
| **Run All**   | The client-side action that runs the full pipeline (analysis → copy) by sequentially calling `/api/analyze-image` then `/api/generate-copy` | Full run, auto-generate |
| **User Context** | Free-text input describing the product being sold (what it is, materials, style, audience). Injected into both Vision Model and Copy Model prompts. | Product info, metadata, notes |
| **Streaming** | Progressive delivery of LLM output as partial objects                           | Live update, real-time  |

## LLM Infrastructure

| Term             | Definition                                                                | Aliases to avoid                      |
| ---------------- | ------------------------------------------------------------------------- | ------------------------------------- |
| **Vision Model** | The LLM that receives an image and outputs structured Analysis            | Image model, analyzer                 |
| **Copy Model**   | The LLM that receives Analysis and outputs structured Copy                | Writer model, generator               |
| **Endpoint**     | The base URL of an OpenAI-compatible LLM service                          | Base URL, server, host                |
| **Provider**     | The service company or self-hosted instance serving LLM requests          | Vendor, platform, factory (see below) |
| **LLM Config**   | The three fields defining how to reach a model: endpoint, key, model name | Settings (too broad), credentials     |
| **Health Check** | A lightweight test confirming an endpoint accepts the expected input type | Ping, test, validation                |

## History & Grouping

| Term          | Definition                                                            | Aliases to avoid           |
| ------------- | --------------------------------------------------------------------- | -------------------------- |
| **Image Hash**  | A SHA-256 digest of the raw uploaded file bytes                       | Hash, fingerprint          |
| **Image Group** | All Sessions that share the same Image Hash                           | Group, cluster, collection |
| **Group Card**  | The UI element on History that represents one Image Group             | Card, tile                 |
| **Group Title** | User-editable name for an Image Group, stored in separate localStorage key | Title, label         |
| **Session Index** | Ascending number displayed per session row in a group (#1 = oldest, #N = newest) | Index, count     |
| **Session Row** | A single Session entry inside an expanded Group Card                  | Row, item, entry           |
| **Thumbnail**   | A compressed 200×200 JPEG preview stored with each Session            | Preview, image             |
| **Restore**     | Loading a past Session from History back into the Workspace           | Open, load, bring back     |

## UI Zones (Workspace)

| Term            | Definition                                              | Aliases to avoid      |
| --------------- | ------------------------------------------------------- | --------------------- |
| **Upload Zone**   | The workspace panel for dropping or selecting an image and optionally describing the product via a User Context textarea  | Drop zone, file area  |
| **Analysis Zone** | The workspace panel showing and editing Analysis        | Analysis panel, form  |
| **Copy Zone**     | The workspace panel showing generated Copy with actions | Output zone, results  |
## Data Migration
|
| Term          | Definition                                                                      | Aliases to avoid        |
| ------------- | ------------------------------------------------------------------------------- | ----------------------- |
| **Migration**  | Transparent upgrade of old nested 4-section Analysis (15 fields) to new flat 6-field format on session read | Upgrade, transform      |

## Relationships

- A **Workspace** contains one active **Pipeline** at a time.
- A **Pipeline** produces exactly one **Session** when it completes.
- A **Session** belongs to exactly one **Image Group** (via **Image Hash**).
- An **Image Group** contains one or more **Sessions**.
- A **Session** stores a snapshot of the **LLM Config** that produced it.
- Each **LLM Config** targets exactly one **Endpoint** and one model name.
- The app has two independent **LLM Configs**: one for the **Vision Model**, one for the **Copy Model**.
- A **User Context** text is injected into both the **Vision Model** prompt (as authoritative ground truth) and the **Copy Model** prompt (as selling context).
- A **Health Check** tests one **LLM Config** at a time.
- Old **Sessions** with nested 4-section **Analysis** are transparently **Migrated** to the flat 6-field format on read.

## Example dialogue

> **Dev:** "When a user drops an image into the **Upload Zone**, we compute the **Image Hash** immediately. But we only save it when the **Pipeline** completes, right?"

> **Domain expert:** "Correct. The hash lives in local state until a **Session** is created. If they drop a new image without running the **Pipeline**, the old hash is discarded."

> **Dev:** "And on the **History** page, **Sessions** with the same **Image Hash** collapse into one **Group Card**?"

> **Domain expert:** "Yes. The **Group Card** surface shows the **Thumbnail** and how many **Sessions** are inside. Expanding it reveals **Session Rows**. Each row shows the **Vision Model** and **Copy Model** that were used, plus the generated **Copy**."

> **Dev:** "What if the user changed their **LLM Config** since that **Session** was created?"

> **Domain expert:** "Doesn't matter. Every **Session** stores its own snapshot of the **Endpoint**, model names, and provider label. Old entries remain accurate even if the user switches to Ollama later."

> **Dev:** "Got it. And if they click **Restore**, the **Session** loads into the **Workspace** via a query parameter. The **Analysis Zone** and **Copy Zone** populate from that saved data."

> **Domain expert:** "Exactly. But remember — a restored **Session** is read-only until the user starts a new **Pipeline**."

## Flagged ambiguities

- **"Settings"** was used to mean both the Settings page and the LLM Config structure. These are distinct: the **Settings** page contains UI for editing **LLM Configs** (and a theme toggle). Use **LLM Config** when referring to the `{ endpoint, apiKey, model }` data structure.
- **"Provider"** was used loosely to mean the service company (OpenRouter), the endpoint URL, and the SDK factory object. Use **Provider** for the company/service, **Endpoint** for the URL, and **Provider Factory** only when discussing the `createProvider()` code module.
- **"Copy"** was used to mean both (a) the generated Etsy listing content and (b) the clipboard action. Use **Copy** for the content and **Copy to Clipboard** or **Copy Action** for the UI action.
- **"Analysis"** was used to mean both the process of analyzing and the resulting structured data. Use **Analyze** (verb) for the process and **Analysis** (noun) for the output data.
- **"User Context"** was historically absent — user could only upload an image. Now the **Upload Zone** includes a free-text input. Use **User Context** or **User Text** for the string value stored in sessions; use **Textarea** or **Context Input** for the UI element.
