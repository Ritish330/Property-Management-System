  // import logo from './logo.svg';
  // import './App.css';

  // function App() {
  //   return (
  //     <div className="App">
  //       <header className="App-header">
  //         <img src={logo} className="App-logo" alt="logo" />
  //         <p>
  //           Edit <code>src/App.js</code> and save to reload.
  //         </p>
  //         <a
  //           className="App-link"
  //           href="https://reactjs.org"
  //           target="_blank"
  //           rel="noopener noreferrer"
  //         >
  //           Learn React
  //         </a>
  //       </header>
  //     </div>
  //   );
  // }

  // export default App;

  // src/App.js
  import React from 'react';
  import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
  import Layout from './components/Layout';
  import Dashboard from './pages/Dashboard';
  import Property from './pages/Property';
  import RoomTypes from './pages/RoomTypes';
  import RatePlans from './pages/RatePlans';
  import Availability from './pages/Availability';
  import Reservations from './pages/Reservations';

  function App() {
    return (
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/property" element={<Property />} />
            <Route path="/room-types" element={<RoomTypes />} />
            <Route path="/rate-plans" element={<RatePlans />} />
            <Route path="/availability" element={<Availability />} />
            <Route path="/reservations" element={<Reservations />} />
          </Routes>
        </Layout>
      </Router>
    );
  }

  export default App;
