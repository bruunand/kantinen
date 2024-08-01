export const getNextMealDate = () => {
  let baseTime = new Date();
  if (isPastLunch(baseTime)) {
    baseTime.setUTCHours(baseTime.getHours() + 24);
  }
  return baseTime;
};

const isPastLunch = (time: Date) => {
  const hour = Number(time.toLocaleTimeString("da-DK", { hour: "numeric" }));
  return hour >= 13;
};
