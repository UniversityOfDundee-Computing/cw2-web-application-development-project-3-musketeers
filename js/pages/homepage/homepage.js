// main.js
import { countryService } from '../../services/countryService.js';
import * as THREE from 'three';

// Make Globe.gl use our imported THREE instance instead of loading its own
window.THREE = THREE;

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('globe-container');
  const loading = document.getElementById('loading');
  const tooltip = document.getElementById('tooltip');

  if (!container) {
    // console.error('Globe container not found!');
    return;
  }

  // Apply background image from data attribute
  if (container.dataset.bgImage) {
    container.style.backgroundImage = `url('${container.dataset.bgImage}')`;
  }

  const world = Globe()(container)
    .globeImageUrl('./earth-dark.jpg') // Fix path with leading slash
    .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundColor('rgba(0,0,0,0)')
    .pointOfView({ lat: 0, lng: 0, altitude: 2.5 });

  // Set control options for better UX
  world.controls().autoRotate = true;
  world.controls().autoRotateSpeed = 0.3;
  world.controls().enableDamping = true;
  world.controls().dampingFactor = 0.1;
  
  // Center the globe in the container
  resizeGlobe();
  window.addEventListener('resize', resizeGlobe);
  
  function resizeGlobe() {
    world.width(container.offsetWidth);
    world.height(container.offsetHeight);
  }

  try {
    const countries = await countryService.getAllCountries();

    const points = countries
      .filter(c => Array.isArray(c.latlng) && c.latlng.length === 2)
      .map(c => ({
        name: c.name.common,
        lat: c.latlng[0],
        lng: c.latlng[1],
        size: 0.0006,
        population: c.population || 0,
        label: c.name.common
      }));
      const labels = points.map(p => ({
        lat: p.lat,
        lng: p.lng,
        text: p.name
      }));

    world
      .pointsData(points)
      .pointAltitude('size')
      .pointRadius(0.2)
      .pointColor(() => 'white')
      .pointsMerge(true)
      .pointLabel(p => p.name);


    // Proper Globe.gl raycasting implementation
    // Get the Three.js renderer from the globe instance
    const renderer = world.renderer();
    const camera = world.camera();
    const scene = world.scene();

    // Function to find intersections with the globe points
    function findIntersection(event) {
      // Calculate mouse position in normalized device coordinates (-1 to +1)
      const rect = renderer.domElement.getBoundingClientRect();
      const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Setup the raycaster
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(mouseX, mouseY);
      raycaster.setFromCamera(mouse, camera);
      
      // Look for points objects in the scene
      const pointsObj = scene.children.find(obj => 
        obj.type === 'Group' && 
        obj.__globeObjType === 'points'
      );
      
      if (!pointsObj) return null;
      
      // Find children of the points object (the actual points)
      const objects = [];
      pointsObj.children.forEach(group => {
        if (group.children && group.children.length) {
          objects.push(...group.children);
        }
      });
      
      // Find intersections
      const intersects = raycaster.intersectObjects(objects);
      return intersects.length > 0 ? intersects[0] : null;
    }

    // Manual hover detection using raycasting
    container.addEventListener('mousemove', (event) => {
      const intersect = findIntersection(event);

      if (intersect && intersect.object && intersect.object.__data) {
        const point = intersect.object.__data;
        tooltip.innerText = point.name;
        tooltip.style.left = `${event.clientX + 10}px`;
        tooltip.style.top = `${event.clientY + 10}px`;
        tooltip.style.display = 'block';
      } else {
        tooltip.style.display = 'none';
      }
    });

    // Add click event to navigate to selected country
    container.addEventListener('click', (event) => {
      const intersect = findIntersection(event);

      if (intersect && intersect.object && intersect.object.__data) {
        const point = intersect.object.__data;
        const countryName = encodeURIComponent(point.name);
        window.location.href = `./pages/selected.html?country=${countryName}`;
      }
    });

    if (loading) {
      loading.style.display = 'none';
    }
  } catch (error) {
    if (loading) loading.style.display = 'none';
  }
});
