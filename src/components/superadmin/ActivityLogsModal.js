import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Form, Row, Col, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { activityLogAPI, handleAPIError } from '../../services/api';

const ROLE_LABELS = {
  barangay_official: 'City Vet Admin',
  private_clinic: 'Private Clinic',
  super_admin: 'Super Admin',
};

const TYPE_OPTIONS = [
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'deworming', label: 'Deworming' },
  { value: 'sterilization', label: 'Sterilization' },
  { value: 'microchip', label: 'Microchip' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'other', label: 'Other Events' },
];

const PAGE_SIZE = 10;

// "2026-11-10 07:04:07" -> Date (Safari-safe)
const toDate = (value) => (value ? new Date(String(value).replace(' ', 'T')) : null);

const formatDate = (value) => {
  const d = toDate(value);
  return d && !isNaN(d) ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
};

const formatTime = (value) => {
  const d = toDate(value);
  return d && !isNaN(d) ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
};

// "08:30:00" -> "8:30 AM"
const formatClock = (value) => {
  if (!value) return '';
  const [h, m] = String(value).split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const capitalize = (value) => (value ? String(value).charAt(0).toUpperCase() + String(value).slice(1) : '');

const getBaseType = (log) => (log.activity_type || '').replace('_event', '');

const ActivityLogsModal = ({ show, onHide }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    category: '',
    type: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    if (show) loadLogs();
  }, [show]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await activityLogAPI.getAll();
      setLogs(res.data.logs || []);
    } catch (err) {
      setError(handleAPIError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (field) => (e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }));

  const resetFilters = () =>
    setFilters({ search: '', role: '', category: '', type: '', dateFrom: '', dateTo: '' });

  const filteredLogs = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return logs.filter((log) => {
      if (filters.role === 'admin' && log.performed_by_role === 'private_clinic') return false;
      if (filters.role === 'clinic' && log.performed_by_role !== 'private_clinic') return false;
      if (filters.category && log.category !== filters.category) return false;
      if (filters.type && getBaseType(log) !== filters.type) return false;

      const addedOn = (log.created_at || '').slice(0, 10);
      if (filters.dateFrom && addedOn < filters.dateFrom) return false;
      if (filters.dateTo && addedOn > filters.dateTo) return false;

      if (term) {
        const haystack = [
          log.performed_by_name, log.organization, log.action, log.item_name,
          log.pet_name, log.registration_number, log.owner_name, log.location,
        ].join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [logs, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pageLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCSV = () => {
    const headers = [
      'Log ID', 'Date Added', 'Time Added', 'Performed By', 'Username', 'Role',
      'Organization / Clinic', 'Clinic Code', 'Office Role', 'Category', 'Action',
      'Item / Event Title', 'Pet Name', 'Registration No.', 'Species', 'Owner',
      'Veterinarian', 'Record / Event Date', 'Start Time', 'End Time', 'Location', 'Status',
    ];

    const rows = filteredLogs.map((log) => [
      log.log_id,
      formatDate(log.created_at),
      formatTime(log.created_at),
      log.performed_by_name,
      log.performed_by_username,
      ROLE_LABELS[log.performed_by_role] || log.performed_by_role,
      log.organization,
      log.clinic_code,
      log.office_role,
      log.category === 'event' ? 'Event' : 'Record',
      log.action,
      log.item_name,
      log.pet_name,
      log.registration_number,
      capitalize(log.species),
      log.owner_name,
      log.veterinarian_name,
      log.activity_date,
      formatClock(log.start_time),
      formatClock(log.end_time),
      log.location,
      capitalize(log.status),
    ]);

    const escape = (value) => {
      const text = value === null || value === undefined ? '' : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const statusVariant = (status) => {
    switch (status) {
      case 'active':
      case 'scheduled': return 'success';
      case 'ongoing': return 'primary';
      case 'completed': return 'secondary';
      case 'archived':
      case 'cancelled': return 'danger';
      default: return 'light';
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable>
      <Modal.Header closeButton style={{ borderBottom: '2px solid #ffc107' }}>
        <Modal.Title style={{ fontWeight: '700', color: '#333333' }}>
          <i className="fas fa-clipboard-list me-2" style={{ color: '#ffc107' }}></i>
          Admin/Clinic Activity Logs
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: '1.5rem' }}>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Row className="g-2 mb-3">
          <Col md={4}>
            <Form.Control
              placeholder="Search name, clinic, pet, reg. no., event..."
              value={filters.search}
              onChange={handleFilter('search')}
            />
          </Col>
          <Col md={2}>
            <Form.Select value={filters.role} onChange={handleFilter('role')}>
              <option value="">All Users</option>
              <option value="admin">City Vet Admin</option>
              <option value="clinic">Private Clinic</option>
            </Form.Select>
          </Col>
          <Col md={2}>
            <Form.Select value={filters.category} onChange={handleFilter('category')}>
              <option value="">Records & Events</option>
              <option value="record">Records</option>
              <option value="event">Events</option>
            </Form.Select>
          </Col>
          <Col md={2}>
            <Form.Select value={filters.type} onChange={handleFilter('type')}>
              <option value="">All Types</option>
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={2} className="d-grid">
            <Button variant="outline-secondary" onClick={resetFilters}>
              <i className="fas fa-undo me-1"></i> Reset
            </Button>
          </Col>
          <Col md={3}>
            <Form.Label className="small text-muted mb-1">Date added from</Form.Label>
            <Form.Control type="date" value={filters.dateFrom} onChange={handleFilter('dateFrom')} />
          </Col>
          <Col md={3}>
            <Form.Label className="small text-muted mb-1">Date added to</Form.Label>
            <Form.Control type="date" value={filters.dateTo} onChange={handleFilter('dateTo')} />
          </Col>
          <Col md={6} className="d-flex align-items-end justify-content-end">
            <span className="text-muted small me-3">
              {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''} found
            </span>
            <Button
              variant="success"
              onClick={exportCSV}
              disabled={loading || filteredLogs.length === 0}
            >
              <i className="fas fa-file-export me-1"></i> Export CSV
            </Button>
          </Col>
        </Row>

        {/* Table */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="warning" />
            <p className="text-muted mt-2 mb-0">Loading activity logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-5">
            <i className="fas fa-clipboard-list mb-3" style={{ fontSize: '3rem', color: '#e0e0e0' }}></i>
            <h6 style={{ color: '#666666', fontWeight: '600' }}>No activity logs found</h6>
            <p className="text-muted small mb-0">Try changing or resetting the filters.</p>
          </div>
        ) : (
          <Table responsive hover className="align-middle mb-0" style={{ fontSize: '0.9rem' }}>
            <thead style={{ background: '#f8f9fa' }}>
              <tr>
                <th>Date & Time Added</th>
                <th>Performed By</th>
                <th>Action</th>
                <th>Details</th>
                <th>Record / Event Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pageLogs.map((log) => (
                <tr key={log.log_id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: '600' }}>{formatDate(log.created_at)}</div>
                    <small className="text-muted">{formatTime(log.created_at)}</small>
                  </td>
                  <td>
                    <div style={{ fontWeight: '600' }}>{log.performed_by_name}</div>
                    <small className="text-muted d-block">{log.organization}</small>
                    <Badge bg={log.performed_by_role === 'private_clinic' ? 'info' : 'success'} className="mt-1">
                      {ROLE_LABELS[log.performed_by_role] || log.performed_by_role}
                    </Badge>
                  </td>
                  <td>
                    <Badge bg={log.category === 'event' ? 'primary' : 'warning'} text={log.category === 'event' ? undefined : 'dark'} className="mb-1">
                      {log.category === 'event' ? 'Event' : 'Record'}
                    </Badge>
                    <div>{log.action}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '600' }}>{log.item_name}</div>
                    {log.category === 'record' ? (
                      <small className="text-muted d-block">
                        {log.pet_name} ({log.registration_number || 'No Reg. No.'})
                        {log.owner_name ? ` · Owner: ${log.owner_name}` : ''}
                        {log.veterinarian_name ? ` · Vet: ${log.veterinarian_name}` : ''}
                      </small>
                    ) : (
                      <small className="text-muted d-block">{log.location}</small>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div>{formatDate(log.activity_date)}</div>
                    {log.start_time && (
                      <small className="text-muted">
                        {formatClock(log.start_time)} - {formatClock(log.end_time)}
                      </small>
                    )}
                  </td>
                  <td>
                    <Badge bg={statusVariant(log.status)}>{capitalize(log.status)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Modal.Body>

      {!loading && filteredLogs.length > 0 && (
        <Modal.Footer className="d-flex justify-content-between">
          <small className="text-muted">
            Page {page} of {totalPages}
          </small>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <i className="fas fa-chevron-left me-1"></i> Previous
            </Button>
            <Button variant="outline-secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              Next <i className="fas fa-chevron-right ms-1"></i>
            </Button>
          </div>
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default ActivityLogsModal;