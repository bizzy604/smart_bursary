const axios = require("axios");
const BASE_URL = "http://localhost:3001/api/v1";
const PASSWORD = "SmartBursary@123";
const USERS = {
  OPERATOR: "platform.operator@smartbursary.dev",
  COUNTY_ADMIN: "county.admin@turkana.go.ke",
  FINANCE: "finance.officer@turkana.go.ke",
  WARD_ADMIN: "ward.admin@turkana.go.ke",
  STUDENT: "aisha.student@turkana.go.ke"
};
async function login(email) {
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, { email, password: PASSWORD });
    return res.data.token || res.data.access_token || res.data.data?.token;
  } catch (err) {
    console.log(`LOGIN ${email} FAILED status=${err.response?.status} body=${JSON.stringify(err.response?.data || err.message)}`);
    return null;
  }
}
async function call(label, endpoint, token, method = "get", data = null) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await axios({ method, url: `${BASE_URL}${endpoint}`, headers, data });
    const summary = JSON.stringify(res.data).substring(0, 100) + (JSON.stringify(res.data).length > 100 ? "..." : "");
    console.log(`RESP ${label} status=${res.status} body=${summary}`);
    return res.data;
  } catch (err) {
    console.log(`RESP ${label} status=${err.response?.status || "ERR"} body=${JSON.stringify(err.response?.data || err.message).substring(0, 100)}`);
    return null;
  }
}
async function run() {
  await call("health", "/health");
  const opToken = await login(USERS.OPERATOR);
  if (opToken) {
    await call("platform/tenants/status", "/platform/tenants/status", opToken);
    await call("platform/tenants", "/platform/tenants", opToken);
  }
  const caToken = await login(USERS.COUNTY_ADMIN);
  if (caToken) {
    await call("admin/settings", "/admin/settings", caToken);
    await call("admin/scoring-weights", "/admin/scoring-weights", caToken);
    await call("reports/dashboard", "/reports/dashboard", caToken);
    await call("reports/ward-summary", "/reports/ward-summary", caToken);
    await call("reports/trends", "/reports/trends", caToken);
    const apps = await call("applications", "/applications", caToken);
    const firstAppId = apps?.data?.[0]?.id || apps?.[0]?.id || (Array.isArray(apps) && apps[0]?.id);
    if (firstAppId) {
       await call("app-timeline", `/applications/${firstAppId}/timeline`, caToken);
       await call("app-score", `/applications/${firstAppId}/score`, caToken);
       await call("app-review-notes", `/applications/${firstAppId}/review-notes`, caToken);
    }
  }
  const waToken = await login(USERS.WARD_ADMIN);
  if (waToken) await call("programs", "/programs", waToken);
  const stToken = await login(USERS.STUDENT);
  if (stToken) await call("applications/my-applications", "/applications/my-applications", stToken);
  const fiToken = await login(USERS.FINANCE);
  if (fiToken) {
    await call("disbursements", "/disbursements", fiToken);
    await call("notifications/deliveries", "/notifications/deliveries", fiToken);
  }
}
run();
