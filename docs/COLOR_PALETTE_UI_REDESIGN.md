# Color Palette UI Redesign Plan

## Executive Summary
Redesign the "自配色列表" (Custom Color List) dialog to provide better color organization and navigation through dual parallel views: HSL Color Space View and Interactive Color Wheel Navigator.

## Problem Statement

### Current Issues
1. **Random Color Arrangement**: Colors within categories appear randomly ordered
2. **Difficult Navigation**: Hard to find colors based on visual similarity
3. **No Color Relationships**: Cannot see how colors relate to each other
4. **Limited Browsing**: Must scroll through entire list to find specific hues

### User Needs
- Quickly locate colors by hue/tone
- See color relationships and gradients
- Find similar colors for scheme creation
- Better visual organization beyond categories

## Proposed Solution: Dual-View Color Selection System

### Overview
Two parallel, synchronized views that allow users to navigate colors both analytically (HSL) and intuitively (Color Wheel):

```
┌─────────────────────────────────────────────────────────┐
│ 自配色列表 - Custom Color Palette                         │
├─────────────────────────────────────────────────────────┤
│ [Tab: HSL View] [Tab: Color Wheel] [Tab: List View]     │
├─────────────────────────────────────────────────────────┤
│                    Active View Content                    │
└─────────────────────────────────────────────────────────┘
```

## View 1: HSL Color Space View (Photoshop-Style)

### Design Concept
```
┌──────────────────────────────────────────────┐
│ Hue Slider (0-360°)                         │
│ [================●===========]               │
├──────────────────────────────────────────────┤
│         Saturation →                         │
│    ┌─────────────────────────────┐          │
│  L │ □ □ □ □ □ □ □ □ □ □         │ 100%    │
│  i │ □ □ ● □ □ □ □ □ □ □         │         │
│  g │ □ □ □ □ ● □ □ □ □ □         │         │
│  h │ □ □ □ □ □ □ ● □ □ □         │         │
│  t │ □ □ □ □ □ □ □ □ □ □         │         │
│  ↓ │ □ □ □ □ □ □ □ □ □ □         │ 0%      │
│    └─────────────────────────────┘          │
│     0%                      100%             │
├──────────────────────────────────────────────┤
│ Selected: 湖蓝 (ES-001)                      │
│ RGB: 70, 130, 180 | HSL: 207°, 44%, 49%    │
└──────────────────────────────────────────────┘
```

### Technical Implementation

#### 1. RGB to HSL Conversion
```javascript
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}
```

#### 2. Color Grid Generation
```javascript
// Generate 10x10 grid for selected hue
function generateColorGrid(hue) {
    const grid = [];
    for (let l = 0; l <= 100; l += 10) {
        const row = [];
        for (let s = 0; s <= 100; s += 10) {
            row.push({
                hsl: { h: hue, s: s, l: l },
                rgb: hslToRgb(hue, s, l),
                customColors: findMatchingColors(hue, s, l, tolerance: 10)
            });
        }
        grid.push(row);
    }
    return grid;
}
```

### Features
1. **Hue Slider**: 360° continuous selection with color gradient background
2. **S-L Matrix**: 10x10 grid showing saturation-lightness variations
3. **Color Dots**: Actual custom colors plotted on grid
4. **Hover Preview**: Show color details on hover
5. **Click Selection**: Select color for use

### User Interaction Flow
1. Drag hue slider to select base hue (0-360°)
2. Grid updates to show all S-L variations for that hue
3. Custom colors appear as dots on their HSL positions
4. Hover to preview, click to select

## View 2: Interactive Color Wheel Navigator

### Design Concept
```
┌────────────────────────────────────────────┐
│           Color Wheel Navigator            │
├────────────────────────────────────────────┤
│                                            │
│            ┌─────────────┐                │
│         ╱                   ╲              │
│       ╱    ● ●   ●   ● ●     ╲            │
│      │   ●               ●    │           │
│      │  ●    ┌───────┐    ●   │           │
│      │ ●     │       │     ●  │           │
│      │ ●     │   ⊕   │     ●  │           │
│      │ ●     │       │     ●  │           │
│      │  ●    └───────┘    ●   │           │
│      │   ●               ●    │           │
│       ╲    ● ●   ●   ● ●     ╱            │
│         ╲                   ╱              │
│            └─────────────┘                │
│                                            │
├────────────────────────────────────────────┤
│ Filter: [All] [Near Selection] [Category] │
│ Distance: [========●=] 15 ΔE              │
└────────────────────────────────────────────┘
```

### Technical Implementation

#### 1. Polar Coordinate Mapping
```javascript
function mapColorToWheel(hsl) {
    const angle = hsl.h; // 0-360° maps directly
    const radius = hsl.s / 100; // Saturation = distance from center
    
    // Convert to Cartesian
    const x = centerX + radius * maxRadius * Math.cos(angle * Math.PI / 180);
    const y = centerY + radius * maxRadius * Math.sin(angle * Math.PI / 180);
    
    // Size based on lightness (darker = smaller)
    const size = 4 + (hsl.l / 100) * 8;
    
    return { x, y, size, angle, radius };
}
```

#### 2. Delta E Color Distance (CIE2000)
```javascript
function deltaE2000(lab1, lab2) {
    // CIE2000 formula implementation
    const kL = 1, kC = 1, kH = 1;
    
    const deltaL = lab2.L - lab1.L;
    const Lbar = (lab1.L + lab2.L) / 2;
    
    const C1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
    const C2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
    const Cbar = (C1 + C2) / 2;
    
    // ... (full CIE2000 implementation)
    
    return Math.sqrt(
        Math.pow(deltaL / (kL * SL), 2) +
        Math.pow(deltaC / (kC * SC), 2) +
        Math.pow(deltaH / (kH * SH), 2) +
        RT * (deltaC / (kC * SC)) * (deltaH / (kH * SH))
    );
}
```

#### 3. Proximity Filtering
```javascript
function filterByProximity(colors, centerColor, maxDeltaE) {
    const centerLab = rgbToLab(centerColor.rgb);
    
    return colors.filter(color => {
        const colorLab = rgbToLab(color.rgb);
        const distance = deltaE2000(centerLab, colorLab);
        return distance <= maxDeltaE;
    });
}
```

### Features
1. **360° Color Wheel**: HSL-based circular layout
2. **Interactive Points**: Each custom color as clickable dot
3. **Proximity Filter**: Show only colors within ΔE distance
4. **Hover Details**: Color info tooltip
5. **Sector Highlight**: Visual hue range indication
6. **Dynamic Sizing**: Dot size indicates lightness

### User Interaction Flow
1. Click on wheel to select hue region
2. Adjust proximity slider (ΔE 0-100)
3. Colors outside range fade/hide
4. Hover for details, click to select
5. Optional: Drag to pan, scroll to zoom

## View 3: Enhanced List View (Current, Improved)

### Improvements to Current View
1. **Sort Options**: By hue, lightness, saturation, creation date
2. **Color Indicators**: Small color wheel position icon
3. **Relationship Lines**: Connect similar colors
4. **Quick Filters**: By hue range, lightness range

## Implementation Architecture

### Component Structure
```
color-palette-dialog/
├── ColorPaletteDialog.vue       # Main container
├── views/
│   ├── HSLColorSpaceView.vue    # HSL grid view
│   ├── ColorWheelView.vue       # Wheel navigator
│   └── EnhancedListView.vue     # Improved list
├── components/
│   ├── HueSlider.vue            # Hue selection slider
│   ├── ColorGrid.vue            # S-L matrix grid
│   ├── ColorWheel.vue           # Wheel canvas
│   └── ColorCard.vue            # Color display card
├── utils/
│   ├── colorConversion.js       # RGB/HSL/LAB conversions
│   ├── colorDistance.js         # Delta E calculations
│   └── colorMapping.js          # Coordinate mappings
└── styles/
    └── color-palette.css        # Component styles
```

### Data Flow
```javascript
// Shared state between views
const colorPaletteState = {
    colors: [],           // All custom colors
    selectedColor: null,  // Currently selected
    hoveredColor: null,   // Currently hovered
    selectedHue: 180,     // Current hue (HSL view)
    proximityRange: 15,   // ΔE range (wheel view)
    viewMode: 'hsl',      // Current view mode
    filters: {
        category: null,
        searchTerm: '',
        hueRange: [0, 360],
        lightnessRange: [0, 100]
    }
};
```

### API Integration
```javascript
// Extend existing API
async loadColorsWithMetadata() {
    const colors = await fetch('/api/custom-colors');
    
    // Enrich with calculated properties
    return colors.map(color => ({
        ...color,
        rgb: extractRgbFromImage(color.image_path),
        hsl: rgbToHsl(color.rgb),
        lab: rgbToLab(color.rgb),
        wheelPosition: mapColorToWheel(color.hsl)
    }));
}
```

## Technical Requirements

### Color Science Libraries
1. **Color Conversion**: RGB ↔ HSL ↔ LAB conversions
2. **Delta E**: CIE76 for speed, CIE2000 for accuracy
3. **Color Extraction**: Get dominant color from images

### Performance Optimizations
1. **Virtual Scrolling**: For large color lists
2. **Canvas Rendering**: Hardware-accelerated wheel
3. **Debounced Updates**: Smooth slider interactions
4. **Cached Calculations**: Store HSL/LAB values

### Browser Compatibility
- **Canvas API**: For color wheel rendering
- **CSS Grid**: For HSL matrix layout
- **Pointer Events**: For touch/mouse interaction
- **ResizeObserver**: For responsive layouts

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create component structure
- [ ] Implement color conversion utilities
- [ ] Set up shared state management
- [ ] Basic dialog with tab navigation

### Phase 2: HSL View (Week 2)
- [ ] Build hue slider component
- [ ] Create S-L grid matrix
- [ ] Plot custom colors on grid
- [ ] Implement selection/hover

### Phase 3: Color Wheel (Week 3)
- [ ] Canvas-based wheel rendering
- [ ] Color point plotting
- [ ] Proximity filtering with Delta E
- [ ] Interactive selection

### Phase 4: Integration (Week 4)
- [ ] View synchronization
- [ ] Enhanced list view updates
- [ ] Performance optimization
- [ ] Testing and refinement

## User Experience Enhancements

### Visual Feedback
1. **Smooth Transitions**: Animate view switches
2. **Hover Effects**: Enlarge dots, show connections
3. **Selection Indication**: Pulse animation
4. **Loading States**: Skeleton screens

### Accessibility
1. **Keyboard Navigation**: Arrow keys for grid/wheel
2. **Screen Reader**: ARIA labels for colors
3. **High Contrast**: Mode for better visibility
4. **Focus Indicators**: Clear selection outline

### Responsive Design
1. **Desktop**: Full dual-view layout
2. **Tablet**: Single view with switcher
3. **Mobile**: Simplified wheel/list only

## Success Metrics

### Quantitative
- **Selection Time**: <5 seconds to find desired color
- **Click Reduction**: 50% fewer clicks to select
- **Load Performance**: <100ms view switch

### Qualitative
- **User Satisfaction**: Easier color discovery
- **Visual Organization**: Clear color relationships
- **Intuitive Navigation**: Minimal learning curve

## Risk Mitigation

### Technical Risks
1. **Performance**: Large color sets may lag
   - Solution: Virtual rendering, pagination
2. **Color Accuracy**: Image extraction varies
   - Solution: Manual color override option
3. **Browser Support**: Canvas API limitations
   - Solution: Fallback to CSS-based view

### UX Risks
1. **Complexity**: Too many options confuse users
   - Solution: Progressive disclosure
2. **Learning Curve**: New interface paradigm
   - Solution: Tooltips and guided tour
3. **Data Loss**: Accidental color changes
   - Solution: Undo/redo functionality

## Future Enhancements

### Version 2.0
1. **AI Suggestions**: ML-based color recommendations
2. **Palette Generator**: Auto-create harmonious schemes
3. **Color History**: Track selection patterns
4. **Export Options**: SVG/PNG color wheels

### Version 3.0
1. **3D Color Space**: LAB space visualization
2. **Color Blindness**: Simulation modes
3. **Team Sharing**: Collaborative palettes
4. **Mobile App**: Native color picker

## Conclusion

This dual-view system addresses current limitations while providing both analytical (HSL) and intuitive (Wheel) navigation methods. The implementation is modular, allowing phased development and future enhancements.

## Appendix: Color Science References

### Delta E Formulas
- **CIE76**: Simple Euclidean distance in LAB space
- **CIE94**: Perceptual improvements for textiles
- **CIE2000**: Most accurate, industry standard

### Color Space Conversions
- **RGB to HSL**: Cylindrical representation
- **RGB to LAB**: Perceptual uniformity
- **HSL to RGB**: Display rendering

### Implementation Libraries
- **chroma.js**: Color manipulation
- **color-diff**: Delta E calculations
- **canvas-color-picker**: Wheel rendering

## Code Examples

### Complete HSL Grid Component
```vue
<template>
  <div class="hsl-grid-view">
    <div class="hue-slider-container">
      <input 
        type="range" 
        v-model="selectedHue"
        min="0" 
        max="360"
        class="hue-slider"
        :style="hueSliderStyle"
      >
      <span class="hue-value">{{ selectedHue }}°</span>
    </div>
    
    <div class="sl-grid">
      <div 
        v-for="(row, l) in colorGrid" 
        :key="l"
        class="grid-row"
      >
        <div 
          v-for="(cell, s) in row"
          :key="s"
          class="grid-cell"
          :style="getCellStyle(cell)"
          @click="selectColor(cell)"
          @mouseenter="hoverColor(cell)"
        >
          <div 
            v-if="cell.hasCustomColor"
            class="custom-color-dot"
            :title="cell.colorName"
          />
        </div>
      </div>
    </div>
    
    <div class="color-info" v-if="hoveredColor">
      <div class="color-preview" :style="previewStyle"></div>
      <div class="color-details">
        <p>{{ hoveredColor.name }}</p>
        <p>HSL: {{ hoveredColor.hsl.h }}°, {{ hoveredColor.hsl.s }}%, {{ hoveredColor.hsl.l }}%</p>
      </div>
    </div>
  </div>
</template>
```

### Complete Color Wheel Component
```javascript
class ColorWheel {
    constructor(canvas, colors) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.colors = colors;
        this.centerX = canvas.width / 2;
        this.centerY = canvas.height / 2;
        this.radius = Math.min(this.centerX, this.centerY) - 20;
    }
    
    draw() {
        // Draw wheel background
        for (let angle = 0; angle < 360; angle++) {
            for (let r = 0; r <= this.radius; r++) {
                const hsl = {
                    h: angle,
                    s: (r / this.radius) * 100,
                    l: 50
                };
                const rgb = hslToRgb(hsl);
                
                const x = this.centerX + r * Math.cos(angle * Math.PI / 180);
                const y = this.centerY + r * Math.sin(angle * Math.PI / 180);
                
                this.ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
                this.ctx.fillRect(x, y, 2, 2);
            }
        }
        
        // Plot custom colors
        this.colors.forEach(color => {
            const pos = this.mapColorToWheel(color.hsl);
            this.drawColorDot(pos.x, pos.y, color);
        });
    }
    
    mapColorToWheel(hsl) {
        const angle = hsl.h * Math.PI / 180;
        const distance = (hsl.s / 100) * this.radius;
        
        return {
            x: this.centerX + distance * Math.cos(angle),
            y: this.centerY + distance * Math.sin(angle)
        };
    }
    
    drawColorDot(x, y, color) {
        // Outer ring
        this.ctx.beginPath();
        this.ctx.arc(x, y, 8, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Inner color
        this.ctx.beginPath();
        this.ctx.arc(x, y, 6, 0, 2 * Math.PI);
        this.ctx.fillStyle = `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`;
        this.ctx.fill();
    }
    
    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Find nearest color
        let minDistance = Infinity;
        let selectedColor = null;
        
        this.colors.forEach(color => {
            const pos = this.mapColorToWheel(color.hsl);
            const distance = Math.sqrt(
                Math.pow(x - pos.x, 2) + 
                Math.pow(y - pos.y, 2)
            );
            
            if (distance < minDistance && distance < 10) {
                minDistance = distance;
                selectedColor = color;
            }
        });
        
        return selectedColor;
    }
}
```

## Resources

### Documentation
- [CIE Color Space](https://en.wikipedia.org/wiki/CIE_1931_color_space)
- [Delta E](https://en.wikipedia.org/wiki/Color_difference)
- [HSL Color Model](https://en.wikipedia.org/wiki/HSL_and_HSV)

### Tools
- [Color Calculator](https://colorjs.io/)
- [Delta E Calculator](http://colormine.org/delta-e-calculator)
- [HSL Picker](https://hslpicker.com/)

### Libraries
- [Chroma.js](https://gka.github.io/chroma.js/)
- [Color Thief](https://lokeshdhakar.com/projects/color-thief/)
- [TinyColor](https://github.com/bgrins/TinyColor)