import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Alert } from 'react-bootstrap';
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

const TYPE_META = {
  vaccination:   { color: '#e0a800', icon: 'fa-syringe' },
  deworming:     { color: '#0d6efd', icon: 'fa-pills' },
  seminar:       { color: '#0aa2c0', icon: 'fa-graduation-cap' },
  sterilization: { color: '#198754', icon: 'fa-cut' },
  microchip:     { color: '#d63384', icon: 'fa-microchip' },
  other:         { color: '#6f42c1', icon: 'fa-calendar-check' },
};

const STATUS_COLORS = {
  active: '#198754',
  scheduled: '#198754',
  ongoing: '#0d6efd',
  completed: '#6b7280',
  archived: '#dc3545',
  cancelled: '#dc3545',
};

const PAGE_SIZE = 10;
const EMPTY_FILTERS = { search: '', role: '', category: '', type: '', dateFrom: '', dateTo: '' };

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

const initialsOf = (name) =>
  (name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const ActivityLogsModal = ({ show, onHide }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

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

  const setFilter = (field, value) => setFilters((prev) => ({ ...prev, [field]: value }));
  const handleFilter = (field) => (e) => setFilter(field, e.target.value);
  const resetFilters = () => setFilters(EMPTY_FILTERS);
  const hasFilters = Object.values(filters).some(Boolean);

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

  const counts = useMemo(() => ({
    records: filteredLogs.filter((l) => l.category === 'record').length,
    events: filteredLogs.filter((l) => l.category === 'event').length,
  }), [filteredLogs]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pageLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const firstShown = filteredLogs.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastShown = Math.min(page * PAGE_SIZE, filteredLogs.length);

  // Page numbers with gaps, e.g. 1 … 4 5 6 … 12
  const pageNumbers = useMemo(() => {
    const set = new Set([1, totalPages, page - 1, page, page + 1]);
    const list = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const out = [];
    list.forEach((n, i) => {
      if (i > 0 && n - list[i - 1] > 1) out.push('gap-' + n);
      out.push(n);
    });
    return out;
  }, [page, totalPages]);

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
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const styles = `
    .al-dialog { max-width: 1000px; }
    .al-dialog .modal-content { border: none; border-radius: 16px; box-shadow: 0 24px 60px rgba(16,24,40,0.2); overflow: hidden; }

    .al-head { display: flex; align-items: center; gap: 0.85rem; padding: 1rem 1.35rem; border-bottom: 1px solid #eef0f3; }
    .al-head .ic { width: 42px; height: 42px; border-radius: 12px; background: rgba(255,193,7,0.15); color: #e0a800; display: flex; align-items: center; justify-content: center; font-size: 1.05rem; flex-shrink: 0; }
    .al-head .t { font-weight: 700; font-size: 1.05rem; color: #1f2328; line-height: 1.2; }
    .al-head .s { font-size: 0.8rem; color: #6b7280; }
    .al-close { margin-left: auto; width: 34px; height: 34px; border-radius: 9px; border: none; background: transparent; color: #6b7280; display: flex; align-items: center; justify-content: center; }
    .al-close:hover { background: #f3f4f6; color: #1f2328; }

    .al-tools { padding: 0.9rem 1.35rem; border-bottom: 1px solid #eef0f3; background: #fafbfc; display: flex; flex-direction: column; gap: 0.6rem; }
    .al-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .al-search { position: relative; flex: 1 1 260px; }
    .al-search i { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 0.8rem; }
    .al-input { width: 100%; height: 36px; border: 1px solid #e5e7eb; border-radius: 9px; background: #fff; padding: 0 0.75rem; font-size: 0.84rem; color: #1f2328; outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .al-search .al-input { padding-left: 2rem; }
    .al-input:focus { border-color: #e0a800; box-shadow: 0 0 0 3px rgba(255,193,7,0.2); }
    select.al-input { width: auto; padding-right: 2rem; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 0.65rem center; background-size: 12px; }
    .al-seg { display: inline-flex; padding: 3px; border-radius: 10px; background: #eef0f3; }
    .al-seg button { border: none; background: transparent; padding: 0.3rem 0.75rem; border-radius: 8px; font-size: 0.8rem; font-weight: 600; color: #5b6270; white-space: nowrap; transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
    .al-seg button:hover { color: #1f2328; }
    .al-seg button.on { background: #fff; color: #1f2328; box-shadow: 0 1px 3px rgba(16,24,40,0.12); }
    .al-date { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: #6b7280; font-weight: 600; }
    .al-date .al-input { width: 145px; }
    .al-link { border: none; background: none; padding: 0; color: #0d6efd; font-size: 0.8rem; font-weight: 600; }
    .al-link:hover { text-decoration: underline; }
    .al-link:disabled { color: #c4c9d0; text-decoration: none; }

    .al-summary { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; padding: 0.7rem 1.35rem; }
    .al-count { font-size: 0.85rem; color: #1f2328; font-weight: 600; }
    .al-mini { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; color: #6b7280; }
    .al-mini i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .al-btn { display: inline-flex; align-items: center; gap: 0.45rem; height: 36px; padding: 0 0.95rem; border-radius: 9px; font-size: 0.82rem; font-weight: 600; border: 1px solid transparent; transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; white-space: nowrap; }
    .al-btn.primary { background: #1f2328; color: #fff; }
    .al-btn.primary:hover:not(:disabled) { background: #000; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16,24,40,0.2); }
    .al-btn.ghost { background: #fff; color: #1f2328; border-color: #e5e7eb; }
    .al-btn.ghost:hover:not(:disabled) { background: #f6f7f9; }
    .al-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .al-table-wrap { padding: 0 1.35rem 0.5rem; overflow-x: auto; }
    .al-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.82rem; }
    .al-table th { position: sticky; top: 0; background: #fff; z-index: 1; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; padding: 0.55rem 0.6rem; border-bottom: 1px solid #eef0f3; white-space: nowrap; text-align: left; }
    .al-table td { padding: 0.7rem 0.6rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; color: #1f2328; }
    .al-table tbody tr { animation: alRow 0.35s ease-out backwards; transition: background 0.15s ease; }
    .al-table tbody tr:hover { background: #fafbfc; }
    .al-muted { color: #6b7280; font-size: 0.75rem; }
    .al-strong { font-weight: 600; }
    .al-user { display: flex; align-items: center; gap: 0.6rem; min-width: 0; }
    .al-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.68rem; font-weight: 800; flex-shrink: 0; }
    .al-ellipsis { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .al-tag { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.68rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px; white-space: nowrap; }
    .al-type { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; flex-shrink: 0; }

    .al-skel { height: 44px; border-radius: 8px; margin: 0.5rem 0; background: linear-gradient(90deg, #f3f4f6 25%, #e9ebee 37%, #f3f4f6 63%); background-size: 400% 100%; animation: alShimmer 1.3s ease infinite; }
    .al-empty { text-align: center; padding: 2.5rem 1rem; }
    .al-empty .ic { width: 58px; height: 58px; border-radius: 16px; margin: 0 auto 0.8rem; background: #f3f4f6; color: #9ca3af; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }

    .al-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; padding: 0.75rem 1.35rem; border-top: 1px solid #eef0f3; }
    .al-pages { display: flex; align-items: center; gap: 0.25rem; }
    .al-page { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 32px; padding: 0 0.5rem; border-radius: 8px; border: 1px solid transparent; background: transparent; font-size: 0.8rem; font-weight: 600; color: #4b5563; }
    .al-page:hover:not(:disabled) { background: #f3f4f6; }
    .al-page.on { background: #ffc107; color: #1f2328; }
    .al-page.nav { border-color: #e5e7eb; background: #fff; }
    .al-page:disabled { opacity: 0.4; cursor: not-allowed; }
    .al-gap { color: #9ca3af; padding: 0 0.2rem; font-size: 0.8rem; }

    .al-seg button:focus-visible, .al-btn:focus-visible, .al-page:focus-visible, .al-link:focus-visible, .al-close:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

    @keyframes alRow { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes alShimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
    @media (max-width: 768px) {
      .al-date .al-input { width: 130px; }
      .al-hide-sm { display: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      .al-table tbody tr, .al-skel { animation: none !important; }
    }
  `;

  return (
    <Modal show={show} onHide={onHide} centered scrollable dialogClassName="al-dialog">
      <style>{styles}</style>

      {/* Header */}
      <div className="al-head">
        <div className="ic"><i className="fas fa-clipboard-list" /></div>
        <div>
          <div className="t">Activity Logs</div>
          <div className="s">Records and events added by City Vet admins and private clinics</div>
        </div>
        <button type="button" className="al-close" onClick={onHide} aria-label="Close">
          <i className="fas fa-times" />
        </button>
      </div>

      {/* Filters */}
      <div className="al-tools">
        <div className="al-row">
          <div className="al-search">
            <i className="fas fa-search" />
            <input
              className="al-input"
              placeholder="Search name, clinic, pet, reg. no., event..."
              value={filters.search}
              onChange={handleFilter('search')}
              aria-label="Search logs"
            />
          </div>
          <div className="al-seg" role="group" aria-label="Added by">
            {[['', 'All users'], ['admin', 'City Vet'], ['clinic', 'Clinics']].map(([v, l]) => (
              <button key={v || 'all'} type="button" className={filters.role === v ? 'on' : ''} onClick={() => setFilter('role', v)} aria-pressed={filters.role === v}>{l}</button>
            ))}
          </div>
          <div className="al-seg" role="group" aria-label="Category">
            {[['', 'All'], ['record', 'Records'], ['event', 'Events']].map(([v, l]) => (
              <button key={v || 'all'} type="button" className={filters.category === v ? 'on' : ''} onClick={() => setFilter('category', v)} aria-pressed={filters.category === v}>{l}</button>
            ))}
          </div>
        </div>
        <div className="al-row">
          <select className="al-input" value={filters.type} onChange={handleFilter('type')} aria-label="Type">
            <option value="">All types</option>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <label className="al-date">
            From
            <input type="date" className="al-input" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={handleFilter('dateFrom')} />
          </label>
          <label className="al-date">
            To
            <input type="date" className="al-input" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={handleFilter('dateTo')} />
          </label>
          <button type="button" className="al-link ms-1" onClick={resetFilters} disabled={!hasFilters}>
            <i className="fas fa-undo me-1" />Clear filters
          </button>
        </div>
      </div>

      <Modal.Body style={{ padding: 0 }}>
        {error && (
          <div style={{ padding: '0.75rem 1.35rem 0' }}>
            <Alert variant="danger" dismissible onClose={() => setError('')} className="py-2 small mb-0">
              {error}
            </Alert>
          </div>
        )}

        {/* Summary + export */}
        <div className="al-summary">
          <span className="al-count">
            {loading ? 'Loading...' : `${filteredLogs.length} log${filteredLogs.length !== 1 ? 's' : ''}`}
          </span>
          {!loading && filteredLogs.length > 0 && (
            <>
              <span className="al-mini"><i style={{ background: '#e0a800' }} />{counts.records} record{counts.records !== 1 ? 's' : ''}</span>
              <span className="al-mini"><i style={{ background: '#0d6efd' }} />{counts.events} event{counts.events !== 1 ? 's' : ''}</span>
            </>
          )}
          <div className="ms-auto d-flex gap-2">
            <button type="button" className="al-btn primary" onClick={exportCSV} disabled={loading || filteredLogs.length === 0}>
              <i className="fas fa-file-export" />Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="al-table-wrap">
          {loading ? (
            <div style={{ paddingBottom: '0.5rem' }}>
              {Array.from({ length: 6 }, (_, i) => <div key={i} className="al-skel" style={{ opacity: 1 - i * 0.12 }} />)}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="al-empty">
              <div className="ic"><i className="fas fa-clipboard-list" /></div>
              <h6 style={{ fontWeight: 700, color: '#1f2328', marginBottom: '0.25rem' }}>No activity logs found</h6>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: hasFilters ? '0.75rem' : 0 }}>
                {hasFilters ? 'Try changing or clearing the filters.' : 'New records and events will show up here.'}
              </p>
              {hasFilters && (
                <button type="button" className="al-btn ghost" onClick={resetFilters}>
                  <i className="fas fa-undo" />Clear filters
                </button>
              )}
            </div>
          ) : (
            <table className="al-table">
              <thead>
                <tr>
                  <th>Date added</th>
                  <th>Performed by</th>
                  <th>Activity</th>
                  <th className="al-hide-sm">Record / event date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pageLogs.map((log, i) => {
                  const isEvent = log.category === 'event';
                  const meta = TYPE_META[getBaseType(log)] || TYPE_META.other;
                  const isClinic = log.performed_by_role === 'private_clinic';
                  const statusColor = STATUS_COLORS[log.status] || '#6b7280';
                  const details = isEvent
                    ? log.location
                    : `${log.pet_name || ''} (${log.registration_number || 'No Reg. No.'})${log.owner_name ? ` · Owner: ${log.owner_name}` : ''}${log.veterinarian_name ? ` · Vet: ${log.veterinarian_name}` : ''}`;

                  return (
                    <tr key={log.log_id} style={{ animationDelay: `${i * 0.03}s` }}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div className="al-strong">{formatDate(log.created_at)}</div>
                        <div className="al-muted">{formatTime(log.created_at)}</div>
                      </td>
                      <td>
                        <div className="al-user">
                          <div
                            className="al-avatar"
                            style={isClinic
                              ? { background: 'rgba(34,197,94,0.12)', color: '#15803d' }
                              : { background: 'rgba(255,193,7,0.18)', color: '#8a6700' }}
                          >
                            {initialsOf(log.performed_by_name)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="al-strong al-ellipsis" style={{ maxWidth: 170 }} title={log.performed_by_name}>{log.performed_by_name}</div>
                            <div className="al-muted al-ellipsis" style={{ maxWidth: 170 }} title={log.organization}>
                              {log.organization || ROLE_LABELS[log.performed_by_role]}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                          <div className="al-type" style={{ background: `color-mix(in srgb, ${meta.color} 12%, #fff)`, color: meta.color }}>
                            <i className={`fas ${meta.icon}`} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="d-flex align-items-center gap-2">
                              <span className="al-strong al-ellipsis" style={{ maxWidth: 220 }} title={log.item_name}>{log.item_name}</span>
                              <span
                                className="al-tag"
                                style={isEvent
                                  ? { background: 'rgba(13,110,253,0.1)', color: '#0d6efd' }
                                  : { background: 'rgba(255,193,7,0.16)', color: '#8a6700' }}
                              >
                                {isEvent ? 'Event' : 'Record'}
                              </span>
                            </div>
                            <div className="al-muted al-ellipsis" style={{ maxWidth: 300 }} title={`${log.action}${details ? ` · ${details}` : ''}`}>
                              {log.action}{details ? ` · ${details}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="al-hide-sm" style={{ whiteSpace: 'nowrap' }}>
                        <div>{formatDate(log.activity_date)}</div>
                        {log.start_time && (
                          <div className="al-muted">{formatClock(log.start_time)} – {formatClock(log.end_time)}</div>
                        )}
                      </td>
                      <td>
                        {log.status && (
                          <span className="al-tag" style={{ background: `color-mix(in srgb, ${statusColor} 12%, #fff)`, color: statusColor }}>
                            <i className="fas fa-circle" style={{ fontSize: '0.4rem' }} />{capitalize(log.status)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Modal.Body>

      {!loading && filteredLogs.length > 0 && (
        <div className="al-foot">
          <span className="al-muted" style={{ fontSize: '0.8rem' }}>
            Showing <strong style={{ color: '#1f2328' }}>{firstShown}–{lastShown}</strong> of {filteredLogs.length}
          </span>
          <div className="al-pages">
            <button type="button" className="al-page nav" disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
              <i className="fas fa-chevron-left" style={{ fontSize: '0.7rem' }} />
            </button>
            {pageNumbers.map((n) =>
              typeof n === 'string' ? (
                <span key={n} className="al-gap">…</span>
              ) : (
                <button key={n} type="button" className={`al-page${n === page ? ' on' : ''}`} onClick={() => setPage(n)} aria-current={n === page ? 'page' : undefined}>
                  {n}
                </button>
              )
            )}
            <button type="button" className="al-page nav" disabled={page === totalPages} onClick={() => setPage(page + 1)} aria-label="Next page">
              <i className="fas fa-chevron-right" style={{ fontSize: '0.7rem' }} />
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ActivityLogsModal;