export const getNameForMeal = (meal: string) => {
  return `${getEmoji(meal)} ${soupParser(meal)}`;
};

const getEmoji = (meal: string) => {
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

  const normalizedMeal = meal.toLowerCase();
  for (const [meals, emoji] of mealToEmojiMap) {
    if (meals.some((meal) => normalizedMeal.includes(meal))) {
      return emoji;
    }
  }

  return "🍽";
};

const soupParser = (meal: string) => {
  if (meal.toLocaleLowerCase().includes("suppe")) {
    return meal.replace("suppe", "vand");
  }
  return meal;
};
