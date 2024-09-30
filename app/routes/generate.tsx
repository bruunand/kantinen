import { ActionFunctionArgs } from "@remix-run/node";
import { getNextMealDate } from "~/services/date";
import { getCacheKey } from "~/services/image";
import { generateImageForMeal } from "~/services/image-generator";
import { getImageUrlForKey } from "~/services/image-uploader";
import { getCurrentMeals } from "~/services/meal";
import { Themes } from "~/services/theme";
import { getRequiredEnv } from "~/services/variables";

export const action = async ({ request }: ActionFunctionArgs) => {
  /*const authToken = request.headers.get("Authorization");
  if (!authToken) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (authToken !== getRequiredEnv("GENERATE_ENDPOINT_TOKEN")) {
    return new Response("Unauthorized", { status: 403 });
  }*/

  const meals = await getCurrentMeals();
  const firstNonVeganMeal = meals.find((meal) => !meal.vegeratian);
  const meal = firstNonVeganMeal?.originalMealName;
  if (!meal) {
    return new Response("No meals found", { status: 404 });
  }

  const searchParams = new URL(request.url).searchParams;
  const replaceExistingImages =
    searchParams.get("force")?.toLowerCase() === "true";

  await generateImagesForAllThemes(meal, replaceExistingImages);

  return new Response("OK", { status: 200 });
};

const generateImagesForAllThemes = async (
  meal: string,
  replaceExisting: boolean
) => {
  const date = getNextMealDate();

  console.log("Generating images for meal", { meal, themes: Themes });

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
  
  await Promise.all(promises);
};
