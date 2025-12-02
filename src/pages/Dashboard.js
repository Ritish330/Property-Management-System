// src/pages/Dashboard.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchProperties,
  fetchRoomTypes,
  fetchRatePlans,
} from '../api/client';

const Dashboard = () => {
  const navigate = useNavigate();

  const [properties, setProperties] = useState([]);
  const [hotelId, setHotelId] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    propertyCount: 0,
    propertyName: '',
    roomTypeCount: 0,
    ratePlanCount: 0,
  });
  const [error, setError] = useState(null);

  // Load properties list
  useEffect(() => {
    const loadProperties = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetchProperties();
        const list = res?.data?.properties || [];

        setProperties(list);

        setSummary((prev) => ({
          ...prev,
          propertyCount: list.length,
        }));

        if (!hotelId && list.length > 0) {
          setHotelId(list[0].propertyid);
        }
      } catch (err) {
        console.error('Error loading properties:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, [hotelId]); // run once

  // Load per-hotel data
  useEffect(() => {
    if (!hotelId) return;

    const loadForHotel = async () => {
      try {
        setLoading(true);
        setError(null);

        const [roomsRes, ratesRes] = await Promise.all([
          fetchRoomTypes(hotelId),
          fetchRatePlans(hotelId),
        ]);

        // property name from list
        const selected = properties.find((p) => p.propertyid === hotelId);
        const propertyName = selected?.propertyname || 'Unknown';

        // room types count
        const roomsArray = roomsRes?.data?.rooms || [];
        const roomIds = roomsArray.map((r) => r.roomid).filter(Boolean);
        const uniqueRoomCount = new Set(roomIds).size;

        // rate plans count
        const ratePlansArray = ratesRes?.data?.rateplans || [];
        const rpIds = ratePlansArray.map((r) => r.rateplanid).filter(Boolean);
        const uniqueRpCount = new Set(rpIds).size;

        setSummary((prev) => ({
          ...prev,
          propertyName,
          roomTypeCount: uniqueRoomCount,
          ratePlanCount: uniqueRpCount,
        }));
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadForHotel();
  }, [hotelId, properties]);

  const hotelOptions = properties.map((p) => ({
    id: p.propertyid,
    name: p.propertyname,
  }));

  // Small helper for clickable values
  const clickableValueStyle = {
    cursor: 'pointer',
    color: '#0d6efd',
    textDecoration: 'underline',
    display: 'inline-block',
    marginTop: 8,
  };

  return (
    <div>
      <h1>Dashboard</h1>

      {/* Hotel selector */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <label style={{ fontWeight: 500 }}>Hotel Id:</label>
        <select
          value={hotelId}
          onChange={(e) => setHotelId(e.target.value)}
          style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid #ccc' }}
        >
          {hotelOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.id} – {opt.name}
            </option>
          ))}
        </select>
      </div>

      <p style={{ color: '#666', marginBottom: 24 }}>
        Sandbox summary for <strong>{hotelId}</strong>
      </p>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 16,
          }}
        >
          {/* Total Properties → Property page */}
          <div className="card">
            <h3>Total Properties</h3>
            <p
              style={clickableValueStyle}
              onClick={() => navigate('/property')}
              title="Go to Property page"
            >
              {summary.propertyCount}
            </p>
          </div>

          {/* Property Name → Property page */}
          <div className="card">
            <h3>Property Name</h3>
            <p
              style={clickableValueStyle}
              onClick={() => navigate('/property')}
              title="Go to Property page"
            >
              {summary.propertyName}
            </p>
          </div>

          {/* Room Types → Room Types page */}
          <div className="card">
            <h3>Room Types</h3>
            <p
              style={clickableValueStyle}
              onClick={() => navigate('/room-types')}
              title="Go to Room Types page"
            >
              {summary.roomTypeCount}
            </p>
          </div>

          {/* Rate Plans → Rate Plans page */}
          <div className="card">
            <h3>Rate Plans</h3>
            <p
              style={clickableValueStyle}
              onClick={() => navigate('/rate-plans')}
              title="Go to Rate Plans page"
            >
              {summary.ratePlanCount}
            </p>
          </div>
        </div>
      )}

      <p style={{ marginTop: 24, fontSize: 13, color: '#777' }}>
        Data above is pulled live from your Node backend (Su / STA AH sandbox APIs).
      </p>
    </div>
  );
};

export default Dashboard;
