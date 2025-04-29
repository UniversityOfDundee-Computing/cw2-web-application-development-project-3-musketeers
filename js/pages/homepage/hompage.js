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
          size: 0.002,
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

      // Setup interaction: pause rotation when user clicks a dot
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const renderer = globe.renderer();
const camera = globe.camera();
const scene = globe.scene();

let isHovering = false;

document.addEventListener('mousemove', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  const hovered = intersects.find(i => i.object && i.object.userData && i.object.userData.isCountryPoint);

  if (hovered && !isHovering) {
    isHovering = true;
    document.addEventListener('click', () => {
        if (hovered && hovered.object && hovered.object.userData.countryName) {
          const infoBox = document.getElementById('country-info');
          const nameEl = document.getElementById('country-name');
          nameEl.textContent = hovered.object.userData.countryName;
          infoBox.classList.remove('hidden');
        }
      });
      
      // Add this to close the box when "X" is clicked
      document.getElementById('close-info').addEventListener('click', () => {
        document.getElementById('country-info').classList.add('hidden');
      });
      
      
    globe.controls().autoRotate = false; // Stop rotation
  } else if (!hovered && isHovering) {
    isHovering = false;
    globe.controls().autoRotate = true; // Resume rotation
  }
});

    customThreeObject(d => {
    const material = new THREE.MeshLambertMaterial({ color: 'gold', emissive: 'gold' });
    const geometry = new THREE.SphereGeometry(0.02, 16, 16);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.isCountryPoint = true; // Tag for raycasting
    mesh.userData.isCountryPoint = true;
    mesh.userData.countryName = d.label;

    return mesh;
  })
  


      // 🔥 Animate Pulse Effect
      setInterval(() => {
        const time = Date.now() * 0.002;
        globe.customLayerData().forEach(d => {
          const pulse = 1 + 0.4 * Math.sin(time + d.lat); // Increase strength from 0.2 ➔ 0.4
          d.__threeObj.scale.set(pulse, pulse, pulse); // Apply pulse
        });
      }, 50);
      
      
  
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
  