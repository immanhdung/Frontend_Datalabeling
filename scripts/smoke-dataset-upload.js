import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import os from "os";
import path from "path";

const API_BASE = process.env.API_BASE || "https://labelhub-backend.onrender.com/api";
const USERNAME = process.env.SMOKE_USERNAME || "manager1";
const PASSWORD = process.env.SMOKE_PASSWORD || "password12345";

async function login() {
  const body = { usernameOrEmail: USERNAME, password: PASSWORD };
  const { data } = await axios.post(`${API_BASE}/auth/login`, body, {
    headers: { "Content-Type": "application/json" },
  });

  const token = data?.token || data?.accessToken || data?.jwt || data?.jwtToken;
  if (!token) {
    throw new Error("Login succeeded but no token was returned");
  }
  return token;
}

function buildTempImageFile() {
  const fileName = `smoke_${Date.now()}.png`;
  const filePath = path.join(os.tmpdir(), fileName);

  // 1x1 transparent PNG
  const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9y6vJQAAAABJRU5ErkJggg==";
  fs.writeFileSync(filePath, Buffer.from(pngBase64, "base64"));

  return filePath;
}

async function createDataset(authHeader) {
  const name = `copilot_smoke_upload_${Date.now()}`;
  const { data } = await axios.post(
    `${API_BASE}/datasets`,
    { name },
    { headers: { ...authHeader, "Content-Type": "application/json" } }
  );

  const datasetId = data?.id || data?.datasetId;
  if (!datasetId) {
    throw new Error("Create dataset response does not contain id");
  }
  return { datasetId, name };
}

async function uploadItem(authHeader, datasetId, filePath) {
  const form = new FormData();
  form.append("File", fs.createReadStream(filePath));
  form.append("Name", path.basename(filePath));

  const response = await axios.post(`${API_BASE}/datasets/${datasetId}/items`, form, {
    headers: { ...authHeader, ...form.getHeaders() },
    maxBodyLength: Infinity,
  });

  return response.status;
}

async function deleteDataset(authHeader, datasetId) {
  const response = await axios.delete(`${API_BASE}/datasets/${datasetId}`, {
    headers: authHeader,
  });
  return response.status;
}

async function main() {
  let datasetId = null;
  let tempFilePath = null;

  try {
    const token = await login();
    const authHeader = { Authorization: `Bearer ${token}` };
    console.log("LOGIN_OK");

    const created = await createDataset(authHeader);
    datasetId = created.datasetId;
    console.log(`CREATE_OK name=${created.name} id=${datasetId}`);

    tempFilePath = buildTempImageFile();
    const uploadStatus = await uploadItem(authHeader, datasetId, tempFilePath);
    console.log(`UPLOAD_OK status=${uploadStatus}`);
  } catch (err) {
    const status = err?.response?.status;
    const payload = err?.response?.data;
    const message = payload?.message || err?.message || "Unknown error";
    console.error(`SMOKE_FAIL status=${status || "n/a"} message=${message}`);
    if (payload) {
      console.error(`SMOKE_FAIL_BODY=${JSON.stringify(payload)}`);
    }
    process.exitCode = 1;
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    if (datasetId) {
      try {
        const token = await login();
        const authHeader = { Authorization: `Bearer ${token}` };
        const deleteStatus = await deleteDataset(authHeader, datasetId);
        console.log(`DELETE_OK status=${deleteStatus}`);
      } catch (cleanupErr) {
        const msg = cleanupErr?.response?.data?.message || cleanupErr?.message || "Unknown cleanup error";
        console.error(`DELETE_FAIL message=${msg}`);
      }
    }
  }
}

main();
