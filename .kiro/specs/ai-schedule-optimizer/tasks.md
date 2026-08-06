# Implementation Plan: AI Schedule Optimizer

## Overview

Build a vanilla JS single-page application with Web Components that optimizes university students' free time between classes using AWS Bedrock. The frontend handles class schedule input, user preferences, and schedule display with localStorage persistence. The backend is a serverless AWS Lambda behind API Gateway that proxies requests to Bedrock and validates responses.

## Tasks

- [x] 1. Project setup and core infrastructure
  - [x] 1.1 Initialize project structure with package.json, Vitest, and fast-check
    - Create `package.json` with dependencies: vitest, fast-check, @vitest/coverage-v8
    - Create directory structure: `/js/models`, `/js/services`, `/js/components`, `/js/validators`, `/js/utils`
    - Create `vitest.config.js` with ESM support and jsdom environment
    - Create `/lambda` directory for backend function
    - _Requirements: N/A (project scaffolding)_

  - [x] 1.2 Define data models as ES module classes
    - Create `/js/models/Class.js` — class model with id, name, day, startTime, endTime, location
    - Create `/js/models/TimeBlock.js` — time block with startTime, endTime, type, name, location
    - Create `/js/models/UserPreferences.js` — activities (ranked array), dietaryRestrictions, mealPreferences
    - Create `/js/models/Schedule.js` — day, timeBlocks array, generatedAt timestamp, seed
    - Create `/js/models/StoredState.js` — classes, preferences, schedules, regenerationCounts
    - Export type constants: DayOfWeek, BlockType, ActivityCategory, DietaryRestriction, MealType
    - _Requirements: 1.1, 2.1, 2.2, 3.2, 7.1_

  - [x] 1.3 Implement time utility functions
    - Create `/js/utils/time.js` with: parseTime, formatTime12h, timeToMinutes, minutesToTime
    - Implement duration calculation between two time values
    - Implement 5-minute increment validation
    - Implement time range validation (06:00-23:00)
    - Implement gap computation: given sorted classes for a day, return array of {startTime, endTime, duration, beforeClass, afterClass}
    - _Requirements: 1.1, 3.3, 4.2_

- [x] 2. Validation logic
  - [x] 2.1 Implement class input validators
    - Create `/js/validators/classValidator.js`
    - Validate name length (1-100 characters)
    - Validate start/end times are 5-minute increments in 06:00-23:00 range
    - Validate endTime > startTime
    - Return structured error objects with field references
    - _Requirements: 1.1, 1.5_

  - [x] 2.2 Implement overlap detection
    - Create `/js/validators/overlapDetector.js`
    - For a given class and existing classes on the same day, detect overlaps
    - Overlap defined: classA.startTime < classB.endTime AND classA.endTime > classB.startTime
    - Return array of conflicting class pairs with names and times
    - Validate max 30 classes constraint
    - _Requirements: 1.2, 1.3, 1.6_

  - [ ]* 2.3 Write property test for class input validation (Property 1)
    - **Property 1: Class input validation**
    - Generate arbitrary strings and time pairs; verify acceptance iff name 1-100 chars, times are valid 5-min increments in range, and endTime > startTime
    - **Validates: Requirements 1.1, 1.5**

  - [ ]* 2.4 Write property test for overlap detection (Property 2)
    - **Property 2: Overlap detection correctness**
    - Generate arbitrary pairs of classes on the same day; verify overlap reported iff start < other.end AND end > other.start
    - **Validates: Requirements 1.2**

- [x] 3. Checkpoint - Validate core models and validators
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. localStorage persistence service
  - [x] 4.1 Implement storage service
    - Create `/js/services/storageService.js`
    - Implement `saveClasses(classes)`, `loadClasses()` — serialize/deserialize Class arrays
    - Implement `savePreferences(prefs)`, `loadPreferences()` — serialize/deserialize UserPreferences
    - Implement `saveSchedule(day, schedule)`, `loadSchedule(day)` — per-day schedule storage
    - Implement `getRegenerationCount(day, gapIndex)`, `incrementRegenerationCount(day, gapIndex)` — track regeneration limits
    - Use `StoredState` structure with JSON serialization
    - Handle missing/corrupted data gracefully (return defaults)
    - _Requirements: 1.4, 2.3, 2.4, 10.3_

  - [ ]* 4.2 Write property test for stored state round-trip (Property 3)
    - **Property 3: Stored state round-trip**
    - Generate arbitrary valid StoredState objects; verify serialize then deserialize produces identical object
    - **Validates: Requirements 1.4, 2.3, 2.4**

- [x] 5. Class schedule input UI component
  - [x] 5.1 Create ClassScheduleInput web component
    - Create `/js/components/class-schedule-input.js` as a Custom Element
    - Render form with fields: name (text), day (select Mon-Fri), startTime (select 5-min increments 06:00-23:00), endTime (same), location (text)
    - Display list of added classes grouped by day
    - Allow removing individual classes
    - Enforce max 30 classes with disabled add button and message
    - All interactive elements minimum 44×44px touch target
    - _Requirements: 1.1, 1.6, 8.1_

  - [x] 5.2 Wire validation and error display into class input
    - On form submit: run classValidator and overlapDetector
    - Display inline error for end time ≤ start time (Req 1.5)
    - Display inline error identifying conflicting class names/times for overlaps (Req 1.3)
    - Block save until conflicts resolved
    - On successful add: persist to localStorage via storageService
    - On page load: restore classes from localStorage
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 6. User preferences UI component
  - [x] 6.1 Create UserPreferencesInput web component
    - Create `/js/components/user-preferences-input.js` as a Custom Element
    - Render activity preference selection: checkboxes for study, exercise, social, relaxation, errands
    - Implement drag-and-drop or up/down buttons for ranking selected activities
    - Render dietary restrictions: multi-select checkboxes (vegetarian, vegan, gluten-free, nut-free, dairy-free, halal, kosher, none)
    - Render meal type preferences: checkboxes (breakfast, lunch, dinner, snack)
    - Display confirmation message on save
    - Minimum 44×44px touch targets on all interactive elements
    - _Requirements: 2.1, 2.2, 2.3, 8.1_

  - [x] 6.2 Wire preferences persistence and validation
    - On save: persist to localStorage via storageService
    - On page load: restore preferences from localStorage
    - Validate at least one activity preference selected before enabling schedule generation (Req 2.5)
    - Display prompt if no activities selected when user attempts generation
    - _Requirements: 2.3, 2.4, 2.5_

- [x] 7. Checkpoint - Validate input components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Time gap computation and scheduling logic
  - [x] 8.1 Implement gap computation service
    - Create `/js/services/scheduleLogic.js`
    - Compute time gaps for a given day from sorted class list
    - Filter gaps to ≥ 15 minutes only
    - For each gap, determine if transit is needed (compare end location of prior class with start location of next class)
    - Calculate transit duration (5-30 minutes based on location difference)
    - Compute usable gap time after transit allocation
    - _Requirements: 3.3, 4.1, 4.2, 4.4_

  - [x] 8.2 Implement TimeBlock validation logic
    - Create `/js/validators/timeBlockValidator.js`
    - Validate TimeBlocks don't overlap with classes
    - Validate TimeBlocks are within computed gaps
    - Validate chronological ordering
    - Validate block types are valid (transit, meal, activity)
    - Validate transit durations 5-30 min, meal durations per window rules, activity ≥ 15 min
    - Validate no activity/meal ends after required transit start
    - _Requirements: 3.3, 4.3, 5.1-5.6, 6.2_

  - [ ]* 8.3 Write property test for TimeBlocks confined to gaps (Property 5)
    - **Property 5: TimeBlocks confined to time gaps**
    - Generate class schedules and TimeBlock sets; verify every block falls within a gap ≥ 15 min and no block overlaps a class
    - **Validates: Requirements 3.3**

  - [ ]* 8.4 Write property test for chronological ordering (Property 6)
    - **Property 6: Chronological ordering**
    - Generate TimeBlock lists; verify b[i].startTime <= b[i+1].startTime for all consecutive pairs
    - **Validates: Requirements 3.2, 7.3**

  - [ ]* 8.5 Write property test for transit block rules (Property 7)
    - **Property 7: Transit block insertion and bounds**
    - Generate schedules with location changes; verify transit blocks exist with 5-30 min duration and no activity/meal ends after transit start
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [ ]* 8.6 Write property test for gap consumed by transit (Property 8)
    - **Property 8: Gap consumed by transit when insufficient**
    - Generate gaps ≤ required transit time between different locations; verify entire gap is one Transit_Block with no other blocks
    - **Validates: Requirements 4.4**

  - [ ]* 8.7 Write property test for meal block timing (Property 9)
    - **Property 9: Meal block timing rules**
    - Generate time gaps in meal windows; verify correct meal type, duration capping, snack rules, and minimum gap enforcement
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.5, 5.6**

  - [ ]* 8.8 Write property test for one meal per window (Property 10)
    - **Property 10: One meal per window per day**
    - Generate full-day schedules; verify at most one Meal_Block per meal window (breakfast, lunch, dinner)
    - **Validates: Requirements 5.7**

  - [ ]* 8.9 Write property test for activity duration and preference (Property 12)
    - **Property 12: Activity blocks respect duration and preference constraints**
    - Generate Activity_Blocks with preferences; verify duration ≥ 15 min, fits in gap minus transit, category in user preferences
    - **Validates: Requirements 6.1, 6.2, 6.4**

  - [ ]* 8.10 Write property test for activity variety (Property 14)
    - **Property 14: Activity category variety**
    - Generate multi-gap schedules with multiple preferences; verify no two consecutive Activity_Blocks share category
    - **Validates: Requirements 6.5**

- [x] 9. API client service
  - [x] 9.1 Implement API client
    - Create `/js/services/apiClient.js`
    - Implement `generateSchedule(day, classes, preferences, seed)` — POST to `/optimize`
    - Set 30-second timeout with AbortController (Req 9.2)
    - Parse response JSON into TimeBlock array on success
    - Return structured error object on failure (timeout, HTTP error, parse error)
    - Handle network errors gracefully
    - _Requirements: 3.1, 9.1, 9.2, 9.3_

  - [x] 9.2 Implement response parser with validation
    - Create `/js/services/responseParser.js`
    - Parse Bedrock response JSON into TimeBlock objects
    - Validate each block has required fields (startTime, endTime, type, name, location)
    - Validate block types, chronological order, no overlaps
    - On partial validity: return valid blocks, exclude invalid ones (Req 3.5)
    - Log parse failures for debugging (Req 9.3)
    - _Requirements: 3.2, 3.4, 3.5, 9.3_

  - [ ]* 9.3 Write property test for TimeBlock parse/format round-trip (Property 4)
    - **Property 4: TimeBlock parse/format round-trip**
    - Generate valid TimeBlock lists; format to JSON then parse back; verify identical ordering, times, and types
    - **Validates: Requirements 3.4**

- [x] 10. Checkpoint - Validate core logic and API client
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Lambda backend and Bedrock integration
  - [x] 11.1 Create Lambda function with Bedrock invocation
    - Create `/lambda/index.mjs` — Node.js 20 ESM Lambda handler
    - Parse incoming request body (day, classes, preferences, regenerationSeed)
    - Validate request fields
    - Compute time gaps from class schedule
    - Construct system prompt and user prompt per design specification
    - Invoke Bedrock (Claude 3 Haiku) via AWS SDK `InvokeModelCommand`
    - Set Bedrock invocation timeout to 25 seconds (leaving 5s for cleanup)
    - Parse Bedrock response as JSON array of time blocks
    - Validate parsed blocks (required fields, types, ordering, gap confinement)
    - Return valid blocks; on partial validity return subset
    - Return structured error responses for timeout, API failure, parse failure
    - _Requirements: 3.1, 3.2, 3.5, 4.1, 9.1, 9.2, 9.3_

  - [x] 11.2 Create API Gateway configuration
    - Create `/lambda/template.yaml` (SAM template) or equivalent IaC
    - Define POST /optimize endpoint with request body validation
    - Configure CORS headers for frontend origin
    - Set API Gateway timeout to 30 seconds
    - Define Lambda function resource with Node.js 20 runtime
    - Configure Bedrock IAM permissions for the Lambda role
    - _Requirements: 3.1_

- [x] 12. Schedule view and TimeBlock renderer components
  - [x] 12.1 Create TimeBlockRenderer web component
    - Create `/js/components/time-block-renderer.js` as a Custom Element
    - Render a single time block with: start time (12h format), end time (12h format), activity name, location
    - Apply color/icon per block type: class, transit, meal, activity (Req 7.2)
    - Set block height proportional to duration relative to visible time axis (Req 7.1)
    - Minimum font size 14px on mobile viewports (Req 7.4)
    - _Requirements: 7.1, 7.2, 7.4_

  - [x] 12.2 Create ScheduleView web component
    - Create `/js/components/schedule-view.js` as a Custom Element
    - Render vertical time-blocked layout with time axis
    - Display class blocks alongside generated TimeBlocks in chronological order (Req 7.3)
    - Include legend identifying block type colors/icons (Req 7.2)
    - Show "No schedule available" message with generate prompt when empty (Req 7.5)
    - Show loading state during API calls
    - Render at minimum 600px width on desktop (≥768px viewport), full width on mobile (Req 7.4)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 13. Navigation and responsive layout (App Shell)
  - [x] 13.1 Create App Shell and Navigation components
    - Create `/js/components/app-shell.js` as a Custom Element
    - Implement client-side routing between views: Schedule, Classes, Preferences
    - Create `/js/components/navigation.js` as a Custom Element
    - Include day selector tabs (Monday-Friday) within schedule view
    - On mobile (<768px): collapse nav into hamburger menu with overlay/slide-in panel (Req 8.3)
    - On desktop (≥768px): display full inline navigation (Req 8.4)
    - Single-column layout on mobile, multi-column on desktop (Req 8.2)
    - No horizontal scrollbar at any width 320px-1920px (Req 8.2)
    - Minimum 16px font, 44×44px touch targets (Req 8.1)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [-] 13.2 Wire App Shell with index.html entry point
    - Update `index.html` to load ES module entry point
    - Create `/js/app.js` as main entry — register all custom elements, initialize app shell
    - Load stored state from localStorage on startup
    - Connect all components via custom events and shared state
    - _Requirements: 1.4, 2.4_

- [ ] 14. Error handling UI
  - [-] 14.1 Create ErrorDisplay component and error handling flow
    - Create `/js/components/error-display.js` as a Custom Element
    - Display contextual error messages in schedule display area
    - Show retry button for timeout and service errors (Req 9.1, 9.2)
    - Show descriptive messages: "Service temporarily unavailable", "Request took too long", "Schedule could not be generated"
    - Hide loading indicators within 2 seconds of error detection (Req 9.5)
    - Preserve inputs in localStorage on error — return UI to pre-request state (Req 9.4)
    - Error persists until user dismisses or initiates new request (Req 9.5)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 14.2 Write property test for error state preserving inputs (Property 15)
    - **Property 15: Error state preserves inputs**
    - Simulate API errors; verify class schedule and preferences in storage remain unchanged after error handling
    - **Validates: Requirements 9.4**

- [ ] 15. Schedule regeneration feature
  - [~] 15.1 Implement schedule regeneration
    - Add "Regenerate" button to ScheduleView component
    - On click: increment regeneration seed and call API with same inputs + new seed (Req 10.1)
    - Replace displayed schedule with newly generated one (Req 10.2)
    - Track regeneration count per day per gap — disable after 5 attempts (Req 10.3)
    - Show count indicator (e.g., "3/5 regenerations used")
    - _Requirements: 10.1, 10.2, 10.3_

- [~] 16. Checkpoint - Full feature integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Remaining property tests and integration polish
  - [ ]* 17.1 Write property test for meal dietary restriction compliance (Property 11)
    - **Property 11: Meal blocks respect dietary restrictions**
    - Generate Meal_Blocks with user dietary restrictions; verify no restricted items in suggestions
    - **Validates: Requirements 5.4**

  - [ ]* 17.2 Write property test for activity category prioritization (Property 13)
    - **Property 13: Activity category prioritization**
    - Generate schedules with ranked preferences and equal gaps; verify higher-ranked categories appear first
    - **Validates: Requirements 6.3**

  - [~] 17.3 Final integration wiring and visual polish
    - Ensure all components communicate correctly via events
    - Verify day switching loads correct schedule from localStorage
    - Verify generate button sends correct day's classes to API
    - Add CSS transitions for loading states and block animations
    - Test responsive layout at 320px, 768px, and 1920px breakpoints
    - Verify legend, color coding, and proportional heights work end-to-end
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.5_

- [~] 18. Final checkpoint - Complete validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1-15)
- Unit tests validate specific examples and edge cases
- The Lambda backend (`/lambda`) can be deployed independently once the frontend is working with mocked responses
- All frontend code uses vanilla JavaScript ES modules — no build step required for development
- Vitest handles testing with jsdom for DOM-dependent tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.2", "4.1"] },
    { "id": 3, "tasks": ["2.3", "2.4", "4.2", "5.1", "6.1"] },
    { "id": 4, "tasks": ["5.2", "6.2", "8.1"] },
    { "id": 5, "tasks": ["8.2", "9.1"] },
    { "id": 6, "tasks": ["8.3", "8.4", "8.5", "8.6", "8.7", "8.8", "8.9", "8.10", "9.2"] },
    { "id": 7, "tasks": ["9.3", "11.1"] },
    { "id": 8, "tasks": ["11.2", "12.1"] },
    { "id": 9, "tasks": ["12.2", "13.1"] },
    { "id": 10, "tasks": ["13.2", "14.1"] },
    { "id": 11, "tasks": ["14.2", "15.1"] },
    { "id": 12, "tasks": ["17.1", "17.2", "17.3"] }
  ]
}
```
