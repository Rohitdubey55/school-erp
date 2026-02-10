# School ERP - SaaS Edition

A professional School ERP system.
- **Backend**: Google Apps Script (JSON API).
- **Frontend**: HTML5/JS/CSS (deployable to GitHub Pages).
- **Database**: Google Sheets.

## Part 1: Backend Deployment (Google Apps Script)

1.  Go to [script.google.com](https://script.google.com/home/start).
2.  Create a **New Project**.
3.  Rename `Code.gs` to `Code.gs` (if not already).
4.  **Copy-Paste** the content of `Code.gs` from this folder into the script editor.
5.  **Save** (Cmd/Ctrl + S).
6.  **Deploy**:
    -   Click **Deploy** -> **New deployment**.
    -   Select type: **Web app**.
    -   Description: `v1 API`.
    -   Execute as: **Me**.
    -   Who has access: **Anyone** (Important for the frontend to access it).
    -   Click **Deploy**.
    -   **COPY THE WEB APP URL** (It starts with `https://script.google.com/macros/s/...`).

## Part 2: Frontend Configuration

1.  Open `script.js` in this folder.
2.  Find the line:
    ```javascript
    const API_URL = 'REPLACE_WITH_YOUR_WEB_APP_URL';
    ```
3.  Replace `'REPLACE_WITH_YOUR_WEB_APP_URL'` with the URL you copied in Step 1.
    -   Example: `const API_URL = 'https://script.google.com/macros/s/AKfycbx.../exec';`
4.  Save the file.

## Part 3: Frontend Deployment (GitHub)

1.  Push this entire folder to a **GitHub Repository**.
2.  Go to the repository **Settings** -> **Pages**.
3.  Select **Source**: `Deploy from a branch` -> `main` (or master) -> `/ (root)`.
4.  Click **Save**.
5.  GitHub will give you a URL (e.g., `https://your-username.github.io/school-erp/`).
6.  Open that URL to run your ERP!

## Google Sheet Structure
Ensure your sheet (ID: `16oTFXKd88iXgKMATk12zL9IqtoUKWK4zY3frR4ZoP0o`) has tabs: `Sheet1` (Students), `Transactions` (Fees), `Expenses` (Daybook).
