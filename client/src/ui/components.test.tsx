// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { PetitionCard } from "./components.js";

describe("PetitionCard", () => {
  it("shows petition progress and action link", () => {
    render(
      <MemoryRouter>
        <PetitionCard
          petition={{
            _id: "p1",
            title: "Bring back the gate",
            url: "https://www.change.org/p/example",
            description: "Ask decision makers to keep Stargate alive.",
            status: "active",
            currentCount: 2500,
            goalCount: 5000,
            syncStatus: "ok"
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Bring back the gate")).toBeInTheDocument();
    expect(screen.getByText("2,500")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open petition/i })).toHaveAttribute("href", "https://www.change.org/p/example");
  });
});
