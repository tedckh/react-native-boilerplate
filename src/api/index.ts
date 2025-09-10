import { setApiConfig } from '@my-rn-boilerplate/api-client';

// Configure the API client with the base URL for JSONPlaceholder
const api = setApiConfig({
  baseUrl: 'https://jsonplaceholder.typicode.com',
  timeout: 10000,
});

export default api;
