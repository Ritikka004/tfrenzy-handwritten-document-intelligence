# Jetson Installation and Startup Service Guide

This document covers step-by-step installation, hardware configuration, Docker deployment, and Systemd service registration for deploying the TFrenzy Handwritten Document Intelligence Platform on NVIDIA Jetson edge hardware.

---

## 1. Hardware & OS Flashing

1. **Flash Jetson Hardware**:
   - Use NVIDIA SDK Manager to flash JetPack 5.1.2 or JetPack 6.0 onto NVIDIA Jetson Orin Nano (NVMe SSD minimum 128GB recommended).
2. **Enable High Performance Mode**:
   ```bash
   # Set power mode to MaxN (Uncapped Wattage)
   sudo nvpmodel -m 0
   
   # Enable maximum clock speeds
   sudo jetson_clocks
   ```

---

## 2. Dependencies Installation

Install System libraries and NVIDIA Container Toolkit:

```bash
# Update Apt Repositories
sudo apt-get update && sudo apt-get install -y \
  build-essential \
  cmake \
  git \
  curl \
  libopencv-dev \
  python3-opencv \
  tesseract-ocr

# Verify NVIDIA GPU Container Toolkit
nvidia-smi
docker run --rm --runtime nvidia nvidia/cuda:12.2.0-base-ubuntu22.04 nvidia-smi
```

---

## 3. Deployment Directory Setup

```bash
sudo mkdir -p /opt/tfrenzy
sudo chown -R $USER:$USER /opt/tfrenzy

cd /opt/tfrenzy
git clone https://github.com/tfrenzy/tfrenzy-handwritten-document-intelligence-platform.git .

# Install Bun / Node runtime
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

bun install
```

---

## 4. Registering Systemd Startup Service

1. Copy service configuration to system directory:
   ```bash
   sudo cp systemd/jetson-ocr.service /etc/systemd/system/jetson-ocr.service
   sudo chmod 644 /etc/systemd/system/jetson-ocr.service
   ```

2. Reload systemd daemon and enable service at boot:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable jetson-ocr.service
   sudo systemctl start jetson-ocr.service
   ```

3. Verify service status and view live startup logs:
   ```bash
   sudo systemctl status jetson-ocr.service
   sudo journalctl -u jetson-ocr.service -f --output=cat
   ```

---

## 5. Troubleshooting & Health Verification

- **Check API Endpoint**: `curl http://localhost:3000/api/dashboard/metrics`
- **Check Thermal Temperatures**: `sudo tegrastats`
- **Check GPU Memory**: `nvidia-smi`
