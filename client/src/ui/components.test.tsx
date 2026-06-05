// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { PetitionCard } from "./components.js";

describe("PetitionCard", () => {
  it("shows petition progress and action link", () => {
    const { container } = render(
      <MemoryRouter>
        <PetitionCard
          petition={{
            _id: "p1",
            title: "Bring back the gate",
            url: "https://www.change.org/p/example",
            description: "Ask decision makers to keep Stargate alive.",
            imageUrl: "https://assets.change.org/photos/example.jpg",
            status: "active",
            currentCount: 2500,
            goalCount: 5000,
            latestUpdateTitle: "5,000 signatures reached!",
            latestUpdateBody: "The community is waking up.",
            latestUpdateAt: "2026-06-03T23:51:18.000Z",
            syncStatus: "ok"
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Bring back the gate")).toBeInTheDocument();
    expect(screen.getByText("2,500")).toBeInTheDocument();
    expect(container.querySelector(".petition-card-image img")).toHaveAttribute("src", "https://assets.change.org/photos/example.jpg");
    expect(screen.getByText("5,000 signatures reached!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open petition/i })).toHaveAttribute("href", "https://www.change.org/p/example");
  });
});
