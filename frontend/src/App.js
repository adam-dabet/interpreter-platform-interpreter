import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import InterpreterProfile from './pages/InterpreterProfile';
import ApplicationStatus from './pages/ApplicationStatus';
import './styles/globals.css';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Toaster position="top-right" />
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/apply" element={<InterpreterProfile />} />
            <Route path="/status" element={<ApplicationStatus />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App;
