import { describe, expect, it } from "vitest";
import { slugify } from "./slug.js";

describe("slugify", () => {
  it("creates stable URL slugs", () => {
    expect(slugify("Save the Gate: Amazon, Listen!")).toBe("save-the-gate-amazon-listen");
  });
});

