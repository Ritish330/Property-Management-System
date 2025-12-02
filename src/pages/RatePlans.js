// src/pages/RatePlans.js
import React, { useState } from 'react';
import { fetchRatePlans, pushRatePlans } from '../api/client';

const DEFAULT_HOTEL_ID = 'TTBR';

const RatePlans = () => {
  const [hotelId, setHotelId] = useState(DEFAULT_HOTEL_ID);
  const [rateData, setRateData] = useState(null);
  const [rawJson, setRawJson] = useState('');
  const [pushJson, setPushJson] = useState(
    `{
  "RatePlans": {
    "hotelid": "${DEFAULT_HOTEL_ID}",
    "RatePlan": []
  }
}`
  );
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [loadingPush, setLoadingPush] = useState(false);
  const [message, setMessage] = useState(null);

  const handleFetch = async () => {
    try {
      setLoadingFetch(true);
      setMessage(null);
      const res = await fetchRatePlans(hotelId);
      setRateData(res.data || res);
      setRawJson(JSON.stringify(res, null, 2));
    } catch (err) {
      setMessage(err.message || 'Failed to fetch rate plans');
    } finally {
      setLoadingFetch(false);
    }
  };

  const handlePush = async () => {
    try {
      setLoadingPush(true);
      setMessage(null);
      const payload = JSON.parse(pushJson);
      const res = await pushRatePlans(payload);
      setMessage('Push successful. See raw response below.');
      setRawJson(JSON.stringify(res, null, 2));
    } catch (err) {
      console.error(err);
      setMessage(
        err.message || 'Failed to push rate plans (check JSON)'
      );
    } finally {
      setLoadingPush(false);
    }
  };

  const getRateRows = () => {
    const rp = rateData?.data?.RatePlans?.RatePlan ||
      rateData?.RatePlans?.RatePlan ||
      [];
    return Array.isArray(rp) ? rp : [];
  };

  return (
    <div>
      <h1>Rate Plans</h1>

      <div
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <label>
          Hotel ID:{' '}
          <input
            value={hotelId}
            onChange={(e) => setHotelId(e.target.value)}
            style={{ padding: 4 }}
          />
        </label>
        <button onClick={handleFetch} disabled={loadingFetch}>
          {loadingFetch ? 'Fetching…' : 'Fetch from STA AH'}
        </button>
      </div>

      {message && (
        <p style={{ color: '#b30000', marginBottom: 16 }}>{message}</p>
      )}

      <h3>Existing Rate Plans</h3>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: 16,
        }}
      >
        <thead>
          <tr>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>
              rateplanid
            </th>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>
              Name
            </th>
          </tr>
        </thead>
        <tbody>
          {getRateRows().map((rp, idx) => (
            <tr key={idx}>
              <td style={{ padding: 4 }}>{rp.rateplanid}</td>
              <td style={{ padding: 4 }}>
                {rp.Description?.Name || rp.Description?.Text || '-'}
              </td>
            </tr>
          ))}
          {getRateRows().length === 0 && (
            <tr>
              <td colSpan={2} style={{ padding: 4 }}>
                No data (fetch first).
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h3>Push Rate Plans (STA AH JSON)</h3>
      <p style={{ fontSize: 13, color: '#666' }}>
        Paste a valid <code>RatePlans</code> payload here (same as
        Postman).
      </p>
      <textarea
        value={pushJson}
        onChange={(e) => setPushJson(e.target.value)}
        style={{
          width: '100%',
          minHeight: 220,
          fontFamily: 'monospace',
          fontSize: 12,
        }}
      />
      <div style={{ marginTop: 8 }}>
        <button onClick={handlePush} disabled={loadingPush}>
          {loadingPush ? 'Pushing…' : 'Push to STA AH'}
        </button>
      </div>

      <h3 style={{ marginTop: 24 }}>Last Response (raw)</h3>
      <textarea
        value={rawJson}
        readOnly
        style={{
          width: '100%',
          minHeight: 200,
          fontFamily: 'monospace',
          fontSize: 12,
        }}
      />
    </div>
  );
};

export default RatePlans;
