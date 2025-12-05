  import React, { useState, useEffect, useMemo } from 'react';
  import { 
    pushAvailability, 
    fetchProperties, 
    fetchRoomTypes, 
    fetchRatePlans 
  } from '../api/client';
  import LoaderOverlay from '../components/LoaderOverlay';
  import MessageDialog from '../components/MessageDialog';
  import './Availability.css';

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
    const [loading, setLoading] = useState(false);
    const [dialog, setDialog] = useState({ open: false, title: '', message: '', type: 'info' });

    // --- Data Lists ---
    const [hotels, setHotels] = useState([]);
    const [roomsList, setRoomsList] = useState([]);
    const [ratePlansList, setRatePlansList] = useState([]);

    // --- Form Selection ---
    const [hotelId, setHotelId] = useState('');
    const [roomId, setRoomId] = useState('');
    const [currentRoomMaxQty, setCurrentRoomMaxQty] = useState(null);

    // --- Dates ---
    const [dateMode, setDateMode] = useState('range');
    const [dateData, setDateData] = useState({
      single: new Date().toISOString().split('T')[0],
      from: new Date().toISOString().split('T')[0],
      to: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    });

    // --- Inventory & Restrictions ---
    const [inventory, setInventory] = useState({
      roomstosell: '',        // Required
      minimumstay: '',        // Required
      maximumstay: '',        // Required
      maximumstaythrough: '', // Required
      minimumstaythrough: '', // Optional
      closed: false,          // Required (Boolean)
      closedonarrival: false,   // Optional
      closedondeparture: false, // Optional
    });

    // --- Extra Rates ---
    const [extraRates, setExtraRates] = useState({
      extraadultrate: '', // Optional
      extrachildrate: ''  // Optional
    });

    // --- Dynamic Arrays ---
    // Default 1 empty row for Rate Plans and Prices to force input
    const [ratePlans, setRatePlans] = useState([{ rateplanid: '' }]); 
    const [prices, setPrices] = useState([{ guests: '1', amount: '' }]); 
    const [losPrices, setLosPrices] = useState([]); 

    const [errors, setErrors] = useState({});

    // --- Effects ---
    useEffect(() => {
      fetchProperties().then(res => {
        const list = res?.data?.properties || [];
        setHotels(list);
        if (list.length > 0) setHotelId(list[0].propertyid);
      }).catch(console.error);
    }, []);

    useEffect(() => {
      if (!hotelId) {
        setRoomsList([]);
        setRatePlansList([]);
        return;
      }
      setLoading(true);
      
      const p1 = fetchRoomTypes(hotelId).then(res => {
          const raw = res?.data?.rooms || []; 
          return raw.map(r => ({
              id: r.roomid,
              name: r.roomname || r.name,
              quantity: parseInt(r.quantity || r.Room?.Quantity || 999, 10)
          }));
      }).catch(() => []);

      const p2 = fetchRatePlans(hotelId).then(res => {
          const raw = res?.data?.rateplans || res?.RatePlans?.RatePlan || [];
          return raw.map(rp => ({
              id: rp.rateplanid,
              name: rp.rateplanname || rp.Description?.Name
          }));
      }).catch(() => []);

      Promise.all([p1, p2]).then(([rooms, rates]) => {
          setRoomsList(rooms);
          setRatePlansList(rates);
          setRoomId(''); 
          setRatePlans([{ rateplanid: '' }]);
          setLoading(false);
      });
    }, [hotelId]);

    const handleRoomChange = (selectedId) => {
        setRoomId(selectedId);
        const roomObj = roomsList.find(r => r.id === selectedId);
        setCurrentRoomMaxQty(roomObj ? roomObj.quantity : null);
        if (errors.roomId) setErrors(prev => ({...prev, roomId: null}));
    };

    // --- Handlers ---

    const handleInventoryChange = (field, value) => {
      if (value !== '' && Number(value) < 0) return; 

      // Custom Validation for Room Quantity
      if (field === 'roomstosell') {
          const numVal = Number(value);
          if (currentRoomMaxQty !== null && value !== '' && numVal > currentRoomMaxQty) {
              setErrors(prev => ({ ...prev, roomstosell: `Max available quantity is ${currentRoomMaxQty}` }));
          } else {
              setErrors(prev => ({ ...prev, roomstosell: null }));
          }
      } else {
          // Clear specific error on change
          if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
      }
      setInventory(prev => ({ ...prev, [field]: value }));
    };

    const handleExtraRateChange = (field, value) => {
      if (value !== '' && Number(value) < 0) return;
      setExtraRates(prev => ({ ...prev, [field]: value }));
    };

    const handlePriceChange = (idx, field, val) => {
      if (val !== '' && Number(val) < 0) return;
      const newPrices = [...prices];
      newPrices[idx][field] = val;
      setPrices(newPrices);
      if (errors[`price_${idx}_${field}`]) setErrors(prev => ({...prev, [`price_${idx}_${field}`]: null}));
    };

    const handleRatePlanChange = (idx, val) => {
      const newRates = [...ratePlans];
      newRates[idx].rateplanid = val;
      setRatePlans(newRates);
      if (errors[`rate_${idx}`]) setErrors(prev => ({...prev, [`rate_${idx}`]: null}));
    };

    const handleLosChange = (idx, field, val) => {
        const newLos = [...losPrices];
        newLos[idx][field] = val;
        setLosPrices(newLos);
    };

    // --- Array Managers ---
    const addRatePlan = () => setRatePlans([...ratePlans, { rateplanid: '' }]);
    const removeRatePlan = (idx) => setRatePlans(ratePlans.filter((_, i) => i !== idx));
    const addPriceRow = () => setPrices([...prices, { guests: '', amount: '' }]);
    const removePriceRow = (idx) => setPrices(prices.filter((_, i) => i !== idx));
    const addLosRow = () => setLosPrices([...losPrices, { guests: '', values: '' }]);
    const removeLosRow = (idx) => setLosPrices(losPrices.filter((_, i) => i !== idx));

    // --- VALIDATION LOGIC ---
    const validateForm = () => {
      const newErrors = {};
      let isValid = true;

      // 1. Core Identifiers
      if (!hotelId) { newErrors.hotelId = "Property is required"; isValid = false; }
      if (!roomId) { newErrors.roomId = "Room Type is required"; isValid = false; }

      // 2. Dates
      if (dateMode === 'range') {
          if (!dateData.from) { newErrors.dateFrom = "Start date required"; isValid = false; }
          if (!dateData.to) { newErrors.dateTo = "End date required"; isValid = false; }
      } else {
          if (!dateData.single) { newErrors.dateSingle = "Date required"; isValid = false; }
      }

      // 3. Inventory & Restrictions
      if (inventory.roomstosell === '') { newErrors.roomstosell = "Required"; isValid = false; }
      if (inventory.minimumstay === '') { newErrors.minimumstay = "Required"; isValid = false; }
      if (inventory.maximumstay === '') { newErrors.maximumstay = "Required"; isValid = false; }
      if (inventory.maximumstaythrough === '') { newErrors.maximumstaythrough = "Required"; isValid = false; }

      // 4. Rate Plans
      if (ratePlans.length === 0) {
          isValid = false; // Logic ensures UI has at least 1 row, but safety check
      }
      ratePlans.forEach((rp, idx) => {
          if (!rp.rateplanid) {
              newErrors[`rate_${idx}`] = "Rate Plan is required";
              isValid = false;
          }
      });

      // 5. Prices
      if (prices.length === 0) {
          isValid = false; 
      }
      prices.forEach((p, idx) => {
          if (!p.guests) { newErrors[`price_${idx}_guests`] = "Req"; isValid = false; }
          if (!p.amount) { newErrors[`price_${idx}_amount`] = "Amount Required"; isValid = false; }
      });

      setErrors(newErrors);
      return isValid;
    };

    // --- Payload Construction ---
    const constructPayload = useMemo(() => {
      const priceArray = prices.filter(p => p.guests && p.amount).map(p => ({ NumberOfGuests: p.guests, value: p.amount }));
      const rateArray = ratePlans.filter(r => r.rateplanid).map(r => ({ rateplanid: r.rateplanid }));
      const losArray = losPrices.filter(l => l.guests && l.values).map(l => ({ NumberOfGuests: l.guests, value: l.values }));

      const dateObj = {
        ...(dateMode === 'single' ? { value: dateData.single } : { from: dateData.from, to: dateData.to }),
        roomstosell: inventory.roomstosell,
        minimumstay: inventory.minimumstay,
        maximumstay: inventory.maximumstay,
        maximumstaythrough: inventory.maximumstaythrough,
        ...(inventory.minimumstaythrough ? { minimumstaythrough: inventory.minimumstaythrough } : {}),
        closed: inventory.closed ? "1" : "0",
        closedonarrival: inventory.closedonarrival ? "1" : "0",
        closedondeparture: inventory.closedondeparture ? "1" : "0",
        ...(extraRates.extraadultrate ? { extraadultrate: extraRates.extraadultrate } : {}),
        ...(extraRates.extrachildrate ? { extrachildrate: extraRates.extrachildrate } : {}),
        rate: rateArray,
        price: priceArray,
        ...(losArray.length ? { LosPrice: losArray } : {}),
      };

      return {
        hotelid: hotelId,
        room: [{ roomid: roomId, date: [dateObj] }]
      };
    }, [hotelId, roomId, dateData, dateMode, inventory, extraRates, prices, losPrices, ratePlans]);

    const handleSubmit = async () => {
      if (!validateForm()) {
          // Validation failed, errors state is updated, UI shows red text
          return;
      }
      
      // Extra safety for custom logic
      if (errors.roomstosell) return;

      try {
        setLoading(true);
        const res = await pushAvailability(constructPayload);
        const isSuccess = res?.Status === 'Success' || res?.data?.Status === 'Success';
        
        if (isSuccess) {
          setDialog({ 
            open: true, 
            title: 'Success', 
            message: 'Successfully added to availability', 
            type: 'success' 
          });
          resetForm();
        } else {
          throw new Error(res?.error?.Errors?.[0]?.ShortText || 'Unknown error');
        }
      } catch (err) {
        setDialog({ open: true, title: 'Push Failed', message: err.message, type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    // --- RESET FUNCTION ---
  const resetForm = () => {
    // Note: We deliberately do NOT reset hotelId so the user can easily continue working on the same property.
    setRoomId('');
    setCurrentRoomMaxQty(null);
    setDateMode('range');
    setDateData({
      single: new Date().toISOString().split('T')[0],
      from: new Date().toISOString().split('T')[0],
      to: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    });
    setInventory({
      roomstosell: '', minimumstay: '', maximumstay: '', maximumstaythrough: '', minimumstaythrough: '',
      closed: false, closedonarrival: false, closedondeparture: false,
    });
    setExtraRates({ extraadultrate: '', extrachildrate: '' });
    setRatePlans([{ rateplanid: '' }]);
    setPrices([{ guests: '', amount: '' }]);
    setLosPrices([]);
    setErrors({});
  };

    return (
      <div className="av-page">
        <LoaderOverlay open={loading} />
        
        <div className="av-header">
          <h1>Rates & Availability Manager</h1>
          <p>Push real-time inventory updates and rate changes.</p>
        </div>

        <div className="av-container">
          
          {/* --- SECTION 1: SELECTION --- */}
          <div className="av-card">
            <SectionHeader title="Property Selection" />
            <div className="av-grid-2">
              <div className="av-field">
                <label>Hotel <span className="av-req">*</span></label>
                <select value={hotelId} onChange={e => setHotelId(e.target.value)} className={errors.hotelId ? 'av-input-error' : ''}>
                  <option value="">Select Property...</option>
                  {hotels.map(h => <option key={h.propertyid} value={h.propertyid}>{h.propertyname}</option>)}
                </select>
                {errors.hotelId && <span className="av-error-text">{errors.hotelId}</span>}
              </div>
              <div className="av-field">
                <label>Room Type <span className="av-req">*</span></label>
                <select value={roomId} onChange={e => handleRoomChange(e.target.value)} disabled={!hotelId} className={errors.roomId ? 'av-input-error' : ''}>
                    <option value="">Select Room...</option>
                    {roomsList.map(r => <option key={r.id} value={r.id}>{r.name} ({r.id}) - Qty: {r.quantity}</option>)}
                </select>
                {errors.roomId && <span className="av-error-text">{errors.roomId}</span>}
              </div>
            </div>
          </div>

          {/* --- SECTION 2: DATES --- */}
          <div className="av-card">
            <SectionHeader title="Update Period" />
            <div className="av-tabs">
              <button className={`av-tab ${dateMode === 'range' ? 'active' : ''}`} onClick={() => setDateMode('range')}>Date Range</button>
              <button className={`av-tab ${dateMode === 'single' ? 'active' : ''}`} onClick={() => setDateMode('single')}>Single Date</button>
            </div>
            <div className="av-tab-content">
              {dateMode === 'range' ? (
                <div className="av-grid-2">
                  <div className="av-field">
                    <label>From <span className="av-req">*</span></label>
                    <input type="date" value={dateData.from} onChange={e => setDateData({...dateData, from: e.target.value})} className={errors.dateFrom ? 'av-input-error' : ''} />
                    {errors.dateFrom && <span className="av-error-text">{errors.dateFrom}</span>}
                  </div>
                  <div className="av-field">
                    <label>To <span className="av-req">*</span></label>
                    <input type="date" value={dateData.to} onChange={e => setDateData({...dateData, to: e.target.value})} className={errors.dateTo ? 'av-input-error' : ''} />
                    {errors.dateTo && <span className="av-error-text">{errors.dateTo}</span>}
                  </div>
                </div>
              ) : (
                <div className="av-field">
                  <label>Date <span className="av-req">*</span></label>
                  <input type="date" value={dateData.single} onChange={e => setDateData({...dateData, single: e.target.value})} className={errors.dateSingle ? 'av-input-error' : ''} />
                  {errors.dateSingle && <span className="av-error-text">{errors.dateSingle}</span>}
                </div>
              )}
            </div>
          </div>

          {/* --- SECTION 3: INVENTORY --- */}
          <div className="av-card">
            <SectionHeader title="Inventory & Restrictions" subtitle="Fields marked with * are required" />
            
            <div className="av-grid-2">
              <div className="av-field">
                <label>Rooms to Sell <span className="av-req">*</span></label>
                <input type="number" min="0" value={inventory.roomstosell} onChange={e => handleInventoryChange('roomstosell', e.target.value)} className={errors.roomstosell ? 'av-input-error' : ''} placeholder="Count"/>
                {errors.roomstosell && <span className="av-error-text">{errors.roomstosell}</span>}
              </div>
              <div className="av-field">
                <label>Stop Sell (Closed) <span className="av-req">*</span></label>
                <select value={inventory.closed ? "1" : "0"} onChange={e => handleInventoryChange('closed', e.target.value === "1")}>
                  <option value="0">Open (Bookable)</option>
                  <option value="1">Closed</option>
                </select>
              </div>
            </div>

            <div className="av-grid-2">
              <div className="av-field">
                <label>Min Stay <span className="av-req">*</span></label>
                <input type="number" min="0" value={inventory.minimumstay} onChange={e => handleInventoryChange('minimumstay', e.target.value)} className={errors.minimumstay ? 'av-input-error' : ''} placeholder="Days" />
                {errors.minimumstay && <span className="av-error-text">{errors.minimumstay}</span>}
              </div>
              <div className="av-field">
                <label>Max Stay <span className="av-req">*</span></label>
                <input type="number" min="0" value={inventory.maximumstay} onChange={e => handleInventoryChange('maximumstay', e.target.value)} className={errors.maximumstay ? 'av-input-error' : ''} placeholder="Days" />
                {errors.maximumstay && <span className="av-error-text">{errors.maximumstay}</span>}
              </div>
            </div>

            <div className="av-grid-2">
              <div className="av-field">
                <label>Max Stay Through <span className="av-req">*</span></label>
                <input type="number" min="0" value={inventory.maximumstaythrough} onChange={e => handleInventoryChange('maximumstaythrough', e.target.value)} className={errors.maximumstaythrough ? 'av-input-error' : ''} placeholder="Days" />
                {errors.maximumstaythrough && <span className="av-error-text">{errors.maximumstaythrough}</span>}
              </div>
              <div className="av-field">
                <label>Min Stay Through</label>
                <input type="number" min="0" value={inventory.minimumstaythrough} onChange={e => handleInventoryChange('minimumstaythrough', e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <hr className="av-divider" />
            <h4 style={{fontSize:'13px', margin:'0 0 10px 0', color:'#666'}}>Optional Restrictions</h4>
            
            <div className="av-toggles-row">
              <BooleanToggle label="Closed on Arrival" value={inventory.closedonarrival} onChange={v => handleInventoryChange('closedonarrival', v)} />
              <BooleanToggle label="Closed on Departure" value={inventory.closedondeparture} onChange={v => handleInventoryChange('closedondeparture', v)} />
            </div>
          </div>

          {/* --- SECTION 4: RATES --- */}
          <div className="av-card">
            <SectionHeader title="Pricing & Rate Plans" />
            
            {/* Rate Plans */}
            <div className="av-subsection">
                <label className="av-sublabel">Applicable Rate Plans <span className="av-req">*</span></label>
                {ratePlans.map((rp, idx) => (
                <div key={idx} className="av-dynamic-row">
                    <div style={{ flex: 1 }}>
                        <select value={rp.rateplanid} onChange={e => handleRatePlanChange(idx, e.target.value)} className={errors[`rate_${idx}`] ? 'av-input-error' : ''}>
                            <option value="">Select Rate Plan...</option>
                            {ratePlansList.map(item => <option key={item.id} value={item.id}>{item.name} ({item.id})</option>)}
                        </select>
                        {errors[`rate_${idx}`] && <span className="av-error-text">{errors[`rate_${idx}`]}</span>}
                    </div>
                    <button className="av-btn-icon-danger" onClick={() => removeRatePlan(idx)}>✕</button>
                </div>
                ))}
                <button className="av-btn-text" onClick={addRatePlan}>+ Add Rate Plan</button>
            </div>

            <hr className="av-divider" />

            {/* Base Prices */}
            <div className="av-subsection">
                <label className="av-sublabel">Base Prices (per guest) <span className="av-req">*</span></label>
                {prices.map((p, idx) => (
                <div key={idx}>
                    <div className="av-dynamic-row">
                        <div style={{ width: '120px' }}>
                            <input type="number" min="1" value={p.guests} onChange={e => handlePriceChange(idx, 'guests', e.target.value)} placeholder="Guests" className={errors[`price_${idx}_guests`] ? 'av-input-error' : ''} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <input type="number" min="0" value={p.amount} onChange={e => handlePriceChange(idx, 'amount', e.target.value)} placeholder="Price" className={errors[`price_${idx}_amount`] ? 'av-input-error' : ''} />
                        </div>
                        <button className="av-btn-icon-danger" onClick={() => removePriceRow(idx)}>✕</button>
                    </div>
                    {(errors[`price_${idx}_guests`] || errors[`price_${idx}_amount`]) && (
                        <div style={{ display: 'flex', gap: '12px', marginTop: '-8px', marginBottom: '8px' }}>
                            <div style={{ width: '120px' }}>{errors[`price_${idx}_guests`] && <span className="av-error-text">Required</span>}</div>
                            <div style={{ flex: 1 }}>{errors[`price_${idx}_amount`] && <span className="av-error-text">Required</span>}</div>
                            <div style={{ width: '48px' }}></div>
                        </div>
                    )}
                </div>
                ))}
                <button className="av-btn-text" onClick={addPriceRow}>+ Add Price Row</button>
            </div>

            <hr className="av-divider" />

            {/* Extra Rates */}
            <div className="av-subsection">
                <label className="av-sublabel">Extra Guest Rates (Optional)</label>
                <div className="av-grid-2">
                    <div className="av-field">
                        <label>Extra Adult Rate</label>
                        <input type="number" min="0" value={extraRates.extraadultrate} onChange={e => handleExtraRateChange('extraadultrate', e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="av-field">
                        <label>Extra Child Rate</label>
                        <input type="number" min="0" value={extraRates.extrachildrate} onChange={e => handleExtraRateChange('extrachildrate', e.target.value)} placeholder="0.00" />
                    </div>
                </div>
            </div>

            <hr className="av-divider" />

            {/* LOS Pricing */}
            <div className="av-subsection">
                <label className="av-sublabel">LOS Pricing (Optional)</label>
                {losPrices.map((p, idx) => (
                <div key={idx} className="av-dynamic-column-row">
                    <div className="av-dynamic-row">
                        <input type="number" min="1" value={p.guests} onChange={e => handleLosChange(idx, 'guests', e.target.value)} placeholder="Guests" style={{ width: '120px' }} />
                        <button className="av-btn-icon-danger" style={{height:'48px'}} onClick={() => removeLosRow(idx)}>✕</button>
                    </div>
                    <input value={p.values} onChange={e => handleLosChange(idx, 'values', e.target.value)} placeholder="e.g. 100.00, 190.00" style={{ width: '100%', marginTop: '5px', height: '40px' }} />
                </div>
                ))}
                <button className="av-btn-text" onClick={addLosRow}>+ Add LOS Price</button>
            </div>
          </div>

          {/* --- SECTION 5: PREVIEW (BOTTOM) --- */}
          <div className="av-card av-preview-card">
            <SectionHeader title="Update Preview" subtitle="Review data before pushing" />
            <div className="av-preview-table-wrapper">
                <table className="av-preview-table">
                    <tbody>
                        <tr><th>Hotel ID</th><td>{hotelId || '-'}</td></tr>
                        <tr><th>Room ID</th><td>{roomId || '-'}</td></tr>
                        <tr><th>Date(s)</th><td>{dateMode === 'single' ? dateData.single : `${dateData.from} to ${dateData.to}`}</td></tr>
                        <tr>
                            <th>Inventory</th>
                            <td>
                                {inventory.roomstosell && <div>{inventory.roomstosell} rooms</div>}
                                {inventory.closed && <div className="av-tag red">Stop Sell</div>}
                                {!inventory.roomstosell && !inventory.closed && <span className="av-muted">Required</span>}
                            </td>
                        </tr>
                        <tr>
                            <th>Rate Plans</th>
                            <td>{ratePlans.some(r => r.rateplanid) ? ratePlans.map(r => r.rateplanid).filter(Boolean).join(', ') : <span className="av-muted">Required</span>}</td>
                        </tr>
                        <tr>
                            <th>Prices</th>
                            <td>{prices.some(p => p.amount) ? prices.filter(p => p.amount).map((p, i) => <div key={i}>{p.guests} Pax: ${p.amount}</div>) : <span className="av-muted">Required</span>}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="av-action-area">
                <button className="av-btn-primary-large" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Pushing...' : 'Confirm Availability'}
                </button>
            </div>
          </div>

        </div>
        <MessageDialog open={dialog.open} title={dialog.title} message={dialog.message} onClose={() => setDialog({ ...dialog, open: false })} />
      </div>
    );
  };

  export default Availability;