import {getConfig} from './config';
import {createErrorMessageAndExit} from './error/errorHandling';
import {TestStructure, It} from './test.types';
const chalk = require('chalk');

let beforeFunctions: Function[] = [];
let beforeEachFunctions: Function[] = [];
let afterFunctions: Function[] = [];
let afterEachFunctions: Function[] = [];

const resetLifecycleFunctions = async () => {
  beforeFunctions = [];
  beforeEachFunctions = [];
  afterEachFunctions = [];
  afterFunctions = [];
};

const before = (fn: Function) => {
  beforeFunctions.push(fn);
};

const beforeEach = (fn: Function) => {
  beforeEachFunctions.push(fn);
};

const after = (fn: Function) => {
  afterFunctions.push(fn);
};

const afterEach = (fn: Function) => {
  afterEachFunctions.push(fn);
};

let its: It[];

const describe = async (name: string, fn: Function): Promise<TestStructure> => {
  const start = Date.now();

  its = [];

  let descripeTest: TestStructure = {
    testFileName: '',
    descripeName: name,
    descripeTime: 0,
    failed: 0,
    passed: 0,
    its: [],
  };

  for (const beforeFn of beforeFunctions) {
    await beforeFn.apply(this);
  }

  console.log(`\t${name}:`);

  await fn.apply(this);

  for (const afterFn of afterFunctions) {
    await afterFn.apply(this);
  }

  resetLifecycleFunctions();

  const end = Date.now();

  descripeTest.its = its;
  descripeTest.descripeTime = (end - start) / 1000;

  descripeTest.passed = descripeTest.its.filter(it => !it.errorMessage).length;
  descripeTest.failed = descripeTest.its.length - descripeTest.passed;

  return descripeTest;
};

const it = async (name: string, fn: Function) => {
  const start = Date.now();

  let itTest: It = {
    name,
    errorMessage: undefined,
    itTime: 0,
  };

  for (const beforeEachFn of beforeEachFunctions) {
    await beforeEachFn.apply(this);
  }

  try {
    await fn.apply(this);
    console.log(`\t\t${name}: ${chalk.green('passed')}`);
  } catch (error) {
    console.log(`\t\t${name}: ${chalk.red('failed')}\n\t\t${error}`);
    itTest.errorMessage = error;
  }

  for (const afterEachFn of afterEachFunctions) {
    await afterEachFn.apply(this);
  }

  const end = Date.now();

  itTest.itTime = (end - start) / 1000;
  its.push(itTest);
};

const lambda = (name: string, event: any, context: any) => {
  return {
    execute: async () => {
      let config = getConfig();

      if (config) {
        const lambda = config.lambdas[name];
        const lambdaFile = require(process.cwd() + '/' + lambda.path);
        const lambdahandler = lambda.handler ? lambda.handler : 'handler';
        const lambdaResponse = await lambdaFile[lambdahandler](event, context);
        return {
          hasReturnValue: (expectedReturnValue: any) => {
            if (expectedReturnValue !== lambdaResponse) {
              throw `Lambda value is: ${lambdaResponse} but expected was ${expectedReturnValue}`;
            }
          },
        };
      }
      createErrorMessageAndExit('Lambda execution', 'config not set');
    },
  };
};

export {
  describe,
  it,
  lambda,
  before,
  beforeEach,
  after,
  afterEach,
  resetLifecycleFunctions,
};
