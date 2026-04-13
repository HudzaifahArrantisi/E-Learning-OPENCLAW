import React from 'react';
import { Link } from 'react-router-dom';
import { FaBars } from 'react-icons/fa';
import useAuth from '../hooks/useAuth';

const Navbar = ({ onMenuToggle, onToggleSidebar }) => {
  const { user: authUser } = useAuth();

  const handleMenuToggle = () => {
    const toggleHandler = onMenuToggle || onToggleSidebar;

    if (typeof toggleHandler === 'function') {
      toggleHandler();
      return;
    }

    window.dispatchEvent(new CustomEvent('nf-sidebar-toggle'));
  };

  return (
    <div className="bg-white shadow-md px-4 py-3 sticky top-0 z-40 w-full">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        
        <div className="flex items-center space-x-4">

          {/* Hamburger */}
          <button
            onClick={handleMenuToggle}
            className="lg:hidden text-gray-700 hover:text-purple-600 transition"
            aria-label="Buka menu"
            type="button"
          >
            <FaBars className="text-2xl" />
          </button>

          {/* User */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-orange-500 
              rounded-full flex items-center justify-center 
              text-white font-bold text-sm shadow-md">
              {authUser?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold">{authUser?.name || 'User'}</p>
              <p className="text-xs text-gray-500 capitalize">{authUser?.role}</p>
            </div>
          </div>
        </div>

        {/* Logo */}
        <Link 
          to="/" 
          className="text-base sm:text-lg md:text-xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-500 
                     bg-clip-text text-transparent tracking-wide select-none"
        >
          NF Student HUB
        </Link>

        <div className="w-10 h-10"></div>
      </div>
    </div>
  );
};

export default Navbar;
