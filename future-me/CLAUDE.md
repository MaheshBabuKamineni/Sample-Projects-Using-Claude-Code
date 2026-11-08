# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Future Me is a static, client-only web app: users write letters to their future selves, and each letter stays sealed until a chosen date. It is plain HTML, CSS, and JavaScript. The only external dependency is Google Fonts, and letters are stored only in the browser's `localStorage`.

## Commands

There is no build step, package manager, linter, or test suite. To run the app, open `index.html` in a browser.

To test the unlock flow by hand, use the "1 min demo" preset in the form, then keep the page visible until the countdown ends.

## Architecture

All app logic is in one IIFE in `script.js`, and the top-level `let` variables there hold all state. `index.html` provides the static markup and the `#letterTemplate` that each letter card is cloned from.

### Rendering

- `render()` is a full rebuild. It clears `#letters`, then recreates the cards that match the current filter, sorted by unlock time. The `cards` map (letter id to element refs) is rebuilt at the same time.
- `tick()` runs every second and updates existing cards in place through `updateCard()`. Use it for time-driven changes, and call `render()` only when the set or order of cards changes. Because `tick()` doesn't re-filter, a card that unlocks under the "Sealed" filter stays visible until the next `render()`.
- A `storage` event listener reloads and re-renders when another tab changes the letters.

### Letter data and unlock state

- Letters are saved as a JSON array under `futureMe.letters.v1`. `loadLetters()` silently drops any entry that fails `isValidLetter()`, so update that check and consider the stored data whenever the schema changes.
- `unlockAt` and `createdAt` are epoch milliseconds.
- `unlockAt` decides whether a letter is sealed or opened, including for filters and stats. `opened` only records that the reveal animation has played, so a letter unlocked while the app was closed still animates on the next visit. Reveals wait until the page is visible.
- **No peeking:** `message` is written to the DOM only in `showUnlocked()`, so a sealed letter's text can't be found by inspecting the page. Keep it that way. User text is set with `textContent`.

### JS and CSS coupling

Most visual states are CSS classes toggled from JS (`is-unlocked`, `revealing`, `unfolding`, `is-new`, `removing`, `is-changing`, `is-sealed`, `is-invalid`), and some JS depends on the CSS animations:

- The 750 ms timeout in `reveal()` matches the 0.75 s `seal-break` animation, and the quote swap's 300 ms timeout matches the `.quote-card` transition. Change both sides together.
- `deleteLetter()` removes the card on `animationend` from `card-out`, so the card stays on the page if that animation is removed.

### Theming

- Colors are CSS custom properties on `:root`, overridden by `:root[data-theme="dark"]`. Add any new color to both blocks.
- An inline script in the `<head>` of `index.html` applies the saved theme before first paint to prevent a flash. It repeats the `futureMe.theme` key defined in `script.js`, so keep the two in sync.

### Reduced motion

Honor `prefers-reduced-motion` in new work. A global CSS rule shortens animations and transitions, but motion started from JS has to check `reducedMotion.matches` itself, as `setUnit()`, `burstConfetti()`, and the scroll in `render()` do.
