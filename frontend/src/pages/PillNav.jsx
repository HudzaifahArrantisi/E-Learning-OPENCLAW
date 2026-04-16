import React from 'react';
import { Link } from 'react-router-dom';

const PillNav = ({ 
  logo, 
  logoAlt = 'Logo',
  items = [], 
  activeHref = '/',
}) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pt-5 pb-3 px-6">
      <div className="bg-lp-surface/80 backdrop-blur-2xl border border-lp-border rounded-full px-2 py-1.5 flex items-center gap-1 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 px-3 py-1.5">
          {logo && (
            <img src={logo} alt={logoAlt} className="w-5 h-5" />
          )}
          <span className="text-[12px] font-bold text-lp-text tracking-tight hidden sm:inline">Student Hub</span>
        </Link>

        <div className="w-px h-5 bg-lp-border mx-1" />

        {/* Nav Items */}
        {items.map((item, index) => {
          const isActive = item.href === activeHref;
          return (
            <Link
              key={index}
              to={item.href}
              className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-lp-text text-white'
                  : 'text-lp-text2 hover:text-lp-text hover:bg-lp-surface'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default PillNav;
