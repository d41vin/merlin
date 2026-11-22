export type MarkdownFeature =
  | "frontmatter"
  | "fenced-code"
  | "mermaid"
  | "table"
  | "task-list"
  | "html"
  | "mdx"
  | "links"
  | "images"
  | "custom-container"
  | "crlf"

export interface MarkdownFixture {
  id: string
  label: string
  source: string
  features: MarkdownFeature[]
  requiresSourceFallback: boolean
}

export function classifyMarkdown(source: string): MarkdownFeature[] {
  const features = new Set<MarkdownFeature>()
  if (/^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(source)) {
    features.add("frontmatter")
  }
  if (/\r\n/.test(source)) features.add("crlf")
  if (/^(?:```|~~~)/m.test(source)) features.add("fenced-code")
  if (/^(?:```|~~~)\s*mermaid\s*$/im.test(source)) features.add("mermaid")
  if (/^\s*\|.+\|\s*$/m.test(source) && /^\s*\|?\s*:?-{3,}/m.test(source)) {
    features.add("table")
  }
  if (/^\s*[-*+]\s+\[[ xX]\]\s+/m.test(source)) features.add("task-list")
  if (/^\s*:{3,}[A-Za-z]/m.test(source)) features.add("custom-container")

  const withoutFences = source.replace(/^(?:```|~~~).*$\n?^[\s\S]*?^(?:```|~~~)\s*$/gm, "")
  if (/<\/?[A-Za-z][^>]*>/m.test(withoutFences)) features.add("html")
  if (
    /^\s*(?:import|export)\s+/m.test(withoutFences) ||
    /<\/?[A-Z][A-Za-z0-9.]*(?:\s|\/?>)/.test(withoutFences) ||
    /<[A-Za-z][\w-]*(?:-[A-Za-z0-9_-]+)+[\s>/]/.test(withoutFences) ||
    /\{(?:[^{}\r\n]|\{[^{}\r\n]*\})+\}/.test(withoutFences)
  ) {
    features.add("mdx")
  }
  if (/\[[^\]]+\]\([^\s)]+(?:\s+['"][^)]*['"])?\)/.test(withoutFences)) {
    features.add("links")
  }
  if (/!\[[^\]]*\]\([^\s)]+(?:\s+['"][^)]*['"])?\)/.test(withoutFences)) {
    features.add("images")
  }
  return [...features]
}

export function requiresSourceFallback(source: string): boolean {
  const features = classifyMarkdown(source)
  return (
    features.includes("frontmatter") ||
    features.includes("mdx") ||
    features.includes("custom-container") ||
    features.includes("html") ||
    features.includes("images") ||
    features.includes("crlf")
  )
}

export const MARKDOWN_FIXTURES: MarkdownFixture[] = [
  {
    id: "canonical",
    label: "Canonical CommonMark",
    source: "# Canonical\n\nA **safe** paragraph.\n",
    features: [],
    requiresSourceFallback: false,
  },
  {
    id: "gfm",
    label: "GFM table and task list",
    source:
      "# GFM\n\n| Feature | State |\n| --- | --- |\n| Tables | kept |\n\n- [x] Completed\n- [ ] Pending\n",
    features: ["table", "task-list"],
    requiresSourceFallback: false,
  },
  {
    id: "mermaid",
    label: "Mermaid fence",
    source: "```mermaid\nflowchart TD\n  A[Start] --> B[Finish]\n```\n",
    features: ["fenced-code", "mermaid"],
    requiresSourceFallback: false,
  },
  {
    id: "frontmatter",
    label: "YAML frontmatter",
    source: "---\ntitle: Preservation proof\ntags:\n  - docs\n---\n\n# Body\n\nKeep this source.\n",
    features: ["frontmatter"],
    requiresSourceFallback: true,
  },
  {
    id: "html",
    label: "Raw HTML",
    source:
      '# HTML\n\n<details open><summary>More</summary><p>Safe details</p></details>\n\n<span style="color:red" onclick="nativeOperation()">Styled source</span>\n',
    features: ["html"],
    requiresSourceFallback: true,
  },
  {
    id: "mdx",
    label: "MDX module and component",
    source:
      "import { Chart } from './Chart.js'\n\n# Report\n\n<Chart value={nativeOperation()} />\n",
    features: ["html", "mdx"],
    requiresSourceFallback: true,
  },
  {
    id: "directive",
    label: "Unsupported container directive",
    source: ":::note\nRetain this unsupported construct exactly.\n:::\n",
    features: ["custom-container"],
    requiresSourceFallback: true,
  },
  {
    id: "links-images",
    label: "URL and image policy",
    source:
      "[HTTPS](https://example.com/docs) [Local](guide.md) [Anchor](#safe)\n\n[Unsafe](javascript:nativeOperation())\n\n![Remote](https://example.com/remote.png) ![Local image](assets/local.png)\n",
    features: ["links", "images"],
    requiresSourceFallback: true,
  },
  {
    id: "hostile-html",
    label: "Hostile HTML sanitization",
    source:
      '# Hostile fixture\n\n<script>window.__MERLIN_DOCUMENT_EXECUTED__ = true</script>\n\n<img src="https://example.com/tracker.png" onerror="window.__MERLIN_DOCUMENT_EXECUTED__ = true" alt="tracker">\n\n<a href="javascript:window.__MERLIN_DOCUMENT_EXECUTED__ = true" onclick="nativeOperation()">unsafe link</a>\n\n<iframe src="https://example.com"></iframe><object data="payload"></object><svg onload="nativeOperation()"></svg>\n\n<form action="https://example.com"><button formaction="https://example.com">Submit</button></form>\n\n<code class="document-controlled" style="color:red">code</code>\n',
    features: ["html"],
    requiresSourceFallback: true,
  },
  {
    id: "crlf",
    label: "CRLF and unsupported source",
    source: "---\r\ntitle: Windows line endings\r\n---\r\n\r\nText preserved byte for byte.\r\n",
    features: ["frontmatter", "crlf"],
    requiresSourceFallback: true,
  },
]

export function getFixture(id: string): MarkdownFixture {
  const fixture = MARKDOWN_FIXTURES.find((candidate) => candidate.id === id)
  if (!fixture) throw new Error(`Unknown Markdown fixture: ${id}`)
  return fixture
}
