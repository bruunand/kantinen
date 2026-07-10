import { cached } from "./cache";
import { getWeekdayDates, toDateString } from "./date";
import { getNameForMeal } from "./meal-name";

const MENU_CACHE_TTL_MS = 15 * 60 * 1000;

export const getCurrentMeals = async (mealTime: Date): Promise<Meal[]> => {
  const todaysMenu = await getTodaysMenu(mealTime);
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

const getTodaysMenu = async (
  mealTime: Date
): Promise<DailyMenu[] | undefined> => {
  const mealTimeDateString = toDateString(mealTime);
  // The API returns the full week for any date within it, so cache by the
  // week's Monday to share one fetch across all days
  const weekKey = toDateString(getWeekdayDates(mealTime)[0]);
  const menu = await cached(`menu-${weekKey}`, MENU_CACHE_TTL_MS, async () => {
    const apiRequestParams = new URLSearchParams({
      restaurantId: "1042",
      languageCode: "da-DK",
      date: mealTimeDateString,
    });
    const response = await fetch(
      `https://www.shop.foodandco.dk/api/WeeklyMenu?${apiRequestParams}`
    );
    return (await response.json()) as Menu;
  });

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
