---
trigger: glob
globs: *.js
---

# syntax

- use import over require!
- use async / await, avoid callbacks & promises.
- use classes & OOP as much as possible.
- avoid arrow functions, always name
- avoid inline functions, especially inside functions - prefer implementing and invoking class members.

# formatting

- always end the line after "}" unless the block it's closing was openned with "{" on the same line.
- when ending a line with "{" always add an empty line after it (double CR/LF).