import { getNextMealDate } from "./date";
import { getNameForMeal } from "./meal-name";

export const getCurrentMeals = async (): Promise<Meal[]> => {
  const response = await fetch(
    "https://www.shop.foodandco.dk/api/WeeklyMenu?restaurantId=1042&languageCode=da-DK"
  );

  const dailyMenu = getDailyMenu(await response.json());
  if (!dailyMenu) {
    return [{ text: "¯\\_(ツ)_/¯", vegeratian: false }];
  }

  return dailyMenu.map<Meal>((menu) => {
    return {
      originalMealName: menu.menu,
      text: getNameForMeal(menu.menu),
      vegeratian: menu.type === VEGETARIAN_MENU,
    };
  });
};

const getDailyMenu = (menu: Menu): DailyMenu[] | undefined => {
  const mealTime = getNextMealDate();

  const dayOfWeek = mealTime
    .toLocaleDateString("da-DK", { weekday: "long" })
    .toLowerCase();
  return menu?.days.find((day) => day.dayOfWeek.toLowerCase() === dayOfWeek)
    ?.menus;
};

const VEGETARIAN_MENU = "Dagens varme vegatar";

interface Meal {
  text: string;
  vegeratian?: boolean;
  originalMealName?: string;
}

interface DailyMenu {
  type: string;
  menu: string;
}

interface Day {
  dayOfWeek: string;
  menus: DailyMenu[];
}

interface Menu {
  type: string;
  menu: string;
  days: Day[];
}
