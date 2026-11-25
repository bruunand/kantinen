export const getNameForMeal = (meal: string) => {
  return `${getEmoji(meal)} ${soupParser(meal)}`;
};

/** The emoji for the first keyword the meal matches, or a plate when none do. */
export const getEmoji = (meal: string) => getMatchingEmojis(meal)[0] ?? "🍽";

/**
 * Every emoji the meal has a keyword for, in priority order. Shows what a dish
 * contains even when an earlier emoji wins, like the chicken in a chicken burger.
 */
export const getMatchingEmojis = (meal: string): string[] => {
  const normalizedMeal = meal.toLowerCase();
  const matches = [...mealToEmojiMap].filter(([keywords]) =>
    keywords.some((keyword) => normalizedMeal.includes(keyword))
  );

  return matches.map(([, emoji]) => emoji);
};

// Order matters: the first match is the emoji shown on the menu
const mealToEmojiMap = new Map([
  [["hare"], "🐇"],
  [["vegetar", "vegan", "dahl"], "🥦"],
  [["chili"], "🌶"],
  [["burger", "bøfsandwich"], "🍔"],
  [["hotdog"], "🌭"],
  [["pizza"], "🍕"],
  [["kalkun"], "🦃"],
  [["diablo", "djævle"], "😈"],
  [["kylling", "høns", "cordon bleu", "chicken"], "🐔"],
  [["fisk", "torsk", "laks"], "🐟"],
  [["bøf", "okse", "kalv"], "🐮"],
  [
    [
      "gris",
      "svin",
      "medister",
      "flæsk",
      "skinke",
      "hamburgerryg",
      "pork",
      "boller i karry",
      "frikadelle",
    ],
    "🐷",
  ],
  [["pasta", "lasagne"], "🍝"],
  [["ris"], "🍚"],
  [["jul"], "🎅"],
  [["påske"], "🐰"],
  [["halloween"], "🎃"],
  [["høst"], "👨‍🌾"],
  [["kartofler"], "🥔"],
  [["æg"], "🥚"],
  [["suppe"], "🥣"],
  [["skildpadde"], "🐢"],
]);

const soupParser = (meal: string) => {
  if (meal.toLocaleLowerCase().includes("suppe")) {
    return meal.replace("suppe", "vand");
  }
  return meal;
};
