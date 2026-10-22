// Global Cineplex Prototype JS logic

let cinemaData = null;

// Fetch JSON data
async function loadCinemaData() {
  try {
    const response = await fetch('./data/cinema_data.json');
    cinemaData = await response.json();
    return cinemaData;
  } catch (error) {
    console.error('Error loading cinema JSON data:', error);
  }
}

// Utility to parse URL parameters
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    cityId: params.get('city') || 'toronto',
    theatreId: params.get('theatre') || 't1',
    movieId: params.get('movie') || 'm101',
    seats: params.get('seats') || ''
  };
}

// Shared Persistent Seat Hold Countdown Timer
function startHoldCountdown(timerElementId, bannerElementId) {
  const banner = document.getElementById(bannerElementId);
  const timerEl = document.getElementById(timerElementId);
  const params = getUrlParams();
  
  const expiryTime = sessionStorage.getItem('seatHoldExpiry');

  // ONLY show countdown if in ticket checkout flow (seats param present and valid expiry)
  if (!params.seats || !expiryTime) {
    if (banner) banner.style.display = 'none';
    return;
  }

  if (banner) banner.style.display = 'flex';

  function update() {
    const now = Date.now();
    const remainingMs = parseInt(expiryTime, 10) - now;

    if (remainingMs <= 0) {
      if (timerEl) timerEl.textContent = '00:00';
      alert('Seat hold time expired. Please re-select your seats.');
      sessionStorage.removeItem('seatHoldExpiry');
      window.location.href = 'index.html';
      return;
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (timerEl) {
      timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }

  update();
  const interval = setInterval(() => {
    const now = Date.now();
    if (parseInt(expiryTime, 10) - now <= 0) {
      clearInterval(interval);
    }
    update();
  }, 1000);
}

// STAGE 1: Location Page Initialization
async function initLocationPage() {
  // Initialize active session tracking for analytics
  if (typeof getActiveSession === 'function') {
    getActiveSession();
  }

  const data = await loadCinemaData();
  if (!data) return;

  const cityInput = document.getElementById('cityInput');
  const cityDatalist = document.getElementById('cityDatalist');
  const theatreSelect = document.getElementById('theatreSelect');
  const locationForm = document.getElementById('locationForm');

  if (!cityInput || !cityDatalist || !theatreSelect) return;

  cityDatalist.innerHTML = '';
  data.cities.forEach(city => {
    const option = document.createElement('option');
    option.value = city.name;
    cityDatalist.appendChild(option);
  });

  function updateTheatres(cityName) {
    theatreSelect.innerHTML = '';
    const cityObj = data.cities.find(c => c.name.toLowerCase() === cityName.toLowerCase()) || data.cities[0];
    
    cityObj.theatres.forEach(theatre => {
      const opt = document.createElement('option');
      opt.value = theatre.id;
      opt.textContent = theatre.name;
      theatreSelect.appendChild(opt);
    });

    theatreSelect.dataset.cityId = cityObj.id;
  }

  cityInput.value = data.cities[0].name;
  updateTheatres(data.cities[0].name);

  cityInput.addEventListener('input', (e) => {
    updateTheatres(e.target.value);
  });

  locationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const selectedCityId = theatreSelect.dataset.cityId || 'toronto';
    const selectedTheatreId = theatreSelect.value || 't1';
    
    const cityObj = data.cities.find(c => c.id === selectedCityId) || data.cities[0];
    const theatreObj = cityObj.theatres.find(t => t.id === selectedTheatreId) || cityObj.theatres[0];

    // Analytics Tracking: Stage 1 Location
    if (typeof trackLocationStep === 'function') {
      trackLocationStep(cityObj.name, theatreObj.name);
    }

    window.location.href = `movies.html?city=${selectedCityId}&theatre=${selectedTheatreId}`;
  });
}

// STAGE 2: Movie Selection Page Initialization
async function initMoviesPage() {
  const data = await loadCinemaData();
  if (!data) return;

  const params = getUrlParams();
  const cityObj = data.cities.find(c => c.id === params.cityId) || data.cities[0];
  const theatreObj = cityObj.theatres.find(t => t.id === params.theatreId) || cityObj.theatres[0];

  const currentTheatreText = document.getElementById('currentTheatreText');
  if (currentTheatreText) {
    currentTheatreText.textContent = `${cityObj.name} - ${theatreObj.name}`;
  }

  const movieGrid = document.getElementById('movieGrid');
  if (!movieGrid) return;

  movieGrid.innerHTML = '';
  data.movies.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
      <div>
        <div class="movie-poster-placeholder">
          <span>${movie.title}</span>
        </div>
        <div class="movie-info">
          <div class="movie-title">${movie.title}</div>
          <div class="movie-details">${movie.genre}</div>
          <div class="movie-details">${movie.duration} | ${movie.rating}</div>
        </div>
      </div>
      <a href="booking.html?city=${cityObj.id}&theatre=${theatreObj.id}&movie=${movie.id}" class="btn-buy" data-movie-title="${movie.title}">Buy</a>
    `;
    movieGrid.appendChild(card);
  });

  // Analytics Tracking: Movie Selection Click
  movieGrid.querySelectorAll('.btn-buy').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const title = e.currentTarget.dataset.movieTitle;
      if (typeof trackMovieStep === 'function') {
        trackMovieStep(title);
      }
    });
  });
}

// STAGE 3: Booking & Seat Selection Page Initialization
async function initBookingPage() {
  const data = await loadCinemaData();
  if (!data) return;

  const params = getUrlParams();
  const cityObj = data.cities.find(c => c.id === params.cityId) || data.cities[0];
  const theatreObj = cityObj.theatres.find(t => t.id === params.theatreId) || cityObj.theatres[0];
  const movieObj = data.movies.find(m => m.id === params.movieId) || data.movies[0];

  const summaryBox = document.getElementById('selectedMovieSummary');
  if (summaryBox) {
    summaryBox.innerHTML = `
      <div class="movie-poster-placeholder">
        <span>${movieObj.title}</span>
      </div>
      <div>
        <h2 style="font-size: 1.3rem; margin-bottom: 0.3rem;">${movieObj.title}</h2>
        <p style="font-size: 0.9rem; color: var(--text-muted); mb-1">${movieObj.genre} • ${movieObj.duration}</p>
        <p style="font-size: 0.85rem; margin-top: 0.5rem; color: var(--text-muted);">${theatreObj.name} (${cityObj.name})</p>
      </div>
    `;
  }

  const dateSelect = document.getElementById('dateSelect');
  const timeSelect = document.getElementById('timeSelect');

  if (dateSelect && timeSelect) {
    movieObj.dates.forEach(date => {
      const opt = document.createElement('option');
      opt.value = date;
      opt.textContent = date;
      dateSelect.appendChild(opt);
    });

    movieObj.times.forEach(time => {
      const opt = document.createElement('option');
      opt.value = time;
      opt.textContent = time;
      timeSelect.appendChild(opt);
    });
  }

  let quantity = 1;
  const quantityValueEl = document.getElementById('quantityValue');
  const btnMinus = document.getElementById('btnMinus');
  const btnPlus = document.getElementById('btnPlus');
  const selectedCountSummary = document.getElementById('selectedCountSummary');

  function updateQuantityDisplay() {
    if (quantityValueEl) quantityValueEl.textContent = quantity;
    if (selectedCountSummary) selectedCountSummary.textContent = quantity;
    updateSeatSelectionUI();
  }

  btnMinus?.addEventListener('click', () => {
    if (quantity > 1) {
      quantity--;
      updateQuantityDisplay();
    }
  });

  btnPlus?.addEventListener('click', () => {
    if (quantity < 10) {
      quantity++;
      updateQuantityDisplay();
    }
  });

  const seatsGrid = document.getElementById('seatsGrid');
  const selectedSeatsSummary = document.getElementById('selectedSeatsSummary');
  let selectedSeatNumbers = [];

  const rows = ['A', 'B', 'C', 'D'];
  const cols = [1, 2, 3, 4, 5, 6];
  const occupiedSeats = ['A3', 'A4', 'C2'];

  if (seatsGrid) {
    seatsGrid.innerHTML = '';
    rows.forEach(r => {
      cols.forEach(c => {
        const seatId = `${r}${c}`;
        const seatEl = document.createElement('div');
        seatEl.className = 'seat';
        seatEl.textContent = seatId;
        seatEl.dataset.seatId = seatId;

        if (occupiedSeats.includes(seatId)) {
          seatEl.classList.add('occupied');
        } else {
          seatEl.addEventListener('click', () => toggleSeat(seatId, seatEl));
        }

        seatsGrid.appendChild(seatEl);
      });
    });
  }

  function toggleSeat(seatId, seatEl) {
    if (selectedSeatNumbers.includes(seatId)) {
      selectedSeatNumbers = selectedSeatNumbers.filter(s => s !== seatId);
      seatEl.classList.remove('selected');
    } else {
      if (selectedSeatNumbers.length < quantity) {
        selectedSeatNumbers.push(seatId);
        seatEl.classList.add('selected');
      } else {
        const removed = selectedSeatNumbers.shift();
        const prevSelectedEl = document.querySelector(`.seat[data-seat-id="${removed}"]`);
        if (prevSelectedEl) prevSelectedEl.classList.remove('selected');
        
        selectedSeatNumbers.push(seatId);
        seatEl.classList.add('selected');
      }
    }
    updateSeatSelectionUI();
  }

  function updateSeatSelectionUI() {
    if (selectedSeatsSummary) {
      selectedSeatsSummary.textContent = selectedSeatNumbers.length > 0 ? selectedSeatNumbers.join(', ') : 'None';
    }
  }

  const bookingForm = document.getElementById('bookingForm');
  const spotModal = document.getElementById('spotModal');

  bookingForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (selectedSeatNumbers.length === 0) {
      alert('Please select at least one seat before confirming.');
      return;
    }

    // Analytics Tracking: Booking Stage
    if (typeof trackBookingStep === 'function') {
      trackBookingStep(dateSelect.value, timeSelect.value, selectedSeatNumbers);
    }

    const fiveMinutesMs = 5 * 60 * 1000;
    sessionStorage.setItem('seatHoldExpiry', Date.now() + fiveMinutesMs);

    spotModal.classList.add('active');
    startHoldCountdown('holdTimer', null);
  });

  const modalLoginBtn = document.getElementById('modalLoginBtn');
  const modalGuestBtn = document.getElementById('modalGuestBtn');

  modalLoginBtn?.addEventListener('click', () => {
    if (typeof trackAuthStep === 'function') {
      trackAuthStep('Log In');
    }
    const seatsStr = encodeURIComponent(selectedSeatNumbers.join(','));
    window.location.href = `login.html?city=${cityObj.id}&theatre=${theatreObj.id}&movie=${movieObj.id}&seats=${seatsStr}`;
  });

  modalGuestBtn?.addEventListener('click', () => {
    if (typeof trackAuthStep === 'function') {
      trackAuthStep('Guest Checkout');
    }
    const seatsStr = encodeURIComponent(selectedSeatNumbers.join(','));
    window.location.href = `guest.html?city=${cityObj.id}&theatre=${theatreObj.id}&movie=${movieObj.id}&seats=${seatsStr}`;
  });
}

// LOGIN PAGE Initialization
function initLoginPage() {
  const params = getUrlParams();
  const isCheckoutFlow = !!params.seats;

  if (isCheckoutFlow) {
    startHoldCountdown('loginHoldTimer', 'loginHoldTimerBanner');
  }

  const createAccountBtn = document.getElementById('createAccountBtn');
  const loginForm = document.getElementById('loginForm');

  createAccountBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof trackAuthStep === 'function' && isCheckoutFlow) {
      trackAuthStep('Account Creation');
    }
    if (isCheckoutFlow) {
      window.location.href = `signup.html?city=${params.cityId}&theatre=${params.theatreId}&movie=${params.movieId}&seats=${encodeURIComponent(params.seats)}`;
    } else {
      window.location.href = `signup.html`;
    }
  });

  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (isCheckoutFlow) {
      window.location.href = `payment.html?city=${params.cityId}&theatre=${params.theatreId}&movie=${params.movieId}&seats=${encodeURIComponent(params.seats)}`;
    } else {
      alert('Logged in successfully!');
      window.location.href = `index.html`;
    }
  });
}

// SIGNUP PAGE Initialization
function initSignupPage() {
  const params = getUrlParams();
  const isCheckoutFlow = !!params.seats;

  if (isCheckoutFlow) {
    startHoldCountdown('signupHoldTimer', 'signupHoldTimerBanner');
  }

  const signupForm = document.getElementById('signupForm');

  signupForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (isCheckoutFlow) {
      window.location.href = `payment.html?city=${params.cityId}&theatre=${params.theatreId}&movie=${params.movieId}&seats=${encodeURIComponent(params.seats)}`;
    } else {
      alert('Account created successfully!');
      window.location.href = `index.html`;
    }
  });
}

// GUEST PAGE Initialization
function initGuestPage() {
  const params = getUrlParams();
  startHoldCountdown('guestHoldTimer', 'guestHoldTimerBanner');

  const guestForm = document.getElementById('guestForm');

  guestForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    window.location.href = `payment.html?city=${params.cityId}&theatre=${params.theatreId}&movie=${params.movieId}&seats=${encodeURIComponent(params.seats)}`;
  });
}

// PAYMENT PAGE Initialization
async function initPaymentPage() {
  const params = getUrlParams();
  startHoldCountdown('paymentHoldTimer', 'paymentHoldTimerBanner');

  const seatList = params.seats ? params.seats.split(',') : ['A1'];
  const ticketCount = seatList.length;
  const pricePerTicket = 16.50;
  const totalPrice = (ticketCount * pricePerTicket).toFixed(2);

  const totalAmountDisplay = document.getElementById('totalAmountDisplay');
  if (totalAmountDisplay) {
    totalAmountDisplay.textContent = `$${totalPrice}`;
  }

  const paymentForm = document.getElementById('paymentForm');
  const paypalBtn = document.getElementById('paypalBtn');

  function completeOrder(method) {
    // Finalize analytics tracking
    if (typeof finalizeTestSession === 'function') {
      finalizeTestSession(method);
    }
    alert(`Payment Successful via ${method}!\nTotal Paid: $${totalPrice}\nSeats: ${seatList.join(', ')}\nYour tickets have been sent to your email.\n\n[Testing Note]: Analytics session recorded! View results on Analytics Dashboard.`);
    sessionStorage.removeItem('seatHoldExpiry');
    window.location.href = 'analytics.html';
  }

  paymentForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    completeOrder('Credit/Debit Card');
  });

  paypalBtn?.addEventListener('click', () => {
    completeOrder('PayPal');
  });
}
