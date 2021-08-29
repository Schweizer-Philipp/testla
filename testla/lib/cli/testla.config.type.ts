export interface TestlaConfig {
  testDirectory: string[];
  testFiles: string;
  s3Buckets: S3Bucket[];
  lambdas: LambdaCollection;
  dynamoDbs: DynamoDB[];
  sqsQeueus: Sqs[];
}

interface S3Bucket {
  bucketName: string;
  enviromentName: string;
  region: string;
}
interface LambdaCollection {
  [key: string]: Lambda;
}

interface Lambda {
  path: string;
  handler?: string;
}

interface DynamoDB {
  tableName: string;
  enviromentName: string;
  properties: {AttributeName: string; AttributeType: string}[];
  keys: {AttributeName: string; KeyType: 'HASH' | 'RANGE' | string}[];
}

interface Sqs {
  sqsName: string;
  enviromentName: string;
  fifo: boolean;
}
