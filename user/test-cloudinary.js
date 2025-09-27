import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 Testing Cloudinary Configuration...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('Cloud_Name:', process.env.Cloud_Name ? '✅ Set' : '❌ Not set');
console.log('Api_Key:', process.env.Api_Key ? '✅ Set' : '❌ Not set');
console.log('Api_Secret:', process.env.Api_Secret ? '✅ Set' : '❌ Not set');

// Test Cloudinary connection
if (process.env.Cloud_Name && process.env.Api_Key && process.env.Api_Secret) {
  console.log('\n🔗 Testing Cloudinary connection...');
  
  cloudinary.config({
    cloud_name: process.env.Cloud_Name,
    api_key: process.env.Api_Key,
    api_secret: process.env.Api_Secret,
  });

  // Test with a simple API call
  cloudinary.api.ping()
    .then(result => {
      console.log('✅ Cloudinary connection successful:', result);
    })
    .catch(error => {
      console.log('❌ Cloudinary connection failed:', error.message);
    });
} else {
  console.log('\n❌ Missing required environment variables');
  console.log('Please create a .env file with:');
  console.log('Cloud_Name=your_cloud_name');
  console.log('Api_Key=your_api_key');
  console.log('Api_Secret=your_api_secret');
}
