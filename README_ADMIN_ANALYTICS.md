# DevPilot admin access and visitor analytics

## Configure your administrator account

The backend protects every /admin/* endpoint with JWT authentication and an administrator user-ID allowlist. Set ADMIN_USER_IDS in the backend hosting environment to the numeric ID of your account, for example ADMIN_USER_IDS=1 only if your account's ID is actually 1. Multiple IDs can be comma-separated. Verify your account ID from the authenticated /auth/me response or the database first.

Restart or redeploy the backend after changing the variable, then sign out and back in to refresh the user profile. The admin page is at /admin. A missing or empty allowlist denies admin access to everyone.

## Visitor counts

The frontend sends one anonymous browser visit per UTC day to POST /analytics/visit. It stores a random browser ID in local storage and sends only that ID and the page path. It does not send names, email addresses, IP addresses, or page contents as part of this feature. The dashboard distinguishes unique browser IDs from registered accounts; these are estimates, not a count of verified humans. Clearing browser storage or using another device/browser may count as a new visitor.

The analytics endpoint is public by design so logged-out landing-page visitors can be counted. It validates payload size and deduplicates the same browser ID per day. Because anonymous analytics can be spoofed, treat the numbers as directional rather than billing or security metrics.

## API URL behavior

The Go CLI's default is the hosted DevPilot API. The Node CLI now uses the same hosted URL by default. DEVPILOT_API_URL and a project's .devpilot api_url remain explicit overrides. The React frontend uses http://localhost:3000 only in Vite development mode; production uses VITE_API_URL or the hosted API URL.

## Offline sync

The Go CLI queues supported project/task/resource mutations under ~/.devpilot/outbox.json only when the backend cannot be reached and the user is logged in. Run devpilot sync to replay queued changes in order. A failed item and all later items stay queued to preserve order. Authentication and AI requests are never queued. Queued mutations report that they were queued rather than claiming the remote operation already succeeded.
