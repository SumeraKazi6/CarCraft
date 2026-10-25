const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const TOKEN_KEY = 'carcraft.token';

export function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

// Get common headers, including the JWT when available.
function getAuthHeaders(extraHeaders = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { ...extraHeaders };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

// Handle API responses safely.
async function readResponse(response, fallbackMessage) {
  let data;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || fallbackMessage);
  }

  return data;
}

// Register a new customer.
export async function registerCustomer(customer) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer),
  });

  return await readResponse(response, 'Registration failed.');
}

// Log in and save the JWT.
export async function loginCustomer(credentials) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  const data = await readResponse(response, 'Invalid email or password.');
  const token = data.token || data.accessToken || null;
  const customer = data.customer || data.user || null;

  if (!token) {
    throw new Error('The server did not return an authentication token.');
  }

  localStorage.setItem(TOKEN_KEY, token);

  if (customer) {
    return { ...data, token, customer };
  }

  return { ...data, token };
}

// Get the currently authenticated customer.
export async function getCurrentCustomer() {
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }

  const data = await readResponse(response, 'You are not logged in.');

  return data.customer || data.user || null;
}

// Log out and remove the local JWT.
export async function logoutCustomer() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    return await readResponse(response, 'Logout failed.');
  } finally {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Fetch vehicles from the backend.
export async function getVehicles(params = {}) {
  const query = new URLSearchParams();

  if (params && params.all) {
    query.set('all', 'true');
  }

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const response = await fetch(`${API_BASE_URL}/vehicles${queryString}`, {
    headers: getAuthHeaders(),
  });
  const data = await readResponse(response, 'Unable to load vehicles.');

  return Array.isArray(data) ? data : (data.vehicles || []);
}

// Create a new vehicle entry. This endpoint is restricted to admin users.
export async function createVehicle(vehicleData) {
  const response = await fetch(`${API_BASE_URL}/vehicles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(vehicleData),
  });

  return await readResponse(response, 'Unable to add the vehicle.');
}

export async function updateVehicle(vehicleId, vehicleData) {
  const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(vehicleData),
  });

  return await readResponse(response, 'Unable to update the vehicle.');
}

export async function deleteVehicle(vehicleId) {
  const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  return await readResponse(response, 'Unable to delete the vehicle.');
}

// Fetch dashboard summary and activity data.
export async function getDashboardData() {
  const response = await fetch(`${API_BASE_URL}/dashboard`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return await readResponse(response, 'Unable to load dashboard data.');
}

export async function getPurchaseHistory() {
  const response = await fetch(`${API_BASE_URL}/bookings`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return await readResponse(response, 'Unable to load your purchase history.');
}

// Purchase a vehicle with the authenticated customer token.
export async function purchaseVehicle(vehicleId) {
  const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}/purchase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ quantity: 1 }),
  });

  if (response.status === 404 || response.status === 500) {
    const fallbackResponse = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ vehicleId }),
    });

    return await readResponse(fallbackResponse, 'Unable to complete the purchase.');
  }

  return await readResponse(response, 'Unable to complete the purchase.');
}