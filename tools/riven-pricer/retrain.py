#!/usr/bin/env python3
"""
Retrain the riven pricing model from scratch.

The full training pipeline lives in tools/riven-pricer/pipeline/ so the
repo is self-contained - no external dependencies, survives a system wipe.

Usage:
    python tools/riven-pricer/retrain.py

What it does:
  1. Downloads fresh market data from Warframe Market
  2. Builds training dataframe
  3. Trains a TensorFlow price prediction model
  4. Exports to ONNX format
  5. Generates weapon ranking information (uses ONNX, no TF needed)
  6. Copies all model files into src-tauri/data/bin/pricer-models/

After retraining, commit and push to deploy to all users:
    git add src-tauri/data/bin/pricer-models/
    git commit -m "retrain pricer models"
    git push

Requires: Python 3.11 (for TensorFlow training step)
"""

import os, sys, shutil, subprocess, argparse
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
PIPELINE_DIR = REPO / "tools" / "riven-pricer" / "pipeline"
PRICER_MODELS = REPO / "src-tauri" / "data" / "bin" / "pricer-models"
VENV = REPO / "tools" / "riven-pricer" / ".venv"
PYTHON = VENV / "bin" / "python3"


def find_python311():
    """Return a Python 3.11 interpreter (TensorFlow needs 3.11; the system
    default may be newer). Prefers an explicit python3.11 on PATH."""
    for cand in ("python3.11", "python3.12"):
        p = shutil.which(cand)
        if p:
            return p
    if sys.version_info >= (3, 11):
        return sys.executable
    sys.exit("No Python 3.11+ interpreter found (tried python3.11, python3.12)")

MODEL_FILES = [
    "price_model.onnx",
    "price_model.h5",
    "price_preprocessor.pkl",
    "weapon_vocab.json",
    "attr_vocab.json",
    "effect_to_url_name.json",
    "items_data.json",
    "attribute_name_shortcuts.json",
    "weapon_ranking_information.json",
    "global_price_freq.json",
]


def run_py(script, cwd=None, args=None):
    cmd = [str(PYTHON), "-u", str(script)] + (args or [])
    print(f"\n── Running: {script.name} {(' '.join(args) if args else '')}──")
    proc = subprocess.Popen(cmd, cwd=cwd or script.parent, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    for line in proc.stdout:
        print(f"  {line}", end="")
    stderr = proc.stderr.read()
    proc.wait()
    if proc.returncode != 0:
        print(stderr)
        print(f"ERROR: {script.name} failed (exit {proc.returncode})")
        sys.exit(1)
    return proc


def ensure_venv(pipeline_dir: Path):
    if not VENV.exists():
        base_python = find_python311()
        print(f"\n── Setting up Python 3.11 venv at {VENV} (base: {base_python}) ──")
        subprocess.run([base_python, "-m", "venv", str(VENV)], check=True)
        subprocess.run(
            [str(PYTHON), "-m", "pip", "install", "--upgrade", "pip"],
            check=True,
        )
        subprocess.run(
            [str(PYTHON), "-m", "pip", "install",
             "tensorflow", "pandas", "scikit-learn", "tqdm",
             "tf2onnx", "onnxruntime", "prettytable"],
            check=True,
        )
    # Always (re)install the project package itself, so edits to
    # pipeline code / setup.py are picked up even if the venv pre-exists.
    # Without this, pipeline scripts fail with ModuleNotFoundError.
    subprocess.run(
        [str(PYTHON), "-m", "pip", "install", "-e", "."],
        cwd=pipeline_dir,
        check=True,
    )


def retrain():
    parser = argparse.ArgumentParser(
        formatter_class=argparse.RawDescriptionHelpFormatter,
        description=__doc__,
    )
    parser.add_argument(
        "--pipeline", "-p",
        default=None,
        help="Override pipeline directory (default: tools/riven-pricer/pipeline/)",
    )
    args = parser.parse_args()

    pipeline_dir = Path(args.pipeline).resolve() if args.pipeline else PIPELINE_DIR
    if not pipeline_dir.exists():
        sys.exit(f"Pipeline not found at {pipeline_dir}")

    print("═" * 50)
    print("Riven Pricer - Full Retrain")
    print("═" * 50)
    print(f"Pipeline: {pipeline_dir}")

    ensure_venv(pipeline_dir)
    run_py(pipeline_dir / "tool_setup_and_maintenance" / "download_data.py", cwd=pipeline_dir)
    run_py(pipeline_dir / "tool_setup_and_maintenance" / "create_marketplace_dataframe.py", cwd=pipeline_dir)
    run_py(pipeline_dir / "training" / "trainers" / "train_price_model.py", cwd=pipeline_dir)
    run_py(pipeline_dir / "training" / "export_to_onnx.py", cwd=pipeline_dir)
    run_py(REPO / "tools" / "riven-pricer" / "setup_weapon_information_onnx.py",
           args=["--data-dir", str(pipeline_dir)])

    src_dir = pipeline_dir / "training" / "model_data"
    data_dir = pipeline_dir / "data_files"
    PRICER_MODELS.mkdir(parents=True, exist_ok=True)

    for fname in MODEL_FILES:
        src = (src_dir if (src_dir / fname).exists() else data_dir) / fname
        if src.exists():
            shutil.copy2(src, PRICER_MODELS / fname)
            print(f"  Copied {fname}")
        else:
            print(f"  WARNING: {fname} not found")

    print(f"\nDone. Model files in {PRICER_MODELS}")
    print("Next step: commit and push:")
    print(f"  git add {PRICER_MODELS.relative_to(REPO)}/")
    print(f"  git commit -m 'retrain pricer models'")
    print(f"  git push")


if __name__ == "__main__":
    retrain()
