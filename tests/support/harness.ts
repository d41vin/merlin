export const PROOF_HARNESS_PATH = "/tests/harness/proofs.html"
export const CONTROLS_HARNESS_PATH = "/tests/harness/controls.html"

export function proofHarnessUrl(currentUrl: string): string {
  return new URL(PROOF_HARNESS_PATH, currentUrl).href
}

export function controlsHarnessUrl(currentUrl: string): string {
  return new URL(CONTROLS_HARNESS_PATH, currentUrl).href
}
