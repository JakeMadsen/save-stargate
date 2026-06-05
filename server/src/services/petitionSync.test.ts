import { describe, expect, it } from "vitest";
import { parsePetitionStats } from "./petitionSync.js";

describe("parsePetitionStats", () => {
  it("extracts Change.org-style signature and goal counts", () => {
    const html = `<script id="__NEXT_DATA__">{"signatureCount":"12,345","goal":"15,000"}</script>`;
    expect(parsePetitionStats(html)).toEqual({ count: 12345, goal: 15000 });
  });

  it("falls back to visible supporter text", () => {
    expect(parsePetitionStats("<main>9,876 supporters</main>").count).toBe(9876);
  });

  it("extracts verified signatures from localized Change.org text", () => {
    const html = `<main><h2>15 976</h2><p>Signatures vérifiées</p></main>`;
    expect(parsePetitionStats(html).count).toBe(15976);
  });

  it("prefers the verified signatures block over unrelated body numbers", () => {
    const html = `<main><p>over 100,000 followers</p><h2>121,393</h2><p>Verified signatures</p></main>`;
    expect(parsePetitionStats(html).count).toBe(121393);
  });

  it("extracts petition image and latest starter update metadata", () => {
    const html = `
      <meta property="og:image" content="https://assets.change.org/photos/example.jpg">
      <script>
        window.__PETITION__ = {
          "starterPetitionUpdatesConnection":{"nodes":[{
            "createdAt":"2026-06-03T23:51:18.000Z",
            "title":"5,000 signatures reached!",
            "description":"\\u003Cp\\u003EThe community is waking up.\\u003C\\u002Fp\\u003E"
          }]}
        }
      </script>
    `;
    expect(parsePetitionStats(html)).toMatchObject({
      imageUrl: "https://assets.change.org/photos/example.jpg",
      latestUpdateTitle: "5,000 signatures reached!",
      latestUpdateBody: "The community is waking up."
    });
    expect(parsePetitionStats(html).latestUpdateAt?.toISOString()).toBe("2026-06-03T23:51:18.000Z");
  });
});
