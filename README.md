# 🌿 AgroVision AI — Plant Disease Detection

[![Live Demo](https://img.shields.io/badge/Live-phytonexa.onrender.com-brightgreen?style=for-the-badge)](https://phytonexa.onrender.com)
[![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python)](https://python.org)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.16-orange?style=flat-square&logo=tensorflow)](https://tensorflow.org)
[![Flask](https://img.shields.io/badge/Flask-3.x-lightgrey?style=flat-square&logo=flask)](https://flask.palletsprojects.com)
[![Accuracy](https://img.shields.io/badge/Accuracy-99.49%25-success?style=flat-square)](https://huggingface.co/rn-12-19/plant-disease-model-v5)

**AI-powered plant disease detection** using a **ResNet50** deep learning model trained on the **PlantVillage dataset** (87,000+ images). Upload a leaf photo and get an instant diagnosis with symptoms, prevention, and management guidance.

---

## ✨ Features

- 🔬 **38 Disease Classes** across **14 crop types** — from Apple Scab to Tomato Mosaic Virus
- 🎯 **99.49% Validation Accuracy** — ResNet50 transfer learning on PlantVillage
- 📷 **Drag-and-Drop Upload** — JPG, PNG, or WEBP up to 8 MB
- 📊 **Detailed Diagnosis** — confidence scores, symptoms, prevention, management
- 🌙 **Premium Dark Mode UI** — glassmorphism, micro-animations, responsive design
- 🚀 **One-Click Cloud Deploy** — Render with auto model download from HuggingFace
- 🔒 **Privacy-First** — images are analyzed in memory, never stored

---

## 🏗️ Architecture

```
User's Browser ──► Flask + Gunicorn ──► ResNet50 (Keras) ──► 38-class prediction
     │                    │                    │
 index.html          app.py            model/model.keras (33 MB)
 styles.css      ai/predictor.py       model/class_names.json
   app.js       data/disease_info.json
```

---

## 🌱 Supported Crops & Diseases

| Crop | Diseases Detected |
|------|-------------------|
| 🍎 Apple | Apple Scab, Black Rot, Cedar Apple Rust, Healthy |
| 🫐 Blueberry | Healthy |
| 🍒 Cherry | Powdery Mildew, Healthy |
| 🌽 Corn (Maize) | Gray Leaf Spot, Common Rust, Northern Leaf Blight, Healthy |
| 🍇 Grape | Black Rot, Esca (Black Measles), Leaf Blight, Healthy |
| 🍊 Orange | Huanglongbing (Citrus Greening) |
| 🍑 Peach | Bacterial Spot, Healthy |
| 🫑 Bell Pepper | Bacterial Spot, Healthy |
| 🥔 Potato | Early Blight, Late Blight, Healthy |
| 🫐 Raspberry | Healthy |
| 🫘 Soybean | Healthy |
| 🎃 Squash | Powdery Mildew |
| 🍓 Strawberry | Leaf Scorch, Healthy |
| 🍅 Tomato | Bacterial Spot, Early Blight, Late Blight, Leaf Mold, Septoria Leaf Spot, Spider Mites, Target Spot, TYLCV, Mosaic Virus, Healthy |

**Total: 38 classes = 26 diseases + 12 healthy states**

---

## 🚀 Quick Start

### Local Development
```bash
# Clone the repository
git clone https://github.com/sweetyankala-lgtm/phytonexa.git
cd phytonexa

# Install dependencies (includes TensorFlow)
pip install -r requirements-model.txt

# Download the model from HuggingFace
python3 download_model.py

# Start the server
gunicorn --bind 0.0.0.0:5000 --workers 1 --timeout 120 app:app
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

### Deploy to Render
1. Fork this repo
2. Create a new Web Service on [render.com](https://render.com)
3. Connect your GitHub repo
4. Add environment variable: `HF_TOKEN` = your HuggingFace token
5. Render reads `render.yaml` automatically — deploy!

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Web interface |
| `/api/health` | GET | Model status and class count |
| `/api/diseases` | GET | Full disease database (38 entries) |
| `/api/predict` | POST | Upload image → get AI diagnosis |

### Example: Predict
```bash
curl -X POST -F "image=@leaf_photo.jpg" https://phytonexa.onrender.com/api/predict
```

---

## 🧠 Model Details

| Property | Value |
|----------|-------|
| Architecture | ResNet50 (Transfer Learning) |
| Dataset | PlantVillage (87,000+ images) |
| Validation Accuracy | 99.49% |
| Input Size | 224 × 224 × 3 (RGB) |
| Output | 38-class softmax probabilities |
| File Size | 33 MB (.keras) |
| Source | [HuggingFace](https://huggingface.co/rn-12-19/plant-disease-model-v5) |

---

## 📁 Project Structure

```
├── app.py                  # Flask API (routes + endpoints)
├── download_model.py       # HuggingFace model download script
├── requirements.txt        # Core dependencies
├── requirements-model.txt  # Full dependencies (+ TensorFlow)
├── render.yaml             # Render deployment config
├── ai/predictor.py         # AI inference pipeline
├── model/                  # Model checkpoint + class labels
├── data/disease_info.json  # 38-entry disease database
├── templates/index.html    # Web UI template
├── static/styles.css       # Dark-mode stylesheet
└── static/app.js           # Frontend JavaScript
```

---

## 📚 References

1. Hughes & Salathé (2015). *An open access repository of images on plant health*. arXiv:1511.08060
2. He et al. (2016). *Deep Residual Learning for Image Recognition*. CVPR 2016
3. [PlantVillage Dataset](https://plantvillage.psu.edu/)
4. [HuggingFace Model](https://huggingface.co/rn-12-19/plant-disease-model-v5)

---

> ⚠️ **Disclaimer**: AgroVision AI provides general information only. Always consult a qualified agricultural expert before taking action.
