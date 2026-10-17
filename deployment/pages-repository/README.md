# Bodhana hosted release

This directory is a built release, not the development source. Configure Pages to use GitHub Actions, review the complete artifact diff, commit it, and manually dispatch the included workflow. The release must have been built with this destination repository's exact base path. This release targets JThalluri/gurukool with base /gurukool/ and expected URL https://jthalluri.github.io/gurukool/.

The application is public client code. Dictionary lookup and external links need internet. Speech depends on installed platform voices. Offline files become available after a successful install/cache cycle. Physical printing depends on the device print service.

Rollback by restoring a previous complete artifact and rebuilding it with a new release identifier if necessary. See release.json for the build identity and required file list. Retain font/icon licenses.
