import {createErrorMessageAndExit} from '../error/errorHandling';
import AWS from 'aws-sdk';
import {Key, AttributeValue} from 'aws-sdk/clients/dynamodb';
import {generateString} from '../randomStringGenerator';

AWS.config.update({region: 'eu-central-1'});

const dynamoDbNamingRules = {
  dynamoDbValidationRules: [
    (s: string): true | string =>
      (s && /^[\A-Z\a-z\d\.\-\_]*$/.test(s)) ||
      `The dynamo table name can contain only uper/lower-case characters, numbers, periods, underscore and dashes.`,
    (s: string): true | string =>
      (s && s.length >= 3 && s.length <= 255) ||
      `The dynamo table name can be between 3 and 255 characters long.`,
  ],
};

const dynamoDB = new AWS.DynamoDB({apiVersion: '2012-08-10'});

const getItem = async (
  tableName: string,
  key: Key,
  consuming: boolean
): Promise<{[key: string]: any} | undefined> => {
  await waitforTableToBeRdy(tableName);
  try {
    const result = await dynamoDB
      .getItem({TableName: tableName, Key: key})
      .promise();
    if (result.Item) {
      const items = result.Item;
      let resultItems: {[key: string]: {value: any}} = {};
      for (const key in items) {
        resultItems[key] = Object.values(items[key])[0];
      }
      if (consuming) {
        await deleteTableItem(tableName, key);
      }
      return resultItems;
    }
    return {};
  } catch (error) {
    throw `Error while trying to fetch file content from datebase. Error: \n${error}`;
  }
};

const doesTableExist = async (tableName: string): Promise<Boolean> => {
  try {
    await dynamoDB.describeTable({TableName: tableName}).promise();
    return true;
  } catch (error) {
    if (error.statusCode == 400) {
      return false;
    }
    throw `Error while trying to fetch table from datebase. Error: \n${error}`;
  }
};

const createDynamoTable = async (
  tableName: string,
  properties: {AttributeName: string; AttributeType: string}[],
  keys: {AttributeName: string; KeyType: string}[]
) => {
  const errorLocation = 'Dynamo db table creation';
  dynamoDbNamingRules.dynamoDbValidationRules.forEach(func => {
    const result = func(tableName);
    if (typeof result === 'string') {
      createErrorMessageAndExit(errorLocation, result);
    }
  });
  try {
    await dynamoDB
      .createTable({
        AttributeDefinitions: properties,
        TableName: tableName,
        KeySchema: keys,
        ProvisionedThroughput: {ReadCapacityUnits: 1, WriteCapacityUnits: 1},
      })
      .promise();
    await waitforTableToBeRdy(tableName);
  } catch (error) {
    createErrorMessageAndExit(
      errorLocation,
      `could not create dynamo db table ${tableName}. Error:\n${error}`
    );
  }
};

const deleteDynamoTable = async (
  tableName: string,
  errorHandlingEnabled: boolean
) => {
  await waitforTableToBeRdy(tableName);
  try {
    await dynamoDB.deleteTable({TableName: tableName}).promise();
  } catch (error) {
    if (errorHandlingEnabled) {
      createErrorMessageAndExit(
        'Dynamo db table deletion',
        `could not delete dynamo db table ${tableName}. Error:\n${error}`
      );
    }
  }
};

const setTableItem = async (
  tableName: string,
  item: {[key: string]: AttributeValue}
) => {
  const errorLocation = 'Dynamo db put item';
  await waitforTableToBeRdy(tableName);
  try {
    await dynamoDB.putItem({TableName: tableName, Item: item}).promise();
    await waitforTableToBeRdy(tableName);
  } catch (error) {
    createErrorMessageAndExit(
      errorLocation,
      `could not put item into dynamo db table ${tableName}. Error:\n${error}`
    );
  }
};

const waitforTableToBeRdy = async (tableName: string) => {
  let tableActive = false;
  while (!tableActive) {
    const result = await dynamoDB
      .describeTable({TableName: tableName})
      .promise();
    tableActive = result.Table ? result.Table.TableStatus === 'ACTIVE' : false;
  }
};

const deleteTableItem = async (
  tableName: string,
  primaryKeys: {[key: string]: AttributeValue}
) => {
  const errorLocation = 'Dynamo db delete item';
  await waitforTableToBeRdy(tableName);
  try {
    await dynamoDB
      .deleteItem({TableName: tableName, Key: primaryKeys})
      .promise();
    await waitforTableToBeRdy(tableName);
  } catch (error) {
    createErrorMessageAndExit(
      errorLocation,
      `could not put item into dynamo db table ${tableName}. Error:\n${error}`
    );
  }
};

const generateDynamoDbName = (): string => {
  const characterPool =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.';
  const nameLength = 255;
  return generateString(nameLength, characterPool);
};

export {
  createDynamoTable,
  getItem,
  deleteDynamoTable,
  setTableItem,
  doesTableExist,
  generateDynamoDbName,
};
