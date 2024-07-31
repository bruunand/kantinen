export const getEnv = (env: string) => {
  return process.env[env] || "";
};

export const getRequiredEnv = (env: string): string => {
  const value = getEnv(env);
  if (!value || !value.length) {
    throw new Error(`Missing required environment variable ${env}`);
  }
  return value;
};
