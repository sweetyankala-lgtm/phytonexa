#!/usr/bin/env python3
"""Download the PlantVillage Keras model from Hugging Face at Render build time."""

import os
import shutil
import pathlib

from huggingface_hub import hf_hub_download

REPO_ID = "rn-12-19/plant-disease-model-v5"
MODEL_FILENAME = "phase2_epoch_025.keras"
MODEL_DIR = pathlib.Path("model")
TARGET_PATH = MODEL_DIR / "model.keras"

def main():
    MODEL_DIR.mkdir(exist_ok=True)

    # HF_TOKEN is read automatically by huggingface_hub from the environment
    token = os.environ.get("HF_TOKEN")

    print(f"Downloading {REPO_ID}/{MODEL_FILENAME} ...")
    cached_path = hf_hub_download(
        repo_id=REPO_ID,
        filename=MODEL_FILENAME,
        token=token,
    )
    shutil.copy(cached_path, TARGET_PATH)
    print(f"Model saved to {TARGET_PATH} ({TARGET_PATH.stat().st_size / 1e6:.1f} MB)")

    # Verify class_names.json exists (shipped in the repo)
    labels_path = MODEL_DIR / "class_names.json"
    if labels_path.is_file():
        print(f"class_names.json found at {labels_path}")
    else:
        print("WARNING: class_names.json is missing from model/ — predictions will fail!")

if __name__ == "__main__":
    main()
