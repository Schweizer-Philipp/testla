import {getSqsMessage, SqsMessage} from './sqsInteractor';

const sqs = (sqsUrl: string) => {
  return {
    message: async () => {
      return await message(sqsUrl);
    },
    messageContent: async (message: SqsMessage) => {
      return await messageContent(sqsUrl, message);
    },
  };
};

const message = async (sqsUrl: string) => {
  let message: SqsMessage | undefined;

  try {
    message = await getSqsMessage(sqsUrl);
  } catch (error) {
    throw error;
  }

  return {
    exists: () => {
      if (!message) {
        throw `The sqs queue ${sqsUrl} does not have a message`;
      }
    },
    notExists: () => {
      if (message) {
        throw `The sqs queue ${sqsUrl} does have a message`;
      }
    },
  };
};

const messageContent = async (sqsUrl: string, expectedMessage: SqsMessage) => {
  let message: SqsMessage | undefined;

  try {
    message = await getSqsMessage(sqsUrl);
  } catch (error) {
    throw error;
  }

  if (!message) {
    throw `The sqs queue ${sqsUrl} does not have a message`;
  }

  return {
    equals: () => {
      const res = Object.entries(expectedMessage).find(
        // Since we iterate over expectedMessage, and it has the same type as message we can check the field. Typescript does not allow dynamical attribute access using variables.
        // @ts-ignore
        ([key, value]) => message![key]! != value
      );
      if (res?.[0] && res?.[1]) {
        throw `The sqs queue(${sqsUrl}) message is not equal to the expected message:\nexpected value at ${
          res?.[0]
          // Since we iterate over expectedMessage, and it has the same type as message we can check the field. Typescript does not allow dynamical attribute access using variables.
          // @ts-ignore
        } is:\n${res?.[1]}\nreal value is ${message?.[res?.[0]]}`;
      }
    },
    notEquals: () => {
      const res = Object.entries(expectedMessage).find(
        // Since we iterate over expectedMessage, and it has the same type as message we can check the field. Typescript does not allow dynamical attribute access using variables.
        // @ts-ignore
        ([key, value]) => message![key]! == value
      );
      if (res?.[0] && res?.[1]) {
        throw `The sqs queue(${sqsUrl}) message is equal to the expected message:\nvalue at ${res?.[0]} is:\n${res?.[1]}`;
      }
    },
  };
};

export {sqs};
