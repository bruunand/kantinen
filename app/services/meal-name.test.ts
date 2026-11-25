import { describe, expect, it } from "vitest";
import { getEmoji, getMatchingEmojis } from "./meal-name";

describe("getEmoji", () => {
  it("uses the highest priority match when several keywords match", () => {
    // Arrange: a dish with both a burger and chicken keyword
    const meal = "Kyllingeburger";

    // Act: look up the menu emoji
    const emoji = getEmoji(meal);

    // Assert: burger comes before chicken in the priority order
    expect(emoji).toBe("🍔");
  });

  it("falls back to a plate when no keyword matches", () => {
    // Arrange: a dish without any known keyword
    const meal = "Dagens ret";

    // Act: look up the menu emoji
    const emoji = getEmoji(meal);

    // Assert: the generic plate is shown
    expect(emoji).toBe("🍽");
  });
});

describe("getMatchingEmojis", () => {
  it("returns every match in priority order", () => {
    // Arrange: a dish with a burger and chicken keyword
    const meal = "Kyllingeburger";

    // Act: look up all matching emojis
    const emojis = getMatchingEmojis(meal);

    // Assert: the chicken is kept behind the burger
    expect(emojis).toEqual(["🍔", "🐔"]);
  });

  it("matches keywords regardless of case", () => {
    // Arrange: a shouted dish name
    const meal = "KALKUNBRYST";

    // Act: look up all matching emojis
    const emojis = getMatchingEmojis(meal);

    // Assert: the turkey is still found
    expect(emojis).toEqual(["🦃"]);
  });

  it("returns nothing when no keyword matches", () => {
    // Arrange: a dish without any known keyword
    const meal = "Dagens ret";

    // Act: look up all matching emojis
    const emojis = getMatchingEmojis(meal);

    // Assert: no matches
    expect(emojis).toEqual([]);
  });
});
