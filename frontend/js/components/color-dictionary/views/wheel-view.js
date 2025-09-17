(function(window) {
    'use strict';

    const helpers = window.ColorDictionaryHelpers || { getColorStyle: () => null };

    const WheelDictionaryView = {
    template: `
        <div class="color-wheel-view">
            <div class="wheel-container" :class="{ 'dragging': isDragging }">
                <canvas 
                    ref="wheelCanvas" 
                    width="600" 
                    height="600"
                    class="wheel-canvas"
                    @mousedown="handleMouseDown"
                    @mousemove="handleMouseMove"
                    @mouseup="handleMouseUp"
                    @mouseleave="handleMouseLeave"
                ></canvas>
                <!-- Overlay color dots on the wheel -->
                <div class="wheel-colors-overlay" :style="{ pointerEvents: isDragging ? 'none' : 'none' }">
                    <div 
                        v-for="color in positionedColors"
                        :key="color.id"
                        class="wheel-color-dot"
                        :style="{
                            left: color.x + 'px',
                            top: color.y + 'px',
                            background: getColorStyle(color) || 'transparent',
                            pointerEvents: isDragging ? 'none' : 'all'
                        }"
                        :class="{ 
                            'selected': isSelected(color),
                            'blank': !getColorStyle(color),
                            'matched': isMatched(color)
                        }"
                        @click="selectColor(color)"
                        :title="color.color_code + ' - ' + color.color_name"
                    >
                        <span v-if="!getColorStyle(color)" class="blank-dot">×</span>
                    </div>
                </div>
                <!-- Click indicator -->
                <div v-if="clickedPoint" 
                     class="click-indicator"
                     :class="{ 'dragging': isDragging }"
                     :style="{
                         left: clickedPoint.x + 'px',
                         top: clickedPoint.y + 'px'
                     }">
                </div>
            </div>
            <div class="wheel-controls">
                <div class="control-row">
                    <label>邻近范围 (ΔE): {{ proximityRange }}</label>
                    <el-slider 
                        v-model="proximityRange" 
                        :min="0" 
                        :max="50"
                        :step="1"
                    ></el-slider>
                </div>
                <div class="control-row">
                    <el-checkbox v-model="showOnlyWithRGB">
                        仅显示有RGB数据的颜色
                    </el-checkbox>
                </div>
                <div class="stats">
                    显示 {{ visibleColors.length }} / {{ colors.length }} 个颜色
                    <span v-if="matchedColors.length > 0">
                        | 命中 {{ matchedColors.length }} 个颜色
                    </span>
                </div>
            </div>
            
            <!-- Matched colors section -->
            <div class="matched-colors-section" v-if="matchedColors.length > 0">
                <h4>命中颜色 (ΔE ≤ {{ proximityRange }})</h4>
                <div class="color-chips">
                    <div 
                        v-for="color in matchedColors"
                        :key="color.id"
                        class="color-chip-80"
                        @click="selectColor(color)"
                        :class="{ 'selected': isSelected(color) }"
                    >
                        <div class="color-preview" 
                             :class="{ 'blank-color': !getColorStyle(color) }"
                             :style="getColorStyle(color) ? { background: getColorStyle(color) } : {}">
                            <span v-if="!getColorStyle(color)" class="blank-text">无</span>
                        </div>
                        <div class="color-code">{{ color.color_code }}</div>
                        <div class="delta-e-value">ΔE: {{ color.deltaE.toFixed(1) }}</div>
                    </div>
                </div>
            </div>
        </div>
    `,
    
    props: {
        colors: Array,
        selectedColor: Object
    },
    
    data() {
        return {
            proximityRange: 15,
            showOnlyWithRGB: false,
            ctx: null,
            centerX: 300,
            centerY: 300,
            radius: 270,
            clickedPoint: null,
            clickedColor: null,
            matchedColors: [],
            isDragging: false,
            dragStart: null
        };
    },
    
    computed: {
        visibleColors() {
            let filtered = this.colors;
            
            if (this.showOnlyWithRGB) {
                filtered = filtered.filter(c => 
                    c.rgb_r != null && c.rgb_g != null && c.rgb_b != null
                );
            }
            
            return filtered;
        },
        
        positionedColors() {
            // Position colors on the wheel based on their HSL values
            return this.visibleColors.map(color => {
                if (!color.hsl || color.hsl.h === undefined) {
                    // Place colors without HSL in the center
                    return {
                        ...color,
                        x: this.centerX + (Math.random() - 0.5) * 40,
                        y: this.centerY + (Math.random() - 0.5) * 40
                    };
                }
                
                // Calculate position based on hue and saturation
                const angle = (color.hsl.h * Math.PI) / 180;
                const distance = (color.hsl.s / 100) * this.radius * 0.9; // 90% of radius max
                
                return {
                    ...color,
                    x: this.centerX + Math.cos(angle) * distance,
                    y: this.centerY + Math.sin(angle) * distance
                };
            });
        }
    },
    
    watch: {
        proximityRange() {
            // Recalculate matched colors when range changes
            if (this.clickedColor) {
                this.updateMatchedColors();
            }
        }
    },
    
    mounted() {
        this.$nextTick(() => {
            this.initWheel();
        });
    },
    
    methods: {
        initWheel() {
            this.wheelCanvas = this.$refs.wheelCanvas;
            if (!this.wheelCanvas) return;
            
            this.ctx = this.wheelCanvas.getContext('2d');
            this.drawWheelBackground();
        },
        
        drawWheelBackground() {
            const ctx = this.ctx;
            if (!ctx) return;
            
            // Clear canvas
            ctx.clearRect(0, 0, 600, 600);
            
            // Draw color wheel gradient
            for (let angle = 0; angle < 360; angle += 2) {
                const startAngle = (angle - 1) * Math.PI / 180;
                const endAngle = (angle + 1) * Math.PI / 180;
                
                // Create gradient from center to edge
                const gradient = ctx.createRadialGradient(
                    this.centerX, this.centerY, 0,
                    this.centerX, this.centerY, this.radius
                );
                
                // HSL color at this angle
                gradient.addColorStop(0, `hsl(${angle}, 0%, 50%)`);
                gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
                
                // Draw wedge
                ctx.beginPath();
                ctx.moveTo(this.centerX, this.centerY);
                ctx.arc(this.centerX, this.centerY, this.radius, startAngle, endAngle);
                ctx.closePath();
                ctx.fillStyle = gradient;
                ctx.fill();
            }
            
            // Draw border
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, this.radius, 0, 2 * Math.PI);
            ctx.stroke();
        },
        
        selectColor(color) {
            this.$emit('select', color);
        },
        
        isSelected(color) {
            return this.selectedColor && this.selectedColor.id === color.id;
        },
        
        getColorStyle(color) {
            return helpers.getColorStyle(color);
        },
        
        handleMouseDown(event) {
            const rect = this.wheelCanvas.getBoundingClientRect();
            // Calculate the scale factor between actual canvas size and CSS display size
            const scaleX = this.wheelCanvas.width / rect.width;
            const scaleY = this.wheelCanvas.height / rect.height;
            
            // Apply scale correction to get accurate canvas coordinates
            const x = (event.clientX - rect.left) * scaleX;
            const y = (event.clientY - rect.top) * scaleY;
            
            // Check if click is within the wheel
            const dx = x - this.centerX;
            const dy = y - this.centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > this.radius) {
                // Click outside the wheel
                this.clickedPoint = null;
                this.clickedColor = null;
                this.matchedColors = [];
                return;
            }
            
            // Store clicked point and start dragging
            this.clickedPoint = { x, y };
            this.isDragging = true;
            this.dragStart = { x: event.clientX, y: event.clientY };
            
            // Update color at this position
            this.updateColorAtPosition(x, y);
        },
        
        handleMouseMove(event) {
            if (!this.isDragging || !this.clickedPoint) return;
            
            const rect = this.wheelCanvas.getBoundingClientRect();
            const scaleX = this.wheelCanvas.width / rect.width;
            const scaleY = this.wheelCanvas.height / rect.height;
            
            const x = (event.clientX - rect.left) * scaleX;
            const y = (event.clientY - rect.top) * scaleY;
            
            // Check if new position is within the wheel
            const dx = x - this.centerX;
            const dy = y - this.centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.radius) {
                // Update position
                this.clickedPoint = { x, y };
                
                // Update color at new position
                this.updateColorAtPosition(x, y);
            }
        },
        
        handleMouseUp(event) {
            this.isDragging = false;
            this.dragStart = null;
        },
        
        handleMouseLeave(event) {
            this.isDragging = false;
            this.dragStart = null;
        },
        
        updateColorAtPosition(x, y) {
            // Calculate HSL from position
            const dx = x - this.centerX;
            const dy = y - this.centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const angle = Math.atan2(dy, dx);
            const hue = (angle * 180 / Math.PI + 360) % 360;
            const saturation = (distance / this.radius) * 100;
            const lightness = 50; // Fixed lightness for wheel
            
            // Create clicked color object
            this.clickedColor = {
                hsl: { h: hue, s: saturation, l: lightness },
                hex: `hsl(${hue}, ${saturation}%, ${lightness}%)`
            };
            
            // Convert to RGB for delta E calculation
            const rgb = this.hslToRgb(hue / 360, saturation / 100, lightness / 100);
            this.clickedColor.rgb_r = Math.round(rgb.r * 255);
            this.clickedColor.rgb_g = Math.round(rgb.g * 255);
            this.clickedColor.rgb_b = Math.round(rgb.b * 255);
            
            // Find matched colors
            this.updateMatchedColors();
            
            // Draw click indicator
            this.drawClickIndicator();
        },
        
        updateMatchedColors() {
            if (!this.clickedColor) {
                this.matchedColors = [];
                return;
            }
            
            // Calculate delta E for all visible colors
            const matched = [];
            
            for (const color of this.visibleColors) {
                if (color.rgb_r != null && color.rgb_g != null && color.rgb_b != null) {
                    const deltaE = this.calculateDeltaE(
                        this.clickedColor,
                        color
                    );
                    
                    if (deltaE <= this.proximityRange) {
                        matched.push({
                            ...color,
                            deltaE: deltaE
                        });
                    }
                }
            }
            
            // Sort by delta E
            matched.sort((a, b) => a.deltaE - b.deltaE);
            
            this.matchedColors = matched;
        },
        
        isMatched(color) {
            return this.matchedColors.some(m => m.id === color.id);
        },
        
        calculateDeltaE(color1, color2) {
            // Using CIE76 formula for simplicity
            // Convert RGB to LAB would be more accurate but this is sufficient
            const r1 = color1.rgb_r || 0;
            const g1 = color1.rgb_g || 0;
            const b1 = color1.rgb_b || 0;
            
            const r2 = color2.rgb_r || 0;
            const g2 = color2.rgb_g || 0;
            const b2 = color2.rgb_b || 0;
            
            // Simple Euclidean distance in RGB space
            // Scale to approximate delta E range (0-100)
            const dr = r1 - r2;
            const dg = g1 - g2;
            const db = b1 - b2;
            
            return Math.sqrt(dr * dr + dg * dg + db * db) * 0.4;
        },
        
        hslToRgb(h, s, l) {
            let r, g, b;
            
            if (s === 0) {
                r = g = b = l; // achromatic
            } else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };
                
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }
            
            return { r, g, b };
        },
        
        drawClickIndicator() {
            // Remove canvas drawing - we're using the div indicator instead
            // Just redraw the wheel background to clear any previous canvas marks
            if (this.ctx) {
                this.drawWheelBackground();
            }
        }
    }
};

    window.ColorDictionaryViews = window.ColorDictionaryViews || {};
    window.ColorDictionaryViews.WheelDictionaryView = WheelDictionaryView;
})(window);
