import '@testing-library/jest-dom'
import { Window } from 'happy-dom'

// Node v25 ships a built-in `localStorage` global without the Storage API methods.
// Replace it with a happy-dom Storage implementation so tests work correctly.
const _happyWindow = new Window({ url: 'http://localhost' })
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  enumerable: true,
  writable: true,
  value: _happyWindow.localStorage,
})
