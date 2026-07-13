// TypeScript Declarations for CSS styling modules and global CSS files

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}
