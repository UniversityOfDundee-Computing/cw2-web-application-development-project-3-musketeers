// main.js

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('globe-container');
  const loading = document.getElementById('loading');
  const tooltip = document.getElementById('tooltip');

  if (!container) {
    console.error('Globe container not found!');
    return;
  }

  const world = Globe()(container)
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-dark.jpg')
    .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundColor('rgba(0,0,0,0)')
    .pointOfView({ lat: 0, lng: 0, altitude: 2.5 });

  world.controls().autoRotate = true;
  world.controls().autoRotateSpeed = 0.3;

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

    console.log('Hover detection active');

    const tooltip = document.getElementById('tooltip');

    // Manual hover detection using raycasting
    container.addEventListener('mousemove', (event) => {
      const intersect = world.intersect(event);

      if (intersect?.object?.__data) {
        const point = intersect.object.__data;
        tooltip.innerText = point.name;
        tooltip.style.left = `${event.clientX + 10}px`;
        tooltip.style.top = `${event.clientY + 10}px`;
        tooltip.style.display = 'block';
      } else {
        tooltip.style.display = 'none';
      }
    });

    if (loading) {
      loading.style.display = 'none';
    }
  } catch (error) {
    console.error('Failed to load country data:', error);
    if (loading) loading.style.display = 'none';
  }
});
