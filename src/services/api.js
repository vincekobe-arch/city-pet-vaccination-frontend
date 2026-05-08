// services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost/city-pet-vaccination-api';

const TOKEN_KEY = 'pet_vaccination_token';
const USER_KEY = 'pet_vaccination_user';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Token attached to request:', token.substring(0, 20) + '...');
    } else {
      console.warn('⚠️ No token found in localStorage');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
  console.error('❌ 401 Unauthorized - Token invalid or expired');
  const publicPaths = ['/', '/login', '/register'];
  if (!publicPaths.includes(window.location.pathname)) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/login';
  }
}
    return Promise.reject(error);
  }
);

// Error handler helper
export const handleAPIError = (error) => {
  console.error('API Error:', error);
  
  if (error.response) {
    return {
      message: error.response.data.message || error.response.data.error || 'An error occurred',
      status: error.response.status,
      data: error.response.data,
    };
  } else if (error.request) {
    return {
      message: 'No response from server. Please check your connection.',
      status: 0,
    };
  } else {
    return {
      message: error.message || 'An unexpected error occurred',
      status: 0,
    };
  }
};

// Pet API
export const petAPI = {
  getAll: () => api.get('/pets'),
  getById: (id) => api.get(`/pets/show/${id}`),
  getByOwner: (ownerId) => api.get(`/pets/owner/${ownerId}`),
  create: (data) => api.post('/pets/create', data),
  update: (id, data) => api.put(`/pets/update/${id}`, data),
  delete: (id) => api.delete(`/pets/delete/${id}`),
uploadPhoto: (id, formData) => api.post(`/pets/upload-photo/${id}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
}),
};

// Owner API
export const ownerAPI = {
  getAll: () => api.get('/owners'),
  getById: (id) => api.get(`/owners/show/${id}`),
  getByUserId: (userId) => api.get(`/owners/user/${userId}`),
  create: (data) => api.post('/owners/create', data),
  update: (id, data) => api.put(`/owners/update/${id}`, data),
  delete: (id) => api.delete(`/owners/delete/${id}`),
  getStatistics: () => api.get('/owners/statistics'),
};

// Vaccination API
export const vaccinationAPI = {
  getAll: () => api.get('/vaccinations'),
  getByPetId: (petId) => api.get(`/vaccinations/pet/${petId}`),
  getDue: () => api.get('/vaccinations/due'),
  getTypes: () => api.get('/vaccinations/types'),
  create: (data) => api.post('/vaccinations/create', data),
  update: (id, data) => api.put(`/vaccinations/update/${id}`, data),
  delete: (id) => api.delete(`/vaccinations/delete/${id}`),
  getStatistics: () => api.get('/vaccinations/statistics'),
};

// Deworming API
export const dewormingAPI = {
  getAll: () => api.get('/dewormings'),
  getByPetId: (petId) => api.get(`/dewormings/pet/${petId}`),
  getDue: () => api.get('/dewormings/due'),
  getTypes: () => api.get('/dewormings/types'),
  create: (data) => api.post('/dewormings/create', data),
  update: (id, data) => api.put(`/dewormings/update/${id}`, data),
  delete: (id) => api.delete(`/dewormings/delete/${id}`),
  getStatistics: () => api.get('/dewormings/statistics'),
};

// Microchip API
export const microchipAPI = {
  getAll: () => api.get('/microchips'),
  getByPetId: (petId) => api.get(`/microchips/pet/${petId}`),
  getById: (id) => api.get(`/microchips/show/${id}`),
  create: (data) => api.post('/microchips/create', data),
  update: (id, data) => api.put(`/microchips/update/${id}`, data),
  delete: (id) => api.delete(`/microchips/delete/${id}`),
};

// Sterilization API
export const sterilizationAPI = {
  getAll: () => api.get('/sterilizations'),
  getByPetId: (petId) => api.get(`/sterilizations/pet/${petId}`),
  getStatistics: () => api.get('/sterilizations/statistics'),
  create: (data) => api.post('/sterilizations/create', data),
  update: (id, data) => api.put(`/sterilizations/update/${id}`, data),
  delete: (id) => api.delete(`/sterilizations/delete/${id}`),
};

// Vet Card API
export const vetCardAPI = {
  getAll: () => api.get('/vetcards'),
  getByPetId: (petId) => api.get(`/vetcards/pet/${petId}`),
  getById: (id) => api.get(`/vetcards/show/${id}`),
  create: (data) => api.post('/vetcards/create', data),
  update: (id, data) => api.put(`/vetcards/update/${id}`, data),
  generate: (petId) => api.post(`/vetcards/generate/${petId}`),
};

// Schedule API
export const scheduleAPI = {
  getVaccinationSchedules: () => api.get('/schedules/vaccination'),
  getSeminarSchedules: () => api.get('/schedules/seminar'),
  getSterilizationSchedules: () => api.get('/schedules/sterilization'),
  getDewormingSchedules: () => api.get('/schedules/deworming'),
  getOtherSchedules: () => api.get('/schedules/other'),
  getMicrochipSchedules: () => api.get('/schedules/microchip'),
  getById: (id) => api.get(`/schedules/show/${id}`),
  create: (data) => api.post('/schedules/create', data),
  update: (id, data) => api.put(`/schedules/update/${id}`, data),
  delete: (id) => api.delete(`/schedules/delete/${id}`),
  register: (data) => api.post('/schedules/register', data),
  getRegisteredPets: (scheduleId, scheduleType) => 
    api.get(`/schedules/registered-pets/${scheduleId}/${scheduleType}`),
  
  // ✅ NEW: Get vaccine registration counts per vaccine
  getVaccineRegistrationCounts: (scheduleId) => {
    console.log('📊 Fetching vaccine counts for schedule:', scheduleId);
    return api.get(`/schedules/vaccination/${scheduleId}/vaccine-counts`)
      .then(response => {
        console.log('✅ Vaccine counts fetched:', response.data);
        return response;
      })
      .catch(error => {
        console.error('❌ Failed to fetch vaccine counts:', error.response?.data);
        throw error;
      });
  },
  
  cancelRegistration: (registrationId) => {
  const url = `/schedules/cancel-registration/${registrationId}`;
  console.log('🗑️ Cancelling registration:');
  console.log('  - URL:', url);
  console.log('  - Registration ID:', registrationId);
  console.log('  - Full URL:', `${API_BASE_URL}${url}`);
  
  return api.delete(url)
    .then(response => {
      console.log('✅ Cancel registration success:', response.data);
      return response;
    })
    .catch(error => {
      console.error('❌ Cancel registration failed:');
      console.error('  - Status:', error.response?.status);
      console.error('  - Error:', error.response?.data);
      console.error('  - Full error:', error);
      throw error;
    });
  },
  
  updateRegistration: (registrationId, data) => {
    const url = `/schedules/update-registration/${registrationId}`;
    console.log('✏️ Updating registration:');
    console.log('  - URL:', url);
    console.log('  - Registration ID:', registrationId);
    console.log('  - Data:', data);
    
    return api.put(url, data)
      .then(response => {
        console.log('✅ Update registration success:', response.data);
        return response;
      })
      .catch(error => {
        console.error('❌ Update registration failed:');
        console.error('  - Status:', error.response?.status);
        console.error('  - Error:', error.response?.data);
        throw error;
      });
  }
};
export const reportsAPI = {
  getAll: () => api.get('/reports'),
  getMyReports: () => api.get('/reports/my-reports'),
  getMapReports: () => api.get('/reports/map'),
  getById: (id) => api.get(`/reports/show/${id}`),
  create: (data) => api.post('/reports/create', data),
  update: (id, data) => api.put(`/reports/update/${id}`, data),
  delete: (id) => api.delete(`/reports/delete/${id}`),
};

// Barangay API
export const barangayAPI = {
  getAll: () => api.get('/barangays'),
  getById: (id) => api.get(`/barangays/show/${id}`),
  create: (data) => api.post('/barangays/create', data),
  update: (id, data) => api.put(`/barangays/update/${id}`, data),
  delete: (id) => api.delete(`/barangay s/delete/${id}`),
};

// Private Clinic API
export const clinicAPI = {
  getDashboard:  ()         => api.get('/clinics/dashboard'),
  getRecords:    ()         => api.get('/clinics/records'),
  updateRecord:  (id, type, data)  => api.put(`/clinics/records/update/${id}/${type}`, data),
  getAll:        ()         => api.get('/clinics'),
  getById:       (id)       => api.get(`/clinics/show/${id}`),
  create:        (data)     => api.post('/clinics/create', data),
  update:        (id, data) => api.put(`/clinics/update/${id}`, data),
  delete:        (id)       => api.delete(`/clinics/delete/${id}`),
  restore:       (id)       => api.put(`/clinics/restore/${id}`),
  getStatistics: ()         => api.get('/clinics/statistics'),
};

export const inventoryAPI = {
  getAll:       ()             => api.get('/inventory'),
  getByType:    (type)         => api.get(`/inventory/type/${type}`),
  getById:      (id)           => api.get(`/inventory/show/${id}`),
  getLowStock:  ()             => api.get('/inventory/low-stock'),
  restock:      (id, data)     => api.put(`/inventory/restock/${id}`, data),
  update:       (id, data)     => api.put(`/inventory/update/${id}`, data),
  create:       (data)         => api.post('/inventory/create', data),
  getBatches:   (id)           => api.get(`/inventory/batches/${id}`),
  updateBatch:  (id, data)     => api.put(`/inventory/batch/update/${id}`, data),
  deleteBatch:        (id)              => api.delete(`/inventory/batch/delete/${id}`),
  getBatchAvailability: (inventoryId)   => api.get(`/inventory/batch-availability/${inventoryId}`),
  getScheduleAllocations: (scheduleId) => api.get(`/inventory/schedule-allocations/${scheduleId}`),
  saveScheduleAllocations: (scheduleId, data) => api.post(`/inventory/schedule-allocations/${scheduleId}`, data),
  getRecordBatchAvailability: (inventoryId) => api.get(`/inventory/record-batch-availability/${inventoryId}`),
  deductBatchStock: (batchId, data) => api.post(`/inventory/batch-deduct/${batchId}`, data),
  getClinicRecordBatchAvailability: (inventoryId) => api.get(`/clinic/inventory/record-batch-availability/${inventoryId}`),
  deductClinicBatchStock: (batchId, data) => api.post(`/clinic/inventory/batch-deduct/${batchId}`, data),
};


// Official API (Barangay Officials)
export const officialAPI = {
  getAll: () => api.get('/officials'),
  getById: (id) => api.get(`/officials/show/${id}`),
  getByBarangayId: (barangayId) => api.get(`/officials/barangay/${barangayId}`),
  create: (data) => api.post('/officials/create', data),
  update: (id, data) => api.put(`/officials/update/${id}`, data),
  delete: (id) => api.delete(`/officials/delete/${id}`),
  restore: (id) => api.put(`/officials/restore/${id}`),
  getStatistics: () => api.get('/officials/statistics'),
};

// Verification API
export const verificationAPI = {
  sendCode: (email, name = '') => {
    console.log('📧 Sending verification code to:', email);
    return api.post('/verification/send', { email, name })
      .then(response => {
        console.log('✅ Verification code sent successfully');
        return response;
      })
      .catch(error => {
        console.error('❌ Failed to send verification code:', error.response?.data);
        throw error;
      });
  },
  
  verifyCode: (email, code) => {
    console.log('🔍 Verifying code for:', email);
    return api.post('/verification/verify', { email, code })
      .then(response => {
        console.log('✅ Code verified successfully');
        return response;
      })
      .catch(error => {
        console.error('❌ Code verification failed:', error.response?.data);
        throw error;
      });
  },
  
  resendCode: (email) => {
    console.log('🔄 Resending verification code to:', email);
    return api.post('/verification/resend', { email })
      .then(response => {
        console.log('✅ Verification code resent successfully');
        return response;
      })
      .catch(error => {
        console.error('❌ Failed to resend verification code:', error.response?.data);
        throw error;
      });
  }
};

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile/update', data),
  changePassword: (data) => api.put('/auth/password/change', data),
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return Promise.resolve();
  },
};

export default api;