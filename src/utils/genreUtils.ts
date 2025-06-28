interface Genre {
  _id: string;
  name: string;
}

interface GenreForMusic {
  genre: string;
  value: number;
}

export const fetchGenresFromDB = async (): Promise<Genre[]> => {
  try {
    const response = await fetch('/api/genres');
    if (!response.ok) {
      throw new Error('Failed to fetch genres');
    }
    const data = await response.json();
    return data.genres || [];
  } catch (error) {
    console.error('Error fetching genres:', error);
    return [];
  }
};

export const transformGenresForMusic = (genres: Genre[]): GenreForMusic[] => {
  return genres.map((genre) => ({
    genre: genre.name,
    value: 0
  }));
};
