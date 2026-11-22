import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import { useMemo, type ComponentPropsWithoutRef, type ReactNode } from "react"
import { Fragment, jsx, jsxs } from "react/jsx-runtime"

import { classifyMarkdown } from "./fixtures"
import { sanitizeMarkdown } from "./sanitize"
import { classifyDocumentLink } from "./url-policy"

function SafeLink({ children, ...props }: ComponentPropsWithoutRef<"a">) {
  const link = classifyDocumentLink(props.href)
  if (link.kind === "rejected") {
    return <span data-url-policy="rejected">{children}</span>
  }
  return (
    <a
      href={link.value}
      title={props.title}
      data-url-kind={link.kind}
      onClick={(event) => {
        event.preventDefault()
        if (link.kind === "external") {
          document.dispatchEvent(new CustomEvent("merlin:external-link", { detail: link.value }))
        }
      }}
    >
      {children}
    </a>
  )
}

function SafeImage(props: ComponentPropsWithoutRef<"img">) {
  const reference = classifyDocumentLink(props.src)
  if (reference.kind === "relative") {
    return (
      <span
        role="img"
        aria-label={props.alt ?? "Local document image"}
        data-local-image={reference.value}
      >
        Local image: {props.alt ?? reference.value}
      </span>
    )
  }
  return (
    <span role="img" aria-label={props.alt ?? "Blocked document image"} data-image-policy="blocked">
      Image not loaded: {props.alt ?? "unsafe or remote reference"}
    </span>
  )
}

function SafeTaskInput(props: ComponentPropsWithoutRef<"input">) {
  return <input {...props} type="checkbox" disabled readOnly aria-label="Task completion status" />
}

function SafeCode({ children, ...props }: ComponentPropsWithoutRef<"code">) {
  const className = Array.isArray(props.className)
    ? props.className.length > 0
      ? props.className.join(" ")
      : undefined
    : props.className || undefined
  const mermaid = className?.split(/\s+/).includes("language-mermaid") ?? false
  return (
    <code className={className} data-mermaid={mermaid ? "inert" : undefined}>
      {children}
    </code>
  )
}

export interface DocumentRendererProps {
  source: string
  className?: string
}

export function DocumentRenderer({ source, className = "merlin-document" }: DocumentRendererProps) {
  return useMemo(() => {
    if (classifyMarkdown(source).includes("mdx")) {
      return (
        <pre className={className} data-mdx-mode="inert-source">
          {source}
        </pre>
      )
    }
    const tree = sanitizeMarkdown(source)
    const rendered = toJsxRuntime(tree, {
      Fragment,
      jsx,
      jsxs,
      components: {
        a: SafeLink,
        img: SafeImage,
        input: SafeTaskInput,
        code: SafeCode,
      },
    }) as ReactNode
    return (
      <div className={className} data-render-boundary="untrusted-document">
        {rendered}
      </div>
    )
  }, [source, className])
}
