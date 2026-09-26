import React, { NavLink } from 'react-router-dom';
import { Gift, Sliders } from 'lucide-react';

const ReferralTabs = ({ activeTab = 'referrals' }) => {
  return (
    <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
      <NavLink
        to="/referrals"
        end
        aria-label="Referrals"
        title="Referrals"
        className={({ isActive }) =>
          `inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isActive || activeTab === 'referrals'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white'
          }`
        }
      >
        <Gift className="w-4 h-4" />
        <span className="hidden sm:inline">Referrals</span>
      </NavLink>

      <NavLink
        to="/referrals/configuration"
        aria-label="Referrals Configuration"
        title="Referrals Configuration"
        className={({ isActive }) =>
          `inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isActive || activeTab === 'configuration'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white'
          }`
        }
      >
        <Sliders className="w-4 h-4" />
        <span className="hidden sm:inline">Referrals Configuration</span>
      </NavLink>
    </div>
  );
};

export default ReferralTabs;
