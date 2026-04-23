# YOLO Model

The YOLOv8n ONNX model is required for server-side product detection.

## Setup

Run from project root:

  python -c "from ultralytics import YOLO; YOLO('yolov8n.pt').export(format='onnx'); import shutil; shutil.move('yolov8n.onnx', 'models/yolov8n.onnx')"

This requires: pip install ultralytics

The model file (~12MB) is excluded from git via .gitignore.
