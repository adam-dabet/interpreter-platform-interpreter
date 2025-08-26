# Interpreter Platform Admin Dashboard

A separate, standalone admin dashboard for managing interpreter applications and profiles.

## Features

- **Secure Authentication**: JWT-based login system
- **Dashboard Overview**: Real-time statistics and metrics
- **Application Management**: View, approve, and reject interpreter applications
- **Advanced Filtering**: Search and filter applications by status, name, email
- **Detailed Views**: Complete application information in modal views
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- The main interpreter platform backend running on port 3001

### Installation

1. **Install dependencies**:
   ```bash
   cd admin-dashboard
   npm install
   ```

2. **Environment configuration**:
   Create a `.env` file in the admin-dashboard directory:
   ```env
   REACT_APP_API_URL=http://localhost:3001/api
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

The admin dashboard will be available at `http://localhost:3000`

### Default Login Credentials

- **Email**: `admin@interpreterplatform.com`
- **Password**: `admin123`

## Architecture

### Separation Benefits

This admin dashboard is completely separate from the main interpreter platform for:

- **Security**: Isolated admin functionality
- **Deployment**: Independent deployment cycles
- **Access Control**: Separate authentication and authorization
- **Maintenance**: Independent development and updates
- **Scalability**: Can be deployed on different servers

### API Integration

The admin dashboard communicates with the main platform via REST API:

- **Base URL**: `http://localhost:3001/api`
- **Authentication**: JWT tokens
- **Endpoints**: All admin endpoints under `/api/admin/*`

## Development

### Project Structure

```
admin-dashboard/
├── public/              # Static assets
├── src/
│   ├── App.js          # Main application component
│   ├── index.js        # Application entry point
│   └── index.css       # Global styles with Tailwind
├── package.json         # Dependencies and scripts
├── tailwind.config.js   # Tailwind CSS configuration
└── README.md           # This file
```

### Key Components

- **AdminDashboard**: Main dashboard component with authentication
- **UI Components**: Reusable Button, Input, Select, LoadingSpinner
- **API Integration**: Centralized API calls with error handling
- **State Management**: React hooks for local state

### Styling

- **Tailwind CSS**: Utility-first CSS framework
- **Heroicons**: Beautiful SVG icons
- **Framer Motion**: Smooth animations and transitions
- **Responsive Design**: Mobile-first approach

## Deployment

### Production Build

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

### Environment Variables

For production, set the appropriate API URL:

```env
REACT_APP_API_URL=https://your-api-domain.com/api
```

### Deployment Options

- **Static Hosting**: Deploy to Netlify, Vercel, or similar
- **Docker**: Containerize the application
- **CDN**: Serve static files from a CDN
- **Reverse Proxy**: Use nginx or Apache as a reverse proxy

## Security Considerations

- **HTTPS**: Always use HTTPS in production
- **CORS**: Configure CORS properly on the backend
- **Authentication**: JWT tokens with proper expiration
- **Authorization**: Role-based access control
- **Input Validation**: Validate all user inputs
- **Rate Limiting**: Implement rate limiting on API endpoints

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Ensure the backend server is running on port 3001
   - Check the `REACT_APP_API_URL` environment variable
   - Verify CORS configuration on the backend

2. **Login Issues**
   - Check admin credentials in the database
   - Verify JWT token generation on the backend
   - Check browser console for errors

3. **Applications Not Loading**
   - Verify database connection
   - Check API endpoint responses
   - Review server logs for errors

### Support

For issues and questions:
- Check the browser console for error messages
- Review the network tab for API call failures
- Check the backend server logs
- Verify database connectivity and data

## License

This project is licensed under the MIT License.

