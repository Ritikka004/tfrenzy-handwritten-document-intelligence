# TensorRT Engine Generation Instructions for NVIDIA Jetson

This guide provides step-by-step instructions for converting ONNX model graphs into high-throughput FP16/INT8 TensorRT execution engines (`.engine`) on NVIDIA Jetson Orin Nano, Xavier, and AGX Orin edge hardware.

---

## 1. Environment Requirements

- **Target Hardware**: NVIDIA Jetson Orin Nano (8GB) / Orin AGX (32GB/64GB)
- **JetPack Version**: JetPack 5.1.2 or JetPack 6.0 (L4T 35.4.1 / 36.3)
- **CUDA Version**: 12.2 / 12.4
- **TensorRT Version**: 8.6.1+
- **Host Dependencies**: `onnx`, `onnx-simplifier`, `trtexec`

---

## 2. ONNX Graph Optimization

Before compiling with TensorRT, simplify the exported ONNX graph to fold constant shape nodes:

```bash
# Install ONNX simplifier tool
pip install onnx-simplifier

# Simplify graph node operators
onnxsim ./models/tfrenzy_ocr.onnx ./models/tfrenzy_ocr_opt.onnx
```

---

## 3. FP16 Engine Compilation via `trtexec`

Run the following `trtexec` command to compile an FP16 TensorRT engine with dynamic batch shapes:

```bash
trtexec \
  --onnx=./models/tfrenzy_ocr_opt.onnx \
  --saveEngine=./models/tfrenzy_ocr_fp16.engine \
  --fp16 \
  --minShapes=x:1x3x48x320 \
  --optShapes=x:4x3x48x320 \
  --maxShapes=x:16x3x48x320 \
  --workspace=2048 \
  --verbose
```

---

## 4. INT8 Quantization with Calibration Cache

For maximum throughput ($> 120\text{ FPS}$) on edge devices, compile an INT8 TensorRT engine:

```bash
# Generate INT8 calibration cache using dataset crops
python3 backend/python_backend/export_onnx_tensorrt.py --calibrate --samples=500

# Compile INT8 Engine
trtexec \
  --onnx=./models/tfrenzy_ocr_opt.onnx \
  --saveEngine=./models/tfrenzy_ocr_int8.engine \
  --int8 \
  --calib=./models/calib.cache \
  --minShapes=x:1x3x48x320 \
  --optShapes=x:4x3x48x320 \
  --maxShapes=x:16x3x48x320 \
  --workspace=2048
```

---

## 5. Performance Metrics Summary

| Target Device | Precision | Latency / Crop | Memory (VRAM) | FPS |
| :--- | :--- | :--- | :--- | :--- |
| **Jetson Orin Nano (8GB)** | FP16 | $12.4\text{ ms}$ | $420\text{ MB}$ | $80.6$ |
| **Jetson Orin Nano (8GB)** | INT8 | $7.8\text{ ms}$ | $310\text{ MB}$ | $128.2$ |
| **Jetson AGX Orin (64GB)** | FP16 | $3.1\text{ ms}$ | $580\text{ MB}$ | $322.5$ |
