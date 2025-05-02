/**
 * Loading screen functionality
 */

// Function to handle loading screen animation
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
        
        // Add event listener for Start Exploring button if present
        const startExploreBtn = document.getElementById('start-exploring');
        const exploreSection = document.getElementById('explore');
        
        if (startExploreBtn && exploreSection) {
          startExploreBtn.addEventListener('click', function() {
            // Add animation class to button
            this.classList.add('btn-animate-click');
            
            // After a short delay, show the explore section with animation
            setTimeout(() => {
              exploreSection.classList.add('visible');
              
              // Smooth scroll to the section
              exploreSection.scrollIntoView({ behavior: 'smooth' });
              
              // Remove animation class from button
              this.classList.remove('btn-animate-click');
            }, 300);
          });
        }
      }, 1000);
    }
  }, 1000);
});