import { InfiniteData, useInfiniteQuery } from '@tanstack/react-query';
import api from '../api';

interface Photo {
  albumId: number;
  id: number;
  title: string;
  url: string;
  thumbnailUrl: string;
}

export interface PhotosPage {
  data: Photo[];
  nextPage: number | undefined;
}

const fetchPhotos = async ({ pageParam = 1 }): Promise<PhotosPage> => {
  const limit = 10;
  const response = await api.get<Photo[]>(`/photos?_page=${pageParam}&_limit=${limit}`);
  
  const hasNextPage = response && response.length === limit;
  const nextPage = hasNextPage ? pageParam + 1 : undefined;

  return {
    data: response || [],
    nextPage,
  };
};

export const usePhotos = () => {
  return useInfiniteQuery<PhotosPage, Error, InfiniteData<PhotosPage>, string[], number>({
    queryKey: ['photos'],
    queryFn: fetchPhotos,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
  });
};
