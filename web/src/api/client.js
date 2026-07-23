const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export async function detectBugs(code, language = "python") {
  // Placeholder API call
  return { issues: [] };
}

export async function explainCode(code) {
  // Placeholder API call
  return { explanation: "" };
}

export async function generateTests(code) {
  // Placeholder API call
  return { tests: "" };
}

export async function searchCode(query) {
  // Placeholder API call
  return { results: [] };
}
