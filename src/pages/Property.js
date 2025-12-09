// src/pages/Properties.js
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { fetchProperties, createOrUpdateProperty } from '../api/client';
import MessageDialog from '../components/MessageDialog';
import LoaderOverlay from '../components/LoaderOverlay';
import './Properties.css';

// Import Data
import { COUNTRY_LIST } from '../constantdata/CountryList'; 
import { 
  TIMEZONES, 
  CURRENCIES, 
  LANGUAGES, 
  PHONE_TYPES, 
  PROPERTY_TYPES 
} from '../constantdata/PropertyData';

/* ---------------- Action Menu (3-dots) ---------------- */
const ActionMenu = ({ onView, onEdit }) => {
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
    setMenuPos({ top: rect.bottom + 6, left: Math.max(rect.right - 160, 10) });
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
      <button ref={btnRef} className="prop-action-trigger" type="button" onClick={toggle}>
        <span className="prop-action-dot" /><span className="prop-action-dot" /><span className="prop-action-dot" />
      </button>
      {open && (
        <div ref={menuRef} className="prop-action-dropdown" style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}>
          <button type="button" className="prop-action-item" onClick={(e) => { e.stopPropagation(); close(); onView && onView(); }}>View Property</button>
          <button type="button" className="prop-action-item" onClick={(e) => { e.stopPropagation(); close(); onEdit && onEdit(); }}>Edit Property</button>
        </div>
      )}
    </div>
  );
};

/* ---------------- Property Modal (Scrollspy Form) ---------------- */

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'localization', label: 'Localization' },
  { id: 'general', label: 'General Info' },
  { id: 'contact', label: 'Contact Person' },
  { id: 'config', label: 'Configurations' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'images', label: 'Images' },
];

const INITIAL_FORM = {
  propertyId: '', hotelName: '', propertyType: '1', chainId: '', licenseNumber: '', description: '',
  addressLine: '', city: '', state: '', countryCode: '', postalCode: '', latitude: '', longitude: '',
  timeZone: '', languageCode: 'en', currencyCode: 'USD',
  firstName: '', lastName: '', email: '', phone: '', phoneTechType: '1', notificationEmail: '',
  checkinTime: '14:00', checkoutTime: '11:00', closeoutDays: '-1', closeoutTime: '',
  amenities: [],
};

const PropertyFormModal = ({ open, mode, initialData, onClose, onSaved }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [activeSection, setActiveSection] = useState('profile');
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState({ open: false, title: '', message: '', type: 'error' });

  // Scrollspy Ref
  const scrollContainerRef = useRef(null);

  // Amenities State
  const [newAmenityGroup, setNewAmenityGroup] = useState('');
  const [newAmenityName, setNewAmenityName] = useState('');

  useEffect(() => {
    if (open) {
      setErrors({});
      setActiveSection('profile');
      if (initialData) {
        // Map nested API data to flat form structure if necessary
        // For this example assuming data is already flattened or simple mapping
        setForm({ ...INITIAL_FORM, ...initialData });
      } else {
        setForm(INITIAL_FORM);
      }
    }
  }, [open, initialData]);

  if (!open) return null;

  /* --- Handlers --- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear error on type
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleAddAmenity = () => {
    if (newAmenityName) {
      setForm(prev => ({
        ...prev,
        amenities: [...prev.amenities, { group: newAmenityGroup || 'General', name: newAmenityName }]
      }));
      setNewAmenityName('');
    }
  };

  const handleRemoveAmenity = (index) => {
    const updated = form.amenities.filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, amenities: updated }));
  };

  /* --- Scrollspy Logic --- */
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const containerTop = scrollContainerRef.current.scrollTop + 100; // Offset
    for (const section of SECTIONS) {
      const element = document.getElementById(`prop-section-${section.id}`);
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
    const element = document.getElementById(`prop-section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  /* --- Validation --- */
  const validate = () => {
    const newErrors = {};
    let firstErrorField = null;

    // Required Fields based on API docs
    if (!form.hotelName) newErrors.hotelName = "Property Name is required";
    if (!form.propertyId) newErrors.propertyId = "Property ID is required";
    if (!form.addressLine) newErrors.addressLine = "Address is required";
    if (!form.city) newErrors.city = "City is required";
    if (!form.countryCode) newErrors.countryCode = "Country is required";
    if (!form.firstName) newErrors.firstName = "First Name is required";
    if (!form.lastName) newErrors.lastName = "Last Name is required";
    if (!form.email) newErrors.email = "Email is required";
    if (!form.phone) newErrors.phone = "Phone is required";

    setErrors(newErrors);

    // Scroll to first error
    const errorKeys = Object.keys(newErrors);
    if (errorKeys.length > 0) {
      const firstId = errorKeys[0];
      // Map field name to section ID roughly
      let sectionId = 'profile'; 
      if(['addressLine', 'city', 'countryCode'].includes(firstId)) sectionId = 'localization';
      if(['firstName', 'lastName', 'email', 'phone'].includes(firstId)) sectionId = 'contact';
      
      scrollToSection(sectionId);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isView) { onClose(); return; }
    
    if (!validate()) return;

    try {
      setSaving(true);
      
      // Construct API Payload (Overlay logic)
      const payload = {
        HotelDescriptiveContents: {
          HotelDescriptiveContent: {
            HotelName: form.hotelName,
            HotelType: form.propertyType,
            hotelid: form.propertyId,
            ChainID: form.chainId,
            LanguageCode: form.languageCode,
            CurrencyCode: form.currencyCode,
            TimeZone: form.timeZone,
            PropertyLicenseNumber: form.licenseNumber,
            HotelDescription: form.description,
            OfficialCheckinTime: form.checkinTime,
            OfficialCheckoutTime: form.checkoutTime,
            closeoutdays: form.closeoutDays,
            closeouttime: form.closeoutTime,
            ContactInfos: {
              ContactInfo: [
                {
                  ContactProfileType: "PhysicalLocation",
                  Addresses: {
                    Address: {
                      AddressLine: form.addressLine,
                      CityName: form.city,
                      PostalCode: form.postalCode,
                      CountryName: form.countryCode,
                      StateProv: form.state
                    }
                  }
                },
                {
                  ContactProfileType: "availability",
                  Names: { Name: { GivenName: form.firstName, Surname: form.lastName } },
                  Emails: { Email: [form.email] },
                  NotificationEmail: form.notificationEmail,
                  Phones: { Phone: [{ PhoneNumber: form.phone, PhoneTechType: form.phoneTechType }] }
                }
              ]
            },
            HotelInfo: {
              Position: { Latitude: form.latitude, Longitude: form.longitude }
            },
            Facilities: {
              Facility: form.amenities.map(a => ({ Group: a.group, name: a.name }))
            }
          }
        }
      };

      const res = await createOrUpdateProperty(payload);
      const isSuccess = res?.Status === 'Success' || res?.success;

      if (!isSuccess) {
        throw new Error(res?.error?.Errors?.[0]?.ShortText || res?.message || 'Failed to save property');
      }

      onSaved && onSaved();
      onClose();
    } catch (err) {
      setDialog({ open: true, title: 'Error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="prop-modal-backdrop">
        <div className="prop-modal">
          {/* Header */}
          <div className="prop-modal-header">
            <h2>{mode === 'create' ? 'Add Property' : mode === 'edit' ? 'Edit Property' : 'Property Details'}</h2>
            <button type="button" className="prop-modal-close" onClick={onClose}>✕</button>
          </div>

          <div className="prop-modal-body-container">
            {/* Sidebar Navigation (Scrollspy) */}
            <div className="prop-sidebar">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`prop-nav-link ${activeSection === s.id ? 'active' : ''}`}
                  onClick={() => scrollToSection(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <form className="prop-content" onSubmit={handleSubmit} onScroll={handleScroll} ref={scrollContainerRef}>
              
              {/* Profile Section */}
              <div id="prop-section-profile" className="prop-scroll-section">
                <div className="prop-section-title">Profile</div>
                <div className="prop-form-grid">
                  <div className="prop-field">
                    <label>Property Name <span className="prop-req">*</span></label>
                    <input name="hotelName" value={form.hotelName} onChange={handleChange} disabled={isView} className={errors.hotelName ? 'prop-input-error' : ''} />
                    {errors.hotelName && <span className="prop-error-text">{errors.hotelName}</span>}
                  </div>
                  <div className="prop-field">
                    <label>Property ID <span className="prop-req">*</span></label>
                    <input name="propertyId" value={form.propertyId} onChange={handleChange} disabled={isView || isEdit} className={errors.propertyId ? 'prop-input-error' : ''} />
                    {errors.propertyId && <span className="prop-error-text">{errors.propertyId}</span>}
                  </div>
                  <div className="prop-field">
                    <label>Type</label>
                    <select name="propertyType" value={form.propertyType} onChange={handleChange} disabled={isView}>
                      {PROPERTY_TYPES.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="prop-field">
                    <label>Chain ID</label>
                    <input name="chainId" value={form.chainId} onChange={handleChange} disabled={isView} />
                  </div>
                  <div className="prop-field full-width">
                    <label>License Number</label>
                    <input name="licenseNumber" value={form.licenseNumber} onChange={handleChange} disabled={isView} />
                  </div>
                  <div className="prop-field full-width">
                    <label>Description</label>
                    <textarea name="description" rows="3" value={form.description} onChange={handleChange} disabled={isView} />
                  </div>
                </div>
              </div>

              {/* Localization Section */}
              <div id="prop-section-localization" className="prop-scroll-section">
                <div className="prop-section-title">Localization</div>
                <div className="prop-form-grid">
                  <div className="prop-field full-width">
                    <label>Address <span className="prop-req">*</span></label>
                    <input name="addressLine" value={form.addressLine} onChange={handleChange} disabled={isView} className={errors.addressLine ? 'prop-input-error' : ''} />
                    {errors.addressLine && <span className="prop-error-text">{errors.addressLine}</span>}
                  </div>
                  <div className="prop-field">
                    <label>City <span className="prop-req">*</span></label>
                    <input name="city" value={form.city} onChange={handleChange} disabled={isView} className={errors.city ? 'prop-input-error' : ''} />
                    {errors.city && <span className="prop-error-text">{errors.city}</span>}
                  </div>
                  <div className="prop-field">
                    <label>Postal Code</label>
                    <input name="postalCode" value={form.postalCode} onChange={handleChange} disabled={isView} />
                  </div>
                  <div className="prop-field">
                    <label>Country <span className="prop-req">*</span></label>
                    <select name="countryCode" value={form.countryCode} onChange={handleChange} disabled={isView} className={errors.countryCode ? 'prop-input-error' : ''}>
                      <option value="">Select Country</option>
                      {COUNTRY_LIST.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                    {errors.countryCode && <span className="prop-error-text">{errors.countryCode}</span>}
                  </div>
                  <div className="prop-field">
                    <label>State</label>
                    <input name="state" value={form.state} onChange={handleChange} disabled={isView} />
                  </div>
                  <div className="prop-field">
                    <label>Latitude</label>
                    <input name="latitude" value={form.latitude} onChange={handleChange} disabled={isView} />
                  </div>
                  <div className="prop-field">
                    <label>Longitude</label>
                    <input name="longitude" value={form.longitude} onChange={handleChange} disabled={isView} />
                  </div>
                </div>
              </div>

              {/* General Info */}
              <div id="prop-section-general" className="prop-scroll-section">
                <div className="prop-section-title">General Info</div>
                <div className="prop-form-grid">
                  <div className="prop-field">
                    <label>Time Zone</label>
                    <select name="timeZone" value={form.timeZone} onChange={handleChange} disabled={isView}>
                      <option value="">Select...</option>
                      {TIMEZONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="prop-field">
                    <label>Language</label>
                    <select name="languageCode" value={form.languageCode} onChange={handleChange} disabled={isView}>
                      {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>
                  </div>
                  <div className="prop-field">
                    <label>Currency</label>
                    <select name="currencyCode" value={form.currencyCode} onChange={handleChange} disabled={isView}>
                      {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label} ({c.code})</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Person */}
              <div id="prop-section-contact" className="prop-scroll-section">
                <div className="prop-section-title">Contact Person</div>
                <div className="prop-form-grid">
                  <div className="prop-field">
                    <label>First Name <span className="prop-req">*</span></label>
                    <input name="firstName" value={form.firstName} onChange={handleChange} disabled={isView} className={errors.firstName ? 'prop-input-error' : ''} />
                    {errors.firstName && <span className="prop-error-text">{errors.firstName}</span>}
                  </div>
                  <div className="prop-field">
                    <label>Last Name <span className="prop-req">*</span></label>
                    <input name="lastName" value={form.lastName} onChange={handleChange} disabled={isView} className={errors.lastName ? 'prop-input-error' : ''} />
                    {errors.lastName && <span className="prop-error-text">{errors.lastName}</span>}
                  </div>
                  <div className="prop-field">
                    <label>Email <span className="prop-req">*</span></label>
                    <input name="email" value={form.email} onChange={handleChange} disabled={isView} className={errors.email ? 'prop-input-error' : ''} />
                    {errors.email && <span className="prop-error-text">{errors.email}</span>}
                  </div>
                  <div className="prop-field">
                    <label>Phone <span className="prop-req">*</span></label>
                    <input name="phone" value={form.phone} onChange={handleChange} disabled={isView} className={errors.phone ? 'prop-input-error' : ''} placeholder="+1234567890" />
                    {errors.phone && <span className="prop-error-text">{errors.phone}</span>}
                  </div>
                  <div className="prop-field">
                    <label>Phone Type</label>
                    <select name="phoneTechType" value={form.phoneTechType} onChange={handleChange} disabled={isView}>
                      {PHONE_TYPES.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="prop-field">
                    <label>Notif. Email</label>
                    <input name="notificationEmail" value={form.notificationEmail} onChange={handleChange} disabled={isView} />
                  </div>
                </div>
              </div>

              {/* Config */}
              <div id="prop-section-config" className="prop-scroll-section">
                <div className="prop-section-title">Configurations</div>
                <div className="prop-form-grid">
                  <div className="prop-field">
                    <label>Check-In Time</label>
                    <input name="checkinTime" value={form.checkinTime} onChange={handleChange} disabled={isView} />
                  </div>
                  <div className="prop-field">
                    <label>Check-Out Time</label>
                    <input name="checkoutTime" value={form.checkoutTime} onChange={handleChange} disabled={isView} />
                  </div>
                  <div className="prop-field">
                    <label>Close-Out Days</label>
                    <input type="number" name="closeoutDays" value={form.closeoutDays} onChange={handleChange} disabled={isView} />
                  </div>
                  <div className="prop-field">
                    <label>Close-Out Time</label>
                    <input name="closeoutTime" value={form.closeoutTime} onChange={handleChange} disabled={isView} />
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div id="prop-section-amenities" className="prop-scroll-section">
                <div className="prop-section-title">Amenities</div>
                {!isView && (
                  <div className="prop-add-amenity-row">
                    <input placeholder="Group (e.g. Parking)" value={newAmenityGroup} onChange={e => setNewAmenityGroup(e.target.value)} />
                    <input placeholder="Name (e.g. Free Wifi)" value={newAmenityName} onChange={e => setNewAmenityName(e.target.value)} />
                    <button type="button" onClick={handleAddAmenity}>+ Add</button>
                  </div>
                )}
                <div className="prop-amenities-list">
                  {form.amenities.map((item, idx) => (
                    <div key={idx} className="prop-amenity-pill">
                      <span><strong>{item.group}:</strong> {item.name}</span>
                      {!isView && <span className="prop-amenity-del" onClick={() => handleRemoveAmenity(idx)}>✕</span>}
                    </div>
                  ))}
                  {form.amenities.length === 0 && <span className="prop-no-data-text">No amenities added</span>}
                </div>
              </div>

              {/* Images */}
              <div id="prop-section-images" className="prop-scroll-section">
                <div className="prop-section-title">Images</div>
                <div className="prop-image-dropzone">
                  <span style={{fontSize:'32px'}}>☁️</span>
                  <p>Drag and drop images here</p>
                </div>
              </div>

            </form>
          </div>

          <div className="prop-modal-footer">
            <button type="button" className="prop-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            {!isView && (
              <button type="button" className="prop-btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving...' : (isCreate ? 'Submit' : 'Save Changes')}
              </button>
            )}
          </div>
        </div>
      </div>
      {saving && <LoaderOverlay open={saving} message="Saving Property..." />}
      <MessageDialog open={dialog.open} title={dialog.title} message={dialog.message} onClose={() => setDialog({ ...dialog, open: false })} />
    </>
  );
};

/* ---------------- Main Page ---------------- */

const PropertiesPage = () => {
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchProperties();
      setProperties(res?.data?.properties || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProps = properties.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.propertyname?.toLowerCase().includes(s) || p.propertyid?.toLowerCase().includes(s));
  });

  return (
    <div className="prop-page">
      <div className="prop-header">
        <h1>Properties</h1>
        <button className="prop-add-btn" onClick={() => setModal({ open: true, mode: 'create', data: null })}>
          + Add Property
        </button>
      </div>

      <div className="prop-filter-card">
        <div className="prop-filter-row">
          <input 
            className="prop-search-input" 
            placeholder="Search Property by ID or Name" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
          <button className="prop-icon-btn" onClick={loadData} title="Refresh">⟳</button>
        </div>

        <div className="prop-table-wrapper">
          <table className="prop-table">
            <thead>
              <tr><th>Property ID</th><th>Property Name</th><th>City</th><th>Chain ID</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="prop-table-empty">Loading...</td></tr>}
              {!loading && filteredProps.length === 0 && <tr><td colSpan={6} className="prop-table-empty">No properties found</td></tr>}
              {!loading && filteredProps.map(p => (
                <tr key={p.propertyid}>
                  <td className="prop-cell-id"><span className="prop-row-strip"/>{p.propertyid}</td>
                  <td>{p.propertyname}</td>
                  <td>{p.city || '-'}</td>
                  <td>{p.chainid || '-'}</td>
                  <td><span className="prop-status-active">Active</span></td>
                  <td>
                    <ActionMenu 
                      onView={() => setModal({ open: true, mode: 'view', data: p })}
                      onEdit={() => setModal({ open: true, mode: 'edit', data: p })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PropertyFormModal 
        open={modal.open} 
        mode={modal.mode} 
        initialData={modal.data} 
        onClose={() => setModal({ ...modal, open: false })}
        onSaved={loadData}
      />
    </div>
  );
};

export default PropertiesPage;