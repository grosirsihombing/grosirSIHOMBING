/**
 * components/toast.js — feedback setelah save (PRD section 57).
 * Usage: import { toast } from "../components/toast.js"; toast.success("Tersimpan");
 */

function ensureStack() {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  return stack;
}

function show(message, variant = "") {
  const stack = ensureStack();
  const node = document.createElement("div");
  node.className = `toast ${variant ? "toast--" + variant : ""}`.trim();
  node.textContent = message;
  stack.appendChild(node);
  setTimeout(() => {
    node.style.transition = "opacity 0.25s ease";
    node.style.opacity = "0";
    setTimeout(() => node.remove(), 250);
  }, 2800);
}

export const toast = {
  success: (msg) => show(msg, "success"),
  error: (msg) => show(msg, "error"),
  info: (msg) => show(msg, ""),
};
