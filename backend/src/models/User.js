import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  preferences: {
    favoriteGenres: [String],
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
    },
  },
  statistics: {
    totalComics: {
      type: Number,
      default: 0,
    },
    completedComics: {
      type: Number,
      default: 0,
    },
    avgRating: {
      type: Number,
      default: 0,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
