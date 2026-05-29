# Whakoom URL Import Feature

The Comic Collection Manager now supports automatic comic data import from **Whakoom** URLs!

## What is Whakoom?

[Whakoom](https://www.whakoom.com) is a large online database and community for comic book collectors. It has detailed information about thousands of comics including:
- Title and series information
- Authors and publishers
- Publication dates
- Cover images
- Genres and classifications
- User ratings

## How to Use

### Step 1: Find a Comic on Whakoom

1. Go to [whakoom.com](https://www.whakoom.com)
2. Search for your comic
3. Open the comic's detailed page

### Step 2: Copy the URL

Copy the URL from your browser's address bar (looks like: `https://www.whakoom.com/comic/...`)

### Step 3: Use in Comic Collection App

When adding a new comic:

1. Click **"Add Comic"** button
2. You'll see a **"🔗 Fetch from Whakoom"** section at the top of the form
3. Paste the comic URL into the input field
4. Click **"📥 Fetch"** button
5. The form will automatically populate with:
   - Title
   - Series name
   - Issue number
   - Author(s)
   - Publisher
   - Publication year
   - Description
   - Cover image
   - Genres
   - Rating (if available)

### Step 4: Review and Save

- Review the auto-filled data
- Make any corrections if needed
- Adjust reading status, your personal rating, condition, etc.
- Click **"Save Comic"**

## Example Whakoom URL

```
https://www.whakoom.com/comic/343/the-amazing-spider-man-1-reprise
```

## What Gets Extracted

The import automatically retrieves:

| Field | Source |
|-------|--------|
| Title | Comic page title |
| Series | Series link |
| Issue # | Parsed from title |
| Author(s) | Link data |
| Publisher | Editor/Publisher link |
| Year | Publication date |
| Description | Comic synopsis |
| Cover Image | Comic cover image |
| Genres | Genre tags |
| Rating | User rating (if available) |

## What You Still Need to Add

These fields are preserved for your manual entry:

- **Reading Status** - Your progress (unread/reading/completed)
- **Your Rating** - Your personal rating (0-5 stars)
- **Condition** - Condition of your copy
- **Location** - Where you keep it
- **Review** - Your personal notes

## Tips

✅ **Do:**
- Use the exact Whakoom comic URL
- Review auto-filled data for accuracy
- Edit fields if needed (sometimes data extraction isn't 100% accurate)
- Add your personal notes and ratings

❌ **Don't:**
- Use URLs from other sites (only Whakoom is supported)
- Skip reviewing the auto-filled data
- Forget to add your personal reading status

## Troubleshooting

### "Please provide a valid Whakoom comic URL" error
- Make sure the URL starts with `https://www.whakoom.com`
- Verify you copied the full URL
- Some Whakoom links may not work - try again with another comic

### Some fields are empty
- Not all Whakoom pages have all information
- Manually fill in missing details
- This is completely normal!

### Cover image doesn't show
- Some comics might not have images on Whakoom
- You can upload/paste an image URL manually

### Data seems incorrect
- Whakoom might have incomplete or outdated information
- Check and correct the data manually
- Report issues to Whakoom if needed

## API Endpoint

For developers, the endpoint is:

```
POST /api/comics/fetch-from-url
Content-Type: application/json

{
  "url": "https://www.whakoom.com/comic/..."
}
```

Response:
```json
{
  "title": "Comic Title",
  "author": "Author Name",
  "series": "Series Name",
  "issueNumber": 1,
  "publishedYear": 2024,
  "publisher": "Publisher Name",
  "genre": ["Genre1", "Genre2"],
  "description": "Comic description...",
  "coverImage": "https://...",
  "rating": 4.5,
  "notes": "Source: https://www.whakoom.com/..."
}
```

## Privacy & Performance

- Whakoom data is fetched server-side
- Your API key or credentials are NOT shared
- Each fetch may take 1-3 seconds (web scraping is slower than API calls)
- URLs are logged in the `notes` field for reference

## Future Improvements

Planned enhancements:
- Support for other comic databases (ComicVine, MyComicShop, etc.)
- Direct API integration with Whakoom (if available)
- Batch import from Whakoom lists
- Automatic image optimization

## Need Help?

- Check the [README.md](README.md) for general app documentation
- Review [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for database setup
- See [FIRESTORE_REFERENCE.md](FIRESTORE_REFERENCE.md) for technical details

---

Happy collecting! 📚✨
