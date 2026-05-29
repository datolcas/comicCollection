# Comic Collection Manager

A full-stack web application to manage and track your personal comic book collection.

## Features

- 📚 **Add/Edit/Delete Comics** - Manage your collection with detailed comic information
- 📖 **Track Reading Progress** - Mark comics as unread, reading, or completed
- 🔍 **Search & Filter** - Find comics by title, author, series, status, and more
- ⭐ **Rate & Review** - Rate comics and add personal reviews
- 🔗 **Whakoom Import** - Automatically fetch comic data from Whakoom URLs
- 📊 **Statistics & Analytics** - View collection statistics and top authors/genres
- 👥 **Authors Directory** - Browse and filter all creators in your collection
- � **Locations Organizer** - Organize comics by physical location
- �💾 **Import/Export** - Backup and restore your collection as JSON
- 🎨 **Modern UI** - Clean, responsive design that works on desktop and mobile

## Project Structure

```
comicCollection/
├── frontend/          # React + Vite frontend app
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API and context services
│   │   ├── styles/        # CSS files
│   │   └── App.jsx        # Main app component
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── backend/           # Express.js + Firebase backend
    ├── src/
    │   ├── controllers/   # Request handlers (CRUD + Whakoom import)
    │   ├── routes/        # API routes
    │   └── server.js      # Express app setup with Firebase
    └── package.json
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase project with Firestore database (see [FIREBASE_SETUP.md](FIREBASE_SETUP.md))

## Installation

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory with your Firebase credentials:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here

# Firebase Configuration (get these from Firebase Console)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_service_account@your_project_id.iam.gserviceaccount.com
```

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed Firebase setup instructions.

### 2. Frontend Setup

```bash
cd frontend
npm install
```

## Running the Application

### Development Mode

**Terminal 1 - Start Backend Server:**
```bash
cd backend
npm run dev
```

The API will run on `http://localhost:5000`

**Terminal 2 - Start Frontend Dev Server:**
```bash
cd frontend
npm run dev
```

The app will run on `http://localhost:5173`

### Production Build

**Frontend:**
```bash
cd frontend
npm run build
```

Output will be in `frontend/dist/`

## API Endpoints

### Comics Routes

- `GET /api/comics` - Get all comics (supports filters: search, author, series, status, genre, sort)
- `GET /api/comics/:id` - Get a comic by ID
- `POST /api/comics` - Create a new comic
- `PUT /api/comics/:id` - Update a comic
- `DELETE /api/comics/:id` - Delete a comic
- `GET /api/comics/statistics` - Get collection statistics
- `GET /api/comics/export` - Export all comics as JSON
- `POST /api/comics/import` - Import comics from JSON

## Comic Fields

- **title** (required) - Comic title
- **scriptwriter** (array) - Guionista/Writer list
- **artist** (array) - Dibujante/Drawing artist list
- **inker** (array) - Entintador/Inker list
- **otherAuthors** (array) - Other creators (colorist, letterer, etc.)
- **series** - Series name (e.g., "The Amazing Spider-Man")
- **issueNumber** - Issue number
- **publicationDate** - Publication date with month and year (e.g., "enero 2012")
- **publisher** - Publisher name
- **genre** - Array of genres
- **description** - Comic description
- **coverImage** - Image URL
- **usaNumbers** - USA edition information (e.g., "Teen Titans #77-82")
- **whakoomUrl** - Link to the comic on Whakoom
- **rating** - Rating 0-5
- **review** - Personal review
- **readingStatus** - unread | reading | completed
- **location** - Where it's stored
- **condition** - mint | fine | very-good | good | fair | poor

## Usage Guide

### Adding a Comic

1. Click "Add Comic" button
2. Fill in comic details
3. Click "Save Comic"

### Searching & Filtering

1. Use the search box to find comics by title or author
2. Click "Filters" to access advanced filters
3. Filter by author, series, reading status, or sort options

### Viewing Authors

1. Navigate to "Autores" in the main menu
2. Search for an author using the search box
3. Click on an author to expand and see all their comics
4. View detailed information about each comic

### Organizing by Location

1. Navigate to "Ubicaciones" in the main menu
2. View all locations where you store your comics
3. Click on a location to expand and see all comics stored there
4. Use the search box to find specific locations
5. To create a new location, create or edit a comic and enter the location name

### Tracking Progress

1. Click "Edit" on a comic card
2. Change the reading status (unread → reading → completed)
3. Add your review and rating
4. Save changes

### Viewing Statistics

1. Navigate to "Dashboard"
2. View collection statistics
3. See top genres and authors
4. Export/Import collection data

### Exporting & Importing

**Export:**
1. Go to Dashboard
2. Click "Export Collection"
3. JSON file will download

**Import:**
1. Go to Dashboard
2. Click "Import Collection"
3. Select a JSON file
4. Comics will be added to your collection

## Technologies Used

### Frontend
- React 18
- Vite
- React Router
- Axios
- CSS3

### Backend
- Node.js
- Express.js
- Firebase Admin SDK
- Cloud Firestore (NoSQL)

## Future Enhancements

- User authentication and personalization
- Want list and trade features
- Comic value estimation
- Image upload for covers
- Mobile app (React Native)
- Reading list recommendations
- Community features (ratings, reviews)

## Error Handling

The app includes error handling for:
- Network errors
- Validation errors
- Database errors
- File import/export errors

Errors are displayed as toast notifications to the user.

## Testing

Currently, no automated tests are included. To add tests:

**Frontend:** Install Jest and React Testing Library
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

**Backend:** Install Mocha and Chai
```bash
npm install --save-dev mocha chai supertest
```

## Contributing

Feel free to fork, enhance, and submit pull requests!

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues, questions, or suggestions, please open an issue on the repository.

---

Happy collecting! 📚✨
