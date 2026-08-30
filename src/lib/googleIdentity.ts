const NONCE_KEY = "google_oauth_nonce";

const generateNonce = async (): Promise<[string, string]> => {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return [nonce, hashedNonce];
};

export const googleRedirectUri = (origin: string) =>
  `${origin.replace(/\/$/, "")}/auth`;

export const consumeGoogleNonce = () => {
  const nonce = sessionStorage.getItem(NONCE_KEY);
  sessionStorage.removeItem(NONCE_KEY);
  return nonce;
};

/** Open Google's account picker in-app. Never redirects through supabase.co. */
export const startGoogleIdTokenSignIn = async () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!clientId) {
    throw new Error("Google Client ID is missing. Add VITE_GOOGLE_CLIENT_ID to .env.");
  }

  const [nonce, hashedNonce] = await generateNonce();
  sessionStorage.setItem(NONCE_KEY, nonce);

  const redirectUri = googleRedirectUri(window.location.origin);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "id_token",
    scope: "openid email profile",
    nonce: hashedNonce,
    prompt: "select_account",
  });

  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

export const parseGoogleIdTokenFromHash = (hash = window.location.hash) => {
  if (!hash) return null;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get("id_token");
};

