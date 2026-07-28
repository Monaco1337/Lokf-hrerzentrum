/**
 * Login segment loading override.
 *
 * The parent /crm/loading.tsx renders the full app skeleton (stat cards, list),
 * which would briefly flash on the bare login screen. Overriding it here with a
 * no-op keeps the login route clean — it renders its own form with no chrome.
 */
export default function LoginLoading() {
  return null;
}
