import { describe, expect, it } from "vitest";
import { googleRedirectUri, parseGoogleIdTokenFromHash } from "@/lib/googleIdentity";

describe("googleIdentity", () => {
  it("always returns to /auth on the current origin", () => {
    expect(googleRedirectUri("https://phia-circle.vercel.app")).toBe(
      "https://phia-circle.vercel.app/auth"
    );
    expect(googleRedirectUri("https://phia-circle.vercel.app/")).toBe(
      "https://phia-circle.vercel.app/auth"
    );
    expect(googleRedirectUri("http://localhost:8080")).toBe("http://localhost:8080/auth");
  });

  it("reads the id_token from the Google hash fragment", () => {
    expect(parseGoogleIdTokenFromHash("#id_token=abc&token_type=Bearer")).toBe("abc");
    expect(parseGoogleIdTokenFromHash("")).toBeNull();
  });
});
