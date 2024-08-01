import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Await, defer, Link, useLoaderData } from "@remix-run/react";
import { Suspense } from "react";
import { getImageBackground } from "~/services/image";
import { getCurrentMeals } from "~/services/meal";
import { getThemeFromParams } from "~/services/theme";

export const meta: MetaFunction = () => {
  return [{ title: "Kantinen - CWO Huset" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const theme = getThemeFromParams(request);
  const meals = await getCurrentMeals();
  const firstNonVeganMeal = meals.find((meal) => !meal.vegeratian);
  const { imageUrl, imageUrlJob } = await getImageBackground(
    firstNonVeganMeal?.originalMealName,
    theme
  );

  return defer({
    theme,
    meals,
    backgroundImageUrl: imageUrl, // If we already have a cached image, use it immediately
    backgroundImageJob: imageUrlJob, // If we need to generate, return a promise and await in client
  });
}

export default function Index() {
  const { theme, meals, backgroundImageUrl, backgroundImageJob } =
    useLoaderData<typeof loader>();

  return (
    <main>
      <nav>
        <span>Theme</span>
        <Link to="/" className={theme === "neutral" ? "active" : ""}>
          ✨ Neutral
        </Link>
        <Link
          to="/?theme=prison"
          className={theme === "prison" ? "active" : ""}
        >
          🧟 Prison
        </Link>
      </nav>
      <div className="centerWrapper">
        {meals.map((meal, index) => (
          <p
            key={index}
            className={
              "meal " + (meal.vegeratian ? "vegetarianCourse" : "mainCourse")
            }
          >
            {meal.text}
          </p>
        ))}
        {backgroundImageUrl ? (
          <img src={backgroundImageUrl} className="background" />
        ) : backgroundImageJob ? (
          <Suspense
            fallback={<p className="loading-preview">Generating preview...</p>}
          >
            <Await resolve={backgroundImageJob}>
              {(imageUrl) =>
                typeof imageUrl === "string" ? (
                  <img src={imageUrl} className="background lazy" />
                ) : null
              }
            </Await>
          </Suspense>
        ) : null}
      </div>
    </main>
  );
}
