// 统一的加载动画组件

export default function Spinner({ size = 'md', color = 'white' }) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-8 h-8',
  };

  const colorClasses = {
    white: 'border-primary-foreground border-t-transparent',
    gray: 'border-muted-foreground border-t-transparent',
    primary: 'border-primary border-t-transparent',
  };

  return (
    <div
      className={`${sizeClasses[size]} ${colorClasses[color]} border-2 rounded-full animate-spin`}
    />
  );
}
