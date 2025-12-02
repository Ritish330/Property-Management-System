import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  fetchRoomTypes,
  pushRoomTypes,
  fetchProperties,
} from '../api/client';
import MessageDialog from '../components/MessageDialog';
import LoaderOverlay from '../components/LoaderOverlay';
import './RoomTypes.css';

/* ------------------ 3-dot Action Menu ------------------ */

const ActionMenu = ({ onView, onEdit }) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  const toggle = (e) => {
    e.stopPropagation();
    if (!btnRef.current) return;
    if (open) {
      setOpen(false);
      return;
    }
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 6,
      left: Math.max(rect.right - 200, 8), 
    });
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
          <button type="button" className="rt-action-item" onClick={(e) => { e.stopPropagation(); close(); onView && onView(); }}>
            View Room Type
          </button>
          <button type="button" className="rt-action-item" onClick={(e) => { e.stopPropagation(); close(); onEdit && onEdit(); }}>
            Edit Room Type
          </button>
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
  amenities: [], // Stores UI structure
};

const ROOM_TYPE_OPTIONS = [
  "Apartment", "Bungalow", "Chalet", "Double", "Family", "King", "Queen", "Single", "Suite", "Studio", "Twin", "Triple", "Quadruple", "Villa"
];

const SECTIONS = [
  { id: 'listing', label: 'Listing Types' },
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

  // Amenities local state
  const [newGroup, setNewGroup] = useState('');
  const [newItemText, setNewItemText] = useState({});

  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setActiveSection('listing');
    setNewGroup('');
    setNewItemText({});
    
    if (initialData) {
      // API Amenities -> UI Structure
      const apiFacilities = initialData.facilities || [];
      const grouped = {};
      apiFacilities.forEach(f => {
        if (!grouped[f.Group]) grouped[f.Group] = [];
        grouped[f.Group].push({ name: f.name, checked: true });
      });
      const amenitiesUI = Object.keys(grouped).map(g => ({
        group: g,
        items: grouped[g]
      }));

      setForm({ 
        ...EMPTY_FORM, 
        hotelId: hotelId || initialData.hotelId, 
        ...initialData,
        amenities: amenitiesUI 
      });
    } else {
      // Default Amenities
      const defaultAmenities = [
        { group: 'Bedding', items: [{ name: 'King Size Bed', checked: false }] },
        { group: 'Bathroom', items: [{ name: 'Hot & Cold Shower', checked: false }] },
        { group: 'Entertainment', items: [{ name: '32-inch LED TV', checked: false }] },
        { group: 'Food & Beverage', items: [{ name: 'Complimentary Breakfast', checked: false }] }
      ];
      setForm({ ...EMPTY_FORM, hotelId: hotelId || '', amenities: defaultAmenities });
    }
  }, [open, initialData, hotelId]);

  if (!open) return null;

  const title = isView ? 'View Room Type' : isEdit ? 'Edit Room Type' : 'Add Room Type';

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  // Amenities Handlers
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
    const items = text.split(',').map(s => s.trim()).filter(Boolean);
    items.forEach(i => newAmenities[groupIndex].items.push({ name: i, checked: true }));
    setForm(prev => ({ ...prev, amenities: newAmenities }));
    setNewItemText(prev => ({ ...prev, [groupIndex]: '' }));
  };

  // Scrollspy logic
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const containerTop = scrollContainerRef.current.scrollTop + 120; 
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

  // Validation
  const validate = () => {
    const newErrors = {};
    if (!form.hotelId) newErrors.hotelId = "Hotel is required.";
    if (!form.roomid) newErrors.roomid = "Room ID is required.";
    else if (form.roomid.length > 20) newErrors.roomid = "Max 20 chars.";
    else if (!/^[a-zA-Z0-9-]+$/.test(form.roomid)) newErrors.roomid = "Alphanumeric & hyphen only.";

    if (!form.name) newErrors.name = "Room Name is required.";
    if (!form.roomRate || Number(form.roomRate) <= 0) newErrors.roomRate = "Valid Rate required.";
    if (!form.maxOccupancy || Number(form.maxOccupancy) > 999) newErrors.maxOccupancy = "Valid Max Adult required.";
    
    if (form.maxChildOccupancy === '' || form.maxChildOccupancy === null) newErrors.maxChildOccupancy = "Required.";
    else if (Number(form.maxChildOccupancy) >= Number(form.maxOccupancy)) newErrors.maxChildOccupancy = "Must be < Max Adult.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) scrollToSection('listing');
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isView) { onClose(); return; }
    if (!validate()) return;

    const isModify = isEdit;

    // Transform UI Amenities -> API Structure
    const facilityList = [];
    form.amenities.forEach(group => {
        group.items.forEach(item => {
            if (item.checked) {
                facilityList.push({ Group: group.group, name: item.name });
            }
        });
    });

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
      if (!res || res.Status !== 'Success') {
        const msg = res?.Errors?.[0]?.ShortText || res?.Status || 'Failed to push room type';
        setDialogMsg(msg);
        setDialogOpen(true);
        return;
      }
      onSaved && onSaved();
      onClose();
    } catch (err) {
      setDialogMsg(err.message || 'Error occurred.');
      setDialogOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const isDisabled = isView || saving;
  const primaryLabel = isCreate ? 'Save' : 'Update';

  return (
    <>
      <div className="rt-modal-backdrop">
        <div className="rt-modal">
          <div className="rt-modal-header">
            <h2>{title}</h2>
            <button type="button" className="rt-modal-close" onClick={onClose} disabled={saving}>✕</button>
          </div>

          {/* Sticky Navigation */}
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

          {/* Scrollable Content Form */}
          <form 
            className="rt-modal-content" 
            onSubmit={handleSubmit} 
            onScroll={handleScroll} 
            ref={scrollContainerRef}
          >
            {/* Section 1: Listing Types */}
            <div id="section-listing" className="rt-scroll-section">
               <div className="rt-section-header">Listing Details</div>
               
               <div className="rt-form-grid">
                  <div className="rt-form-field">
                    <label>Hotel ID<span className="rt-required">*</span></label>
                    <select name="hotelId" value={form.hotelId} onChange={onChange} disabled={isEdit || isDisabled} className={errors.hotelId ? 'rt-input-error' : ''}>
                      <option value="">Select Hotel</option>
                      {Array.isArray(hotels) && hotels.map((h) => (
                        <option key={h.propertyid} value={h.propertyid}>{h.propertyname} ({h.propertyid})</option>
                      ))}
                    </select>
                    {errors.hotelId && <span className="rt-error-text">{errors.hotelId}</span>}
                  </div>
                  <div className="rt-form-field">
                    <label>PMS Room ID<span className="rt-required">*</span></label>
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
                    <label>Max. Adult<span className="rt-required">*</span></label>
                    <input type="number" name="maxOccupancy" value={form.maxOccupancy} onChange={onChange} disabled={isDisabled} className={errors.maxOccupancy ? 'rt-input-error' : ''} />
                    {errors.maxOccupancy && <span className="rt-error-text">{errors.maxOccupancy}</span>}
                 </div>
                 <div className="rt-form-field">
                    <label>Max. Child<span className="rt-required">*</span></label>
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
                     <select name="sizeMeasurementUnit" value={form.sizeMeasurementUnit} onChange={onChange} disabled={isDisabled} style={{width:'90px'}}>
                       <option value="sqm">sqm</option>
                       <option value="sqft">sqft</option>
                     </select>
                   </div>
                 </div>
               </div>

               <div className="rt-form-field" style={{marginTop:'10px'}}>
                  <label>Description</label>
                  <textarea name="roomDescription" value={form.roomDescription} onChange={onChange} rows={4} disabled={isDisabled} maxLength={2000} />
                  <span className="rt-char-hint">{2000 - (form.roomDescription?.length || 0)} chars left</span>
               </div>
            </div>

            {/* Section 2: Amenities */}
            <div id="section-amenities" className="rt-scroll-section">
               <div className="rt-section-header">Amenities</div>
               
               {!isView && (
                 <div style={{ marginBottom:'16px', display:'flex', gap:'8px', alignItems:'flex-end' }}>
                    <div className="rt-form-field" style={{flex:1}}>
                        <label>Add New Amenity Category</label>
                        <input 
                            placeholder="e.g. Kitchen" 
                            value={newGroup}
                            onChange={(e) => setNewGroup(e.target.value)}
                        />
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
                       {group.items.map((item, iIndex) => (
                          <label key={iIndex} className="rt-amenity-item">
                             <input 
                                type="checkbox" 
                                checked={item.checked} 
                                onChange={() => toggleAmenity(gIndex, iIndex)}
                                disabled={isView}
                             />
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

            {/* Section 3: Images */}
            <div id="section-images" className="rt-scroll-section">
               <div className="rt-section-header">Images</div>
               <div className="rt-section" style={{minHeight:'150px', display:'flex', alignItems:'center', justifyContent:'center', border:'2px dashed #e5e7eb'}}>
                  <span style={{color:'#9ca3af'}}>+ Upload Images (Max 20MB)</span>
               </div>
            </div>

            {/* Section 4: Fees */}
            <div id="section-fees" className="rt-scroll-section">
               <div className="rt-section-header">Fees</div>
               <div className="rt-section"><p style={{padding:'10px', margin:0}}>Fees configuration goes here...</p></div>
            </div>

            {/* Section 5: Bedding */}
            <div id="section-bedding" className="rt-scroll-section">
               <div className="rt-section-header">Bedding</div>
               <div className="rt-section"><p style={{padding:'10px', margin:0}}>Bedding configuration goes here...</p></div>
            </div>

          </form>

          {/* Footer - Fixed at bottom */}
          <div className="rt-modal-footer">
            <button type="button" className="rt-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            {!isView && <button type="button" className="rt-btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : primaryLabel}</button>}
          </div>
        </div>
      </div>
      {saving && <LoaderOverlay open={saving} />}
      <MessageDialog open={dialogOpen} title="Room Type Error" message={dialogMsg} onClose={() => setDialogOpen(false)} />
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
  const [filterInputs, setFilterInputs] = useState({ search: '', status: '' });
  const [filters, setFilters] = useState({ search: '', status: '' });
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
        // Map Facilities for Edit Form
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
    facilities: row.facilities // Pass mapped facilities to modal
  });

  const openCreateModal = () => { setModalMode('create'); setModalInitialData(null); setModalOpen(true); };
  const openViewModal = (row) => { setModalMode('view'); setModalInitialData(mapRowToForm(row)); setModalOpen(true); };
  const openEditModal = (row) => { setModalMode('edit'); setModalInitialData(mapRowToForm(row)); setModalOpen(true); };

  const handleFilterChange = (field) => (e) => setFilterInputs(prev => ({ ...prev, [field]: e.target.value }));
  const handleApplyFilters = () => setFilters(filterInputs);
  const handleResetFilters = () => { setFilterInputs({ search: '', status: '' }); setFilters({ search: '', status: '' }); };
  const handleHotelChange = (e) => setHotelId(e.target.value);

  const filteredRooms = roomsRaw?.filter(r => {
    if (filters.search && !r.name?.toLowerCase().includes(filters.search.toLowerCase()) && !r.roomid?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.status && r.status !== filters.status) return false;
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
                   <td className="rt-status-cell">{room.status || 'Initial'}</td>
                   <td className="rt-col-action-cell"><ActionMenu onView={() => openViewModal(room)} onEdit={() => openEditModal(room)} /></td>
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
        onSaved={loadRooms} 
      />
      
      <MessageDialog open={errorDialogOpen} title="Error" message={errorDialogMsg} onClose={() => setErrorDialogOpen(false)} />
    </div>
  );
};

export default RoomTypesPage;