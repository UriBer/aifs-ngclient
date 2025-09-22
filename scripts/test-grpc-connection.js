const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load the proto file
const PROTO_PATH = path.resolve(__dirname, '../src/main/proto/aifs.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const aifsService = protoDescriptor.aifs.AifsService;

// Create a client
const client = new aifsService('localhost:50051', grpc.credentials.createInsecure());

// Test connection by calling a simple method
console.log('Testing connection to gRPC server...');

// Try to list objects
client.listObjects({ namespace: 'test-namespace', prefix: '/' }, (err, response) => {
  if (err) {
    console.error('Error calling listObjects:', err);
  } else {
    console.log('ListObjects response:', response);
  }
});

// Try to check if an object exists
client.objectExists({ namespace: 'test-namespace', path: '/test.txt' }, (err, response) => {
  if (err) {
    console.error('Error calling objectExists:', err);
  } else {
    console.log('ObjectExists response:', response);
  }
});