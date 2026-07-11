import { createJSONStorage } from "zustand/middleware";

export const browserStorage = createJSONStorage(() => window.localStorage);
