---
'@aaronisms/scripts': patch
---

The importers expand a leading `~` in path arguments (Windows shells don't) and resolve relative paths against the folder the command was run from.
