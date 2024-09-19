import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Await, defer, Form, useLoaderData, useSubmit } from "@remix-run/react";
import { Suspense } from "react";
import { getNextMealDate } from "~/services/date";
import { getImageBackground } from "~/services/image";
import { getCurrentMeals } from "~/services/meal";
import { getThemeFromParams, Themes } from "~/services/theme";

export const meta: MetaFunction = () => {
  return [{ title: "Kantinen - CWO Huset" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const date = getNextMealDate();
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
    date,
    backgroundImageUrl: imageUrl, // If we already have a cached image, use it immediately
    backgroundImageJob: imageUrlJob, // If we need to generate, return a promise and await in client
  });
}

export default function Index() {
  const { theme, meals, date, backgroundImageUrl, backgroundImageJob } =
    useLoaderData<typeof loader>();
  const submit = useSubmit();
  return (
    <main>
      <nav>
        <Form onChange={(event) => submit(event.currentTarget)}>
          <select name="theme" defaultValue={theme}>
            {Themes.map(({ id, displayName }) => (
              <option key={id} value={id}>
                {displayName}
              </option>
            ))}
          </select>
        </Form>
      </nav>
      <div className="centerWrapper">
        <p className="meal-date">
          {new Date(date).toLocaleDateString("da-DK", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <hr />
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
