import mongoose from 'mongoose';

const comicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  author: String,
  series: String,
  issueNumber: Number,
  publishedYear: Number,
  publisher: String,
  genre: [String],
  description: String,
  coverImage: String,
  rating: {
    type: Number,
    min: 0,
    max: 5,
  },
  review: String,
  readingStatus: {
    type: String,
    enum: ['unread', 'reading', 'completed'],
    default: 'unread',
  },
  readingStartDate: Date,
  readingEndDate: Date,
  purchasePrice: Number,
  purchaseDate: Date,
  location: String,
  condition: {
    type: String,
    enum: ['mint', 'fine', 'very-good', 'good', 'fair', 'poor'],
  },
  notes: String,
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

export default mongoose.model('Comic', comicSchema);
