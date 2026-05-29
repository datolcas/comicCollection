# Comic Collection Manager - Quick Start Guide

## First Time Setup

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Firebase

**Option A: Use Firebase Cloud (Recommended)**
1. Create a Firebase project at https://console.firebase.google.com
2. Create a Firestore database
3. Get your service account credentials
4. Set environment variables in `backend/.env`:
   ```env
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY=your_private_key
   FIREBASE_CLIENT_EMAIL=your_email@project.iam.gserviceaccount.com
   ```

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed instructions.

### 3. Start the Application

**Terminal 1:**
```bash
cd backend
npm run dev
```

**Terminal 2:**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173` in your browser!

## Project Features

✅ Full CRUD operations for comic management
✅ Real-time search and filtering
✅ Reading progress tracking
✅ 5-star rating system
✅ Collection statistics & analytics
✅ Import/Export functionality
✅ Responsive design
✅ **Now with Firebase Firestore!**

## Common Commands

```bash
# Backend
npm run dev       # Start dev server with auto-reload
npm start         # Start production server

# Frontend
npm run dev       # Start dev server with Vite
npm run build     # Build for production
npm run preview   # Preview production build locally
```

## Troubleshooting

**Firebase connection error?**
- Check `.env` file has correct credentials
- Ensure Firestore database is created
- See [FIREBASE_SETUP.md](FIREBASE_SETUP.md)

**Port already in use?**
- Backend: Change PORT in `.env`
- Frontend: Vite will auto-increment if 5173 is taken

**Modules not found?**
- Delete `node_modules` folder
- Run `npm install` again

## Next Steps

1. Add your first comic using the "Add Comic" button
2. Try the **Whakoom import** - paste a Whakoom URL to auto-fill comic data!
3. Explore search and filter options
4. Check out the Dashboard for statistics
5. Export your collection as backup

See [WHAKOOM_IMPORT.md](WHAKOOM_IMPORT.md) for details on importing from Whakoom.

Enjoy managing your comic collection! 📚🔥
