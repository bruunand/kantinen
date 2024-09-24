import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { defer, Form, useLoaderData, useSubmit } from "@remix-run/react";
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
  const [meals, backgroundImageUrl] = await Promise.all([
    getCurrentMeals(),
    getImageBackground(theme),
  ]);

  return defer({ theme, meals, date, backgroundImageUrl });
}

export default function Index() {
  const { theme, meals, date, backgroundImageUrl } =
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
        <img src={backgroundImageUrl} className="background" />
      </div>
    </main>
  );
}
