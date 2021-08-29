import {createErrorMessageAndExit} from '../error/errorHandling';
import {S3} from 'aws-sdk';
import AWS from 'aws-sdk';
import {generateString} from '../randomStringGenerator';
AWS.config.update({region: 'eu-central-1'});

const s3 = new AWS.S3({apiVersion: '2006-03-01'});

const s3BucketNamingRules = {
  bucketNameValidationRules: [
    (s: string): true | string =>
      (s && /^[\a-z\d\.\-]*$/.test(s)) ||
      `The bucket name can contain only lower-case characters, numbers, periods, and dashes.`,
    (s: string): true | string =>
      (s && /^[\a-z\d]/.test(s)) ||
      `The bucket name must start with a lowercase letter or number.`,
    (s: string): true | string =>
      (s && !/\-$/.test(s)) || `The bucket name can't end with a dash`,
    (s: string): true | string =>
      (s && !/\.+\./.test(s)) ||
      `The bucket name can't have consecutive periods`,
    (s: string): true | string =>
      (s && !/\-+\.$/.test(s)) ||
      `The bucket name can't end with dash adjacent to period`,
    (s: string): true | string =>
      (s && !/^(?:(?:^|\.)(?:2(?:5[0-5]|[0-4]\d)|1?\d?\d)){4}$/.test(s)) ||
      `The bucket name can't be formatted as an IP address`,
    (s: string): true | string =>
      (s && s.length >= 3 && s.length <= 63) ||
      `The bucket name can be between 3 and 63 characters long.`,
  ],
};

const getFileContent = async (
  bucketName: string,
  fileName: string,
  consuming: boolean
): Promise<string | undefined> => {
  try {
    const {Body} = await s3
      .getObject({Bucket: bucketName, Key: fileName})
      .promise();
    if (!Body) {
      return '';
    }
    if (consuming) {
      await deleteObjectInBucket(bucketName, fileName);
    }
    return Body.toString('utf-8');
  } catch (error) {
    if (error.statusCode == 404) {
      return undefined;
    }
    throw `Error while trying to fetch file content from Bucket. Error: \n ${error}`;
  }
};

const createBucket = async (
  bucketName: string,
  bucketRegion: S3.BucketLocationConstraint
) => {
  const errorLocation = 'Error while creating Bucket:';
  s3BucketNamingRules.bucketNameValidationRules.forEach(func => {
    const result = func(bucketName);
    if (typeof result === 'string') {
      createErrorMessageAndExit(errorLocation, result);
    }
  });
  try {
    await s3
      .createBucket({
        Bucket: bucketName,
        CreateBucketConfiguration: {LocationConstraint: bucketRegion},
      })
      .promise();
  } catch (error) {
    createErrorMessageAndExit(errorLocation, error);
  }
};

const deleteBucket = async (
  bucketName: string,
  errorHandlingEnabled: boolean
) => {
  const errorLocation = 'Error while deleting Bucket:';
  try {
    await deleteAllObjectInBucket(bucketName);
    await s3.deleteBucket({Bucket: bucketName}).promise();
  } catch (error) {
    if (errorHandlingEnabled) {
      createErrorMessageAndExit(errorLocation, error);
    }
  }
};

const getAllFilesFromBucket = async (
  bucketName: string
): Promise<string[] | undefined> => {
  const errorLocation = 'Error while fetching files from Bucket:';
  let files: S3.Types.ListObjectsOutput;
  try {
    files = await s3.listObjects({Bucket: bucketName}).promise();
    if (files.Contents) {
      return files.Contents.map(file => file.Key!).filter(Boolean);
    }
  } catch (error) {
    createErrorMessageAndExit(errorLocation, error);
  }
};

const deleteAllObjectInBucket = async (bucketName: string) => {
  const files = await getAllFilesFromBucket(bucketName);

  if (files) {
    for (const file of files) {
      await deleteObjectInBucket(bucketName, file);
    }
  }
};

const deleteObjectInBucket = async (bucketName: string, fileName: string) => {
  const errorLocation = 'Error while deleting file from Bucket:';

  try {
    await s3.deleteObject({Bucket: bucketName, Key: fileName}).promise();
  } catch (error) {
    createErrorMessageAndExit(errorLocation, error);
  }
};

const generateS3Name = (): string => {
  const characterPool = 'abcdefghijklmnopqrstuvwxyz0123456789-.';
  const nameLength = 63;
  let name: string = '';
  let validName = false;
  while (!validName) {
    validName = true;
    name = generateString(nameLength, characterPool);
    s3BucketNamingRules.bucketNameValidationRules.forEach(func => {
      const result = func(name);
      if (typeof result === 'string') {
        validName = false;
      }
    });
  }
  return name;
};

export {
  getFileContent,
  createBucket,
  deleteBucket,
  deleteAllObjectInBucket,
  generateS3Name,
};
