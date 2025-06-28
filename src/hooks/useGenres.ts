import { useEffect, useState } from 'react';

interface Genre {
  _id: string;
  name: string;
}

interface GenreForMusic {
  genre: string;
  value: number;
}

const fetchGenres = async (): Promise<Genre[]> => {
  const response = await fetch('/api/genres');
  if (!response.ok) {
    throw new Error('Failed to fetch genres');
  }
  const data = await response.json();
  return data.genres || [];
};

export const useGenres = () => {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGenres = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchGenres();
        setGenres(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch genres');
      } finally {
        setLoading(false);
      }
    };

    loadGenres();
  }, []);

  return { genres, loading, error, refetch: () => setLoading(true) };
};

// Transform database genres to music form format
export const transformGenresForMusic = (genres: Genre[]): GenreForMusic[] => {
  return genres.map((genre) => ({
    genre: genre.name,
    value: 0
  }));
};
