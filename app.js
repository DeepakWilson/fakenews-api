// ---------------------------------------------------------
// Veritas AI — Premium Frontend Logic & ML Backend Interface
// ---------------------------------------------------------

// --- State Variables ---
let currentTab = 'dashboard';
let currentScanType = 'text'; // 'text' or 'url'
let activeApiUrl = localStorage.getItem('veritas_api_url') || 'http://127.0.0.1:8000/predict';
let scanHistory = JSON.parse(localStorage.getItem('veritas_history')) || [];

// --- Default Initial Seed Data for History ---
const seedHistory = [
  {
    id: 'seed-1',
    timestamp: '2026-08-07 14:32',
    source: 'URL Scan',
    content: 'https://reliabletimes.com/science/new-fusion-reactor-tests',
    score: 94,
    verdict: 'verified',
    bias: 12,
    sensationalism: 8,
    source_trust: 96,
    details: 'Article details factual breakthroughs in clean energy with multiple peer-reviewed references. Neutral semantic tone.'
  },
  {
    id: 'seed-2',
    timestamp: '2026-08-07 18:15',
    source: 'Text Scan',
    content: 'Miracle elixir discovered in local gardens cures all viral infections within 48 hours according to viral online reports...',
    score: 18,
    verdict: 'fake',
    bias: 90,
    sensationalism: 95,
    source_trust: 10,
    details: 'Language analysis displays extreme promotional bias, absolute claims without documentation, and clickbait semantic headers.'
  },
  {
    id: 'seed-3',
    timestamp: '2026-08-08 09:05',
    source: 'URL Scan',
    content: 'https://viralbuzzfeed.co.uk/celebrity/secret-romance-exposed',
    score: 42,
    verdict: 'clickbait',
    bias: 45,
    sensationalism: 88,
    source_trust: 35,
    details: 'Headline structures use curiosity gaps and exaggerated punctuation. Content lacks corroborating evidence from authority registries.'
  }
];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lucide Icons
  lucide.createIcons();

  // 2. Initialize Theme Mode
  initTheme();

  // 3. Load API Endpoint input value
  const apiInput = document.getElementById('apiUrlInput');
  if (apiInput) apiInput.value = activeApiUrl;

  // 4. Load History Table (with seed items if empty)
  if (scanHistory.length === 0) {
    scanHistory = seedHistory;
    localStorage.setItem('veritas_history', JSON.stringify(scanHistory));
  }
  renderHistoryTable();

  // 5. Initialize Text Area counters
  const textarea = document.getElementById('newsText');
  if (textarea) {
    textarea.addEventListener('input', updateInputCounters);
  }

  // 6. Setup custom cursor / magnetic hover hooks for elements
  initHoverEffects();

  // 7. Render initial charts
  updateDashboardCharts();
});

// --- Theme Management ---
function initTheme() {
  const savedTheme = localStorage.getItem('veritas_theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    updateThemeIcon('light');
  } else {
    document.body.classList.remove('light-theme');
    updateThemeIcon('dark');
  }

  const toggleBtn = document.getElementById('themeToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-theme');
      const newTheme = isLight ? 'light' : 'dark';
      localStorage.setItem('veritas_theme', newTheme);
      updateThemeIcon(newTheme);
      showToast(`Switched to ${newTheme} mode`);
    });
  }
}

// Update Theme Icon
function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (!icon) return;
  
  if (theme === 'light') {
    icon.setAttribute('data-lucide', 'sun');
  } else {
    icon.setAttribute('data-lucide', 'moon');
  }
  lucide.createIcons();
}

// --- Navigation Tabs ---
function switchTab(tabId) {
  // Hide active sections, show new target section
  const panes = document.querySelectorAll('.tab-pane');
  panes.forEach(pane => {
    pane.classList.remove('active');
  });

  const targetPane = document.getElementById(tabId);
  if (targetPane) {
    targetPane.classList.add('active');
  }

  // Update navigation items
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.getAttribute('data-tab') === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  currentTab = tabId;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Custom re-renders when switching tabs
  if (tabId === 'history') {
    renderHistoryTable();
  } else if (tabId === 'dashboard') {
    updateDashboardCharts();
  }
}

// Wire up click event listeners to tabs dynamically
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const tab = item.getAttribute('data-tab');
    switchTab(tab);
  });
});

// --- Text Area Counters ---
function updateInputCounters() {
  const text = document.getElementById('newsText').value;
  const chars = text.length;
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

  document.getElementById('charCount').textContent = `${chars} characters`;
  document.getElementById('wordCount').textContent = `${words} words`;
}

// --- Scan Type (Text / URL) Toggle ---
function switchScanType(type) {
  currentScanType = type;
  
  const textBtn = document.getElementById('tabTextBtn');
  const urlBtn = document.getElementById('tabUrlBtn');
  const textContainer = document.getElementById('textInputContainer');
  const urlContainer = document.getElementById('urlInputContainer');

  if (type === 'text') {
    textBtn.classList.add('active');
    urlBtn.classList.remove('active');
    textContainer.classList.add('active');
    urlContainer.classList.remove('active');
  } else {
    textBtn.classList.remove('active');
    urlBtn.classList.add('active');
    textContainer.classList.remove('active');
    urlContainer.classList.add('active');
  }
}

// Clear input forms
function clearAnalyzerInputs() {
  document.getElementById('newsText').value = '';
  document.getElementById('newsUrl').value = '';
  updateInputCounters();
  
  // Collapse results and logs
  document.getElementById('resultCard').classList.add('inactive');
  document.getElementById('progressLog').classList.add('hidden');
  showToast('Analyzer inputs cleared');
}

// --- Fake News Verification Pipeline (Simulated & Real Fetch Integration) ---
async function performAnalysis() {
  let textInput = document.getElementById('newsText').value.trim();
  let urlInput = document.getElementById('newsUrl').value.trim();

  // Validate inputs
  if (currentScanType === 'text' && textInput.length < 15) {
    showToast('Please enter a longer claim/text for verification.');
    return;
  }
  if (currentScanType === 'url' && !urlInput.startsWith('http')) {
    showToast('Please enter a valid URL (starting with http:// or https://).');
    return;
  }

  // Prep UI: Hide old results, show logging console
  const resultCard = document.getElementById('resultCard');
  resultCard.classList.add('inactive');
  
  const logConsole = document.getElementById('progressLog');
  const logStepsContainer = document.getElementById('progressSteps');
  const progressBar = document.getElementById('scanningProgressFill');
  const analyzeBtn = document.getElementById('analyzeBtn');

  logConsole.classList.remove('hidden');
  logStepsContainer.innerHTML = '';
  progressBar.style.width = '0%';
  analyzeBtn.disabled = true;

  // Logging steps mapping
  const steps = [
    { percent: 15, msg: 'Normalizing input tokens and purging HTML formatting tags...' },
    { percent: 35, msg: 'Extracting semantic vocabulary and scoring linguistic bias...' },
    { percent: 60, msg: 'Checking domain records & cross-referencing global databases...' },
    { percent: 85, msg: 'Evaluating syntax style patterns against clickbait heuristics...' },
    { percent: 100, msg: 'Executing model classification vector trees...' }
  ];

  // Progressive logger simulation
  for (let i = 0; i < steps.length; i++) {
    await sleep(600); // Create simulated network/process delay
    
    // Add step row to console
    const stepRow = document.createElement('div');
    stepRow.className = 'step-log working';
    stepRow.innerHTML = `<i data-lucide="loader" class="animate-spin" style="width: 14px; height: 14px;"></i> <span>[${steps[i].percent}%] ${steps[i].msg}</span>`;
    logStepsContainer.appendChild(stepRow);
    lucide.createIcons();
    
    // Update step container scroll to bottom
    logStepsContainer.scrollTop = logStepsContainer.scrollHeight;
    
    // Update progress bar width
    progressBar.style.width = `${steps[i].percent}%`;
    
    // Mark previous step as success
    if (i > 0) {
      const prevStep = logStepsContainer.children[i-1];
      prevStep.className = 'step-log success';
      prevStep.querySelector('i').replaceWith(createSuccessIcon());
    }
  }

  // Mark final step as success
  const lastStep = logStepsContainer.children[steps.length - 1];
  lastStep.className = 'step-log success';
  lastStep.querySelector('i').replaceWith(createSuccessIcon());
  
  await sleep(400); // Tiny pause before showing results

  // --- Perform actual classification ---
  let payload = {
    text: currentScanType === 'text' ? textInput : null,
    url: currentScanType === 'url' ? urlInput : null
  };

  let analysisResult;

  try {
    // Attempt sending requests to their model endpoint
    const response = await fetch(activeApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      analysisResult = await response.json();
      showToast('Backend ML model scan complete!');
    } else {
      throw new Error('API return code was not successful');
    }
  } catch (error) {
    // Fall back to built-in NLP heuristics for simulation/showcase
    console.warn("Backend ML API connection failed or not configured. Using local heuristics engine.", error);
    analysisResult = runLocalHeuristicsClassifier(currentScanType === 'text' ? textInput : urlInput);
    showToast('Analysis complete (Simulator Mode)');
  }

  // --- Display Results ---
  displayAnalysisReport(analysisResult);
  
  // Clean buttons
  analyzeBtn.disabled = false;
}

// Local mock classification engine logic to make the app work immediately out-of-the-box
function runLocalHeuristicsClassifier(content) {
  const contentLower = content.toLowerCase();
  
  // Basic heuristics searching for keywords common in questionable articles
  const clickbaitTriggers = ['unbelievable', 'you won\'t believe', 'shocking', 'secret they don\'t want you to know', 'miracle', 'insane', 'exposed!'];
  const fakeTriggers = ['illuminati', 'microchips', 'secret cure', 'government coverup', 'flat earth', 'space hoax', 'clone', 'conspiracy'];
  
  let truthScore = 85; // Base truth score
  let bias = 15;
  let sensationalism = 10;
  let sourceTrust = 90;
  let verdict = 'VERIFIED';
  let details = 'The text features neutral structures, balanced punctuation, and is written in an informative journalistic style.';

  // Check sensationalism markers
  let sensationalCount = 0;
  clickbaitTriggers.forEach(word => {
    if (contentLower.includes(word)) sensationalCount++;
  });
  // Punctuation check (multiple exclamation marks or capitals)
  if ((content.match(/!/g) || []).length > 2) sensationalCount += 2;
  if ((content.match(/[A-Z]{4,}/g) || []).length > 3) sensationalCount += 2;

  // Check fake triggers
  let conspiracyCount = 0;
  fakeTriggers.forEach(word => {
    if (contentLower.includes(word)) conspiracyCount++;
  });

  // Calculate scores
  if (conspiracyCount > 0) {
    truthScore = Math.max(10, 40 - (conspiracyCount * 15));
    bias = Math.min(95, 60 + (conspiracyCount * 10));
    sensationalism = Math.min(95, 50 + (sensationalCount * 15));
    sourceTrust = Math.max(5, 30 - (conspiracyCount * 10));
    verdict = 'FAKE';
    details = 'Extremely high likelihood of misinformation. Text contains unverified conspiracy buzzwords and displays extreme ideological polarity.';
  } else if (sensationalCount > 2) {
    truthScore = 48;
    bias = 40;
    sensationalism = 85;
    sourceTrust = 50;
    verdict = 'CLICKBAIT';
    details = 'Flags hyper-sensational clickbait tactics designed to grab attention rather than convey verified information.';
  } else if (sensationalCount > 0 || contentLower.length < 80) {
    // Suspect
    truthScore = 68;
    bias = 35;
    sensationalism = 40;
    sourceTrust = 75;
    verdict = 'SUSPICIOUS';
    details = 'Moderate bias detected. Content contains subjective opinion statements presented as core objective facts.';
  }

  // Adjust output if URL is scanned to mimic domain checks
  if (currentScanType === 'url') {
    const parsedUrl = contentLower.replace('https://', '').replace('http://', '').split('/')[0];
    if (parsedUrl.includes('buzz') || parsedUrl.includes('viral') || parsedUrl.includes('daily') || parsedUrl.includes('secret')) {
      truthScore = Math.max(15, truthScore - 20);
      sourceTrust = Math.max(10, sourceTrust - 30);
      sensationalism = Math.min(90, sensationalism + 15);
      if (verdict === 'VERIFIED') verdict = 'CLICKBAIT';
    }
  }

  return {
    truth_score: truthScore,
    verdict: verdict,
    bias: bias,
    sensationalism: sensationalism,
    source_trust: sourceTrust,
    diagnostic_details: details
  };
}

// Display report data and trigger radial gauge CSS/SVG animations
function displayAnalysisReport(data) {
  const resultCard = document.getElementById('resultCard');
  resultCard.classList.remove('inactive');

  // Update verdict label class
  const label = document.getElementById('resultLabel');
  label.textContent = data.verdict;
  label.className = `result-badge ${data.verdict.toLowerCase()}`;

  // Animate Gauge score value
  let startValue = 0;
  const endValue = data.truth_score;
  const duration = 1500;
  const startTime = performance.now();

  function animateScore(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function (outQuad)
    const easedProgress = progress * (2 - progress);
    const currentValue = Math.floor(easedProgress * endValue);
    
    document.getElementById('scoreNum').textContent = `${currentValue}%`;

    if (progress < 1) {
      requestAnimationFrame(animateScore);
    } else {
      document.getElementById('scoreNum').textContent = `${endValue}%`;
    }
  }
  requestAnimationFrame(animateScore);

  // SVG Gauge Path stroke offset animation
  const circle = document.getElementById('gaugeCircle');
  const radius = circle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  
  // Update gauge color based on score
  let gaugeColor = 'var(--color-verified)';
  if (endValue < 35) {
    gaugeColor = 'var(--color-fake)';
  } else if (endValue < 50) {
    gaugeColor = 'var(--color-clickbait)';
  } else if (endValue < 75) {
    gaugeColor = 'var(--color-suspicious)';
  }
  circle.style.stroke = gaugeColor;

  // Set dashoffset corresponding to percentage
  const offset = circumference - (endValue / 100) * circumference;
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = offset;

  // Animate Mini details bars
  const biasBar = document.getElementById('biasMiniBar');
  const sensationalBar = document.getElementById('sensationalismMiniBar');
  const sourceBar = document.getElementById('sourceMiniBar');

  biasBar.style.width = `${data.bias}%`;
  sensationalBar.style.width = `${data.sensationalism}%`;
  sourceBar.style.width = `${data.source_trust}%`;

  // Set colors for mini bars
  biasBar.style.backgroundColor = getScaleColor(data.bias, true); // Bias is worse if high
  sensationalBar.style.backgroundColor = getScaleColor(data.sensationalism, true); // Sensationalism is worse if high
  sourceBar.style.backgroundColor = getScaleColor(data.source_trust, false); // Trust is better if high

  // Set label strings
  document.getElementById('biasText').textContent = getScaleLabel(data.bias, 'bias');
  document.getElementById('sensationalismText').textContent = getScaleLabel(data.sensationalism, 'sensationalism');
  document.getElementById('sourceText').textContent = getScaleLabel(data.source_trust, 'source');

  // Detailed diagnostics
  document.getElementById('resultDetailedText').textContent = data.diagnostic_details;

  // Temporarily cache last scan object for saving
  window.lastScanResult = {
    source: currentScanType === 'text' ? 'Text Scan' : 'URL Scan',
    content: currentScanType === 'text' ? document.getElementById('newsText').value.slice(0, 150) + '...' : document.getElementById('newsUrl').value,
    score: data.truth_score,
    verdict: data.verdict.toLowerCase(),
    bias: data.bias,
    sensationalism: data.sensationalism,
    source_trust: data.source_trust,
    details: data.diagnostic_details
  };
}

// Helpers for metric mapping
function getScaleColor(value, isNegativeMetric) {
  if (isNegativeMetric) {
    if (value > 70) return 'var(--color-fake)';
    if (value > 40) return 'var(--color-clickbait)';
    return 'var(--color-verified)';
  } else {
    if (value > 75) return 'var(--color-verified)';
    if (value > 45) return 'var(--color-suspicious)';
    return 'var(--color-fake)';
  }
}

function getScaleLabel(value, type) {
  if (type === 'bias') {
    if (value > 70) return 'Extreme';
    if (value > 40) return 'Moderate';
    return 'Neutral';
  } else if (type === 'sensationalism') {
    if (value > 70) return 'High';
    if (value > 35) return 'Moderate';
    return 'Low';
  } else {
    if (value > 75) return 'High';
    if (value > 45) return 'Medium';
    return 'Low';
  }
}

// Create check SVG element
function createSuccessIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '3');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.className = 'lucide lucide-check';
  svg.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
  return svg;
}

// --- History Console Database & Persistence ---
function renderHistoryTable() {
  const tbody = document.getElementById('historyTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  
  if (scanHistory.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="text-align: center; color: var(--text-tertiary);">No scan reports found. Run a scan inside the Analyzer tab.</td></tr>`;
    return;
  }

  // Loop history and create rows (newest first)
  const sortedHistory = [...scanHistory].reverse();
  
  sortedHistory.forEach(item => {
    const tr = document.createElement('tr');
    tr.id = `history-row-${item.id}`;
    
    // Snippet formatting
    const displaySnippet = item.content.startsWith('http') 
      ? `<a href="${item.content}" target="_blank" class="docs-link">${item.content}</a>`
      : item.content;

    tr.innerHTML = `
      <td>${item.timestamp}</td>
      <td>
        <span style="display:flex; align-items:center; gap:6px;">
          <i data-lucide="${item.source === 'URL Scan' ? 'globe' : 'file-text'}" style="width:14px; height:14px; color:var(--accent-blue);"></i>
          ${item.source}
        </span>
      </td>
      <td><div class="history-text-snippet" title="${item.content}">${displaySnippet}</div></td>
      <td class="history-score-col" style="color: ${getScaleColor(item.score, false)};">${item.score}%</td>
      <td><span class="history-badge ${item.verdict}">${item.verdict}</span></td>
      <td class="history-action-cell">
        <button class="btn-table-action" onclick="viewHistoryItemDetail('${item.id}')" title="Load report details"><i data-lucide="eye" style="width:16px; height:16px;"></i></button>
        <button class="btn-table-action delete" onclick="deleteHistoryItem('${item.id}')" title="Remove scan"><i data-lucide="trash-2" style="width:16px; height:16px;"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  lucide.createIcons();
}

function saveScanToHistory() {
  if (!window.lastScanResult) {
    showToast('No active scan result to save.');
    return;
  }

  const now = new Date();
  const pad = (n) => n < 10 ? '0' + n : n;
  const timestampStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const newRecord = {
    id: 'scan-' + Date.now(),
    timestamp: timestampStr,
    ...window.lastScanResult
  };

  scanHistory.push(newRecord);
  localStorage.setItem('veritas_history', JSON.stringify(scanHistory));
  showToast('Scan saved to history database!');
  
  // Disable button to prevent duplicates
  document.getElementById('saveResultBtn').disabled = true;
}

function deleteHistoryItem(id) {
  scanHistory = scanHistory.filter(item => item.id !== id);
  localStorage.setItem('veritas_history', JSON.stringify(scanHistory));
  renderHistoryTable();
  updateDashboardCharts();
  showToast('Scan report deleted');
}

function clearAllHistory() {
  if (confirm('Are you sure you want to purge all scanned news metrics in local database?')) {
    scanHistory = [];
    localStorage.setItem('veritas_history', JSON.stringify([]));
    renderHistoryTable();
    updateDashboardCharts();
    showToast('Scan history purged successfully');
  }
}

function filterHistory() {
  const query = document.getElementById('historySearch').value.toLowerCase();
  const selectFilter = document.getElementById('historyFilter').value;
  const rows = document.querySelectorAll('#historyTableBody tr');

  rows.forEach(row => {
    // Guard empty rows
    if (row.cells.length < 5) return;

    const snippetText = row.cells[2].textContent.toLowerCase();
    const verdictBadge = row.cells[4].textContent.trim().toLowerCase();
    
    const matchesSearch = snippetText.includes(query);
    const matchesFilter = selectFilter === 'all' || verdictBadge === selectFilter;

    if (matchesSearch && matchesFilter) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

function viewHistoryItemDetail(id) {
  const item = scanHistory.find(x => x.id === id);
  if (!item) return;

  // Force navigate back to Analyzer tab and load details
  switchTab('analyzer');
  
  // Populate field mocks
  if (item.source === 'URL Scan') {
    switchScanType('url');
    document.getElementById('newsUrl').value = item.content;
  } else {
    switchScanType('text');
    document.getElementById('newsText').value = item.content.replace('...', '');
    updateInputCounters();
  }

  // Display results payload
  const reportPayload = {
    verdict: item.verdict.toUpperCase(),
    truth_score: item.score,
    bias: item.bias,
    sensationalism: item.sensationalism,
    source_trust: item.source_trust,
    diagnostic_details: item.details
  };
  
  displayAnalysisReport(reportPayload);
  
  // Ensure "Save" button is disabled since it is loaded from database already
  document.getElementById('saveResultBtn').disabled = true;
  showToast('Historical report loaded');
}

// --- Dashboard Chart Updaters (Pure HTML/CSS circular and bar updates) ---
function updateDashboardCharts() {
  const counts = { verified: 0, fake: 0, clickbait: 0, suspicious: 0 };
  
  scanHistory.forEach(item => {
    if (counts[item.verdict] !== undefined) {
      counts[item.verdict]++;
    }
  });

  const total = scanHistory.length;
  document.querySelector('.donut-number').textContent = total;

  if (total === 0) return;

  // Calculate percentages
  const pctVerified = Math.round((counts.verified / total) * 100);
  const pctFake = Math.round((counts.fake / total) * 100);
  const pctClickbait = Math.round((counts.clickbait / total) * 100);
  const pctSuspicious = Math.round((counts.suspicious / total) * 100);

  // Update Legend text labels
  document.querySelector('.legend-item:nth-child(1)').innerHTML = `<span class="legend-dot dot-verified"></span> Verified (${pctVerified}%)`;
  document.querySelector('.legend-item:nth-child(2)').innerHTML = `<span class="legend-dot dot-fake"></span> Fake News (${pctFake}%)`;
  document.querySelector('.legend-item:nth-child(3)').innerHTML = `<span class="legend-dot dot-clickbait"></span> Clickbait (${pctClickbait}%)`;
  document.querySelector('.legend-item:nth-child(4)').innerHTML = `<span class="legend-dot dot-suspicious"></span> Suspicious (${pctSuspicious}%)`;

  // Dynamically update SVG donut chart stroke-dasharray properties
  const circleVerified = document.querySelector('.circle-verified');
  const circleFake = document.querySelector('.circle-fake');
  const circleClickbait = document.querySelector('.circle-clickbait');
  const circleSuspicious = document.querySelector('.circle-suspicious');

  // SVG Circumference is 100 (due to radius 15.9155 inside stroke-dasharray calculations)
  // Let's set the strokes offsets correctly
  circleVerified.style.strokeDasharray = `${pctVerified}, 100`;
  circleVerified.style.strokeDashoffset = '0';

  circleFake.style.strokeDasharray = `${pctFake}, 100`;
  circleFake.style.strokeDashoffset = `-${pctVerified}`;

  circleClickbait.style.strokeDasharray = `${pctClickbait}, 100`;
  circleClickbait.style.strokeDashoffset = `-${pctVerified + pctFake}`;

  circleSuspicious.style.strokeDasharray = `${pctSuspicious}, 100`;
  circleSuspicious.style.strokeDashoffset = `-${pctVerified + pctFake + pctClickbait}`;
}

// --- API Configurations & Backend Testing ---
function saveApiUrl() {
  const urlValue = document.getElementById('apiUrlInput').value.trim();
  if (urlValue === '') {
    showToast('API URL cannot be blank.');
    return;
  }

  activeApiUrl = urlValue;
  localStorage.setItem('veritas_api_url', activeApiUrl);
  showToast('API Configuration saved successfully');
}

async function testBackendConnection() {
  const consoleBlock = document.getElementById('testResultConsole');
  const testBtn = document.getElementById('testApiBtn');

  consoleBlock.classList.remove('hidden', 'error');
  consoleBlock.textContent = 'Pinging endpoint...\nPOST ' + activeApiUrl + '\nSending pre-flight probe...';
  testBtn.disabled = true;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sec timeout

    const response = await fetch(activeApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: "Ping test connection verification", url: null }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      consoleBlock.classList.remove('error');
      consoleBlock.textContent = `STATUS: ${response.status} OK\n\nRESPONSE BODY:\n${JSON.stringify(data, null, 2)}`;
      showToast('API handshake successful!');
    } else {
      consoleBlock.classList.add('error');
      consoleBlock.textContent = `STATUS: ${response.status} FAILED\n\nHeaders did not return 200. Check backend endpoint logs.`;
      showToast('API handshake failed.');
    }
  } catch (error) {
    consoleBlock.classList.add('error');
    consoleBlock.textContent = `HANDSHAKE EXCEPTION:\n\n${error.message}\n\nTroubleshooting Check:\n1. Is your Python FastAPI/Flask server active at this port?\n2. Did you implement CORS middlewares in your python scripts?`;
    showToast('Failed to connect to API backend.');
  } finally {
    testBtn.disabled = false;
  }
}

// --- Copy Code Blocks Utility ---
function copyCode(btn) {
  const pre = btn.closest('.code-block-container').querySelector('pre');
  const code = pre.textContent;

  navigator.clipboard.writeText(code).then(() => {
    // Show visual success inside button
    const span = btn.querySelector('span');
    const icon = btn.querySelector('i');
    
    span.textContent = 'Copied!';
    icon.setAttribute('data-lucide', 'check');
    lucide.createIcons();

    setTimeout(() => {
      span.textContent = 'Copy';
      icon.setAttribute('data-lucide', 'copy');
      lucide.createIcons();
    }, 2000);

    showToast('Code block copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy code: ', err);
    showToast('Failed to copy code block.');
  });
}

// --- Toast Banners ---
function showToast(message) {
  const toast = document.getElementById('toast');
  const msgSpan = document.getElementById('toast-message');

  if (!toast || !msgSpan) return;

  msgSpan.textContent = message;
  toast.classList.remove('hidden');
  
  // Force reflow
  toast.offsetHeight;
  
  toast.classList.add('show');

  // Clear previous timers
  if (window.toastTimeout) clearTimeout(window.toastTimeout);

  window.toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 500); // match transition speeds
  }, 2500);
}

// --- Shared Utility Hooks ---
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function shareResult() {
  if (!window.lastScanResult) return;
  const dummyText = `Veritas AI Score: ${window.lastScanResult.score}% (${window.lastScanResult.verdict.toUpperCase()}). Scanned item content: ${window.lastScanResult.content}`;
  
  navigator.clipboard.writeText(dummyText).then(() => {
    showToast('Report brief copied to clipboard. Ready to share!');
  });
}

// Custom magnetic tilt & cursor adjustments on hovering
function initHoverEffects() {
  const cardElements = document.querySelectorAll('.card-hover, .btn, .nav-item');
  
  cardElements.forEach(elem => {
    elem.addEventListener('mouseenter', () => {
      elem.style.transition = 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
    });

    elem.addEventListener('mouseleave', () => {
      elem.style.transition = 'var(--transition-smooth)';
      elem.style.transform = '';
    });
  });
}
