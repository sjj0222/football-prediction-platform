// 本地日志工具：替代平台 client-toolkit 的 logger
type LogFn = (...args: unknown[]) => void;

const log = (level: 'info' | 'warn' | 'error', ...args: unknown[]) => {
  const fn =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(`[${level}]`, ...args);
};

export const logger: {
  info: LogFn;
  warn: LogFn;
  error: LogFn;
} = {
  info: (...args) => log('info', ...args),
  warn: (...args) => log('warn', ...args),
  error: (...args) => log('error', ...args),
};
