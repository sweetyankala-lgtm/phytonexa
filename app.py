"""AgroVision AI – Flask API for plant disease detection."""

import io
import json
import logging
from pathlib import Path

from flask import Flask, jsonify, render_template, request
from PIL import Image, UnidentifiedImageError
from werkzeug.exceptions import RequestEntityTooLarge

from ai.predictor import (
    ModelUnavailableError,
    PredictionError,
    get_model_config,
    normalize_class_name,
    predict_image,
)


BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model"
DATA_DIR = BASE_DIR / "data"
MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_IMAGE_BYTES + 1024 * 1024


def load_disease_guides():
    """Load the full 38-class disease information database from JSON."""
    guides_path = DATA_DIR / "disease_info.json"
    try:
        with guides_path.open("r", encoding="utf-8") as f:
            raw = json.load(f)
        # Re-key by normalized class name so lookups match predictor output
        guides = {}
        for label, info in raw.items():
            key = normalize_class_name(label)
            guides[key] = {
                "original_label": label,
                "name": info.get("disease", "Unknown"),
                "crop": info.get("crop", "Unknown"),
                "health_status": info.get("health_status", "unknown"),
                "description": info.get("description", ""),
                "symptoms": info.get("symptoms", []),
                "prevention": info.get("prevention", []),
                "management": info.get("management", ""),
            }
        return guides
    except (OSError, json.JSONDecodeError) as error:
        logger.warning("Could not load disease_info.json: %s", error)
        return {}


DISEASE_GUIDES = load_disease_guides()
logger.info("Loaded %d disease guides from disease_info.json", len(DISEASE_GUIDES))


def json_error(message, status_code):
    """Return one consistent JSON shape for API errors."""
    return jsonify({"error": message}), status_code


def get_model_status():
    """Return model metadata if the model and its labels are installed."""
    try:
        return get_model_config(MODEL_DIR), None
    except ModelUnavailableError as error:
        return None, str(error)


@app.get("/")
def home():
    """Render the browser-based crop health checker."""
    return render_template("index.html")


@app.get("/api/health")
def health():
    """Report whether the API can find its local model files."""
    config, model_error = get_model_status()
    return jsonify(
        {
            "status": "ok",
            "model_available": config is not None,
            "model_error": model_error,
            "num_classes": len(config["class_names"]) if config else 0,
            "num_disease_guides": len(DISEASE_GUIDES),
        }
    )


@app.get("/api/diseases")
def diseases():
    """List all disease guides keyed to the model's class labels."""
    config, model_error = get_model_status()
    if config is None:
        return jsonify(
            {
                "model_available": False,
                "diseases": [],
                "message": model_error,
            }
        )

    guides = []
    seen = set()
    for label in config["class_names"]:
        key = normalize_class_name(label)
        if key not in seen:
            guide = DISEASE_GUIDES.get(key)
            if guide:
                guides.append({"class_name": label, "class_key": key, **guide})
            else:
                guides.append({
                    "class_name": label,
                    "class_key": key,
                    "name": label.replace("___", " – ").replace("_", " "),
                    "crop": label.split("___")[0].replace("_", " ") if "___" in label else "Unknown",
                    "health_status": "healthy" if "healthy" in label.lower() else "diseased",
                    "description": "",
                    "symptoms": [],
                    "prevention": [],
                    "management": "",
                })
            seen.add(key)

    return jsonify({"model_available": True, "total": len(guides), "diseases": guides})


@app.post("/api/predict")
def predict():
    """Validate an image and ask the local Keras model for a prediction."""
    uploaded_file = request.files.get("image")
    if uploaded_file is None or not uploaded_file.filename:
        return json_error("Send an image using the multipart form field named 'image'.", 400)

    image_bytes = uploaded_file.stream.read(MAX_IMAGE_BYTES + 1)
    if len(image_bytes) > MAX_IMAGE_BYTES:
        return json_error("Image is larger than 8 MB. Choose a smaller image.", 413)

    try:
        with Image.open(io.BytesIO(image_bytes)) as image:
            if image.format not in {"JPEG", "PNG", "WEBP"}:
                return json_error("Unsupported image format. Use a JPG, JPEG, PNG, or WEBP image.", 400)
            if image.width * image.height > MAX_IMAGE_PIXELS:
                return json_error("Image has too many pixels. Choose an image under 20 megapixels.", 400)
            image.verify()
        with Image.open(io.BytesIO(image_bytes)) as image:
            leaf_image = image.convert("RGB")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        return json_error("The uploaded file is not a readable image.", 400)

    try:
        result = predict_image(leaf_image, MODEL_DIR)
    except ModelUnavailableError as error:
        return json_error(str(error), 503)
    except PredictionError as error:
        return json_error(str(error), 422)

    guide = None if result["uncertain"] else DISEASE_GUIDES.get(result["class_key"])
    return jsonify(
        {
            "prediction": result,
            "guide": guide,
            "disclaimer": (
                "AI scores are estimates only, not a guaranteed diagnosis. "
                "Always confirm with a qualified agricultural expert."
            ),
        }
    )


@app.errorhandler(RequestEntityTooLarge)
def request_too_large(_error):
    """Keep Flask's request-size error response in the API's JSON format."""
    return json_error("Request is too large. Image files must be 8 MB or smaller.", 413)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
