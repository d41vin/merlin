import {
  defaultValueCtx,
  Editor,
  editorViewCtx,
  editorViewOptionsCtx,
  rootCtx,
  serializerCtx,
} from "@milkdown/kit/core"
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener"
import { commonmark } from "@milkdown/kit/preset/commonmark"
import { gfm } from "@milkdown/kit/preset/gfm"

import { requiresSourceFallback } from "./fixtures"

export interface MilkdownProbeResult {
  mode: "milkdown" | "source"
  source: string
  preserved: boolean
  milkdownAttempted: boolean
  serialized?: string
  detail: string
}

export interface ActiveMilkdownEditor {
  editor: Editor
  getMarkdown(): string
  destroy(): Promise<void>
}

export async function createMilkdownEditor(
  host: HTMLElement,
  source: string,
  onMarkdownChange?: (markdown: string) => void,
): Promise<ActiveMilkdownEditor> {
  const editor = Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, host)
      ctx.set(editorViewOptionsCtx, {
        attributes: {
          "aria-label": "Markdown rich editor",
          "aria-multiline": "true",
        },
      })
      ctx.set(defaultValueCtx, source)
      if (onMarkdownChange) {
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
          onMarkdownChange(markdown)
        })
      }
    })
    .use(commonmark)
    .use(gfm)
    .use(listener)

  await editor.create()
  return {
    editor,
    getMarkdown() {
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        return ctx.get(serializerCtx)(view.state.doc)
      })
    },
    async destroy() {
      await editor.destroy()
    },
  }
}

export async function probeMilkdown(source: string): Promise<MilkdownProbeResult> {
  if (requiresSourceFallback(source)) {
    return {
      mode: "source",
      source,
      preserved: true,
      milkdownAttempted: false,
      detail: "Source fallback selected before Milkdown import to preserve unsupported constructs",
    }
  }

  const host = document.createElement("div")
  host.hidden = true
  document.body.append(host)
  let active: ActiveMilkdownEditor | undefined
  try {
    active = await createMilkdownEditor(host, source)
    const serialized = active.getMarkdown()
    const exact = serialized === source
    return {
      mode: exact ? "milkdown" : "source",
      source,
      preserved: true,
      milkdownAttempted: true,
      serialized,
      detail: exact
        ? "Milkdown parse/serialize returned the exact source"
        : "Milkdown serialization differed; source fallback retained the original and rejected the lossy output",
    }
  } catch (error) {
    return {
      mode: "source",
      source,
      preserved: true,
      milkdownAttempted: true,
      detail: `Milkdown proof failed closed to source mode: ${
        error instanceof Error ? error.message : "unknown editor error"
      }`,
    }
  } finally {
    if (active) await active.destroy()
    host.remove()
  }
}
