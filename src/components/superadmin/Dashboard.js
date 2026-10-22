import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Badge } from 'react-bootstrap';
import { barangayAPI, officialAPI, ownerAPI, petAPI, vaccinationAPI, dewormingAPI, sterilizationAPI, scheduleAPI, vetCardAPI, handleAPIError } from '../../services/api';

const SuperAdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
  statistics: {
    total_barangays: 0,
    total_officials: 0,
    total_pet_owners: 0,
    total_pets: 0,
    total_vaccinations: 0,
    total_vet_cards: 0
  },
  barangays: [],
  recentActivity: [],
  recentAdminActivity: [],
  vaccinationStatsBySpecies: [],
  barangayAdminStatus: {
    withAdmin: 0,
    withoutAdmin: 0
  }
});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [
        barangaysRes,
        officialsRes,
        ownersRes,
        petsRes,
        vaccinationStatsRes,
        vetCardsRes,
        vaccinationRecordsRes,
        dewormingRecordsRes,
        sterilizationRecordsRes,
        vaccinationSchedulesRes,
        dewormingSchedulesRes,
        seminarSchedulesRes,
        sterilizationSchedulesRes
      ] = await Promise.all([
        barangayAPI.getAll(),
        officialAPI.getAll(),
        ownerAPI.getAll(),
        petAPI.getAll(),
        vaccinationAPI.getStatistics(),
        vetCardAPI.getAll(),
        vaccinationAPI.getAll().catch(() => ({ data: { vaccination_records: [] } })),
        dewormingAPI.getAll().catch(() => ({ data: { deworming_records: [] } })),
        sterilizationAPI.getAll().catch(() => ({ data: { sterilization_records: [] } })),
        scheduleAPI.getVaccinationSchedules().catch(() => ({ data: { schedules: [] } })),
        scheduleAPI.getDewormingSchedules().catch(() => ({ data: { schedules: [] } })),
        scheduleAPI.getSeminarSchedules().catch(() => ({ data: { schedules: [] } })),
        scheduleAPI.getSterilizationSchedules().catch(() => ({ data: { schedules: [] } }))
      ]);

      const barangays = barangaysRes.data.barangays || [];
      const officials = officialsRes.data.officials || [];
      const owners = ownersRes.data.owners || [];
      const pets = petsRes.data.pets || [];
      const vaccinationStats = vaccinationStatsRes.data.statistics || {};
      const vetCards = vetCardsRes.data.vet_cards || [];
      const vaccinationRecords = vaccinationRecordsRes.data.vaccination_records || [];
      const dewormingRecords = dewormingRecordsRes.data.deworming_records || [];
      const sterilizationRecords = sterilizationRecordsRes.data.sterilization_records || [];
      const vaccinationSchedules = vaccinationSchedulesRes.data.schedules || [];
      const dewormingSchedules = dewormingSchedulesRes.data.schedules || [];
      const seminarSchedules = seminarSchedulesRes.data.schedules || [];
      const sterilizationSchedules = sterilizationSchedulesRes.data.schedules || [];

      const barangayStats = barangays.map(barangay => {
        const barangayOfficials = officials.filter(official => 
          official.assigned_barangay_id === barangay.id
        );
        const barangayOwners = owners.filter(owner => 
          owner.assigned_barangay_id === barangay.id
        );
        const barangayPets = pets.filter(pet => 
          barangayOwners.some(owner => owner.user_id === pet.user_id)
        );

        return {
          ...barangay,
          officials_count: barangayOfficials.length,
          owners_count: barangayOwners.length,
          pets_count: barangayPets.length,
          pets: barangayPets, // ADD THIS LINE
          vaccination_count: barangayPets.reduce((sum, pet) => sum + (pet.vaccination_count || 0), 0)
        };
      });

      // Calculate vaccination stats INSIDE loadDashboardData using fresh data
      const getAllVaccinationStats = () => {
        const species = ['Dog', 'Cat', 'Rabbit'];
        const colors = {
          'Dog': '#FF6B6B',
          'Cat': '#4ECDC4',
          'Rabbit': '#95E1D3'
        };
        
        return species.map(speciesName => {
          const speciesPets = pets.filter(pet => 
            pet.species?.toLowerCase() === speciesName.toLowerCase()
          );
          const vaccinated = speciesPets.filter(pet => 
            pet.vaccination_count && pet.vaccination_count > 0
          ).length;
          const total = speciesPets.length;
          const percentage = total > 0 ? Math.round((vaccinated / total) * 100) : 0;
          
          return {
            species: speciesName,
            vaccinated,
            total,
            percentage,
            color: colors[speciesName],
            icon: speciesName === 'Dog' ? '/dog_face.png' : 
                  speciesName === 'Cat' ? '/cat_face.png' : '/rabbit_face.png'
          };
        }).filter(stat => stat.total > 0);
      };

      // Calculate barangay admin status INSIDE loadDashboardData
      const getBarangayAdminStatusData = () => {
        const withAdmin = barangayStats.filter(b => b.officials_count > 0).length;
        const withoutAdmin = barangayStats.filter(b => b.officials_count === 0).length;
        return { withAdmin, withoutAdmin };
      };

      // Call the new functions
      const vaccinationStats_new = getAllVaccinationStats();
      const barangayAdminStatus_new = getBarangayAdminStatusData();

      setDashboardData({
        statistics: {
          total_barangays: barangays.length,
          total_officials: officials.length,
          total_pet_owners: owners.length,
          total_pets: pets.length,
          total_vaccinations: vaccinationStats.total_vaccinations || 0,
          total_vet_cards: vetCards.length
        },
        barangays: barangayStats,
        recentActivity: generateRecentActivity(pets, owners),
        recentAdminActivity: generateRecentAdminActivity(
          vaccinationRecords,
          dewormingRecords,
          sterilizationRecords,
          vaccinationSchedules,
          dewormingSchedules,
          seminarSchedules,
          sterilizationSchedules
        ),
        vaccinationStatsBySpecies: vaccinationStats_new,
        barangayAdminStatus: barangayAdminStatus_new
      });

    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const generateRecentActivity = (pets, owners) => {
    const activities = [];
    
    // Add pet registrations with species-specific images
    pets.slice(0, 10).forEach(pet => {
      const getPetImage = (species) => {
        if (species?.toLowerCase() === 'dog') return '/dog.png';
        if (species?.toLowerCase() === 'cat') return '/cat.png';
        if (species?.toLowerCase() === 'rabbit') return '/rabbit.png';
        return '/dog.png';
      };

      activities.push({
        type: 'pet_registration',
        description: `New pet registered: ${pet.name} (${pet.species || 'Unknown'})`,
        date: pet.created_at || pet.registration_date,
        image: getPetImage(pet.species),
        color: '#FF6B6B',
        petSpecies: pet.species
      });
    });

    // Add owner registrations with users.png
    owners.slice(0, 10).forEach(owner => {
      activities.push({
        type: 'owner_registration',
        description: `New pet owner registered: ${owner.first_name} ${owner.last_name}`,
        date: owner.created_at,
        image: '/users.png',
        color: '#0dcaf0'
      });
    });

    return activities
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
  };

  const generateRecentAdminActivity = (
    vaccinationRecords,
    dewormingRecords,
    sterilizationRecords,
    vaccinationSchedules,
    dewormingSchedules,
    seminarSchedules,
    sterilizationSchedules
  ) => {
    const activities = [];
    
    // Add vaccination records
    vaccinationRecords.slice(0, 5).forEach(record => {
      activities.push({
        type: 'vaccination_added',
        description: `Vaccination record added for ${record.pet_name || 'pet'}: ${record.vaccine_name || 'vaccine'}`,
        date: record.created_at || record.vaccination_date,
        image: '/vaccine.png',
        color: '#198754'
      });
    });

    // Add deworming records
    dewormingRecords.slice(0, 5).forEach(record => {
      activities.push({
        type: 'deworming_added',
        description: `Deworming record added for ${record.pet_name || 'pet'}: ${record.deworming_name || 'treatment'}`,
        date: record.created_at || record.deworming_date,
        image: '/deworm.png',
        color: '#fd7e14'
      });
    });

    // Add sterilization records
    sterilizationRecords.slice(0, 5).forEach(record => {
      activities.push({
        type: 'sterilization_added',
        description: `Sterilization record added for ${record.pet_name || 'pet'}: ${record.procedure_type || 'procedure'}`,
        date: record.created_at || record.sterilization_date,
        image: '/sterilization.png',
        color: '#6f42c1'
      });
    });

    // Add vaccination schedules
    vaccinationSchedules.slice(0, 3).forEach(schedule => {
      activities.push({
        type: 'schedule_added',
        description: `Vaccination event scheduled: ${schedule.title}`,
        date: schedule.created_at,
        image: '/schedule.png',
        color: '#0d6efd'
      });
    });

    // Add deworming schedules
    dewormingSchedules.slice(0, 3).forEach(schedule => {
      activities.push({
        type: 'schedule_added',
        description: `Deworming event scheduled: ${schedule.title}`,
        date: schedule.created_at,
        image: '/schedule.png',
        color: '#0d6efd'
      });
    });

    // Add seminar schedules
    seminarSchedules.slice(0, 3).forEach(schedule => {
      activities.push({
        type: 'schedule_added',
        description: `Seminar scheduled: ${schedule.title}`,
        date: schedule.created_at,
        image: '/schedule.png',
        color: '#0d6efd'
      });
    });

    // Add sterilization schedules
    sterilizationSchedules.slice(0, 3).forEach(schedule => {
      activities.push({
        type: 'schedule_added',
        description: `Sterilization event scheduled: ${schedule.title}`,
        date: schedule.created_at,
        image: '/schedule.png',
        color: '#0d6efd'
      });
    });

    return activities
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
  };
 

const SimplePieChart = ({ data, colors, total, labels }) => {
  if (total === 0) {
    return (
      <div style={{
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
        boxShadow: '0 4px 15px rgba(0,0,0,0.08)'
      }}>
        <span style={{ color: '#999999', fontSize: '0.9rem', fontWeight: '500' }}>No data</span>
      </div>
    );
  }

  const value1 = data[0];
  const value2 = data[1];
  const percentage1 = (value1 / total) * 100;
  
  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      <div style={{
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: `conic-gradient(${colors[0]} 0% ${percentage1}%, ${colors[1]} ${percentage1}% 100%)`,
        margin: '0 auto',
        boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        position: 'relative'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'scale(1.05) rotate(5deg)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.25)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
      }}
      >
      </div>
    </div>
  );
};

const VaccinationProgressBar = ({ species, vaccinated, total, percentage, icon, color }) => {
  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="d-flex align-items-center">
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px',
            border: `2px solid ${color}30`
          }}>
            <img 
              src={icon} 
              alt={species}
              style={{ width: '24px', height: '24px', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <span style={{ fontWeight: '600', fontSize: '1rem', color: '#333333' }}>{species}</span>
        </div>
        <div className="text-end">
          <Badge 
            style={{ 
              background: color,
              fontSize: '0.85rem',
              fontWeight: '700',
              padding: '0.4rem 0.8rem',
              borderRadius: '8px'
            }}
          >
            {percentage}%
          </Badge>
          <small className="text-muted ms-2" style={{ fontWeight: '600' }}>({vaccinated}/{total})</small>
        </div>
      </div>
      <div style={{
        width: '100%',
        height: '28px',
        backgroundColor: '#f0f0f0',
        borderRadius: '14px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)`,
          transition: 'width 0.8s ease',
          borderRadius: '14px',
          boxShadow: `0 2px 8px ${color}40`
        }}></div>
      </div>
    </div>
  );
};

  const styles = `
    @keyframes dropDown {
      0% {
        opacity: 0;
        transform: translateY(-30px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4" style={{ backgroundColor: '#ffffffff', minHeight: '100vh', zoom: '0.75' }}>
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <div>
              <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                <i 
                  className="fas fa-crown" 
                  style={{ 
                    fontSize: '1.5rem', 
                    color: '#dc3545',
                    animation: 'float 3s ease-in-out infinite'
                  }}
                ></i>
                <h2 style={{ fontWeight: '700', color: '#333333', fontSize: '2rem', marginBottom: '0' }}>Super Admin Dashboard</h2>
              </div>
          
            </div>
          </Col>
        </Row>

      {error && (
        <Row className="mb-4">
          <Col>
            <Alert 
              variant="danger" 
              dismissible 
              onClose={() => setError('')}
              style={{
                borderRadius: '12px',
                border: '2px solid #dc3545',
                background: 'rgba(220, 53, 69, 0.1)',
                color: '#dc3545'
              }}
            >
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Statistics Cards */}
      <Row className="mb-4" style={{ flexWrap: 'nowrap', margin: '0 -6px' }}>
        {[
          { label: 'Barangay Admins', count: dashboardData.statistics.total_officials, img: '/users.png', accent: '#198754', accentAlpha: 'rgba(25,135,84,0.12)', fallbackIcon: 'fa-user-tie', description: 'Total Administrators', delay: '0.1s' },
          { label: 'Pet Owners', count: dashboardData.statistics.total_pet_owners, img: '/users.png', accent: '#0dcaf0', accentAlpha: 'rgba(13,202,240,0.12)', fallbackIcon: 'fa-users', description: 'Total Owners', delay: '0.2s' },
          { label: 'Total Pets', count: dashboardData.statistics.total_pets, img: '/paw.png', accent: '#ffc107', accentAlpha: 'rgba(255,193,7,0.12)', fallbackIcon: 'fa-paw', description: 'Registered Pets', delay: '0.3s' },
        ].map(({ label, count, img, accent, accentAlpha, fallbackIcon, description, delay }) => (
          <div key={label} style={{ flex: '1 1 0', padding: '0 6px', minWidth: 0, animation: `dropDown 0.4s ease-out ${delay} backwards` }}>
            <Card
              className="border-0 h-100"
              style={{ borderRadius: '16px', background: '#ffffff', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.25s ease', cursor: 'default', overflow: 'hidden' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${accentAlpha}`; e.currentTarget.style.borderColor = accent; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#f0f0f0'; }}
            >
              <div style={{ height: '3px', background: accent, borderRadius: '16px 16px 0 0' }} />
              <Card.Body style={{ padding: '1.5rem', background: 'transparent' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999999', marginBottom: '0.5rem' }}>{label}</p>
                    <h2 style={{ fontSize: '2.75rem', fontWeight: '700', color: '#111111', lineHeight: 1, marginBottom: '0.75rem' }}>{count}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent }} />
                      <span style={{ fontSize: '0.75rem', color: '#aaaaaa', fontWeight: '500' }}>{description}</span>
                    </div>
                  </div>
                  <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: accentAlpha, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img src={img} alt={label} style={{ width: '32px', height: '32px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                    <i className={`fas ${fallbackIcon}`} style={{ fontSize: '1.4rem', color: accent, display: 'none' }} />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>
        ))}
      </Row>

      <Row style={{ animation: 'dropDown 0.4s ease-out 0.4s backwards' }}>
        <Row className="mb-4">
        
        
      </Row>
        {/* Recent Admin Activity */}
        <Col lg={6} className="mb-4">
          <Card 
            className="h-100 border-0"
            style={{
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              overflow: 'hidden'
            }}
          >
            <Card.Header
              style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderBottom: '2px solid #ffc107',
                padding: '1.5rem',
                borderRadius: '20px 20px 0 0'
              }}
            >
              <h5 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
<i className="fas fa-user-shield me-2" style={{ color: '#ffc107' }}></i>
                Recent Admin Activity
              </h5>
            </Card.Header>
            <Card.Body style={{ padding: '2rem' }}>
              {dashboardData.recentAdminActivity.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-user-shield text-muted mb-3" style={{ fontSize: '4rem', color: '#e0e0e0' }}></i>
                  <h6 style={{ color: '#666666', fontWeight: '600' }}>No admin activity yet</h6>
                  <p className="text-muted small mb-0">
                    Admin activity will appear here as records and events are added.
                  </p>
                </div>
              ) : (
                <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
                  {dashboardData.recentAdminActivity.map((activity, index) => (
                    <div 
                      key={index} 
                      style={{
                        padding: '1.25rem',
                        borderRadius: '12px',
                        background: index % 2 === 0 ? 'rgba(25, 135, 84, 0.05)' : '#ffffff',
                        border: '1px solid #e9ecef',
                        marginBottom: '1rem',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(25, 135, 84, 0.1)';
                        e.currentTarget.style.transform = 'translateX(5px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = index % 2 === 0 ? 'rgba(25, 135, 84, 0.05)' : '#ffffff';
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div className="d-flex align-items-start">
                        <div style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '12px',
                          background: '#f8f9fa',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '15px',
                          border: '2px solid #e9ecef',
                          flexShrink: 0
                        }}>
                          <img 
                            src={activity.image}
                            alt={activity.type}
                            style={{ width: '35px', height: '35px', objectFit: 'contain' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <i 
                            className="fas fa-calendar-alt" 
                            style={{ fontSize: '1.5rem', color: activity.color, display: 'none' }}
                          ></i>
                        </div>
                        <div className="flex-grow-1">
                          <p className="mb-1 small" style={{ fontWeight: '600', color: '#333333', fontSize: '0.95rem' }}>
                            {activity.description}
                          </p>
                          <small className="text-muted" style={{ fontWeight: '500' }}>
                            <i className="fas fa-clock me-1" style={{ color: '#6c757d' }}></i>
                            {new Date(activity.date).toLocaleDateString()} at{' '}
                            {new Date(activity.date).toLocaleTimeString()}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Recent System Activity */}
        <Col lg={6} className="mb-4">
          <Card 
            className="h-100 border-0"
            style={{
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              overflow: 'hidden'
            }}
          >
            <Card.Header
              style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderBottom: '2px solid #ffc107',
                padding: '1.5rem',
                borderRadius: '20px 20px 0 0'
              }}
            >
              <h5 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
<i className="fas fa-clock me-2" style={{ color: '#ffc107' }}></i>
                Recent System Activity
              </h5>
            </Card.Header>
            <Card.Body style={{ padding: '2rem' }}>
              {dashboardData.recentActivity.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-history text-muted mb-3" style={{ fontSize: '4rem', color: '#e0e0e0' }}></i>
                  <h6 style={{ color: '#666666', fontWeight: '600' }}>No recent activity</h6>
                  <p className="text-muted small mb-0">
                    System activity will appear here as users interact with the platform.
                  </p>
                </div>
              ) : (
                <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
                  {dashboardData.recentActivity.map((activity, index) => (
                    <div 
                      key={index} 
                      style={{
                        padding: '1.25rem',
                        borderRadius: '12px',
                        background: index % 2 === 0 ? 'rgba(13, 202, 240, 0.05)' : '#ffffff',
                        border: '1px solid #e9ecef',
                        marginBottom: '1rem',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(13, 202, 240, 0.1)';
                        e.currentTarget.style.transform = 'translateX(5px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = index % 2 === 0 ? 'rgba(13, 202, 240, 0.05)' : '#ffffff';
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div className="d-flex align-items-start">
                        <div style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '12px',
                          background: '#f8f9fa',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '15px',
                          border: '2px solid #e9ecef',
                          flexShrink: 0
                        }}>
                          <img 
                            src={activity.image}
                            alt={activity.type}
                            style={{ width: '35px', height: '35px', objectFit: 'contain' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <i 
                            className={activity.type === 'pet_registration' ? 'fas fa-paw' : 'fas fa-users'} 
                            style={{ fontSize: '1.5rem', color: activity.color, display: 'none' }}
                          ></i>
                        </div>
                        <div className="flex-grow-1">
                          <p className="mb-1 small" style={{ fontWeight: '600', color: '#333333', fontSize: '0.95rem' }}>
                            {activity.description}
                          </p>
                          <small className="text-muted" style={{ fontWeight: '500' }}>
                            <i className="fas fa-clock me-1" style={{ color: '#6c757d' }}></i>
                            {new Date(activity.date).toLocaleDateString()} at{' '}
                            {new Date(activity.date).toLocaleTimeString()}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>)}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
    </>
  );
};

export default SuperAdminDashboard;