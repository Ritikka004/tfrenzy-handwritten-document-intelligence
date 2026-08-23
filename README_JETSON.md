# Handwritten Document Intelligence & Validation Platform

## Purpose

This guide describes how to run the current TFrenzy handwritten-document application on an NVIDIA Jetson Orin Nano for an on-device demonstration or validation session. The application serves a React/Vite frontend from an Express server, stores operational data in PostgreSQL, and uses a hybrid OCR path: local TrOCR through a persistent Python worker with Tesseract.js fallback.

This guide documents the repository as it currently exists. It does not change the application, OCR model, dependencies, or deployment configuration.

## Target Environment

- NVIDIA Jetson Orin Nano
- JetPack 6.2
- Ubuntu 22.04
- Linux ARM64/aarch64

The repository contains older Jetson notes mentioning other JetPack releases. Verify JetPack 6.2 compatibility for every native Python, PyTorch, and Node package on the target device before the demonstration.

## Prerequisites

Install or provide these before setup:

- Git, to clone the repository.
- Node.js `20.10.0`, matching the repository `.nvmrc`.
- npm, for the commands defined in `package.json` and the checked-in `package-lock.json`.
- Python 3, because the default `trocr` OCR provider starts `backend/python_backend/trocr_worker.py`.
- A Python environment containing the packages listed in `backend/python_backend/requirements-trocr.txt`.
- PostgreSQL. Production startup refuses to run without a successful PostgreSQL connection.
- Network access on the first TrOCR run so Hugging Face can download the configured model, unless the model is already present in the Hugging Face cache.
- Sufficient storage and RAM for Node, PostgreSQL, Python/PyTorch, the model cache, uploaded files, and OCR processing.

`backend/requirements.txt` is empty. The Python OCR dependencies are defined separately in `backend/python_backend/requirements-trocr.txt`.

Docker is present in `docker-compose.yml` and can provide PostgreSQL and Redis for a demo, but the compose `app` service references a `Dockerfile` that is not present in the repository. Do not use the compose `app` service unless that missing file and its ARM64 compatibility have been verified in the deployment environment.

## Environment Verification

Run these safe checks on the Jetson:

```bash
cat /etc/os-release
uname -m
python3 --version
node --version
npm --version
```

For JetPack/L4T:

```bash
cat /etc/nv_tegra_release
```

The target should report Ubuntu 22.04 and `aarch64`. Verify the reported L4T release corresponds to JetPack 6.2 in the installed NVIDIA documentation or SDK Manager; the repository does not contain a command that independently maps L4T to JetPack.

For Jetson GPU visibility and runtime monitoring:

```bash
command -v tegrastats
tegrastats --interval 1000
```

Stop `tegrastats` with `Ctrl+C`. `nvidia-smi` is not a reliable availability check on every Jetson image; use the NVIDIA tools installed by the target JetPack image and verify the result in that environment.

## Repository Setup

Clone the required branch exactly:

```bash
git clone --branch development --single-branch https://github.com/Ritikka004/tfrenzy-handwritten-document-intelligence.git
git -C tfrenzy-handwritten-document-intelligence branch --show-current
cd tfrenzy-handwritten-document-intelligence
```

The branch check should print `development`.

## Node.js Dependencies

Use the checked-in npm lockfile:

```bash
npm install
```

The repository also contains `bun.lock`, but the active `package.json` scripts and the project README use npm. Use npm for this guide so installation follows `package-lock.json`.

## Python OCR Dependencies

Create and activate an isolated Python environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
```

The repository explicitly states that PyTorch selection is platform-specific on Jetson. Verify and install a JetPack 6.2/ARM64-compatible PyTorch wheel using the NVIDIA-supported instructions for the target image before installing the remaining project requirements. The repository does not specify a Jetson PyTorch wheel URL or command, so that value must be verified in the project/environment before deployment.

Then install the checked-in TrOCR requirements:

```bash
python -m pip install -r backend/python_backend/requirements-trocr.txt
```

That file lists `transformers>=5.0.0`, `torch>=2.0.0`, `pillow>=10.0.0`, and `safetensors>=0.4.0`. Confirm that the installed versions have ARM64 wheels and are compatible with JetPack 6.2 before processing documents.

## PostgreSQL

The Node server uses `DATABASE_URL` when it is set. Otherwise it uses `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`. Production startup fails if PostgreSQL cannot be initialized.

For a local/demo PostgreSQL container, the repository includes this service:

```bash
docker compose up -d postgres
```

The compose file also defines Redis, but the active server code does not require Redis to start. The compose file contains a fixed database password. Do not copy that password into deployment documentation or production configuration. Verify the actual database credentials in the project/environment and set matching values in `.env` before deployment.

If PostgreSQL is managed outside Docker, verify that the configured host, port, database, user, and password are reachable from the Jetson. The database schema is initialized by the Node PostgreSQL service at startup; `docs/DATABASE_SCHEMA.sql` is also mounted by the compose PostgreSQL service for initial container setup.

## Environment Configuration

Create a local environment file from the repository template:

```bash
cp .env.example .env
```

Set values appropriate to the Jetson. Do not commit `.env` or real secrets.

Required for startup and login:

```dotenv
NODE_ENV=production
PORT=3000
JWT_SECRET_KEY=<LONG_RANDOM_SECRET>
DEMO_ADMIN_EMAIL=<DEMO_ADMIN_EMAIL>
DEMO_ADMIN_PASSWORD=<DEMO_ADMIN_PASSWORD>
```

Required for PostgreSQL when `DATABASE_URL` is not used:

```dotenv
POSTGRES_HOST=<POSTGRES_HOST>
POSTGRES_PORT=5432
POSTGRES_DB=<POSTGRES_DATABASE>
POSTGRES_USER=<POSTGRES_USER>
POSTGRES_PASSWORD=<POSTGRES_PASSWORD>
```

Alternatively, configure the direct connection string instead of the individual PostgreSQL settings:

```dotenv
DATABASE_URL=postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@<POSTGRES_HOST>:5432/<POSTGRES_DATABASE>
```

OCR settings from the current template:

```dotenv
OCR_PROVIDER=trocr
PYTHON_EXECUTABLE=<PATH_TO_PYTHON>
HANDWRITING_OCR_MODEL=microsoft/trocr-base-handwritten
```

With the virtual environment above, `PYTHON_EXECUTABLE` should resolve to the environment's Python executable. Verify this value in the project/environment before deployment; the code default is `python`, which may not select `.venv/bin/python`.

Optional/currently supported settings:

```dotenv
CORS_ORIGIN=<ALLOWED_BROWSER_ORIGIN>
DUPLICATE_SIMILARITY_THRESHOLD=0.75
```

`VITE_API_BASE_URL` is used by some frontend API helpers. For the production build served by this same Express process, leave it empty unless the frontend is intentionally hosted separately. If the frontend is hosted elsewhere, set it to the backend origin and set `CORS_ORIGIN` to the frontend origin; verify the final arrangement in the deployment environment before deployment.

## Model Setup

The default `OCR_PROVIDER=trocr` starts `backend/python_backend/trocr_worker.py` when OCR is first requested. That worker reads `HANDWRITING_OCR_MODEL`, defaulting to:

```text
microsoft/trocr-base-handwritten
```

It calls `TrOCRProcessor.from_pretrained()` and `VisionEncoderDecoderModel.from_pretrained()`. If the model is not already cached, Hugging Face downloads it on the first worker startup. Keep network access available for that first run, or pre-populate the Hugging Face cache using an approved environment procedure. The repository does not define a custom local model directory or a Jetson TensorRT engine loading path for the active server.

The checked-in `models/tfrenzy_ocr.onnx` file and older TensorRT documentation are not used by the active `TrOCRPythonService`. Do not replace the configured model or assume that the ONNX file enables GPU inference.

If TrOCR cannot start, the current Node code falls back to Tesseract.js. Tesseract.js is included in `package.json`, but this fallback does not confirm that the TrOCR model is correctly installed.

## Build and Run

Run the type check and production build using the existing scripts:

```bash
npm run lint
npm run build
```

Start the production server:

```bash
npm start
```

The server listens on `0.0.0.0` and uses `PORT`, defaulting to `3000`. The local URL is:

```text
http://<JETSON_IP>:3000
```

On the Jetson itself, use `http://localhost:3000`. The startup log prints the bound port. To check the health endpoint exposed by the current server:

```bash
curl http://localhost:3000/api/health
```

Do not use `npm run dev` for the production demonstration; it runs the Vite middleware development mode. The repository does not contain a systemd unit that matches the requested branch and environment without additional path, user, Docker, and TensorRT verification, so systemd registration is outside this confirmed procedure.

## Demonstration Test

1. Start PostgreSQL and confirm the configured database is reachable.
2. Start the application with `npm start` after `npm run build`.
3. Open `http://<JETSON_IP>:3000` from the demonstration computer.
4. Log in with the configured demo administrator account, or with a registered account stored in PostgreSQL.
5. Upload a handwritten `.png`, `.jpg`, `.jpeg`, or `.pdf` file no larger than 15 MB.
6. Run the document processing/OCR workflow.
7. Check the extracted text and confidence values.
8. Check validation and verification results; correct fields when the workflow requests human review.
9. In Export Center, test CSV, Excel/XLSX, and JSON exports if those controls are available to the logged-in role.
10. Confirm that each downloaded file opens and contains the expected processed record.

Uploaded files and OCR diagnostic crops are written below `backend/uploads` and `backend/debug-crops` at runtime. Ensure the application user can write to those directories.

## Jetson Performance Monitoring

Run monitoring in a second terminal while processing a handwritten document:

```bash
tegrastats --interval 1000
```

Observe RAM usage, CPU load, temperatures, and reported GPU activity during model loading and OCR. The active Python worker calls PyTorch inference without an explicit CUDA device transfer, so GPU utilization is not confirmed by the code. Treat any GPU usage as an environment/runtime observation, not as a documented application guarantee. Stop monitoring with `Ctrl+C`.

## Troubleshooting

### The server exits because `JWT_SECRET_KEY` is missing

Set a long random `JWT_SECRET_KEY` in `.env`, ensure the value is loaded from the application working directory, and restart the server.

### Production refuses to start because PostgreSQL is unavailable

Check `DATABASE_URL` or the individual `POSTGRES_*` values, confirm the database is listening, and verify network access and credentials. Production intentionally does not use the in-memory fallback.

### The TrOCR worker fails to start

Activate the intended virtual environment, verify `PYTHON_EXECUTABLE`, run `python -c "import torch, PIL, transformers"`, and confirm that the installed ARM64 PyTorch/Transformers versions are compatible with JetPack 6.2. Review the worker error printed by the Node process. Verify that the model can be downloaded or is already cached.

### Model loading is slow or exhausts memory

The first run downloads and loads `microsoft/trocr-base-handwritten`. Monitor with `tegrastats`, allow time for the model cache, process one document at a time for the demonstration, and close unrelated workloads. Exact memory limits and acceptable concurrency are not specified by the repository and must be measured on the target device.

### Port `3000` is occupied

Check the process using the port and either stop it or set another `PORT` in `.env`. Open the matching port in the browser. Verify any firewall or network policy before remote access.

### Browser requests fail from another machine

Use the Jetson's reachable IP address, confirm the server is listening on `0.0.0.0`, and check `CORS_ORIGIN` when a separate frontend origin is used. The production build served by the same Express server normally uses same-origin API paths.

### Uploads or debug crops cannot be written

Run the application as a user with write permission to `backend/uploads` and `backend/debug-crops`, or correct ownership/permissions for those existing directories. Do not grant broader permissions than required.

### Docker Compose does not start the application

The repository includes `docker-compose.yml` but does not include the referenced `Dockerfile`. Use the host Node/Python procedure in this guide unless the missing Dockerfile and ARM64 image compatibility have been verified in the deployment environment.

## Company Demonstration Checklist

- [ ] Jetson Orin Nano access is available.
- [ ] Ubuntu 22.04, JetPack 6.2/L4T, and `aarch64` are verified.
- [ ] Node.js `20.10.0`, npm, and Python 3 are verified.
- [ ] The `development` branch is cloned.
- [ ] Node dependencies are installed with `npm install`.
- [ ] ARM64-compatible Python TrOCR dependencies are installed.
- [ ] PostgreSQL is reachable and configuration is complete.
- [ ] `JWT_SECRET_KEY` and demo login configuration are complete.
- [ ] `microsoft/trocr-base-handwritten` is available or can be downloaded.
- [ ] `npm run lint` and `npm run build` complete successfully.
- [ ] The application starts and the URL is reachable.
- [ ] A handwritten document is processed successfully.
- [ ] Extracted text and validation/verification are tested.
- [ ] CSV, XLSX, and JSON export are tested where permitted.
- [ ] RAM, CPU, temperature, and GPU activity are checked with `tegrastats`.

## Requirements That Require Environment Verification

The repository does not confirm the following Jetson-specific values or guarantees:

- The exact JetPack 6.2-compatible PyTorch wheel and installation command.
- Whether the installed PyTorch build uses the Jetson GPU for this worker; the active code does not explicitly select CUDA.
- The final PostgreSQL host, credentials, network policy, and whether Docker or an external PostgreSQL service will be used.
- The final reachable Jetson IP address and any firewall rules.
- The memory/concurrency limits for the target Orin Nano.
- Whether all npm native dependencies, especially `sharp`, install successfully on the selected ARM64 Node runtime.
- Whether the older TensorRT, systemd, and Docker notes in the repository apply to this JetPack 6.2 deployment.

Verify these values in the project/environment before deployment.
