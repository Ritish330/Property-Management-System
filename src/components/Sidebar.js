  // src/components/Sidebar.js
  import React from 'react';
  import { NavLink } from 'react-router-dom';
  import './Sidebar.css';

  const Sidebar = () => {
    return (
      <div className="sidebar">
        <div className="sidebar-title">Su Admin Portal</div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className="sidebar-link">
            Dashboard
          </NavLink>
          <NavLink to="/property" className="sidebar-link">
            Property
          </NavLink>
          <NavLink to="/room-types" className="sidebar-link">
            Room Types
          </NavLink>
          <NavLink to="/rate-plans" className="sidebar-link">
            Rate Plans
          </NavLink>
          <NavLink to="/availability" className="sidebar-link">
            Availability
          </NavLink>
          <NavLink to="/reservations" className="sidebar-link">
            Reservations
          </NavLink>
        </nav>
      </div>
    );
  };

  export default Sidebar;
