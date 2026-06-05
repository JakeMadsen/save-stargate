import { describe, expect, it } from "vitest";
import { canManageRole, hasRole } from "./permissions.js";

describe("permissions", () => {
  it("checks role hierarchy", () => {
    expect(hasRole("admin", "moderator")).toBe(true);
    expect(hasRole("user", "moderator")).toBe(false);
  });

  it("prevents non-owners from managing owners", () => {
    expect(canManageRole("admin", "owner")).toBe(false);
    expect(canManageRole("owner", "admin")).toBe(true);
  });
});

