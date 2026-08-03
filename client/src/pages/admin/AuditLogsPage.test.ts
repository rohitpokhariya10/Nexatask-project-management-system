import { auditDateBoundary } from './AuditLogsPage';

it('converts audit date filters to inclusive local-day boundaries', () => {
  const start = new Date(auditDateBoundary('2026-08-03', false)!);
  const end = new Date(auditDateBoundary('2026-08-03', true)!);

  expect([
    start.getHours(),
    start.getMinutes(),
    start.getSeconds(),
    start.getMilliseconds(),
  ]).toEqual([0, 0, 0, 0]);
  expect([end.getHours(), end.getMinutes(), end.getSeconds(), end.getMilliseconds()]).toEqual([
    23, 59, 59, 999,
  ]);
  expect(auditDateBoundary('2026-02-30', true)).toBeUndefined();
});
