export const createErrorMessageAndExit = (
  errorLocation: string,
  error: string
) => {
  console.log(errorLocation);
  console.log(error);
  return process.exit(1);
};
