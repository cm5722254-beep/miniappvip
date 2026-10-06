import apiClient from './api.client';
import type { ApiResponse, Movie, Episode, PlaybackData, Pagination, Category } from '@/types';

export const moviesService = {
  async getMovies(params: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    sort?: string;
    isFree?: boolean;
  } = {}): Promise<ApiResponse<Pagination<Movie>>> {
    return apiClient.get('/movies', { params });
  },

  async getFeatured(): Promise<ApiResponse<{ popular: Movie[]; newMovies: Movie[]; featured: Movie[] }>> {
    return apiClient.get('/movies/featured');
  },

  async getMovie(id: string): Promise<ApiResponse<Movie>> {
    return apiClient.get(`/movies/${id}`);
  },

  async getEpisodes(movieId: string): Promise<ApiResponse<Episode[]>> {
    return apiClient.get(`/movies/${movieId}/episodes`);
  },

  async watchMovie(movieId: string): Promise<ApiResponse<PlaybackData>> {
    return apiClient.get(`/movies/${movieId}/watch`);
  },

  async watchEpisode(movieId: string, episodeId: string): Promise<ApiResponse<PlaybackData>> {
    return apiClient.get(`/movies/${movieId}/episodes/${episodeId}/watch`);
  },
};

export const categoriesService = {
  async getCategories(): Promise<ApiResponse<Category[]>> {
    return apiClient.get('/categories');
  },

  async getMoviesByCategory(slug: string, page = 1, limit = 20): Promise<ApiResponse<{
    category: Pick<Category, 'id' | 'name' | 'nameKh'>;
    items: Movie[];
    total: number;
    page: number;
    totalPages: number;
  }>> {
    return apiClient.get(`/categories/${slug}/movies`, { params: { page, limit } });
  },
};

export const searchService = {
  async search(q: string, category?: string, page = 1, limit = 20) {
    return apiClient.get('/search', { params: { q, category, page, limit } });
  },

  async getSuggestions(q: string) {
    return apiClient.get('/search/suggestions', { params: { q } });
  },

  async getPopular() {
    return apiClient.get('/search/popular');
  },
};
