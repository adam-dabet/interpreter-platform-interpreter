import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout';
import AuthenticatedLayout from './components/layout/AuthenticatedLayout';
import Home from './pages/Home';
import InterpreterProfile from './pages/InterpreterProfile';
import ApplicationStatus from './pages/ApplicationStatus';
import Login from './pages/Login';
import SetupPassword from './pages/SetupPassword';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import JobDashboard from './pages/JobDashboard';
import JobSearch from './pages/JobSearch';
import JobDetails from './pages/JobDetails';
import JobTimer from './pages/JobTimer';
import JobAction from './pages/JobAction';
import Profile from './pages/Profile';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import RoutePersistence from './components/RoutePersistence';
import './styles/globals.css';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Toaster position="top-right" />
          <RoutePersistence />
          <Routes>
            <Route path="/" element={<Layout><Home /></Layout>} />
            <Route path="/apply" element={<Layout><InterpreterProfile /></Layout>} />
            <Route path="/status" element={<Layout><ApplicationStatus /></Layout>} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SetupPassword />} />
            <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
            <Route path="/job-timer/:token" element={<JobTimer />} />
            <Route path="/dashboard" element={<ProtectedRoute><AuthenticatedLayout><Dashboard /></AuthenticatedLayout></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute><AuthenticatedLayout><JobDashboard /></AuthenticatedLayout></ProtectedRoute>} />
            <Route path="/jobs/search" element={<ProtectedRoute><AuthenticatedLayout><JobSearch /></AuthenticatedLayout></ProtectedRoute>} />
            <Route path="/job/:jobId" element={<ProtectedRoute><AuthenticatedLayout><JobDetails /></AuthenticatedLayout></ProtectedRoute>} />
            <Route path="/jobs/:jobId/:action/:interpreterId" element={<ProtectedRoute><JobAction /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><AuthenticatedLayout><Profile /></AuthenticatedLayout></ProtectedRoute>} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
