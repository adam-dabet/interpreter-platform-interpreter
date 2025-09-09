import React from 'react';
import { 
  UserGroupIcon,
  UserIcon,
  BriefcaseIcon,
  ChartBarIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  MapPinIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';

const Sidebar = ({ currentView, setCurrentView, onLogout }) => {
  const navigation = [
    { 
      name: 'Applications', 
      view: 'applications', 
      icon: UserGroupIcon,
      description: 'Review interpreter applications'
    },
    { 
      name: 'Interpreters', 
      view: 'interpreters', 
      icon: UserIcon,
      description: 'Manage interpreter profiles'
    },
    { 
      name: 'Job Management', 
      view: 'jobs', 
      icon: BriefcaseIcon,
      description: 'Manage interpretation jobs'
    },
    { 
      name: 'Service Locations', 
      view: 'service-locations', 
      icon: MapPinIcon,
      description: 'Manage service locations'
    },
    { 
      name: 'Billing Accounts', 
      view: 'billing-accounts', 
      icon: CreditCardIcon,
      description: 'Manage billing accounts and rates'
    },
    { 
      name: 'Customers', 
      view: 'customers', 
      icon: UserGroupIcon,
      description: 'Manage customers and relationships'
    },
    { 
      name: 'Claimants', 
      view: 'claimants', 
      icon: UserIcon,
      description: 'Manage claimants and claims'
    },
    { 
      name: 'Analytics', 
      view: 'analytics', 
      icon: ChartBarIcon,
      description: 'View platform statistics'
    },
    { 
      name: 'Settings', 
      view: 'settings', 
      icon: CogIcon,
      description: 'Platform configuration'
    }
  ];

  return (
    <div className="w-64 bg-white shadow-lg h-full">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-center h-16 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Admin Portal</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            
            return (
              <button
                key={item.name}
                onClick={() => setCurrentView(item.view)}
                className={`
                  w-full flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors duration-200 text-left
                  ${isActive
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-3" />
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-4">
          <button
            onClick={onLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;



