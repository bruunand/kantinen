import { describe, expect, it } from "vitest";
import { shuffleWithSeed } from "./random";

describe("shuffleWithSeed", () => {
  const items = ["a", "b", "c", "d", "e", "f"];

  it("keeps every item exactly once", () => {
    // Arrange: a fixed seed

    // Act: shuffle the items
    const shuffled = shuffleWithSeed(items, "seed");

    // Assert: same items, possibly in another order
    expect([...shuffled].sort()).toEqual(items);
  });

  it("gives the same order for the same seed", () => {
    // Arrange: two independent shuffles share a seed

    // Act: shuffle twice
    const first = shuffleWithSeed(items, "2026-11-23");
    const second = shuffleWithSeed(items, "2026-11-23");

    // Assert: both runs agree
    expect(second).toEqual(first);
  });

  it("gives different orders for different seeds", () => {
    // Arrange: a handful of seeds

    // Act: shuffle once per seed
    const orders = ["w1", "w2", "w3", "w4", "w5"].map((seed) =>
      shuffleWithSeed(items, seed).join("")
    );

    // Assert: the seed actually changes the order
    expect(new Set(orders).size).toBeGreaterThan(1);
  });

  it("does not modify the input", () => {
    // Arrange: a copy to compare against
    const original = [...items];

    // Act: shuffle the items
    shuffleWithSeed(items, "seed");

    // Assert: the input is untouched
    expect(items).toEqual(original);
  });
});
