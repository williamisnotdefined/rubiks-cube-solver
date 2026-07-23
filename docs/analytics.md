# Analytics Setup

The web app sends no analytics data before the visitor explicitly accepts analytics. It loads the Google Tag Manager container `GTM-W92GNDGD` after consent and emits only typed events through `window.dataLayer`.

The Google Analytics measurement ID `G-E8CJN7LE76` must be managed only by this GTM container. Do not add a separate `gtag.js` snippet to `apps/web/index.html`; that would duplicate page views.

## GTM configuration

1. Keep one **Google tag** with destination ID `G-E8CJN7LE76` and an **All Pages** trigger.
2. In that Google tag, add the configuration parameter `send_page_view` with value `false`.
3. In its Consent Settings, require `analytics_storage`. Apply the same requirement to the event tag below.
4. Create Data Layer Variables for `analytics_event_name`, `page_location`, `page_path`, `page_title`, `page_locale`, `puzzle_slug`, `solve_source`, `solve_status`, `timer_event_id`, `timer_penalty`, and `guide_id`.
5. Create one **Custom Event** trigger whose event name is `analytics_event`.
6. Create one **Google Analytics: GA4 Event** tag using that trigger. Set its Event Name to `{{DLV - analytics_event_name}}`, then map the remaining variables to GA4 event parameters using their exact data-layer names.
7. In GA4 Enhanced Measurement, disable automatic page views. The application emits one `page_view` after consent on the initial route and every SPA route change. Enhanced outbound-click measurement may remain enabled.
8. In GA4 Admin, set event-data retention to **14 months**. Exclude your own development traffic before using reports for decisions.

## Event contract

| Event name | Parameters | Purpose |
| --- | --- | --- |
| `page_view` | `page_location`, `page_path`, `page_title`, `page_locale` | Page and locale reach; query strings and URL fragments are excluded. |
| `solver_result` | `puzzle_slug`, `solve_source`, `solve_status` | Solver success and failure distribution. |
| `scan_opened` | `puzzle_slug` | Scanner entry usage. |
| `timer_solve_recorded` | `timer_event_id`, `timer_penalty` | Timer feature usage. |
| `notation_visualizer_used` | `guide_id`, `puzzle_slug` | Notation visualizer usage. |

Never add scrambles, scanned images, sticker data, session identifiers, or user-entered text as event parameters.

## Verification

1. Use GTM Preview/Tag Assistant on `speedcube.com.br`.
2. Before accepting the banner, confirm there is no request to `googletagmanager.com` or `google-analytics.com`, and no `_ga*` cookie.
3. After accepting, confirm one GTM request, one `page_view` per route, and the product events above.
4. Use GA4 DebugView for immediate event confirmation. Standard GA4 reports can take up to 24 hours.
5. Compare GA4 users and sessions with Cloudflare over 7 and 30 days. Cloudflare counts edge requests and bots; GA4 counts consenting browser sessions, so the totals are intentionally different.
