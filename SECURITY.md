# Security Policy

## Reporting a Vulnerability

Security is important to us.

If you discover a security issue, please report it privately through
[GitHub Security Advisories](https://github.com/sepehrsdq/Sepehr-Meeting/security/advisories/new).
Please do not open a public issue or disclose the vulnerability publicly before a fix is available.

The advisory form guides you through the required details. Please include the affected version,
reproduction steps and any relevant logs.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x     | ✅        |

## Response Process

1. We confirm the report and assess its impact.
2. A fix is prepared and tested.
3. The fix ships in the next release, and the reporter is credited if they wish.

## Scope

In scope:

- The web application (`app/`, `public/`)
- The signaling and media layer (Socket.IO, mediasoup)
- Authentication, room access control and host permissions

Out of scope:

- Vulnerabilities in third-party dependencies without a working proof of concept
- Misconfiguration of the deployment environment (open Redis, exposed media ports, weak secrets)
- Denial of service through resource exhaustion on unhardened hosts
