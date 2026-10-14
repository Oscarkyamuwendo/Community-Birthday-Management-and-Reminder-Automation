# Security and privacy

## Reporting a concern

If you find a security or privacy issue, do not publish personal data or secrets in a public issue. Contact the repository maintainer privately through the contact method listed on the maintainer’s GitHub profile.

## Sensitive data

Never commit or share:

- Google Form, spreadsheet, or Calendar IDs from a real deployment
- Real member names, birth dates, email addresses, phone numbers, or other personal information
- Passwords, access tokens, OAuth secrets, or other credentials
- Spreadsheet exports, screenshots, or logs containing private information

Use placeholders and synthetic data in public examples. If a secret is accidentally committed, removing it from the latest commit may not remove it from Git history; revoke or rotate the exposed credential/secret where applicable and clean the history as needed.
