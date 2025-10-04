// 统一的操作按钮组件
// 用于替代文字符号按钮，使用图标，更加美观和一致

const ActionButtonComponent = {
    name: 'ActionButton',
    // Simple template without dynamic components
    render() {
        const h = Vue.h;
        const icons = ElementPlusIconsVue;
        
        // Map icon names to components
        const iconMap = {
            'plus': icons.Plus,
            'minus': icons.Minus,
            'delete': icons.Delete,
            'edit': icons.Edit,
            'close': icons.Close,
            'check': icons.Check,
            'arrow-up': icons.ArrowUp,
            'arrow-down': icons.ArrowDown,
            'upload': icons.Upload,
            'picture': icons.Picture,
            'clear': icons.CircleClose
        };
        
        const IconComponent = iconMap[this.icon] || icons.Plus;
        
        return h(
            ElementPlus.ElButton,
            {
                type: this.type,
                size: this.size,
                circle: true,
                disabled: this.disabled,
                style: this.buttonStyle,
                onClick: (event) => this.$emit('click', event)
            },
            {
                default: () => h(
                    ElementPlus.ElIcon,
                    null,
                    { default: () => h(IconComponent) }
                )
            }
        );
    },
    
    props: {
        // 按钮类型
        type: {
            type: String,
            default: 'primary'
        },
        
        // 按钮尺寸
        size: {
            type: String,
            default: 'small'
        },
        
        // 图标名称
        icon: {
            type: String,
            required: true
        },
        
        // 是否禁用
        disabled: {
            type: Boolean,
            default: false
        },
        
        // 自定义尺寸 (优先级高于size)
        width: {
            type: [String, Number],
            default: null
        },
        
        height: {
            type: [String, Number],
            default: null
        }
    },
    
    emits: ['click'],
    
    computed: {
        // 计算按钮样式
        buttonStyle() {
            const style = {};
            
            // 自定义尺寸
            if (this.width) {
                style.width = typeof this.width === 'number' ? `${this.width}px` : this.width;
            }
            if (this.height) {
                style.height = typeof this.height === 'number' ? `${this.height}px` : this.height;
            }
            
            // 默认统一尺寸
            if (!this.width && !this.height) {
                style.width = '22px';
                style.height = '22px';
            }
            
            style.padding = '0';
            
            return style;
        }
    }
};

// 注册为全局组件
if (typeof window !== 'undefined') {
    window.ActionButtonComponent = ActionButtonComponent;
}