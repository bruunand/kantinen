import { getNextMealDate } from "./date";
import { getNameForMeal } from "./meal-name";

export const getCurrentMeals = async (): Promise<Meal[]> => {
  const todaysMenu = await getTodaysMenu();
  if (!todaysMenu) {
    return [{ text: "¯\\_(ツ)_/¯", vegeratian: false }];
  }

  return todaysMenu.map<Meal>((menu) => {
    return {
      originalMealName: menu.menu,
      text: getNameForMeal(menu.menu),
      vegeratian: menu.type === VEGETARIAN_MENU,
    };
  });
};

const getTodaysMenu = async (): Promise<DailyMenu[] | undefined> => {
  const mealTime = getNextMealDate();
  const mealTimeDateString = mealTime.toISOString().split("T")[0];
  const apiRequestParams = new URLSearchParams({
    restaurantId: "1042",
    languageCode: "da-DK",
    date: mealTimeDateString,
  });
  const response = await fetch(
    `https://www.shop.foodandco.dk/api/WeeklyMenu?${apiRequestParams}`
  );
  const menu = (await response.json()) as Menu;

  const dayOfWeek = mealTime
    .toLocaleDateString("da-DK", { weekday: "long" })
    .toLowerCase();

  const menuForToday = menu?.days.find(
    (day) => day.dayOfWeek.toLowerCase() === dayOfWeek
  )?.menus;

  if (menuForToday?.[0]?.menu?.includes("Menuen er ikke klar endnu")) {
    return undefined;
  }

  return menuForToday;
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
