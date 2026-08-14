# FAFLOW — Contribution Guide

This guide establishes the protocol for contributing code, reporting security vulnerabilities, and proposing feature enhancements to FAFLOW.

---

## 1. Code Contribution Process

1. **Fork / Branch**: Create a feature branch off `develop`.
2. **Implement Feature**: Ensure adherence to `docs/development/Code_Standards.md`.
3. **Add Tests**: Write comprehensive pytest unit and integration tests covering positive and edge cases.
4. **Run Verification**: Ensure all 328+ tests pass (`pytest`) and frontend builds cleanly (`npm run build`).
5. **Open Pull Request**: Submit PR with clear description, test verification logs, and associated ticket references.
