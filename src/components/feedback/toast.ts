import { ToastQueue, toast as heroToast } from "@heroui/react";
import type { ReactNode } from "react";
import { flushSync } from "react-dom";

type HeroToastOptions = Parameters<typeof heroToast>[1];
type HeroToastVariantOptions = Parameters<typeof heroToast.success>[1];
type HeroToastPromiseOptions<T> = Parameters<typeof heroToast.promise<T>>[1];

const DEFAULT_APP_TOAST_TIMEOUT = 2000;

type ViewTransitionHandle = {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
};

type ViewTransitionDocument = Document & {
  startViewTransition: (updateCallback: () => void) => ViewTransitionHandle;
};

function safelyRunToastTransition(fn: () => void) {
  if (
    typeof document === "undefined"
    || !("startViewTransition" in document)
  ) {
    fn();
    return;
  }

  try {
    const transition = (document as ViewTransitionDocument).startViewTransition(
      () => {
        flushSync(fn);
      },
    );

    transition.ready.catch(() => {});
    transition.updateCallbackDone.catch(() => {});
    transition.finished.catch(() => {});
  } catch {
    fn();
  }
}

export const appToastQueue = new ToastQueue({
  maxVisibleToasts: 1,
  wrapUpdate: safelyRunToastTransition,
});

function withAppToastTimeout(options?: HeroToastOptions): HeroToastOptions & {
  timeout: number;
} {
  if (options?.isLoading && options.timeout === 0) {
    return { ...options, timeout: 0 };
  }

  return {
    ...options,
    timeout: DEFAULT_APP_TOAST_TIMEOUT,
  };
}

function addToast(message: ReactNode, options?: HeroToastOptions) {
  const nextOptions = withAppToastTimeout(options);

  appToastQueue.clear();

  return appToastQueue.add(
    {
      title: message,
      description: nextOptions?.description,
      indicator: nextOptions?.indicator,
      variant: nextOptions?.variant ?? "default",
      actionProps: nextOptions?.actionProps,
      isLoading: nextOptions?.isLoading,
    },
    {
      timeout: nextOptions?.timeout,
      onClose: () => {
        requestAnimationFrame(() => {
          nextOptions?.onClose?.();
        });
      },
    },
  );
}

function appToast(message: ReactNode, options?: HeroToastOptions) {
  return addToast(message, options);
}

appToast.success = (message: ReactNode, options?: HeroToastVariantOptions) => {
  return addToast(message, { ...options, variant: "success" });
};

appToast.danger = (message: ReactNode, options?: HeroToastVariantOptions) => {
  return addToast(message, { ...options, variant: "danger" });
};

appToast.info = (message: ReactNode, options?: HeroToastVariantOptions) => {
  return addToast(message, { ...options, variant: "accent" });
};

appToast.warning = (message: ReactNode, options?: HeroToastVariantOptions) => {
  return addToast(message, { ...options, variant: "warning" });
};

appToast.promise = <T>(
  promise: Promise<T> | (() => Promise<T>),
  options: HeroToastPromiseOptions<T>,
) => {
  const promiseValue = typeof promise === "function" ? promise() : promise;
  const loadingId = appToast(options.loading, {
    isLoading: true,
    timeout: 0,
  });

  promiseValue
    .then((data) => {
      const successMessage = typeof options.success === "function"
        ? options.success(data)
        : options.success;
      appToast.success(successMessage);
    })
    .catch((error: Error) => {
      const errorMessage = typeof options.error === "function"
        ? options.error(error)
        : options.error;
      appToast.danger(errorMessage);
    });

  return loadingId;
};

appToast.getQueue = () => appToastQueue.getQueue();
appToast.close = (key: string) => appToastQueue.close(key);
appToast.pauseAll = () => appToastQueue.pauseAll();
appToast.resumeAll = () => appToastQueue.resumeAll();
appToast.clear = () => appToastQueue.clear();

export const toast = appToast;
