# Requirements Document

## Introduction

UniGo's AI Schedule Optimizer is a feature that helps university students make the most of their time between classes. Using AWS Bedrock, the system analyzes a student's class schedule, campus locations, available time gaps, and personal preferences to generate an optimized time-blocked schedule. The schedule includes meal suggestions based on the time of day, activity recommendations aligned with user preferences, and accounts for travel time between class locations.

## Glossary

- **Schedule_Optimizer**: The core AI-powered system that analyzes inputs and generates optimized time-blocked schedules using AWS Bedrock.
- **Time_Block**: A discrete segment of time in the generated schedule representing a single suggested activity, meal, or transit period.
- **Class_Schedule**: The user's inputted set of classes with associated times, days, and locations.
- **Time_Gap**: A period of free time between two consecutive classes on the same day.
- **User_Preferences**: A set of user-defined activity interests and dietary preferences used to personalize schedule suggestions.
- **Campus_Location**: A named location on campus associated with a class or suggested activity.
- **Transit_Block**: A Time_Block specifically allocated for travel between two Campus_Locations.
- **Meal_Block**: A Time_Block suggesting a meal based on the time of day and gap duration.
- **Activity_Block**: A Time_Block suggesting a leisure or productive activity based on User_Preferences and available time.
- **Bedrock_API**: The AWS Bedrock generative AI service used to generate optimized schedule suggestions.

## Requirements

### Requirement 1: Class Schedule Input

**User Story:** As a university student, I want to input my class schedule including times, days, and locations, so that the system can identify my free time between classes.

#### Acceptance Criteria

1. THE Schedule_Optimizer SHALL allow users to input classes with a name (1 to 100 characters), a day of the week (Monday through Friday), a start time, an end time, and a Campus_Location, where start time and end time are selectable in 5-minute increments between 6:00 AM and 11:00 PM.
2. WHEN a user submits a Class_Schedule, THE Schedule_Optimizer SHALL validate that no two classes overlap on the same day, where overlap is defined as any period where one class's start time is earlier than another class's end time and its end time is later than the other class's start time.
3. IF a user submits overlapping classes, THEN THE Schedule_Optimizer SHALL display an error message identifying the names and times of the conflicting classes, and SHALL NOT save the conflicting entry until the overlap is resolved.
4. THE Schedule_Optimizer SHALL persist the Class_Schedule across user sessions, restoring all previously entered classes upon the user's next login.
5. IF a user submits a class where the end time is equal to or earlier than the start time, THEN THE Schedule_Optimizer SHALL display an error message indicating the end time must be later than the start time.
6. THE Schedule_Optimizer SHALL allow users to add up to 30 classes in a single Class_Schedule.

### Requirement 2: User Preferences Input

**User Story:** As a university student, I want to specify my activity preferences and dietary needs, so that the AI can tailor suggestions to my interests.

#### Acceptance Criteria

1. THE Schedule_Optimizer SHALL allow users to select and rank one or more activity preferences from the following categories: study, exercise, social, relaxation, and errands.
2. THE Schedule_Optimizer SHALL allow users to input dietary preferences by selecting meal type preferences (breakfast, lunch, dinner, snack) and dietary restrictions (e.g., vegetarian, vegan, gluten-free, nut-free, dairy-free, halal, kosher, none).
3. WHEN a user updates their User_Preferences, THE Schedule_Optimizer SHALL store the updated preferences, display a confirmation indicating the preferences were saved, and apply them to all subsequent schedule generations.
4. THE Schedule_Optimizer SHALL persist User_Preferences across user sessions.
5. IF a user has not selected any activity preferences, THEN THE Schedule_Optimizer SHALL prompt the user to select at least one activity preference before allowing schedule generation.

### Requirement 3: AI Schedule Generation

**User Story:** As a university student, I want to receive an AI-generated optimized schedule for my free time between classes, so that I can make productive and enjoyable use of my day.

#### Acceptance Criteria

1. WHEN a user requests schedule optimization for a specific day of the week, THE Schedule_Optimizer SHALL send the Class_Schedule for that day, User_Preferences, and Campus_Locations to the Bedrock_API.
2. WHEN the Bedrock_API returns a response, THE Schedule_Optimizer SHALL parse the response into a list of Time_Blocks ordered chronologically by start time for the requested day, where each Time_Block includes a start time, end time, block type (Transit_Block, Meal_Block, or Activity_Block), activity name, and Campus_Location.
3. THE Schedule_Optimizer SHALL generate Time_Blocks only within identified Time_Gaps of 15 minutes or longer and SHALL NOT overlap with existing classes or extend beyond the boundaries of any Time_Gap.
4. THE Schedule_Optimizer SHALL ensure that for all generated schedules, parsing the Bedrock_API response into Time_Blocks and formatting those Time_Blocks back into the response format produces a schedule with identical block ordering, start times, end times, and block types (round-trip property).
5. IF the Bedrock_API returns a response containing fewer Time_Blocks than available Time_Gaps, THEN THE Schedule_Optimizer SHALL still display the partial schedule for the Time_Gaps that were filled.

### Requirement 4: Transit Time Allocation

**User Story:** As a university student, I want the schedule to account for travel time between locations, so that I am not late to my next class.

#### Acceptance Criteria

1. WHEN generating a schedule, IF the preceding Time_Block is at a different Campus_Location than the next class, THEN THE Schedule_Optimizer SHALL insert a Transit_Block ending at or before the start time of that next class.
2. THE Schedule_Optimizer SHALL calculate transit duration based on the distance between two Campus_Locations, with a minimum duration of 5 minutes and a maximum duration of 30 minutes.
3. THE Schedule_Optimizer SHALL ensure that no Activity_Block or Meal_Block ends later than the start of a required Transit_Block.
4. IF the available Time_Gap between two classes at different Campus_Locations is less than or equal to the required transit duration, THEN THE Schedule_Optimizer SHALL allocate the entire Time_Gap as a Transit_Block and SHALL NOT insert any Activity_Block or Meal_Block within that gap.

### Requirement 5: Meal Suggestions

**User Story:** As a university student, I want meal suggestions based on the time of day and my available time, so that I can plan meals that fit my schedule.

#### Acceptance Criteria

1. WHEN a Time_Gap of 30 minutes or more occurs between 7:00 AM and 10:00 AM, THE Schedule_Optimizer SHALL suggest a breakfast Meal_Block with a duration equal to the lesser of the Time_Gap duration or 60 minutes.
2. WHEN a Time_Gap of 30 minutes or more occurs between 11:00 AM and 2:00 PM, THE Schedule_Optimizer SHALL suggest a lunch Meal_Block with a duration equal to the lesser of the Time_Gap duration or 60 minutes.
3. WHEN a Time_Gap of 30 minutes or more occurs between 5:00 PM and 8:00 PM, THE Schedule_Optimizer SHALL suggest a dinner Meal_Block with a duration equal to the lesser of the Time_Gap duration or 90 minutes.
4. WHEN generating a Meal_Block, THE Schedule_Optimizer SHALL exclude meal options that conflict with dietary restrictions specified in User_Preferences and prioritize meal types matching the user's meal type preferences.
5. IF a Time_Gap is between 10 minutes and 29 minutes during a meal window (7:00 AM–10:00 AM, 11:00 AM–2:00 PM, or 5:00 PM–8:00 PM), THEN THE Schedule_Optimizer SHALL suggest a snack Meal_Block with a duration equal to the available Time_Gap.
6. IF a Time_Gap is shorter than 10 minutes during a meal window, THEN THE Schedule_Optimizer SHALL NOT suggest any Meal_Block.
7. THE Schedule_Optimizer SHALL suggest at most one Meal_Block per meal window (breakfast, lunch, or dinner) per day.

### Requirement 6: Activity Suggestions

**User Story:** As a university student, I want activity suggestions based on my preferences and available time, so that I can use my free time in ways I enjoy.

#### Acceptance Criteria

1. WHEN a Time_Gap is available and no Meal_Block is required, THE Schedule_Optimizer SHALL suggest an Activity_Block from the user's selected User_Preferences categories (study, exercise, social, relaxation, or errands).
2. THE Schedule_Optimizer SHALL only suggest activities whose estimated duration fits within the available Time_Gap minus any required Transit_Blocks, with a minimum Activity_Block duration of 15 minutes.
3. WHILE generating Activity_Blocks, THE Schedule_Optimizer SHALL prioritize activities matching the user's highest-ranked preference category first, then second-ranked, and so on in descending rank order.
4. IF the available Time_Gap minus required Transit_Blocks is less than 15 minutes, THEN THE Schedule_Optimizer SHALL not generate an Activity_Block for that Time_Gap.
5. WHEN multiple Time_Gaps exist on the same day, THE Schedule_Optimizer SHALL vary suggested Activity_Block categories across gaps to avoid suggesting the same category consecutively, unless only one preference category is selected.

### Requirement 7: Time-Blocked Schedule Display

**User Story:** As a university student, I want to see my optimized schedule displayed as a visual time-blocked layout, so that I can easily understand my day at a glance.

#### Acceptance Criteria

1. THE Schedule_Optimizer SHALL display the generated schedule as a vertical time-blocked layout with each Time_Block showing start time, end time, activity name, and Campus_Location, with times displayed in 12-hour format (e.g., "9:00 AM") and block heights proportional to their duration relative to a visible time axis.
2. THE Schedule_Optimizer SHALL visually distinguish between class blocks, Meal_Blocks, Activity_Blocks, and Transit_Blocks by assigning each block type a unique color or icon that is not reused by any other block type, with a visible legend identifying each block type's indicator.
3. THE Schedule_Optimizer SHALL display the schedule in chronological order from the first event to the last event of the day, with no Time_Block appearing visually above or before a Time_Block that starts earlier.
4. WHEN viewed on a viewport of 768px or wider, THE Schedule_Optimizer SHALL render the time-blocked schedule at a minimum width of 600px, and WHEN viewed on a viewport narrower than 768px, THE Schedule_Optimizer SHALL render the schedule at full viewport width with Time_Block text remaining legible at a minimum font size of 14px.
5. IF no generated schedule exists for the selected day, THEN THE Schedule_Optimizer SHALL display a message indicating no schedule is available and prompt the user to generate one.

### Requirement 8: Responsive Design

**User Story:** As a university student, I want to access the schedule optimizer on my phone and laptop, so that I can check my schedule anywhere.

#### Acceptance Criteria

1. THE Schedule_Optimizer SHALL render all UI text at a minimum computed font size of 16px and all interactive elements at a minimum touch-target size of 44×44px on viewports from 320px to 1920px wide.
2. THE Schedule_Optimizer SHALL present content in a single-column layout on viewports narrower than 768px and a multi-column layout on viewports 768px and wider, with no horizontal scrollbar appearing at any supported viewport width.
3. WHEN viewed on a viewport narrower than 768px, THE Schedule_Optimizer SHALL collapse navigation into a hamburger menu icon that, when tapped, displays the full navigation list as an overlay or slide-in panel.
4. WHEN viewed on a viewport 768px or wider, THE Schedule_Optimizer SHALL display the full navigation menu inline without requiring user interaction to reveal it.
5. THE Schedule_Optimizer SHALL maintain all functionality, including schedule viewing, input forms, and regeneration controls, accessible and operable across the supported viewport range of 320px to 1920px.

### Requirement 9: Error Handling for AI Service

**User Story:** As a university student, I want clear feedback when the AI service is unavailable, so that I understand why my schedule was not generated.

#### Acceptance Criteria

1. IF the Bedrock_API returns an error, THEN THE Schedule_Optimizer SHALL display an error message within the schedule display area indicating the service is temporarily unavailable and suggesting the user try again later.
2. IF the Bedrock_API does not respond within 30 seconds, THEN THE Schedule_Optimizer SHALL cancel the request, display a timeout error message indicating the request took too long, and offer a retry option.
3. IF the Bedrock_API returns a response that cannot be parsed into valid Time_Blocks, THEN THE Schedule_Optimizer SHALL display an error message indicating the schedule could not be generated and log the raw response for debugging.
4. IF any Bedrock_API error occurs, THEN THE Schedule_Optimizer SHALL preserve the user's Class_Schedule and User_Preferences inputs and return the UI to the pre-request state within 2 seconds of error detection.
5. IF any Bedrock_API error occurs, THEN THE Schedule_Optimizer SHALL hide any loading or progress indicators and display the error message in the schedule display area until the user dismisses it or initiates a new request.

### Requirement 10: Schedule Regeneration

**User Story:** As a university student, I want to regenerate my schedule if I don't like the suggestions, so that I can get alternative options.

#### Acceptance Criteria

1. WHEN a user requests regeneration, THE Schedule_Optimizer SHALL send a new request to the Bedrock_API with the same inputs and a different randomization seed.
2. THE Schedule_Optimizer SHALL display the newly generated schedule replacing the previous one.
3. THE Schedule_Optimizer SHALL allow the user to regenerate the schedule up to 5 times per day per Time_Gap without restriction.
