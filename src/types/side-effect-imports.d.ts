// Imports que solo traen estilos o configuración (no exportan nada), ej.
// `import './calendar.css'` o `import 'moment/locale/es'`.
// Las versiones nuevas de TypeScript (la que trae VSCode) exigen una
// declaración para cada uno; sin esto el editor los marca como error aunque
// `tsc` y el build del proyecto anden bien.
declare module '*.css';
declare module 'moment/locale/*';
