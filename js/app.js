// === SIDEBAR TOGGLE ===
document.addEventListener('DOMContentLoaded', () => {
  // === LOGIN CHECK ===
  if (!localStorage.getItem('unigo-logged-in') && !window.location.pathname.includes('login.html')) {
    window.location.href = 'login.html';
    return;
  }

  const menuBtn = document.querySelector('.menu-btn');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const body = document.body;

  if (menuBtn && sidebar && overlay) {
    function toggleSidebar() {
      sidebar.classList.toggle('open');
      body.classList.toggle('sidebar-open');
      if (window.innerWidth <= 768) {
        overlay.classList.toggle('visible');
      }
    }

    menuBtn.addEventListener('click', toggleSidebar);

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      body.classList.remove('sidebar-open');
      overlay.classList.remove('visible');
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        overlay.classList.remove('visible');
      }
    });
  }

  // === SIGN OUT ===
  const signOutLink = document.getElementById('sign-out-link');
  if (signOutLink) {
    signOutLink.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('unigo-logged-in');
      window.location.href = 'login.html';
    });
  }

  // === PREFERENCE TAGS (toggle) ===
  document.querySelectorAll('.pref-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      tag.classList.toggle('selected');
    });
  });

  // === PROFILE PHOTO PERSISTENCE (localStorage) ===
  loadSidebarProfile();

  // Avatar upload on options page
  const avatarInput = document.getElementById('avatar-input');
  if (avatarInput) {
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target.result;
          localStorage.setItem('unigo-avatar', dataUrl);
          const circleLabel = document.getElementById('avatar-circle-label');
          if (circleLabel) {
            circleLabel.innerHTML = `<img src="${dataUrl}" alt="Profile">`;
          }
          loadSidebarProfile();
        };
        reader.readAsDataURL(file);
      }
    });

    // Load existing avatar into options page circle
    const savedAvatar = localStorage.getItem('unigo-avatar');
    if (savedAvatar) {
      const circleLabel = document.getElementById('avatar-circle-label');
      if (circleLabel) {
        circleLabel.innerHTML = `<img src="${savedAvatar}" alt="Profile">`;
      }
    }
  }

  // === DISPLAY NAME PERSISTENCE ===
  const nameInput = document.getElementById('display-name-input');
  if (nameInput) {
    const savedName = localStorage.getItem('unigo-name');
    if (savedName) nameInput.value = savedName;
    nameInput.addEventListener('input', () => {
      localStorage.setItem('unigo-name', nameInput.value);
      loadSidebarProfile();
    });
  }

  // === LOCATION TOGGLE WITH DEVICE LOCATION SERVICES ===
  const locationToggle = document.getElementById('location-toggle');
  if (locationToggle) {
    const savedLocation = localStorage.getItem('unigo-location-enabled');
    locationToggle.checked = savedLocation === 'true';

    // If location was previously enabled, keep it updated in the background
    if (savedLocation === 'true' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          localStorage.setItem('unigo-user-lat', position.coords.latitude.toString());
          localStorage.setItem('unigo-user-lng', position.coords.longitude.toString());
        },
        () => {} // Silently fail on background refresh
      );
    }

    locationToggle.addEventListener('change', () => {
      if (locationToggle.checked) {
        if (!navigator.geolocation) {
          locationToggle.checked = false;
          alert('Geolocation is not supported by your browser.');
          localStorage.setItem('unigo-location-enabled', 'false');
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            localStorage.setItem('unigo-user-lat', position.coords.latitude.toString());
            localStorage.setItem('unigo-user-lng', position.coords.longitude.toString());
            localStorage.setItem('unigo-location-enabled', 'true');
          },
          (error) => {
            locationToggle.checked = false;
            localStorage.setItem('unigo-location-enabled', 'false');
            if (error.code === error.PERMISSION_DENIED) {
              alert('Location access denied. Please enable location permissions in your browser settings.');
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              alert('Location unavailable. Make sure location services are enabled on your device.');
            } else {
              alert('Could not get your location. Please try again.');
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      } else {
        localStorage.removeItem('unigo-user-lat');
        localStorage.removeItem('unigo-user-lng');
        localStorage.setItem('unigo-location-enabled', 'false');
      }
    });
  }

  // === COURSES (add/remove with localStorage) ===
  const coursesContainer = document.getElementById('courses-container');
  const courseInput = document.getElementById('course-input');
  const courseAddBtn = document.getElementById('course-add-btn');

  if (coursesContainer && courseInput && courseAddBtn) {
    let courses = JSON.parse(localStorage.getItem('unigo-courses') || '[]');

    function renderCourses() {
      coursesContainer.innerHTML = '';

      if (courses.length === 0) {
        coursesContainer.innerHTML = '<p style="color:#999; font-size:0.82rem; font-style:italic;">No courses added yet</p>';
        return;
      }

      courses.forEach((course, index) => {
        const chip = document.createElement('span');
        chip.className = 'course-chip';
        chip.innerHTML = `${course}<span class="remove-course" data-index="${index}">&times;</span>`;
        coursesContainer.appendChild(chip);
      });

      // Attach remove listeners
      coursesContainer.querySelectorAll('.remove-course').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.target.dataset.index);
          courses.splice(idx, 1);
          localStorage.setItem('unigo-courses', JSON.stringify(courses));
          renderCourses();
        });
      });
    }

    courseAddBtn.addEventListener('click', addCourse);
    courseInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCourse();
      }
    });

    function addCourse() {
      const val = courseInput.value.trim().toUpperCase();
      if (val && !courses.includes(val)) {
        courses.push(val);
        localStorage.setItem('unigo-courses', JSON.stringify(courses));
        renderCourses();
        courseInput.value = '';
      }
    }

    renderCourses();
  }
});

// === SIDEBAR PROFILE LOADER ===
function loadSidebarProfile() {
  const avatarImg = document.getElementById('sidebar-avatar');
  const avatarDefault = document.getElementById('sidebar-avatar-default');
  const usernameEl = document.getElementById('sidebar-username');

  const savedAvatar = localStorage.getItem('unigo-avatar');
  const savedName = localStorage.getItem('unigo-name');

  if (avatarImg && avatarDefault) {
    if (savedAvatar) {
      avatarImg.src = savedAvatar;
      avatarImg.style.display = 'block';
      avatarDefault.style.display = 'none';
    } else {
      avatarImg.style.display = 'none';
      avatarDefault.style.display = 'flex';
    }
  }

  if (usernameEl) {
    usernameEl.textContent = savedName || 'User';
  }
}
