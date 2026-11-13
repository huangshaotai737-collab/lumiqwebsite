export const accountRevisionKey = "lumiq-account-revision";
export function notifyAccountChange(clearCheckout = false) {
  window.dispatchEvent(new Event(accountRevisionKey));
  try {
    if (clearCheckout)
      for (const key of Object.keys(sessionStorage))
        if (key.startsWith("lumiq-checkout-v1:"))
          sessionStorage.removeItem(key);
    localStorage.setItem(accountRevisionKey, crypto.randomUUID());
  } catch {
    /* Identity is always checked by the server, even without browser storage. */
  }
}
