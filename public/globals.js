/*
 * =============================================================================
 * FILE: public/globals.js
 *
 * DESCRIPTION:
 * Defines global constants for the WAFu application, including the React
 * shorthand and all commonly used hooks. This script must be loaded after
 * the main React library but before any other application scripts to prevent
 * scope conflicts.
 * =============================================================================
 */

// A global alias for React.createElement to make component code cleaner.
const e = React.createElement;

// Destructure all commonly used hooks from the React object into global constants.
const {
    useState,
    useEffect,
    useCallback,
    useRef,
    createContext,
    useContext
} = React;
