import {Key} from 'aws-sdk/clients/dynamodb';
import {doesTableExist, getItem} from './dynamoInteractor';

const dynamoDb = (tableName: string) => {
  return {
    table: async () => {
      return await table(tableName);
    },
    tableContent: async (
      key: Key,
      expectedItems: {[key: string]: {value: any}},
      consuming: boolean = true
    ) => {
      return await tableContent(tableName, key, expectedItems, consuming);
    },
  };
};

const table = async (tableName: string) => {
  let tableExist: Boolean;

  try {
    tableExist = await doesTableExist(tableName);
  } catch (error) {
    throw error;
  }

  return {
    exists: () => {
      if (!tableExist) {
        throw `The dynamo db table ${tableName} does not exist`;
      }
    },
    notExists: () => {
      if (tableExist) {
        throw `The dynamo db table ${tableName} does exist`;
      }
    },
  };
};

const tableContent = async (
  tableName: string,
  key: Key,
  expectedItems: {[key: string]: any},
  consuming: boolean
) => {
  let items: {[key: string]: any} | undefined;

  try {
    items = await getItem(tableName, key, consuming);
  } catch (error) {
    throw error;
  }

  if (!items) {
    throw `The dynamo db table ${tableName} does not exist`;
  }

  return {
    equals: () => {
      for (const key in items) {
        if (items[key] !== expectedItems[key]) {
          throw `\tThe table(${tableName}) items is not equal to the expected items:\n\t\t\texpected value at ${key} is: ${expectedItems[key]}\n\t\t\treal value is ${items[key]}`;
        }
      }
    },
    notEquals: () => {
      for (const key in items) {
        if (items[key] === expectedItems[key]) {
          throw `The table(${tableName}) has a equal item at ${key}, value is:\n${items[key]}`;
        }
      }
    },
  };
};

export {dynamoDb};
