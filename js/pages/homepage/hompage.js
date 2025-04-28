// homepage.js

// Wait for DOM fully loaded
window.addEventListener('DOMContentLoaded', async () => {
    try {
      const response = await fetch('https://restcountries.com/v3.1/all');
      const countries = await response.json();
  
      const countryPoints = countries
        .filter(country => country.latlng && country.latlng.length === 2)
        .map(country => ({
          lat: country.latlng[0],
          lng: country.latlng[1],
          size: 0.0006,
          color: 'gold',
          label: country.name.common
        }));
  
      const globe = Globe()
        (document.getElementById('globeViz'))
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        .pointsData(countryPoints)
        .pointAltitude('size')
        .pointColor('color')
        .pointLabel('label');
  
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.5;
      globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 });

      // 🔥 Animate Pulse Effect
    setInterval(() => {
        const time = Date.now() * 0.002; // Smooth animation speed
        globe.pointsData().forEach(d => {
          d.baseSize = 0.05 + 0.015 * Math.sin(time + d.lat); 
          // Pulse between 0.05 and 0.065 gently
        });
        globe.pointAltitude('baseSize'); // Update globe
      }, 50); // Refresh every 50ms
  
      // 🔥 Hide loading spinner AFTER globe fully initialized
      const loadingContainer = document.getElementById('loading');
      loadingContainer.style.opacity = '0';
      loadingContainer.style.transition = 'opacity 1s ease';
      setTimeout(() => {
        loadingContainer.style.display = 'none';
      }, 1000);
  
    } catch (error) {
      console.error('Error loading globe:', error);
      const loadingContainer = document.getElementById('loading');
      loadingContainer.innerHTML = '<h2 style="color: red;">Failed to load globe data.</h2>';
    }
  });
  