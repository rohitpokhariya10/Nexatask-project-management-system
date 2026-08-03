process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/nexatask_test_placeholder';
process.env.JWT_SECRET = 'test-only-jwt-secret-that-is-at-least-thirty-two-characters';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.BCRYPT_SALT_ROUNDS = '10';
process.env.MAX_FILE_SIZE = '1048576';
process.env.UPLOAD_DIRECTORY = '/tmp/countryedu-nexatask-test-uploads';
