// Synthetic credentials only. Unit tests never connect to a database.
process.env.DATABASE_URL = "postgres://fixture:fixture@127.0.0.1:1/moonweight_test";
process.env.ADMIN_PASSWORD = "fictional-test-password";
process.env.SESSION_SECRET = "fictional-test-secret-with-32-characters";
process.env.CORS_ORIGIN = "http://localhost:5173,http://localhost:8080";
process.env.COOKIE_SECURE = "false";
process.env.NODE_ENV = "test";
