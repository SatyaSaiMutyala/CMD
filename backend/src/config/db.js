const mongoose = require('mongoose');

const connectDb = async (uri) => {
  if (!uri) throw new Error('MONGO_URI is not set in .env');
  await mongoose.connect(uri);
  console.log(`[db] MongoDB connected: ${mongoose.connection.name}`);
};

const disconnectDb = () => mongoose.disconnect();

module.exports = { connectDb, disconnectDb };
