import {createErrorMessageAndExit} from '../error/errorHandling';
import AWS, {SQS} from 'aws-sdk';
import {generateString} from '../randomStringGenerator';
AWS.config.update({region: 'eu-central-1'});
const sqs = new AWS.SQS({apiVersion: '2012-11-05'});

interface SqsMessage {
  body: string | undefined;
  messageDeduplicationId: string | undefined;
  messageGroupId: string | undefined;
}

const sqsNamingRules = {
  sqsValidationRules: [
    (s: string, fifo: boolean): true | string =>
      (s && fifo
        ? /^[\A-Z\a-z\d\-\_]*$/.test(s.slice(0, -5)) && s.endsWith('.fifo')
        : /^[\A-Z\a-z\d\-\_]*$/.test(s)) ||
      `The sqs queue name can contain only uper/lower-case characters, numbers, underscore and dashes. If the queue is a fifo it has to end with .fifo`,
    (s: string): true | string =>
      (s && s.length >= 1 && s.length <= 80) ||
      `The sqs queue name must be between 1 and 80 characters long.`,
  ],
};

const createSqsQueue = async (sqsName: string, fifo: boolean = false) => {
  const errorLocation = 'Error while creating sqs queue:';
  sqsNamingRules.sqsValidationRules.forEach(func => {
    const result = func(sqsName, fifo);
    if (typeof result === 'string') {
      createErrorMessageAndExit(errorLocation, result);
    }
  });
  let sqsParams: SQS.CreateQueueRequest = {
    QueueName: sqsName,
  };
  if (fifo) {
    sqsParams['Attributes'] = {FifoQueue: 'true'};
  }
  try {
    return (await sqs.createQueue(sqsParams).promise()).QueueUrl;
  } catch (error) {
    createErrorMessageAndExit(errorLocation, error);
  }
};

const deleteSqsQueue = async (
  sqsName: string,
  errorHandlingEnabled: boolean
) => {
  const errorLocation = 'Error while deleting sqs queue:';
  try {
    const queueUrl = await getSqsQueueUrl(sqsName);
    if (queueUrl) {
      await sqs.deleteQueue({QueueUrl: queueUrl}).promise();
      return;
    }
    if (errorHandlingEnabled) {
      createErrorMessageAndExit(errorLocation, 'queue url was undefined');
    }
  } catch (error) {
    if (errorHandlingEnabled) {
      createErrorMessageAndExit(errorLocation, error);
    }
  }
};

const getSqsQueueUrl = async (sqsName: string): Promise<string | undefined> => {
  try {
    const response = await sqs.getQueueUrl({QueueName: sqsName}).promise();
    return response.QueueUrl;
  } catch (error) {
    return undefined;
  }
};

const getSqsMessage = async (
  queueUrl: string
): Promise<SqsMessage | undefined> => {
  try {
    const response = await sqs
      .receiveMessage({
        QueueUrl: queueUrl,
        AttributeNames: ['MessageDeduplicationId', 'MessageGroupId'],
      })
      .promise();
    if (response.Messages) {
      const awsMessage = response.Messages[0];
      if (awsMessage.ReceiptHandle) {
        deleteSqsMessage(queueUrl, awsMessage.ReceiptHandle);
      } else {
        console.log(
          'Could not delete message because receiptHandle was undefined'
        );
      }

      const message: SqsMessage = {
        body: awsMessage.Body,
        messageDeduplicationId: awsMessage.Attributes
          ? awsMessage.Attributes['MessageDeduplicationId']
          : undefined,
        messageGroupId: awsMessage.Attributes
          ? awsMessage.Attributes['MessageGroupId']
          : undefined,
      };
      return message;
    }
    return undefined;
  } catch (error) {
    throw `Error while trying to fetch message from sqs queue. Error: \n${error}`;
  }
};

const deleteSqsMessage = async (queueUrl: string, receiptHandle: string) => {
  try {
    await sqs
      .deleteMessage({QueueUrl: queueUrl, ReceiptHandle: receiptHandle})
      .promise();
  } catch (error) {
    throw `Error while trying to delete message from sqs queue. Error: \n${error}`;
  }
};

const generateSqsName = (fifo: boolean): string => {
  const characterPool =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
  const nameLength = 80;
  const fifoEnding = '.fifo';
  return (
    generateString(nameLength - (fifo ? fifoEnding.length : 0), characterPool) +
    (fifo ? '.fifo' : '')
  );
};

export {
  createSqsQueue,
  deleteSqsQueue,
  getSqsMessage,
  SqsMessage,
  generateSqsName,
};
