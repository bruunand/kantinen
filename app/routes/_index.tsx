import type { MetaFunction } from "@remix-run/node";
import { Await, defer, useLoaderData } from "@remix-run/react";
import { Suspense } from "react";
import { getImageBackground } from "~/services/image";
import { getCurrentMeals } from "~/services/meal";

export const meta: MetaFunction = () => {
  return [{ title: "Kantinen - CWO Huset" }];
};

export async function loader() {
  const meals = await getCurrentMeals();
  const firstNonVeganMeal = meals.find((meal) => !meal.vegeratian);
  const backgroundImageJob = getImageBackground(
    firstNonVeganMeal?.originalMealName
  ).catch((err) => {
    console.error("Could not generate image", err);
    return null;
  });

  return defer({ meals, backgroundImageJob });
}

export default function Index() {
  const { meals, backgroundImageJob } = useLoaderData<typeof loader>();

  return (
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
      <Suspense
        fallback={<p className="loading-preview">Generating preview...</p>}
      >
        <Await resolve={backgroundImageJob}>
          {(imageUrl) =>
            typeof imageUrl === "string" ? (
              <img src={imageUrl} className="background" />
            ) : null
          }
        </Await>
      </Suspense>
    </div>
  );
}
