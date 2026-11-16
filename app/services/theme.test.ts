import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAdjacentTheme,
  getRequestedTheme,
  getThemeFromParams,
} from "./theme";

const requestWithTheme = (theme?: string) =>
  new Request(`https://kantinen.test/${theme ? `?theme=${theme}` : ""}`);

describe("getThemeFromParams", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the requested theme when it is available", () => {
    // Arrange
    const request = requestWithTheme("prison");

    // Act
    const theme = getThemeFromParams(request, ["neutral", "prison"]);

    // Assert
    expect(theme).toBe("prison");
  });

  it("never picks an unavailable theme when a different one is requested", () => {
    // Arrange
    const request = requestWithTheme("sweatshop");

    // Act
    const themes = Array.from({ length: 50 }, () =>
      getThemeFromParams(request, ["neutral", "prison"])
    );

    // Assert
    expect(themes.every((theme) => theme === "neutral" || theme === "prison")).toBe(
      true
    );
  });

  it("picks randomly among the available themes when none is requested", () => {
    // Arrange
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const request = requestWithTheme();

    // Act
    const theme = getThemeFromParams(request, ["neutral", "streetfood"]);

    // Assert
    expect(theme).toBe("streetfood");
  });

  it("returns null when no theme is available", () => {
    // Arrange
    const request = requestWithTheme("prison");

    // Act
    const theme = getThemeFromParams(request, []);

    // Assert
    expect(theme).toBeNull();
  });
});

describe("getRequestedTheme", () => {
  it("returns the theme from the search param", () => {
    // Arrange
    const request = requestWithTheme("prison");

    // Act
    const theme = getRequestedTheme(request);

    // Assert
    expect(theme).toBe("prison");
  });

  it("returns null when the param is missing", () => {
    // Arrange
    const request = requestWithTheme();

    // Act
    const theme = getRequestedTheme(request);

    // Assert
    expect(theme).toBeNull();
  });

  it("returns null for an unknown theme", () => {
    // Arrange
    const request = requestWithTheme("nonsense");

    // Act
    const theme = getRequestedTheme(request);

    // Assert
    expect(theme).toBeNull();
  });
});

describe("getAdjacentTheme", () => {
  const themes = ["neutral", "prison", "sweatshop"] as const;

  it("returns the next theme in the list", () => {
    // Arrange
    const available = [...themes];

    // Act
    const theme = getAdjacentTheme(available, "neutral", "next");

    // Assert
    expect(theme).toBe("prison");
  });

  it("returns the previous theme in the list", () => {
    // Arrange
    const available = [...themes];

    // Act
    const theme = getAdjacentTheme(available, "sweatshop", "previous");

    // Assert
    expect(theme).toBe("prison");
  });

  it("does not wrap around at the start", () => {
    // Arrange
    const available = [...themes];

    // Act
    const theme = getAdjacentTheme(available, "neutral", "previous");

    // Assert
    expect(theme).toBeNull();
  });

  it("does not wrap around at the end", () => {
    // Arrange
    const available = [...themes];

    // Act
    const theme = getAdjacentTheme(available, "sweatshop", "next");

    // Assert
    expect(theme).toBeNull();
  });

  it("returns null when there is no current theme", () => {
    // Arrange
    const available = [...themes];

    // Act
    const theme = getAdjacentTheme(available, null, "next");

    // Assert
    expect(theme).toBeNull();
  });

  it("returns null when the current theme is not in the list", () => {
    // Arrange
    const available = ["neutral" as const];

    // Act
    const theme = getAdjacentTheme(available, "prison", "next");

    // Assert
    expect(theme).toBeNull();
  });
});
