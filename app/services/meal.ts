import { cached } from "./cache";
import { getWeekdayDates, toDateString } from "./date";
import { getNameForMeal } from "./meal-name";
import { getRequiredEnv } from "./variables";

const MENU_CACHE_TTL_MS = 15 * 60 * 1000;
// Firebase ID tokens expire after 1 hour
const TOKEN_CACHE_TTL_MS = 50 * 60 * 1000;
// Public Firebase web key, taken from Kanpla's web app bundle
const KANPLA_FIREBASE_KEY = "AIzaSyDDtuovWpK6PARKIt9wUqaTQP7MjFWIWF4";

export const getCurrentMeals = async (mealTime: Date): Promise<Meal[]> => {
  const todaysMenu = await getTodaysMenu(mealTime);
  if (!todaysMenu?.length) {
    return [{ text: "¯\\_(ツ)_/¯", vegeratian: false }];
  }

  return todaysMenu.map<Meal>((product) => {
    return {
      originalMealName: product.name,
      text: getNameForMeal(product.name),
      vegeratian: false,
    };
  });
};

const getTodaysMenu = async (
  mealTime: Date
): Promise<Product[] | undefined> => {
  // The API returns the full week for any date within it, so cache by the
  // week's Monday to share one fetch across all days
  const weekKey = toDateString(getWeekdayDates(mealTime)[0]);
  const menu = await cached(`menu-${weekKey}`, MENU_CACHE_TTL_MS, async () => {
    const response = await fetch(
      "https://foodandco.kanpla.dk/api/internal/v2/menu/products/loadByWeek",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${await getKanplaToken()}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          childId: "xsYGn8jNBZSyVJxB6qy0",
          schoolId: "XRxd9FC117vREtGzOUI0",
          moduleId: "J0GT1F1EVCiNPABjzKYL",
          weekDate: weekKey,
        }),
      }
    );
    if (!response.ok) {
      throw new Error(`Could not fetch menu: ${response.status}`);
    }
    return (await response.json()) as Menu;
  });

  return menu.productsByDate[toDateString(mealTime)]?.products;
};

const getKanplaToken = () =>
  cached("kanpla-token", TOKEN_CACHE_TTL_MS, async () => {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KANPLA_FIREBASE_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: getRequiredEnv("KANPLA_EMAIL"),
          password: getRequiredEnv("KANPLA_PASSWORD"),
          returnSecureToken: true,
        }),
      }
    );
    if (!response.ok) {
      throw new Error(`Could not log in to Kanpla: ${response.status}`);
    }
    return ((await response.json()) as { idToken: string }).idToken;
  });

interface Meal {
  text: string;
  vegeratian?: boolean;
  originalMealName?: string;
}

interface Product {
  name: string;
  description?: string;
  category: string;
}

interface Menu {
  productsByDate: Record<string, { products: Product[] }>;
}
