// Test script to verify the unassign route is working
const axios = require('axios');

const testUnassignRoute = async () => {
  try {
    console.log('Testing unassign route...');
    
    // Test with a dummy job ID (this will fail with authentication, but should show if route exists)
    const response = await axios.post('http://localhost:3001/api/jobs/test-job-id/unassign', {
      unassign_reason: 'Test unassign'
    });
    
    console.log('Route exists and responded:', response.status);
  } catch (error) {
    if (error.response) {
      if (error.response.status === 401) {
        console.log('✅ Route exists! Got 401 (Unauthorized) - this means the route is working but needs authentication');
      } else if (error.response.status === 404) {
        console.log('❌ Route not found (404) - server needs to be restarted');
      } else {
        console.log('Route exists, got status:', error.response.status);
      }
    } else {
      console.log('Network error:', error.message);
    }
  }
};

testUnassignRoute();
