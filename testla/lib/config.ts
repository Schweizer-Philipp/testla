import {TestlaConfig} from './cli/testla.config.type';

const path = require('path');
const fs = require('fs');

let config: TestlaConfig | undefined;
const configFile = 'testla.config.json';
let firstLoad = true;

const loadConfig = (): TestlaConfig | undefined => {
  try {
    const rawConfig = fs.readFileSync(path.join(process.cwd(), configFile));
    return JSON.parse(rawConfig);
  } catch (error) {
    return undefined;
  }
};

export const getConfig = () => {
  if (firstLoad) {
    config = loadConfig();
    firstLoad = false;
  }
  return config;
};
