// homepage.js

import Globe from 'globe.gl';
import * as THREE from 'three';

async function setupGlobe() {
  try {
    const response = await fetch('https://restcountries.com/v3.1/all');
    const countries = await response.json();

    const pointsData = countries
      .filter(country => Array.isArray(country.latlng) && country.latlng.length === 2)
      .map(country => ({
        lat: country.latlng[0],
        lng: country.latlng[1],
        label: country.name.common,
        baseSize: 0.02
      }));

    const world = Globe()(document.getElementById('globeViz'))
      .globeImageUrl('/earth-dark.jpg')
      .backgroundImageUrl('/night-sky.png')
      .showAtmosphere(true)
      .pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 0)
      .pointsData(pointsData)
      .pointAltitude(d => d.baseSize)
      .pointColor(() => 'grey')
      .pointLabel('label');

    // Make sure controls are enabled
    world.controls().enableZoom = true;
    world.controls().enableRotate = true;
    world.controls().autoRotate = true;
    world.controls().autoRotateSpeed = 0.5;

    // Add custom lights
    const ambientLight = new THREE.AmbientLight(0xbbbbbb);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    world.scene().add(ambientLight);
    world.scene().add(directionalLight);

    // Add subtle pulse animation
    setInterval(() => {
      const time = Date.now() * 0.002;
      pointsData.forEach(d => {
        d.baseSize = 0.05 + 0.015 * Math.sin(time + d.lat);
      });
      world.pointAltitude(d => d.baseSize);
    }, 50);

    // Optional: Hide loading spinner
    const loadingContainer = document.getElementById('loading');
    if (loadingContainer) {
      loadingContainer.style.opacity = '0';
      loadingContainer.style.transition = 'opacity 1s ease';
      setTimeout(() => {
        loadingContainer.style.display = 'none';
      }, 1000);
    }
  } catch (error) {
    console.error('Error initializing globe:', error);
    const loadingContainer = document.getElementById('loading');
    if (loadingContainer) {
      loadingContainer.innerHTML = '<h2 style="color: red;">Failed to load globe data.</h2>';
    }
  }
}

// Run setup on DOM ready
window.addEventListener('DOMContentLoaded', setupGlobe);
