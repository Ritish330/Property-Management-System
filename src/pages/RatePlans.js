  import React, { useEffect, useState, useCallback, useRef } from 'react';
  import {
    fetchRatePlans,
    pushRatePlans,
    fetchProperties,
  } from '../api/client';
  import MessageDialog from '../components/MessageDialog';
  import LoaderOverlay from '../components/LoaderOverlay';
  import StatusChangeDialog from '../components/StatusChangeDialog';
  import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';
  import './RatePlans.css';

  // Data imports
  import { MEAL_PLAN_OPTIONS } from '../constantdata/MealPlanOptions';

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
        <button ref={btnRef} className="rp-action-trigger" type="button" onClick={toggle}>
          <span className="rp-action-dot" /><span className="rp-action-dot" /><span className="rp-action-dot" />
        </button>
        {open && (
          <div ref={menuRef} className="rp-action-dropdown" style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}>
            <button type="button" className="rp-action-item" onClick={(e) => { e.stopPropagation(); close(); onView && onView(); }}>View Rate Plan</button>
            <button type="button" className="rp-action-item" onClick={(e) => { e.stopPropagation(); close(); onEdit && onEdit(); }}>Edit Rate Plan</button>
            <hr style={{margin:'4px 0', border:'0', borderTop:'1px solid #eee'}}/>
            {status !== 'Active' && <button type="button" className="rp-action-item" onClick={(e) => { e.stopPropagation(); close(); onActivate && onActivate(); }}>Activate</button>}
            {status === 'Active' && <button type="button" className="rp-action-item" onClick={(e) => { e.stopPropagation(); close(); onDeactivate && onDeactivate(); }}>Deactivate</button>}
            <button type="button" className="rp-action-item rp-action-danger" onClick={(e) => { e.stopPropagation(); close(); onDelete && onDelete(); }}>Delete</button>
          </div>
        )}
      </div>
    );
  };

  /* ------------------ Rate Plan Form Modal ------------------ */

  const EMPTY_FORM = {
    hotelId: '',
    invStatusType: 'Initial',
    rateplanid: '',
    name: '',
    description: '',
    mealPlanId: '15',
    closeOutDays: '-1',
    closeOutTime: '-1',
  };

  const CLOSE_OUT_DAYS_OPTIONS = Array.from({length: 31}, (_, i) => i.toString());

  const RatePlanFormModal = ({ open, mode, hotelId, hotels, initialData, onClose, onSaved }) => {
    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const isCreate = mode === 'create';

    const [form, setForm] = useState({ ...EMPTY_FORM, hotelId });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMsg, setDialogMsg] = useState('');

    useEffect(() => {
      if (!open) return;
      setErrors({});
      if (initialData) {
        setForm({
          hotelId: hotelId || initialData.hotelId,
          rateplanid: initialData.rateplanid || '',
          name: initialData.name || '',
          description: initialData.description || '',
          mealPlanId: initialData.mealPlanId || '15',
          closeOutDays: initialData.closeOutDays || '-1',
          closeOutTime: initialData.closeOutTime || '-1'
        });
      } else {
        setForm({ ...EMPTY_FORM, hotelId: hotelId || '' });
      }
    }, [open, initialData, hotelId]);

    if (!open) return null;

    const title = isView ? 'View Rate Plan' : isEdit ? 'Edit Rate Plan' : 'Add Rate Plan';
    const primaryLabel = isCreate ? 'Submit' : 'Save';
    const isDisabled = isView || saving;

    const onChange = (e) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
      if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
    };

    const validate = () => {
      const newErrors = {};
      if (!form.hotelId) newErrors.hotelId = "Hotel is required";
      
      if (!form.rateplanid) newErrors.rateplanid = "Rate Plan ID is required";
      else if (!/^[a-zA-Z0-9-]+$/.test(form.rateplanid)) newErrors.rateplanid = "Alphanumeric & hyphen only (no spaces)";
      else if (form.rateplanid.length > 20) newErrors.rateplanid = "Max 20 characters allowed";

      if (!form.name) newErrors.name = "Rate Name is required";
      
      if (form.closeOutDays === '0' && (form.closeOutTime === '-1' || !form.closeOutTime)) {
          newErrors.closeOutTime = "Required when Close-Out Days is 0";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (isView) { onClose(); return; }
      if (!validate()) return;

      const notifType = isCreate ? 'New' : 'Overlay'; 

      const payload = {
        RatePlans: {
          hotelid: form.hotelId,
          RatePlan: [
            {
              RatePlanNotifType: notifType,
              rateplanid: form.rateplanid,
              MealPlanID: form.mealPlanId,
              ...(form.closeOutDays !== '-1' ? { closeoutdays: form.closeOutDays } : {}),
              ...(form.closeOutDays === '0' && form.closeOutTime !== '-1' ? { closeouttime: form.closeOutTime } : {}),
              Description: {
                  Name: form.name,
                  ...(form.description ? { Text: form.description } : {})
              }
            }
          ]
        }
      };

      try {
        setSaving(true);
        const res = await pushRatePlans(payload);
        
        const isSuccess = res?.success === true || res?.data?.Status === 'Success' || res?.Status === 'Success';

        if (!isSuccess) {
          const errorMsg = 
              res?.error?.Errors?.[0]?.ShortText || 
              res?.data?.Errors?.[0]?.ShortText || 
              res?.message ||
              'Failed to save rate plan';
          setDialogMsg(errorMsg);
          setDialogOpen(true);
          return;
        }
        
        const successMsg = isCreate 
          ? 'Successfully created the rate plan' 
          : 'Successfully updated the rate plan';
          
        onSaved && onSaved(successMsg);
        onClose();
      } catch (err) {
        setDialogMsg(err.message || 'Error occurred.');
        setDialogOpen(true);
      } finally {
        setSaving(false);
      }
    };

    return (
      <>
        <div className="rp-modal-backdrop">
          <div className="rp-modal">
            <div className="rp-modal-header">
              <h2>{title}</h2>
              <button type="button" className="rp-modal-close" onClick={onClose} disabled={saving}>✕</button>
            </div>

            <form className="rp-modal-content" onSubmit={handleSubmit}>
              <div className="rp-form-grid">
                  <div className="rp-form-field">
                    <label>Hotel ID<span className="rp-required">*</span></label>
                    <select name="hotelId" value={form.hotelId} onChange={onChange} disabled={isEdit || isDisabled} className={errors.hotelId ? 'rp-input-error' : ''}>
                      <option value="">Select Hotel</option>
                      {hotels.map(h => <option key={h.propertyid} value={h.propertyid}>{h.propertyname}</option>)}
                    </select>
                    {errors.hotelId && <span className="rp-error-text">{errors.hotelId}</span>}
                  </div>
                  <div className="rp-form-field">
                    <label>PMS Rate ID<span className="rp-required">*</span></label>
                    <input name="rateplanid" value={form.rateplanid} onChange={onChange} disabled={isEdit || isDisabled} className={errors.rateplanid ? 'rp-input-error' : ''} />
                    {errors.rateplanid && <span className="rp-error-text">{errors.rateplanid}</span>}
                  </div>
              </div>

              <div className="rp-form-grid">
                  <div className="rp-form-field">
                    <label>Meal Plan</label>
                    <select name="mealPlanId" value={form.mealPlanId} onChange={onChange} disabled={isDisabled}>
                      {MEAL_PLAN_OPTIONS.map(mp => (
                          <option key={mp.id} value={mp.id}>{mp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="rp-form-field">
                    <label>Rate Name<span className="rp-required">*</span></label>
                    <input name="name" value={form.name} onChange={onChange} disabled={isDisabled} className={errors.name ? 'rp-input-error' : ''} />
                    {errors.name && <span className="rp-error-text">{errors.name}</span>}
                  </div>
              </div>

              <div className="rp-form-grid">
                  <div className="rp-form-field">
                    <label>Close-Out Days</label>
                    <select name="closeOutDays" value={form.closeOutDays} onChange={onChange} disabled={isDisabled}>
                      <option value="-1">No Close-out</option>
                      {CLOSE_OUT_DAYS_OPTIONS.map(day => (
                          <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                  <div className="rp-form-field">
                    <label>Close-Out Time (HH:MM)</label>
                    <input 
                      name="closeOutTime" 
                      value={form.closeOutTime === '-1' ? '' : form.closeOutTime} 
                      onChange={onChange} 
                      disabled={isDisabled || form.closeOutDays !== '0'} 
                      placeholder="00:30" 
                      className={errors.closeOutTime ? 'rp-input-error' : ''} 
                    />
                    {errors.closeOutTime && <span className="rp-error-text">{errors.closeOutTime}</span>}
                  </div>
              </div>

              <div className="rp-form-field">
                  <label>Description / Cancellation Policy</label>
                  <textarea name="description" value={form.description} onChange={onChange} rows={3} disabled={isDisabled} maxLength={2000} />
                  <span className="rp-char-hint">{2000 - (form.description?.length || 0)} chars left</span>
              </div>
            </form>

            <div className="rp-modal-footer">
              <button type="button" className="rp-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
              {!isView && <button type="button" className="rp-btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : primaryLabel}</button>}
            </div>
          </div>
        </div>
        {saving && <LoaderOverlay open={saving} />}
        <MessageDialog open={dialogOpen} title="Error" message={dialogMsg} onClose={() => setDialogOpen(false)} />
      </>
    );
  };

  /* ------------------------------ Main Page ------------------------------ */

  const RatePlansPage = () => {
    const [hotelId, setHotelId] = useState('');
    const [hotels, setHotels] = useState([]);
    const [ratesRaw, setRatesRaw] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Dialogs
    const [errorDialogOpen, setErrorDialogOpen] = useState(false);
    const [errorDialogMsg, setErrorDialogMsg] = useState('');
    const [successDialogOpen, setSuccessDialogOpen] = useState(false);
    const [successDialogMsg, setSuccessDialogMsg] = useState('');

    const [statusDialog, setStatusDialog] = useState({ open: false, item: null, newStatus: '', title:'', message:'' });
    const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

    const [filterText, setFilterText] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [modalInitialData, setModalInitialData] = useState(null);

    // --- Fetch Data ---
    const loadRates = useCallback(async () => {
      if (!hotelId) { setRatesRaw([]); return; }
      try {
        setLoading(true);
        const res = await fetchRatePlans(hotelId);
        // Handle varied API response structures
        const rawList = res?.data?.rateplans || res?.RatePlans?.RatePlan || [];
        
        const mappedList = (Array.isArray(rawList) ? rawList : []).map((rp) => ({
          ...rp,
          rateplanid: rp.rateplanid || rp.RatePlanID,
          name: rp.rateplanname || rp.Description?.Name || '',
          description: rp.description || rp.Description?.Text || '',
          mealPlanId: rp.mealplanid || rp.MealPlanID,
          closeOutDays: rp.closeoutdays,
          closeOutTime: rp.closeouttime,
          status: rp.status || 'Active' // Assume active if not present
        }));
        setRatesRaw(mappedList);
      } catch (err) {
        setErrorDialogMsg(err.message || 'Failed to fetch rate plans');
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
      if (hotelId) loadRates(); else setRatesRaw([]);
    }, [hotelId, loadRates]);

    // --- Action Handlers ---
    const handleModalSave = (successMsg) => {
        loadRates();
        setSuccessDialogMsg(successMsg);
        setSuccessDialogOpen(true);
    };

    const confirmStatusChange = async () => {
      const { item, newStatus } = statusDialog;
      if (!item) return;
      
      // Map status string to API Action
      let action = '';
      if (newStatus === 'Active') action = 'Activate';
      if (newStatus === 'Deactivated') action = 'Remove'; // API Doc says "Remove" to deactivate? Or "Deactivate"? 
      // API Doc says: "Accepts values: [New, Overlay, Remove, Activate]" 
      // and "To deactivate rateplan see Deactivate". The sample request for Deactivate uses "Remove" as RatePlanNotifType.
      
      if (newStatus === 'Deactivated') action = 'Remove'; 

      try {
          setLoading(true);
          const payload = {
              RatePlans: {
                  hotelid: hotelId,
                  RatePlan: [{
                      RatePlanNotifType: action,
                      rateplanid: item.rateplanid
                  }]
              }
          };
          const res = await pushRatePlans(payload);
          const isSuccess = res?.success === true || res?.data?.Status === 'Success' || res?.Status === 'Success';
          
          if (!isSuccess) throw new Error(res?.error?.Errors?.[0]?.ShortText || 'Action failed');

          setStatusDialog({ open: false, item: null, newStatus: '' });
          await loadRates();
          setSuccessDialogMsg(`Successfully ${newStatus === 'Active' ? 'activated' : 'deactivated'} the rate plan`);
          setSuccessDialogOpen(true);
      } catch (err) {
          setErrorDialogMsg(err.message);
          setErrorDialogOpen(true);
      } finally {
          setLoading(false);
      }
    };

    const confirmDelete = async () => {
      const { item } = deleteDialog;
      if (!item) return;
      try {
          setLoading(true);
          const payload = {
              RatePlans: {
                  hotelid: hotelId,
                  RatePlan: [{
                      RatePlanNotifType: 'Delete',
                      rateplanid: item.rateplanid
                  }]
              }
          };
          const res = await pushRatePlans(payload);
          const isSuccess = res?.success === true || res?.data?.Status === 'Success' || res?.Status === 'Success';
          
          if (!isSuccess) throw new Error(res?.error?.Errors?.[0]?.ShortText || 'Delete failed');

          setDeleteDialog({ open: false, item: null });
          await loadRates();
          setSuccessDialogMsg('Successfully deleted the rate plan');
          setSuccessDialogOpen(true);
      } catch (err) {
          setErrorDialogMsg(err.message);
          setErrorDialogOpen(true);
      } finally {
          setLoading(false);
      }
    };

    // --- Render Helpers ---
    const getMealPlanName = (id) => {
        const found = MEAL_PLAN_OPTIONS.find(mp => mp.id === id);
        return found ? found.name : id;
    };

    const openCreateModal = () => { setModalMode('create'); setModalInitialData(null); setModalOpen(true); };
    const openViewModal = (row) => { setModalMode('view'); setModalInitialData(row); setModalOpen(true); };
    const openEditModal = (row) => { setModalMode('edit'); setModalInitialData(row); setModalOpen(true); };

    const filteredRates = ratesRaw?.filter(r => {
      if (filterText && 
          !r.name?.toLowerCase().includes(filterText.toLowerCase()) && 
          !r.rateplanid?.toLowerCase().includes(filterText.toLowerCase())) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      return true;
    });

    // Add this function
  const openStatusDialog = (rate, status) => {
    const isActivate = status === 'Active';
    const actionWord = isActivate ? 'Activate' : 'Deactivate';
    
    // Custom Title
    const title = `${actionWord} Rate Plan`;
    
    // Custom Message
    const message = `Are you sure you want to ${actionWord.toLowerCase()} the rate plan "${rate.name}"?`;

    setStatusDialog({ 
      open: true, 
      item: rate, 
      newStatus: status,
      title,
      message
    });
  };

    return (
      <div className="rp-page">
        {loading && <LoaderOverlay open={loading} />}
        <div className="rp-page-header">
          <h1>Rate Plans</h1>
          <button type="button" className="rp-add-btn" onClick={openCreateModal}>+ Add Rate Plan</button>
        </div>

        <div className="rp-hotel-row">
          <div className="rp-hotel-field">
            <label>Hotel ID</label>
            <select value={hotelId} onChange={(e) => setHotelId(e.target.value)} disabled={loading}>
              <option value="">Select Hotel</option>
              {hotels.map((h) => <option key={h.propertyid} value={h.propertyid}>{h.propertyname} ({h.propertyid})</option>)}
            </select>
          </div>
        </div>

        <div className="rp-filter-card">
          <div className="rp-filter-row">
            <div className="rp-filter-field rp-filter-search">
              <input placeholder="Rate Plan by ID or Name" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
            </div>
            <div className="rp-filter-field">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Status</option>
                <option value="Active">Active</option>
                <option value="Deactivated">Deactivated</option>
              </select>
            </div>
            <div className="rp-filter-actions">
              <button className="rp-icon-btn">🔍</button>
              <button className="rp-icon-btn" onClick={() => { setFilterText(''); setFilterStatus(''); }}>⟳</button>
            </div>
          </div>

          <div className="rp-table-wrapper">
            <table className="rp-table">
              <thead>
                <tr><th>ID</th><th>Rate Plan</th><th>Meal Plan</th><th>Status</th><th className="rp-col-action">Action</th></tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="rp-table-empty">Loading...</td></tr>}
                {!loading && !hotelId && <tr><td colSpan={5} className="rp-table-empty">Please select a hotel</td></tr>}
                {!loading && hotelId && filteredRates?.length === 0 && <tr><td colSpan={5} className="rp-table-empty">No rate plans found</td></tr>}
                {!loading && filteredRates?.map((rate) => (
                  <tr key={rate.rateplanid}>
                    <td className="rp-cell-id"><span className="rp-row-strip" /><span>{rate.rateplanid}</span></td>
                    <td>{rate.name || '-'}</td>
                    <td>{getMealPlanName(rate.mealPlanId)}</td>
                    <td className="rp-status-cell">
                        <span style={{ color: rate.status === 'Active' ? '#16a34a' : '#0b5ed7' }}>
                          {rate.status || 'Active'}
                        </span>
                    </td>
                    <td className="rp-col-action-cell">
                        <ActionMenu 
                          status={rate.status}
                          onView={() => openViewModal(rate)} 
                          onEdit={() => openEditModal(rate)} 
                          onActivate={() => openStatusDialog(rate, 'Active')}
                          onDeactivate={() => openStatusDialog(rate, 'Deactivated')}
                          onDelete={() => setDeleteDialog({ open: true, item: rate })}
                        />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <RatePlanFormModal 
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
          onClose={() => setStatusDialog({ open: false, item: null, newStatus: '' })} 
          onConfirm={confirmStatusChange} 
          title={statusDialog.title}       // <--- Pass Title
          message={statusDialog.message}
        />

        <DeleteConfirmationDialog 
          open={deleteDialog.open} 
          onClose={() => setDeleteDialog({ open: false, item: null })} 
          onConfirm={confirmDelete} 
          title="Delete Rate Plan" // ⭐ Custom Title
          message="Are you sure you want to delete this rate plan? This action cannot be undone." // ⭐ Custom Message
        />
      </div>
    );
  };

  export default RatePlansPage;