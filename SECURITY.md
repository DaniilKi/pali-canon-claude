# Security policy

Thank you for helping keep **Pali Canon for Claude** and its users safe.

## Supported versions

Security fixes go into the latest release (currently the 2.x line) and the `main` branch. Please update to the latest release before reporting.

## How to report a problem

**Please do not describe a security problem in a public issue.**

1. **Preferred: report it privately on GitHub.** Go to the repository's [Security tab](https://github.com/DaniilKi/pali-canon-claude/security) and choose **"Report a vulnerability"**. Only the maintainers can see the report. ([GitHub's guide](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability).)
2. **If that button is not available,** [open an issue](https://github.com/DaniilKi/pali-canon-claude/issues/new) titled "Security report: please contact me", with **no details** of the problem. A maintainer will arrange a private way to receive it.

Please include, in the private report: what you found, the version or commit, how to reproduce it, and what an attacker could do with it.

## What to expect

- We aim to reply within 7 days, and to keep you updated until the problem is fixed.
- We will credit you in the release notes, unless you prefer not to be named.
- Please give us a reasonable time to fix the problem before you share it publicly.

This is a volunteer project, so these times are goals, not guarantees.

## What counts as a security problem

The tool is designed to be read-only and to contact only a fixed list of websites (see [how it works](docs/how-it-works.md#safety-and-privacy-by-design)). Examples of problems we want to hear about:

- a way to make the server contact a website that is not on its allowlist (including through redirects);
- a way to make the server write files, run commands, or read files outside its own data;
- retrieved text being treated as instructions instead of data in a way the server could prevent;
- the hosted version (when it exists) logging or exposing what people asked;
- a vulnerable dependency that actually affects this tool.

**Not security problems:** a wrong citation, a broken or wrong translation link, or a mistake in a text. These matter a lot to us, but please report them in the open with the ["Wrong citation or link" form](https://github.com/DaniilKi/pali-canon-claude/issues/new/choose).

See also: [Privacy policy](PRIVACY.md) · [Terms of use](TERMS.md)
