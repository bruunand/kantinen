import type { MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

const VEGETARIAN_MENU = "Dagens varme vegatar";

interface Meal {
  text: string;
  vegeratian?: boolean;
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

export const meta: MetaFunction = () => {
  return [
    { title: "Kantinen - CWO Huset" },
  ];
};

const isPastLunch = (time: Date) => {
  if (time.getUTCHours() >= 12) {
    return true;
  }

  return time.getUTCHours() == 11 && time.getUTCMinutes() >= 30;
};

const getDailyMenu = (menu: Menu): DailyMenu[] | undefined => {
  let baseTime = new Date();
  if (isPastLunch(baseTime)) {
    baseTime.setUTCHours(baseTime.getHours() + 24);
  }

  const dayOfWeek = baseTime.toLocaleDateString('da-DK', { weekday: 'long' }).toLowerCase();
  return menu?.days.find((day) => day.dayOfWeek.toLowerCase() === dayOfWeek)?.menus;
};

const getEmoji = (meal: string) => {
  const mealToEmojiMap = new Map([
    [["vegetar", "vegan"], "🥦"],
    [["chili"], "🌶"],
    [["burger", "bøfsandwich"], "🍔"],
    [["hotdog"], "🌭"],
    [["pizza"], "🍕"],
    [["kalkun"], "🦃"],
    [["kylling", "høns", "cordon bleu"], "🐔"],
    [["fisk", "torsk"], "🐟"],
    [["bøf", "okse", "kalv"], "🐮"],
    [["gris", "svin", "medister", "flæsk", "skinke", "hamburgerryg", "pork"], "🐷"],
    [["pasta", "lasagne"], "🍝"],
    [["ris"], "🍚"],
    [["kartofler"], "🥔"],
    [["æg"], "🥚"],
    [["suppe"], "🥣"],
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
  if (meal.toLocaleLowerCase().includes('suppe')) {
    return meal.replace('suppe', 'vand');
  }
  return meal;
}

export async function loader(): Promise<Meal[]> {
  const response = await fetch(
    'https://www.shop.foodandco.dk/api/WeeklyMenu?restaurantId=1042&languageCode=da-DK'
  );

  const dailyMenu = getDailyMenu(await response.json());
  if (!dailyMenu) {
    return [{ text: "¯\\_(ツ)_/¯", vegeratian: false }];
  }

  return dailyMenu.map((menu) => {
    return {
      text: `${getEmoji(menu.menu)} ${soupParser(menu.menu)}`,
      vegeratian: menu.type === VEGETARIAN_MENU,
    };
  });
}

export default function Index() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="centerWrapper">
      {data.map((meal, index) => (
        <p key={index} className={meal.vegeratian ? 'vegetarianCourse' : 'mainCourse'}>
          {meal.text}
        </p>
      ))}
    </div>
  );
}
