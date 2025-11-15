// 统一的加载动画组件

export default function Spinner({ size = 'md', color = 'primary' }) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-8 h-8',
  };

  const colorClasses = {
    white: 'text-primary-foreground',
    gray: 'text-muted-foreground',
    primary: 'text-primary',
    accent: 'text-accent-foreground',
  };

  const colorClass = colorClasses[color] || colorClasses.primary;

  return (
    <span className={`${sizeClasses[size]} inline-flex items-center justify-center ${colorClass}`}>
      <span className="w-full h-full border-2 border-current/30 border-t-current rounded-full animate-spin" />
    </span>
  );
}
