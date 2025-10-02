# Step Counter Web App (Phase 3 – Web Dashboard)

## Demo Images 
<img width="1556" height="904" alt="`" src="https://github.com/user-attachments/assets/22bee40e-b0d8-487a-9040-10bd26696549" />
<img width="1625" height="954" alt="4" src="https://github.com/user-attachments/assets/29f8a8ea-c9da-4951-9d67-cbff3bf1b2ef" />
<img width="1649" height="945" alt="3" src="https://github.com/user-attachments/assets/dc52ad1e-a823-46a0-a816-760d276317e4" />
<img width="1552" height="958" alt="2" src="https://github.com/user-attachments/assets/27bb018b-60bd-42ca-804f-d55918b70684" />

This project is the Phase 3 part of a three-phase assignment. The goal of the overall system is to collect step counter data from a mobile app, store it securely in the cloud, and display it on a web dashboard.

* In **Phase 1**, a Flutter mobile app was built to collect step data from the device’s sensors and sync it to the cloud.
* In **Phase 2**, a cloud database was created using Firebase Firestore to store the data with fields such as userId, steps, and timestamp. Firebase Authentication was also configured for secure access.
* In **Phase 3** (this repository), a Next.js web application is implemented that allows users to log in, fetch their personal step history from Firestore, and visualize it using Chart.js in a clean, responsive dashboard.

---

## Project Overview

The web app provides:

* Authentication with email and password (signup, login, logout, password reset).
* Secure Firestore queries so that each user can only see their own data.
* A dashboard with a line chart of steps over time, summary statistics, and recent activity.
* A responsive and user-friendly interface styled with Tailwind CSS.

---

## Features

1. **Authentication**: Signup, login, logout, and password reset via Firebase Authentication.
2. **Data Retrieval**: Queries Firestore’s “steps” collection for records matching the logged-in user’s UID.
3. **Data Visualization**: Renders a line chart with Chart.js to display step data across time.
4. **Dashboard Stats**: Shows total number of records, total steps recorded, and average steps per record.
5. **Recent Activity**: Displays the five most recent step records with timestamps.
6. **Responsive Design**: Tailwind CSS ensures the UI works well on desktop and mobile.
7. **Error Handling**: User-friendly messages for loading states, empty results, or data errors.

---

## Project Structure

* context/AuthContext.js – Provides authentication state and methods for signup, login, logout, reset password.
* lib/firebase.js – Initializes Firebase app, authentication, and Firestore.
* pages/index.js – Redirects users to login or dashboard based on authentication status.
* pages/login.js – Login screen.
* pages/signup.js – Signup screen.
* pages/dashboard.js – Displays step data, chart, statistics, and recent activity.
* styles/globals.css – Tailwind CSS global styles.

---

## Firestore Data Model

* **Collection name**: steps
* **Fields in each document**:

  * userId (string) → The Firebase Authentication UID of the user.
  * steps (number) → The step count value recorded.
  * timestamp (can be Firestore Timestamp, number in milliseconds, seconds, or ISO string) → When the data was recorded.

Example: a document may contain userId = “abc123UID”, steps = 150, and timestamp as a Firestore timestamp or numeric date.

---

## Firestore Security Rules

To keep data secure while developing, the following rules are applied:

* Only authenticated users can read and write data.
* Users must be logged in to add, view, or update step records.

Rules applied:

* `rules_version = '2'`
* `service cloud.firestore` with `match /databases/{database}/documents`
* `match /steps/{document=**}` → allow read and write if request.auth is not null.

This ensures that only signed-in users can access the steps collection.

---

## Setup and Installation

1. Clone the repository from GitHub and navigate into the project folder.
2. Install dependencies with `npm install` or `yarn install`.
3. Configure Firebase:

   * Go to Firebase Console.
   * Create a new project.
   * Enable Authentication with Email/Password.
   * Enable Firestore Database (Native mode).
   * Copy Firebase config values and add them to a `.env.local` file in the project root. The environment variables include API key, auth domain, project ID, storage bucket, messaging sender ID, and app ID. These values are automatically loaded by firebase.js.
4. Start the development server with `npm run dev` or `yarn dev`.
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

   * If not authenticated, you will be redirected to the login screen.
   * Create a new account on the signup page.
   * After login, you will be redirected to the dashboard where the step data is displayed.

---

## Flow of the Project

* A user signs up or logs in using Firebase Authentication.
* If logged in, the app redirects the user to the dashboard page.
* Firestore is queried for all documents in the steps collection where userId equals the logged-in user’s UID.
* The data is parsed, and timestamps are converted into JavaScript Date objects.
* The results are sorted chronologically.
* The dashboard displays:

  * A Chart.js line chart of steps vs time.
  * Statistics including total records, total steps, and average steps.
  * A recent activity list showing the last five records.
* The user can log out, which clears authentication and returns them to the login page.

---

## Technologies Used

* Next.js – React framework for the frontend.
* Firebase Authentication – Secure user authentication.
* Firebase Firestore – Cloud database for storing step records.
* Chart.js and react-chartjs-2 – Visualization of step data.
* Tailwind CSS – Utility-first CSS framework for responsive design.
* React Context API – Global state management for authentication.

---

## Future Improvements

* Add real-time updates using Firestore onSnapshot.
* Introduce filters for daily, weekly, or monthly views.
* Add CSV or Excel export for step data.
* Provide aggregated statistics (such as daily or weekly totals).
* Strengthen Firestore rules for production environments.
---
