export type DocumentLink =
  | { kind: "external"; value: string }
  | { kind: "anchor"; value: string }
  | { kind: "relative"; value: string }
  | { kind: "rejected"; reason: string }

export function classifyDocumentLink(value: unknown): DocumentLink {
  if (typeof value !== "string" || value.length === 0 || value.length > 4096) {
    return { kind: "rejected", reason: "empty, missing, or oversized URL" }
  }
  if (value !== value.trim() || /[\u0000-\u0020\u007f\\]/.test(value)) {
    return {
      kind: "rejected",
      reason: "whitespace, control characters, and backslashes are rejected",
    }
  }
  if (/^#[A-Za-z][A-Za-z0-9_.:-]{0,127}$/.test(value)) {
    return { kind: "anchor", value }
  }
  if (/^https:/i.test(value)) {
    try {
      const url = new URL(value)
      if (
        url.protocol !== "https:" ||
        !url.hostname ||
        url.username ||
        url.password ||
        url.href !== value
      ) {
        return { kind: "rejected", reason: "malformed or credential-bearing HTTPS URL" }
      }
      return { kind: "external", value: url.href }
    } catch {
      return { kind: "rejected", reason: "invalid HTTPS URL" }
    }
  }
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) {
    return { kind: "rejected", reason: "unapproved URL scheme" }
  }
  return classifyRelativeReference(value)
}

export function classifyRelativeReference(value: string): DocumentLink {
  if (
    !value ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes(":") ||
    value.includes("?") ||
    /[\u0000-\u0020\u007f]/.test(value)
  ) {
    return { kind: "rejected", reason: "unsafe local reference" }
  }

  const pieces = value.split("#")
  if (pieces.length > 2) {
    return { kind: "rejected", reason: "multiple local-reference fragments" }
  }
  const path = pieces[0] ?? ""
  const fragment = pieces[1] ?? ""
  if (!path || (fragment && !/^[A-Za-z][A-Za-z0-9_.:-]{0,127}$/.test(fragment))) {
    return { kind: "rejected", reason: "invalid local path or anchor" }
  }

  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(path)
  } catch {
    return { kind: "rejected", reason: "invalid percent encoding" }
  }
  if (
    /[\u0000-\u0020\u007f\\:#?]/.test(decodedPath) ||
    decodedPath.split("/").length !== path.split("/").length
  ) {
    return { kind: "rejected", reason: "encoded path separators or control characters" }
  }

  const segments = path.split("/")
  const decodedSegments = decodedPath.split("/")
  if (
    segments.some(
      (segment, index) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        decodedSegments[index] === "." ||
        decodedSegments[index] === ".." ||
        !/^[A-Za-z0-9._~!$&'()*+,;=@%-]+$/.test(segment),
    )
  ) {
    return { kind: "rejected", reason: "path traversal or unsupported path segment" }
  }
  return { kind: "relative", value }
}
