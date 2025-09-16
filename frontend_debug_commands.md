# Frontend Debug Commands

Run these commands in your browser console (F12 → Console tab) while on the interpreter portal:

## 1. Check Authentication Status
```javascript
console.log('Auth Token:', localStorage.getItem('interpreterToken'));
console.log('User Data:', JSON.parse(localStorage.getItem('interpreterUser') || 'null'));
console.log('Profile Data:', JSON.parse(localStorage.getItem('interpreterProfile') || 'null'));
```

## 2. Test API Call Directly
```javascript
fetch('http://localhost:3001/api/jobs/available')
  .then(response => response.json())
  .then(data => {
    console.log('Available Jobs:', data);
    console.log('QME Job Found:', data.data?.jobs?.find(job => job.title === 'qme'));
  })
  .catch(error => console.error('API Error:', error));
```

## 3. Test Authenticated API Call
```javascript
const token = localStorage.getItem('interpreterToken');
fetch('http://localhost:3001/api/jobs/available', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => {
    console.log('Authenticated Available Jobs:', data);
    console.log('Jobs Count:', data.data?.jobs?.length);
  })
  .catch(error => console.error('Authenticated API Error:', error));
```

## 4. Check Network Tab
1. Open Network tab in developer tools
2. Navigate to Jobs/Browse Jobs in the interpreter portal
3. Look for any failed requests (red entries)
4. Check the response of the `/jobs/available` request

## What to Look For:
- ❌ **No token**: You're not logged in
- ❌ **API errors**: Backend connection issues
- ❌ **Empty jobs array**: Filtering or query issues
- ✅ **QME job in response**: Frontend display issue



