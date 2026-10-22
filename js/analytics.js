// Cineplex User Testing Analytics Helper

const ANALYTICS_STORAGE_KEY = 'cineplex_test_analytics';
const CURRENT_SESSION_KEY = 'current_test_session';

// Retrieve all completed analytics sessions from localStorage
function getSavedAnalytics() {
  const data = localStorage.getItem(ANALYTICS_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// Get or initialize the active user session in sessionStorage
function getActiveSession() {
  let session = sessionStorage.getItem(CURRENT_SESSION_KEY);
  if (!session) {
    const existingCount = getSavedAnalytics().length;
    session = {
      id: 'session_' + Date.now(),
      userLabel: `User ${existingCount + 1}`,
      startTime: Date.now(),
      stepStarts: {
        location: Date.now()
      },
      durations: {
        location: 0,
        movie: 0,
        booking: 0,
        auth: 0,
        payment: 0
      },
      selections: {
        city: '',
        theatre: '',
        movie: '',
        date: '',
        time: '',
        seats: [],
        authMode: '',
        paymentMethod: ''
      }
    };
    sessionStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
  } else {
    session = JSON.parse(session);
  }
  return session;
}

// Save updated active session back to sessionStorage
function updateActiveSession(session) {
  sessionStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
}

// Record Location Selection (Stage 1)
function trackLocationStep(cityName, theatreName) {
  const session = getActiveSession();
  const now = Date.now();
  session.selections.city = cityName;
  session.selections.theatre = theatreName;
  session.durations.location = Math.round((now - (session.stepStarts.location || now)) / 1000);
  session.stepStarts.movie = now;
  updateActiveSession(session);
}

// Record Movie Selection (Stage 2)
function trackMovieStep(movieTitle) {
  const session = getActiveSession();
  const now = Date.now();
  session.selections.movie = movieTitle;
  session.durations.movie = Math.round((now - (session.stepStarts.movie || now)) / 1000);
  session.stepStarts.booking = now;
  updateActiveSession(session);
}

// Record Booking Selection (Stage 3)
function trackBookingStep(dateVal, timeVal, seatsArray) {
  const session = getActiveSession();
  const now = Date.now();
  session.selections.date = dateVal;
  session.selections.time = timeVal;
  session.selections.seats = seatsArray;
  session.durations.booking = Math.round((now - (session.stepStarts.booking || now)) / 1000);
  session.stepStarts.auth = now;
  updateActiveSession(session);
}

// Record Auth Choice (Log In / Sign Up / Guest)
function trackAuthStep(modeName) {
  const session = getActiveSession();
  const now = Date.now();
  session.selections.authMode = modeName;
  session.durations.auth = Math.round((now - (session.stepStarts.auth || now)) / 1000);
  session.stepStarts.payment = now;
  updateActiveSession(session);
}

// Record Payment Completion & Finalize Test Session
function finalizeTestSession(paymentMethod) {
  const session = getActiveSession();
  const now = Date.now();
  session.selections.paymentMethod = paymentMethod;
  session.durations.payment = Math.round((now - (session.stepStarts.payment || now)) / 1000);
  
  // Total time from start of session to payment completion
  session.totalDurationSeconds = Math.round((now - session.startTime) / 1000);
  session.completedAt = new Date().toLocaleString();

  // Save into completed list
  const saved = getSavedAnalytics();
  saved.push(session);
  localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(saved));

  // Clear current active session
  sessionStorage.removeItem(CURRENT_SESSION_KEY);
}

// Helper to format seconds into readable mm:ss or s
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

// Export Analytics Data as CSV File
function exportAnalyticsCSV() {
  const data = getSavedAnalytics();
  if (data.length === 0) {
    alert('No analytics data available to export.');
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += 'User Label,Date Completed,Total Time,Location Time,Movie Time,Booking Time,Auth Time,Payment Time,City,Theatre,Movie,Date,Time,Seats,Auth Mode,Payment Method\n';

  data.forEach(d => {
    const seatsStr = `"${(d.selections.seats || []).join(';')}"`;
    const row = [
      d.userLabel,
      `"${d.completedAt}"`,
      formatDuration(d.totalDurationSeconds),
      formatDuration(d.durations.location),
      formatDuration(d.durations.movie),
      formatDuration(d.durations.booking),
      formatDuration(d.durations.auth),
      formatDuration(d.durations.payment),
      `"${d.selections.city}"`,
      `"${d.selections.theatre}"`,
      `"${d.selections.movie}"`,
      `"${d.selections.date}"`,
      `"${d.selections.time}"`,
      seatsStr,
      `"${d.selections.authMode}"`,
      `"${d.selections.paymentMethod}"`
    ].join(',');
    csvContent += row + '\n';
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `cineplex_testing_analytics_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export Analytics Data as JSON File
function exportAnalyticsJSON() {
  const data = getSavedAnalytics();
  if (data.length === 0) {
    alert('No analytics data available to export.');
    return;
  }

  const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', jsonStr);
  link.setAttribute('download', `cineplex_testing_analytics_${Date.now()}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Clear all analytics data
function clearAnalyticsData() {
  if (confirm('Are you sure you want to clear all recorded user test analytics?')) {
    localStorage.removeItem(ANALYTICS_STORAGE_KEY);
    sessionStorage.removeItem(CURRENT_SESSION_KEY);
    location.reload();
  }
}
