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

const isPastLunch = (time: Date) => {
  const hour = Number(time.toLocaleTimeString("da-DK", { hour: "numeric" }));
  return hour >= 13;
};

const getDailyMenu = (menu: Menu): DailyMenu[] | undefined => {
  let baseTime = new Date();
  if (isPastLunch(baseTime)) {
    baseTime.setUTCHours(baseTime.getHours() + 24);
  }

  const dayOfWeek = baseTime
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
