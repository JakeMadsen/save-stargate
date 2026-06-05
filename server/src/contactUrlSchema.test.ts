import { describe, expect, it } from "vitest";
import { contactUrlSchema } from "../../shared/src/index.js";

describe("contactUrlSchema", () => {
  it("accepts https and mailto contact links", () => {
    expect(contactUrlSchema.safeParse("https://www.linkedin.com/company/example").success).toBe(true);
    expect(contactUrlSchema.safeParse("mailto:name@example.com").success).toBe(true);
  });

  it("rejects unsupported or malformed contact links", () => {
    expect(contactUrlSchema.safeParse("ftp://example.com/file").success).toBe(false);
    expect(contactUrlSchema.safeParse("mailto:not-an-email").success).toBe(false);
  });
});
