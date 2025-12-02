// src/pages/Properties.js
import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchProperties,
  fetchCreatedProperties,
  createOrUpdateProperty,
} from '../api/client';
import './Properties.css';
import MessageDialog from '../components/MessageDialog';
import LoaderOverlay from '../components/LoaderOverlay';

/* ---------------- 3-dot Action menu (global fixed dropdown) ---------------- */

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
    const menuWidth = 190; // approximate width of dropdown

    setMenuPos({
      top: rect.bottom + 6,
      left: Math.max(rect.right - menuWidth, 8),
    });

    setOpen(true);
  };

  // close on outside click / ESC
  useEffect(() => {
    if (!open) return;

    const handleClick = (evt) => {
      const target = evt.target;
      if (!btnRef.current) return;

      // click on the trigger button -> ignore
      if (btnRef.current.contains(target)) return;

      // click inside dropdown -> ignore
      if (menuRef.current && menuRef.current.contains(target)) return;

      setOpen(false);
    };

    const handleKey = (evt) => {
      if (evt.key === 'Escape') setOpen(false);
    };

    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        className="prop-action-trigger"
        type="button"
        onClick={toggle}
      >
        <span className="prop-action-dot" />
        <span className="prop-action-dot" />
        <span className="prop-action-dot" />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="prop-action-dropdown"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            zIndex: 9999,
          }}
        >
          <button
            type="button"
            className="prop-action-item"
            onClick={() => {
              close();
              onView && onView();
            }}
          >
            View Property
          </button>
          <button
            type="button"
            className="prop-action-item"
            onClick={() => {
              close();
              onEdit && onEdit();
            }}
          >
            Edit Property
          </button>
        </div>
      )}
    </>
  );
};

/* ---------------- Modal: Add / Edit / View property ---------------- */

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'localization', label: 'Localization' },
  { id: 'general', label: 'General Info' },
  { id: 'contact', label: 'Contact Person' },
  { id: 'config', label: 'Configurations' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'images', label: 'Images' },
];

const emptyForm = {
  // profile
  propertyId: '',
  hotelName: '',
  propertyType: '1', // 1=Hotel
  platform: 'STAAH',
  chainId: '',
  licenseNumber: '',
  description: '',

  // localization
  addressLine: '',
  countryCode: '',
  state: '',
  city: '',
  postalCode: '',
  latitude: '',
  longitude: '',
  addressMode: 'manual', // manual | auto

  // general info
  timeZone: '',
  languageCode: 'en',
  currencyCode: 'USD',

  // contact
  contactFirstName: '',
  contactLastName: '',
  notificationEmail: '',
  email: '',
  phoneNumber: '',

  // configuration
  checkinTime: '',
  checkoutTime: '',
  closeoutDays: '',
  closeoutTime: '',
};

const PropertyFormModal = ({ open, mode, initialData, onClose, onSaved }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [activeTab, setActiveTab] = useState('profile');
  const [form, setForm] = useState(emptyForm);

  // dialog state (local to this modal)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMsg, setDialogMsg] = useState('');

  // NEW: saving state for loader while API call is running
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setActiveTab('profile');

    if (initialData) {
      setForm({
        ...emptyForm,
        ...initialData,
      });
    } else {
      setForm(emptyForm);
    }
    setDialogOpen(false);
    setDialogMsg('');
    setSaving(false);
  }, [open, initialData]);

  if (!open) return null;

  const title = isView
    ? 'View Property'
    : isEdit
    ? 'Edit Property'
    : 'Add Property';

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onRadioChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isView) {
      onClose();
      return;
    }
    if (saving) return; // prevent double submit

    try {
      setSaving(true);

      const payload = {
        mode: isEdit ? 'update' : 'create',
        ...form,
      };

      const res = await createOrUpdateProperty(payload);

      if (!res.success) {
        setDialogMsg(res.message || 'Failed to save property');
        setDialogOpen(true);
        return;
      }

      onSaved && onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving property:', err);
      setDialogMsg(err.message || 'Error saving property');
      setDialogOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const disabled = isView;
  const primaryLabel = isCreate ? 'Submit' : 'Save';

  return (
    <>
      <div className="prop-modal-backdrop">
        <div className="prop-modal">
          {/* Header */}
          <div className="prop-modal-header">
            <h2>{title}</h2>
            <button
              type="button"
              className="prop-modal-close"
              onClick={onClose}
              disabled={saving}
            >
              ✕
            </button>
          </div>

          {/* Tab bar */}
          <div className="prop-modal-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={
                  'prop-modal-tab' +
                  (activeTab === t.id ? ' prop-modal-tab-active' : '')
                }
                onClick={() => !saving && setActiveTab(t.id)}
                disabled={saving}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <form className="prop-modal-body" onSubmit={handleSubmit}>
            {/* (all the tab content exactly as you already have it) */}
            {/* PROFILE, LOCALIZATION, GENERAL, CONTACT, CONFIG, AMENITIES, IMAGES */}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="prop-section">
                <div className="prop-section-title-row">
                  <span className="prop-section-icon">▌</span>
                  <span className="prop-section-title">Property</span>
                </div>

                <div className="prop-form-grid">
                  <div className="prop-form-field">
                    <label>Property Name</label>
                    <input
                      name="hotelName"
                      value={form.hotelName}
                      onChange={onChange}
                      disabled={disabled || saving}
                    />
                  </div>
                  <div className="prop-form-field">
                    <label>
                      Property ID<span className="prop-required">*</span>
                    </label>
                    <input
                      name="propertyId"
                      value={form.propertyId}
                      onChange={onChange}
                      disabled={isEdit || disabled || saving}
                    />
                  </div>
                  <div className="prop-form-field">
                    <label>
                      Property Type<span className="prop-required">*</span>
                    </label>
                    <select
                      name="propertyType"
                      value={form.propertyType}
                      onChange={onChange}
                      disabled={disabled || saving}
                    >
                      <option value="1">Hotel</option>
                      <option value="2">Motel</option>
                      <option value="3">Vacation Rental</option>
                    </select>
                  </div>
                </div>

                <div className="prop-form-grid">
                  <div className="prop-form-field">
                    <label>License Number</label>
                    <input
                      name="licenseNumber"
                      value={form.licenseNumber}
                      onChange={onChange}
                      disabled={disabled || saving}
                    />
                  </div>
                </div>

                <div className="prop-form-field">
                  <label>About Your Property</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={onChange}
                    rows={4}
                    disabled={disabled || saving}
                  />
                  <div className="prop-char-hint">Max Characters : 2000</div>
                </div>
              </div>
            )}

            {/* (keep all your other tabs exactly the same but add `|| saving` to disabled props) */}
            {/* ... LOCALIZATION, GENERAL, CONTACT, CONFIG, AMENITIES, IMAGES ... */}

            {/* footer buttons */}
            <div className="prop-modal-footer">
              <button
                type="button"
                className="prop-btn-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              {!isView && (
                <button
                  type="submit"
                  className="prop-btn-primary"
                  disabled={saving}
                >
                  {saving ? `${primaryLabel}...` : primaryLabel}
                </button>
              )}
            </div>

            {/* inline overlay loader for saving */}
            <LoaderOverlay
              open={saving}
              message={isCreate ? 'Submitting property...' : 'Saving property...'}
            />
          </form>
        </div>
      </div>

      <MessageDialog
        open={dialogOpen}
        title="Property Error"
        message={dialogMsg}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
};

/* ---------------- Main page ---------------- */

const PropertiesPage = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMsg, setErrorDialogMsg] = useState('');

  const [apiProperties, setApiProperties] = useState([]);
  const [createdProperties, setCreatedProperties] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [modalInitialData, setModalInitialData] = useState(null);

  // filter inputs (what the user is typing/selecting in the UI)
  const [filterInputs, setFilterInputs] = useState({
    search: '',
    chain: '',
    channel: '',
    status: '',
  });

  // actually applied filters (when user clicks search)
  const [filters, setFilters] = useState({
    search: '',
    chain: '',
    channel: '',
    status: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);

      const propsRes = await fetchProperties();
      const listFromApi = propsRes?.data?.properties || [];
      setApiProperties(listFromApi);

      const createdRes = await fetchCreatedProperties();
      const createdList = createdRes?.data?.properties || [];
      setCreatedProperties(createdList);
    } catch (err) {
      console.error('Error loading properties page:', err);
      setErrorDialogMsg(err.message || 'Failed to load properties');
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Build options for Chain & Channels selects based on data
  const chainOptions = useMemo(() => {
    const set = new Set();
    apiProperties.forEach((p) => {
      if (p.chainid) set.add(p.chainid);
    });
    return Array.from(set);
  }, [apiProperties]);

  const channelOptions = useMemo(() => {
    const set = new Set();
    apiProperties.forEach((p) => {
      if (p.plateform) set.add(p.plateform);
    });
    return Array.from(set);
  }, [apiProperties]);

  // Apply filters to properties list
  const filteredProperties = useMemo(() => {
    return apiProperties.filter((p) => {
      const id = (p.propertyid || '').toString().toLowerCase();
      const name = (p.propertyname || '').toLowerCase();
      const chain = (p.chainid || '').toLowerCase();
      const channel = (p.plateform || '').toLowerCase();
      const status = (p.status || '').toLowerCase();

      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (!id.includes(s) && !name.includes(s)) return false;
      }

      if (filters.chain) {
        if (chain !== filters.chain.toLowerCase()) return false;
      }

      if (filters.channel) {
        if (channel !== filters.channel.toLowerCase()) return false;
      }

      if (filters.status) {
        if (status !== filters.status.toLowerCase()) return false;
      }

      return true;
    });
  }, [apiProperties, filters]);

  const mapApiPropertyToForm = (p) => ({
    propertyId: p.propertyid,
    hotelName: p.propertyname,
    platform: p.plateform || 'STAAH',
    chainId: p.chainid || '',
    city: p.city || '',
  });

  const mapCreatedPropertyToForm = (p) => ({
    propertyId: p.propertyId,
    hotelName: p.propertyName,
    platform: p.platform || 'STAAH',
    chainId: p.chainId || '',
    city: p.city || '',
    countryCode: p.countryCode || '',
  });

  const openCreateModal = () => {
    setModalMode('create');
    setModalInitialData(null);
    setModalOpen(true);
  };

  const openViewModalFromApi = (p) => {
    setModalMode('view');
    setModalInitialData(mapApiPropertyToForm(p));
    setModalOpen(true);
  };

  const openEditModalFromApi = (p) => {
    setModalMode('edit');
    setModalInitialData(mapApiPropertyToForm(p));
    setModalOpen(true);
  };

  const openViewModalFromCreated = (p) => {
    setModalMode('view');
    setModalInitialData(mapCreatedPropertyToForm(p));
    setModalOpen(true);
  };

  const openEditModalFromCreated = (p) => {
    setModalMode('edit');
    setModalInitialData(mapCreatedPropertyToForm(p));
    setModalOpen(true);
  };

  const handleFilterInputChange = (field) => (e) => {
    const value = e.target.value;
    setFilterInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    setFilters(filterInputs);
  };

  const handleResetFilters = () => {
    const empty = { search: '', chain: '', channel: '', status: '' };
    setFilterInputs(empty);
    setFilters(empty);
  };

  return (
    <div className="property-page">
      <div className="property-page-header">
        <h1>Property</h1>
        <button
          type="button"
          className="prop-add-btn"
          onClick={openCreateModal}
        >
          + Add Property
        </button>
      </div>

      {/* filter card + top table */}
      <div className="prop-filter-card" style={{ position: 'relative' }}>
        <div className="prop-filter-row">
          <div className="prop-filter-field prop-filter-search">
            <input
              placeholder="Property by Id, Name"
              value={filterInputs.search}
              onChange={handleFilterInputChange('search')}
            />
          </div>

          <div className="prop-filter-field">
            <select
              value={filterInputs.chain}
              onChange={handleFilterInputChange('chain')}
            >
              <option value="">Chain</option>
              {chainOptions.map((c) => (
                <option key={c} value={c}>
                  {c || '-'}
                </option>
              ))}
            </select>
          </div>

          <div className="prop-filter-field">
            <select
              value={filterInputs.channel}
              onChange={handleFilterInputChange('channel')}
            >
              <option value="">Channels</option>
              {channelOptions.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>

          <div className="prop-filter-field">
            <select
              value={filterInputs.status}
              onChange={handleFilterInputChange('status')}
            >
              <option value="">Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="prop-filter-actions">
            <button
              type="button"
              className="prop-icon-btn"
              onClick={handleApplyFilters}
              title="Search"
            >
              🔍
            </button>
            <button
              type="button"
              className="prop-icon-btn"
              onClick={handleResetFilters}
              title="Reset"
            >
              ⟳
            </button>
          </div>
        </div>

        <div className="prop-table-wrapper">
          <table className="prop-table">
            <thead>
              <tr>
                <th>Property ID</th>
                <th>Property Name</th>
                <th>City</th>
                <th>Chain ID</th>
                <th>Status</th>
                <th className="prop-col-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filteredProperties.length === 0 && (
                <tr>
                  <td colSpan={6} className="prop-table-empty">
                    No properties found
                  </td>
                </tr>
              )}
              {!loading &&
                filteredProperties.map((p) => (
                  <tr key={p.propertyid}>
                    <td className="prop-cell-id">
                      <span className="prop-row-strip" />
                      <span>{p.propertyid}</span>
                    </td>
                    <td>{p.propertyname}</td>
                    <td>{p.city || '-'}</td>
                    <td>{p.chainid || '-'}</td>
                    <td className="prop-status-active">
                      {p.status || 'Active'}
                    </td>
                    <td>
                      <ActionMenu
                        onView={() => openViewModalFromApi(p)}
                        onEdit={() => openEditModalFromApi(p)}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* loader over the card while fetching properties */}
        <LoaderOverlay open={loading} message="Loading properties..." />
      </div>

      {/* bottom section: created/updated in this session */}
      <div className="prop-bottom-section">
        <h2>Properties created/updated in this session</h2>
        <p className="prop-bottom-caption">
          These are properties you created or updated via this admin portal
          since the backend started.
        </p>

        <div className="prop-table-wrapper" style={{ position: 'relative' }}>
          <table className="prop-table">
            <thead>
              <tr>
                <th>Property ID</th>
                <th>Property Name</th>
                <th>City</th>
                <th>Country</th>
                <th>Platform</th>
                <th>Chain / Channel</th>
                <th>Mode</th>
                <th>Pushed At</th>
                <th className="prop-col-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {createdProperties.length === 0 && (
                <tr>
                  <td colSpan={9} className="prop-table-empty">
                    No properties created/updated yet in this session
                  </td>
                </tr>
              )}
              {createdProperties.map((p) => (
                <tr key={`${p.propertyId}-${p.pushedAt}`}>
                  <td className="prop-cell-id">
                    <span className="prop-row-strip" />
                    <span>{p.propertyId}</span>
                  </td>
                  <td>{p.propertyName}</td>
                  <td>{p.city || '-'}</td>
                  <td>{p.countryCode || '-'}</td>
                  <td>{p.platform || '-'}</td>
                  <td>{p.chainId || '-'}</td>
                  <td>{p.mode}</td>
                  <td>{p.pushedAt}</td>
                  <td>
                    <ActionMenu
                      onView={() => openViewModalFromCreated(p)}
                      onEdit={() => openEditModalFromCreated(p)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PropertyFormModal
        open={modalOpen}
        mode={modalMode}
        initialData={modalInitialData}
        onClose={() => setModalOpen(false)}
        onSaved={loadData}
      />

      <MessageDialog
        open={errorDialogOpen}
        title="Error"
        message={errorDialogMsg}
        onClose={() => setErrorDialogOpen(false)}
      />
    </div>
  );
};

export default PropertiesPage;
