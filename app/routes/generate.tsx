import { ActionFunctionArgs } from "@remix-run/node";
import { getNextMealDate } from "~/services/date";
import { getCacheKey } from "~/services/image";
import { generateImageForMeal } from "~/services/image-generator";
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

  const meals = await getCurrentMeals();
  const firstNonVeganMeal = meals.find((meal) => !meal.vegeratian);
  const meal = firstNonVeganMeal?.originalMealName;
  if (!meal) {
    return new Response("No meals found", { status: 404 });
  }
  // Start the generation job, but don't await it (since we want this endpoint to respond early)
  generateImagesForAllThemes(meal);
  return new Response("OK", { status: 200 });
};

const generateImagesForAllThemes = async (meal: string) => {
  const date = getNextMealDate();

  console.log("Generating images for meal", { meal, themes: Themes });
  Themes.forEach(async (theme) => {
    const key = getCacheKey(date, theme);
    generateImageForMeal(key, meal, theme).catch((error) =>
      console.error(
        "Could not generate image for meal on generate route",
        error
      )
    );
  });
};
