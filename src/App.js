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
import ProfileEdit from './pages/ProfileEdit';
import AgencyMembers from './pages/AgencyMembers';
import MySchedule from './pages/MySchedule';
import PendingActions from './pages/PendingActions';
import ConfirmJob from './pages/ConfirmJob';
import CompletionReportPublic from './pages/CompletionReportPublic';
import TransportationCompletionReportPublic from './pages/TransportationCompletionReportPublic';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { AuthProvider } from './contexts/AuthContext';
import { JobRestrictionProvider } from './contexts/JobRestrictionContext';
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
            <Route path="/terms" element={<Layout><Terms /></Layout>} />
            <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/signup" element={<SetupPassword />} />
            <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
            <Route path="/job-timer/:token" element={<JobTimer />} />
            <Route path="/jobs/:jobId/confirm/:token" element={<ConfirmJob />} />
            <Route path="/jobs/:jobId/report/:token" element={<CompletionReportPublic />} />
            <Route path="/transportation-jobs/:jobId/report/:token" element={<TransportationCompletionReportPublic />} />
            <Route path="/dashboard" element={<ProtectedRoute><JobRestrictionProvider><AuthenticatedLayout><Dashboard /></AuthenticatedLayout></JobRestrictionProvider></ProtectedRoute>} />
            <Route path="/schedule" element={<ProtectedRoute><JobRestrictionProvider><AuthenticatedLayout><MySchedule /></AuthenticatedLayout></JobRestrictionProvider></ProtectedRoute>} />
            <Route path="/pending" element={<ProtectedRoute><JobRestrictionProvider><AuthenticatedLayout><PendingActions /></AuthenticatedLayout></JobRestrictionProvider></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute><JobRestrictionProvider><AuthenticatedLayout><JobDashboard /></AuthenticatedLayout></JobRestrictionProvider></ProtectedRoute>} />
            <Route path="/jobs/search" element={<ProtectedRoute><JobRestrictionProvider><AuthenticatedLayout><JobSearch /></AuthenticatedLayout></JobRestrictionProvider></ProtectedRoute>} />
            <Route path="/job/:jobId" element={<ProtectedRoute><JobRestrictionProvider><AuthenticatedLayout><JobDetails /></AuthenticatedLayout></JobRestrictionProvider></ProtectedRoute>} />
            <Route path="/jobs/:jobId/:action/:interpreterId" element={<ProtectedRoute><JobAction /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><JobRestrictionProvider><AuthenticatedLayout><Profile /></AuthenticatedLayout></JobRestrictionProvider></ProtectedRoute>} />
            <Route path="/profile/edit" element={<ProtectedRoute><JobRestrictionProvider><AuthenticatedLayout><ProfileEdit /></AuthenticatedLayout></JobRestrictionProvider></ProtectedRoute>} />
            <Route path="/profile/agency-members" element={<ProtectedRoute><JobRestrictionProvider><AuthenticatedLayout><AgencyMembers /></AuthenticatedLayout></JobRestrictionProvider></ProtectedRoute>} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
