import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  fetchRoomTypes,
  pushRoomTypes,
  fetchProperties,
} from '../api/client';
import MessageDialog from '../components/MessageDialog';
import LoaderOverlay from '../components/LoaderOverlay';
import StatusChangeDialog from '../components/StatusChangeDialog';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';
import './RoomTypes.css';

// Import your separate data files here
import { COUNTRY_LIST } from '../components/CountryList';
import { ROOM_TYPE_OPTIONS } from '../components/RoomTypeOptions';
import { BED_TYPE_OPTIONS } from '../components/BedTypeOptions';

/* ------------------ 3-dot Action Menu ------------------ */

const ActionMenu = ({ onView, onEdit, onActivate, onDeactivate, onDelete, status }) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  const toggle = (e) => {
    e.stopPropagation();
    if (!btnRef.current) return;
    if (open) { setOpen(false); return; }
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 6, left: Math.max(rect.right - 200, 8) });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handleClick = (evt) => {
      if (btnRef.current?.contains(evt.target)) return;
      if (menuRef.current?.contains(evt.target)) return;
      setOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}> 
      <button ref={btnRef} className="rt-action-trigger" type="button" onClick={toggle}>
        <span className="rt-action-dot" /><span className="rt-action-dot" /><span className="rt-action-dot" />
      </button>
      {open && (
        <div ref={menuRef} className="rt-action-dropdown" style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}>
          <button type="button" className="rt-action-item" onClick={(e) => { e.stopPropagation(); close(); onView && onView(); }}>View Room Type</button>
          <button type="button" className="rt-action-item" onClick={(e) => { e.stopPropagation(); close(); onEdit && onEdit(); }}>Edit Room Type</button>
          <hr style={{margin:'4px 0', border:'0', borderTop:'1px solid #eee'}}/>
          {status !== 'Active' && <button type="button" className="rt-action-item" onClick={(e) => { e.stopPropagation(); close(); onActivate && onActivate(); }}>Activate</button>}
          {status === 'Active' && <button type="button" className="rt-action-item" onClick={(e) => { e.stopPropagation(); close(); onDeactivate && onDeactivate(); }}>Deactivate</button>}
          <button type="button" className="rt-action-item rt-action-danger" onClick={(e) => { e.stopPropagation(); close(); onDelete && onDelete(); }}>Delete</button>
        </div>
      )}
    </div>
  );
};

/* ------------------ Room Type Form Modal ------------------ */

const EMPTY_FORM = {
  hotelId: '',
  invStatusType: 'Initial',
  roomid: '',
  name: '',
  roomDescription: '',
  maxOccupancy: '',
  maxChildOccupancy: '',
  roomRate: '',
  quantity: '',
  roomType: 'Apartment', 
  sizeMeasurement: '',
  sizeMeasurementUnit: 'sqm',
  // Location Fields
  addressLine: '',
  cityName: '',
  postalCode: '',
  countryName: '',
  latitude: '',
  longitude: '',
  // Dynamic Arrays
  amenities: [], 
  fees: [],
  bedding: [],
};

const SECTIONS = [
  { id: 'listing', label: 'Listing Details' },
  { id: 'location', label: 'Location' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'images', label: 'Images' },
  { id: 'fees', label: 'Fees' },
  { id: 'bedding', label: 'Bedding' },
];

const RoomTypeFormModal = ({ open, mode, hotelId, hotels, initialData, onClose, onSaved }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create'; 

  const [activeSection, setActiveSection] = useState('listing');
  const [form, setForm] = useState({ ...EMPTY_FORM, hotelId });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMsg, setDialogMsg] = useState('');
  
  // Local state for amenities/groups
  const [newGroup, setNewGroup] = useState('');
  const [newItemText, setNewItemText] = useState({});

  const scrollContainerRef = useRef(null);

  // --- Data Loading & Transform ---
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setActiveSection('listing');
    
    if (initialData) {
      // 1. Transform API Facilities List -> UI Groups
      const apiFacilities = initialData.facilities || [];
      const amenitiesGrouped = {};
      const feesList = [];
      const beddingList = [];

      apiFacilities.forEach(f => {
        // Check if it's a Fee (Based on naming convention we save)
        if (f.Group === 'Fees') {
            // Parsing "Name: X, Amount: Y" etc from the single string if possible
            // For simplicity, we just load the name. Real parsing depends on how we save it.
            // Here we assume simplistic loading for now.
            feesList.push({ name: f.name, amount: '', type: 'USD', stay: 'Per Stay' }); 
        } 
        // Check if Bedding
        else if (f.Group === 'Bedding') {
             beddingList.push({ type: f.name, quantity: 1 });
        }
        // Regular Amenities
        else {
            if (!amenitiesGrouped[f.Group]) amenitiesGrouped[f.Group] = [];
            if (!amenitiesGrouped[f.Group].find(i => i.name === f.name)) {
                amenitiesGrouped[f.Group].push({ name: f.name, checked: true });
            }
        }
      });

      const amenitiesUI = Object.keys(amenitiesGrouped).map(g => ({
        group: g,
        items: amenitiesGrouped[g]
      }));

      setForm({ 
        ...EMPTY_FORM, 
        hotelId: hotelId || initialData.hotelId, 
        ...initialData,
        amenities: amenitiesUI,
        fees: feesList,
        bedding: beddingList
      });
    } else {
      // 2. Default State for Create Mode
      const defaultAmenities = [
        { group: 'Amenities', items: [{ name: 'Free Wifi', checked: false }, { name: 'AC', checked: false }] }
      ];
      setForm({ ...EMPTY_FORM, hotelId: hotelId || '', amenities: defaultAmenities, fees: [], bedding: [] });
    }
  }, [open, initialData, hotelId]);

  if (!open) return null;

  const title = isView ? 'View Room Type' : isEdit ? 'Edit Room Type' : 'Add Room Type';
  const primaryLabel = isCreate ? 'Submit' : 'Save';

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  // --- Amenities Logic ---
  const toggleAmenity = (groupIndex, itemIndex) => {
    if (isView) return;
    const newAmenities = [...form.amenities];
    newAmenities[groupIndex].items[itemIndex].checked = !newAmenities[groupIndex].items[itemIndex].checked;
    setForm(prev => ({ ...prev, amenities: newAmenities }));
  };

  const handleAddGroup = () => {
    if (!newGroup.trim()) return;
    setForm(prev => ({ ...prev, amenities: [...prev.amenities, { group: newGroup, items: [] }] }));
    setNewGroup('');
  };

  const handleAddItem = (groupIndex) => {
    const text = newItemText[groupIndex];
    if (!text || !text.trim()) return;
    const newAmenities = [...form.amenities];
    text.split(',').forEach(t => {
        if(t.trim()) newAmenities[groupIndex].items.push({ name: t.trim(), checked: true });
    });
    setForm(prev => ({ ...prev, amenities: newAmenities }));
    setNewItemText(prev => ({ ...prev, [groupIndex]: '' }));
  };

  // --- Fees Logic ---
  const addFeeRow = () => {
      setForm(prev => ({ ...prev, fees: [...prev.fees, { name: '', amount: '', type: 'USD', stay: 'Per Stay' }] }));
  };
  const removeFeeRow = (idx) => {
      setForm(prev => ({ ...prev, fees: prev.fees.filter((_, i) => i !== idx) }));
  };
  const updateFeeRow = (idx, field, value) => {
      const updated = [...form.fees];
      updated[idx][field] = value;
      setForm(prev => ({ ...prev, fees: updated }));
  };

  // --- Bedding Logic ---
  const addBeddingRow = () => {
      setForm(prev => ({ ...prev, bedding: [...prev.bedding, { type: 'King', quantity: 1 }] }));
  };
  const removeBeddingRow = (idx) => {
      setForm(prev => ({ ...prev, bedding: prev.bedding.filter((_, i) => i !== idx) }));
  };
  const updateBeddingRow = (idx, field, value) => {
      const updated = [...form.bedding];
      updated[idx][field] = value;
      setForm(prev => ({ ...prev, bedding: updated }));
  };

  // --- Scrollspy ---
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const containerTop = scrollContainerRef.current.scrollTop + 150; 
    for (const section of SECTIONS) {
      const element = document.getElementById(`section-${section.id}`);
      if (element) {
        const { offsetTop, offsetHeight } = element;
        if (containerTop >= offsetTop && containerTop < offsetTop + offsetHeight) {
          setActiveSection(section.id);
          break;
        }
      }
    }
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(`section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  // --- Validation ---
  const validate = () => {
    const newErrors = {};
    if (!form.hotelId) newErrors.hotelId = "Hotel is required";
    if (!form.roomid) newErrors.roomid = "Room ID is required";
    else if (!/^[a-zA-Z0-9-]+$/.test(form.roomid)) newErrors.roomid = "Alphanumeric & hyphen only (no spaces)";
    
    if (!form.name) newErrors.name = "Room Name is required";
    if (!form.roomRate || Number(form.roomRate) <= 0) newErrors.roomRate = "Rate must be > 0";
    if (!form.maxOccupancy) newErrors.maxOccupancy = "Max Occupancy is required";
    
    if (form.maxChildOccupancy === '' || form.maxChildOccupancy === null) {
        newErrors.maxChildOccupancy = "Max Child is required (enter 0 if none)";
    } else if (Number(form.maxChildOccupancy) >= Number(form.maxOccupancy)) {
        newErrors.maxChildOccupancy = "Must be less than Max Occupancy";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) scrollToSection('listing');
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isView) { onClose(); return; }
    if (!validate()) return;

    // 1. Amenities
    const facilityList = [];
    form.amenities.forEach(group => {
        group.items.forEach(item => {
            if (item.checked) facilityList.push({ Group: group.group, name: item.name });
        });
    });

    // 2. Map Fees to Facilities (Workaround for API structure)
    form.fees.forEach(f => {
        if (f.name && f.amount) {
            // Format: "Cleaning Fee ($50 Per Stay)"
            facilityList.push({ Group: 'Fees', name: `${f.name} (${f.type === 'USD' ? '$' : ''}${f.amount}${f.type === '%' ? '%' : ''} ${f.stay})` });
        }
    });

    // 3. Map Bedding to Facilities
    form.bedding.forEach(b => {
        facilityList.push({ Group: 'Bedding', name: `${b.quantity} x ${b.type}` });
    });

    const isModify = isEdit;
    const payload = {
      SellableProducts: {
        hotelid: form.hotelId,
        SellableProduct: [
          {
            InvStatusType: isModify ? 'Modify' : 'Initial',
            ...(isModify ? { InvNotifType: 'Overlay', roomid: form.roomid } : {}),
            GuestRoom: {
              Occupancy: {
                MaxOccupancy: String(form.maxOccupancy),
                MaxChildOccupancy: String(form.maxChildOccupancy),
              },
              Room: {
                roomid: form.roomid,
                RoomRate: String(form.roomRate),
                RoomType: form.roomType,
                ...(form.quantity ? { Quantity: String(form.quantity) } : {}),
                ...(form.sizeMeasurement ? {
                   SizeMeasurement: String(form.sizeMeasurement),
                   SizeMeasurementUnit: form.sizeMeasurementUnit || 'sqm' 
                } : {}),
              },
              Description: {
                Text: form.name,
                ...(form.roomDescription ? { RoomDescription: form.roomDescription } : {}),
              },
              Address: {
                 AddressLine: form.addressLine || '',
                 CityName: form.cityName || '',
                 PostalCode: form.postalCode || '',
                 CountryName: form.countryName || '',
              },
              ...(form.latitude && form.longitude ? {
                  Position: {
                     Latitude: form.latitude,
                     Longitude: form.longitude,
                  }
              } : {}),
              ...(facilityList.length > 0 ? {
                  Facilities: { Facility: facilityList }
              } : {})
            },
          },
        ],
      },
    };

    try {
      setSaving(true);
      const res = await pushRoomTypes(payload);
      const isSuccess = res?.success === true || res?.data?.Status === 'Success';

      if (!isSuccess) {
        const errorMsg = 
            res?.error?.Errors?.[0]?.ShortText || 
            res?.data?.Errors?.[0]?.ShortText || 
            res?.message ||
            'Failed to create the room type';
        setDialogMsg(errorMsg);
        setDialogOpen(true);
        return;
      }
      
      const successMsg = isCreate 
        ? 'Successfully created the room type' 
        : 'Successfully updated the room type';
      onSaved && onSaved(successMsg);
      onClose();
    } catch (err) {
      setDialogMsg(err.message || 'Error occurred.');
      setDialogOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const isDisabled = isView || saving;

  return (
    <>
      <div className="rt-modal-backdrop">
        <div className="rt-modal">
          <div className="rt-modal-header">
            <h2>{title}</h2>
            <button type="button" className="rt-modal-close" onClick={onClose} disabled={saving}>✕</button>
          </div>

          <div className="rt-sticky-nav">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`rt-nav-link ${activeSection === s.id ? 'rt-nav-active' : ''}`}
                onClick={() => scrollToSection(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <form className="rt-modal-content" onSubmit={handleSubmit} onScroll={handleScroll} ref={scrollContainerRef}>
            
            {/* --- Listing Section --- */}
            <div id="section-listing" className="rt-scroll-section">
               <div className="rt-section-header">Listing Details</div>
               <div className="rt-form-grid">
                  <div className="rt-form-field">
                    <label>Hotel ID<span className="rt-required">*</span></label>
                    <select name="hotelId" value={form.hotelId} onChange={onChange} disabled={isEdit || isDisabled} className={errors.hotelId ? 'rt-input-error' : ''}>
                      <option value="">Select Hotel</option>
                      {hotels.map(h => <option key={h.propertyid} value={h.propertyid}>{h.propertyname}</option>)}
                    </select>
                    {errors.hotelId && <span className="rt-error-text">{errors.hotelId}</span>}
                  </div>
                  <div className="rt-form-field">
                    <label>Room ID<span className="rt-required">*</span></label>
                    <input name="roomid" value={form.roomid} onChange={onChange} disabled={isEdit || isDisabled} className={errors.roomid ? 'rt-input-error' : ''} />
                    {errors.roomid && <span className="rt-error-text">{errors.roomid}</span>}
                  </div>
                  <div className="rt-form-field">
                    <label>Name<span className="rt-required">*</span></label>
                    <input name="name" value={form.name} onChange={onChange} disabled={isDisabled} className={errors.name ? 'rt-input-error' : ''} />
                    {errors.name && <span className="rt-error-text">{errors.name}</span>}
                  </div>
               </div>
               
               <div className="rt-form-grid">
                 <div className="rt-form-field">
                    <label>Type<span className="rt-required">*</span></label>
                    <select name="roomType" value={form.roomType} onChange={onChange} disabled={isDisabled}>
                      {ROOM_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                 </div>
                 <div className="rt-form-field">
                    <label>Max Occupancy<span className="rt-required">*</span></label>
                    <input type="number" name="maxOccupancy" value={form.maxOccupancy} onChange={onChange} disabled={isDisabled} className={errors.maxOccupancy ? 'rt-input-error' : ''} />
                    {errors.maxOccupancy && <span className="rt-error-text">{errors.maxOccupancy}</span>}
                 </div>
                 <div className="rt-form-field">
                    <label>Max Child<span className="rt-required">*</span></label>
                    <input type="number" name="maxChildOccupancy" value={form.maxChildOccupancy} onChange={onChange} disabled={isDisabled} className={errors.maxChildOccupancy ? 'rt-input-error' : ''} />
                    {errors.maxChildOccupancy && <span className="rt-error-text">{errors.maxChildOccupancy}</span>}
                 </div>
               </div>

               <div className="rt-form-grid">
                 <div className="rt-form-field">
                    <label>Quantity</label>
                    <input type="number" name="quantity" value={form.quantity} onChange={onChange} disabled={isDisabled} placeholder="Auto" />
                 </div>
                 <div className="rt-form-field">
                    <label>Base Rate<span className="rt-required">*</span></label>
                    <input type="number" name="roomRate" value={form.roomRate} onChange={onChange} disabled={isDisabled} className={errors.roomRate ? 'rt-input-error' : ''} />
                    {errors.roomRate && <span className="rt-error-text">{errors.roomRate}</span>}
                 </div>
                 <div className="rt-form-field">
                   <label>Size</label>
                   <div style={{display:'flex', gap:'8px'}}>
                     <input name="sizeMeasurement" value={form.sizeMeasurement} onChange={onChange} disabled={isDisabled} placeholder="e.g. 16" style={{flex:1}} />
                     <select name="sizeMeasurementUnit" value={form.sizeMeasurementUnit} onChange={onChange} disabled={isDisabled} style={{width:'80px'}}>
                       <option value="sqm">sqm</option><option value="sqft">sqft</option>
                     </select>
                   </div>
                 </div>
               </div>
               
               <div className="rt-form-field" style={{marginTop:'10px'}}>
                  <label>Description</label>
                  <textarea name="roomDescription" value={form.roomDescription} onChange={onChange} rows={3} disabled={isDisabled} maxLength={2000} />
               </div>
            </div>

            {/* --- Location Section --- */}
            <div id="section-location" className="rt-scroll-section">
               <div className="rt-section-header">Location</div>
               <div className="rt-form-grid">
                  <div className="rt-form-field">
                    <label>Address</label>
                    <input name="addressLine" value={form.addressLine} onChange={onChange} disabled={isDisabled} />
                  </div>
                  <div className="rt-form-field">
                    <label>City</label>
                    <input name="cityName" value={form.cityName} onChange={onChange} disabled={isDisabled} />
                  </div>
               </div>
               <div className="rt-form-grid">
                  <div className="rt-form-field">
                    <label>Postal Code</label>
                    <input name="postalCode" value={form.postalCode} onChange={onChange} disabled={isDisabled} />
                  </div>
                  <div className="rt-form-field">
                    <label>Country</label>
                    <select name="countryName" value={form.countryName} onChange={onChange} disabled={isDisabled}>
                        <option value="">Select Country</option>
                        {COUNTRY_LIST.map(c => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                    </select>
                  </div>
               </div>
               <div className="rt-form-grid">
                  <div className="rt-form-field">
                    <label>Latitude</label>
                    <input name="latitude" value={form.latitude} onChange={onChange} disabled={isDisabled} placeholder="-90 to 90" />
                  </div>
                  <div className="rt-form-field">
                    <label>Longitude</label>
                    <input name="longitude" value={form.longitude} onChange={onChange} disabled={isDisabled} placeholder="-180 to 180" />
                  </div>
               </div>
            </div>

            {/* --- Amenities --- */}
            <div id="section-amenities" className="rt-scroll-section">
               <div className="rt-section-header">Amenities</div>
               {!isView && (
                 <div style={{ marginBottom:'16px', display:'flex', gap:'8px', alignItems:'flex-end' }}>
                    <div className="rt-form-field" style={{flex:1}}>
                        <label>Add New Amenity Category</label>
                        <input placeholder="e.g. Kitchen" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} />
                    </div>
                    <button type="button" className="rt-btn-secondary" onClick={handleAddGroup}>+ Add Group</button>
                 </div>
               )}

               {form.amenities.map((group, gIndex) => (
                 <div key={gIndex} className="rt-amenity-group">
                    <div className="rt-amenity-group-header">
                       <span className="rt-amenity-group-title">{group.group}</span>
                    </div>
                    <div className="rt-amenity-list">
                       {group.items.length === 0 && <span style={{fontSize:'12px', color:'#999', padding:'8px'}}>No items yet</span>}
                       {group.items.map((item, iIndex) => (
                          <label key={iIndex} className="rt-amenity-item">
                             <input type="checkbox" checked={item.checked} onChange={() => toggleAmenity(gIndex, iIndex)} disabled={isView} />
                             {item.name}
                          </label>
                       ))}
                    </div>
                    {!isView && (
                        <div className="rt-add-input-row">
                            <input 
                                className="rt-input-small" 
                                placeholder={`Add ${group.group} item...`}
                                value={newItemText[gIndex] || ''}
                                onChange={(e) => setNewItemText({...newItemText, [gIndex]: e.target.value})}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem(gIndex))}
                            />
                            <button type="button" className="rt-btn-xs" onClick={() => handleAddItem(gIndex)}>+ Add</button>
                        </div>
                    )}
                 </div>
               ))}
            </div>

            {/* --- Images Section (Dropzone UI) --- */}
            <div id="section-images" className="rt-scroll-section">
               <div className="rt-section-header">Images</div>
               <div className="rt-image-dropzone">
                  <div className="rt-upload-icon">☁️</div>
                  <div className="rt-upload-text">Click or drag images here</div>
                  <input type="file" multiple disabled={isDisabled} style={{opacity:0, position:'absolute', width:'100%', height:'140px', cursor:'pointer'}} />
               </div>
            </div>

            {/* --- Fees Section (Dynamic Table) --- */}
            <div id="section-fees" className="rt-scroll-section">
               <div className="rt-section-header">Fees</div>
               {form.fees.map((fee, idx) => (
                 <div key={idx} className="rt-dynamic-row">
                    <div className="rt-form-field" style={{flex:2}}>
                        <label>Name</label>
                        <input value={fee.name} onChange={(e) => updateFeeRow(idx, 'name', e.target.value)} disabled={isView} />
                    </div>
                    <div className="rt-form-field" style={{flex:1}}>
                        <label>Amount</label>
                        <input type="number" value={fee.amount} onChange={(e) => updateFeeRow(idx, 'amount', e.target.value)} disabled={isView} />
                    </div>
                    <div className="rt-form-field" style={{flex:1}}>
                        <label>Type</label>
                        <select value={fee.type} onChange={(e) => updateFeeRow(idx, 'type', e.target.value)} disabled={isView}>
                           <option value="USD">USD</option><option value="%">%</option>
                        </select>
                    </div>
                    <div className="rt-form-field" style={{flex:1}}>
                        <label>Stay</label>
                        <select value={fee.stay} onChange={(e) => updateFeeRow(idx, 'stay', e.target.value)} disabled={isView}>
                           <option value="Per Stay">Per Stay</option><option value="Per Night">Per Night</option>
                        </select>
                    </div>
                    {!isView && (
                        <button type="button" className="rt-btn-icon-danger" onClick={() => removeFeeRow(idx)}>🗑️</button>
                    )}
                 </div>
               ))}
               {!isView && (
                   <div style={{marginTop:'10px'}}>
                     <button type="button" className="rt-btn-secondary" onClick={addFeeRow}>+ Add Fee</button>
                   </div>
               )}
            </div>

            {/* --- Bedding Section (Dynamic Table) --- */}
            <div id="section-bedding" className="rt-scroll-section">
               <div className="rt-section-header">Bedding</div>
               {form.bedding.map((bed, idx) => (
                 <div key={idx} className="rt-dynamic-row">
                    <div className="rt-form-field" style={{flex:2}}>
                        <label>Type</label>
                        <select value={bed.type} onChange={(e) => updateBeddingRow(idx, 'type', e.target.value)} disabled={isView}>
                           {BED_TYPE_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div className="rt-form-field" style={{flex:1}}>
                        <label>Quantity</label>
                        <input type="number" value={bed.quantity} onChange={(e) => updateBeddingRow(idx, 'quantity', e.target.value)} disabled={isView} />
                    </div>
                    {!isView && (
                        <button type="button" className="rt-btn-icon-danger" onClick={() => removeBeddingRow(idx)}>🗑️</button>
                    )}
                 </div>
               ))}
               {!isView && (
                   <div style={{marginTop:'10px'}}>
                     <button type="button" className="rt-btn-secondary" onClick={addBeddingRow}>+ Add Bedding</button>
                   </div>
               )}
            </div>

          </form>

          <div className="rt-modal-footer">
            <button type="button" className="rt-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            {!isView && <button type="button" className="rt-btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : primaryLabel}</button>}
          </div>
        </div>
      </div>
      {saving && <LoaderOverlay open={saving} />}
      <MessageDialog open={dialogOpen} title="Error" message={dialogMsg} onClose={() => setDialogOpen(false)} />
    </>
  );
};

/* ------------------------------ Main Page ------------------------------ */

const RoomTypesPage = () => {
  const [hotelId, setHotelId] = useState('');
  const [hotels, setHotels] = useState([]);
  const [roomsRaw, setRoomsRaw] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMsg, setErrorDialogMsg] = useState('');
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successDialogMsg, setSuccessDialogMsg] = useState('');
  const [filterInputs, setFilterInputs] = useState({ search: '', status: '' });
  const [statusDialog, setStatusDialog] = useState({ open: false, room: null, newStatus: '',title:'', message:'' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, room: null });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [modalInitialData, setModalInitialData] = useState(null);
  
  const loadRooms = useCallback(async () => {
    if (!hotelId) { setRoomsRaw([]); return; }
    try {
      setLoading(true);
      const res = await fetchRoomTypes(hotelId);
      const rawList = res?.data?.rooms || [];
      const mappedList = rawList.map((room) => ({
        ...room,
        name: room.roomname,
        maxOccupancy: room.maximumoccupancy,
        maxChildOccupancy: room.maxchildoccupancy || 0, 
        roomRate: room.rate,
        sizeMeasurement: room.sizemeasurement, 
        sizeMeasurementUnit: room.sizemeasurementunit,
        addressLine: room.Address?.AddressLine,
        cityName: room.Address?.CityName,
        postalCode: room.Address?.PostalCode,
        countryName: room.Address?.CountryName,
        latitude: room.Position?.Latitude,
        longitude: room.Position?.Longitude,
        facilities: room.Facilities?.Facility || []
      }));
      setRoomsRaw(mappedList);
    } catch (err) {
      setErrorDialogMsg(err.message || 'Failed to fetch room types');
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const res = await fetchProperties();
        const hotelList = res?.data?.properties || [];
        setHotels(hotelList);
        if (hotelList.length > 0) setHotelId(hotelList[0].propertyid);
      } catch (err) { console.error('Failed to fetch hotels:', err); }
    };
    fetchHotels(); 
  }, []);

  useEffect(() => {
    if (hotelId) loadRooms(); else setRoomsRaw([]);
  }, [hotelId, loadRooms]);

  const handleModalSave = (successMsg) => {
      loadRooms();
      setSuccessDialogMsg(successMsg);
      setSuccessDialogOpen(true);
  };

  const confirmStatusChange = async () => {
    const { room, newStatus } = statusDialog;
    if (!room) return;
    try {
        setLoading(true);
        const payload = {
            SellableProducts: {
                hotelid: hotelId,
                SellableProduct: [{
                    InvStatusType: newStatus,
                    InvNotifType: 'Overlay', 
                    roomid: room.roomid
                }]
            }
        };
        const res = await pushRoomTypes(payload);
        const isSuccess = res?.success === true || res?.data?.Status === 'Success';
        if (!isSuccess) {
             const errorMsg = res?.error?.Errors?.[0]?.ShortText || res?.message || 'Action failed';
             throw new Error(errorMsg);
        }
        setStatusDialog({ open: false, room: null, newStatus: '' });
        await loadRooms();
        setSuccessDialogMsg(`Successfully ${newStatus === 'Active' ? 'activated' : 'deactivated'} the room type`);
        setSuccessDialogOpen(true);
    } catch (err) {
        setErrorDialogMsg(err.message);
        setErrorDialogOpen(true);
    } finally {
        setLoading(false);
    }
  };

  const confirmDelete = async () => {
    const { room } = deleteDialog;
    if (!room) return;
    try {
        setLoading(true);
        const payload = {
            SellableProducts: {
                hotelid: hotelId,
                SellableProduct: [{
                    InvStatusType: 'Delete',
                    InvNotifType: 'Overlay', 
                    roomid: room.roomid
                }]
            }
        };
        const res = await pushRoomTypes(payload);
        const isSuccess = res?.success === true || res?.data?.Status === 'Success';
        if (!isSuccess) throw new Error(res?.error?.Errors?.[0]?.ShortText || 'Delete failed');

        setDeleteDialog({ open: false, room: null });
        await loadRooms();
        setSuccessDialogMsg('Successfully deleted the room type');
        setSuccessDialogOpen(true);
    } catch (err) {
        setErrorDialogMsg(err.message);
        setErrorDialogOpen(true);
    } finally {
        setLoading(false);
    }
  };

  const mapRowToForm = (row) => ({
    hotelId,
    roomid: row.roomid,
    name: row.name, 
    roomDescription: '', 
    maxOccupancy: row.maxOccupancy, 
    maxChildOccupancy: row.maxChildOccupancy,
    roomRate: row.roomRate, 
    quantity: row.quantity,
    roomType: row.roomType,
    sizeMeasurement: row.sizeMeasurement,
    sizeMeasurementUnit: row.sizeMeasurementUnit || 'sqm',
    invStatusType: row.status || 'Initial',
    addressLine: row.addressLine,
    cityName: row.cityName,
    postalCode: row.postalCode,
    countryName: row.countryName,
    latitude: row.latitude,
    longitude: row.longitude,
    facilities: row.facilities
  });

  const openCreateModal = () => { setModalMode('create'); setModalInitialData(null); setModalOpen(true); };
  const openViewModal = (row) => { setModalMode('view'); setModalInitialData(mapRowToForm(row)); setModalOpen(true); };
  const openEditModal = (row) => { setModalMode('edit'); setModalInitialData(mapRowToForm(row)); setModalOpen(true); };

  const openStatusDialog = (room, status) => {
    const isActive = status === 'Active';
    const title = isActive ? "Activate Room Type" : "Deactivate Room Type";
    const message = `Are you sure you want to ${isActive ? 'activate' : 'deactivate'} "${room.name}"?`;
    setStatusDialog({ open: true, room, newStatus: status, title, message });
  };
  const openDeleteDialog = (room) => setDeleteDialog({ open: true, room });

  const handleFilterChange = (field) => (e) => setFilterInputs(prev => ({ ...prev, [field]: e.target.value }));
  const handleApplyFilters = () => {}; // Live filter doesn't need apply button logic
  const handleResetFilters = () => { setFilterInputs({ search: '', status: '' }); };
  const handleHotelChange = (e) => setHotelId(e.target.value);

  const filteredRooms = roomsRaw?.filter(r => {
    if (filterInputs.search && !r.name?.toLowerCase().includes(filterInputs.search.toLowerCase()) && !r.roomid?.toLowerCase().includes(filterInputs.search.toLowerCase())) return false;
    if (filterInputs.status && r.status !== filterInputs.status) return false;
    return true;
  });

  return (
    <div className="rt-page">
      {loading && <LoaderOverlay open={loading} />}
      <div className="rt-page-header">
        <h1>Room Types</h1>
        <button type="button" className="rt-add-btn" onClick={openCreateModal}>+ Add Room Type</button>
      </div>

      <div className="rt-hotel-row">
        <div className="rt-hotel-field">
          <label>Hotel ID</label>
          <select value={hotelId} onChange={handleHotelChange} disabled={loading}>
            <option value="">Select Hotel</option>
            {hotels.map((h) => <option key={h.propertyid} value={h.propertyid}>{h.propertyname} ({h.propertyid})</option>)}
          </select>
        </div>
      </div>

      <div className="rt-filter-card">
        <div className="rt-filter-row">
          <div className="rt-filter-field rt-filter-search">
            <input placeholder="Room Type by ID or Name" value={filterInputs.search} onChange={handleFilterChange('search')} />
          </div>
          <div className="rt-filter-field">
            <select value={filterInputs.status} onChange={handleFilterChange('status')}>
              <option value="">Status</option>
              <option value="Active">Active</option>
              <option value="Deactivated">Deactivated</option>
            </select>
          </div>
          <div className="rt-filter-actions">
            <button className="rt-icon-btn" onClick={handleApplyFilters}>🔍</button>
            <button className="rt-icon-btn" onClick={handleResetFilters}>⟳</button>
          </div>
        </div>

        <div className="rt-table-wrapper">
          <table className="rt-table">
            <thead>
              <tr><th>Room ID</th><th>Room Name</th><th>Max Occ</th><th>Base Rate</th><th>Status</th><th className="rt-col-action">Action</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="rt-table-empty">Loading...</td></tr>}
              {!loading && !hotelId && <tr><td colSpan={6} className="rt-table-empty">Please select a hotel</td></tr>}
              {!loading && hotelId && filteredRooms?.length === 0 && <tr><td colSpan={6} className="rt-table-empty">No room types found</td></tr>}
              {!loading && filteredRooms?.map((room) => (
                 <tr key={room.roomid}>
                   <td className="rt-cell-id"><span className="rt-row-strip" /><span>{room.roomid}</span></td>
                   <td>{room.name || '-'}</td>
                   <td>{room.maxOccupancy || '-'}</td>
                   <td>{room.roomRate || '-'}</td>
                   <td className="rt-status-cell">
                      <span style={{ color: room.status === 'Active' ? '#16a34a' : '#0b5ed7' }}>
                        {room.status || 'Initial'}
                      </span>
                   </td>
                   <td className="rt-col-action-cell">
                      <ActionMenu 
                        status={room.status}
                        onView={() => openViewModal(room)} 
                        onEdit={() => openEditModal(room)} 
                        onActivate={() => openStatusDialog(room, 'Active')}
                        onDeactivate={() => openStatusDialog(room, 'Deactivated')}
                        onDelete={() => openDeleteDialog(room)}
                      />
                   </td>
                 </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RoomTypeFormModal 
        open={modalOpen} 
        mode={modalMode} 
        hotelId={hotelId} 
        hotels={hotels} 
        initialData={modalInitialData} 
        onClose={() => setModalOpen(false)} 
        onSaved={handleModalSave} 
      />
      
      <MessageDialog open={errorDialogOpen} title="Error" message={errorDialogMsg} onClose={() => setErrorDialogOpen(false)} />
      <MessageDialog open={successDialogOpen} title="Success" message={successDialogMsg} onClose={() => setSuccessDialogOpen(false)} />

      <StatusChangeDialog 
        open={statusDialog.open} 
        status={statusDialog.newStatus} 
        onClose={() => setStatusDialog({ open: false, room: null, newStatus: '' })} 
        onConfirm={confirmStatusChange} 
        title={statusDialog.title}       // <--- NEW
        message={statusDialog.message}
      />

      <DeleteConfirmationDialog 
        open={deleteDialog.open} 
        onClose={() => setDeleteDialog({ open: false, room: null })} 
        onConfirm={confirmDelete} 
        title="Delete Room Type"
        message="Are you sure you want to delete this room type? This action cannot be undone."
      />
    </div>
  );
};

export default RoomTypesPage;