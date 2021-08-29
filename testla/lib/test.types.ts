interface TestStructure {
  testFileName: string;
  passed: number;
  failed: number;
  descripeName: string;
  descripeTime: number;
  its: It[];
}

interface It {
  name: string;
  errorMessage: string | undefined;
  itTime: number;
}

export {TestStructure, It};
