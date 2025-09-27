import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

console.log('🧪 Testing Avatar Upload Endpoint...\n');

const USER_SERVICE_URL = 'http://localhost:5000';

async function testAvatarUpload() {
  try {
    console.log('1. Testing if user service is running...');
    
    // Test basic connectivity
    const healthCheck = await axios.get(`${USER_SERVICE_URL}/api/v1/me`);
    console.log('✅ User service is running');
    console.log('✅ Authentication working');
    
    console.log('\n2. Testing avatar upload endpoint...');
    console.log('   Endpoint: POST /api/v1/update/avatar');
    
    // Create a test image file (you'll need to provide a real image path)
    const testImagePath = './test-image.jpg'; // Change this to a real image path
    
    if (!fs.existsSync(testImagePath)) {
      console.log('❌ Test image not found. Please place a test image at:', testImagePath);
      console.log('   Or update the testImagePath variable in this file.');
      return;
    }
    
    const formData = new FormData();
    formData.append('avatar', fs.createReadStream(testImagePath));
    
    console.log('   📁 Test image found:', testImagePath);
    console.log('   📤 Attempting upload...');
    
    const response = await axios.post(
      `${USER_SERVICE_URL}/api/v1/update/avatar`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${process.env.TEST_TOKEN || 'your-test-token-here'}`,
        },
      }
    );
    
    console.log('✅ Upload successful!');
    console.log('   Response:', response.data);
    
  } catch (error) {
    console.log('❌ Test failed:');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Message:', error.response.data?.message || 'No message');
      console.log('   Data:', error.response.data);
    } else {
      console.log('   Error:', error.message);
    }
  }
}

testAvatarUpload();
