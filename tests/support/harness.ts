export const PROOF_HARNESS_PATH = "/tests/harness/proofs.html"

export function proofHarnessUrl(currentUrl: string): string {
  return new URL(PROOF_HARNESS_PATH, currentUrl).href
}
