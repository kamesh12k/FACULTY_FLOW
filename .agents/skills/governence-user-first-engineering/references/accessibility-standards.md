# Accessibility Standards (Enterprise Guide)

## 1. WCAG 2.1 AA Compliance Framework

### 1.1 Complete Keyboard Navigability
- All functional elements (buttons, inputs, matrix cells, dropdowns, modal triggers, pagination links) must be navigable using standard keyboard commands:
  - `Tab` / `Shift+Tab`: Forward / backward focus movement.
  - `Enter` / `Space`: Activate buttons and toggle checkboxes.
  - `Escape`: Dismiss modals, drawers, and active dropdown menus.
  - `Arrow Keys`: Navigate matrix grid cells or tabbed navigation bars.

### 1.2 Contrast & Visual Accessibility
- **Contrast Ratio**:
  - Normal text ($< 18\text{pt}$): Minimum $4.5:1$ contrast ratio against background.
  - Large text ($\ge 18\text{pt}$ or bold $\ge 14\text{pt}$): Minimum $3:1$ contrast ratio.
  - UI components and input borders: Minimum $3:1$ against adjacent backgrounds.
- **Color Independence**: Never use color as the sole indicator of state (e.g. error, warning, success). Always pair color with an icon and text label.

---

## 2. ARIA & Screen Reader Standards

### 2.1 Form Accessibility
- Every input element must have an associated `<label for="field-id">` or `aria-label`.
- Error messages must be linked to inputs using `aria-describedby="error-id"`.

### 2.2 Modals & Focus Traps
- When a modal opens, keyboard focus must move immediately into the first focusable element inside the modal.
- Focus must be trapped within the modal until explicitly dismissed.
- Upon dismissal, focus must return to the trigger element that initiated the modal.
