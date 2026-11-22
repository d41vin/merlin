import rehypeRaw from "rehype-raw"
import rehypeSanitize, { type Options } from "rehype-sanitize"
import remarkFrontmatter from "remark-frontmatter"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"

export type SanitizedRoot = Parameters<ReturnType<typeof rehypeSanitize>>[0]

const ALLOWED_ELEMENTS = new Set([
  "p",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "pre",
  "code",
  "em",
  "strong",
  "del",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "details",
  "summary",
  "a",
  "img",
  "input",
])

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(["href", "title"]),
  img: new Set(["src", "alt", "width", "height", "title"]),
  input: new Set(["type", "checked", "disabled"]),
  code: new Set(["className"]),
}

const SANITIZE_SCHEMA: Options = {
  tagNames: [...ALLOWED_ELEMENTS],
  attributes: {
    a: ["href", "title"],
    img: ["src", "alt", "width", "height", "title"],
    input: [["type", "checkbox"], "checked", "disabled"],
    code: [["className", /^language-[A-Za-z0-9_-]+$/]],
  },
  protocols: {
    href: ["https"],
    src: [],
  },
  allowComments: false,
  allowDoctypes: false,
  clobber: [],
}

export function sanitizeMarkdown(source: string): SanitizedRoot {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, SANITIZE_SCHEMA)
  const tree = processor.runSync(processor.parse(source)) as SanitizedRoot
  auditSanitizedTree(tree)
  return tree
}

function auditSanitizedTree(root: SanitizedRoot) {
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") throw new Error("Invalid sanitized AST node")
    const candidate = node as {
      type?: string
      tagName?: string
      properties?: Record<string, unknown>
      children?: unknown[]
    }
    if (candidate.type === "raw" || candidate.type === "doctype") {
      throw new Error("Sanitizer left an executable-capable AST node")
    }
    if (candidate.type === "element") {
      const tagName = candidate.tagName ?? ""
      if (!ALLOWED_ELEMENTS.has(tagName)) {
        throw new Error(`Sanitizer left an unlisted element: ${tagName}`)
      }
      const allowed = ALLOWED_ATTRIBUTES[tagName] ?? new Set<string>()
      for (const [name, value] of Object.entries(candidate.properties ?? {})) {
        if (!allowed.has(name)) throw new Error(`Sanitizer left ${tagName}[${name}]`)
        if (tagName === "input") {
          if (name === "type" && value !== "checkbox") {
            throw new Error("Sanitizer left a non-checkbox input")
          }
          if (name === "disabled" && value !== true && value !== "") {
            throw new Error("Task-list inputs must remain disabled")
          }
        }
        if (tagName === "code" && name === "className") {
          const classes = Array.isArray(value) ? value : [value]
          if (!classes.every((item) => /^language-[A-Za-z0-9_-]+$/.test(String(item)))) {
            throw new Error("Sanitizer left document-controlled code classes")
          }
        }
      }
      if (tagName === "input" && candidate.properties?.disabled === undefined) {
        throw new Error("Sanitizer left an enabled task-list input")
      }
    }
    for (const child of candidate.children ?? []) visit(child)
  }
  visit(root)
}
