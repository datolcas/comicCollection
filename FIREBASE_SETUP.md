# Firebase Firestore Setup Guide

This application now uses **Firebase Cloud Firestore** instead of MongoDB.

## Prerequisites

- Google account
- Firebase project (create at https://console.firebase.google.com)

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Enter project name (e.g., "comic-collection")
4. Accept the terms and create the project
5. Wait for the project to be created

## Step 2: Create a Firestore Database

1. In your Firebase project, go to **Firestore Database**
2. Click **Create Database**
3. Select **Start in production mode**
4. Choose location (closest to your region)
5. Click **Create**

> **Security Rules**: For development, update rules to allow all access:
> ```
> rules_version = '2';
> service cloud.firestore {
>   match /databases/{database}/documents {
>     match /{document=**} {
>       allow read, write: if true;
>     }
>   }
> }
> ```
> Apply these rules in the **Rules** tab.

## Step 3: Get Firebase Credentials

1. Click the settings icon (⚙️) → **Project settings**
2. Go to **Service accounts** tab
3. Click **Generate new private key**
4. Save the JSON file securely

## Step 4: Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here

# Firebase Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_service_account@your_project_id.iam.gserviceaccount.com
```

**From your Firebase JSON file, copy:**
- `project_id` → `FIREBASE_PROJECT_ID`
- `private_key` → `FIREBASE_PRIVATE_KEY` (keep as multi-line string, the app will handle escaping)
- `client_email` → `FIREBASE_CLIENT_EMAIL`

## Step 5: Install Dependencies

```bash
cd backend
npm install
```

This will install `firebase-admin` automatically.

## Step 6: Start the Application

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## Firestore Collection Structure

The app uses a single `comics` collection with documents containing:

```javascript
{
  title: "String",
  author: "String",
  series: "String",
  issueNumber: "Number",
  publishedYear: "Number",
  publisher: "String",
  genre: ["Array of strings"],
  description: "String",
  coverImage: "String",
  rating: "Number (0-5)",
  review: "String",
  readingStatus: "String (unread|reading|completed)",
  quantity: "Number",
  location: "String",
  condition: "String (mint|fine|very-good|good|fair|poor)",
  notes: "String",
  tags: ["Array of strings"],
  createdAt: "Timestamp",
  updatedAt: "Timestamp"
}
```

## Troubleshooting

### "Firebase initialization error"
- Check your `.env` file has correct credentials
- Ensure `FIREBASE_PRIVATE_KEY` is a valid JSON string

### "Permission denied" errors
- Update Firestore security rules (see Step 2)
- Check your service account email has proper permissions

### "Project not found"
- Verify `FIREBASE_PROJECT_ID` matches your Firebase project
- Check you have internet connection

## Viewing Your Data

1. Go to Firebase Console
2. Select your project
3. Click **Firestore Database**
4. See your `comics` collection with all documents

## Backup & Export

You can export your Firestore data from Firebase Console:
1. Firestore Database → **⋮** menu
2. **Export collections**
3. Choose storage location

For app-level export, use the Dashboard in the UI to download JSON.

## Next Steps

- Your API continues to work the same way!
- Frontend requires no changes
- All endpoints work with Firestore transparently

Happy collecting! 📚🔥
