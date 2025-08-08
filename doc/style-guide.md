# Podcastinator Style Guide

## Color Palette

### Primary Colors
- **Primary Red**: `#ff5640` - Used for highlights, active states, call-to-action elements
- **Primary Dark**: `#192b37` - Used for buttons, text, headers, and important UI elements
- **White**: `#ffffff` - Used for cards, panels, and clean backgrounds
- **Light Gray**: `#f0f0f5` - Used for main app background and subtle dividers

### Usage Guidelines
- **Background**: Light gray (`#f0f0f5`) for main app background
- **Cards/Panels**: White (`#ffffff`) with discrete shadows
- **Buttons**: Primary dark (`#192b37`) with red hover (`#ff5640`)
- **Highlights**: Primary red (`#ff5640`) for active states, progress bars, success indicators
- **Text**: Primary dark (`#192b37`) for main text, with appropriate opacity for secondary text

## Design Principles

### Material Design
- Use discrete elevation shadows (2dp, 4dp, 8dp)
- Subtle shadow colors with low opacity
- Consistent spacing using 8px grid system
- Smooth transitions and hover effects

### Border Radius
- **Cards/Panels**: 8px (discrete rounding)
- **Buttons**: 6px
- **Input Fields**: 4px
- **Small Elements**: 4px

### Typography
- System font stack for consistency across platforms
- Clear hierarchy with appropriate font weights
- Sufficient contrast ratios for accessibility

### Interactive Elements
- Smooth transitions (0.3s ease)
- Hover states with color and elevation changes
- Focus states with appropriate outlines
- Disabled states with reduced opacity

## Component Specifications

### Cards
- Background: White (`#ffffff`)
- Shadow: 0 2px 8px rgba(0, 0, 0, 0.1)
- Border radius: 8px
- Padding: 24px

### Buttons
- Primary: Dark background (`#192b37`) with white text
- Primary hover: Red background (`#ff5640`)
- Secondary: Light background with dark text
- Border radius: 6px
- Padding: 12px 24px

### Progress Indicators
- Track: Light gray (`#f0f0f5`)
- Fill: Primary red (`#ff5640`)
- Height: 4px
- Border radius: 2px

### Form Elements
- Background: White (`#ffffff`)
- Border: 1px solid #e1e5e9
- Focus border: Primary red (`#ff5640`)
- Border radius: 4px
- Padding: 12px
