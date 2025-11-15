// Design System - 统一的设计变量和样式类

export const colors = {
  primary: {
    DEFAULT: 'primary',
    hover: 'primary-hover',
    active: 'primary-active',
  },
  secondary: {
    DEFAULT: 'muted',
    hover: 'accent',
    active: 'accent',
  },
  error: {
    bg: 'red-50',
    border: 'red-200',
    text: 'red-600',
    hover: 'red-700',
    dark: 'red-800',
  },
  success: {
    bg: 'green-50',
    border: 'green-200',
    text: 'green-600',
    hover: 'green-700',
  },
  warning: {
    bg: 'yellow-50',
    border: 'yellow-200',
    text: 'yellow-600',
  },
  border: 'border',
  borderLight: 'muted',
};

export const spacing = {
  modal: 'p-6',
  button: 'px-4 py-2',
  buttonSm: 'px-3 py-1.5',
  input: 'px-3 py-2',
};

export const radius = {
  DEFAULT: 'rounded-lg',
  sm: 'rounded',
  md: 'rounded-lg',
  full: 'rounded-full',
};

export const focus = {
  ring: 'focus:outline-none focus:ring-2 focus:ring-primary',
};

export const modal = {
  backdrop: 'bg-black/50',
  zIndex: 'z-50',
};
