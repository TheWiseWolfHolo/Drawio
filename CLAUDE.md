# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Drawio is a Next.js 16 application that uses AI (LLM) to generate academic-standard diagrams from natural language descriptions, text files, or images. The project focuses on generating draw.io (diagrams.net) diagrams optimized for scientific research papers.

**Current State**: The application uses `DrawioCanvas.jsx` for rendering. LLM generates draw.io mxGraph XML format following academic paper standards (top-tier conference quality).

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server (requires --webpack flag)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint
```

Development server runs on http://localhost:3000

**Important**: Next.js must run with `--webpack` flag for compatibility.

## Architecture

### Core Flow
1. User inputs natural language description in Chat component (supports text/file/image upload via tabs)
2. Request sent to `/api/generate` with LLM config and user input
3. API route validates authentication (access password OR client-side API key)
4. API calls LLM (OpenAI or Anthropic) via Server-Sent Events (SSE) streaming
5. LLM generates draw.io mxGraph XML based on system prompt in `lib/prompts.js`
6. Generated XML is post-processed (removes markdown fences via `postProcessDrawioCode()`) and validated
7. XML loaded into draw.io iframe via postMessage API
8. Generation saved to history (localStorage, excluding image data)

### Authentication Flow
- **Priority**: Access password takes precedence over client-side config
- **Client checks**: `app/page.js` checks `usePassword` state before sending requests
- **Server validates**: `/api/generate/route.js` validates password against `process.env.ACCESS_PASSWORD`
- **Header**: Password sent via `x-access-password` header when enabled

### Key Files

**API Routes** (`app/api/`):
- `generate/route.js` - Main diagram generation endpoint (SSE streaming)
- `auth/validate/route.js` - Access password validation
- `configs/route.js` - Server-side LLM config endpoint
- `models/route.js` - Available models endpoint

**Components** (`components/`):
- `DrawioCanvas.jsx` - draw.io iframe integration (currently active)
- `ExcalidrawCanvas.jsx` - Excalidraw canvas (legacy, not currently used)
- `Chat.jsx` - User input with 3 tabs: text/file/image (supports .md, .txt, .json, .csv up to 10MB; images up to 5MB)
- `ImageUpload.jsx` - Image upload with drag-and-drop (supports JPG, PNG, WebP, GIF)
- `CodeEditor.jsx` - Monaco editor for XML viewing/editing with apply/optimize/clear buttons
- `ConfigManager.jsx` - LLM provider configuration UI
- `AccessPasswordModal.jsx` - Server-side access password UI
- `HistoryModal.jsx` - Generation history viewer (max 20 items)
- `OptimizationPanel.jsx` - Advanced optimization with 16 preset options (layout, style, visual enhancements, academic standards)

**Core Logic** (`lib/`):
- `prompts.js` - System prompt with draw.io XML format specs and academic paper standards (SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, OPTIMIZATION_SYSTEM_PROMPT)
- `llm-client.js` - LLM API client (OpenAI/Anthropic) with streaming support and multimodal content
- `optimizeArrows.js` - Arrow optimization algorithm (for Excalidraw, not currently used)
- `config-manager.js` - Client-side LLM config management (localStorage)
- `history-manager.js` - Generation history persistence (localStorage, auto-cleanup when quota exceeded)
- `image-utils.js` - Image processing for multimodal input (base64 encoding, compression)
- `constants.js` - Chart type definitions

### Authentication Modes

Two authentication modes (priority: access password > client-side config):

1. **Client-side API Key**: Users provide their own LLM API key (stored in localStorage)
2. **Server-side Access Password**: Admin configures LLM via environment variables, users access with password

### Environment Variables

Optional server-side LLM configuration:

```bash
ACCESS_PASSWORD=your-secure-password
SERVER_LLM_TYPE=anthropic  # or openai
SERVER_LLM_BASE_URL=https://api.anthropic.com/v1
SERVER_LLM_API_KEY=sk-ant-your-key-here
SERVER_LLM_MODEL=claude-sonnet-4-5-20250929
```

## Critical Implementation Details

### draw.io Integration (`DrawioCanvas.jsx`)

Embeds draw.io using iframe with postMessage communication:

- **iframe URL**: `https://embed.diagrams.net/?embed=1&proto=json&ui=min`
- **Communication**: Listens for `init` event, sends `load` action with XML
- **XML Escaping**: `escapeXml()` function escapes &, <, >, ", '
- **Fallback**: 3-second timeout forces ready state if init event doesn't fire

### draw.io mxGraph XML Format

LLM generates XML in mxGraph format:

```xml
<mxfile>
  <diagram id="id" name="Page-1">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="2" value="Text" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1">
          <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

### System Prompt (`lib/prompts.js`)

Defines academic paper diagram standards:

**Typography**: Arial/Helvetica, 10-16pt, explicit `fontFamily=Arial;` in style
**Colors**: Grayscale-first (#F7F9FC, #2C3E50), color-blind friendly
**Layout**: Grid alignment (10px multiples), 40-60px spacing, 10% margins
**Lines**: strokeWidth 1-2, solid lines (dashed=0), `endArrow=classicBlock`
**Annotations**: (a), (b), (c) numbering, units required (ms, MB, %), legends for complex diagrams

### Streaming Response (`/api/generate`)

Server-Sent Events (SSE) implementation:

- Streams XML chunks as generated via `ReadableStream`
- Client accumulates chunks in `app/page.js` using `handleSendMessage()`
- Post-processing removes markdown fences (```xml, ```mxgraph) via `postProcessDrawioCode()`
- Validates `<mxfile>` structure
- Saves to history on success (excludes image data to prevent quota issues)
- Supports abort via `AbortController` (stop button in UI)

### Multimodal Input (`lib/llm-client.js`)

Different message formats for OpenAI vs Anthropic:

**OpenAI** (`processMessageForOpenAI`):
```javascript
{
  role: 'user',
  content: [
    { type: 'text', text: '...' },
    { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,...', detail: 'high' } }
  ]
}
```

**Anthropic** (`processMessageForAnthropic`):
```javascript
{
  role: 'user',
  content: [
    { type: 'text', text: '...' },
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: '...' } }
  ]
}
```

Vision model detection in `app/api/generate/route.js`:
- Checks model name for: `vision`, `gpt-4o`, `gpt-4-turbo`, `claude-3`, `claude-sonnet`, `claude-opus`, `claude-haiku`

### Arrow Optimization (`lib/optimizeArrows.js`)

Smart arrow algorithm (for Excalidraw, not currently used with draw.io):

- `determineEdges()`: Calculates optimal edge pairs based on element positions
- `calculateEdgePoint()`: Computes exact connection points on element edges
- Aligns arrows to center of edges for clean connections

## Common Tasks

### Modifying LLM Prompt

Edit `SYSTEM_PROMPT` in `lib/prompts.js`:
- XML format specifications
- Academic paper standards
- Chart type specifications
- Color schemes and typography

**Warning**: The prompt is currently ~244 lines. If output is too short, consider:
1. Reducing redundant specifications
2. Adding explicit "content richness" guidelines
3. Simplifying examples to save token budget for actual generation

### Switching Between Excalidraw and draw.io

In `app/page.js`:
- Change import: `DrawioCanvas` ↔ `ExcalidrawCanvas`
- Update component usage in JSX (line ~671)
- Adjust state handling (`generatedXml` for draw.io, `elements` for Excalidraw)
- Update `tryParseAndApply()` to handle JSON vs XML parsing

### Adding LLM Provider

1. Add provider type to `callLLM()` in `lib/llm-client.js`
2. Implement provider-specific function (e.g., `callOpenAI()`, `callAnthropic()`)
3. Handle streaming response format (different SSE formats)
4. Implement `processMessageForXXX()` for multimodal support
5. Add to provider options in `ConfigModal.jsx`

### Debugging SSE Streaming Issues

Common issues:
- **Empty responses**: Check if LLM is outputting explanatory text instead of XML
- **Parsing errors**: Check `postProcessDrawioCode()` - it removes markdown fences
- **Quota exceeded**: History manager auto-limits to 20 items
- **Vision errors**: Verify model name matches patterns in `route.js:64-71`

## Important Notes

- **Recommended Model**: claude-sonnet-4.5 (best diagram generation quality)
- **Output Format**: Currently draw.io mxGraph XML (transitioned from Excalidraw JSON)
- **Client Storage**: All configs and history stored in localStorage (privacy-focused)
  - Config key: `smart-excalidraw-configs` and `smart-excalidraw-active-config`
  - History key: `smart-excalidraw-history` (max 20 items, auto-cleanup)
  - Password key: `smart-excalidraw-use-password` and `smart-excalidraw-access-password`
- **No SSR**: Both canvas components use `dynamic` import with `ssr: false`
- **Webpack Required**: Next.js must run with `--webpack` flag (set in package.json scripts)
- **Chinese UI**: Primary language is Chinese (Simplified)
- **Multimodal Support**: Chat component supports text + image input for diagram generation
- **State Management**: Uses React `useState` and `useEffect` - no external state library
- **Layout**: Resizable horizontal split panel (Chat+Editor | Canvas) with drag handle
