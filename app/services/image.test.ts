import { afterEach, describe, expect, it, vi } from "vitest";
import { getAvailableImages, getCacheKey } from "./image";
import { getImageUrlForKey } from "./image-uploader";

// The uploader configures Cloudinary from env vars at import time
vi.mock("./image-uploader", () => ({ getImageUrlForKey: vi.fn() }));

describe("getCacheKey", () => {
  it("combines version, theme and ISO date without a timestamp", () => {
    // Arrange
    const date = new Date("2024-07-31T13:45:00Z");

    // Act
    const key = getCacheKey(date, "prison");

    // Assert
    expect(key).toBe("v3.3-corax-prison-2024-07-31");
  });

  it("gives different themes different keys on the same date", () => {
    // Arrange
    const date = new Date("2024-07-31T00:00:00Z");

    // Act
    const neutralKey = getCacheKey(date, "neutral");
    const sweatshopKey = getCacheKey(date, "sweatshop");

    // Assert
    expect(neutralKey).not.toBe(sweatshopKey);
  });
});

describe("getAvailableImages", () => {
  const date = new Date("2024-07-31T00:00:00Z");

  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(getImageUrlForKey).mockReset();
  });

  it("returns only the themes that have an image", async () => {
    // Arrange
    vi.mocked(getImageUrlForKey).mockImplementation(async (key) =>
      key.includes("-prison-") ? "https://cdn/prison.png" : null
    );

    // Act
    const images = await getAvailableImages(date);

    // Assert
    expect(images).toEqual([
      { theme: "prison", url: "https://cdn/prison.png" },
    ]);
  });

  it("returns an empty list when no theme has an image", async () => {
    // Arrange
    vi.mocked(getImageUrlForKey).mockResolvedValue(null);

    // Act
    const images = await getAvailableImages(date);

    // Assert
    expect(images).toEqual([]);
  });

  it("treats a failed lookup as unavailable without hiding other themes", async () => {
    // Arrange
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getImageUrlForKey).mockImplementation(async (key) => {
      if (key.includes("-neutral-")) {
        throw new Error("search failed");
      }
      return key.includes("-sweatshop-") ? "https://cdn/sweatshop.png" : null;
    });

    // Act
    const images = await getAvailableImages(date);

    // Assert
    expect(images).toEqual([
      { theme: "sweatshop", url: "https://cdn/sweatshop.png" },
    ]);
  });
});
