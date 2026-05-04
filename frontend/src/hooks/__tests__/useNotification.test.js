import { renderHook, act } from '@testing-library/react';
import { useNotification } from '../useNotification';

describe('useNotification', () => {
  it('starts closed with empty message and info severity', () => {
    const { result } = renderHook(() => useNotification());
    expect(result.current.notification).toEqual({
      open: false,
      message: '',
      severity: 'info',
    });
  });

  it('opens with success severity via notify.success', () => {
    const { result } = renderHook(() => useNotification());
    act(() => result.current.notify.success('Saved'));
    expect(result.current.notification).toEqual({
      open: true,
      message: 'Saved',
      severity: 'success',
    });
  });

  it('opens with error severity via notify.error', () => {
    const { result } = renderHook(() => useNotification());
    act(() => result.current.notify.error('Boom'));
    expect(result.current.notification.severity).toBe('error');
    expect(result.current.notification.message).toBe('Boom');
    expect(result.current.notification.open).toBe(true);
  });

  it('opens with warning severity via notify.warning', () => {
    const { result } = renderHook(() => useNotification());
    act(() => result.current.notify.warning('Careful'));
    expect(result.current.notification.severity).toBe('warning');
  });

  it('opens with info severity via notify.info', () => {
    const { result } = renderHook(() => useNotification());
    act(() => result.current.notify.info('FYI'));
    expect(result.current.notification.severity).toBe('info');
    expect(result.current.notification.open).toBe(true);
  });

  it('preserves message and severity when closeNotification is called (only flips open)', () => {
    const { result } = renderHook(() => useNotification());
    act(() => result.current.notify.success('Yay'));
    act(() => result.current.closeNotification());
    expect(result.current.notification).toEqual({
      open: false,
      message: 'Yay',
      severity: 'success',
    });
  });

  it('replaces message and severity on subsequent notify calls', () => {
    const { result } = renderHook(() => useNotification());
    act(() => result.current.notify.success('first'));
    act(() => result.current.notify.error('second'));
    expect(result.current.notification).toEqual({
      open: true,
      message: 'second',
      severity: 'error',
    });
  });
});
