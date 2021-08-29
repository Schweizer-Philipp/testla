const generateString = (length: number, characterPool: string): string => {
  let generatedString: string = '';
  for (var i = 0; i < length; i++) {
    generatedString += characterPool.charAt(
      Math.floor(Math.random() * characterPool.length)
    );
  }
  return generatedString;
};

export {generateString};
