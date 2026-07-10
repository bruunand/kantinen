import { ActionFunctionArgs } from "@remix-run/node";
import { getNextMealDate, getWeekdayDates } from "~/services/date";
import { getCacheKey } from "~/services/image";
import { generateImageForMeal } from "~/services/image-generator";
import { getImageUrlForKey } from "~/services/image-uploader";
import { getCurrentMeals } from "~/services/meal";
import { Themes } from "~/services/theme";
import { getRequiredEnv } from "~/services/variables";

export const action = async ({ request }: ActionFunctionArgs) => {
  const authToken = request.headers.get("Authorization");
  if (!authToken) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (authToken !== getRequiredEnv("GENERATE_ENDPOINT_TOKEN")) {
    return new Response("Unauthorized", { status: 403 });
  }

  const searchParams = new URL(request.url).searchParams;
  const replaceExistingImages =
    searchParams.get("force")?.toLowerCase() === "true";

  const weekDates = getWeekdayDates(getNextMealDate());
  const mealsByDate = await Promise.all(
    weekDates.map(async (date) => {
      const meals = await getCurrentMeals(date).catch((error) => {
        console.error("Could not fetch meals for date", { date, error });
        return [];
      });
      const meal = meals.find((meal) => !meal.vegeratian)?.originalMealName;
      return { date, meal };
    })
  );

  const daysWithMeals = mealsByDate.filter(
    (day): day is { date: Date; meal: string } => Boolean(day.meal)
  );
  if (daysWithMeals.length === 0) {
    return new Response("No meals found", { status: 404 });
  }

  await Promise.allSettled(
    daysWithMeals.map(({ date, meal }) =>
      generateImagesForAllThemes(meal, date, replaceExistingImages)
    )
  );

  return new Response("OK", { status: 200 });
};

const generateImagesForAllThemes = async (
  meal: string,
  date: Date,
  replaceExisting: boolean
) => {
  console.log("Generating images for meal", { meal, date, themes: Themes });

  const promises = Themes.map(async (theme) => {
    const key = getCacheKey(date, theme.id);

    const imageFound = replaceExisting ? false : await getImageUrlForKey(key);
    if (imageFound) {
      console.log("Image already exists, skipping", { key });

      return;
    }

    return generateImageForMeal(key, meal, theme.id).catch((error) =>
      console.error(
        "Could not generate image for meal on generate route",
        error
      )
    );
  });

  await Promise.allSettled(promises);
};
