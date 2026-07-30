export type PushEnableFailure =
  | "UNSUPPORTED_BROWSER"
  | "PERMISSION_DENIED"
  | "SERVICE_WORKER_UNAVAILABLE"
  | "SUBSCRIPTION_FAILED";

export type PushFlowDependencies<R, S> = {
  permission: () => Promise<NotificationPermission>;
  registration: () => Promise<R | null>;
  register: () => Promise<R | null>;
  subscribe: (registration: R) => Promise<S | null>;
  supported: () => boolean;
};

/** Browser-independent orchestration; sound deliberately is not a dependency. */
export async function runPushEnableFlow<R, S>(dependencies: PushFlowDependencies<R, S>) {
  if (!dependencies.supported()) return { ok: false as const, reason: "UNSUPPORTED_BROWSER" as const };
  if ((await dependencies.permission()) !== "granted") return { ok: false as const, reason: "PERMISSION_DENIED" as const };
  const registration = (await dependencies.registration()) ?? (await dependencies.register());
  if (!registration) return { ok: false as const, reason: "SERVICE_WORKER_UNAVAILABLE" as const };
  try {
    const subscription = await dependencies.subscribe(registration);
    return subscription
      ? { ok: true as const, subscription }
      : { ok: false as const, reason: "SUBSCRIPTION_FAILED" as const };
  } catch {
    return { ok: false as const, reason: "SUBSCRIPTION_FAILED" as const };
  }
}
