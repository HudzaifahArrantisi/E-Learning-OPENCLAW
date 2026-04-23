import React from 'react';
import { Link } from 'react-router-dom';
import { FaBars } from 'react-icons/fa';
import useAuth from '../hooks/useAuth';
import useProfile from '../hooks/useProfile';
import { getProfilePhotoUrl } from '../utils/profileUtils';

const Navbar = ({ onMenuToggle, onToggleSidebar }) => {
  const { user: authUser } = useAuth();
  const { data: profile } = useProfile();

  const handleMenuToggle = () => {
    const toggleHandler = onMenuToggle || onToggleSidebar;

    if (typeof toggleHandler === 'function') {
      toggleHandler();
      return;
    }

    window.dispatchEvent(new CustomEvent('nf-sidebar-toggle'));
  };

  const displayName = profile?.name || authUser?.name || 'User';
  const roleName = authUser?.role || profile?.role || '';
  const photo = profile?.profile_picture || profile?.photo || authUser?.profile_picture || authUser?.photo;
  const roleProfilePath = {
    mahasiswa: '/mahasiswa/profile',
    dosen: '/dosen',
    admin: '/admin/akun',
    ukm: '/ukm/akun',
    ormawa: '/ormawa/akun',
    orangtua: '/ortu',
  }[roleName?.toLowerCase()] || '/';

  return (
    <div className="bg-white/80 backdrop-blur-2xl border-b border-lp-border px-5 py-3.5 sticky top-0 z-40 w-full">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        
        <div className="flex items-center gap-4">
          {/* Hamburger */}
          <button
            onClick={handleMenuToggle}
            className="lg:hidden text-lp-text2 hover:text-lp-text p-2 hover:bg-lp-surface rounded-xl transition-all"
            aria-label="Buka menu"
            type="button"
          >
            <FaBars className="text-lg" />
          </button>

          {/* User */}
          <div className="flex items-center gap-3">
            <Link to={roleProfilePath} className="w-9 h-9 bg-lp-accentS border border-lp-borderA 
              rounded-xl flex items-center justify-center 
              text-lp-atext font-bold text-xs overflow-hidden">
              {photo ? (
                <img 
                  src={getProfilePhotoUrl(photo)} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-full h-full flex items-center justify-center ${photo ? 'hidden' : 'flex'}`}>
                {displayName?.[0]?.toUpperCase() || 'U'}
              </div>
            </Link>
            <div className="flex flex-col">
              <Link to={roleProfilePath} className="text-[13px] font-semibold text-lp-text tracking-tight hover:underline max-w-[120px] sm:max-w-xs truncate">{displayName}</Link>
              <p className="text-[10px] text-lp-text3 capitalize font-mono tracking-wider">{roleName}</p>
            </div>
          </div>
        </div>

        {/* Logo */}
        <Link 
          to="/" 
          className="flex items-center gap-2"
        >
          <div className="w-7 h-7 rounded-lg bg-lp-accentS border border-lp-borderA flex items-center justify-center">
            <svg className="w-3.5 h-3.5 stroke-lp-accent fill-none stroke-2 [stroke-linecap:round]" viewBox="0 0 24 24">
              <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
              <path d="M6 12v5c3.33 1.67 8.67 1.67 12 0v-5" />
            </svg>
          </div>
          <span className="text-[13px] font-bold text-lp-text tracking-[0.05em]">
            STUDENT-HUB
          </span>
        </Link>

        <div className="w-10 h-10"></div>
      </div>
    </div>
  );
};

export default Navbar;
