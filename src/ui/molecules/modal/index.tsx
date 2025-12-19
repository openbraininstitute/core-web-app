/* eslint-disable react/jsx-props-no-spreading */

'use client';

import { CloseOutlined } from '@ant-design/icons';
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/css-class';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'auto';
export type ModalPosition = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'custom';
export type ModalAnimation =
  | 'fade'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'scale'
  | 'none';

export interface ModalProps {
  id?: string;
  // Core props
  open: boolean;
  onClose?: () => void;
  children: ReactNode;

  // Appearance
  title?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  position?: ModalPosition;
  animation?: ModalAnimation;

  // Behavior
  closable?: boolean;
  closeIcon?: ReactNode;
  maskClosable?: boolean;
  keyboard?: boolean;
  destroyOnClose?: boolean;
  focusTrap?: boolean;

  // Styling
  className?: string;
  overlayClassName?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  closeIconClassName?: string;
  style?: CSSProperties;
  overlayStyle?: CSSProperties;

  // Dimensions
  width?: string | number;
  height?: string | number;
  maxWidth?: string | number;
  maxHeight?: string | number;

  // Advanced
  container?: HTMLElement | (() => HTMLElement);
  zIndex?: number;

  // Callbacks
  afterClose?: () => void;
  afterOpen?: () => void;
}

// Modal animations using CSS
const modalAnimations: Record<ModalAnimation, { overlay: string; modal: string }> = {
  fade: {
    overlay: 'transition-opacity duration-200',
    modal: 'transition-opacity duration-200',
  },
  slideUp: {
    overlay: 'transition-opacity duration-300',
    modal: 'transition-all duration-300 ease-out',
  },
  slideDown: {
    overlay: 'transition-opacity duration-300',
    modal: 'transition-all duration-300 ease-out',
  },
  slideLeft: {
    overlay: 'transition-opacity duration-300',
    modal: 'transition-all duration-300 ease-out',
  },
  slideRight: {
    overlay: 'transition-opacity duration-300',
    modal: 'transition-all duration-300 ease-out',
  },
  scale: {
    overlay: 'transition-opacity duration-200',
    modal: 'transition-all duration-200 ease-out',
  },
  none: {
    overlay: '',
    modal: '',
  },
};

// Get modal size classes
const getModalSizeClasses = (size: ModalSize): string => {
  const sizes = {
    sm: 'w-[400px] max-w-[90vw]',
    md: 'w-[600px] max-w-[90vw]',
    lg: 'w-[800px] max-w-[90vw]',
    xl: 'w-[1000px] max-w-[90vw]',
    full: 'w-[95vw] h-[95vh]',
    auto: 'w-auto',
  };
  return sizes[size] || sizes.md;
};

// Get modal position classes
const getModalPositionClasses = (position: ModalPosition): string => {
  const positions = {
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    top: 'top-10 left-1/2 -translate-x-1/2',
    bottom: 'bottom-10 left-1/2 -translate-x-1/2',
    left: 'top-1/2 left-10 -translate-y-1/2',
    right: 'top-1/2 right-10 -translate-y-1/2',
    custom: '',
  };
  return positions[position] || positions.center;
};

// Get animation transform styles
const getAnimationStyles = (animation: ModalAnimation, isVisible: boolean): CSSProperties => {
  if (animation === 'none') return {};

  const baseStyles: CSSProperties = {
    opacity: isVisible ? 1 : 0,
  };

  switch (animation) {
    case 'slideUp':
      return {
        ...baseStyles,
        transform: isVisible
          ? 'translateY(0) translateX(-50%)'
          : 'translateY(2rem) translateX(-50%)',
      };
    case 'slideDown':
      return {
        ...baseStyles,
        transform: isVisible
          ? 'translateY(0) translateX(-50%)'
          : 'translateY(-2rem) translateX(-50%)',
      };
    case 'slideLeft':
      return {
        ...baseStyles,
        transform: isVisible
          ? 'translateX(0) translateY(-50%)'
          : 'translateX(2rem) translateY(-50%)',
      };
    case 'slideRight':
      return {
        ...baseStyles,
        transform: isVisible
          ? 'translateX(0) translateY(-50%)'
          : 'translateX(-2rem) translateY(-50%)',
      };
    case 'scale':
      return {
        ...baseStyles,
        transform: isVisible
          ? 'scale(1) translateX(-50%) translateY(-50%)'
          : 'scale(0.95) translateX(-50%) translateY(-50%)',
      };
    default:
      return baseStyles;
  }
};

export function Modal({
  id,

  open,
  onClose,
  children,

  title,
  footer,
  size = 'md',
  position = 'center',
  animation = 'fade',

  closable = true,
  closeIcon = <CloseOutlined className="text-neutral-4 hover:text-neutral-6 transition-colors" />,
  maskClosable = true,
  keyboard = true,
  destroyOnClose = false,
  focusTrap = true,

  className,
  overlayClassName,
  bodyClassName,
  headerClassName,
  footerClassName,
  closeIconClassName,
  style,
  overlayStyle,

  width,
  height,
  maxWidth,
  maxHeight,

  container,
  zIndex = 1000,

  afterClose,
  afterOpen,
}: ModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const animationTimeout = useRef<NodeJS.Timeout | null>(null);

  // handle open/close states
  useEffect(() => {
    if (open) {
      setShouldRender(true);
      previousActiveElement.current = document.activeElement as HTMLElement;
      // small delay to trigger animation
      requestAnimationFrame(() => {
        setIsVisible(true);
        afterOpen?.();
      });
    } else {
      setIsVisible(false);
      const exitDuration = animation === 'none' ? 0 : 300;
      animationTimeout.current = setTimeout(() => {
        setShouldRender(false);
        afterClose?.();
        // restore focus
        if (previousActiveElement.current?.focus) {
          previousActiveElement.current.focus();
        }
      }, exitDuration);
    }

    return () => {
      if (animationTimeout.current) {
        clearTimeout(animationTimeout.current);
      }
    };
  }, [open, animation, afterClose, afterOpen]);

  // handle ESC key
  // TODO: to be removed when merge circuit PR (contains the useHotKey package)
  useEffect(() => {
    if (!open || !keyboard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, keyboard, onClose]);

  // handle focus trap
  useEffect(() => {
    if (!open || !focusTrap || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    };

    // focus first element
    firstFocusable?.focus();

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [open, focusTrap]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (maskClosable && e.target === e.currentTarget && onClose) {
        onClose();
      }
    },
    [maskClosable, onClose],
  );

  // prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  if (!shouldRender && (!open || destroyOnClose)) {
    return null;
  }

  // get container element
  const getContainer = () => {
    if (typeof window === 'undefined') return null;
    if (typeof container === 'function') return container();
    if (container) return container;
    return document.body;
  };

  const modalContent = (
    <div id={id} className="modal-root">
      <div
        id="modal-overlay"
        className={cn(
          'fixed inset-0 bg-black/50 backdrop-blur-sm',
          modalAnimations[animation].overlay,
          overlayClassName,
        )}
        style={{
          zIndex,
          opacity: isVisible ? 1 : 0,
          ...overlayStyle,
        }}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      <div
        id="modal-dialog"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={cn(
          'fixed rounded-lg bg-white shadow-2xl',
          getModalSizeClasses(size),
          getModalPositionClasses(position),
          modalAnimations[animation].modal,
          className,
        )}
        style={{
          zIndex: zIndex + 1,
          width,
          height,
          maxWidth,
          maxHeight,
          ...(position !== 'custom' ? getAnimationStyles(animation, isVisible) : {}),
          ...style,
        }}
      >
        {title && (
          <div
            id="modal-header"
            className={cn(
              'border-neutral-2 flex items-center justify-between px-6 py-4',
              headerClassName,
            )}
          >
            {title && (
              <div id="modal-title" className="text-neutral-6 text-lg font-semibold">
                {title}
              </div>
            )}
            {closable && (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'hover:bg-neutral-1 ml-auto rounded-md p-2 transition-colors',
                  closeIconClassName,
                )}
                aria-label="Close modal"
              >
                {closeIcon}
              </button>
            )}
          </div>
        )}

        <div
          id="modal-body"
          className={cn('max-h-[calc(90vh-8rem)] overflow-auto px-6 py-4', bodyClassName)}
        >
          {children}
        </div>

        {footer && (
          <div
            id="modal-footer"
            className={cn(
              'border-neutral-2 flex items-center justify-end gap-2 border-t px-6 py-4',
              footerClassName,
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  const containerElement = getContainer();
  if (!containerElement) return null;

  return createPortal(modalContent, containerElement);
}

// modal hook options interface
export interface ModalInstance {
  close: () => void;
  update: (options: Partial<ModalHookOptions>) => void;
}

export interface ModalHookOptions extends Omit<ModalProps, 'open' | 'onClose'> {
  onOk?: () => void | Promise<void>;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
  okButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  cancelButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

// modal Hook
export const useModal = () => {
  const [modals, setModals] = useState<Array<{ id: string; props: ModalProps }>>([]);

  const show = useCallback((options: ModalHookOptions): ModalInstance => {
    const id = Math.random().toString(36).slice(2);

    const closeModal = () => {
      setModals((prev) =>
        prev.map((m) => (m.id === id ? { ...m, props: { ...m.props, open: false } } : m)),
      );
      setTimeout(() => {
        setModals((prev) => prev.filter((m) => m.id !== id));
      }, 300);
    };

    const modalProps: ModalProps = {
      ...options,
      open: true,
      onClose: () => {
        options.onCancel?.();
        closeModal();
      },
      footer:
        options.footer !== undefined ? (
          options.footer
        ) : (
          <>
            <button
              type="button"
              className="border-neutral-2 hover:bg-neutral-1 rounded-md border px-4 py-2 transition-colors"
              onClick={() => {
                options.onCancel?.();
                closeModal();
              }}
              {...options.cancelButtonProps}
            >
              {options.cancelText || 'Cancel'}
            </button>
            <button
              type="button"
              className="bg-primary-9 hover:bg-primary-8 rounded-md px-4 py-2 text-white transition-colors"
              onClick={async () => {
                await options.onOk?.();
                closeModal();
              }}
              {...options.okButtonProps}
            >
              {options.okText || 'OK'}
            </button>
          </>
        ),
    };

    setModals((prev) => [...prev, { id, props: modalProps }]);

    return {
      close: closeModal,
      update: (newOptions: Partial<ModalHookOptions>) => {
        setModals((prev) =>
          prev.map((m) => (m.id === id ? { ...m, props: { ...m.props, ...newOptions } } : m)),
        );
      },
    };
  }, []);

  const destroy = useCallback((id?: string) => {
    if (id) {
      setModals((prev) => prev.filter((m) => m.id !== id));
    } else {
      setModals([]);
    }
  }, []);

  const ModalContainer = useCallback(() => {
    return (
      <>
        {modals.map(({ id, props }) => (
          <Modal key={id} {...props} />
        ))}
      </>
    );
  }, [modals]);

  return {
    show,
    destroy,
    ModalContainer,
  };
};

// static modal instance manager
class ModalManager {
  private static renderModal(props: ModalProps): { close: () => void } {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const cleanup = () => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };

    // dynamic import to avoid SSR issues
    import('react-dom/client').then(({ createRoot }) => {
      const root = createRoot(container);
      root.render(<Modal {...props} />);
    });

    return { close: cleanup };
  }

  static confirm(options: ModalHookOptions & { content?: ReactNode }) {
    const instance: { close: () => void } = ModalManager.renderModal({
      ...options,
      open: true,
      children: options.content || options.children,
      onClose: () => {
        options.onCancel?.();
        instance.close();
      },
      afterClose: () => {
        options.afterClose?.();
      },
    });

    return instance;
  }

  static info(options: ModalHookOptions & { content?: ReactNode }) {
    const instance: { close: () => void } = ModalManager.renderModal({
      ...options,
      open: true,
      title: options.title || 'Information',
      children: options.content || options.children,
      footer: (
        <button
          type="button"
          className="bg-primary-9 hover:bg-primary-8 rounded-md px-4 py-2 text-white transition-colors"
          onClick={async () => {
            await options.onOk?.();
            instance.close();
          }}
        >
          {options.okText || 'OK'}
        </button>
      ),
      onClose: () => {
        options.onCancel?.();
        instance.close();
      },
    });

    return instance;
  }

  static error(options: ModalHookOptions & { content?: ReactNode }) {
    return ModalManager.confirm({
      ...options,
      title: options.title || 'Error',
      className: cn('border-2 border-error', options.className),
    });
  }

  static warning(options: ModalHookOptions & { content?: ReactNode }) {
    return ModalManager.confirm({
      ...options,
      title: options.title || 'Warning',
      className: cn('border-2 border-warning', options.className),
    });
  }

  static success(options: ModalHookOptions & { content?: ReactNode }) {
    return ModalManager.confirm({
      ...options,
      title: options.title || 'Success',
      className: cn('border-2 border-accent-dark', options.className),
    });
  }
}

// export static modal methods
export const modal = {
  confirm: ModalManager.confirm.bind(ModalManager),
  info: ModalManager.info.bind(ModalManager),
  error: ModalManager.error.bind(ModalManager),
  warning: ModalManager.warning.bind(ModalManager),
  success: ModalManager.success.bind(ModalManager),
};
