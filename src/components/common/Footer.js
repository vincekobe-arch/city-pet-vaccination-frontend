import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';

const Footer = () => {
  const location = useLocation();

  // Hide footer on vet card view pages
  const showOnlyOn = ['/'];
  const shouldHideFooter = !showOnlyOn.includes(location.pathname);

  if (shouldHideFooter) {
    return null; // Don't render footer on vet card pages
  }

  return (
    <footer 
      id="contact" 
      className="bg-dark text-light py-4 mt-auto"
      style={{ scrollMarginTop: '70px', zoom: '0.75', marginTop: 'auto' }}
    >
      <Container>
        <Row>
          <Col md={6}>
            <h5>PetUnity</h5>
            <p className="text-muted">
              Managing pet health and vaccination records in Muntinlupa City.
            </p>
          </Col>
          <Col md={3}>
            <h6>Quick Links</h6>
            <ul className="list-unstyled">
              <li><a href="#" className="text-light text-decoration-none">About Us</a></li>
              <li><a href="#" className="text-light text-decoration-none">Contact</a></li>
              <li><a href="#" className="text-light text-decoration-none">Help</a></li>
            </ul>
          </Col>
          <Col md={3}>
            <h6>Contact Info</h6>
            <p className="text-muted mb-1">
              <i className="fas fa-phone me-2"></i>
              (123) 456-7890
            </p>
            <p className="text-muted mb-1">
              <i className="fas fa-envelope me-2"></i>
              munti@cityvet.gov.ph
            </p>
            <p className="text-muted">
              <i className="fas fa-map-marker-alt me-2"></i>
              Muntinlupa City Hall, Philippines
            </p>
          </Col>
        </Row>
        <hr className="my-4" />
        <Row>
          <Col className="text-center">
            <p className="text-muted mb-0">
              © {new Date().getFullYear()} PetUnity. 
              All rights reserved.
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;