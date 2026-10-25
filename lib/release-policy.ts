export type ReleaseEnvironment = {
  RELEASE_MODE?: string;
  HEALTH_PROFILE_COLLECTION?: string;
  PRESCRIPTION_AI_ENABLED?: string;
  GROUNDED_ASSISTANT_ENABLED?: string;
};

// Missing or misspelled configuration must never open patient workflows.
export function releasePolicy(config: ReleaseEnvironment = {}) {
  const core = config.RELEASE_MODE === "CORE";
  return {
    mode: core ? "CORE" as const : "INFORMATION_ONLY" as const,
    registration: core,
    availabilityRequests: core,
    healthCollection: core && config.HEALTH_PROFILE_COLLECTION === "true",
    prescriptionAI: core && config.PRESCRIPTION_AI_ENABLED === "true",
    assistant: core && config.GROUNDED_ASSISTANT_ENABLED === "true",
  };
}
export type ReleasePolicy = ReturnType<typeof releasePolicy>;

// Existing account access, cancellation, pickup completion, stock maintenance and
// privacy rights stay available. New location sharing is a core-only collection.
export function requiresCore(action: string) {
  return ["register", "oauth", "search", "reserve", "reply", "register-pharmacy", "share-location"].includes(action);
}

export function healthUpdateAllowed(previous: Record<string, unknown>, next: Record<string, unknown>) {
  return Object.entries(next).every(([key, value]) => key === "shareWithOwner"
    ? value !== true || previous[key] === true
    : value === "" || value === previous[key]);
}
