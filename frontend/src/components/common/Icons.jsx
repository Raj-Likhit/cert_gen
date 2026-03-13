import React from 'react';

/**
 * Geometric Custom Icons (Replacing Lucide)
 * Designed for "Brutalist Premium" aesthetic.
 */

const Icon = ({ children, className = "w-5 h-5", ...props }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="square" 
    strokeLinejoin="miter" 
    className={className} 
    {...props}
  >
    {children}
  </svg>
);

export const IconUpload = (props) => (
  <Icon {...props}>
    <path d="M12 3v12m0-12l-4 4m4-4l4 4M4 17v4h16v-4" />
  </Icon>
);

export const IconSave = (props) => (
  <Icon {...props}>
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
    <path d="M17 21v-8H7v8M7 3v5h8" />
  </Icon>
);

export const IconPointer = (props) => (
  <Icon {...props}>
    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
  </Icon>
);

export const IconLock = (props) => (
  <Icon {...props}>
    <rect x="5" y="11" width="14" height="10" />
    <path d="M8 11V7a4 4 0 018 0v4" />
  </Icon>
);

export const IconUsers = (props) => (
  <Icon {...props}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </Icon>
);

export const IconLayout = (props) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" />
    <path d="M3 9h18M9 21V9" />
  </Icon>
);

export const IconTrash = (props) => (
  <Icon {...props}>
    <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </Icon>
);

export const IconSheet = (props) => (
  <Icon {...props}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6M8 13h8M8 17h8M10 9h1" />
  </Icon>
);

export const IconCheck = (props) => (
  <Icon {...props}>
    <path d="M20 6L9 17l-5-5" />
  </Icon>
);

export const IconAlert = (props) => (
  <Icon {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01" />
  </Icon>
);
