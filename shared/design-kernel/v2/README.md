# Prometeo Design Kernel v2 — candidate

This candidate separates **neutral design tokens** from **material implementation**.

## Why

The current root `shared/tokens.css` imports Material v1, so merely asking for tokens also raises shells/surfaces. That creates cross-product blast radius and contradicts the Human law that depth indicates manipulability.

## Contract

- `tokens.css` owns spacing, shape, motion, typography roles and semantic palette variables.
- It does **not** render surfaces or controls.
- A product opts into a material version separately (`shared/material/v2/material.css`, a future product-specific material, or none).
- Product palettes override variables; they do not rewrite component CSS.
- Third colors are semantic exceptions (success/warning/danger/focus), never decoration.

No existing consumer is migrated by creating this candidate.
