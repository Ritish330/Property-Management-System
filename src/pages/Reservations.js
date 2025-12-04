  // src/pages/Reservations.js
  import React, { useState } from 'react';
  import {
    fetchReservationNotifications,
    fetchReservationDetails,
    fetchBookings,
  } from '../api/client';

  const DEFAULT_HOTEL_ID = 'TTBR';

  const Reservations = () => {
    const [hotelId, setHotelId] = useState(DEFAULT_HOTEL_ID);
    const [notifications, setNotifications] = useState([]);
    const [selectedNotifId, setSelectedNotifId] = useState('');
    const [detailsJson, setDetailsJson] = useState('');
    const [bookingsJson, setBookingsJson] = useState('');
    const [from, setFrom] = useState('10-01-2025'); // dd-mm-yyyy
    const [to, setTo] = useState('10-16-2025');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleFetchNotifications = async () => {
      try {
        setLoading(true);
        setMessage(null);
        const res = await fetchReservationNotifications(hotelId);
        const list =
          res?.data?.reservations ||
          res?.data?.reservation_notif ||
          res?.reservations ||
          [];
        setNotifications(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error(err);
        setMessage(err.message || 'Failed to fetch notifications');
      } finally {
        setLoading(false);
      }
    };

    const handleFetchDetails = async () => {
      if (!selectedNotifId) {
        setMessage('Select a notification id first.');
        return;
      }
      try {
        setLoading(true);
        setMessage(null);
        const res = await fetchReservationDetails(hotelId, [
          selectedNotifId,
        ]);
        setDetailsJson(JSON.stringify(res, null, 2));
      } catch (err) {
        console.error(err);
        setMessage(err.message || 'Failed to fetch details');
      } finally {
        setLoading(false);
      }
    };

    const handleFetchBookings = async () => {
      try {
        setLoading(true);
        setMessage(null);
        const res = await fetchBookings(hotelId, from, to);
        setBookingsJson(JSON.stringify(res, null, 2));
      } catch (err) {
        console.error(err);
        setMessage(err.message || 'Failed to fetch bookings');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div>
        <h1>Reservations</h1>

        {message && (
          <p style={{ color: '#b30000', marginBottom: 12 }}>{message}</p>
        )}

        <section style={{ marginBottom: 28 }}>
          <h3>1. Reservation Notifications (pull)</h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 10,
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
            <button
              onClick={handleFetchNotifications}
              disabled={loading}
            >
              {loading ? 'Fetching…' : 'Fetch notifications'}
            </button>
          </div>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: 8,
            }}
          >
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ccc' }}>
                  reservation_notif_id
                </th>
                <th style={{ borderBottom: '1px solid #ccc' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n, idx) => {
                const id =
                  n.reservation_notif_id || n.id || n.reservationid;
                const status = n.status || n.ResStatus || '-';
                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedNotifId(id)}
                    style={{
                      backgroundColor:
                        selectedNotifId === id ? '#e5f1ff' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ padding: 4 }}>{id}</td>
                    <td style={{ padding: 4 }}>{status}</td>
                  </tr>
                );
              })}
              {notifications.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ padding: 4 }}>
                    No notifications (try fetch).
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <button onClick={handleFetchDetails} disabled={loading}>
            {loading ? 'Loading details…' : 'Fetch detail for selected'}
          </button>

          <textarea
            value={detailsJson}
            readOnly
            placeholder="Reservation details will appear here"
            style={{
              marginTop: 10,
              width: '100%',
              minHeight: 200,
              fontFamily: 'monospace',
              fontSize: 12,
            }}
          />
        </section>

        <section>
          <h3>2. Booking repull (list of bookings)</h3>
          <div
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <label>
              From (dd-mm-yyyy):{' '}
              <input
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                style={{ padding: 4 }}
              />
            </label>
            <label>
              To:{' '}
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                style={{ padding: 4 }}
              />
            </label>
            <button onClick={handleFetchBookings} disabled={loading}>
              {loading ? 'Fetching…' : 'Fetch bookings'}
            </button>
          </div>

          <textarea
            value={bookingsJson}
            readOnly
            placeholder="Bookings repull response will appear here"
            style={{
              width: '100%',
              minHeight: 200,
              fontFamily: 'monospace',
              fontSize: 12,
            }}
          />
        </section>
      </div>
    );
  };

  export default Reservations;
