/* AgroVision AI — Frontend Logic */
'use strict';

// ── DOM refs ──────────────────────────────────────────────
const fileInput      = document.getElementById('leaf-upload');
const dropZone       = document.getElementById('drop-zone');
const dropIdle       = document.getElementById('drop-idle');
const dropPreview    = document.getElementById('drop-preview');
const imagePreview   = document.getElementById('image-preview');
const fileName       = document.getElementById('file-name');
const analyzeBtn     = document.getElementById('analyze-button');
const buttonLabel    = document.getElementById('button-label');
const btnSpinner     = document.getElementById('btn-spinner');
const formMessage    = document.getElementById('form-message');
const resultCard     = document.getElementById('result-card');
const resultsEmpty   = document.getElementById('results-empty');
const diseaseGrid    = document.getElementById('disease-grid');

let selectedFile = null;

// ── File handling ─────────────────────────────────────────
function showFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showMessage('Please choose a valid image file (JPG, PNG, or WEBP).', 'error');
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    showMessage('Image is larger than 8 MB. Please choose a smaller file.', 'error');
    return;
  }
  selectedFile = file;
  hideMessage();

  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.src = e.target.result;
    fileName.textContent = file.name;
    dropIdle.hidden = true;
    dropPreview.hidden = false;
    analyzeBtn.disabled = false;
    buttonLabel.textContent = 'Analyze this leaf';
  };
  reader.readAsDataURL(file);
}

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) showFile(e.target.files[0]);
});

// Drag & drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) showFile(file);
});

// Keyboard accessibility
dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});

// ── UI helpers ────────────────────────────────────────────
function showMessage(text, type = 'info') {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;
  formMessage.hidden = false;
}
function hideMessage() {
  formMessage.hidden = true;
  formMessage.textContent = '';
}

function setLoading(loading) {
  analyzeBtn.disabled = loading;
  if (loading) {
    buttonLabel.textContent = 'Analyzing…';
    btnSpinner.hidden = false;
    analyzeBtn.querySelector('.btn-analyze-icon').hidden = true;
  } else {
    buttonLabel.textContent = 'Analyze this leaf';
    btnSpinner.hidden = true;
    analyzeBtn.querySelector('.btn-analyze-icon').hidden = false;
  }
}

// ── Prediction ────────────────────────────────────────────
analyzeBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  setLoading(true);
  hideMessage();
  resultCard.hidden = true;
  resultsEmpty.hidden = true;

  const formData = new FormData();
  formData.append('image', selectedFile);

  try {
    const res = await fetch('/api/predict', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Server error (${res.status})`);
    }
    renderResult(data);
    resultCard.hidden = false;
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    showMessage(`Analysis failed: ${err.message}`, 'error');
    resultsEmpty.hidden = false;
  } finally {
    setLoading(false);
  }
});

// ── Render Results ────────────────────────────────────────
function renderResult(data) {
  const { prediction, guide, disclaimer } = data;
  const { class_name, confidence_percent, classification, uncertain } = prediction;

  const isHealthy  = classification === 'healthy';
  const isUncertain = classification === 'uncertain' || uncertain;

  const statusClass = isUncertain ? 'uncertain' : isHealthy ? 'healthy' : 'diseased';
  const statusEmoji = isUncertain ? '❓' : isHealthy ? '✅' : '⚠️';
  const statusLabel = isUncertain ? 'Uncertain — Low Confidence'
                    : isHealthy  ? 'Appears Healthy'
                    : 'Disease Detected';

  const barClass    = isUncertain ? 'warning' : isHealthy ? '' : 'danger';
  const displayName = guide ? (isHealthy ? `${guide.crop} — Healthy` : `${guide.crop} — ${guide.name}`) : formatLabel(class_name);

  let html = `
    <div class="result-header">
      <div class="result-status-icon ${statusClass}">${statusEmoji}</div>
      <div>
        <div class="result-title">${escHtml(displayName)}</div>
        <div class="result-subtitle">${escHtml(statusLabel)}</div>
      </div>
    </div>

    <div class="confidence-bar-wrap">
      <div class="confidence-label">
        <span>Confidence</span>
        <span>${confidence_percent}%</span>
      </div>
      <div class="confidence-bar">
        <div class="confidence-fill ${barClass}" style="width: 0%" data-target="${confidence_percent}"></div>
      </div>
    </div>`;

  if (isUncertain) {
    html += `
      <div class="result-section">
        <div class="result-section-title">Result</div>
        <p>The AI model could not make a confident prediction from this image. 
        Please try a clearer, closer photo with good lighting focused on a single leaf.</p>
      </div>`;
  } else if (guide) {
    if (guide.description) {
      html += `
        <div class="result-section">
          <div class="result-section-title">About this ${isHealthy ? 'plant' : 'disease'}</div>
          <p>${escHtml(guide.description)}</p>
        </div>`;
    }
    if (guide.symptoms && guide.symptoms.length) {
      html += `
        <div class="result-section">
          <div class="result-section-title">${isHealthy ? 'Observations' : 'Symptoms'}</div>
          <ul>${guide.symptoms.map(s => `<li>${escHtml(s)}</li>`).join('')}</ul>
        </div>`;
    }
    if (!isHealthy && guide.prevention && guide.prevention.length) {
      html += `
        <div class="result-section">
          <div class="result-section-title">Prevention</div>
          <ul>${guide.prevention.map(p => `<li>${escHtml(p)}</li>`).join('')}</ul>
        </div>`;
    }
    if (guide.management) {
      html += `
        <div class="result-section">
          <div class="result-section-title">Next Steps</div>
          <p>${escHtml(guide.management)}</p>
        </div>`;
    }
    const tags = [guide.crop, isHealthy ? 'Healthy' : guide.name].filter(Boolean);
    html += `<div class="result-tags">${tags.map(t => `<span class="result-tag">${escHtml(t)}</span>`).join('')}</div>`;
  } else {
    html += `
      <div class="result-section">
        <div class="result-section-title">Classification</div>
        <p>${escHtml(formatLabel(class_name))}</p>
      </div>`;
  }

  if (disclaimer) {
    html += `<div class="result-disclaimer">⚠️ ${escHtml(disclaimer)}</div>`;
  }

  resultCard.innerHTML = html;

  // Animate confidence bar
  requestAnimationFrame(() => {
    const fill = resultCard.querySelector('.confidence-fill');
    if (fill) fill.style.width = fill.dataset.target + '%';
  });
}

function formatLabel(label) {
  return label.replace(/___/g, ' — ').replace(/_/g, ' ');
}
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ── Disease Grid ──────────────────────────────────────────
async function loadDiseaseGrid() {
  if (!diseaseGrid) return;
  try {
    const res = await fetch('/api/diseases');
    const data = await res.json();
    if (!data.model_available) {
      diseaseGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted)">
        <p>Disease database unavailable: ${escHtml(data.message || 'Model not loaded')}</p></div>`;
      return;
    }
    const cards = data.diseases.map(d => {
      const isHealthy = d.health_status === 'healthy';
      const name = isHealthy ? `${d.crop} — Healthy` : d.name || formatLabel(d.class_name);
      const desc = d.description ? d.description.slice(0, 160) + (d.description.length > 160 ? '…' : '') : '';
      return `
        <div class="disease-card">
          <div class="disease-card-header">
            <span class="disease-badge ${isHealthy ? 'healthy' : 'diseased'}">${isHealthy ? '✓ Healthy' : '⚠ Disease'}</span>
            <span class="disease-crop">${escHtml(d.crop)}</span>
          </div>
          <div class="disease-name">${escHtml(name)}</div>
          ${desc ? `<div class="disease-desc">${escHtml(desc)}</div>` : ''}
        </div>`;
    }).join('');
    diseaseGrid.innerHTML = cards;
  } catch (err) {
    diseaseGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--danger)">
      Failed to load disease database.</div>`;
  }
}

// Load disease grid on page load
document.addEventListener('DOMContentLoaded', loadDiseaseGrid);
