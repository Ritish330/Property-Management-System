// src/api/client.js
import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Simple helper to handle errors consistently
const handleError = (error) => {
  if (error.response) {
    console.error('API error response:', error.response.data);
    throw error.response.data;
  }
  console.error('API error:', error.message);
  throw { message: error.message };
};

// ---- Property ----
export const fetchProperties = async () => {
  try {
    const response = await api.get('/properties');
    return response.data; // { success, data: SuResponse }
  } catch (err) {
    handleError(err);
  }
};

// ---- Rooms ----
export const fetchRoomTypes = async (hotelId) => {
  try {
    const response = await api.get(`/rooms/${hotelId}`);
    return response.data;
  } catch (err) {
    handleError(err);
  }
};

export const pushRoomTypes = async (payload) => {
  try {
    const res = await api.post('/rooms/push', payload);
    return res.data;
  } catch (err) {
    handleError(err);
  }
};

// ---- Rate Plans ----
export const fetchRatePlans = async (hotelId) => {
  try {
    const response = await api.get(`/rate-plans/${hotelId}`);
    return response.data;
  } catch (err) {
    handleError(err);
  }
};

export const pushRatePlans = async (payload) => {
  try {
    const res = await api.post('/rate-plans/push', payload);
    return res.data;
  } catch (err) {
    handleError(err);
  }
};

// ---- Availability ----
export const pushAvailability = async (payload) => {
  try {
    const res = await api.post('/availability/push', payload);
    return res.data;
  } catch (err) {
    handleError(err);
  }
};

// ---- Reservations ----
export const fetchReservationNotifications = async (hotelId) => {
  try {
    const res = await api.get(`/reservations/notifications/${hotelId}`);
    return res.data;
  } catch (err) {
    handleError(err);
  }
};

export const fetchReservationDetails = async (hotelId, notifIds) => {
  try {
    const res = await api.post('/reservations/details', {
      hotelid: hotelId,
      notifIds,
    });
    return res.data;
  } catch (err) {
    handleError(err);
  }
};

export const fetchBookings = async (hotelId, from, to) => {
  try {
    const res = await api.get(`/reservations/bookings/${hotelId}`, {
      params: { from, to },
    });
    return res.data;
  } catch (err) {
    handleError(err);
  }
};

// ✅ use api (with baseURL) so it goes to http://localhost:5000/api/properties
export async function createOrUpdateProperty(payload) {
  try {
    const res = await api.post('/properties', payload);
    return res.data; // { success, message, data }
  } catch (err) {
    handleError(err);
  }
}

export async function fetchCreatedProperties() {
  try {
    const res = await api.get('/properties/created');
    return res.data; // { success, data: { properties: [...] } }
  } catch (err) {
    handleError(err);
  }
}

export default api;
