# Requirements Document

## Introduction

UniGo is a multi-page static website serving as a university campus companion app for UBC students. It provides study spot discovery, food finder maps, schedule management, and AI-powered schedule optimization. This requirements document specifies the production optimization needed to prepare UniGo for deployment, covering asset optimization, SEO, security hardening, accessibility, build automation, PWA capabilities, error handling, and repository cleanup.

## Glossary

- **Build_System**: The Node.js-based build pipeline that transforms source files into optimized production assets in the dist directory
- **Dist_Directory**: The `/dist` output folder containing all production-ready, optimized static files
- **Asset_Pipeline**: The processing chain that minifies, fingerprints, and bundles CSS, JavaScript, and HTML files
- **Service_Worker**: A background script that intercepts network requests and serves cached resources for offline functionality
- **Web_App_Manifest**: A JSON file (`manifest.json`) that provides metadata for Progressive Web App installation
- **Content_Security_Policy**: HTTP response header directives that restrict which resources the browser may load
- **Meta_Tag_System**: The collection of HTML meta elements providing SEO, Open Graph, and Twitter Card metadata
- **Error_Page**: A custom HTML page displayed when a requested resource cannot be found (404) or when the app is offline
- **Fingerprinted_Asset**: A file whose name includes a content hash (e.g., `styles.a3b2c1.css`) for cache-busting
- **Critical_CSS**: The minimal subset of CSS required to render above-the-fold content, inlined in the HTML head
- **Source_Files**: The original unminified HTML, CSS, and JavaScript files in the project root and `js/` and `css/` directories

## Requirements

### Requirement 1: Build System and Asset Pipeline

**User Story:** As a developer, I want a single build command that produces a fully optimized dist directory, so that I can deploy production-ready assets without manual steps.

#### Acceptance Criteria

1. WHEN the developer runs the build command, THE Build_System SHALL produce a Dist_Directory containing all optimized static files
2. WHEN processing CSS files, THE Asset_Pipeline SHALL minify the CSS output removing whitespace, comments, and redundant rules
3. WHEN processing JavaScript files, THE Asset_Pipeline SHALL minify the JavaScript output removing whitespace, comments, and shortening variable names
4. WHEN processing HTML files, THE Asset_Pipeline SHALL minify the HTML output removing unnecessary whitespace and comments while preserving functionality
5. WHEN generating output files, THE Asset_Pipeline SHALL append a content hash to CSS and JavaScript filenames for cache-busting
6. WHEN producing fingerprinted assets, THE Build_System SHALL update all HTML references to point to the hashed filenames
7. THE Build_System SHALL exclude test files, test output files, node_modules, and development configuration from the Dist_Directory
8. WHEN the build command completes, THE Build_System SHALL report the total output size and file count to the console

### Requirement 2: Performance Optimization

**User Story:** As a user, I want pages to load quickly on both mobile and desktop connections, so that I can access campus information without waiting.

#### Acceptance Criteria

1. THE Asset_Pipeline SHALL inline Critical_CSS for above-the-fold content in each HTML page
2. WHEN loading external fonts, THE Build_System SHALL include `preconnect` hints for `fonts.googleapis.com` and `fonts.gstatic.com` with crossorigin attribute
3. WHEN loading external fonts, THE Build_System SHALL add `font-display: swap` to prevent invisible text during font loading
4. WHEN referencing third-party scripts (Leaflet, leaflet-heat), THE Build_System SHALL add `defer` or `async` attributes to non-critical script tags
5. THE Build_System SHALL generate a preload directive for the primary CSS file in each HTML document head
6. WHEN images are present in production assets, THE Asset_Pipeline SHALL compress images to reduce file size without visible quality loss

### Requirement 3: SEO and Metadata

**User Story:** As a product owner, I want search engines and social platforms to correctly index and preview UniGo pages, so that students can discover the app through search.

#### Acceptance Criteria

1. THE Meta_Tag_System SHALL include a unique `<title>` and `<meta name="description">` for each page
2. THE Meta_Tag_System SHALL include Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`) on each page
3. THE Meta_Tag_System SHALL include Twitter Card tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`) on each page
4. THE Build_System SHALL generate a `robots.txt` file permitting crawler access to all public pages
5. THE Build_System SHALL generate a `sitemap.xml` file listing all public HTML pages with lastmod dates
6. WHEN structuring page content, THE Meta_Tag_System SHALL ensure each page has exactly one `<h1>` element and proper heading hierarchy (h1 through h6 without skipping levels)
7. THE Build_System SHALL add `rel="canonical"` link elements to each page pointing to the canonical URL

### Requirement 4: Security Hardening

**User Story:** As a developer, I want the application to follow security best practices, so that user data and sessions are protected from common web attacks.

#### Acceptance Criteria

1. THE Build_System SHALL generate a Content_Security_Policy meta tag restricting script sources to `self` and explicitly allowed CDN domains (unpkg.com for Leaflet, fonts.googleapis.com, fonts.gstatic.com)
2. THE Build_System SHALL add `X-Content-Type-Options: nosniff` as a meta tag equivalent in HTML
3. WHEN referencing external scripts and stylesheets from CDNs, THE Build_System SHALL include `integrity` attributes with Subresource Integrity (SRI) hashes
4. WHEN referencing external links, THE Build_System SHALL include `rel="noopener noreferrer"` on all anchor tags with `target="_blank"`
5. THE Build_System SHALL add a `<meta http-equiv="X-Frame-Options" content="DENY">` tag to prevent clickjacking
6. WHEN the login form processes credentials, THE Build_System SHALL ensure form inputs have `autocomplete` attributes set appropriately (email, current-password, new-password)
7. THE Build_System SHALL generate a `_headers` file (for Netlify/Cloudflare Pages) or equivalent configuration documenting recommended HTTP security headers (Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, Referrer-Policy)

### Requirement 5: Accessibility Compliance

**User Story:** As a user with assistive technology, I want to navigate and use UniGo with a screen reader and keyboard, so that I can access campus services regardless of ability.

#### Acceptance Criteria

1. THE Build_System SHALL ensure all interactive elements (buttons, links, inputs) have accessible names via `aria-label`, `aria-labelledby`, or visible text content
2. THE Build_System SHALL ensure all form inputs have associated `<label>` elements or `aria-label` attributes
3. THE Build_System SHALL ensure the sidebar navigation uses `role="navigation"` and has an `aria-label` identifying its purpose
4. THE Build_System SHALL ensure the main content area uses a `<main>` landmark element with appropriate role
5. WHEN the sidebar opens or closes, THE Build_System SHALL ensure focus management moves focus to the sidebar when opened and returns focus to the trigger button when closed
6. THE Build_System SHALL ensure all color combinations meet WCAG 2.1 AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
7. THE Build_System SHALL ensure all pages include a skip-navigation link as the first focusable element

### Requirement 6: Progressive Web App

**User Story:** As a student, I want to install UniGo on my phone home screen and access basic features offline, so that I can check my schedule without internet.

#### Acceptance Criteria

1. THE Build_System SHALL generate a `manifest.json` file with `name`, `short_name`, `start_url`, `display: standalone`, `theme_color`, `background_color`, and icon references
2. THE Build_System SHALL generate app icons in sizes 192x192 and 512x512 pixels (PNG format)
3. THE Build_System SHALL generate a Service_Worker that caches the application shell (HTML, CSS, JS) using a cache-first strategy
4. WHEN the network is unavailable, THE Service_Worker SHALL serve cached pages for previously visited routes
5. WHEN the network is unavailable and a requested page is not cached, THE Service_Worker SHALL display the offline fallback Error_Page
6. WHEN a new version of the Service_Worker is available, THE Service_Worker SHALL notify the user and activate on the next page load
7. THE Build_System SHALL register the Service_Worker from each HTML page via a registration script

### Requirement 7: Error Handling and Fallback Pages

**User Story:** As a user, I want to see helpful error pages when something goes wrong, so that I understand what happened and can navigate back to working pages.

#### Acceptance Criteria

1. THE Build_System SHALL generate a custom 404 Error_Page styled consistently with the UniGo design system
2. THE 404 Error_Page SHALL include navigation links back to the home page and other main sections
3. THE Build_System SHALL generate an offline fallback Error_Page informing the user that the page requires internet connectivity
4. THE offline Error_Page SHALL be cached by the Service_Worker during installation
5. IF a JavaScript error occurs during page initialization, THEN THE Build_System SHALL ensure the page displays a user-friendly error message instead of a blank screen

### Requirement 8: Repository Cleanup and Deploy Readiness

**User Story:** As a developer, I want the repository to be clean and deploy-ready, so that CI/CD pipelines and hosting platforms work without manual intervention.

#### Acceptance Criteria

1. THE Build_System SHALL provide a clean script that removes test output files (`*.txt` result files, `*.json` result files in the project root that are not configuration)
2. THE Build_System SHALL generate a production `.gitignore` that excludes `node_modules/`, `dist/`, test output files, and IDE-specific files
3. THE Build_System SHALL support an environment variable (`API_URL`) for configuring the Lambda API Gateway endpoint URL, replacing the hardcoded placeholder in scheduler.html
4. WHEN no `API_URL` environment variable is set, THE Build_System SHALL fail the build with a descriptive error message indicating the required configuration
5. THE Build_System SHALL generate a `.env.example` file documenting all required environment variables with placeholder values
6. THE Build_System SHALL exclude the `lambda/node_modules` directory and all test infrastructure from the Dist_Directory

### Requirement 9: Caching Strategy Documentation

**User Story:** As a DevOps engineer, I want clear cache header guidance, so that I can configure the hosting platform for optimal performance and freshness.

#### Acceptance Criteria

1. THE Build_System SHALL generate a `_headers` or equivalent configuration file specifying `Cache-Control: public, max-age=31536000, immutable` for fingerprinted assets
2. THE Build_System SHALL specify `Cache-Control: no-cache` for HTML files in the headers configuration to ensure users receive the latest version
3. THE Build_System SHALL specify `Cache-Control: public, max-age=86400` for the Service_Worker file
4. THE Build_System SHALL include documentation comments in the headers configuration explaining each caching directive

### Requirement 10: Build Configuration and Scripts

**User Story:** As a developer, I want clear npm scripts for building, cleaning, and previewing the production site, so that the workflow is standardized and documented.

#### Acceptance Criteria

1. THE Build_System SHALL expose a `build` npm script that executes the full production build pipeline
2. THE Build_System SHALL expose a `clean` npm script that removes the Dist_Directory and generated artifacts
3. THE Build_System SHALL expose a `preview` npm script that serves the Dist_Directory locally for pre-deployment verification
4. THE Build_System SHALL expose a `clean:outputs` npm script that removes test output and result files from the project root
5. WHEN the `build` script is invoked, THE Build_System SHALL execute steps in order: clean, process assets, generate PWA files, generate meta files, and produce final output
