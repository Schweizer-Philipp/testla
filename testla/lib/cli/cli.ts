#! /usr/bin/env node
import {createErrorMessageAndExit} from '../error/errorHandling';
import {getConfig} from '../config';
import {createBucket, deleteBucket, generateS3Name} from '../s3/s3Interactor';
import {
  createDynamoTable,
  deleteDynamoTable,
  generateDynamoDbName,
} from '../dynamo/dynamoInteractor';
import {TestStructure} from '../test.types';
import {
  createSqsQueue,
  deleteSqsQueue,
  generateSqsName,
} from '../sqs/sqsInteractor';
import {TestlaConfig} from './testla.config.type';
const dateFormat = require('dateformat');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const yargs = require('yargs');
const usage = '\nUsage: testla [options]';
const options = yargs
  .usage(usage)
  .option('f', {
    alias: 'file',
    describe: 'tests given file',
    type: 'string',
    demandOption: false,
  })
  .option('teardown', {
    describe: 'destroys the services defined in the testla config',
    demandOption: false,
  })
  .help(true).argv;

const htmlTemplate = 'htmlTemplate/testResult.ejs';

const describeTests: TestStructure[] = [];

const runTests = async (testFiles: String[]) => {
  for (const filePath of testFiles) {
    await runTestFile(`${filePath}`);
  }
};

const fetchTestFiles = (
  testDirectories: string[],
  testFilesEnding: string
): string[] => {
  const fileSet = new Set<string>();
  if (testDirectories) {
    for (const dir of testDirectories) {
      for (const file of fs.readdirSync(dir)) {
        fileSet.add(`${dir}${file}`);
      }
    }
  }

  if (testFilesEnding) {
    const testFiles = fetchFilesFromDirectory(process.cwd()).map(file =>
      file.slice(process.cwd().length + 1)
    );
    testFiles
      .filter(file => file.split('.')[1] === testFilesEnding)
      .forEach(fileSet.add, fileSet);
  }
  return Array.from(fileSet);
};

const fetchFilesFromDirectory = (directory: string): string[] => {
  let files: string[] = [];

  for (const file of fs.readdirSync(directory)) {
    if (fs.statSync(`${directory}/${file}`).isDirectory()) {
      if (file != 'node_modules') {
        files = files.concat(fetchFilesFromDirectory(`${directory}/${file}`));
      }
    } else {
      files.push(`${directory}/${file}`);
    }
  }

  return files;
};

const runTestFile = async (path: string) => {
  let result: TestStructure = await require(fs.realpathSync(path));
  result.testFileName = path;
  describeTests.push(result);
};

const createEnvironmentvariable = (key: string, value: string) => {
  process.env[key] = value;
};

const generateHtmlOutput = (describeTests: TestStructure[]) => {
  const basePath = path.join(process.cwd(), '/html');
  const rawTemplate = fs.readFileSync(
    path.join(__dirname, `../../${htmlTemplate}`)
  );
  let html = ejs.render(rawTemplate.toString(), {
    descripes: describeTests,
    testDate: dateFormat(new Date(), 'dd.mm.yyyy HH:MM:ss'),
  });
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath);
  }
  fs.writeFileSync(
    basePath + `/${dateFormat(new Date(), 'dd-mm-HH-MM')}-TestResult.html`,
    html
  );
};

const setUpServices = async (config: TestlaConfig) => {
  for (const sqs of config.sqsQeueus) {
    sqs.sqsName = sqs.sqsName ? sqs.sqsName : generateSqsName(sqs.fifo);
    const sqsUrl = await createSqsQueue(sqs.sqsName, sqs.fifo);
    if (sqsUrl) {
      createEnvironmentvariable(sqs.enviromentName, sqsUrl);
    } else {
      createErrorMessageAndExit(
        'Creating of sqs queue',
        'could not set enviroment varibale becuase sqsUrl is undefined'
      );
    }
  }

  for (const bucket of config.s3Buckets) {
    bucket.bucketName = bucket.bucketName
      ? bucket.bucketName
      : generateS3Name();
    await createBucket(
      bucket.bucketName,
      bucket.region ? bucket.region : 'eu-central-1'
    );
    createEnvironmentvariable(bucket.enviromentName, bucket.bucketName);
  }

  for (const table of config.dynamoDbs) {
    table.tableName = table.tableName
      ? table.tableName
      : generateDynamoDbName();
    await createDynamoTable(table.tableName, table.properties, table.keys);
    createEnvironmentvariable(table.enviromentName, table.tableName);
  }
};

const teardownServices = async (
  config: TestlaConfig,
  errorHandlingEnabled: boolean
) => {
  for (const bucket of config.s3Buckets) {
    await deleteBucket(bucket.bucketName, errorHandlingEnabled);
  }

  for (const table of config.dynamoDbs) {
    await deleteDynamoTable(table.tableName, errorHandlingEnabled);
  }

  for (const sqs of config.sqsQeueus) {
    await deleteSqsQueue(sqs.sqsName, errorHandlingEnabled);
  }
};

(async () => {
  let config = getConfig();
  if (!config) {
    console.error(`ERROR: Missing config file`);
    return;
  }

  if (options.teardown) {
    await teardownServices(config, false);
    return;
  }

  await setUpServices(config);

  if (options.f) {
    await runTestFile(options.f);
  } else {
    const testFiles = fetchTestFiles(config.testDirectory, config.testFiles);
    await runTests(testFiles);
  }

  await teardownServices(config, true);

  generateHtmlOutput(describeTests);
})();
