export const SETTINGS_LOAD_FAILURE_MESSAGE =
  "Settings could not be loaded. Safe defaults are applied."

export function StatusMessage() {
  return (
    <p
      className="merlin-status merlin-shell-status"
      data-kind="warning"
      role="status"
      aria-live="polite"
    >
      {SETTINGS_LOAD_FAILURE_MESSAGE}
    </p>
  )
}
