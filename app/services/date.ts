export const getNextMealDate = () => {
  let baseTime = new Date();
  if (isPastLunch(baseTime)) {
    baseTime.setUTCHours(baseTime.getHours() + 24);
  }
  if (isWeekend(baseTime)) {
    const daysToAdd = (8 - baseTime.getDay()) % 7 || 7; // Calculate days to add to reach next Monday
    baseTime.setDate(baseTime.getDate() + daysToAdd);
  }
  return baseTime;
};

const isPastLunch = (time: Date) => {
  const hour = Number(
    time.toLocaleTimeString("da-DK", {
      hour: "numeric",
      timeZone: "Europe/Copenhagen",
    })
  );
  return hour > 12 || (hour === 12 && time.getMinutes() >= 30);
};

const isWeekend = (time: Date) => {
  return time.getDay() === 0 || time.getDay() === 6;
};
