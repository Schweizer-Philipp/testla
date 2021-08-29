import {getFileContent} from './s3Interactor';

const s3Bucket = (bucketName: string) => {
  return {
    file: async (fileName: string, consuming: boolean = true) => {
      return await file(bucketName, fileName, consuming);
    },
    fileContent: async (
      fileName: string,
      expectedFileContent: string,
      consuming: boolean = true
    ) => {
      return await fileContent(
        bucketName,
        fileName,
        expectedFileContent,
        consuming
      );
    },
  };
};

const file = async (
  bucketName: string,
  fileName: string,
  consuming: boolean
) => {
  let fileContent: string | undefined;

  try {
    fileContent = await getFileContent(bucketName, fileName, consuming);
  } catch (error) {
    throw error;
  }

  return {
    exists: () => {
      if (!fileContent) {
        throw `The Bucket ${bucketName} does not have the file ${fileName}`;
      }
    },
    notExists: () => {
      if (fileContent) {
        throw `The Bucket ${bucketName} does have the file ${fileName}`;
      }
    },
  };
};

const fileContent = async (
  bucketName: string,
  fileName: string,
  expectedFileContent: string,
  consuming: boolean
) => {
  let fileContent: string | undefined;

  try {
    fileContent = await getFileContent(bucketName, fileName, consuming);
  } catch (error) {
    throw error;
  }

  if (!fileContent) {
    throw `The Bucket ${bucketName} does not have the file ${fileName}`;
  }

  fileContent = fileContent.replace(/(\r\n|\n|\r)/gm, '');
  expectedFileContent = expectedFileContent.replace(/(\r\n|\n|\r)/gm, '');

  return {
    equals: () => {
      if (fileContent !== expectedFileContent) {
        throw `The Bucket ${bucketName}:\nexpected file content:\n ${expectedFileContent} \n real file content:\n ${fileContent}`;
      }
    },
    notEquals: () => {
      if (fileContent === expectedFileContent) {
        throw `The Bucket ${bucketName}:\nexpected file content to be different but its the same`;
      }
    },
  };
};
export {s3Bucket};
