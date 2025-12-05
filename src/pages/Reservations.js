import React, { useState, useEffect } from 'react';
import { fetchReservationNotifications, fetchProperties } from '../api/client';
import LoaderOverlay from '../components/LoaderOverlay';
import MessageDialog from '../components/MessageDialog';
import './Reservations.css';

/* --- Helper: Status Badge --- */
const StatusBadge = ({ status }) => {
  const getStyle = (s) => {
    switch (s?.toLowerCase()) {
      case 'new': return 'res-badge-green';
      case 'modified': return 'res-badge-blue';
      case 'cancelled': return 'res-badge-red';
      case 'request': return 'res-badge-orange';
      default: return 'res-badge-gray';
    }
  };
  return <span className={`res-badge ${getStyle(status)}`}>{status}</span>;
};

/* --- Helper: Reservation Card --- */
const ReservationCard = ({ data }) => {
  const [expanded, setExpanded] = useState(false);
  const guest = data.customer || {};
  const room = data.rooms?.[0] || {}; 

  return (
    <div className="res-card">
      {/* Summary Header */}
      <div className="res-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="res-card-main-info">
          <div className="res-id-group">
            <span className="res-label">ID:</span>
            <span className="res-id">{data.id}</span>
            <StatusBadge status={data.status} />
          </div>
          <div className="res-guest-name">
            {guest.first_name} {guest.last_name}
          </div>
        </div>
        
        <div className="res-card-meta">
          <div className="res-meta-item">
            <span className="res-label">Check-In</span>
            <span>{room.arrival_date}</span>
          </div>
          <div className="res-meta-item">
            <span className="res-label">Total</span>
            <span className="res-price">{data.currencycode} {data.totalprice}</span>
          </div>
          <div className="res-expand-icon">{expanded ? '▲' : '▼'}</div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="res-card-body">
          <hr className="res-divider"/>
          
          <div className="res-grid-2">
            {/* Guest Info */}
            <div className="res-section">
              <h4>Guest Details</h4>
              <p><strong>Email:</strong> {guest.email}</p>
              <p><strong>Phone:</strong> {guest.telephone}</p>
              <p><strong>Address:</strong> {guest.address}, {guest.city}, {guest.countrycode}</p>
              {guest.remarks && <p className="res-remarks"><strong>Note:</strong> {guest.remarks}</p>}
            </div>

            {/* Payment Info */}
            <div className="res-section">
              <h4>Payment ({data.paymenttype})</h4>
              {guest.cc_number ? (
                <>
                  <p><strong>Card:</strong> {guest.cc_type} ending in {String(guest.cc_number).slice(-4)}</p>
                  <p><strong>Exp:</strong> {guest.cc_expiration_date}</p>
                  <p><strong>Balance:</strong> {guest.cc_current_balance}</p>
                </>
              ) : (
                <p className="res-muted">No Credit Card details provided</p>
              )}
              <div className="res-fin-row">
                <span>Commission:</span>
                <span>{data.commissionamount}</span>
              </div>
              <div className="res-fin-row">
                <span>Tax:</span>
                <span>{data.totaltax}</span>
              </div>
            </div>
          </div>

          {/* Rooms List */}
          <div className="res-section">
            <h4>Room Breakdown</h4>
            {data.rooms?.map((r, idx) => (
              <div key={idx} className="res-room-row">
                <div className="res-room-header">
                  <strong>{r.bed_type || 'Standard'} Room</strong> ({r.numberofadults} Ad, {r.numberofchildren} Ch)
                </div>
                <div className="res-room-dates">
                  {r.arrival_date} ➔ {r.departure_date}
                </div>
                <div className="res-rate-breakdown">
                  {r.price?.map((day, dIdx) => (
                    <div key={dIdx} className="res-daily-rate">
                      <span>{day.date}:</span>
                      <span>{day.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Raw Data Toggle */}
          <details className="res-raw-details">
            <summary>View Raw JSON</summary>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

/* --- Main Page Component --- */
const Reservations = () => {
  const [loading, setLoading] = useState(false);
  const [hotels, setHotels] = useState([]);
  const [dialog, setDialog] = useState({ open: false, title: '', message: '', type: 'info' });

  // --- PERSISTENT STATE LOGIC ---

  // 1. Hotel ID: Initialize from sessionStorage if available
  const [hotelId, setHotelId] = useState(() => {
    return sessionStorage.getItem('res_hotelId') || '';
  });

  // 2. Reservations Data: Initialize from sessionStorage
  const [reservations, setReservations] = useState(() => {
    const saved = sessionStorage.getItem('res_data');
    return saved ? JSON.parse(saved) : [];
  });

  // 3. Active Tab: Initialize from sessionStorage
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('res_activeTab') || 'all';
  });

  // --- EFFECTS TO SAVE STATE ---

  // Save Hotel ID whenever it changes
  useEffect(() => {
    sessionStorage.setItem('res_hotelId', hotelId);
  }, [hotelId]);

  // Save Reservations Data whenever it changes
  useEffect(() => {
    sessionStorage.setItem('res_data', JSON.stringify(reservations));
  }, [reservations]);

  // Save Active Tab whenever it changes
  useEffect(() => {
    sessionStorage.setItem('res_activeTab', activeTab);
  }, [activeTab]);


  // 1. Load Hotels
  useEffect(() => {
    fetchProperties().then(res => {
      const list = res?.data?.properties || [];
      setHotels(list);
      
      // Only set default hotel ID if we don't have one saved in session yet
      if (list.length > 0 && !hotelId) {
        setHotelId(list[0].propertyid);
      }
    }).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs once on mount

  // 2. Fetch Reservations Action
  const handleRetrieve = async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      const res = await fetchReservationNotifications(hotelId);
      
      // Handle response structure
      const list = res?.reservations || res?.data?.reservations || [];
      
      if (list.length === 0) {
        setDialog({ open: true, title: 'No New Bookings', message: 'The reservation queue is empty.', type: 'info' });
        // Optional: Do NOT clear the list if queue is empty, so user can see previous fetch. 
        // If you want to clear on empty queue, uncomment below:
        // setReservations([]); 
      } else {
        setReservations(list);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setDialog({ open: true, title: 'Error', message: err.message || 'Failed to retrieve bookings', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 3. Filter Logic
  const filteredList = reservations.filter(r => {
    if (activeTab === 'all') return true;
    return r.status?.toLowerCase() === activeTab;
  });

  return (
    <div className="res-page">
      <LoaderOverlay open={loading} />
      
      <div className="res-header">
        <h1>Reservations Queue</h1>
        <p>Retrieve pending bookings from the channel manager.</p>
      </div>

      {/* Toolbar */}
      <div className="res-toolbar">
        <div className="res-hotel-select">
          <label>Select Property:</label>
          <select value={hotelId} onChange={(e) => setHotelId(e.target.value)}>
            {hotels.map(h => <option key={h.propertyid} value={h.propertyid}>{h.propertyname}</option>)}
          </select>
        </div>
        <button className="res-retrieve-btn" onClick={handleRetrieve} disabled={loading || !hotelId}>
          {loading ? 'Checking Queue...' : '📥 Retrieve Pending Reservations'}
        </button>
      </div>

      {/* Tabs */}
      {reservations.length > 0 && (
        <div className="res-tabs">
          {['all', 'new', 'modified', 'cancelled'].map(tab => (
            <button 
              key={tab} 
              className={`res-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} 
              <span className="res-count">
                ({reservations.filter(r => tab === 'all' ? true : r.status?.toLowerCase() === tab).length})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* List Area */}
      <div className="res-list-container">
        {reservations.length === 0 ? (
          <div className="res-empty-state">
            <div className="res-empty-icon">📭</div>
            <h3>No reservations loaded</h3>
            <p>Select a property and click "Retrieve" to check for new messages.</p>
          </div>
        ) : (
          <div className="res-grid">
            {filteredList.map((res, index) => (
              <ReservationCard key={res.id || index} data={res} />
            ))}
            {filteredList.length === 0 && (
              <div className="res-no-results">No reservations found in this tab.</div>
            )}
          </div>
        )}
      </div>

      <MessageDialog 
        open={dialog.open} 
        title={dialog.title} 
        message={dialog.message} 
        onClose={() => setDialog({ ...dialog, open: false })} 
      />
    </div>
  );
};

export default Reservations;