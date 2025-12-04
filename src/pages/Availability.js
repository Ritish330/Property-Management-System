  // // src/pages/Availability.js
  // import React, { useState } from 'react';
  // import { pushAvailability } from '../api/client';

  // const DEFAULT_HOTEL_ID = 'TTBR';

  // const Availability = () => {
  //   const [payloadJson, setPayloadJson] = useState(
  //     `{
  //   "hotelid": "${DEFAULT_HOTEL_ID}",
  //   "room": []
  // }`
  //   );
  //   const [loading, setLoading] = useState(false);
  //   const [message, setMessage] = useState(null);
  //   const [rawResponse, setRawResponse] = useState('');

  //   const handlePush = async () => {
  //     try {
  //       setLoading(true);
  //       setMessage(null);
  //       const payload = JSON.parse(payloadJson);
  //       const res = await pushAvailability(payload);
  //       setMessage('Availability push successful.');
  //       setRawResponse(JSON.stringify(res, null, 2));
  //     } catch (err) {
  //       console.error(err);
  //       setMessage(
  //         err.message || 'Failed to push availability (check JSON)'
  //       );
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   return (
  //     <div>
  //       <h1>Availability & Rates</h1>
  //       <p style={{ fontSize: 13, color: '#666' }}>
  //         Paste a valid STA AH <code>/availability</code> payload here
  //         (same format as docs / Postman).
  //       </p>

  //       {message && (
  //         <p style={{ color: message.includes('Failed') ? 'red' : 'green' }}>
  //           {message}
  //         </p>
  //       )}

  //       <textarea
  //         value={payloadJson}
  //         onChange={(e) => setPayloadJson(e.target.value)}
  //         style={{
  //           width: '100%',
  //           minHeight: 260,
  //           fontFamily: 'monospace',
  //           fontSize: 12,
  //         }}
  //       />

  //       <div style={{ marginTop: 8 }}>
  //         <button onClick={handlePush} disabled={loading}>
  //           {loading ? 'Pushing…' : 'Push availability to STA AH'}
  //         </button>
  //       </div>

  //       <h3 style={{ marginTop: 24 }}>Last Response (raw)</h3>
  //       <textarea
  //         value={rawResponse}
  //         readOnly
  //         style={{
  //           width: '100%',
  //           minHeight: 200,
  //           fontFamily: 'monospace',
  //           fontSize: 12,
  //         }}
  //       />
  //     </div>
  //   );
  // };

  // export default Availability;

  import React, { useState, useEffect } from 'react';
  import { pushAvailability, fetchProperties } from '../api/client';
  import LoaderOverlay from '../components/LoaderOverlay';
  import MessageDialog from '../components/MessageDialog';
  import './Availability.css'; // We will define this CSS below

  /* --- Helper Components --- */

  const BooleanToggle = ({ label, value, onChange }) => (
    <div className="av-toggle-field">
      <label className="av-toggle-label">{label}</label>
      <div className="av-toggle-switch" onClick={() => onChange(!value)}>
        <div className={`av-switch-track ${value ? 'av-active' : ''}`}>
          <div className="av-switch-knob" />
        </div>
        <span className="av-toggle-status">{value ? 'Yes' : 'No'}</span>
      </div>
    </div>
  );

  const SectionHeader = ({ title, subtitle }) => (
    <div className="av-section-header">
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );

  /* --- Main Component --- */

  const Availability = () => {
    // --- State ---
    const [loading, setLoading] = useState(false);
    const [hotels, setHotels] = useState([]);
    const [dialog, setDialog] = useState({ open: false, title: '', message: '', type: 'info' });

    // Form State
    const [hotelId, setHotelId] = useState('');
    const [roomId, setRoomId] = useState('');
    
    // Date Mode: 'single' or 'range'
    const [dateMode, setDateMode] = useState('range');
    const [dateData, setDateData] = useState({
      single: new Date().toISOString().split('T')[0],
      from: new Date().toISOString().split('T')[0],
      to: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
    });

    // Core Data
    const [inventory, setInventory] = useState({
      roomstosell: '',
      closed: false,
      closedonarrival: false,
      closedondeparture: false,
      minimumstay: '',
      maximumstay: '',
    });

    // Dynamic Arrays
    const [ratePlans, setRatePlans] = useState([]); // [{ rateplanid: 'BAR' }]
    const [prices, setPrices] = useState([{ guests: '1', amount: '' }, { guests: '2', amount: '' }]);
    const [losPrices, setLosPrices] = useState([]); // [{ guests: '1', values: '' }]

    // --- Effects ---
    useEffect(() => {
      fetchProperties().then(res => {
        const list = res?.data?.properties || [];
        setHotels(list);
        if (list.length > 0) setHotelId(list[0].propertyid);
      }).catch(console.error);
    }, []);

    // --- Handlers ---
    
    const handleInventoryChange = (field, value) => {
      setInventory(prev => ({ ...prev, [field]: value }));
    };

    const addRatePlan = () => setRatePlans([...ratePlans, { rateplanid: '' }]);
    const removeRatePlan = (idx) => setRatePlans(ratePlans.filter((_, i) => i !== idx));
    const updateRatePlan = (idx, val) => {
      const newRates = [...ratePlans];
      newRates[idx].rateplanid = val;
      setRatePlans(newRates);
    };

    const addPriceRow = () => setPrices([...prices, { guests: '', amount: '' }]);
    const removePriceRow = (idx) => setPrices(prices.filter((_, i) => i !== idx));
    const updatePriceRow = (idx, field, val) => {
      const newPrices = [...prices];
      newPrices[idx][field] = val;
      setPrices(newPrices);
    };

    const addLosRow = () => setLosPrices([...losPrices, { guests: '', values: '' }]);
    const removeLosRow = (idx) => setLosPrices(losPrices.filter((_, i) => i !== idx));
    const updateLosRow = (idx, field, val) => {
      const newLos = [...losPrices];
      newLos[idx][field] = val;
      setLosPrices(newLos);
    };

    // --- Submission ---

    const constructPayload = () => {
      // 1. Build Price Array
      const priceArray = prices
        .filter(p => p.guests && p.amount)
        .map(p => ({ NumberOfGuests: p.guests, value: p.amount }));

      // 2. Build LOS Price Array
      const losArray = losPrices
        .filter(l => l.guests && l.values)
        .map(l => ({ NumberOfGuests: l.guests, value: l.values }));

      // 3. Build Rate Plan Array
      const rateArray = ratePlans
        .filter(r => r.rateplanid)
        .map(r => ({ rateplanid: r.rateplanid }));

      // 4. Build Date Object
      const dateObj = {
        // Conditionally add 'value' OR 'from/to'
        ...(dateMode === 'single' ? { value: dateData.single } : { from: dateData.from, to: dateData.to }),
        
        // Restrictions & Inventory
        ...(inventory.roomstosell ? { roomstosell: inventory.roomstosell } : {}),
        ...(inventory.minimumstay ? { minimumstay: inventory.minimumstay } : {}),
        ...(inventory.maximumstay ? { maximumstay: inventory.maximumstay } : {}),
        
        // Booleans (API expects "1" or "0", or boolean in some cases, documentation implies "0"/"1" strings in samples but boolean in types. Let's send strings to be safe based on sample)
        closed: inventory.closed ? "1" : "0",
        closedonarrival: inventory.closedonarrival ? "1" : "0",
        closedondeparture: inventory.closedondeparture ? "1" : "0",

        // Nested Arrays
        ...(rateArray.length ? { rate: rateArray } : {}),
        ...(priceArray.length ? { price: priceArray } : {}),
        ...(losArray.length ? { LosPrice: losArray } : {}),
      };

      return {
        hotelid: hotelId,
        room: [
          {
            roomid: roomId,
            date: [dateObj]
          }
        ]
      };
    };

    const handleSubmit = async () => {
      if (!hotelId || !roomId) {
        setDialog({ open: true, title: 'Validation Error', message: 'Hotel ID and Room ID are required.', type: 'error' });
        return;
      }

      const payload = constructPayload();

      try {
        setLoading(true);
        const res = await pushAvailability(payload);
        const isSuccess = res?.Status === 'Success' || res?.data?.Status === 'Success';
        
        if (isSuccess) {
          setDialog({ 
            open: true, 
            title: 'Success', 
            message: `Update pushed successfully. Ticket ID: ${res.TicketId || res.data?.TicketId || 'N/A'}`, 
            type: 'success' 
          });
        } else {
          throw new Error(res?.error?.Errors?.[0]?.ShortText || 'Unknown error');
        }
      } catch (err) {
        setDialog({ open: true, title: 'Push Failed', message: err.message, type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="av-page">
        <LoaderOverlay open={loading} />
        
        <div className="av-header">
          <h1>Rates & Availability</h1>
          <p>Push inventory, rates, and restrictions to channels.</p>
        </div>

        <div className="av-container">
          
          {/* --- LEFT COLUMN: Configuration --- */}
          <div className="av-form-column">
            
            {/* 1. Target Property & Room */}
            <div className="av-card">
              <SectionHeader title="Target" />
              <div className="av-grid-2">
                <div className="av-field">
                  <label>Hotel</label>
                  <select value={hotelId} onChange={e => setHotelId(e.target.value)}>
                    <option value="">Select Property...</option>
                    {hotels.map(h => <option key={h.propertyid} value={h.propertyid}>{h.propertyname}</option>)}
                  </select>
                </div>
                <div className="av-field">
                  <label>Room ID (Code)</label>
                  <input 
                    value={roomId} 
                    onChange={e => setRoomId(e.target.value)} 
                    placeholder="e.g. STD, DLX"
                  />
                </div>
              </div>
            </div>

            {/* 2. Date Selection */}
            <div className="av-card">
              <SectionHeader title="Date Range" subtitle="Max 730 days in future" />
              
              <div className="av-tabs">
                <button 
                  className={`av-tab ${dateMode === 'range' ? 'active' : ''}`}
                  onClick={() => setDateMode('range')}
                >
                  Date Range
                </button>
                <button 
                  className={`av-tab ${dateMode === 'single' ? 'active' : ''}`}
                  onClick={() => setDateMode('single')}
                >
                  Single Date
                </button>
              </div>

              <div className="av-tab-content">
                {dateMode === 'range' ? (
                  <div className="av-grid-2">
                    <div className="av-field">
                      <label>From</label>
                      <input type="date" value={dateData.from} onChange={e => setDateData({...dateData, from: e.target.value})} />
                    </div>
                    <div className="av-field">
                      <label>To</label>
                      <input type="date" value={dateData.to} onChange={e => setDateData({...dateData, to: e.target.value})} />
                    </div>
                  </div>
                ) : (
                  <div className="av-field">
                    <label>Date</label>
                    <input type="date" value={dateData.single} onChange={e => setDateData({...dateData, single: e.target.value})} />
                  </div>
                )}
              </div>
            </div>

            {/* 3. Inventory & Restrictions */}
            <div className="av-card">
              <SectionHeader title="Inventory & Restrictions" />
              
              <div className="av-grid-3">
                <div className="av-field">
                  <label>Rooms to Sell</label>
                  <input 
                    type="number" 
                    value={inventory.roomstosell} 
                    onChange={e => handleInventoryChange('roomstosell', e.target.value)} 
                    placeholder="Count"
                  />
                </div>
                <div className="av-field">
                  <label>Min Stay</label>
                  <input 
                    type="number" 
                    value={inventory.minimumstay} 
                    onChange={e => handleInventoryChange('minimumstay', e.target.value)} 
                    placeholder="Days"
                  />
                </div>
                <div className="av-field">
                  <label>Max Stay</label>
                  <input 
                    type="number" 
                    value={inventory.maximumstay} 
                    onChange={e => handleInventoryChange('maximumstay', e.target.value)} 
                    placeholder="Days"
                  />
                </div>
              </div>

              <div className="av-toggles-row">
                <BooleanToggle label="Stop Sell (Closed)" value={inventory.closed} onChange={v => handleInventoryChange('closed', v)} />
                <BooleanToggle label="Closed Arrival" value={inventory.closedonarrival} onChange={v => handleInventoryChange('closedonarrival', v)} />
                <BooleanToggle label="Closed Departure" value={inventory.closedondeparture} onChange={v => handleInventoryChange('closedondeparture', v)} />
              </div>
            </div>

            {/* 4. Rate Plans (Optional) */}
            <div className="av-card">
              <SectionHeader title="Rate Plans" subtitle="Apply to specific Rate Plans (Optional)" />
              {ratePlans.map((rp, idx) => (
                <div key={idx} className="av-dynamic-row">
                  <input 
                    value={rp.rateplanid} 
                    onChange={e => updateRatePlan(idx, e.target.value)} 
                    placeholder="Rate Plan ID (e.g. BAR)" 
                    style={{ flex: 1 }}
                  />
                  <button className="av-btn-icon-danger" onClick={() => removeRatePlan(idx)}>✕</button>
                </div>
              ))}
              <button className="av-btn-text" onClick={addRatePlan}>+ Add Rate Plan ID</button>
            </div>

          </div>

          {/* --- RIGHT COLUMN: Pricing & Review --- */}
          <div className="av-form-column">

            {/* 5. Pricing */}
            <div className="av-card">
              <SectionHeader title="Base Pricing" subtitle="Price per guest count" />
              {prices.map((p, idx) => (
                <div key={idx} className="av-dynamic-row">
                  <input 
                    type="number" 
                    value={p.guests} 
                    onChange={e => updatePriceRow(idx, 'guests', e.target.value)} 
                    placeholder="Guests" 
                    style={{ width: '80px' }}
                  />
                  <input 
                    type="number" 
                    value={p.amount} 
                    onChange={e => updatePriceRow(idx, 'amount', e.target.value)} 
                    placeholder="Amount" 
                    style={{ flex: 1 }}
                  />
                  <button className="av-btn-icon-danger" onClick={() => removePriceRow(idx)}>✕</button>
                </div>
              ))}
              <button className="av-btn-text" onClick={addPriceRow}>+ Add Guest Price</button>
            </div>

            {/* 6. LOS Pricing (Advanced) */}
            <div className="av-card">
              <SectionHeader title="LOS Pricing" subtitle="Comma-separated values (1 night, 2 nights...)" />
              {losPrices.map((p, idx) => (
                <div key={idx} className="av-dynamic-column-row">
                  <div className="av-dynamic-row">
                    <input 
                      type="number" 
                      value={p.guests} 
                      onChange={e => updateLosRow(idx, 'guests', e.target.value)} 
                      placeholder="Guests" 
                      style={{ width: '80px' }}
                    />
                    <button className="av-btn-icon-danger" onClick={() => removeLosRow(idx)}>✕</button>
                  </div>
                  <input 
                    value={p.values} 
                    onChange={e => updateLosRow(idx, 'values', e.target.value)} 
                    placeholder="e.g. 100.00, 190.00, 270.00" 
                    style={{ width: '100%', marginTop: '5px' }}
                  />
                </div>
              ))}
              <button className="av-btn-text" onClick={addLosRow}>+ Add LOS Price</button>
            </div>

            {/* 7. Action & Preview */}
            <div className="av-card av-action-card">
              <button className="av-btn-primary-large" onClick={handleSubmit}>
                🚀 Push Update
              </button>
              <div className="av-json-preview">
                <label>Payload Preview</label>
                <pre>{JSON.stringify(constructPayload(), null, 2)}</pre>
              </div>
            </div>

          </div>
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

  export default Availability;