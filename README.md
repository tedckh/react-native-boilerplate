# React Native Monorepo Boilerplate

This is a professional React Native boilerplate designed for building robust mobile applications with a modular monorepo structure. It's optimized for code sharing and scalability.

## Features

-   **Framework**: React Native (latest stable)
-   **Language**: TypeScript
-   **Monorepo**: Managed with `npm` workspaces for modularity and code sharing.
-   **Navigation**: Integrated with React Navigation (Tab Navigator example).
-   **State Management**: Zustand for simple and powerful global state.
-   **API Client**: Custom API client package (`@my-rn-boilerplate/api-client`) for structured API calls.
-   **Data Fetching**: React Query (`@tanstack/react-query`) for server state management, caching, and synchronization.
-   **Infinite Scroll**: Example implementation of an infinite scroll list using React Query.
-   **Code Quality**: ESLint, Prettier (inherited from base setup).
-   **Consistent Environment**: `.nvmrc` for Node.js version management.

## Project Structure

This boilerplate uses an `npm` workspace structure to organize the main application and shared packages.

-   **Root (`./`)**: Contains the main React Native application.
-   **`packages/`**: Directory for shared, modular code.
    -   `api-client/`: Your custom API client.
    -   `query-provider/`: React Query setup and provider.
    -   `store/`: Zustand state management store.

## Getting Started

**Prerequisites:**
-   Node.js (version specified in `.nvmrc`, e.g., `v20.9.0`). Use `nvm use` if you have `nvm` installed.
-   npm (comes with Node.js).
-   React Native development environment setup (Xcode for iOS, Android Studio for Android). Follow the official [React Native Environment Setup Guide](https://reactnative.dev/docs/environment-setup).

**1. Install Dependencies:**
Navigate to the root of the `react-native-boilerplate` and install all monorepo dependencies:

```bash
npm install
```

**2. Install iOS Pods (for iOS development):**
Navigate into the `ios` directory and install CocoaPods dependencies. This needs to be done once after `npm install` or after updating native deps.

```bash
cd ios && pod install && cd ..
```

**3. Run the Application:**

With dependencies installed, you can run the app on a simulator or device.

-   **Start Metro Bundler (Optional, but good practice):**
    ```bash
    npm start
    ```
-   **Run on iOS Simulator:**
    ```bash
    npm run ios # or npm run ios -- --simulator="iPhone 15 Pro"
    ```
-   **Run on Android Emulator:**
    (Ensure an emulator is running from Android Studio first)
    ```bash
    npm run android
    ```

## Using the Integrated Features

### State Management (Zustand)

The boilerplate includes a basic Zustand store (`@my-rn-boilerplate/store`).

-   **Store Definition**: `packages/store/src/index.ts`
-   **Usage Example**: See `src/screens/HomeScreen.tsx` for a counter example.

### API Client (`@my-rn-boilerplate/api-client`)

A pre-configured API client for making network requests.

-   **Configuration**: `src/api/index.ts` (currently points to JSONPlaceholder).
-   **Usage**: `packages/api-client/api.ts` defines the `ApiCore` class.

### Data Fetching (React Query)

Integrated for efficient server state management.

-   **Provider**: `packages/query-provider/src/index.tsx` (`QueryProvider`).
-   **Usage Example**: See `src/hooks/usePhotos.ts` for `useInfiniteQuery` and `src/screens/InfiniteListScreen.tsx` for its usage.

## Customization

This monorepo structure makes customization easy:

-   **Add a new package**: Create a new folder in `packages/`, add a `package.json` (e.g., `{"name": "@my-rn-boilerplate/my-feature", "version": "1.0.0"}`), and run `npm install` at the root.
-   **Remove a feature**: Delete the corresponding folder in `packages/` and remove its entry from `package.json` if it's listed there. Then run `npm install` at the root.

## Troubleshooting

-   If you encounter build issues, try clearing caches: `npm start -- --reset-cache` and `rm -rf node_modules && npm install`.
-   For iOS native issues, try `cd ios && rm -rf Pods Podfile.lock && pod install && cd ..`.

## License

ISC